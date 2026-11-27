import React, { useState, useEffect } from 'react';
import { db, svrTs, tbmaAuthRequest } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/BasicUI';

export default function LoginPage({ initialMode = 'signin', onSuccess }) {
  const { users, signIn, setCurrentUser } = useAuth();
  const [authMode, setAuthMode] = useState(initialMode);
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');
  const [remMe, setRemMe] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const [actId, setActId] = useState('');
  const [actN, setActN] = useState('');
  const [actU, setActU] = useState('');
  const [actP, setActP] = useState('');

  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthMode(initialMode);
    setAuthErr('');
  }, [initialMode]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthErr('');
    if (!lUser.trim() || !lPass) return setAuthErr('กรุณากรอก Username และ Password');
    setBusy(true);
    try {
      await signIn({ identifier: lUser.trim(), password: lPass, remember: remMe });
      setLUser('');
      setLPass('');
      onSuccess?.();
    } catch (err) {
      setAuthErr(err.message || 'Username หรือ Password ไม่ถูกต้อง');
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setAuthErr('');
    const id = actId.trim().toUpperCase();
    const uName = actU.trim();
    const pass = actP.trim();
    const dName = actN.trim() || ('Member #' + id);

    if (!id || !uName || pass.length < 4) {
      return setAuthErr('กรุณากรอกข้อมูลให้ครบ และตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร');
    }

    setBusy(true);
    try {
      const { user: activated } = await tbmaAuthRequest({
        action: 'activate',
        id,
        username: uName,
        password: pass,
        displayName: dName
      });

      const extra = {
        isOnline: true,
        lastActive: Date.now(),
        socialLinks: activated.socialLinks || [],
        usernameChangeHistory: activated.usernameChangeHistory || [],
        notifPrefs: activated.notifPrefs || { muteOwnPosts: false, muteGlobalChat: false, mutePrivateChat: false },
        joinedAt: new Date().toISOString().split('T')[0]
      };
      await db.collection('bma_users').doc(activated.id).update(extra).catch(() => {});

      const up = { ...activated, ...extra };
      setCurrentUser(up);
      if (remMe) {
        localStorage.setItem('tbma_saved_user_id', up.id);
        sessionStorage.removeItem('tbma_session_user_id');
      } else {
        sessionStorage.setItem('tbma_session_user_id', up.id);
        localStorage.removeItem('tbma_saved_user_id');
      }

      // แจ้งเตือน Owner / Vice เมื่อมีสมาชิกใหม่เปิดใช้งาน
      const admins = users.filter((u) => ['owner', 'admin', 'vice', 'mod'].includes(String(u.role || '').toLowerCase()));
      admins.forEach((adminUser) => {
        if (adminUser.id === up.id) return;
        const nfId = 'nf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
        db.collection('bma_notifications').doc(nfId).set({
          id: nfId,
          recipientId: adminUser.id,
          actorId: up.id,
          category: 'members',
          subType: 'new_member',
          title: '🎉 มีสมาชิกใหม่เปิดใช้งานรหัส',
          body: `${up.displayName} (${up.id}) ได้เข้ามาในสมาคมแล้ว!`,
          targetView: 'members',
          targetRoomId: up.id,
          readBy: [],
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          serverCreatedAt: svrTs()
        }).catch(() => {});
      });

      setActId(''); setActU(''); setActP(''); setActN('');
      onSuccess?.();
    } catch (err) {
      setAuthErr(err.message || 'ไม่สามารถเปิดใช้งานรหัสได้');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md card p-7 space-y-4">
        <div className="text-center">
          <div className="flex justify-center mb-2"><Logo s={46} /></div>
          <h2 className="text-lg font-bold uppercase">The Blue Moon Portal</h2>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#050811] border border-[#1E3A5F]">
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setAuthErr(''); }}
            className={authMode === 'signin' ? 'py-2 rounded-lg text-xs font-bold bg-white text-[#050811]' : 'py-2 text-xs text-slate-400'}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('activate'); setAuthErr(''); }}
            className={authMode === 'activate' ? 'py-2 rounded-lg text-xs font-bold bg-white text-[#050811]' : 'py-2 text-xs text-slate-400'}
          >
            เปิดใช้งาน Member ID
          </button>
        </div>

        {authMode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-3.5 text-xs">
            <input type="text" value={lUser} onChange={(e) => setLUser(e.target.value)} placeholder="รหัสสมาชิก หรือ Username..." className="w-full inp" required />
            <div className="relative flex items-center">
              <input type={showPass ? 'text' : 'password'} value={lPass} onChange={(e) => setLPass(e.target.value)} placeholder="Password..." className="w-full inp pr-16" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-1 rounded bg-[#0B1325]">
                {showPass ? '🙈 ซ่อน' : '👁️ ดู'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input type="checkbox" checked={remMe} onChange={(e) => setRemMe(e.target.checked)} />
              จดจำการเข้าสู่ระบบไว้ในเครื่องนี้
            </label>
            {authErr && <div className="p-2.5 rounded-xl bg-red-950 text-red-200">{authErr}</div>}
            <button type="submit" disabled={busy} className="w-full btn-w py-2.5 disabled:opacity-50">
              {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="space-y-3 text-xs">
            <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] text-sky-300">
              💡 ทั้ง Username และรหัสผ่านสามารถเปลี่ยนภายหลังได้ที่หน้าโปรไฟล์
            </div>
            <input type="text" value={actId} onChange={(e) => setActId(e.target.value)} placeholder="Member ID (เช่น M000, M001) *" className="w-full inp font-mono uppercase" required />
            <input type="text" value={actN} onChange={(e) => setActN(e.target.value)} placeholder="ชื่อที่แสดง (Display Name) *" className="w-full inp" required />
            <input type="text" value={actU} onChange={(e) => setActU(e.target.value)} placeholder="ตั้ง Username *" className="w-full inp font-mono" required />
            <div className="relative flex items-center">
              <input type={showPass ? 'text' : 'password'} value={actP} onChange={(e) => setActP(e.target.value)} placeholder="ตั้ง Password (อย่างน้อย 4 ตัว) *" className="w-full inp pr-16" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-1 rounded bg-[#0B1325]">
                {showPass ? '🙈 ซ่อน' : '👁️ ดู'}
              </button>
            </div>
            {authErr && <div className="p-2.5 rounded-xl bg-red-950 text-red-200">{authErr}</div>}
            <button type="submit" disabled={busy} className="w-full btn-w py-2.5 disabled:opacity-50">
              {busy ? 'กำลังเปิดใช้งาน...' : 'ยืนยันและสร้างบัญชี'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}