import React, { useState, useEffect, useRef } from 'react';
import { db, svrTs, FieldValue } from '../../lib/firebase';
import { parseYouTubeUrl, fmtTime, getTimeStr } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useRadio } from '../../contexts/RadioContext';
import { Avatar, RoleBadge } from '../../components/BasicUI';
import { SmartMedia, GiphyPickerPopover } from '../../components/RichUI';
import { longPressProps } from '../../components/ContextMenu';
import { DiscJamLyricsPanel } from './DiscJamLyricsPanel';

function MiniEq({ active, colorCls = 'bg-sky-400' }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3 shrink-0" aria-hidden="true">
      {[0, 0.2, 0.4, 0.15].map((d, i) => (
        <span
          key={i}
          className={`dj-eq-bar ${colorCls}`}
          style={{
            animationDelay: `${d}s`,
            animationPlayState: active ? 'running' : 'paused',
            opacity: active ? 1 : 0.3
          }}
        />
      ))}
    </span>
  );
}

export default function DiscJamPage({ chatMessages = [] }) {
  const { currentUser, getAuthor } = useAuth();
  const { openAppMenu } = useUI();
  const {
    djState,
    lateNight,
    localCrossfade,
    setLocalCrossfade,
    isLocalPaused,
    trackTime,
    canManageAudio,
    activeDeckSong,
    isDeckPlaying,
    isFullyClosedSync,
    ytA,
    ytB,
    updateDjState,
    handleAddTrack,
    handleSeek,
    triggerManualFade
  } = useRadio();

  const [djChatIn, setDjChatIn] = useState('');
  const [djRightTab, setDjRightTab] = useState('queue');
  const [djSettingsOpen, setDjSettingsOpen] = useState(false);
  const [djVibes, setDjVibes] = useState([]);
  const [djGifOpen, setDjGifOpen] = useState(false);
  const [djEmojiOpen, setDjEmojiOpen] = useState(false);
  const djChatRef = useRef(null);

  const djChatMsgs = chatMessages.filter((m) => m.roomKey === 'global-discjam');

  useEffect(() => {
    if (djChatRef.current) {
      setTimeout(() => {
        if (djChatRef.current) djChatRef.current.scrollTop = djChatRef.current.scrollHeight;
      }, 100);
    }
  }, [djChatMsgs.length]);

  const triggerDjVibe = (emoji) => {
    const batch = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + Math.random() + i,
      emoji,
      left: (18 + Math.random() * 64).toFixed(1) + '%',
      vx: Math.round((Math.random() - 0.5) * 60) + 'px',
      delay: (i * 0.11) + 's'
    }));
    setDjVibes((prev) => [...prev.slice(-18), ...batch]);
    setTimeout(() => {
      const ids = new Set(batch.map((b) => b.id));
      setDjVibes((prev) => prev.filter((v) => !ids.has(v.id)));
    }, 2200);
  };

  const toggleMsgReaction = async (msg, emoji) => {
    if (!currentUser || !msg?.id) return;
    const nextReacts = { ...(msg.reactions || {}) };
    const arr = Array.isArray(nextReacts[emoji]) ? [...nextReacts[emoji]] : [];
    const updated = arr.includes(currentUser.id)
      ? arr.filter((id) => id !== currentUser.id)
      : [...arr, currentUser.id];
    if (updated.length > 0) nextReacts[emoji] = updated;
    else delete nextReacts[emoji];
    await db.collection('bma_messages').doc(msg.id).update({ reactions: nextReacts }).catch(() => {});
  };

  const handleSendDjChat = async (e, extraAtt = null) => {
    if (e?.preventDefault) e.preventDefault();
    const text = extraAtt ? '' : djChatIn.trim();
    if (!currentUser || (!text && !extraAtt)) return;
    if (!extraAtt) setDjChatIn('');
    const now = Date.now();
    const id = 'msg-' + now + '-' + Math.random().toString(36).slice(2, 5);
    const dStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const fullTime = `${dStr} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    await db.collection('bma_messages').doc(id).set({
      id,
      roomKey: 'global-discjam',
      senderId: currentUser.id,
      text,
      attachments: extraAtt ? [extraAtt] : [],
      likes: [],
      reactions: {},
      readBy: [currentUser.id],
      isEdited: false,
      isDeleted: false,
      time: fullTime,
      timestamp: now,
      serverCreatedAt: svrTs()
    });
  };

  const openQueueTrackMenu = (e, q, idx) => {
    const ytUrl = `https://www.youtube.com/watch?v=${q.id}`;
    const items = [
      { icon: 'fas fa-link', label: 'คัดลอกลิงก์ YouTube', onClick: () => navigator.clipboard.writeText(ytUrl) },
      { icon: 'fab fa-youtube', label: 'เปิดดูบน YouTube', onClick: () => window.open(ytUrl, '_blank', 'noopener,noreferrer') }
    ];

    if (canManageAudio && djState.djMode === 'manual') {
      items.push({ type: 'divider' });
      items.push({
        icon: 'fas fa-compact-disc',
        label: 'โหลดเข้า Deck A ทันที',
        accent: true,
        onClick: () => {
          const nQ = djState.queue.filter((x) => x.key !== q.key);
          updateDjState({ queue: nQ, deckA: q, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } });
        }
      });
      items.push({
        icon: 'fas fa-compact-disc',
        label: 'โหลดเข้า Deck B ทันที',
        accent: true,
        onClick: () => {
          const nQ = djState.queue.filter((x) => x.key !== q.key);
          updateDjState({ queue: nQ, deckB: q, playB: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } });
        }
      });
    }

    if (canManageAudio && idx > 0) {
      items.push({ type: 'divider' });
      items.push({
        icon: 'fas fa-angle-double-up',
        label: 'เลื่อนขึ้นเป็นคิวถัดไปทันที',
        accent: true,
        onClick: () => {
          const nQ = [...djState.queue];
          const [picked] = nQ.splice(idx, 1);
          nQ.unshift(picked);
          updateDjState({ queue: nQ });
        }
      });
    }

    if (canManageAudio || q.addedBy === currentUser?.id) {
      items.push({ type: 'divider' });
      items.push({
        icon: 'fas fa-trash-alt',
        label: 'ลบเพลงนี้ออกจากคิว',
        danger: true,
        onClick: () => {
          const nQ = [...djState.queue];
          nQ.splice(idx, 1);
          updateDjState({ queue: nQ });
        }
      });
    }

    openAppMenu(e, {
      header: { icon: 'fas fa-music', title: q.title || 'เพลงในคิว', sub: `คิวที่ #${idx + 1} • โดย ${getAuthor(q.addedBy).displayName}` },
      items
    });
  };

  const ambientThumb = !isFullyClosedSync && activeDeckSong?.id
    ? `https://img.youtube.com/vi/${activeDeckSong.id}/hqdefault.jpg`
    : null;
  const tonearmActive = isFullyClosedSync || Boolean(isDeckPlaying) || Boolean(djState.playA?.isPlaying || djState.playB?.isPlaying);
  const spinDuration = `${Math.max(1.2, 4 / (djState.speed || 1)).toFixed(2)}s`;
  const upNextSong = !isFullyClosedSync && djState.queue?.length > 0 ? djState.queue[0] : null;

  const renderVibeDock = () => (
    <div className="flex items-center gap-1 bg-[#050811]/85 backdrop-blur-md border border-[#1E3A5F] rounded-full px-2 py-1 shadow-lg">
      {['🔥', '❤️', '👏', '🎸'].map((em) => (
        <button
          key={em}
          type="button"
          onClick={() => triggerDjVibe(em)}
          className="w-7 h-7 rounded-full hover:bg-[#0F2547] active:scale-125 transition-transform flex items-center justify-center text-sm"
          title={`ส่งความรู้สึกรอบแผ่นเสียง ${em}`}
        >
          {em}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 pb-24 lg:pb-6 space-y-5 flex-1 overflow-y-auto overflow-x-hidden">
      {/* Header Bar */}
      <div className="card p-3 sm:px-5 sm:py-3.5 bg-[#0B1325]/95 border-[#1E3A5F] grid grid-cols-1 md:grid-cols-3 items-center gap-3 shadow-lg">
        <div className="flex items-center justify-center md:justify-start gap-2.5 min-w-0">
          <div className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${isFullyClosedSync ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-red-950/60 border-red-500/50 text-red-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isFullyClosedSync ? 'bg-slate-500' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]'}`}></span>
            <span>{isFullyClosedSync ? 'OFF AIR' : 'ON AIR'}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white truncate">💿 Disc Jam</h2>
        </div>

        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-[#050811] via-[#0F2547]/80 to-[#050811] border border-sky-500/50 px-5 py-2 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.18)] max-w-full">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              <span className="animate-pulse">🎧</span> DJ
            </span>
            <div className="w-[1px] h-5 bg-sky-500/40 shrink-0"></div>
            {isFullyClosedSync ? (
              <span className="text-sm sm:text-base font-bold text-red-400 truncate">🌙 ปิดสถานียามวิกาล</span>
            ) : djState.jammerId ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar user={getAuthor(djState.jammerId)} size="sm" showStatus={true} />
                <span className="text-sm sm:text-base font-bold text-white truncate max-w-[160px]">{getAuthor(djState.jammerId).displayName}</span>
                <RoleBadge role={getAuthor(djState.jammerId).role} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white whitespace-nowrap">Owner &amp; Vice</span>
                <RoleBadge role="admin" />
                <RoleBadge role="mod" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
          {lateNight && currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => updateDjState({ forceClosed: !djState.forceClosed })}
              className={`text-[11px] px-3 py-1.5 border rounded-full font-bold transition-colors ${djState.forceClosed ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-red-950 text-red-400 border-red-800'}`}
            >
              {djState.forceClosed ? '🟢 เปิดสถานี' : '🌙 ปิดสถานี'}
            </button>
          )}

          {currentUser && currentUser.role === 'member' && (
            !djState.jammerId ? (
              <button type="button" onClick={() => updateDjState({ jammerId: currentUser.id })} className="btn-w text-[11px] px-3.5 py-1.5 rounded-full border border-amber-400 shadow">
                🎤 รับสิทธิ์ Jammer
              </button>
            ) : djState.jammerId === currentUser.id ? (
              <button type="button" onClick={() => updateDjState({ jammerId: null })} className="bg-red-950 text-red-300 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-red-800">
                ⏹ คืนสิทธิ์ Jammer
              </button>
            ) : null
          )}
        </div>
      </div>

      {/* Turntable Stage */}
      {canManageAudio ? (
        <div className="card p-3.5 sm:p-6 shadow-2xl relative overflow-hidden border-[#1E3A5F]">
          {ambientThumb && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <img src={ambientThumb} alt="" className="w-full h-full object-cover scale-125 blur-3xl opacity-[0.18] transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1325]/70 via-[#0B1325]/60 to-[#050811]/90"></div>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {djVibes.map((v) => (
              <span key={v.id} className="dj-vibe-float text-2xl" style={{ left: v.left, '--vx': v.vx, animationDelay: v.delay }}>
                {v.emoji}
              </span>
            ))}
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 pb-3.5 border-b border-[#1E3A5F]/80">
              <div className="flex items-center gap-1.5 bg-[#050811] p-1 rounded-full border border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => updateDjState({ djMode: 'auto' })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${djState.djMode === 'auto' ? 'bg-emerald-500 text-[#050811] shadow-[0_0_12px_rgba(16,185,129,0.45)]' : 'text-slate-400 hover:text-white'}`}
                >
                  🤖 Auto DJ
                </button>
                <button
                  type="button"
                  onClick={() => updateDjState({ djMode: 'manual' })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${djState.djMode === 'manual' ? 'bg-sky-500 text-[#050811] shadow-[0_0_12px_rgba(14,165,233,0.45)]' : 'text-slate-400 hover:text-white'}`}
                >
                  🎧 Manual Pro
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="hidden sm:block">{renderVibeDock()}</div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDjSettingsOpen((v) => !v)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-colors ${djSettingsOpen ? 'bg-sky-600 text-white border-sky-400' : 'bg-[#050811] text-slate-200 border-[#1E3A5F] hover:border-sky-400'}`}
                  >
                    <i className="fas fa-cog"></i>
                    <span>ตั้งค่า Deck</span>
                    <span className="font-mono text-[10px] text-sky-300 bg-[#0B1325] px-1.5 py-0.5 rounded-full border border-[#1E3A5F]">
                      {djState.speed || 1}x
                    </span>
                  </button>

                  {djSettingsOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setDjSettingsOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-64 card bg-[#0B1325] border-sky-500/40 p-4 z-40 shadow-2xl space-y-3 text-xs animate-fade-in">
                        <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-2">
                          <span className="font-bold text-sky-300"><i className="fas fa-sliders-h mr-1.5"></i>ตั้งค่าเครื่องเล่น</span>
                          <button type="button" onClick={() => setDjSettingsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] text-slate-400 font-bold block">ความเร็วการเล่น (Playback Speed)</label>
                          <select
                            value={djState.speed || 1}
                            onChange={(e) => {
                              const newSpeed = parseFloat(e.target.value);
                              const updates = { speed: newSpeed };
                              if (djState.playA?.isPlaying && ytA.current) {
                                const cPos = ytA.current.getCurrentTime?.() || 0;
                                updates.playA = { ...djState.playA, startedAt: Date.now() - (cPos / newSpeed) * 1000 };
                              }
                              if (djState.playB?.isPlaying && ytB.current) {
                                const cPos = ytB.current.getCurrentTime?.() || 0;
                                updates.playB = { ...djState.playB, startedAt: Date.now() - (cPos / newSpeed) * 1000 };
                              }
                              updateDjState(updates);
                            }}
                            className="w-full inp py-1.5 text-xs bg-[#050811] text-white"
                          >
                            <option value="0.25">0.25x</option>
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1">1.0x (ปกติ)</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2.0x</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <label className="text-slate-400 font-bold">ระยะเวลา Crossfade</label>
                            <span className="font-mono text-amber-300 font-bold">{djState.fadeDuration || 5} วินาที</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="15"
                            value={djState.fadeDuration || 5}
                            onChange={(e) => updateDjState({ fadeDuration: parseInt(e.target.value, 10) })}
                            className="w-full h-1.5 bg-[#050811] rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-7">
              {/* DECK A */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:items-center sm:text-center min-w-0 overflow-hidden transition-all backdrop-blur-sm ${localCrossfade < 50 ? 'border-sky-400/90 bg-sky-950/25 shadow-[0_0_25px_rgba(14,165,233,0.16)]' : 'border-[#1E3A5F] bg-[#050811]/65'}`}>
                <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-0 w-full">
                  <div className="hidden sm:inline-flex items-center gap-2 text-sky-300 font-bold text-xs mb-3 bg-sky-950/70 border border-sky-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                    <span>Deck A</span>
                    {localCrossfade < 50 && <MiniEq active={djState.playA?.isPlaying && !isLocalPaused && !isFullyClosedSync} colorCls="bg-sky-400" />}
                  </div>
                  <div className={`relative w-16 h-16 sm:w-36 sm:h-36 shrink-0 rounded-full border-4 sm:border-8 border-slate-800 shadow-2xl bg-zinc-950 flex items-center justify-center overflow-hidden ${djState.playA?.isPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <div className="absolute inset-0 vinyl-sheen pointer-events-none"></div>
                    <div className="relative z-10 w-7 h-7 sm:w-14 sm:h-14 rounded-full bg-slate-200 border-2 sm:border-4 border-slate-700 overflow-hidden shadow">
                      {isFullyClosedSync ? (
                        <img src="/jazzskull-trumpet.gif" className="w-full h-full object-cover scale-150" alt="" />
                      ) : djState.deckA?.id ? (
                        <img src={`https://img.youtube.com/vi/${djState.deckA.id}/default.jpg`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-slate-900"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left sm:text-center sm:w-full">
                    <div className="sm:hidden inline-flex items-center gap-1.5 text-sky-300 font-bold text-[10px] mb-1 bg-sky-950/70 border border-sky-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                      <span>Deck A</span>
                      {localCrossfade < 50 && <MiniEq active={djState.playA?.isPlaying && !isLocalPaused && !isFullyClosedSync} colorCls="bg-sky-400" />}
                    </div>
                    <div className="text-xs text-slate-100 font-bold sm:mt-4 min-h-[2rem] line-clamp-2">
                      {isFullyClosedSync ? 'สถานีปิดรับคิวชั่วคราว' : (djState.deckA?.title || 'Empty Deck')}
                    </div>
                  </div>
                </div>

                {djState.deckA?.id && (
                  <div className="w-full mt-3 px-0.5 sm:px-2 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono w-9 text-right text-slate-400 shrink-0">{fmtTime(trackTime.curA)}</span>
                    <input type="range" min="0" max={trackTime.durA || 100} value={trackTime.curA} onChange={(e) => handleSeek('A', e.target.value)} disabled={djState.djMode === 'auto'} className="flex-1 min-w-0 w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400" />
                    <span className="text-[10px] font-mono w-9 text-left text-slate-400 shrink-0">{fmtTime(trackTime.durA)}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 justify-start sm:justify-center w-full">
                  {djState.djMode === 'manual' && (
                    <button
                      type="button"
                      onClick={() => {
                        const isP = djState.playA?.isPlaying;
                        const cPos = ytA.current?.getCurrentTime?.() || 0;
                        const spd = djState.speed || 1;
                        updateDjState({ playA: { ...djState.playA, isPlaying: !isP, startedAt: isP ? djState.playA.startedAt : Date.now() - (cPos / spd) * 1000, pausedPos: isP ? cPos : 0 } });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${djState.playA?.isPlaying ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'}`}
                    >
                      {djState.playA?.isPlaying ? '⏸ Global Pause' : '▶ Global Play'}
                    </button>
                  )}

                  {djState.djMode === 'auto' && localCrossfade < 50 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (djState.fadeCommand) {
                          updateDjState({ crossfade: 100, fadeCommand: null, playA: { ...djState.playA, isPlaying: false }, deckA: null });
                        } else if (djState.queue?.length > 0) {
                          const nextSong = djState.queue[0];
                          const newQ = djState.queue.slice(1);
                          updateDjState({ queue: newQ, crossfade: 100, fadeCommand: null, deckB: nextSong, playB: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 }, playA: { ...djState.playA, isPlaying: false } });
                        } else {
                          updateDjState({ playA: { ...djState.playA, isPlaying: false }, deckA: null });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#0F2547] text-white border border-[#1E3A5F] hover:bg-white hover:text-[#050811]"
                    >
                      ⏭ ข้าม
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => updateDjState({ playA: { ...djState.playA, isLooping: !djState.playA?.isLooping } })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${djState.playA?.isLooping ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-[#0F2547] text-slate-300 border border-[#1E3A5F]'}`}
                  >
                    {djState.playA?.isLooping ? '🔂 วนซ้ำ' : '🔁 ไม่วน'}
                  </button>
                </div>
              </div>

              {/* DECK B */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:items-center sm:text-center min-w-0 overflow-hidden transition-all backdrop-blur-sm ${localCrossfade >= 50 ? 'border-amber-400/90 bg-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.16)]' : 'border-[#1E3A5F] bg-[#050811]/65'}`}>
                <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-0 w-full">
                  <div className="hidden sm:inline-flex items-center gap-2 text-amber-300 font-bold text-xs mb-3 bg-amber-950/70 border border-amber-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                    <span>Deck B</span>
                    {localCrossfade >= 50 && <MiniEq active={djState.playB?.isPlaying && !isLocalPaused && !isFullyClosedSync} colorCls="bg-amber-400" />}
                  </div>
                  <div className={`relative w-16 h-16 sm:w-36 sm:h-36 shrink-0 rounded-full border-4 sm:border-8 border-slate-800 shadow-2xl bg-zinc-950 flex items-center justify-center overflow-hidden ${djState.playB?.isPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <div className="absolute inset-0 vinyl-sheen pointer-events-none"></div>
                    <div className="relative z-10 w-7 h-7 sm:w-14 sm:h-14 rounded-full bg-slate-200 border-2 sm:border-4 border-slate-700 overflow-hidden shadow">
                      {djState.deckB?.id ? <img src={`https://img.youtube.com/vi/${djState.deckB.id}/default.jpg`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-900"></div>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left sm:text-center sm:w-full">
                    <div className="sm:hidden inline-flex items-center gap-1.5 text-amber-300 font-bold text-[10px] mb-1 bg-amber-950/70 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                      <span>Deck B</span>
                      {localCrossfade >= 50 && <MiniEq active={djState.playB?.isPlaying && !isLocalPaused && !isFullyClosedSync} colorCls="bg-amber-400" />}
                    </div>
                    <div className="text-xs text-slate-100 font-bold sm:mt-4 min-h-[2rem] line-clamp-2">
                      {djState.deckB?.title || 'Empty Deck'}
                    </div>
                  </div>
                </div>

                {djState.deckB?.id && (
                  <div className="w-full mt-3 px-0.5 sm:px-2 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono w-9 text-right text-slate-400 shrink-0">{fmtTime(trackTime.curB)}</span>
                    <input type="range" min="0" max={trackTime.durB || 100} value={trackTime.curB} onChange={(e) => handleSeek('B', e.target.value)} disabled={djState.djMode === 'auto'} className="flex-1 min-w-0 w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400" />
                    <span className="text-[10px] font-mono w-9 text-left text-slate-400 shrink-0">{fmtTime(trackTime.durB)}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 justify-start sm:justify-center w-full">
                  {djState.djMode === 'manual' && (
                    <button
                      type="button"
                      onClick={() => {
                        const isP = djState.playB?.isPlaying;
                        const cPos = ytB.current?.getCurrentTime?.() || 0;
                        const spd = djState.speed || 1;
                        updateDjState({ playB: { ...djState.playB, isPlaying: !isP, startedAt: isP ? djState.playB.startedAt : Date.now() - (cPos / spd) * 1000, pausedPos: isP ? cPos : 0 } });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${djState.playB?.isPlaying ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'}`}
                    >
                      {djState.playB?.isPlaying ? '⏸ Global Pause' : '▶ Global Play'}
                    </button>
                  )}

                  {djState.djMode === 'auto' && localCrossfade >= 50 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (djState.fadeCommand) {
                          updateDjState({ crossfade: 0, fadeCommand: null, playB: { ...djState.playB, isPlaying: false }, deckB: null });
                        } else if (djState.queue?.length > 0) {
                          const nextSong = djState.queue[0];
                          const newQ = djState.queue.slice(1);
                          updateDjState({ queue: newQ, crossfade: 0, fadeCommand: null, deckA: nextSong, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 }, playB: { ...djState.playB, isPlaying: false } });
                        } else {
                          updateDjState({ playB: { ...djState.playB, isPlaying: false }, deckB: null });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#0F2547] text-white border border-[#1E3A5F] hover:bg-white hover:text-[#050811]"
                    >
                      ⏭ ข้าม
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => updateDjState({ playB: { ...djState.playB, isLooping: !djState.playB?.isLooping } })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${djState.playB?.isLooping ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-[#0F2547] text-slate-300 border border-[#1E3A5F]'}`}
                  >
                    {djState.playB?.isLooping ? '🔂 วนซ้ำ' : '🔁 ไม่วน'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 bg-[#050811]/90 p-3.5 sm:p-4 rounded-2xl border border-[#1E3A5F] space-y-2.5">
              <div className="flex justify-between items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="text-sky-400 shrink-0">← Deck A</span>
                {djState.djMode === 'auto'
                  ? <span className="text-emerald-400 animate-pulse text-center truncate">🤖 Auto Crossfade ({djState.fadeDuration || 5}s)</span>
                  : <span className="text-sky-300 text-center truncate">🎧 Manual Crossfader</span>}
                <span className="text-amber-400 shrink-0">Deck B →</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={localCrossfade}
                onChange={(e) => { if (djState.djMode === 'manual') setLocalCrossfade(parseInt(e.target.value, 10)); }}
                onMouseUp={(e) => { if (djState.djMode === 'manual') updateDjState({ crossfade: parseInt(e.target.value, 10), fadeCommand: null }); }}
                onTouchEnd={(e) => { if (djState.djMode === 'manual') updateDjState({ crossfade: parseInt(e.target.value, 10), fadeCommand: null }); }}
                className={`w-full min-w-0 h-2 bg-[#0B1325] rounded-lg appearance-none outline-none shadow-inner border border-[#1E3A5F] ${djState.djMode === 'auto' ? 'opacity-50 cursor-not-allowed' : 'cursor-ew-resize accent-sky-400'}`}
                disabled={djState.djMode === 'auto'}
              />

              <div className="flex justify-between items-center px-1 text-[9px] font-mono text-slate-600 select-none">
                <span>A</span><span>|</span><span>·</span><span>|</span><span className="text-slate-400">50</span><span>|</span><span>·</span><span>|</span><span>B</span>
              </div>

              {djState.djMode === 'manual' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => triggerManualFade('A')} className="py-1.5 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-500/40 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5">
                    <i className="fas fa-arrow-left text-[10px]"></i> Fade ไป A ({djState.fadeDuration || 5}s)
                  </button>
                  <button type="button" onClick={() => triggerManualFade('B')} className="py-1.5 px-3 rounded-xl bg-amber-950/60 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5">
                    Fade ไป B ({djState.fadeDuration || 5}s) <i className="fas fa-arrow-right text-[10px]"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="sm:hidden flex justify-center mt-3.5">{renderVibeDock()}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-[#0B1325] rounded-2xl border border-[#1E3A5F] shadow-2xl relative overflow-hidden">
          {ambientThumb && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <img src={ambientThumb} alt="" className="w-full h-full object-cover scale-125 blur-3xl opacity-25 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B1325]/60 via-[#0B1325]/65 to-[#050811]/95"></div>
            </div>
          )}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-60"></div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            {djVibes.map((v) => (
              <span key={v.id} className="dj-vibe-float text-2xl" style={{ left: v.left, '--vx': v.vx, animationDelay: v.delay }}>
                {v.emoji}
              </span>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="text-sky-300 font-bold text-xs sm:text-sm mb-6 uppercase tracking-widest px-5 py-1.5 bg-[#050811]/85 rounded-full border border-sky-500/35 shadow-lg flex items-center gap-2.5">
              <MiniEq active={tonearmActive} colorCls="bg-sky-400" />
              <span>{isFullyClosedSync ? 'Station Off Air' : 'Now Playing'}</span>
            </div>

            <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center">
              <div
                className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-[10px] border-slate-800 shadow-[0_0_45px_rgba(14,165,233,0.22)] bg-zinc-950 flex items-center justify-center relative overflow-hidden dj-vinyl-spin"
                style={{ '--spin-dur': spinDuration, animationPlayState: tonearmActive ? 'running' : 'paused' }}
              >
                <div className="absolute inset-0 vinyl-sheen pointer-events-none"></div>
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 border-4 border-slate-700 overflow-hidden shadow-lg">
                  {isFullyClosedSync ? (
                    <img src="/jazzskull-trumpet.gif" className="w-full h-full object-cover scale-150" alt="" />
                  ) : activeDeckSong?.id ? (
                    <img src={`https://img.youtube.com/vi/${activeDeckSong.id}/default.jpg`} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-slate-900"></div>
                  )}
                </div>
                <div className="absolute z-20 w-3 h-3 rounded-full bg-[#050811] border border-slate-400"></div>
              </div>

              <svg
                viewBox="0 0 80 180"
                className="hidden sm:block absolute -top-2 -right-8 w-20 h-44 pointer-events-none z-20 transition-transform duration-700 ease-out"
                style={{ transformOrigin: '54px 24px', transform: tonearmActive ? 'rotate(20deg)' : 'rotate(-6deg)' }}
                aria-hidden="true"
              >
                <circle cx="54" cy="24" r="14" fill="#1E293B" stroke="#64748B" strokeWidth="2.5" />
                <circle cx="54" cy="24" r="5" fill="#94A3B8" />
                <path d="M54 24 L46 116 L32 146" fill="none" stroke="#CBD5E1" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="21" y="138" width="16" height="24" rx="3" transform="rotate(24 29 150)" fill="#0F2547" stroke="#38BDF8" strokeWidth="2" />
              </svg>
            </div>

            <div className="mt-7 w-full max-w-md px-2 text-center space-y-1.5">
              <div className="text-lg sm:text-xl font-bold text-white truncate">
                {isFullyClosedSync ? 'สถานีปิดรับคิวเพลงชั่วคราว' : (activeDeckSong?.id ? activeDeckSong.title : 'ไม่มีเพลงกำลังเล่น')}
              </div>
              {!isFullyClosedSync && activeDeckSong?.id && (
                <div className="text-xs font-mono text-sky-300 font-bold">
                  {fmtTime(localCrossfade < 50 ? trackTime.curA : trackTime.curB)} / {fmtTime(localCrossfade < 50 ? trackTime.durA : trackTime.durB)}
                </div>
              )}
              {activeDeckSong?.addedBy && !isFullyClosedSync && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Added by: <span className="text-slate-200">{getAuthor(activeDeckSong.addedBy).displayName}</span>
                </div>
              )}
              {upNextSong && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDjRightTab('queue')}
                    className="inline-flex items-center gap-2 max-w-full px-3.5 py-1.5 rounded-full bg-[#050811]/85 hover:bg-[#0F2547] border border-[#1E3A5F] text-[11px] text-slate-300 transition-colors"
                  >
                    <span className="text-emerald-400 font-bold uppercase text-[9px] shrink-0">Up Next</span>
                    <span className="truncate max-w-[220px] sm:max-w-[300px] text-white font-semibold">{upNextSong.title}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5">{renderVibeDock()}</div>
          </div>
        </div>
      )}

      {/* Bottom Split: DJ Chat + Tabbed Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5">
          <div className="card p-4 h-[500px] lg:h-[580px] flex flex-col border-sky-900/50 relative">
            <div className="flex items-center justify-between mb-3 border-b border-[#1E3A5F] pb-2 shrink-0">
              <h3 className="font-bold text-sm text-sky-400">💬 แชตกับ DJ (Global)</h3>
              <span className="text-[10px] font-mono text-slate-500">{djChatMsgs.length} ข้อความ</span>
            </div>

            <div ref={djChatRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {djChatMsgs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
                  <i className="fas fa-comments text-xl opacity-40"></i>
                  <span>ทักทาย DJ หรือขอเพลงในห้องนี้ได้เลย</span>
                </div>
              ) : (
                djChatMsgs.map((msg) => {
                  const s = getAuthor(msg.senderId);
                  const isDJ = djState.jammerId === msg.senderId;
                  return (
                    <div key={msg.id} className="group/djmsg flex items-start gap-2.5">
                      <Avatar size="sm" user={s} />
                      <div className="flex-1 min-w-0 bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F]">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-bold text-sky-300">{s.displayName}</span>
                          {isDJ && <span className="px-1.5 py-0.5 rounded bg-fuchsia-600 text-white text-[9px] font-bold uppercase shadow-[0_0_8px_rgba(192,38,211,0.5)]">🎧 DJ</span>}
                          <span className="text-[9px] text-slate-400">{getTimeStr(msg)}</span>
                        </div>
                        {msg.isDeleted ? (
                          <div className="text-xs italic text-slate-500">🚫 ข้อความถูกยกเลิก</div>
                        ) : (
                          <>
                            {msg.text && <div className="text-xs text-slate-200 break-words whitespace-pre-line">{msg.text}</div>}
                            {msg.attachments?.length > 0 && (
                              <div className="mt-1.5 space-y-1.5">
                                {msg.attachments.map((att) => <SmartMedia key={att.id} att={att} />)}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {msg.reactions && Object.entries(msg.reactions).map(([em, uids]) => {
                                if (!Array.isArray(uids) || uids.length === 0) return null;
                                const active = currentUser && uids.includes(currentUser.id);
                                return (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => currentUser && toggleMsgReaction(msg, em)}
                                    title={uids.map((id) => getAuthor(id).displayName).join(', ')}
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] border flex items-center gap-1 ${active ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold' : 'bg-[#0B1325] border-[#1E3A5F] text-slate-300 hover:border-slate-400'}`}
                                  >
                                    <span>{em}</span>
                                    <span className="font-mono">{uids.length}</span>
                                  </button>
                                );
                              })}
                              {currentUser && (
                                <div className="inline-flex items-center gap-0.5 opacity-70 sm:opacity-0 sm:group-hover/djmsg:opacity-100 transition-opacity ml-auto">
                                  {['👍', '❤️', '😂', '🔥'].map((em) => (
                                    <button
                                      key={em}
                                      type="button"
                                      onClick={() => toggleMsgReaction(msg, em)}
                                      className="w-5 h-5 rounded-full hover:bg-[#0F2547] hover:scale-125 transition-transform flex items-center justify-center text-[11px]"
                                      title={`กด ${em}`}
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {currentUser ? (
              <form onSubmit={handleSendDjChat} className="mt-3 flex items-center gap-1.5 shrink-0 relative">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => { setDjEmojiOpen((v) => !v); setDjGifOpen(false); }}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm transition-colors ${djEmojiOpen ? 'bg-amber-900/50 border-amber-400' : 'bg-[#050811] border-[#1E3A5F] hover:border-amber-400'}`}
                    title="ส่งอิโมจิ"
                  >
                    🙂
                  </button>
                  {djEmojiOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDjEmojiOpen(false)}></div>
                      <div className="absolute bottom-full left-0 mb-2 bg-[#0B1325] border border-amber-500/40 rounded-xl p-1.5 grid grid-cols-6 gap-1 w-56 shadow-2xl z-50">
                        {['🔥', '❤️', '👏', '🎸', '🎧', '🎶', '😂', '😍', '🤩', '👍', '✨', '🎉'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => { setDjChatIn((prev) => prev + em); setDjEmojiOpen(false); }}
                            className="w-8 h-8 rounded-lg hover:bg-[#0F2547] hover:scale-125 transition-transform flex items-center justify-center text-base"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => { setDjGifOpen((v) => !v); setDjEmojiOpen(false); }}
                    className={`h-8 px-2 rounded-xl border text-[10px] font-bold transition-colors ${djGifOpen ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'bg-[#050811] border-[#1E3A5F] text-purple-300 hover:border-purple-400'}`}
                    title="ส่ง GIF"
                  >
                    GIF
                  </button>
                  {djGifOpen && (
                    <GiphyPickerPopover
                      onClose={() => setDjGifOpen(false)}
                      onSelect={(gifUrl) => handleSendDjChat(null, { id: 'att-gif-' + Date.now(), name: 'GIF', type: 'image', url: gifUrl, size: 'GIF' })}
                    />
                  )}
                </div>

                <input type="text" value={djChatIn} onChange={(e) => setDjChatIn(e.target.value)} placeholder="เริ่มบทสนทนา..." className="flex-1 min-w-0 inp py-1.5 text-xs" />
                <button type="submit" className="btn-w py-1.5 px-3 text-xs shrink-0">ส่ง</button>
              </form>
            ) : (
              <div className="mt-3 p-2 rounded-xl bg-[#050811] border border-[#1E3A5F] text-[11px] text-slate-400 text-center">
                เข้าสู่ระบบสมาชิกเพื่อร่วมแชตกับ DJ
              </div>
            )}
          </div>
        </div>

        {/* Right: Queue / Lyrics / Playlists */}
        <div className="lg:col-span-7">
          <div className="card p-4 h-[500px] lg:h-[580px] flex flex-col overflow-hidden border-[#1E3A5F]">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#050811] border border-[#1E3A5F] mb-3 shrink-0 text-xs font-bold">
              <button type="button" onClick={() => setDjRightTab('queue')} className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${djRightTab === 'queue' ? 'bg-white text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-list-ol"></i>
                <span className="truncate">คิวเพลง</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${djRightTab === 'queue' ? 'bg-[#050811] text-amber-300' : 'bg-[#0B1325] text-amber-400'}`}>
                  {djState.queue?.length || 0}
                </span>
              </button>
              <button type="button" onClick={() => setDjRightTab('lyrics')} className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${djRightTab === 'lyrics' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-microphone-alt"></i>
                <span className="truncate">เนื้อเพลง</span>
              </button>
              <button type="button" onClick={() => setDjRightTab('playlists')} className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${djRightTab === 'playlists' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}>
                <i className="fas fa-folder-open"></i>
                <span className="truncate">Playlists</span>
              </button>
            </div>

            {djRightTab === 'queue' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {currentUser ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const radioClosed = lateNight && djState.forceClosed === true;
                      if (radioClosed && !djState.jammerId) {
                        return alert('สถานีปิดรับคิวเพลงแล้ว เพลงที่เหลือจะเล่นจนจบก่อนปิดสถานี จะเปิดรับคิวใหม่เวลา 06:00 น.');
                      }
                      const url = e.target.elements.ytUrl.value;
                      const parsed = parseYouTubeUrl(url);
                      if (parsed?.listId || parsed?.videoId) {
                        const newId = parsed.listId || parsed.videoId;
                        const isPlaylist = Boolean(parsed.listId);
                        if (isPlaylist && (ytA.current || ytB.current)) {
                          alert('กำลังประมวลผล Playlist กรุณารอสักครู่...');
                          const helper = ytA.current || ytB.current;
                          helper.loadPlaylist({ list: parsed.listId });
                          helper.playVideo?.();
                          setTimeout(() => {
                            const playlistArr = helper.getPlaylist?.() || null;
                            if (playlistArr && playlistArr.length > 0) {
                              const songsToAdd = playlistArr.slice(0, 50).map((vid, index) => ({ id: vid, title: 'กำลังโหลดข้อมูล...', addedBy: currentUser.id, key: Date.now() + index + Math.random() }));
                              handleAddTrack(songsToAdd.shift());
                              if (songsToAdd.length > 0) updateDjState({ queue: FieldValue.arrayUnion(...songsToAdd) });
                              alert(`เพิ่มเพลงจาก Playlist จำนวน ${songsToAdd.length + 1} เพลงลงในคิวแล้ว`);
                            } else alert('ไม่พบเพลง หรือ Playlist นี้ถูกตั้งเป็นส่วนตัว (Private)');
                          }, 3500);
                        } else {
                          handleAddTrack({ id: newId, title: 'กำลังโหลดข้อมูล...', addedBy: currentUser.id, key: Date.now() + Math.random() });
                        }
                      } else alert('กรุณาระบุ URL วิดีโอ หรือ Playlist ของ YouTube ให้ถูกต้อง');
                      e.target.reset();
                    }}
                    className="flex gap-2 shrink-0"
                  >
                    <input name="ytUrl" type="url" placeholder="วางลิงก์ YouTube Video หรือ Playlist..." className="inp flex-1 min-w-0 text-xs" required />
                    <button type="submit" className="btn-b text-xs font-bold px-4 shrink-0 hover:bg-sky-600 transition-colors">+ เพิ่มคิว</button>
                  </form>
                ) : (
                  <div className="bg-blue-950/40 text-blue-200 p-2.5 rounded-xl border border-blue-800/60 text-xs text-center font-semibold shrink-0">
                    🎵 โหมดผู้มาเยือน: ฟังเพลงร่วมกับสมาคมได้ (เข้าสู่ระบบเพื่อเพิ่มเพลงเข้าคิว)
                  </div>
                )}

                <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-[#1E3A5F]/70 text-xs shrink-0">
                  <span className="font-bold text-slate-300 truncate">
                    {canManageAudio && djState.djMode === 'manual' ? 'กล่องเก็บเพลง (Track Pool)' : 'ลำดับคิวเพลงถัดไป (Auto Queue)'}
                  </span>
                  {canManageAudio && djState.queue?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { if (window.confirm('คุณต้องการลบเพลงในคิวทิ้งทั้งหมดหรือไม่?')) updateDjState({ queue: [] }); }}
                      className="text-[10px] px-2.5 py-1 bg-red-950/80 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-red-900 whitespace-nowrap shrink-0"
                    >
                      🗑️ ล้างคิว
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {(!djState.queue || djState.queue.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <i className="fas fa-compact-disc text-2xl opacity-35"></i>
                      <span>ยังไม่มีเพลงรอคิว — วางลิงก์ YouTube ด้านบนได้เลย</span>
                    </div>
                  ) : (
                    djState.queue.map((q, idx) => (
                      <div
                        key={q.key}
                        onContextMenu={(e) => openQueueTrackMenu(e, q, idx)}
                        {...longPressProps((ev) => openQueueTrackMenu(ev, q, idx))}
                        className="group flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs bg-[#050811] border border-[#1E3A5F] hover:border-sky-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-[10px] text-slate-500 w-4 text-center shrink-0">{idx + 1}</span>
                          <img src={`https://img.youtube.com/vi/${q.id}/default.jpg`} className="w-10 h-7 object-cover rounded opacity-85 shrink-0" alt="" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate text-slate-100 font-semibold">{q.title}</span>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                              <span className="truncate">โดย {getAuthor(q.addedBy).displayName}</span>
                              {idx === 0 && !(canManageAudio && djState.djMode === 'manual') && (
                                <span className="font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">คิวถัดไป</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {canManageAudio && djState.djMode === 'manual' && (
                            <div className="flex gap-1">
                              <button type="button" onClick={() => { const nQ = djState.queue.filter((x) => x.key !== q.key); updateDjState({ queue: nQ, deckA: q, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } }); }} className="bg-sky-900/50 hover:bg-sky-600 text-sky-200 px-2 py-1 text-[10px] rounded border border-sky-700 transition font-bold">เข้า A</button>
                              <button type="button" onClick={() => { const nQ = djState.queue.filter((x) => x.key !== q.key); updateDjState({ queue: nQ, deckB: q, playB: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } }); }} className="bg-amber-900/50 hover:bg-amber-600 text-amber-200 px-2 py-1 text-[10px] rounded border border-amber-700 transition font-bold">เข้า B</button>
                            </div>
                          )}

                          <div className="hidden sm:flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {canManageAudio && idx > 0 && (
                              <button type="button" onClick={() => { const nQ = [...djState.queue]; [nQ[idx - 1], nQ[idx]] = [nQ[idx], nQ[idx - 1]]; updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-[#0F2547] rounded hover:bg-white hover:text-black" title="เลื่อนขึ้น">↑</button>
                            )}
                            {canManageAudio && idx < djState.queue.length - 1 && (
                              <button type="button" onClick={() => { const nQ = [...djState.queue]; [nQ[idx + 1], nQ[idx]] = [nQ[idx], nQ[idx + 1]]; updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-[#0F2547] rounded hover:bg-white hover:text-black" title="เลื่อนลง">↓</button>
                            )}
                            {(canManageAudio || q.addedBy === currentUser?.id) && (
                              <button type="button" onClick={() => { const nQ = [...djState.queue]; nQ.splice(idx, 1); updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-red-950/60 text-red-400 rounded hover:bg-red-500 hover:text-white" title="ลบเพลงนี้">✕</button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openQueueTrackMenu(e, q, idx); }}
                            className="w-7 h-7 rounded-lg bg-[#0B1325] hover:bg-[#0F2547] border border-[#1E3A5F] text-slate-400 hover:text-white flex items-center justify-center"
                            title="ตัวเลือกเพิ่มเติม"
                          >
                            <i className="fas fa-ellipsis-v text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {djRightTab === 'lyrics' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <DiscJamLyricsPanel
                  embedded={true}
                  activeSong={isFullyClosedSync ? null : activeDeckSong}
                  playState={localCrossfade < 50 ? djState.playA : djState.playB}
                />
              </div>
            )}

            {djRightTab === 'playlists' && (
              <div className="flex-1 flex flex-col min-h-0 justify-between gap-3">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {(djState.quickPlaylists || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <i className="fas fa-folder-open text-2xl opacity-35"></i>
                      <span>ยังไม่มีเพลย์ลิสต์ด่วนในระบบ</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 content-start">
                      {(djState.quickPlaylists || []).map((qp, i) => (
                        <div key={i} className="flex items-center rounded-xl bg-[#050811] border border-[#1E3A5F] overflow-hidden shadow-md hover:border-sky-500/60 transition-colors">
                          <button
                            type="button"
                            onClick={() => {
                              if (!canManageAudio) return alert('เฉพาะ DJ เท่านั้นที่สามารถกดนำเข้าเพลย์ลิสต์ได้');
                              const parsed = parseYouTubeUrl(qp.url);
                              if (parsed?.listId && (ytA.current || ytB.current)) {
                                alert('กำลังนำเข้าเพลย์ลิสต์...');
                                const helper = ytA.current || ytB.current;
                                helper.loadPlaylist({ list: parsed.listId });
                                helper.playVideo?.();
                                setTimeout(() => {
                                  const playlistArr = helper.getPlaylist?.() || null;
                                  if (playlistArr && playlistArr.length > 0) {
                                    const songsToAdd = playlistArr.slice(0, 50).map((vid, index) => ({ id: vid, title: 'กำลังโหลดข้อมูล...', addedBy: currentUser.id, key: Date.now() + index + Math.random() }));
                                    handleAddTrack(songsToAdd.shift());
                                    if (songsToAdd.length > 0) updateDjState({ queue: FieldValue.arrayUnion(...songsToAdd) });
                                    alert(`เพิ่มเพลงจาก Playlist จำนวน ${songsToAdd.length + 1} เพลงเรียบร้อย`);
                                    setDjRightTab('queue');
                                  } else alert('ไม่พบเพลงในเพลย์ลิสต์นี้ หรือเพลย์ลิสต์ถูกตั้งเป็นส่วนตัว');
                                }, 3500);
                              }
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-[#0F2547] hover:text-white transition-colors"
                          >
                            ▶ {qp.name}
                          </button>
                          {(currentUser?.role === 'admin' || currentUser?.role === 'mod') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`ลบเพลย์ลิสต์ ${qp.name} ?`)) {
                                  const newQp = [...djState.quickPlaylists];
                                  newQp.splice(i, 1);
                                  updateDjState({ quickPlaylists: newQp });
                                }
                              }}
                              className="px-2.5 py-2 text-xs bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-white border-l border-[#1E3A5F]"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(currentUser?.role === 'admin' || currentUser?.role === 'mod') && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const nm = e.target.qpName.value.trim();
                      const ur = e.target.qpUrl.value.trim();
                      if (!nm || !ur) return;
                      updateDjState({ quickPlaylists: [...(djState.quickPlaylists || []), { name: nm, url: ur }] });
                      e.target.reset();
                    }}
                    className="pt-3 border-t border-[#1E3A5F] flex flex-col sm:flex-row gap-1.5 shrink-0"
                  >
                    <input name="qpName" type="text" placeholder="ชื่อเพลย์ลิสต์" className="w-full sm:w-28 inp py-1.5 px-2.5 text-xs min-w-0" required />
                    <div className="flex gap-1.5 flex-1 min-w-0">
                      <input name="qpUrl" type="url" placeholder="ลิงก์ YouTube Playlist" className="flex-1 min-w-0 inp py-1.5 px-2.5 text-xs" required />
                      <button type="submit" className="btn-b py-1.5 px-3.5 text-xs shrink-0">+</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}