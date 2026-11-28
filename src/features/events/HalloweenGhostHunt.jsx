import React, { useState, useEffect, useMemo } from 'react';
import { db, FieldValue } from '../../lib/firebase';
import { getBkkNow } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/BasicUI';

const GHOST_TYPES = [
  { type: 'normal', emoji: '👻', label: 'ผีธรรมดา', points: 1, weight: 60, size: 'text-3xl', speedClass: 'duration-700' },
  { type: 'pumpkin', emoji: '🎃', label: 'ผีฟักทอง', points: 3, weight: 25, size: 'text-3xl drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]', speedClass: 'duration-500' },
  { type: 'bloodmoon', emoji: '🌕', label: 'ผี Blood Moon', points: 10, weight: 8, size: 'text-4xl drop-shadow-[0_0_16px_rgba(239,68,68,0.95)] animate-pulse', speedClass: 'duration-300' },
  { type: 'mimic', emoji: '💀', label: 'ผีหลอก (Mimic)', points: 0, weight: 7, size: 'text-3xl drop-shadow-[0_0_10px_rgba(168,85,247,0.85)]', speedClass: 'duration-500' }
];

function rollGhostType() {
  const total = GHOST_TYPES.reduce((sum, g) => sum + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GHOST_TYPES) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return GHOST_TYPES[0];
}

export default function HalloweenGhostHunt({ isHalloween }) {
  const { currentUser, getAuthor } = useAuth();
  const year = getBkkNow().getFullYear();

  const [ghosts, setGhosts] = useState([]);
  const [popups, setPopups] = useState([]);
  const [mimicFlash, setMimicFlash] = useState(false);
  const [scores, setScores] = useState([]);
  const [guestCandies, setGuestCandies] = useState(0);
  const [showBoard, setShowBoard] = useState(false);

  // ดึงตารางอันดับลูกอมประจำปีจาก Firestore
  useEffect(() => {
    if (!isHalloween) return;
    return db
      .collection('bma_halloween_scores')
      .where('year', '==', year)
      .onSnapshot(
        (snap) => {
          const list = snap.docs
            .map((d) => d.data())
            .sort((a, b) => (b.candies || 0) - (a.candies || 0));
          setScores(list);
        },
        () => {}
      );
  }, [isHalloween, year]);

  // สุ่มเกิดผี 4 ระดับ (สูงสุด 3 ตัวพร้อมกัน และผีหายเองถ้าไม่กดใน 14 วิ)
  useEffect(() => {
    if (!isHalloween) {
      setGhosts([]);
      return;
    }
    const spawnIv = setInterval(() => {
      setGhosts((prev) => {
        const now = Date.now();
        const alive = prev.filter((g) => now - g.spawnedAt < 14000);
        if (alive.length >= 3) return alive;
        const tpl = rollGhostType();
        return [
          ...alive,
          {
            id: now + Math.random(),
            ...tpl,
            x: 8 + Math.random() * 82,
            y: 14 + Math.random() * 70,
            spawnedAt: now
          }
        ];
      });
    }, 6500);
    return () => clearInterval(spawnIv);
  }, [isHalloween]);

  const myScore = useMemo(() => {
    if (!currentUser) return guestCandies;
    return scores.find((s) => s.userId === currentUser.id)?.candies || 0;
  }, [scores, currentUser, guestCandies]);

  const catchGhost = async (ghost) => {
    setGhosts((prev) => prev.filter((g) => g.id !== ghost.id));

    // แสดงป๊อปอัปแต้มลอยตรงจุดที่กด
    const popId = Date.now() + Math.random();
    const popText = ghost.type === 'mimic' ? 'แบร่! ผีหลอก 💀' : `+${ghost.points} 🍬`;
    const popColor = ghost.type === 'bloodmoon' ? 'text-red-400' : ghost.type === 'mimic' ? 'text-purple-300' : 'text-amber-300';
    setPopups((prev) => [...prev, { id: popId, x: ghost.x, y: ghost.y, text: popText, color: popColor }]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popId)), 1100);

    // ถ้าเป็นผีหลอก ให้จอสั่นและแฟลชสั้นๆ
    if (ghost.type === 'mimic') {
      setMimicFlash(true);
      setTimeout(() => setMimicFlash(false), 650);
      return;
    }

    // บันทึกแต้มลูกอม
    if (!currentUser) {
      setGuestCandies((c) => c + ghost.points);
      return;
    }

    const docId = `${year}_${currentUser.id}`;
    await db
      .collection('bma_halloween_scores')
      .doc(docId)
      .set(
        {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          year,
          candies: FieldValue.increment(ghost.points),
          caughtCount: FieldValue.increment(1),
          updatedAt: Date.now()
        },
        { merge: true }
      )
      .catch(() => {});
  };

  if (!isHalloween) return null;

  return (
    <>
      {/* ผีที่ลอยให้จับบนหน้าจอ */}
      {ghosts.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => catchGhost(g)}
          className={`ghost-hunt fixed z-[60] cursor-pointer select-none transition-transform hover:scale-125 active:scale-90 ${g.size}`}
          style={{ left: `${g.x}vw`, top: `${g.y}vh` }}
          title={`${g.label} (${g.points > 0 ? `+${g.points} ลูกอม` : 'ระวัง!'})`}
        >
          {g.emoji}
        </button>
      ))}

      {/* ป๊อปอัปแต้มลอยตอนกดจับ */}
      {popups.map((p) => (
        <div
          key={p.id}
          className={`fixed z-[70] pointer-events-none font-bold text-sm drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] animate-bounce ${p.color}`}
          style={{ left: `${p.x}vw`, top: `${p.y}vh` }}
        >
          {p.text}
        </div>
      ))}

      {/* เอฟเฟกต์แฟลชตอนกดโดนผีหลอก Mimic */}
      {mimicFlash && (
        <div className="fixed inset-0 z-[120] pointer-events-none bg-purple-950/55 flex items-center justify-center animate-shake">
          <div className="text-7xl sm:text-8xl drop-shadow-[0_0_30px_rgba(168,85,247,0.9)]">💀</div>
        </div>
      )}

      {/* ปุ่มลอยมุมซ้ายล่าง: แสดงจำนวนลูกอม + เปิดตารางอันดับ */}
      <button
        type="button"
        onClick={() => setShowBoard(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0B1325]/95 border border-orange-500/60 text-xs font-bold text-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 hover:border-amber-400 transition-all"
        title="ดูตารางอันดับนักล่าผี Ghost Hunt 2.0"
      >
        <span>🍬</span>
        <span className="font-mono">{myScore}</span>
        <span className="text-[10px] text-orange-300/90 border-l border-orange-500/40 pl-2">Ghost Hunt</span>
      </button>

      {/* หน้าต่าง Ghost Hunter Leaderboard */}
      {showBoard && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBoard(false)}
        >
          <div
            className="w-full max-w-md bg-[#0B1325] border border-orange-500/60 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
              <div>
                <h3 className="font-bold text-base text-orange-400 flex items-center gap-2">
                  <span>🎃</span> Ghost Hunt Leaderboard {year}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  👻 +1 • 🎃 +3 • 🌕 +10 • 💀 ระวังผีหลอก!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBoard(false)}
                className="w-8 h-8 rounded-lg bg-[#050811] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {scores.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-[#1E3A5F] rounded-xl gap-1">
                  <span className="text-2xl">👻</span>
                  <span>ยังไม่มีนักล่าผีในปีนี้ รอจับผีที่ลอยบนหน้าจอได้เลย!</span>
                </div>
              ) : (
                scores.slice(0, 20).map((s, idx) => {
                  const user = getAuthor(s.userId);
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  const isMe = currentUser?.id === s.userId;
                  return (
                    <div
                      key={s.userId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        isMe ? 'bg-orange-950/30 border-orange-500/60' : 'bg-[#050811]/80 border-[#1E3A5F]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 text-center font-bold font-mono text-amber-300 shrink-0">{medal}</span>
                        <Avatar user={user} size="sm" showStatus={false} />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{user?.displayName || s.displayName}</div>
                          <div className="text-[10px] text-slate-400">จับแล้ว {s.caughtCount || 0} ตัว</div>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold shrink-0">
                        🍬 {s.candies || 0}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!currentUser && (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-center">
                คุณอยู่ในโหมดผู้มาเยือน (สะสมได้ {guestCandies} 🍬) — เข้าสู่ระบบสมาชิกเพื่อบันทึกคะแนนขึ้นตารางอันดับ
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}