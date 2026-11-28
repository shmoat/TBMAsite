import React, { useState, useEffect, useMemo } from 'react';
import { db, FieldValue } from '../../lib/firebase';
import { getBkkNow } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/BasicUI';

// สร้างเสียงหลอนสั้นๆ ด้วย Web Audio API (ไม่ต้องโหลดไฟล์เสียง)
export function playSpookySound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export default function HalloweenCurseAndTreats({ isHalloween, cursedUserId }) {
  const { currentUser, activeMembers, getAuthor } = useAuth();
  const year = getBkkNow().getFullYear();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('treats'); // 'treats' | 'curse'
  const [treats, setTreats] = useState([]);
  const [myCandies, setMyCandies] = useState(0);

  // ฟอร์มส่ง Trick or Treat
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState('treat'); // 'treat' | 'trick'
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // ฟอร์มส่งต่อคำสาป
  const [curseTargetId, setCurseTargetId] = useState('');
  const [spiderPrank, setSpiderPrank] = useState(false);

  // ดึงรายการถุงลูกอมของตัวเอง
  useEffect(() => {
    if (!isHalloween || !currentUser) return;
    return db
      .collection('bma_halloween_treats')
      .where('toUserId', '==', currentUser.id)
      .onSnapshot(
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((x) => x.year === year)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setTreats(list);
        },
        () => {}
      );
  }, [isHalloween, currentUser, year]);

  // ดึงแต้มลูกอมของตัวเองไว้ใช้ล้างคำสาป
  useEffect(() => {
    if (!isHalloween || !currentUser) return;
    return db
      .collection('bma_halloween_scores')
      .doc(`${year}_${currentUser.id}`)
      .onSnapshot((doc) => {
        setMyCandies(doc.exists ? doc.data()?.candies || 0 : 0);
      }, () => {});
  }, [isHalloween, currentUser, year]);

  const unreadCount = useMemo(
    () => treats.filter((t) => !t.isRead).length,
    [treats]
  );

  const isMeCursed = Boolean(currentUser && cursedUserId === currentUser.id);
  const cursedUser = cursedUserId ? getAuthor(cursedUserId) : null;

  const otherMembers = useMemo(
    () => activeMembers.filter((m) => m.id !== currentUser?.id),
    [activeMembers, currentUser?.id]
  );

  const handleSendTreat = async (e) => {
    e.preventDefault();
    if (!currentUser || !targetId) return;
    setSending(true);
    try {
      const id = `tot-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      await db.collection('bma_halloween_treats').doc(id).set({
        id,
        year,
        fromUserId: currentUser.id,
        toUserId: targetId,
        mode,
        message: message.trim() || (mode === 'treat' ? 'สุขสันต์วันฮัลโลวีน! เอาลูกอมไปเลย 🍬' : 'แบร่! โดนหลอกแล้ว 🕷️'),
        isRead: false,
        createdAt: Date.now()
      });

      // ถ้าส่ง Treat ให้เพิ่มแต้มลูกอมให้ผู้รับ +2
      if (mode === 'treat') {
        const target = getAuthor(targetId);
        await db
          .collection('bma_halloween_scores')
          .doc(`${year}_${targetId}`)
          .set(
            {
              userId: targetId,
              displayName: target?.displayName || targetId,
              year,
              candies: FieldValue.increment(2),
              updatedAt: Date.now()
            },
            { merge: true }
          )
          .catch(() => {});
      }

      setMessage('');
      setTargetId('');
      alert(mode === 'treat' ? 'ส่งลูกอม (+2 🍬) ให้เพื่อนเรียบร้อย!' : 'ส่งคำแกล้ง Trick ให้เพื่อนแล้ว!');
    } finally {
      setSending(false);
    }
  };

  const handleOpenItem = async (item) => {
    if (item.mode === 'trick') {
      playSpookySound();
      setSpiderPrank(true);
      setTimeout(() => setSpiderPrank(false), 1800);
    }
    if (!item.isRead) {
      await db.collection('bma_halloween_treats').doc(item.id).update({ isRead: true }).catch(() => {});
    }
  };

  const handlePassCurse = async () => {
    if (!isMeCursed || !curseTargetId) return;
    await db
      .collection('bma_system')
      .doc(`halloween_curse_${year}`)
      .set(
        {
          cursedUserId: curseTargetId,
          passedBy: currentUser.id,
          updatedAt: Date.now()
        },
        { merge: true }
      );
    setCurseTargetId('');
    alert('ส่งต่อคำสาปสำเร็จ! ตอนนี้คุณพ้นคำสาปแล้ว 👻');
  };

  const handleCleanseCurse = async () => {
    if (!isMeCursed || myCandies < 5) return;
    const pool = otherMembers;
    const nextId = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)].id : null;
    await db
      .collection('bma_halloween_scores')
      .doc(`${year}_${currentUser.id}`)
      .update({ candies: FieldValue.increment(-5) })
      .catch(() => {});
    await db
      .collection('bma_system')
      .doc(`halloween_curse_${year}`)
      .set({ cursedUserId: nextId, passedBy: 'CLEANSED', updatedAt: Date.now() }, { merge: true });
    alert('ใช้ 5 ลูกอมล้างคำสาปเรียบร้อย! ✨');
  };

  if (!isHalloween) return null;

  return (
    <>
      {/* เอฟเฟกต์แมงมุมไต่จอตอนเปิดโดน Trick */}
      {spiderPrank && (
        <div className="fixed inset-0 z-[130] pointer-events-none bg-black/50 flex items-center justify-center animate-shake">
          <div className="flex gap-6 text-6xl sm:text-7xl drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
            <span className="animate-bounce">🕷️</span>
            <span className="animate-pulse">🕸️</span>
            <span className="animate-bounce">🕷️</span>
          </div>
        </div>
      )}

      {/* ปุ่มลอยเหนือปุ่ม Ghost Hunt มุมซ้ายล่าง */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-16 left-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold shadow-lg hover:scale-105 transition-all ${
          isMeCursed
            ? 'bg-purple-950/95 border-red-500 text-red-200 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
            : 'bg-[#0B1325]/95 border-purple-500/60 text-purple-200 hover:border-purple-400'
        }`}
      >
        <span>{isMeCursed ? '☠️' : '🎃'}</span>
        <span>{isMeCursed ? 'คุณต้องสาป!' : 'Trick or Treat'}</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {/* หน้าต่าง Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0B1325] border border-purple-500/60 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('treats')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    tab === 'treats' ? 'bg-orange-500 text-[#050811]' : 'bg-[#050811] text-slate-300 hover:text-white'
                  }`}
                >
                  🍬 ถุงลูกอม {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('curse')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    tab === 'curse' ? 'bg-purple-500 text-white' : 'bg-[#050811] text-slate-300 hover:text-white'
                  }`}
                >
                  ☠️ คำสาป {isMeCursed && '(!)'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#050811] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {!currentUser ? (
              <div className="py-10 text-center text-xs text-slate-400">
                เข้าสู่ระบบสมาชิกเพื่อเล่น Trick-or-Treat และระบบคำสาป
              </div>
            ) : tab === 'treats' ? (
              <div className="space-y-4">
                {/* ฟอร์มส่งให้เพื่อน */}
                <form onSubmit={handleSendTreat} className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2.5 text-xs">
                  <div className="font-bold text-orange-300">ส่ง Trick หรือ Treat ให้เพื่อน</div>
                  <div className="flex gap-2">
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      required
                      className="inp flex-1 text-xs py-1.5"
                    >
                      <option value="">-- เลือกสมาชิก --</option>
                      {otherMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id})
                        </option>
                      ))}
                    </select>
                    <div className="flex rounded-xl overflow-hidden border border-[#1E3A5F] shrink-0">
                      <button
                        type="button"
                        onClick={() => setMode('treat')}
                        className={`px-2.5 py-1 font-bold ${mode === 'treat' ? 'bg-amber-400 text-[#050811]' : 'bg-[#0B1325] text-slate-400'}`}
                      >
                        🍬 Treat
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('trick')}
                        className={`px-2.5 py-1 font-bold ${mode === 'trick' ? 'bg-purple-600 text-white' : 'bg-[#0B1325] text-slate-400'}`}
                      >
                        🕷️ Trick
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={120}
                      placeholder={mode === 'treat' ? 'เขียนคำอวยพร (+2 🍬 ให้เพื่อน)...' : 'เขียนข้อความแกล้ง (จะกลับหัวตอนเปิด)...'}
                      className="inp flex-1 text-xs py-1.5"
                    />
                    <button type="submit" disabled={sending || !targetId} className="btn-w text-xs px-3 py-1.5 disabled:opacity-50">
                      ส่ง
                    </button>
                  </div>
                </form>

                {/* รายการที่ได้รับ */}
                <div className="h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {treats.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#1E3A5F] rounded-xl">
                      ถุงลูกอมยังว่างอยู่ ลองส่งให้เพื่อนก่อนเลย!
                    </div>
                  ) : (
                    treats.map((item) => {
                      const sender = getAuthor(item.fromUserId);
                      const isTrick = item.mode === 'trick';
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenItem(item)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            !item.isRead
                              ? 'bg-orange-950/30 border-orange-500/70 hover:bg-orange-950/50'
                              : 'bg-[#050811]/80 border-[#1E3A5F]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 font-bold text-white">
                              <Avatar user={sender} size="xs" showStatus={false} />
                              <span>{sender?.displayName || item.fromUserId}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isTrick ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'}`}>
                              {isTrick ? '🕷️ TRICK' : '🍬 TREAT +2'}
                            </span>
                          </div>
                          {!item.isRead ? (
                            <div className="text-[11px] text-amber-300 font-bold">🎁 แตะเพื่อเปิดดูข้อความ...</div>
                          ) : (
                            <p className={`text-slate-300 mt-1 ${isTrick ? 'rotate-180 inline-block text-purple-300' : ''}`}>
                              {item.message}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* แท็บคำสาป */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-[#050811] border border-purple-500/40 text-center space-y-2">
                  <div className="text-[11px] text-purple-300 uppercase tracking-wider font-bold">ผู้ต้องสาปคนปัจจุบันบนวงโคจร</div>
                  {cursedUser ? (
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="p-1 rounded-full ring-2 ring-red-500 shadow-[0_0_18px_rgba(239,68,68,0.6)]">
                        <Avatar user={cursedUser} size="lg" showStatus={false} />
                      </div>
                      <div className="font-bold text-base text-white">{cursedUser.displayName}</div>
                      <p className="text-[11px] text-slate-400">
                        ใครที่เผลอกดโดนโปรไฟล์คนนี้บนวงโคจรหน้า Home จะโดน Jump Scare และรับคำสาปต่อทันที!
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-400 py-4">ยังไม่มีใครต้องสาปในตอนนี้</div>
                  )}
                </div>

                {isMeCursed && (
                  <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/50 space-y-3">
                    <div className="font-bold text-red-300">☠️ คุณกำลังติดคำสาป! เลือกวิธีหลุดพ้น:</div>
                    <div className="flex gap-2">
                      <select
                        value={curseTargetId}
                        onChange={(e) => setCurseTargetId(e.target.value)}
                        className="inp flex-1 text-xs py-1.5"
                      >
                        <option value="">-- เลือกคนที่จะส่งต่อคำสาป --</option>
                        {otherMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!curseTargetId}
                        onClick={handlePassCurse}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                      >
                        ส่งต่อ
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={myCandies < 5}
                      onClick={handleCleanseCurse}
                      className="w-full py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold hover:bg-amber-500 hover:text-[#050811] transition-colors disabled:opacity-40"
                    >
                      ✨ ใช้ 5 ลูกอมล้างคำสาป (คุณมี {myCandies} 🍬)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}