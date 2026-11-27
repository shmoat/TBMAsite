import React, { useState, useEffect, useRef } from 'react';
import { db, svrTs, tbmaAuthRequest } from '../lib/firebase';
import { safeUrl } from '../lib/security';
import { SOCIALS, getGameDateStr } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Avatar, RoleBadge, TagBadges, Modal, UpIcon } from './BasicUI';
import { getUserActiveStreak } from '../features/daily-games/gameUtils';

export default function GlobalModals({
  // Notifications
  notifOpen, setNotifOpen,
  myNotifs = [], unreadNotifs = [],
  pushPerm, setPushPerm,
  onJumpToPost, onNavigateView, onOpenChatRoom,
  // Profile Settings
  editProf, setEditProf,
  // Guest Guide & Feedback
  showGuestGuide, setShowGuestGuide,
  guestFbOpen, setGuestFbOpen,
  sendNotif,
  // Login trigger from Guest Prompt
  onOpenLogin
}) {
  const { users, currentUser, setCurrentUser } = useAuth();
  const { memberModal, setMemberModal, guestPrompt, setGuestPrompt } = useUI();

  const todayStr = getGameDateStr();

  // Notification Tab
  const [notifTab, setNotifTab] = useState('posts');

  // Profile Editor & Cropper States
  const [eName, setEName] = useState('');
  const [eBio, setEBio] = useState('');
  const [eAv, setEAv] = useState('');
  const [eBd, setEBd] = useState('');
  const [eUser, setEUser] = useState('');
  const [ePass, setEPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [profErr, setProfErr] = useState('');
  const [profBusy, setProfBusy] = useState(false);
  const [eSocs, setESocs] = useState([]);
  const [sPlat, setSPlat] = useState('Instagram');
  const [sLbl, setSLbl] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [cropState, setCropState] = useState(null);
  const avRef = useRef(null);

  // Feedback Modal States
  const [fbName, setFbName] = useState('');
  const [fbCategory, setFbCategory] = useState('request_tool');
  const [fbMessage, setFbMessage] = useState('');
  const [fbContact, setFbContact] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbErr, setFbErr] = useState('');

  // ซิงก์ค่าตั้งต้นเมื่อเปิดหน้าต่างตั้งค่าโปรไฟล์
  useEffect(() => {
    if (editProf && currentUser) {
      setEName(currentUser.displayName || '');
      setEBio(currentUser.bio || '');
      setEAv(currentUser.avatarUrl || '');
      setEUser(currentUser.username || '');
      setEPass('');
      setShowPass(false);
      setESocs(currentUser.socialLinks || []);
      setEBd(currentUser.birthDate || '');
      setProfErr('');
    }
  }, [editProf, currentUser]);

  // รีเซ็ตสถานะเมื่อเปิดหน้าต่าง Feedback
  useEffect(() => {
    if (guestFbOpen) {
      setFbErr('');
      setFbSuccess(false);
    }
  }, [guestFbOpen]);

  const recentChg = (u) => (u?.usernameChangeHistory || []).filter((ts) => Date.now() - ts < 1209600000);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfErr('');

    const uName = eUser.trim();
    const pass = ePass.trim();

    if (!eName.trim() || !uName) {
      return setProfErr('กรุณากรอกชื่อที่แสดงและ Username ให้ครบ');
    }
    if (pass && pass.length < 4) {
      return setProfErr('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
    }

    let hist = recentChg(currentUser);
    if (uName !== currentUser.username) {
      if (users.some((u) => u.id !== currentUser.id && u.username?.toLowerCase() === uName.toLowerCase())) {
        return setProfErr('Username ซ้ำกับสมาชิกอื่น');
      }
      if (hist.length >= 2) {
        return setProfErr('เปลี่ยน Username ครบ 2 ครั้งใน 14 วันแล้ว');
      }
      hist = [...hist, Date.now()];
    }

    setProfBusy(true);
    try {
      if (pass) {
        const oldPassword = window.prompt('กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันการเปลี่ยนรหัสผ่าน:');
        if (oldPassword === null) {
          setProfBusy(false);
          return;
        }
        await tbmaAuthRequest({
          action: 'change_password',
          oldPassword,
          newPassword: pass
        });
      }

      const profileUpdates = {
        displayName: eName.trim(),
        bio: eBio.trim(),
        avatarUrl: eAv || '',
        username: uName,
        usernameChangeHistory: hist,
        socialLinks: eSocs || [],
        birthDate: eBd || ''
      };
      await db.collection('bma_users').doc(currentUser.id).update(profileUpdates);

      const { password: _removed, ...cleanCurrent } = currentUser;
      setCurrentUser({ ...cleanCurrent, ...profileUpdates });
      setEPass('');
      setEditProf(false);
    } catch (err) {
      setProfErr(err.message || 'ไม่สามารถบันทึกการตั้งค่าโปรไฟล์ได้');
    } finally {
      setProfBusy(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    setFbErr('');
    const msg = fbMessage.trim();
    if (msg.length < 5) return setFbErr('กรุณาพิมพ์ข้อความอย่างน้อย 5 ตัวอักษรครับ');
    if (msg.length > 1000) return setFbErr('ข้อความยาวเกิน 1,000 ตัวอักษร');

    const now = Date.now();
    const todayKey = 'tbma_guest_fb_cnt_' + todayStr;
    try {
      const lastSent = parseInt(localStorage.getItem('tbma_last_guest_fb_at') || '0', 10);
      const sentToday = parseInt(localStorage.getItem(todayKey) || '0', 10);
      if (now - lastSent < 120000) {
        const waitSec = Math.ceil((120000 - (now - lastSent)) / 1000);
        return setFbErr(`กรุณารออีก ${waitSec} วินาทีก่อนส่งข้อความใหม่ครับ`);
      }
      if (sentToday >= 3) {
        return setFbErr('วันนี้คุณส่งข้อเสนอแนะครบโควตา 3 ครั้งแล้ว ขอบคุณมากครับ');
      }
    } catch {}

    setFbSending(true);
    try {
      const id = 'gfb-' + now + '-' + Math.random().toString(36).slice(2, 5);
      const dStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      const tStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const senderNickname = currentUser
        ? `${currentUser.displayName} (${currentUser.id})`.slice(0, 40)
        : (fbName.trim() || 'Guest').slice(0, 40);
      const senderContact = (fbContact.trim() || (currentUser ? `@${currentUser.username} (${currentUser.id})` : '')).slice(0, 80);

      const payload = {
        id,
        senderId: currentUser ? currentUser.id : 'GUEST',
        nickname: senderNickname,
        category: fbCategory,
        message: msg,
        contact: senderContact,
        status: 'new',
        createdAt: `${dStr} ${tStr}`,
        timestamp: now,
        serverCreatedAt: svrTs()
      };
      await db.collection('bma_guest_feedback').doc(id).set(payload);

      try {
        localStorage.setItem('tbma_last_guest_fb_at', String(now));
        const prevCnt = parseInt(localStorage.getItem(todayKey) || '0', 10);
        localStorage.setItem(todayKey, String(prevCnt + 1));
      } catch {}

      if (sendNotif) {
        users.filter((u) => u.role === 'admin').forEach((adminU) => {
          sendNotif({
            recipientId: adminU.id,
            actorId: currentUser ? currentUser.id : 'GUEST',
            category: 'system',
            subType: 'guest_feedback',
            title: currentUser ? 'ข้อเสนอแนะใหม่จากสมาชิก' : 'ข้อเสนอแนะใหม่จาก Guest',
            body: `${payload.nickname}: ${msg.slice(0, 80)}`,
            targetView: 'admin'
          });
        });
      }

      setFbName('');
      setFbMessage('');
      setFbContact('');
      setFbCategory('request_tool');
      setFbSuccess(true);
    } catch {
      setFbErr('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setFbSending(false);
    }
  };

  return (
    <>
      {/* 1. Notification Modal */}
      {notifOpen && currentUser && (
        <Modal title="🔔 การแจ้งเตือน" onClose={() => setNotifOpen(false)} maxW="max-w-lg">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F]">
              <span>📱 แจ้งเตือนอุปกรณ์: {pushPerm === 'granted' ? '✓ เปิดแล้ว' : 'ยังไม่เปิด'}</span>
              {pushPerm !== 'granted' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof Notification !== 'undefined') setPushPerm(await Notification.requestPermission());
                  }}
                  className="btn-w py-1"
                >
                  ขออนุญาต
                </button>
              )}
            </div>

            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {[
                  ['posts', '📝 โพสต์'],
                  ['messages', '💬 ข้อความ'],
                  ['members', '👥 สมาชิกใหม่']
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setNotifTab(k)}
                    className={notifTab === k ? 'px-2.5 py-1 rounded-lg font-bold bg-white text-[#050811] shrink-0' : 'px-2.5 py-1 rounded-lg bg-[#050811] shrink-0'}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  unreadNotifs.forEach((n) =>
                    db.collection('bma_notifications').doc(n.id).update({
                      readBy: Array.from(new Set([...(n.readBy || []), currentUser.id]))
                    }).catch(() => {})
                  )
                }
                className="text-sky-300 font-bold shrink-0"
              >
                ✓ อ่านแล้วทั้งหมด
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar">
              {myNotifs.filter((n) => n.category === notifTab).length === 0 ? (
                <div className="text-center text-slate-500 py-8 border border-dashed border-[#1E3A5F] rounded-xl">
                  ไม่มีการแจ้งเตือนในหมวดนี้
                </div>
              ) : (
                myNotifs.filter((n) => n.category === notifTab).map((n) => {
                  const rd = (n.readBy || []).includes(currentUser.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        db.collection('bma_notifications').doc(n.id).update({
                          readBy: Array.from(new Set([...(n.readBy || []), currentUser.id]))
                        }).catch(() => {});
                        setNotifOpen(false);
                        if (n.targetPostId) onJumpToPost?.(n.targetPostId);
                        else if (n.targetRoomType) onOpenChatRoom?.({ type: n.targetRoomType, id: n.targetRoomId });
                        else if (n.targetView === 'members') {
                          onNavigateView?.('members');
                          setMemberModal(users.find((u) => u.id === n.targetRoomId) || null);
                        } else if (n.targetView) {
                          onNavigateView?.(n.targetView);
                        }
                      }}
                      className={'p-2.5 rounded-xl border cursor-pointer flex justify-between items-center gap-2 ' + (rd ? 'bg-[#050811] border-[#1E3A5F] opacity-60' : 'bg-[#0F2547]/70 border-sky-400')}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{!rd && '● '}{n.title}</div>
                        <div className="text-slate-300 line-clamp-2">{n.body}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sky-400">ดู →</span>
                        {rd && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              db.collection('bma_notifications').doc(n.id).delete().catch(() => {});
                            }}
                            className="text-red-400 px-2 py-1 bg-red-950/50 rounded hover:bg-red-900 font-bold ml-1"
                          >
                            🗑️ ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Member Profile Modal */}
      {memberModal && currentUser && (
        <Modal title="โปรไฟล์สมาชิก" onClose={() => setMemberModal(null)}>
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar user={memberModal} size="xl" showStatus={true} />
            <div>
              <h3 className="text-lg font-bold flex justify-center items-center gap-1.5 flex-wrap">
                {memberModal.displayName} <RoleBadge role={memberModal.role} />
              </h3>
              <p className="text-sm font-mono text-slate-400">@{memberModal.username} • {memberModal.id}</p>
            </div>
            <TagBadges user={memberModal} />

            {memberModal.birthDate && (
              <div className="px-3 py-1.5 bg-[#0F2547] border border-[#1E3A5F] rounded-full text-xs font-bold text-sky-300 shadow-md">
                🎂 วันเกิด: {new Date(memberModal.birthDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
              </div>
            )}

            {(() => {
              const sNow = getUserActiveStreak(memberModal, todayStr);
              const sBest = memberModal.dailyStreak?.best || sNow;
              if (sNow <= 0 && sBest <= 0) return null;
              return (
                <div className="px-3.5 py-1.5 bg-orange-950/50 border border-orange-500/50 rounded-full text-xs font-bold text-orange-300 shadow-md flex items-center gap-1.5">
                  <span>🔥</span>
                  <span>{sNow > 0 ? `Daily Games ต่อเนื่อง ${sNow} วันติด` : `สถิติ Daily Games สูงสุด ${sBest} วันติด`}</span>
                  {sNow > 0 && sBest > sNow && <span className="text-[10px] text-slate-400 font-mono">(Best {sBest})</span>}
                </div>
              );
            })()}

            <div className="w-full bg-[#050811] p-3 rounded-xl border border-[#1E3A5F] text-sm text-slate-200 mt-2 whitespace-pre-line">
              {memberModal.bio || 'ยังไม่มีคำแนะนำตัว'}
            </div>

            {Array.isArray(memberModal.socialLinks) && memberModal.socialLinks.length > 0 && (
              <div className="w-full flex flex-wrap justify-center gap-1.5 pt-1">
                {memberModal.socialLinks.map((s) => {
                  const clean = safeUrl(s.url);
                  if (!clean) return null;
                  const meta = SOCIALS.find((x) => x.id === s.platform);
                  return (
                    <a
                      key={s.id || clean}
                      href={clean}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-[#0F2547] hover:bg-sky-600 border border-[#1E3A5F] text-xs font-bold text-sky-200 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>{meta?.icon || '🔗'}</span>
                      <span>{s.label || s.platform}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {currentUser.id !== memberModal.id && (
              <div className="flex gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChatRoom?.({ type: 'dm', id: memberModal.id });
                    setMemberModal(null);
                  }}
                  className="flex-1 btn-b py-2 shadow hover:scale-105 transition-transform"
                >
                  💬 ส่งข้อความส่วนตัว
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 3. Edit Profile Modal */}
      {editProf && currentUser && (
        <Modal title="ตั้งค่าโปรไฟล์ & โซเชียล" onClose={() => setEditProf(false)} maxW="max-w-lg">
          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F]">
              <Avatar user={{ ...currentUser, displayName: eName, avatarUrl: eAv }} size="md" />
              <input
                type="file"
                accept="image/*"
                ref={avRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => setCropState({ img, zoom: 1, rot: 0, x: 50, y: 50 });
                      img.src = ev.target.result;
                    };
                    r.readAsDataURL(f);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button type="button" onClick={() => avRef.current?.click()} className="btn-w py-1.5">
                <UpIcon />เปลี่ยนรูปโปรไฟล์
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="block mb-1 text-slate-400 font-bold">ชื่อที่แสดง *</label>
                <input type="text" value={eName} onChange={(e) => setEName(e.target.value)} className="w-full inp" required />
              </div>
              <div>
                <label className="block mb-1 text-slate-400 font-bold">Username ({Math.max(0, 2 - recentChg(currentUser).length)}/2 ใน 14 วัน)</label>
                <input type="text" value={eUser} onChange={(e) => setEUser(e.target.value)} className="w-full inp font-mono" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-slate-400 font-bold">เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้หากไม่เปลี่ยน)</label>
                <div className="relative flex items-center">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={ePass}
                    onChange={(e) => setEPass(e.target.value)}
                    placeholder="กรอกเฉพาะเมื่อต้องการตั้งใหม่..."
                    className="w-full inp pr-16 font-mono"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-0.5 rounded bg-[#0B1325] text-[10px]">
                    {showPass ? '🙈 ซ่อน' : '👁️ ดู'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-slate-400 font-bold">วันเกิด</label>
                <input type="date" value={eBd} onChange={(e) => setEBd(e.target.value)} className="w-full inp font-mono text-slate-300" />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-slate-400 font-bold">คำแนะนำตัว (Bio)</label>
              <textarea rows={2} value={eBio} onChange={(e) => setEBio(e.target.value)} placeholder="เขียนคำอธิบายตัวเองสั้นๆ..." className="w-full inp" />
            </div>

            <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2 mt-2">
              <label className="block text-slate-400 font-bold mb-1">🔗 ช่องทางการติดตาม (Social Links)</label>
              <div className="flex flex-col sm:flex-row gap-1.5">
                <div className="flex gap-1.5 sm:shrink-0">
                  <select value={sPlat} onChange={(e) => setSPlat(e.target.value)} className="bg-[#0B1325] border border-[#1E3A5F] rounded-lg px-2 py-1.5 shrink-0 outline-none focus:border-sky-500">
                    {SOCIALS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.id}</option>)}
                  </select>
                  <input type="text" value={sLbl} onChange={(e) => setSLbl(e.target.value)} placeholder="ชื่อปุ่ม..." className="flex-1 sm:flex-none sm:w-24 min-w-0 bg-[#0B1325] border border-[#1E3A5F] rounded-lg px-2 py-1.5 outline-none focus:border-sky-500" />
                </div>
                <div className="flex gap-1.5 flex-1 min-w-0">
                  <input type="text" value={sUrl} onChange={(e) => setSUrl(e.target.value)} placeholder="URL..." className="flex-1 min-w-0 bg-[#0B1325] border border-[#1E3A5F] rounded-lg px-2 py-1.5 outline-none focus:border-sky-500" />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = safeUrl(sUrl);
                      if (!clean) return alert('URL ไม่ถูกต้อง กรุณาใส่ลิงก์ที่ขึ้นต้นด้วย https://');
                      setESocs([...eSocs, { id: 's-' + Date.now(), platform: sPlat, label: sLbl.trim() || sPlat, url: clean }]);
                      setSUrl('');
                      setSLbl('');
                    }}
                    className="btn-w py-1.5 px-3.5 shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>
              {eSocs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#0B1325] border border-white/5">
                  <span className="min-w-0 truncate">
                    {s.label}: <a href={safeUrl(s.url)} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{s.url}</a>
                  </span>
                  <button type="button" onClick={() => setESocs(eSocs.filter((x) => x.id !== s.id))} className="text-red-400 font-bold px-2 py-0.5 hover:bg-red-950/50 rounded shrink-0">ลบ</button>
                </div>
              ))}
            </div>

            {profErr && <div className="p-2 rounded bg-red-950 text-red-200 font-bold">{profErr}</div>}

            <div className="pt-3 border-t border-[#1E3A5F] mt-4">
              <button type="submit" disabled={profBusy} className="w-full btn-w py-2.5 shadow-lg disabled:opacity-50">
                {profBusy ? '⏳ กำลังบันทึก...' : '💾 บันทึกโปรไฟล์'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Avatar Cropper Modal */}
      {cropState && (
        <Modal title="✂️ ปรับแต่งรูปโปรไฟล์" onClose={() => setCropState(null)} maxW="max-w-md">
          <div className="flex flex-col items-center space-y-5">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 border-4 border-sky-500/50 rounded-full overflow-hidden bg-black shadow-[0_0_20px_rgba(0,0,0,0.8)] cursor-crosshair">
              <img
                src={cropState.img.src}
                alt="crop-preview"
                className="absolute pointer-events-none"
                style={{
                  width: `${cropState.zoom * 100}%`,
                  height: 'auto',
                  minHeight: `${cropState.zoom * 100}%`,
                  objectFit: 'cover',
                  transform: `translate(-50%, -50%) rotate(${cropState.rot}deg)`,
                  left: `${cropState.x}%`,
                  top: `${cropState.y}%`
                }}
              />
              <div className="absolute inset-0 bg-black/20 pointer-events-none rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
            </div>

            <div className="w-full space-y-3.5 text-xs bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F] shadow-inner">
              <div className="flex items-center gap-3">
                <span className="w-12 text-slate-400 font-bold">🔍 ซูม:</span>
                <input type="range" min="0.5" max="3" step="0.1" value={cropState.zoom} onChange={(e) => setCropState({ ...cropState, zoom: parseFloat(e.target.value) })} className="flex-1 accent-sky-500" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-slate-400 font-bold">↔️ แกน X:</span>
                <input type="range" min="0" max="100" value={cropState.x} onChange={(e) => setCropState({ ...cropState, x: parseInt(e.target.value, 10) })} className="flex-1 accent-sky-500" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-slate-400 font-bold">↕️ แกน Y:</span>
                <input type="range" min="0" max="100" value={cropState.y} onChange={(e) => setCropState({ ...cropState, y: parseInt(e.target.value, 10) })} className="flex-1 accent-sky-500" />
              </div>
              <div className="flex justify-center gap-2 pt-3 border-t border-[#1E3A5F]">
                <button type="button" onClick={() => setCropState({ ...cropState, rot: (cropState.rot - 90) % 360 })} className="btn-d py-1.5 px-4 flex-1 font-bold text-sky-200">↺ หมุนซ้าย</button>
                <button type="button" onClick={() => setCropState({ ...cropState, rot: (cropState.rot + 90) % 360 })} className="btn-d py-1.5 px-4 flex-1 font-bold text-sky-200">หมุนขวา ↻</button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const canvas = document.createElement('canvas');
                const size = 500;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#0F2547';
                ctx.fillRect(0, 0, size, size);
                ctx.translate(size / 2, size / 2);
                ctx.rotate((cropState.rot * Math.PI) / 180);
                const scale = cropState.zoom;
                const minDim = Math.min(cropState.img.width, cropState.img.height);
                const drawW = (cropState.img.width / minDim) * size * scale;
                const drawH = (cropState.img.height / minDim) * size * scale;
                const offsetX = ((cropState.x - 50) / 100) * drawW;
                const offsetY = ((cropState.y - 50) / 100) * drawH;
                ctx.drawImage(cropState.img, -drawW / 2 + offsetX, -drawH / 2 + offsetY, drawW, drawH);
                setEAv(canvas.toDataURL('image/jpeg', 0.9));
                setCropState(null);
              }}
              className="w-full btn-w py-3 font-bold shadow-lg hover:bg-sky-500 hover:text-white transition-colors text-sm"
            >
              ✅ ยืนยันรูปโปรไฟล์
            </button>
          </div>
        </Modal>
      )}

      {/* 5. Smooth Guest Auth Prompt Modal */}
      {guestPrompt && (
        <Modal title="พื้นที่เฉพาะสมาชิกสมาคม" onClose={() => setGuestPrompt(null)} maxW="max-w-sm">
          <div className="space-y-4 text-center text-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/15 border border-sky-400/40 text-sky-400 flex items-center justify-center text-2xl">
              <i className="fas fa-lock"></i>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{guestPrompt}</p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => { setGuestPrompt(null); onOpenLogin?.('signin'); }}
                className="w-full btn-w py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <i className="fas fa-sign-in-alt"></i> เข้าสู่ระบบสมาชิก
              </button>
              <button
                type="button"
                onClick={() => { setGuestPrompt(null); onOpenLogin?.('activate'); }}
                className="w-full btn-b py-2.5 text-xs border-sky-500/40 text-sky-200 hover:bg-sky-600 hover:text-white flex items-center justify-center gap-2"
              >
                <i className="fas fa-id-card"></i> มีรหัส MXXX / FXXX แล้ว? เปิดใช้งานเลย
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Guest Quick Guide Modal */}
      {showGuestGuide && (
        <Modal title="คู่มือการใช้งานสำหรับผู้มาเยือน (Guest)" onClose={() => setShowGuestGuide(false)} maxW="max-w-md">
          <div className="space-y-3 text-xs text-slate-300">
            <p className="text-slate-400 leading-relaxed">
              ยินดีต้อนรับสู่ <strong className="text-white">The Blue Moon Association</strong> ในโหมดผู้มาเยือน คุณสามารถใช้งานส่วนต่างๆ ได้ดังนี้:
            </p>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-start gap-3">
                <i className="fas fa-tools text-sky-400 text-base mt-0.5 w-5 text-center"></i>
                <div><strong className="text-white block">Association Tools</strong>ใช้งานเครื่องมือคำนวณ วิศวะ ดนตรี และสาธารณูปโภคทั้งหมดได้ฟรี</div>
              </div>
              <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-start gap-3">
                <i className="fas fa-gamepad text-emerald-400 text-base mt-0.5 w-5 text-center"></i>
                <div><strong className="text-white block">Daily Games (โหมดทดลองเล่น)</strong>ลองเล่นมินิเกมประจำวันได้ทั้ง 9 เกม (ไม่บันทึกสถิติขึ้นกระดานอันดับ)</div>
              </div>
              <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-start gap-3">
                <i className="fas fa-compact-disc text-fuchsia-400 text-base mt-0.5 w-5 text-center"></i>
                <div><strong className="text-white block">Disc Jam Radio</strong>ร่วมรับฟังวิทยุของสมาคมแบบเรียลไทม์ไปพร้อมกับทุกคน</div>
              </div>
              <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-start gap-3">
                <i className="fas fa-clipboard-list text-amber-400 text-base mt-0.5 w-5 text-center"></i>
                <div><strong className="text-white block">Board &amp; Feedback</strong>อ่านโพสต์สาธารณะ และส่งข้อเสนอแนะถึงสมาคมได้จากแถบด้านซ้ายของหน้า Board</div>
              </div>
            </div>
            <button type="button" onClick={() => setShowGuestGuide(false)} className="w-full btn-w py-2.5 text-xs mt-2">เริ่มใช้งานเลย</button>
          </div>
        </Modal>
      )}

      {/* 7. Feedback Modal */}
      {guestFbOpen && (
        <Modal title="ส่งข้อเสนอแนะถึงสมาคม (Feedback)" onClose={() => setGuestFbOpen(false)} maxW="max-w-md">
          {fbSuccess ? (
            <div className="text-center space-y-4 py-4 text-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">ส่งข้อความเรียบร้อยแล้ว!</h4>
                <p className="text-slate-400">ขอบคุณสำหรับข้อเสนอแนะ ข้อความของคุณถูกส่งตรงไปยังหน้า Owner แล้วครับ</p>
              </div>
              <button type="button" onClick={() => setGuestFbOpen(false)} className="w-full btn-w py-2.5 text-xs">ปิดหน้าต่าง</button>
            </div>
          ) : (
            <form onSubmit={handleSendFeedback} className="space-y-3.5 text-xs">
              {currentUser && (
                <div className="p-2.5 rounded-xl bg-[#050811] border border-emerald-500/35 flex items-center gap-2.5">
                  <Avatar user={currentUser} size="xs" />
                  <div className="min-w-0">
                    <div className="font-bold text-emerald-300 truncate">ส่งในนามสมาชิก: {currentUser.displayName} ({currentUser.id})</div>
                    <div className="text-[10px] text-slate-400">ระบบจะแนบข้อมูลสมาชิกให้อัตโนมัติ</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5">หัวข้อที่ต้องการแจ้ง</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'request_tool', label: 'ขอเครื่องมือใหม่', icon: 'fas fa-tools' },
                    { id: 'bug', label: 'แจ้งปัญหา / บั๊ก', icon: 'fas fa-bug' },
                    { id: 'suggestion', label: 'เสนอแนะทั่วไป', icon: 'fas fa-lightbulb' },
                    { id: 'other', label: 'อื่นๆ / ทักทาย', icon: 'fas fa-comment' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFbCategory(opt.id)}
                      className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${fbCategory === opt.id ? 'bg-sky-600 text-white border-sky-400 shadow' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:text-white'}`}
                    >
                      <i className={opt.icon}></i> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {!currentUser && (
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">ชื่อเล่น (ไม่บังคับ)</label>
                  <input type="text" maxLength={40} value={fbName} onChange={(e) => setFbName(e.target.value)} placeholder="เช่น ผู้มาเยือนจาก KMUTT" className="w-full inp text-xs" />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-slate-400 font-bold">รายละเอียดข้อความ <span className="text-red-400">*</span></label>
                  <span className="text-[10px] font-mono text-slate-500">{fbMessage.length}/1000</span>
                </div>
                <textarea rows="4" maxLength={1000} value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} placeholder="พิมพ์ไอเดียเครื่องมือที่อยากได้ ปัญหาที่พบ หรือข้อเสนอแนะ..." className="w-full inp text-xs resize-none custom-scrollbar" required />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">ช่องทางติดต่อกลับ (ไม่บังคับ)</label>
                <input
                  type="text"
                  maxLength={80}
                  value={fbContact}
                  onChange={(e) => setFbContact(e.target.value)}
                  placeholder={currentUser ? `เว้นว่างเพื่อใช้ @${currentUser.username} หรือใส่ช่องทางอื่น` : 'เช่น IG / Email / Discord (เผื่อให้เจ้าของติดต่อกลับ)'}
                  className="w-full inp text-xs"
                />
              </div>

              {fbErr && <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 font-bold">{fbErr}</div>}

              <button type="submit" disabled={fbSending} className="w-full btn-w py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                <i className={`fas ${fbSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                {fbSending ? 'กำลังส่งข้อความ...' : 'ส่งข้อเสนอแนะ'}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}