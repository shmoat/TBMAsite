import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { fmtTime, playGameSfx } from '../../lib/utils';
import { GAMES } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, Modal } from '../../components/BasicUI';
import { longPressProps } from '../../components/ContextMenu';
import { GAME_RULES, sortScores, getUserActiveStreak, computeOverallStandings } from './gameUtils';

export default function DailyArcadeLobby({
  gameAppSt,
  allTodayScores,
  todayStr,
  onSelectGame,
  sfxMuted,
  onToggleSfx,
  onResetGuestGame
}) {
  const { currentUser, getAuthor } = useAuth();
  const { openAppMenu, openGuestPrompt, openMemberProfile } = useUI();

  const [lobbyFilter, setLobbyFilter] = useState('ALL');
  const [countdown, setCountdown] = useState('--:--:--');
  const [overallTab, setOverallTab] = useState('daily');
  const [monthScoresAll, setMonthScoresAll] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [hubRuleGame, setHubRuleGame] = useState(null);

  useEffect(() => {
    const calcTimeToReset = () => {
      const now = new Date();
      const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
      const bkkNow = new Date(utcMs + (7 * 3600000));
      const nextReset = new Date(bkkNow);
      nextReset.setHours(6, 0, 0, 0);
      if (bkkNow.getHours() >= 6) nextReset.setDate(nextReset.getDate() + 1);
      const diffSec = Math.max(0, Math.floor((nextReset - bkkNow) / 1000));
      const h = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const s = String(diffSec % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    };
    setCountdown(calcTimeToReset());
    const t = setInterval(() => setCountdown(calcTimeToReset()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (overallTab !== 'monthly') return;
    let cancelled = false;
    setMonthLoading(true);
    const monthPrefix = todayStr.substring(0, 7);
    db.collection('bma_daily_scores')
      .where('date', '>=', `${monthPrefix}-01`)
      .where('date', '<=', `${monthPrefix}-31`)
      .get()
      .then((snap) => {
        if (!cancelled) {
          setMonthScoresAll(snap.docs.map((d) => d.data()));
          setMonthLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setMonthLoading(false); });
    return () => { cancelled = true; };
  }, [overallTab, todayStr]);

  const overallStandings = useMemo(() => {
    const src = overallTab === 'daily' ? allTodayScores : monthScoresAll;
    return computeOverallStandings(src, sortScores);
  }, [overallTab, allTodayScores, monthScoresAll]);

  const myOverallIdx = currentUser ? overallStandings.findIndex((x) => x.userId === currentUser.id) : -1;
  const myStreak = currentUser ? getUserActiveStreak(currentUser, todayStr) : 0;
  const myBestStreak = currentUser?.dailyStreak?.best || myStreak;

  const formatStat = (gIdx, rec) => {
    if (!rec) return '-';
    if (rec.status === 'lost_bomb' || rec.timeMs === Infinity) return 'Bomb';
    if (rec.status === 'lost' && gIdx !== 2) return 'ไม่ผ่าน';
    if (gIdx === 2) return `${rec.score || 0}/3 • ${fmtTime(rec.timeMs)}`;
    if (gIdx === 4) return `${rec.score || 0} ครั้ง • ${fmtTime(rec.timeMs)}`;
    if (gIdx === 5) return `${rec.score || 0} แต้ม`;
    if (gIdx === 6) return `${rec.score || 0} pt (${rec.maxTile || 0})`;
    return fmtTime(rec.timeMs);
  };

  const gameCards = GAMES.map((g, idx) => {
    const gScores = allTodayScores.filter((s) => s.gameIndex === idx);
    const myDbScore = currentUser ? gScores.find((s) => s.userId === currentUser.id) : null;
    const myLocal = gameAppSt[idx];

    let stateType = 'todo';
    let myStatText = '';
    if (myDbScore) {
      const isFailed = myDbScore.status === 'lost_bomb' || myDbScore.status === 'lost' || myDbScore.timeMs === Infinity;
      stateType = isFailed ? 'lost' : 'won';
      myStatText = formatStat(idx, myDbScore);
    } else if (myLocal && myLocal.status !== 'pending') {
      const isFailed = myLocal.status === 'lost_bomb' || myLocal.status === 'lost' || myLocal.time === Infinity;
      stateType = isFailed ? 'lost' : 'won';
      myStatText = formatStat(idx, { status: myLocal.status, score: myLocal.score, timeMs: myLocal.time, maxTile: myLocal.maxTile });
    } else if (myLocal && (myLocal.isPlaying || myLocal.isPaused || (myLocal.time || 0) > 0)) {
      stateType = 'playing';
      myStatText = fmtTime(myLocal.time || 0);
    }

    const validWinners = gScores.filter((s) => s.status !== 'lost_bomb' && s.status !== 'lost' && s.timeMs !== Infinity);
    const sortedWinners = sortScores(validWinners, idx);
    return { g, idx, stateType, myStatText, leader: sortedWinners[0] || null, playerCount: gScores.length };
  });

  const completedCount = gameCards.filter((x) => x.stateType === 'won' || x.stateType === 'lost').length;
  const progressPct = Math.round((completedCount / GAMES.length) * 100);
  const visibleCards = gameCards.filter((c) => {
    if (lobbyFilter === 'TODO') return c.stateType === 'todo' || c.stateType === 'playing';
    if (lobbyFilter === 'DONE') return c.stateType === 'won' || c.stateType === 'lost';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gradient-to-b from-[#050811] to-[#030509]">
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Header Banner */}
        <div className="card p-5 sm:p-6 bg-gradient-to-br from-[#0B1325] via-[#0A1428] to-[#050811] border-[#1E3A5F] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                  <i className="fas fa-gamepad"></i> Daily Arcade Hub • {todayStr}
                </div>
                {currentUser && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${myStreak > 0 ? 'bg-orange-950/60 border-orange-500/50 text-orange-300 shadow-[0_0_12px_rgba(249,115,22,0.25)]' : 'bg-[#050811] border-[#1E3A5F] text-slate-400'}`}
                    title={`สถิติสูงสุดของคุณ: ${myBestStreak} วันติด`}
                  >
                    <span>🔥</span>
                    <span>{myStreak > 0 ? `${myStreak} วันติด` : 'เริ่มเก็บ Streak วันนี้'}</span>
                    {myBestStreak > myStreak && <span className="text-[9px] text-slate-400 font-mono">(Best {myBestStreak})</span>}
                  </div>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">The Blue Moon Daily Games</h2>
              <p className="text-xs text-slate-400 mt-1">ประลองความไวและความแม่นยำประจำวัน เล่นได้เกมละ 1 รอบต่อวัน</p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={onToggleSfx}
                className={`h-14 px-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${sfxMuted ? 'bg-[#050811]/90 border-[#1E3A5F] text-slate-500' : 'bg-[#050811]/90 border-sky-500/40 text-sky-300 hover:border-sky-400'}`}
                title={sfxMuted ? 'เปิดเสียงเอฟเฟกต์เกม' : 'ปิดเสียงเอฟเฟกต์เกม'}
              >
                <i className={`fas ${sfxMuted ? 'fa-volume-mute' : 'fa-volume-up'} text-sm`}></i>
                <span>{sfxMuted ? 'ปิดเสียง' : 'SFX เปิด'}</span>
              </button>
              <div className="bg-[#050811]/90 border border-[#1E3A5F] rounded-2xl px-4 py-2.5 h-14 flex items-center gap-3 shadow-inner">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center text-sm">
                  <i className="fas fa-hourglass-half"></i>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">รีเซ็ตกระดาน (06:00 น.)</div>
                  <div className="text-lg font-mono font-bold text-amber-300 leading-tight">{countdown}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1E3A5F]/70 relative z-10">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <i className="fas fa-tasks text-sky-400"></i>
                ภารกิจวันนี้: <span className="font-mono text-sky-300">{completedCount} / {GAMES.length} เกม</span>
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">{progressPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#050811] rounded-full overflow-hidden border border-[#1E3A5F]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${completedCount === GAMES.length ? 'bg-gradient-to-r from-emerald-400 to-sky-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-gradient-to-r from-sky-500 to-blue-400'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Overall F1 Ranking */}
        <div className="card p-4 sm:p-5 bg-[#0B1325] border-[#1E3A5F] shadow-xl space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E3A5F]/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
                <i className="fas fa-crown"></i><span>ตารางแชมป์คะแนนรวม (Overall F1 Ranking)</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">อันดับ 1–8+ ในแต่ละเกมรับ 10, 8, 6, 5, 4, 3, 2, 1 แต้ม + โบนัสเคลียร์เกมละ 2 แต้ม</p>
            </div>
            <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 text-[11px] font-bold">
              <button type="button" onClick={() => setOverallTab('daily')} className={`px-3 py-1 rounded-lg transition-colors ${overallTab === 'daily' ? 'bg-white text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>ประจำวัน</button>
              <button type="button" onClick={() => setOverallTab('monthly')} className={`px-3 py-1 rounded-lg transition-colors ${overallTab === 'monthly' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>สะสมประจำเดือน</button>
            </div>
          </div>

          {overallTab === 'monthly' && monthLoading ? (
            <div className="py-6 text-center text-xs text-sky-400 font-bold animate-pulse">
              <i className="fas fa-spinner fa-spin mr-1.5"></i> กำลังรวมคะแนนประจำเดือน...
            </div>
          ) : overallStandings.length === 0 ? (
            <div className="py-5 text-center text-xs text-slate-500 border border-dashed border-[#1E3A5F] rounded-xl">
              ยังไม่มีผู้เคลียร์เกมในรอบนี้ — เคลียร์เกมแรกเพื่อขึ้นครองจ่าฝูงเลย!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {overallStandings.slice(0, 5).map((row, i) => {
                const u = getAuthor(row.userId);
                const uStreak = getUserActiveStreak(u, todayStr);
                const isMe = currentUser && row.userId === currentUser.id;
                const rankBadge = i === 0 ? 'bg-amber-400 text-[#050811]' : i === 1 ? 'bg-slate-200 text-[#050811]' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-[#0F2547] text-sky-300';
                return (
                  <div
                    key={row.userId}
                    onClick={() => openMemberProfile(u)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${isMe ? 'bg-sky-950/40 border-sky-400/70' : 'bg-[#050811] border-[#1E3A5F] hover:border-amber-400/50'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${rankBadge}`}>{i + 1}</span>
                      <Avatar user={u} size="xs" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span className="truncate">{u.displayName}</span>
                          {uStreak >= 2 && <span className="text-[9px] text-orange-400 font-mono shrink-0">🔥{uStreak}</span>}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">เคลียร์ {row.clears} เกม{row.firsts > 0 ? ` • #1×${row.firsts}` : ''}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-amber-300 leading-none">{row.points}</div>
                      <div className="text-[8px] text-slate-500 uppercase font-bold mt-0.5">PTS</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentUser && myOverallIdx >= 5 && (
            <div className="pt-2 border-t border-[#1E3A5F]/60 flex items-center justify-between text-xs text-sky-200">
              <span>อันดับคะแนนรวมของคุณ: <strong className="font-mono text-white">#{myOverallIdx + 1}</strong> (เคลียร์ {overallStandings[myOverallIdx].clears} เกม)</span>
              <span className="font-mono font-bold text-amber-300">{overallStandings[myOverallIdx].points} PTS</span>
            </div>
          )}
        </div>

        {!currentUser && (
          <div className="p-3.5 rounded-2xl bg-sky-950/35 border border-sky-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-sky-100">
              <i className="fas fa-flask text-sky-400 text-base"></i>
              <span><strong>โหมดทดลองเล่น (Guest Practice Mode):</strong> ลองเล่นได้ครบทั้ง 9 เกม และกดเล่นซ้ำได้อิสระ (สถิติจะไม่บันทึกขึ้น Leaderboard)</span>
            </div>
            <button type="button" onClick={() => openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกสถิติขึ้นกระดานอันดับประจำวันและประจำเดือน')} className="btn-w py-1.5 px-3.5 text-[11px] shrink-0">
              เข้าสู่ระบบเพื่อเก็บสถิติ
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[#0B1325] p-1 rounded-xl border border-[#1E3A5F] gap-1 text-xs font-bold">
            <button type="button" onClick={() => setLobbyFilter('ALL')} className={`px-3.5 py-1.5 rounded-lg transition-all ${lobbyFilter === 'ALL' ? 'bg-white text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>ทั้งหมด ({GAMES.length})</button>
            <button type="button" onClick={() => setLobbyFilter('TODO')} className={`px-3.5 py-1.5 rounded-lg transition-all ${lobbyFilter === 'TODO' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>ยังไม่จบ ({GAMES.length - completedCount})</button>
            <button type="button" onClick={() => setLobbyFilter('DONE')} className={`px-3.5 py-1.5 rounded-lg transition-all ${lobbyFilter === 'DONE' ? 'bg-emerald-500 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>เล่นแล้ว ({completedCount})</button>
          </div>
          <div className="text-[11px] text-slate-400">
            <i className="fas fa-users text-sky-400 mr-1"></i>
            สถิติที่บันทึกวันนี้รวม <span className="font-mono font-bold text-white">{allTodayScores.length}</span> รอบ
          </div>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map(({ g, idx, stateType, myStatText, leader, playerCount }) => {
            const leaderUser = leader ? getAuthor(leader.userId) : null;
            const handleGameCardCtx = (e) => {
              const items = [
                { icon: 'fas fa-play', label: stateType === 'playing' ? 'เล่นเกมต่อ' : 'เข้าเล่นเกมนี้', accent: true, onClick: () => { playGameSfx('tap'); onSelectGame(idx); } },
                { icon: 'fas fa-book-open', label: 'ดูวิธีเล่นและกติกา', onClick: () => setHubRuleGame(g) },
                { icon: 'fas fa-trophy', label: 'เปิดดูตารางอันดับเกมนี้', onClick: () => { playGameSfx('tap'); onSelectGame(idx, { openLb: true }); } }
              ];
              if (!currentUser && onResetGuestGame && stateType !== 'todo') {
                items.push({ type: 'divider' });
                items.push({ icon: 'fas fa-redo', label: 'รีเซ็ตลองเล่นใหม่ (Guest)', danger: true, onClick: () => onResetGuestGame(idx) });
              }
              openAppMenu(e, {
                header: { icon: g.faIcon || 'fas fa-gamepad', title: g.name, sub: `${playerCount} คนเล่นวันนี้` },
                items
              });
            };

            return (
              <div
                key={g.id}
                onClick={() => { playGameSfx('tap'); onSelectGame(idx); }}
                onContextMenu={handleGameCardCtx}
                {...longPressProps(handleGameCardCtx)}
                className={`group card p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all duration-300 border-[#1E3A5F] bg-[#0B1325] hover:-translate-y-1 ${g.hoverCls}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${g.iconCls}`}>
                      <i className={g.faIcon || 'fas fa-gamepad'}></i>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {stateType === 'won' && <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1"><i className="fas fa-check-circle"></i> เคลียร์แล้ว</span>}
                      {stateType === 'lost' && <span className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-[10px] font-bold flex items-center gap-1"><i className="fas fa-times-circle"></i> จบเกมแล้ว</span>}
                      {stateType === 'playing' && <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 animate-pulse"><i className="fas fa-pause-circle"></i> ค้างไว้</span>}
                      {stateType === 'todo' && <span className="px-2.5 py-1 rounded-full bg-[#050811] border border-[#1E3A5F] text-slate-400 text-[10px] font-bold">ยังไม่เล่น</span>}
                      {myStatText && <span className="text-[10px] font-mono font-bold text-slate-300">{myStatText}</span>}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">{g.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{g.desc}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#1E3A5F]/70">
                  <div className="bg-[#050811] rounded-xl p-2.5 border border-[#1E3A5F]/70 flex items-center justify-between gap-2">
                    {leader && leaderUser ? (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); openMemberProfile(leaderUser); }} className="flex items-center gap-2 min-w-0 hover:opacity-80">
                          <span className="text-amber-400 text-xs shrink-0"><i className="fas fa-crown"></i></span>
                          <Avatar user={leaderUser} size="xs" />
                          <span className="text-xs font-bold text-slate-200 truncate">{leaderUser.displayName}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0">
                          {formatStat(idx, leader)}
                        </span>
                      </>
                    ) : (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 w-full">
                        <i className="fas fa-trophy text-slate-600"></i><span>ยังไม่มีแชมป์วันนี้ — เป็นคนแรกเลย!</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono"><i className="fas fa-user-friends mr-1"></i> {playerCount} คนเล่นแล้ว</span>
                    <span className="font-bold text-sky-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      {stateType === 'playing' ? 'เล่นต่อ' : (stateType === 'won' || stateType === 'lost') ? 'ดูสถิติ / กระดาน' : 'เข้าเล่นเกม'}
                      <i className="fas fa-arrow-right text-[10px]"></i>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hubRuleGame && (
          <Modal title={`กติกา: ${hubRuleGame.name}`} onClose={() => setHubRuleGame(null)} maxW="max-w-md">
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#050811] border border-[#1E3A5F]">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${hubRuleGame.iconCls}`}>
                  <i className={hubRuleGame.faIcon || 'fas fa-gamepad'}></i>
                </div>
                <p className="text-slate-300 leading-relaxed">{hubRuleGame.desc}</p>
              </div>
              <ul className="space-y-2.5 text-slate-200 pl-4 list-disc leading-relaxed">
                {(GAME_RULES[hubRuleGame.id] || []).map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              <button type="button" onClick={() => setHubRuleGame(null)} className="w-full btn-w py-2 text-xs">เข้าใจแล้ว</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}