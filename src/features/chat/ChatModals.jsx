import React, { useState } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { safeUrl, logAdminAudit } from '../../lib/security';
import { Avatar, Modal } from '../../components/BasicUI';

export default function ChatModals({
  currentUser,
  activeMembers,
  channels,
  activeRoom,
  setActiveRoom,
  activeGrp,
  isModOrAdmin,
  dmKey,
  addMemOpen, setAddMemOpen,
  cGrpOpen, setCGrpOpen,
  cChOpen, setCChOpen,
  delTgt, setDelTgt,
  fwdMsg, setFwdMsg,
  showLinkModal, setShowLinkModal,
  onAttachLink
}) {
  const [grpName, setGrpName] = useState('');
  const [grpMems, setGrpMems] = useState([]);
  const [chName, setChName] = useState('');
  const [chIcon, setChIcon] = useState('💬');
  const [chDesc, setChDesc] = useState('');
  const [linkInputUrl, setLinkInputUrl] = useState('');

  const handleConfirmLink = () => {
    const clean = safeUrl(linkInputUrl);
    if (!clean || !/^https?:\/\//i.test(clean)) {
      alert('ลิงก์ไม่ถูกต้องหรือไม่ได้ขึ้นต้นด้วย https:// (ระบบบล็อกเพื่อความปลอดภัย)');
      return;
    }
    onAttachLink({ id: 'att-' + Date.now(), name: 'Link', type: 'link', url: clean, size: 'URL' });
    setShowLinkModal(false);
    setLinkInputUrl('');
  };

  return (
    <>
      {/* แก้ไขสมาชิกกลุ่ม */}
      {addMemOpen && activeGrp && (
        <Modal title={'👥 แก้ไขสมาชิกกลุ่ม: ' + activeGrp.name} onClose={() => setAddMemOpen(false)}>
          <div className="space-y-4 max-h-80 overflow-y-auto text-xs custom-scrollbar">
            <div>
              <h4 className="font-bold text-sky-300 mb-2">สมาชิกในกลุ่ม ({(activeGrp.members || []).length})</h4>
              <div className="space-y-2">
                {activeMembers.filter((m) => (activeGrp.members || []).includes(m.id)).map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex justify-between items-center">
                    <div className="flex items-center gap-2"><Avatar user={m} size="xs" /><span>{m.displayName} ({m.id})</span></div>
                    <div className="flex gap-2">
                      {m.id === activeGrp.createdBy && <span className="text-amber-400 text-[10px] self-center font-bold">👑 ผู้สร้าง</span>}
                      {m.id !== activeGrp.createdBy && m.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => db.collection('bma_groups').doc(activeGrp.id).update({ members: (activeGrp.members || []).filter((id) => id !== m.id) })}
                          className="text-red-400 font-bold bg-red-950/50 px-2 py-1 rounded hover:bg-red-900 transition-colors"
                        >
                          ลบออก
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-emerald-300 mb-2">เพิ่มสมาชิกใหม่</h4>
              <div className="space-y-2">
                {activeMembers.filter((m) => !(activeGrp.members || []).includes(m.id)).map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex justify-between items-center">
                    <div className="flex items-center gap-2"><Avatar user={m} size="xs" /><span>{m.displayName} ({m.id})</span></div>
                    <button
                      type="button"
                      onClick={() => db.collection('bma_groups').doc(activeGrp.id).update({ members: Array.from(new Set([...(activeGrp.members || []), m.id])) })}
                      className="btn-w py-1 text-[10px] hover:scale-105 transition-transform"
                    >
                      + ดึงเข้ากลุ่ม
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* สร้างกลุ่มแชตใหม่ */}
      {cGrpOpen && currentUser && (
        <Modal title="👥 สร้างกลุ่มแชตใหม่" onClose={() => { setCGrpOpen(false); setGrpName(''); setGrpMems([]); }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!grpName.trim() || grpMems.length === 0) return alert('กรุณาตั้งชื่อกลุ่มและเลือกสมาชิกอย่างน้อย 1 คน');
              const id = 'grp-' + Date.now();
              await db.collection('bma_groups').doc(id).set({
                id,
                name: grpName.trim(),
                members: [currentUser.id, ...grpMems],
                createdBy: currentUser.id,
                isArchived: false,
                timestamp: Date.now(),
                serverCreatedAt: svrTs()
              });
              setCGrpOpen(false);
              setGrpName('');
              setGrpMems([]);
              setActiveRoom({ type: 'group', id });
            }}
            className="space-y-3 text-xs"
          >
            <input type="text" value={grpName} onChange={(e) => setGrpName(e.target.value)} placeholder="ตั้งชื่อกลุ่ม..." className="w-full inp" required />
            <div className="card p-2 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
              <div className="text-slate-400 mb-1 px-1">เลือกสมาชิก:</div>
              {activeMembers.filter((m) => m.id !== currentUser.id).map((m) => (
                <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-[#0F2547] rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grpMems.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) setGrpMems([...grpMems, m.id]);
                      else setGrpMems(grpMems.filter((x) => x !== m.id));
                    }}
                  />
                  <Avatar user={m} size="xs" /> <span>{m.displayName} ({m.id})</span>
                </label>
              ))}
            </div>
            <button type="submit" className="w-full btn-w py-2">สร้างกลุ่มแชต</button>
          </form>
        </Modal>
      )}

      {/* สร้างห้องแชตรวมใหม่ */}
      {cChOpen && isModOrAdmin && currentUser && (
        <Modal title="💬 สร้างห้องแชตรวมใหม่" onClose={() => { setCChOpen(false); setChName(''); setChIcon('💬'); setChDesc(''); }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!chName.trim()) return;
              const id = 'ch-' + Date.now();
              await db.collection('bma_channels').doc(id).set({
                id,
                name: chName.trim().replace(/\s+/g, '-').toLowerCase(),
                icon: chIcon,
                desc: chDesc.trim(),
                createdBy: currentUser.id,
                isProtected: false,
                isSystemReadOnly: false,
                timestamp: Date.now(),
                serverCreatedAt: svrTs()
              });
              setCChOpen(false);
              setChName('');
              setChIcon('💬');
              setChDesc('');
              setActiveRoom({ type: 'channel', id });
            }}
            className="space-y-3 text-xs"
          >
            <div className="flex gap-2">
              <input type="text" value={chIcon} onChange={(e) => setChIcon(e.target.value)} className="inp w-16 text-center text-lg" placeholder="อีโมจิ" required />
              <input type="text" value={chName} onChange={(e) => setChName(e.target.value)} placeholder="ชื่อห้องแชต (เช่น general-talk)..." className="flex-1 inp font-mono" required />
            </div>
            <input type="text" value={chDesc} onChange={(e) => setChDesc(e.target.value)} placeholder="คำอธิบายห้องแชตสั้น ๆ ..." className="w-full inp" />
            <button type="submit" className="w-full btn-w py-2">สร้างห้องแชต</button>
          </form>
        </Modal>
      )}

      {/* ยืนยันลบห้อง / กลุ่ม */}
      {delTgt && (
        <Modal title={`🗑️ ยืนยันการลบ ${delTgt.name}`} onClose={() => setDelTgt(null)} maxW="max-w-sm">
          <div className="space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed">
              คุณต้องการลบ{delTgt.roomType === 'channel' ? 'ห้องแชตรวม' : 'กลุ่มแชต'} <strong className="text-white">{delTgt.name}</strong> ถาวรใช่หรือไม่?
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDelTgt(null)} className="flex-1 btn-d py-2">ยกเลิก</button>
              <button
                type="button"
                onClick={async () => {
                  const col = delTgt.roomType === 'channel' ? 'bma_channels' : 'bma_groups';
                  await db.collection(col).doc(delTgt.id).delete();
                  logAdminAudit({
                    action: 'DELETE_CHAT_ROOM',
                    target: String(delTgt.id || '-'),
                    detail: `ลบ${delTgt.roomType === 'channel' ? 'ห้องแชตรวม' : 'กลุ่มแชต'}: ${delTgt.name || delTgt.id}`,
                    actor: currentUser
                  });
                  if (activeRoom.id === delTgt.id) setActiveRoom({ type: 'channel', id: 'global-lobby' });
                  setDelTgt(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ส่งต่อข้อความ / ไฟล์ */}
      {fwdMsg && currentUser && (
        <Modal title="↪️ ส่งต่อข้อความ / ไฟล์" onClose={() => setFwdMsg(null)}>
          <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs custom-scrollbar">
            {channels.filter((c) => !c.isSystemReadOnly).map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={async () => {
                  const now = Date.now();
                  const id = 'msg-' + now;
                  await db.collection('bma_messages').doc(id).set({
                    id,
                    roomKey: c.id,
                    senderId: currentUser.id,
                    text: fwdMsg.mediaItem ? '↪️ [ส่งต่อไฟล์]' : '↪️ ' + fwdMsg.message.text,
                    attachments: fwdMsg.mediaItem ? [fwdMsg.mediaItem] : (fwdMsg.message.attachments || []),
                    likes: [],
                    readBy: [currentUser.id],
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: now,
                    serverCreatedAt: svrTs()
                  });
                  setFwdMsg(null);
                  setActiveRoom({ type: 'channel', id: c.id });
                }}
                className="w-full flex justify-between p-2 rounded-xl bg-[#050811] border border-[#1E3A5F] hover:bg-[#0F2547]"
              >
                <span>{c.icon} # {c.name}</span>
                <span className="font-bold">ส่งต่อ</span>
              </button>
            ))}
            {activeMembers.filter((m) => m.id !== currentUser.id).map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={async () => {
                  const now = Date.now();
                  const id = 'msg-' + now;
                  await db.collection('bma_messages').doc(id).set({
                    id,
                    roomKey: dmKey(currentUser.id, m.id),
                    senderId: currentUser.id,
                    receiverId: m.id,
                    text: fwdMsg.mediaItem ? '↪️ [ส่งต่อไฟล์]' : '↪️ ' + fwdMsg.message.text,
                    attachments: fwdMsg.mediaItem ? [fwdMsg.mediaItem] : (fwdMsg.message.attachments || []),
                    likes: [],
                    readBy: [currentUser.id],
                    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                    timestamp: now,
                    serverCreatedAt: svrTs()
                  });
                  setFwdMsg(null);
                  setActiveRoom({ type: 'dm', id: m.id });
                }}
                className="w-full flex justify-between p-2 rounded-xl bg-[#050811] border border-[#1E3A5F] hover:bg-[#0F2547]"
              >
                <span>{m.displayName} ({m.id})</span>
                <span className="font-bold">ส่งต่อ</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* แนบลิงก์ URL อย่างปลอดภัย */}
      {showLinkModal && (
        <Modal title="🔗 แนบลิงก์ (URL)" onClose={() => { setShowLinkModal(false); setLinkInputUrl(''); }}>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">ใส่ลิงก์รูปภาพ (.png, .jpg, .gif) หรือวิดีโอ (YouTube, MP4) ที่ขึ้นต้นด้วย https://</p>
            <div className="bg-[#050811] p-1.5 rounded-xl border border-[#1E3A5F] flex items-center focus-within:border-sky-500 transition-colors">
              <i className="fas fa-link text-slate-500 px-3"></i>
              <input
                type="url"
                value={linkInputUrl}
                onChange={(e) => setLinkInputUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmLink(); } }}
                placeholder="https://..."
                className="w-full bg-transparent outline-none text-sm text-white py-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { setShowLinkModal(false); setLinkInputUrl(''); }} className="btn-d px-5 py-2 text-xs">ยกเลิก</button>
              <button type="button" onClick={handleConfirmLink} className="btn-w px-6 py-2 text-xs shadow-lg hover:scale-105">✔️ แนบลิงก์</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}