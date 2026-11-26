const crypto = require('crypto');
const admin = require('firebase-admin');
const { verifySameOrigin, checkRateLimit } = require('./_rateLimit');

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');

  const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(jsonStr);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  if (!stored.includes(':')) {
    return String(plain) === stored; // รองรับรหัสเดิมก่อนย้ายเข้า users_private
  }
  const [salt, keyHex] = stored.split(':');
  const derivedBuf = crypto.scryptSync(String(plain), salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derivedBuf.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, keyBuf);
}

async function verifyCaller(req) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifySameOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  // จำกัดไม่เกิน 15 ครั้ง/นาที ต่อ IP ป้องกันการเดารหัสผ่านรัวๆ
  const rl = checkRateLimit(req, res, { keyPrefix: 'auth', limit: 15, windowMs: 60000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่', retryAfter: rl.retryAfterSec });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  try {
    getAdminApp();
    const db = admin.firestore();
    const action = String(body.action || 'login').trim();

    // 1) เข้าสู่ระบบ (รองรับทั้งรหัสสมาชิก M001/F001 และ Username)
    if (action === 'login') {
      const identifier = String(body.identifier || '').trim();
      const password = String(body.password || '');
      if (!identifier || !password) {
        return res.status(400).json({ error: 'กรุณากรอกรหัสสมาชิก/ชื่อผู้ใช้ และรหัสผ่าน' });
      }

      const upperId = identifier.toUpperCase();
      const lowerName = identifier.toLowerCase();
      let userDoc = await db.collection('bma_users').doc(upperId).get();

      if (!userDoc.exists) {
        const snap = await db.collection('bma_users').get();
        userDoc = snap.docs.find(d => {
          const u = d.data();
          return String(d.id).toUpperCase() === upperId || String(u.username || '').trim().toLowerCase() === lowerName;
        }) || null;
      }

      if (!userDoc || !userDoc.exists) {
        return res.status(401).json({ error: 'ไม่พบรหัสสมาชิกหรือชื่อผู้ใช้นี้ในระบบ' });
      }

      const userId = userDoc.id;
      const userData = userDoc.data();
      if (!userData.isActivated) {
        return res.status(403).json({ error: 'รหัสนี้ยังไม่ได้เปิดใช้งาน กรุณาลงทะเบียนเปิดใช้งานครั้งแรกก่อน', needActivation: true, id: userId });
      }

      const privRef = db.collection('bma_users_private').doc(userId);
      const privDoc = await privRef.get();
      const storedHash = privDoc.exists ? privDoc.data().passwordHash : userData.password;

      if (!verifyPassword(password, storedHash)) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
      }

      // ย้ายรหัสผ่านเข้า bma_users_private และลบทิ้งจาก bma_users อัตโนมัติ
      if (!privDoc.exists || !String(storedHash || '').includes(':')) {
        await privRef.set({
          id: userId,
          passwordHash: hashPassword(password),
          updatedAt: Date.now()
        }, { merge: true });
      }
      if ('password' in userData) {
        await db.collection('bma_users').doc(userId).update({
          password: admin.firestore.FieldValue.delete()
        });
      }

      const role = String(userData.role || 'member');
      const customToken = await admin.auth().createCustomToken(userId, { role, memberId: userId });
      const { password: _removed, ...safeUser } = userData;

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, customToken, user: { id: userId, ...safeUser } });
    }

    // 2) เปิดใช้งานรหัสสมาชิกครั้งแรก (Activate ID)
    if (action === 'activate') {
      const id = String(body.id || '').trim().toUpperCase();
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const displayName = String(body.displayName || username).trim();

      if (!id || !username || password.length < 4) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบและตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร' });
      }

      const userRef = db.collection('bma_users').doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'ไม่พบรหัสประจำตัวนี้ในระบบ' });
      }
      const userData = userDoc.data();
      if (userData.isActivated) {
        return res.status(409).json({ error: 'รหัสนี้ถูกเปิดใช้งานไปแล้ว' });
      }

      // ตรวจชื่อผู้ใช้ซ้ำ
      const allSnap = await db.collection('bma_users').get();
      const dup = allSnap.docs.some(d => d.id !== id && String(d.data().username || '').trim().toLowerCase() === username.toLowerCase());
      if (dup) {
        return res.status(409).json({ error: 'Username นี้มีผู้ใช้งานแล้ว' });
      }

      await db.collection('bma_users_private').doc(id).set({
        id,
        passwordHash: hashPassword(password),
        updatedAt: Date.now()
      });

      const updates = {
        username,
        displayName: displayName || username,
        isActivated: true,
        password: admin.firestore.FieldValue.delete()
      };
      await userRef.update(updates);

      const role = String(userData.role || 'member');
      const customToken = await admin.auth().createCustomToken(id, { role, memberId: id });
      const { password: _removed, ...safeUser } = { ...userData, ...updates };

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, customToken, user: { id, ...safeUser } });
    }

    // 3) สมาชิกเปลี่ยนรหัสผ่านตัวเอง
    if (action === 'change_password') {
      const caller = await verifyCaller(req);
      if (!caller || caller.firebase?.sign_in_provider === 'anonymous') {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน' });
      }
      const targetId = caller.uid;
      const oldPassword = String(body.oldPassword || '');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 4) {
        return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
      }

      const privRef = db.collection('bma_users_private').doc(targetId);
      const privDoc = await privRef.get();
      if (privDoc.exists && !verifyPassword(oldPassword, privDoc.data().passwordHash)) {
        return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
      }

      await privRef.set({ id: targetId, passwordHash: hashPassword(newPassword), updatedAt: Date.now() }, { merge: true });
      await db.collection('bma_users').doc(targetId).update({ password: admin.firestore.FieldValue.delete() });
      return res.status(200).json({ ok: true });
    }

    // 4) Owner รีเซ็ตรหัสผ่านให้สมาชิก (เก็บใน users_private ไม่ให้หลุดใน bma_users)
    if (action === 'admin_reset_password') {
      const caller = await verifyCaller(req);
      if (!caller || caller.firebase?.sign_in_provider === 'anonymous') {
        return res.status(401).json({ error: 'ไม่มีสิทธิ์ดำเนินการ' });
      }
      const callerDoc = await db.collection('bma_users').doc(caller.uid).get();
      const callerRole = String(callerDoc.data()?.role || caller.role || '').toLowerCase();
      if (callerRole !== 'owner') {
        return res.status(403).json({ error: 'เฉพาะ Owner เท่านั้นที่รีเซ็ตรหัสผ่านได้' });
      }

      const targetId = String(body.targetId || '').trim().toUpperCase();
      const newPassword = String(body.newPassword || '').trim();
      if (!targetId || newPassword.length < 4) {
        return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้องหรือรหัสผ่านสั้นเกินไป' });
      }

      await db.collection('bma_users_private').doc(targetId).set({
        id: targetId,
        passwordHash: hashPassword(newPassword),
        updatedAt: Date.now()
      }, { merge: true });
      await db.collection('bma_users').doc(targetId).update({
        password: admin.firestore.FieldValue.delete()
      });

      return res.status(200).json({ ok: true });
    }

    // 5) Owner กดล้างรหัสผ่านเก่าของสมาชิกทุกคนเข้า bma_users_private ในครั้งเดียว
    if (action === 'migrate_all_passwords') {
      const caller = await verifyCaller(req);
      if (!caller || caller.firebase?.sign_in_provider === 'anonymous') {
        return res.status(401).json({ error: 'ไม่มีสิทธิ์ดำเนินการ' });
      }
      const callerDoc = await db.collection('bma_users').doc(caller.uid).get();
      if (String(callerDoc.data()?.role || caller.role || '').toLowerCase() !== 'owner') {
        return res.status(403).json({ error: 'เฉพาะ Owner เท่านั้น' });
      }

      const snap = await db.collection('bma_users').get();
      let migrated = 0;
      for (const doc of snap.docs) {
        const d = doc.data();
        if (d.password && String(d.password).trim()) {
          await db.collection('bma_users_private').doc(doc.id).set({
            id: doc.id,
            passwordHash: hashPassword(String(d.password).trim()),
            updatedAt: Date.now()
          }, { merge: true });
          migrated++;
        }
        if ('password' in d) {
          await doc.ref.update({ password: admin.firestore.FieldValue.delete() });
        }
      }
      return res.status(200).json({ ok: true, migrated });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Auth API error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดที่ระบบยืนยันตัวตน' });
  }
};