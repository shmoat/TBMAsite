import React, { useState, useEffect, useCallback } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { fmtTime, getGameDateStr, isGameSfxMuted, playGameSfx } from '../../lib/utils';
import { GAMES } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, Modal } from '../../components/BasicUI';
import { GAME_RULES, sortScores, getPrevDateStr } from './gameUtils';
import DailyArcadeLobby from './DailyArcadeLobby';
import { SudokuGame, MinesweeperGame, FlagGuesserGame, SolitaireGame } from './games/GamesPart1';
import { WordleGame, SnakeGame, Game2048, Game24, ResistorGame } from './games/GamesPart2';

export default function DailyGamesPage({
  activeGameTab,
  setActiveGameTab,
  channels = [],
  myGroups = [],
  onShareToBoardDone,
  onShareToChatDone
}) {
  const { currentUser, setCurrentUser, getAuthor } = useAuth();
  const { openGuestPrompt, openMemberProfile } = useUI();

  const todayStr = getGameDateStr();
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 1024);
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 1024);
  const [gameAppSt, setGameAppSt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bma_gameSt_' + todayStr)) || {}; } catch { return {}; }
  });
  const [allTodayScores, setAllTodayScores] = useState([]);
  const [gameScores, setGameScores] = useState([]);
  const [lbTab, setLbTab] = useState('daily');
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [gameFocusMode, setGameFocusMode] = useState(false);
  const [gameRulesOpen, setGameRulesOpen] = useState(false);
  const [shareChatRoom, setShareChatRoom] = useState('global-lobby');
  const [gameSfxMuted, setGameSfxMuted] = useState(() => isGameSfxMuted());

  useEffect(() => {
    try { localStorage.setItem('bma_gameSt_' + todayStr, JSON.stringify(gameAppSt)); } catch {}
  }, [gameAppSt, todayStr]);

  // ล้างข้อมูลเกมวันเก่าใน LocalStorage อัตโนมัติ
  useEffect(() => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bma_') && /\d{4}-\d{2}-\d{2}/.test(key) && !key.includes(todayStr)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, [todayStr]);

  const toggleGameSfx = useCallback(() => {
    setGameSfxMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem('tbma_game_sfx_muted', next ? '1' : '0'); } catch {}
      if (!next) setTimeout(() => playGameSfx('tap'), 30);
      return next;
    });
  }, []);

  const currGameSt = activeGameTab !== null
    ? (gameAppSt[activeGameTab] || { status: 'pending', time: 0, isPlaying: false, isPaused: false, score: 0, showModal: false })
    : { status: 'pending', time: 0, isPlaying: false, isPaused: false, score: 0, showModal: false };

  const handleFirstMove = useCallback(() => {
    if (activeGameTab === null) return;
    setGameAppSt((prev) => {
      const c = prev[activeGameTab] || {};
      if (c.isPlaying && !c.hasStartedMove) return { ...prev, [activeGameTab]: { ...c, hasStartedMove: true } };
      return prev;
    });
  }, [activeGameTab]);

  const handleAddGamePenalty = useCallback((sec) => {
    if (activeGameTab === null) return;
    setGameAppSt((prev) => {
      const c = prev[activeGameTab] || {};
      if (!c.isPlaying || c.status !== 'pending') return prev;
      return { ...prev, [activeGameTab]: { ...c, time: (c.time || 0) + sec } };
    });
  }, [activeGameTab]);

  // Timer นับเวลาเฉพาะหน้านี้
  useEffect(() => {
    if (activeGameTab === null) return;
    const intv = setInterval(() => {
      setGameAppSt((prev) => {
        const c = prev[activeGameTab] || {};
        if (c.isPlaying && c.status === 'pending' && !c.isPaused && c.hasStartedMove !== false) {
          return { ...prev, [activeGameTab]: { ...c, time: (c.time || 0) + 1 } };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(intv);
  }, [activeGameTab]);

  // โหลดคะแนนประจำวันทั้งหมด
  useEffect(() => {
    return db.collection('bma_daily_scores')
      .where('date', '==', todayStr)
      .onSnapshot((s) => setAllTodayScores(s.docs.map((d) => d.data())), () => {});
  }, [todayStr]);

  useEffect(() => {
    if (activeGameTab === null) { setGameScores([]); return; }
    setGameScores(sortScores(allTodayScores.filter((s) => s.gameIndex === activeGameTab), activeGameTab));
  }, [allTodayScores, activeGameTab]);

  useEffect(() => {
    if (lbTab !== 'monthly' || activeGameTab === null) return;
    const prefix = todayStr.substring(0, 7);
    db.collection('bma_daily_scores').where('gameIndex', '==', activeGameTab).get().then((s) => {
      const docs = s.docs.map((d) => d.data()).filter((d) =>
        d.date.startsWith(prefix) &&
        d.timeMs !== Infinity &&
        d.status !== 'lost_bomb' &&
        !(d.status === 'lost' && !(activeGameTab === 2 && (d.score || 0) > 0))
      );
      const best = {};
      docs.forEach((sc) => {
        if (!best[sc.userId]) best[sc.userId] = sc;
        else {
          let isB = false;
          if (activeGameTab === 2) isB = (sc.score || 0) > (best[sc.userId].score || 0) || ((sc.score || 0) === (best[sc.userId].score || 0) && sc.timeMs < best[sc.userId].timeMs);
          else if (activeGameTab === 4) isB = (sc.score || 99) < (best[sc.userId].score || 99) || ((sc.score || 99) === (best[sc.userId].score || 99) && sc.timeMs < best[sc.userId].timeMs);
          else if ([5, 6, 8].includes(activeGameTab)) isB = (sc.score || 0) > (best[sc.userId].score || 0) || ((sc.score || 0) === (best[sc.userId].score || 0) && sc.timeMs < best[sc.userId].timeMs);
          else isB = sc.timeMs < best[sc.userId].timeMs;
          if (isB) best[sc.userId] = sc;
        }
      });
      setMonthlyScores(sortScores(Object.values(best), activeGameTab));
    }).catch(() => {});
  }, [lbTab, activeGameTab, todayStr]);

  const handleGameWinLose = async (result, payload = {}) => {
    const st = result === 'bomb' ? 'lost_bomb' : result;
    const sVal = payload.score || 0;

    if (currentUser) {
      const ds = currentUser.dailyStreak || {};
      if (ds.lastDate !== todayStr) {
        const prevDay = getPrevDateStr(todayStr);
        const nextCount = ds.lastDate === prevDay ? (ds.count || 0) + 1 : 1;
        const nextStreak = { count: nextCount, lastDate: todayStr, best: Math.max(ds.best || 0, nextCount) };
        setCurrentUser((prev) => (prev ? { ...prev, dailyStreak: nextStreak } : prev));
        db.collection('bma_users').doc(currentUser.id).update({ dailyStreak: nextStreak }).catch(() => {});
      }
    }

    setGameAppSt((prev) => {
      const c = prev[activeGameTab] || {};
      const fTime = result === 'bomb' ? Infinity : (c.time || 0);

      if (currentUser) {
        const ext = gameScores.find((x) => x.userId === currentUser.id);
        let up = false;
        if (!ext) up = true;
        else if (activeGameTab === 2 && (sVal > (ext.score || 0) || (sVal === (ext.score || 0) && fTime < ext.timeMs))) up = true;
        else if (activeGameTab === 4 && (sVal < (ext.score || 99) || (sVal === (ext.score || 99) && fTime < ext.timeMs))) up = true;
        else if ([5, 6, 8].includes(activeGameTab) && (sVal > (ext.score || 0) || (sVal === (ext.score || 0) && fTime < ext.timeMs))) up = true;
        else if (![2, 4, 5, 6, 8].includes(activeGameTab) && fTime < ext.timeMs) up = true;

        if (up) {
          db.collection('bma_daily_scores').doc(`${todayStr}_${activeGameTab}_${currentUser.id}`).set({
            userId: currentUser.id,
            displayName: currentUser.displayName,
            date: todayStr,
            timeMs: fTime,
            status: st,
            gameIndex: activeGameTab,
            score: sVal,
            maxTile: payload.maxTile || null,
            shareGrid: payload.shareGrid || null,
            timestamp: Date.now()
          });
        }
      }
      return {
        ...prev,
        [activeGameTab]: {
          ...c,
          isPlaying: false,
          status: st,
          score: sVal,
          time: fTime,
          showModal: true,
          answer: payload.answer || null,
          maxTile: payload.maxTile || null,
          shareGrid: payload.shareGrid || null
        }
      };
    });
  };

  const shareGameResult = async () => {
    if (!currentUser || activeGameTab === null) return;
    const myScore = gameScores.find((x) => x.userId === currentUser.id);
    const t = myScore ? myScore.timeMs : currGameSt.time;
    const st = myScore ? myScore.status : currGameSt.status;
    const sc = myScore ? (myScore.score || 0) : (currGameSt.score || 0);
    const mTile = myScore ? myScore.maxTile : currGameSt.maxTile;
    const gridStr = currGameSt.shareGrid || myScore?.shareGrid || '';

    let msg = '';
    if (st === 'lost_bomb' || t === Infinity) msg = `พลาดเหยียบระเบิดในเกม ${GAMES[activeGameTab].name}! พรุ่งนี้เอาใหม่ 😭💣`;
    else if (st === 'lost' && activeGameTab === 2) msg = `ทายธงพลาด! ถูกไปแค่ ${sc}/3 ประเทศ ในเกม ${GAMES[activeGameTab].name} 🏳️`;
    else if (st === 'lost' && activeGameTab === 4) msg = `ทายคำศัพท์ไม่ถูกใน ${GAMES[activeGameTab].name} (${todayStr})! พรุ่งนี้เอาใหม่นะ 🔤${gridStr ? `\n\n${gridStr}` : ''}`;
    else if (st === 'lost' && activeGameTab === 8) msg = `ต่อวงจรระเบิดตู้ม! ทายผิด 3 ครั้งในเกม ${GAMES[activeGameTab].name} 💥`;
    else if (activeGameTab === 2) msg = `ทายถูก ${sc}/3 ประเทศ ใช้เวลา ${fmtTime(t)} ในเกม ${GAMES[activeGameTab].name}! 🏳️`;
    else if (activeGameTab === 4) msg = `Wordle (${todayStr}) ${sc}/6 • ใช้เวลา ${fmtTime(t)} 🔤${gridStr ? `\n\n${gridStr}` : ''}`;
    else if (activeGameTab === 5) msg = `ทำคะแนนได้ ${sc} 🍎 ใช้เวลา ${fmtTime(t)} ในเกม ${GAMES[activeGameTab].name}! 🐍`;
    else if (activeGameTab === 6) msg = `ทำคะแนนรวมไปได้ ${sc} คะแนน โดยได้เลขสูงสุดคือ [${mTile || 0}] 🟨 ในเกม ${GAMES[activeGameTab].name}! 😎`;
    else if (activeGameTab === 8) msg = `ต่อวงจรสำเร็จใน ${Math.max(1, 4 - Math.floor(sc / 100))} ครั้ง! ใช้เวลา ${fmtTime(t)} ในเกม ${GAMES[activeGameTab].name}! 🔌`;
    else msg = `ทำเวลาไปได้ ${fmtTime(t)} ในเกม ${GAMES[activeGameTab].name}! ใครว่างมาท้าดวลกัน 😎`;

    const postId = 'post-' + Date.now();
    await db.collection('bma_posts').doc(postId).set({
      id: postId,
      authorId: currentUser.id,
      title: `แชร์สถิติ Daily Game: ${GAMES[activeGameTab].name}`,
      content: msg,
      dailyGameShare: { gameIndex: activeGameTab, timeMs: t, score: sc, dateStr: todayStr },
      isGuestAllowed: true,
      category: 'General',
      attachments: [],
      mutedBy: [],
      createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      serverCreatedAt: svrTs(),
      likes: [],
      bookmarks: [],
      comments: []
    });
    alert('แชร์ไปที่กระดานโพสต์เรียบร้อย!');
    setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), showModal: false, status: 'viewing_board' } }));
    onShareToBoardDone?.();
  };

  const shareGameToChat = async (targetKey) => {
    if (!currentUser || activeGameTab === null) return;
    const myScore = gameScores.find((x) => x.userId === currentUser.id);
    const st = myScore ? myScore.status : currGameSt.status;
    const sc = myScore ? (myScore.score || 0) : (currGameSt.score || 0);
    const t = myScore ? myScore.timeMs : currGameSt.time;
    const mTile = myScore ? myScore.maxTile : currGameSt.maxTile;
    const gridStr = currGameSt.shareGrid || myScore?.shareGrid || '';

    let msg = '';
    if (st === 'lost_bomb' || t === Infinity) msg = `พลาดเหยียบระเบิดในเกม ${GAMES[activeGameTab].name} วันนี้! ใครรอดบ้างมาอวดหน่อย`;
    else if (st === 'lost' && activeGameTab === 2) msg = `ทายธงได้ ${sc}/3 ประเทศ ในเกม ${GAMES[activeGameTab].name} ใครทำได้ครบมาท้าดวลกัน!`;
    else if (st === 'lost' && activeGameTab === 4) msg = `Wordle (${todayStr}) X/6 ใครทายออกช่วยด้วย!${gridStr ? `\n${gridStr}` : ''}`;
    else if (st === 'lost' && activeGameTab === 8) msg = `ต่อวงจรระเบิดใน ${GAMES[activeGameTab].name}! ใครแม่นแถบสีมาลองดู`;
    else if (activeGameTab === 2) msg = `ทายธงถูก ${sc}/3 ประเทศ ใช้เวลา ${fmtTime(t)} ใน ${GAMES[activeGameTab].name} มาท้าดวลกัน!`;
    else if (activeGameTab === 4) msg = `Wordle (${todayStr}) ${sc}/6 (${fmtTime(t)}) ใครเร็วกว่านี้มาลอง!${gridStr ? `\n${gridStr}` : ''}`;
    else if (activeGameTab === 5) msg = `ทำคะแนน ${GAMES[activeGameTab].name} ไปได้ ${sc} แต้ม (${fmtTime(t)}) มาทำลายสถิติกัน!`;
    else if (activeGameTab === 6) msg = `ทำคะแนน ${GAMES[activeGameTab].name} ได้ ${sc} pt (เลขสูงสุด ${mTile || 0}) มาลองสู้กัน!`;
    else if (activeGameTab === 8) msg = `ต่อวงจร ${GAMES[activeGameTab].name} สำเร็จใน ${Math.max(1, 4 - Math.floor(sc / 100))} ครั้ง (${fmtTime(t)})!`;
    else msg = `เคลียร์เกม ${GAMES[activeGameTab].name} ได้ในเวลา ${fmtTime(t)}! ใครทำได้เร็วกว่านี้มาท้าดวลกัน`;

    const roomId = targetKey || shareChatRoom || 'global-lobby';
    const isGrp = myGroups.some((g) => g.id === roomId);
    const now = Date.now();
    const mid = 'msg-' + now + '-' + Math.random().toString(36).slice(2, 5);
    const dStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const fullTime = `${dStr} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

    await db.collection('bma_messages').doc(mid).set({
      id: mid,
      roomKey: roomId,
      senderId: currentUser.id,
      receiverId: null,
      text: msg,
      dailyGameShare: { gameIndex: activeGameTab, timeMs: t, score: sc, dateStr: todayStr },
      attachments: [],
      likes: [],
      readBy: [currentUser.id],
      isEdited: false,
      isDeleted: false,
      isSystemPostAlert: false,
      time: fullTime,
      timestamp: now,
      serverCreatedAt: svrTs()
    });

    alert('ส่งคำท้าลงห้องแชตเรียบร้อยแล้ว!');
    setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), showModal: false, status: 'viewing_board' } }));
    onShareToChatDone?.({ type: isGrp ? 'group' : 'channel', id: roomId });
  };

  const resetGuestPracticeGame = (gIdx) => {
    if (currentUser || gIdx === null) return;
    const prefixMap = {
      0: ['bma_sudoku_v2_'],
      1: ['bma_ms_mines_', 'bma_ms_grid_', 'bma_ms_rev_', 'bma_ms_flag_'],
      2: ['bma_fg_rds_', 'bma_fg_curr_', 'bma_fg_wrong_', 'bma_fg_5050_', 'bma_fg_elim_'],
      3: ['bma_sol_', 'bma_sol_init_'],
      4: ['bma_wdl_g_', 'bma_wdl_c_'],
      5: ['bma_snake_s_', 'bma_snake_f_', 'bma_snake_d_', 'bma_snake_nd_', 'bma_snake_go_', 'bma_snake_sc_', 'bma_snake_step_', 'bma_snake_gf_'],
      6: ['bma_2048_b_', 'bma_2048_s_', 'bma_2048_m_', 'bma_2048_max_', 'bma_2048_f_', 'bma_2048_r_'],
      7: ['bma_24_n_'],
      8: ['bma_res_t_', 'bma_res_tol_', 'bma_res_c_', 'bma_res_exp_', 'bma_res_l_']
    };
    (prefixMap[gIdx] || []).forEach((p) => localStorage.removeItem(p + todayStr));
    setGameAppSt((prev) => {
      const next = { ...prev };
      delete next[gIdx];
      return next;
    });
  };

  if (activeGameTab === null) {
    return (
      <DailyArcadeLobby
        gameAppSt={gameAppSt}
        allTodayScores={allTodayScores}
        todayStr={todayStr}
        onSelectGame={(idx, opts) => {
          setActiveGameTab(idx);
          if (opts?.openLb) {
            setGameFocusMode(false);
            setRightOpen(true);
            if (window.innerWidth < 1024) setLeftOpen(false);
          } else if (window.innerWidth < 1024) {
            setLeftOpen(false);
            setRightOpen(false);
          }
        }}
        onResetGuestGame={resetGuestPracticeGame}
        sfxMuted={gameSfxMuted}
        onToggleSfx={toggleGameSfx}
      />
    );
  }

  const activeGame = GAMES[activeGameTab];
  const isEndedView = currGameSt.status === 'viewing_board' || (!currGameSt.isPlaying && currGameSt.status !== 'pending');
  const isRunning = currGameSt.isPlaying && !currGameSt.isPaused && currGameSt.status === 'pending';

  const rawList = lbTab === 'daily' ? gameScores : monthlyScores;
  const isFailedRec = (s) => s.status === 'lost_bomb' || s.timeMs === Infinity || (s.status === 'lost' && !(activeGameTab === 2 && (s.score || 0) > 0));
  const validList = sortScores(rawList.filter((s) => !isFailedRec(s)), activeGameTab);
  const failedList = rawList.filter((s) => isFailedRec(s));

  const formatBadge = (s) => {
    if (s.status === 'lost_bomb' || s.timeMs === Infinity) return 'Bomb';
    if (s.status === 'lost' && activeGameTab !== 2) return 'ไม่ผ่าน';
    if (activeGameTab === 2) return `${s.score || 0}/3`;
    if (activeGameTab === 4) return `${s.score || 0} ครั้ง`;
    if (activeGameTab === 5) return `${s.score || 0} แต้ม`;
    if (activeGameTab === 6) return `${s.score || 0} pt`;
    return fmtTime(s.timeMs);
  };

  const formatSub = (s) => {
    if (activeGameTab === 2 || activeGameTab === 4) return fmtTime(s.timeMs);
    if (activeGameTab === 5) return `เวลา ${fmtTime(s.timeMs)}`;
    if (activeGameTab === 6) return `สูงสุด ${s.maxTile || 0}`;
    if (activeGameTab === 8) return s.score > 0 ? `ตอบ ${Math.max(1, 4 - Math.floor(s.score / 100))} ครั้ง` : 'วงจรระเบิด';
    return lbTab === 'monthly' ? s.date : '';
  };

  const myValidIdx = currentUser ? validList.findIndex((s) => s.userId === currentUser.id) : -1;
  const myFailed = currentUser ? failedList.find((s) => s.userId === currentUser.id) : null;

  const getGapText = () => {
    if (myValidIdx === 0) return 'คุณกำลังครองอันดับ 1!';
    const me = validList[myValidIdx];
    const above = validList[myValidIdx - 1];
    const targetRank = myValidIdx;
    if (activeGameTab === 2 && (above.score || 0) > (me.score || 0)) return `ทายถูกเพิ่มอีก ${(above.score || 0) - (me.score || 0)} ด่าน เพื่อขึ้นอันดับ ${targetRank}`;
    if (activeGameTab === 4 && (me.score || 0) > (above.score || 0)) return `ทายน้อยลงอีก ${(me.score || 0) - (above.score || 0)} ครั้ง เพื่อขึ้นอันดับ ${targetRank}`;
    if (activeGameTab === 5 && (above.score || 0) > (me.score || 0)) return `เก็บเพิ่มอีก ${(above.score || 0) - (me.score || 0)} แต้ม เพื่อขึ้นอันดับ ${targetRank}`;
    if (activeGameTab === 6 && (above.score || 0) > (me.score || 0)) return `ทำเพิ่มอีก ${(above.score || 0) - (me.score || 0)} pt เพื่อขึ้นอันดับ ${targetRank}`;
    if (activeGameTab === 8 && (above.score || 0) > (me.score || 0)) return `ตอบพลาดน้อยลงอีก 1 ครั้ง เพื่อขึ้นอันดับ ${targetRank}`;
    const diffSec = Math.max(1, Math.round((me.timeMs || 0) - (above.timeMs || 0)));
    return `เร็วกว่านี้อีก ${fmtTime(diffSec)} จะขึ้นอันดับ ${targetRank}`;
  };

  const podiumSlots = [
    { rank: 2, rec: validList[1], heightCls: 'h-16', ringCls: 'ring-slate-300', barCls: 'from-slate-300/25 to-slate-800/40 border-slate-400/50 text-slate-200', crown: false },
    { rank: 1, rec: validList[0], heightCls: 'h-24', ringCls: 'ring-amber-400', barCls: 'from-amber-400/30 to-amber-950/40 border-amber-400/70 text-amber-300', crown: true },
    { rank: 3, rec: validList[2], heightCls: 'h-12', ringCls: 'ring-amber-700', barCls: 'from-amber-700/25 to-amber-950/30 border-amber-700/60 text-amber-500', crown: false }
  ];

  const shareableRooms = [
    ...channels.filter((c) => !c.isSystemReadOnly).map((c) => ({ id: c.id, label: `# ${c.name}` })),
    ...myGroups.filter((g) => !g.isArchived).map((g) => ({ id: g.id, label: `[กลุ่ม] ${g.name}` }))
  ];

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Left Game Switcher */}
      <aside className={`absolute md:relative z-40 w-56 h-full bg-[#070C18] border-r border-[#1E3A5F] flex flex-col transition-transform duration-300 ${!gameFocusMode && leftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden md:w-0'}`}>
        <div className="p-3 border-b border-[#1E3A5F] space-y-2">
          <button
            type="button"
            onClick={() => {
              if (currGameSt.isPlaying && !currGameSt.isPaused && currGameSt.status === 'pending') {
                setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), isPaused: true } }));
              }
              setActiveGameTab(null);
            }}
            className="w-full py-2 px-3 rounded-xl bg-[#0F2547] hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <i className="fas fa-th-large"></i> กลับหน้า Arcade Hub
          </button>
          <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex justify-between items-center px-1">
            <span>เลือกมินิเกมประจำวัน</span>
            <button type="button" onClick={() => setLeftOpen(false)} className="md:hidden text-base text-slate-400">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
          {GAMES.map((g, idx) => {
            const done = allTodayScores.some((s) => s.gameIndex === idx && s.userId === currentUser?.id) || (gameAppSt[idx] && gameAppSt[idx].status !== 'pending');
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => { setActiveGameTab(idx); if (window.innerWidth < 768) setLeftOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl transition-all text-xs ${activeGameTab === idx ? 'bg-white text-[#050811] shadow font-bold border border-white/20' : 'text-slate-300 hover:bg-[#0F2547]'}`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <i className={`${g.faIcon} w-4 text-center`}></i>
                  <span className="truncate">{g.name}</span>
                </span>
                {done && <i className={`fas fa-check-circle text-[11px] shrink-0 ${activeGameTab === idx ? 'text-emerald-600' : 'text-emerald-400'}`}></i>}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center Game Canvas */}
      <main className="flex-1 flex flex-col h-full bg-[#050811] relative min-w-0">
        {!gameFocusMode && leftOpen && <div className="absolute inset-0 bg-black/50 z-30 md:hidden" onClick={() => setLeftOpen(false)}></div>}
        {!gameFocusMode && rightOpen && <div className="absolute inset-0 bg-black/50 z-30 md:hidden" onClick={() => setRightOpen(false)}></div>}

        <div className="h-12 px-3 sm:px-4 bg-[#0B1325] border-b border-[#1E3A5F] flex items-center justify-between gap-2 shrink-0 text-xs z-20">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (currGameSt.isPlaying && !currGameSt.isPaused && currGameSt.status === 'pending') {
                  setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), isPaused: true } }));
                }
                setGameFocusMode(false);
                setActiveGameTab(null);
              }}
              className="btn-d py-1.5 px-2.5 text-[11px] font-bold flex items-center gap-1.5 hover:bg-white hover:text-[#050811] transition-colors shrink-0"
            >
              <i className="fas fa-arrow-left"></i><span className="hidden sm:inline">Hub</span>
            </button>

            {!gameFocusMode && (
              <button
                type="button"
                onClick={() => { const next = !leftOpen; setLeftOpen(next); if (next && window.innerWidth < 768) setRightOpen(false); }}
                className="btn-d py-1.5 px-2.5 text-[11px] font-semibold flex items-center gap-1.5 shrink-0"
              >
                <i className={`fas ${leftOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
                <span className="hidden sm:inline">{leftOpen ? 'ซ่อนเมนู' : 'เมนูเกม'}</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden md:flex items-center gap-2">
            <span className="text-sky-400 font-bold uppercase tracking-wider font-sans">Daily Challenge</span>
            <span>•</span><span>{todayStr}</span><span>•</span><span>รีเซ็ต 06:00 น.</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleGameSfx}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${gameSfxMuted ? 'bg-[#050811] text-slate-500 border-[#1E3A5F]' : 'bg-[#050811] text-sky-300 border-sky-500/40 hover:border-sky-400'}`}
              title={gameSfxMuted ? 'เปิดเสียงเอฟเฟกต์เกม' : 'ปิดเสียงเอฟเฟกต์เกม'}
            >
              <i className={`fas ${gameSfxMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
            <button
              type="button"
              onClick={() => setGameFocusMode(!gameFocusMode)}
              className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${gameFocusMode ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.4)]' : 'bg-[#050811] text-slate-300 border-[#1E3A5F] hover:text-white hover:border-sky-500/60'}`}
            >
              <i className={`fas ${gameFocusMode ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
              <span className="hidden sm:inline">{gameFocusMode ? 'ออกโฟกัส' : 'โฟกัส'}</span>
            </button>
            {!gameFocusMode && (
              <button
                type="button"
                onClick={() => { const next = !rightOpen; setRightOpen(next); if (next && window.innerWidth < 768) setLeftOpen(false); }}
                className="btn-w py-1.5 px-2.5 text-[11px] flex items-center gap-1.5"
              >
                <i className="fas fa-trophy text-amber-500"></i>
                <span className="hidden sm:inline">{rightOpen ? 'ซ่อนอันดับ' : 'อันดับ'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 flex flex-col relative custom-scrollbar">
          <div className={`${gameFocusMode ? 'max-w-2xl' : 'max-w-xl'} mx-auto w-full flex-1 flex flex-col transition-all duration-300`}>
            <div className="card flex-1 flex flex-col overflow-hidden relative shadow-2xl min-h-[460px] border-[#1E3A5F]">
              <div className={`h-1 w-full shrink-0 ${activeGame.barCls || 'bg-sky-400'}`}></div>

              <div className="px-3 py-2.5 bg-[#070C18] border-b border-[#1E3A5F] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0 ${activeGame.iconCls}`}>
                    <i className={activeGame.faIcon || 'fas fa-gamepad'}></i>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">{activeGame.name}</h2>
                    <div className="text-[10px] text-slate-400 md:hidden font-mono">{todayStr}</div>
                  </div>
                  <button type="button" onClick={() => setGameRulesOpen(true)} className="w-6 h-6 rounded-full bg-[#0F2547] border border-[#1E3A5F] text-sky-300 hover:bg-sky-500 hover:text-white text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors ml-0.5" title="วิธีเล่นและกติกา">?</button>
                </div>

                <div className={`px-3 py-1 rounded-xl border font-mono text-base sm:text-lg font-bold flex items-center gap-2 shrink-0 ${isRunning ? 'bg-[#050811] border-sky-500/40 text-white shadow-[0_0_10px_rgba(56,189,248,0.15)]' : 'bg-[#050811] border-[#1E3A5F] text-slate-300'}`}>
                  {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                  <span>{fmtTime(currGameSt.time)}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isRunning && (
                    <button type="button" onClick={() => setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), isPaused: true } }))} className="px-2.5 py-1.5 rounded-xl bg-[#0F2547] border border-[#1E3A5F] text-slate-200 hover:bg-amber-500 hover:text-[#050811] hover:border-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors">
                      <i className="fas fa-pause text-[10px]"></i><span className="hidden sm:inline">พัก</span>
                    </button>
                  )}
                  {isEndedView && (
                    <button type="button" onClick={() => setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...p[activeGameTab], showModal: true } }))} className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow">
                      <i className="fas fa-award text-[11px]"></i><span className="hidden sm:inline">สรุปผล</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col p-2.5 sm:p-4 bg-[#050811] relative">
                {!currGameSt.isPlaying && currGameSt.status === 'pending' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-5">
                    <div className={`w-20 h-20 rounded-3xl border-2 flex items-center justify-center text-4xl shadow-2xl ${activeGame.iconCls}`}>
                      <i className={activeGame.faIcon || 'fas fa-gamepad'}></i>
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h3 className="text-xl font-bold text-white">{activeGame.name}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{activeGame.desc}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setGameAppSt((p) => ({ ...p, [activeGameTab]: { status: 'pending', time: 0, isPlaying: true, isPaused: false, score: 0, hasStartedMove: activeGameTab !== 1 } }));
                          if (window.innerWidth < 1024) { setLeftOpen(false); setRightOpen(false); }
                        }}
                        className="w-full btn-w text-sm py-3 px-6 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-play"></i> เริ่มเล่นเกม
                      </button>
                      <button type="button" onClick={() => setGameRulesOpen(true)} className="w-full sm:w-auto btn-d text-xs py-3 px-4 whitespace-nowrap hover:text-white flex items-center justify-center gap-1.5">
                        <i className="fas fa-book-open"></i> กติกา
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 bg-[#0B1325] border border-[#1E3A5F] px-3.5 py-2 rounded-xl flex items-center gap-2">
                      <i className="fas fa-clock text-amber-400"></i>
                      <span>{currentUser ? 'จำกัดสิทธิ์วันละ 1 รอบ • รีเซ็ตกระดานใหม่เวลา 06:00 น.' : 'โหมดทดลองเล่น (Guest): ไม่บันทึกสถิติขึ้นกระดานอันดับ และสามารถกดเล่นใหม่ได้'}</span>
                    </div>
                  </div>
                ) : currGameSt.isPaused ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#070C18] rounded-xl border border-dashed border-[#1E3A5F] p-6 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl"><i className="fas fa-pause"></i></div>
                    <div>
                      <div className="text-lg font-bold text-amber-300">หยุดพักชั่วคราว</div>
                      <div className="text-xs text-slate-400 mt-1">เวลาปัจจุบัน: <span className="font-mono text-white font-bold">{fmtTime(currGameSt.time)}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...(p[activeGameTab] || {}), isPaused: false } }))} className="btn-w px-6 py-2.5 text-xs flex items-center gap-1.5"><i className="fas fa-play"></i> เล่นต่อ</button>
                      <button type="button" onClick={() => { setGameFocusMode(false); setActiveGameTab(null); }} className="btn-d px-4 py-2.5 text-xs">กลับ Hub</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`flex-1 flex flex-col justify-center relative overflow-hidden ${isEndedView ? 'opacity-80 pointer-events-none' : ''}`}>
                      {activeGameTab === 0 && <SudokuGame dateSeed={todayStr} onEnd={handleGameWinLose} />}
                      {activeGameTab === 1 && <MinesweeperGame dateSeed={todayStr} onEnd={handleGameWinLose} onFirstMove={handleFirstMove} />}
                      {activeGameTab === 2 && <FlagGuesserGame dateSeed={todayStr} onEnd={handleGameWinLose} onAddPenalty={handleAddGamePenalty} />}
                      {activeGameTab === 3 && <SolitaireGame dateSeed={todayStr} onEnd={handleGameWinLose} />}
                      {activeGameTab === 4 && <WordleGame dateSeed={todayStr} onEnd={handleGameWinLose} />}
                      {activeGameTab === 5 && <SnakeGame dateSeed={todayStr} isPlaying={currGameSt.isPlaying} isPaused={currGameSt.isPaused} onEnd={handleGameWinLose} />}
                      {activeGameTab === 6 && <Game2048 dateSeed={todayStr} onEnd={handleGameWinLose} />}
                      {activeGameTab === 7 && <Game24 dateSeed={todayStr} onEnd={handleGameWinLose} />}
                      {activeGameTab === 8 && <ResistorGame dateSeed={todayStr} onEnd={handleGameWinLose} />}
                    </div>

                    {isEndedView && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-[#070C18]/95 backdrop-blur border border-sky-500/60 text-sky-200 px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-3 whitespace-nowrap">
                        <span><i className="fas fa-flag-checkered text-emerald-400 mr-1.5"></i>จบเกมวันนี้แล้ว</span>
                        <button type="button" onClick={() => setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...p[activeGameTab], showModal: true } }))} className="btn-b text-[11px] py-1 px-2.5">ดูใบสรุปผล</button>
                        {!currentUser && (
                          <button type="button" onClick={() => resetGuestPracticeGame(activeGameTab)} className="btn-w text-[11px] py-1 px-2.5"><i className="fas fa-redo mr-1"></i>ลองใหม่</button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Rules Modal */}
              {gameRulesOpen && (
                <Modal title={`กติกา: ${activeGame.name}`} onClose={() => setGameRulesOpen(false)} maxW="max-w-md">
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#050811] border border-[#1E3A5F]">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${activeGame.iconCls}`}>
                        <i className={activeGame.faIcon || 'fas fa-gamepad'}></i>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{activeGame.desc}</p>
                    </div>
                    <ul className="space-y-2.5 text-slate-200 pl-4 list-disc leading-relaxed">
                      {(GAME_RULES[activeGame.id] || []).map((line, idx) => <li key={idx}>{line}</li>)}
                    </ul>
                    <button type="button" onClick={() => setGameRulesOpen(false)} className="w-full btn-w py-2 text-xs">เข้าใจแล้ว</button>
                  </div>
                </Modal>
              )}

              {/* Collectible Result Modal */}
              {currGameSt.showModal && (() => {
                const myScore = gameScores.find((x) => x.userId === currentUser?.id);
                const finalStatus = myScore ? myScore.status : currGameSt.status;
                const finalScore = myScore ? (myScore.score || 0) : (currGameSt.score || 0);
                const finalTime = myScore ? myScore.timeMs : currGameSt.time;
                const finalMaxTile = myScore ? myScore.maxTile : currGameSt.maxTile;

                const isBomb = finalStatus === 'lost_bomb' || finalTime === Infinity;
                const isLost = finalStatus === 'lost';
                const isSuccess = finalStatus === 'won' || (finalStatus === 'ended' && finalScore > 0);
                const validToday = sortScores(gameScores.filter((s) => !isFailedRec(s)), activeGameTab);
                const myRankIdx = currentUser ? validToday.findIndex((s) => s.userId === currentUser.id) : -1;
                const myRank = myRankIdx !== -1 ? myRankIdx + 1 : null;

                const primaryStat = isBomb
                  ? 'BOMB'
                  : (isLost && activeGameTab !== 2)
                    ? 'GAME OVER'
                    : activeGameTab === 2 ? `${finalScore} / 3`
                    : activeGameTab === 4 ? `${finalScore} ครั้ง`
                    : activeGameTab === 5 ? `${finalScore} แต้ม`
                    : activeGameTab === 6 ? `${finalScore} pt`
                    : activeGameTab === 8 ? `${Math.max(1, 4 - Math.floor(finalScore / 100))} ครั้ง`
                    : fmtTime(finalTime);

                const subStatLabel = isBomb || (isLost && activeGameTab !== 2)
                  ? 'หมดโควตารอบวันนี้'
                  : activeGameTab === 6 ? `เลขสูงสุด: ${finalMaxTile || 0} • เวลา ${fmtTime(finalTime)}`
                  : [2, 4, 5, 8].includes(activeGameTab) ? `เวลาที่ใช้: ${fmtTime(finalTime)}`
                  : 'เคลียร์กระดานสำเร็จ';

                const rankBadgeStyle = myRank === 1
                  ? 'bg-amber-400 text-[#050811] border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : myRank === 2
                    ? 'bg-slate-200 text-[#050811] border-white'
                    : myRank === 3
                      ? 'bg-amber-700 text-amber-100 border-amber-500'
                      : 'bg-sky-950/80 text-sky-300 border-sky-500/40';

                return (
                  <Modal
                    title="สรุปผล Daily Challenge"
                    onClose={() => setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...p[activeGameTab], showModal: false, status: 'viewing_board' } }))}
                    maxW="max-w-md"
                  >
                    <div className="space-y-4 text-xs">
                      <div className="rounded-2xl border border-[#1E3A5F] bg-gradient-to-br from-[#0F2547] via-[#0B1325] to-[#050811] overflow-hidden shadow-2xl relative">
                        <div className={`h-1.5 w-full ${activeGame.barCls || 'bg-sky-400'}`}></div>
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${activeGame.iconCls}`}>
                                <i className={activeGame.faIcon || 'fas fa-gamepad'}></i>
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-white truncate">{activeGame.name}</div>
                                <div className="text-[10px] font-mono text-slate-400">{todayStr}</div>
                              </div>
                            </div>

                            {!currentUser ? (
                              <span className="px-2.5 py-1 rounded-full bg-sky-950/80 border border-sky-400/50 text-sky-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <i className="fas fa-flask mr-1"></i> Practice
                              </span>
                            ) : myRank ? (
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 flex items-center gap-1 ${rankBadgeStyle}`}>
                                <i className={myRank === 1 ? 'fas fa-crown' : 'fas fa-medal'}></i> Rank #{myRank}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-red-950/70 border border-red-500/40 text-red-300 text-[10px] font-bold shrink-0">
                                <i className={isBomb ? 'fas fa-bomb mr-1' : 'fas fa-times-circle mr-1'}></i> {isBomb ? 'Bomb' : 'ไม่ผ่าน'}
                              </span>
                            )}
                          </div>

                          <div className="py-4 px-3 rounded-xl bg-[#050811]/90 border border-[#1E3A5F] text-center space-y-1 shadow-inner">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{isSuccess ? 'สถิติของคุณวันนี้' : 'ผลการแข่งขัน'}</div>
                            <div className={`text-4xl font-mono font-bold tracking-tight ${isSuccess ? 'text-amber-300' : 'text-red-400'}`}>{primaryStat}</div>
                            <div className="text-[11px] text-slate-300">{subStatLabel}</div>
                          </div>

                          {activeGameTab === 4 && (currGameSt.shareGrid || myScore?.shareGrid) && (
                            <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-center space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ตารางผลทาย (แชร์ได้แบบไม่สปอยล์)</div>
                              <div className="text-base leading-snug tracking-widest whitespace-pre-line select-all">{currGameSt.shareGrid || myScore?.shareGrid}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  const txt = `The Blue Moon Wordle (${todayStr}) ${isLost ? 'X' : finalScore}/6\n${currGameSt.shareGrid || myScore?.shareGrid}`;
                                  navigator.clipboard.writeText(txt);
                                  alert('คัดลอกตารางสี Wordle เรียบร้อยแล้ว!');
                                }}
                                className="btn-d py-1 px-3 text-[10px] text-sky-300 hover:text-white"
                              >
                                <i className="fas fa-copy mr-1"></i> คัดลอกตารางสี
                              </button>
                            </div>
                          )}

                          {currGameSt.answer && [4, 7, 8].includes(activeGameTab) && (
                            <div className="p-2.5 rounded-xl bg-[#070C18] border border-sky-500/40 flex items-center justify-between gap-2 px-3.5">
                              <span className="text-slate-400 shrink-0">{activeGameTab === 4 ? 'คำศัพท์ประจำวันนี้' : activeGameTab === 7 ? 'สมการคำตอบ' : 'แถบสีที่ถูกต้อง'}</span>
                              <span className="font-mono font-bold text-xs sm:text-sm tracking-wider text-sky-300 text-right truncate">{currGameSt.answer}</span>
                            </div>
                          )}

                          {currentUser && (
                            <div className="flex items-center justify-between pt-2 border-t border-[#1E3A5F]/70">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar user={currentUser} size="xs" />
                                <span className="font-bold text-slate-200 truncate">{currentUser.displayName}</span>
                                <span className="font-mono text-[10px] text-slate-500">{currentUser.id}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">ผู้เล่นวันนี้ {gameScores.length} คน</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {currentUser ? (
                        <div className="space-y-2.5">
                          <button type="button" onClick={shareGameResult} className="w-full btn-w py-2.5 text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform">
                            <i className="fas fa-clipboard-list"></i> แชร์สถิติลงกระดานโพสต์ (Board)
                          </button>
                          <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2">
                            <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1.5"><i className="fas fa-comments"></i> ส่งท้าดวลเข้าห้องแชตโดยตรง</div>
                            <div className="flex gap-2">
                              <select value={shareChatRoom} onChange={(e) => setShareChatRoom(e.target.value)} className="flex-1 inp py-1.5 text-xs bg-[#0B1325]">
                                {shareableRooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                              </select>
                              <button type="button" onClick={() => shareGameToChat(shareChatRoom)} className="btn-b py-1.5 px-3.5 text-xs whitespace-nowrap hover:bg-sky-600 transition-colors flex items-center gap-1.5">
                                <i className="fas fa-paper-plane"></i> ส่งแชต
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 text-center text-[11px] text-sky-200">
                            โหมดทดลองเล่น: สถิตินี้ไม่ได้ถูกบันทึกขึ้น Leaderboard
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => resetGuestPracticeGame(activeGameTab)} className="flex-1 btn-b py-2.5 text-xs flex items-center justify-center gap-1.5 hover:bg-sky-600">
                              <i className="fas fa-redo"></i> ลองเล่นใหม่
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGameAppSt((p) => ({ ...p, [activeGameTab]: { ...p[activeGameTab], showModal: false } }));
                                openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกสถิติขึ้นกระดานอันดับและแชร์ท้าดวลเพื่อนในสมาคม');
                              }}
                              className="flex-1 btn-w py-2.5 text-xs flex items-center justify-center gap-1.5"
                            >
                              <i className="fas fa-sign-in-alt"></i> เข้าสู่ระบบ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Modal>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      {/* Right Leaderboard Sidebar */}
      <aside className={`absolute md:relative z-40 w-72 sm:w-80 h-full bg-[#070C18] border-l border-[#1E3A5F] flex flex-col transition-transform duration-300 right-0 ${!gameFocusMode && rightOpen ? 'translate-x-0 shadow-[-10px_0_25px_rgba(0,0,0,0.6)]' : 'translate-x-full md:translate-x-0 md:hidden md:w-0'}`}>
        <div className="p-2 border-b border-[#1E3A5F] flex gap-1 bg-[#050811] shrink-0">
          <button type="button" onClick={() => setLbTab('daily')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${lbTab === 'daily' ? 'bg-white text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>ประจำวัน</button>
          <button type="button" onClick={() => setLbTab('monthly')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${lbTab === 'monthly' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>ยอดเยี่ยมประจำเดือน</button>
        </div>

        <div className="px-3.5 py-2.5 border-b border-[#1E3A5F] font-bold text-amber-300 flex items-center justify-between text-xs shrink-0">
          <span className="flex items-center gap-2 truncate"><i className="fas fa-trophy"></i><span className="truncate">{activeGame.name}</span></span>
          <button type="button" onClick={() => setRightOpen(false)} className="md:hidden w-7 h-7 rounded-lg bg-[#0F2547] text-slate-300 hover:text-white flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {rawList.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-12 border border-dashed border-[#1E3A5F] rounded-2xl space-y-2">
              <i className="fas fa-trophy text-2xl opacity-30 block"></i><div>ยังไม่มีสถิติในรอบนี้</div>
            </div>
          ) : (
            <>
              {validList.length > 0 && (
                <div className="bg-[#050811] border border-[#1E3A5F] rounded-2xl p-3 pt-4">
                  <div className="grid grid-cols-3 gap-2 items-end">
                    {podiumSlots.map(({ rank, rec, heightCls, ringCls, barCls, crown }) => {
                      const u = rec ? getAuthor(rec.userId) : null;
                      const isMe = rec && currentUser && rec.userId === currentUser.id;
                      return (
                        <div key={rank} className="flex flex-col items-center">
                          {rec && u ? (
                            <button type="button" onClick={() => openMemberProfile(u)} className="flex flex-col items-center group mb-2 w-full">
                              {crown && <i className="fas fa-crown text-amber-400 text-xs mb-1 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"></i>}
                              <div className={`rounded-full p-0.5 ring-2 ${ringCls} transition-transform group-hover:scale-110`}>
                                <Avatar user={u} size={rank === 1 ? 'md' : 'sm'} />
                              </div>
                              <span className={`text-[10px] font-bold truncate w-full text-center mt-1.5 ${isMe ? 'text-sky-300' : 'text-slate-100'}`}>{u.displayName}</span>
                              <span className="text-[10px] font-mono font-bold text-amber-300 leading-tight">{formatBadge(rec)}</span>
                            </button>
                          ) : (
                            <div className="flex flex-col items-center mb-2 opacity-30">
                              <div className="w-8 h-8 rounded-full border border-dashed border-slate-500 flex items-center justify-center text-[10px] text-slate-500">-</div>
                              <span className="text-[9px] text-slate-500 mt-1">ว่าง</span>
                            </div>
                          )}
                          <div className={`w-full ${heightCls} rounded-t-xl border-t border-x bg-gradient-to-b flex flex-col items-center justify-center font-mono font-bold ${barCls}`}>
                            <span className={rank === 1 ? 'text-xl' : 'text-base'}>#{rank}</span>
                            {rec && lbTab === 'monthly' && <span className="text-[8px] opacity-75">{rec.date?.slice(5)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {validList.slice(3).length > 0 && (
                <div className="space-y-1.5">
                  {validList.slice(3).map((s, idx) => {
                    const u = getAuthor(s.userId);
                    const isMe = currentUser && s.userId === currentUser.id;
                    const sub = formatSub(s);
                    return (
                      <div key={s.userId} onClick={() => openMemberProfile(u)} className={`flex justify-between items-center p-2.5 rounded-xl border cursor-pointer transition-colors ${isMe ? 'bg-sky-950/40 border-sky-500/60' : 'bg-[#050811] border-[#1E3A5F] hover:border-slate-500'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold w-5 text-center text-xs text-slate-400 shrink-0">{idx + 4}</span>
                          <Avatar user={u} size="xs" />
                          <div className="min-w-0">
                            <div className={`font-bold text-xs truncate ${isMe ? 'text-sky-300' : 'text-slate-100'}`}>{u.displayName}</div>
                            {sub && <div className="text-[9px] text-slate-400 truncate">{sub}</div>}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-sky-900/30 text-sky-300 shrink-0 ml-2">{formatBadge(s)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {failedList.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#1E3A5F]/60">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">ไม่ผ่านรอบนี้ ({failedList.length})</div>
                  {failedList.map((s) => {
                    const u = getAuthor(s.userId);
                    const isBomb = s.status === 'lost_bomb' || s.timeMs === Infinity;
                    return (
                      <div key={s.userId} onClick={() => openMemberProfile(u)} className="flex justify-between items-center p-2 rounded-xl border bg-red-950/15 border-red-900/30 cursor-pointer hover:border-red-500/40 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className={`${isBomb ? 'fas fa-bomb' : 'fas fa-times'} text-red-400/80 w-5 text-center text-[11px] shrink-0`}></i>
                          <Avatar user={u} size="xs" />
                          <span className="font-bold text-xs text-slate-300 truncate">{u.displayName}</span>
                        </div>
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-red-950/60 text-red-400 shrink-0 ml-2">{formatBadge(s)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {currentUser ? (
          <div className="p-3 border-t border-[#1E3A5F] bg-[#050811] shrink-0">
            {myValidIdx !== -1 ? (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#0F2547] to-[#0B1325] border border-sky-500/40 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${myValidIdx === 0 ? 'bg-amber-400 text-[#050811]' : 'bg-sky-500 text-white'}`}>#{myValidIdx + 1}</span>
                    <Avatar user={currentUser} size="xs" />
                    <span className="text-xs font-bold text-white truncate">อันดับของคุณ</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-amber-300 shrink-0">{formatBadge(validList[myValidIdx])}</span>
                </div>
                <div className="text-[10px] text-sky-200 flex items-center gap-1.5">
                  <i className={myValidIdx === 0 ? 'fas fa-crown text-amber-400' : 'fas fa-bullseye text-sky-400'}></i>
                  <span className="truncate">{getGapText()}</span>
                </div>
              </div>
            ) : myFailed ? (
              <div className="p-2.5 rounded-xl bg-red-950/25 border border-red-900/50 flex items-center justify-between text-[11px]">
                <span className="text-red-300 font-bold"><i className="fas fa-redo mr-1.5"></i>รอบนี้พลาดไปก่อน</span>
                <span className="text-slate-400 text-[10px]">พรุ่งนี้แก้มือใหม่!</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#0B1325] border border-dashed border-[#1E3A5F] text-[11px] text-slate-400 text-center">
                <i className="fas fa-play-circle text-sky-400 mr-1.5"></i>เคลียร์เกมนี้เพื่อขึ้นกระดานอันดับ
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 border-t border-[#1E3A5F] bg-[#050811] shrink-0">
            <div className="p-2.5 rounded-xl bg-[#0B1325] border border-sky-500/30 space-y-2 text-center">
              <div className="text-[11px] text-slate-300"><i className="fas fa-flask text-sky-400 mr-1"></i> โหมดทดลองเล่นสำหรับ Guest</div>
              <button type="button" onClick={() => openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกอันดับของคุณลงในตารางคะแนน')} className="w-full btn-w py-1.5 text-[11px]">เข้าสู่ระบบเพื่อร่วมจัดอันดับ</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}