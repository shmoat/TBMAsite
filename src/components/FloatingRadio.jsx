import React from 'react';
import { useRadio } from '../contexts/RadioContext';
import { useUI } from '../contexts/UIContext';
import { fmtTime } from '../lib/utils';
import { longPressProps } from './ContextMenu';

export function FloatingRadio({ onOpenDiscJam }) {
  const {
    djState,
    localCrossfade,
    isLocalPaused,
    localVolume,
    setLocalVolume,
    isPlayerFloatingOpen,
    setIsPlayerFloatingOpen,
    trackTime,
    flyingNotes,
    canManageAudio,
    activeDeckSong,
    isDeckPlaying,
    isFullyClosedSync,
    handleToggleLocalAudio,
    advanceDjQueue,
    updateDjState
  } = useRadio();
  const { openAppMenu } = useUI();

  const openFloatingPlayerMenu = (e) => {
    const items = [
      {
        icon: isLocalPaused ? 'fas fa-volume-up' : 'fas fa-volume-mute',
        label: isLocalPaused ? 'เปิดรับเสียงวิทยุ' : 'ปิดเสียงวิทยุชั่วคราว',
        accent: true,
        onClick: handleToggleLocalAudio
      }
    ];

    if (canManageAudio && !isFullyClosedSync && activeDeckSong?.id) {
      items.push({
        icon: 'fas fa-step-forward',
        label: 'ข้ามเพลงปัจจุบัน (DJ)',
        onClick: () => {
          const activeDeck = localCrossfade < 50 ? 'A' : 'B';
          if ((djState.djMode || 'auto') === 'auto') {
            advanceDjQueue(activeDeck, false, activeDeckSong.key || activeDeckSong.id);
          } else {
            const up = activeDeck === 'A'
              ? { deckA: null, playA: { ...(djState.playA || {}), isPlaying: false } }
              : { deckB: null, playB: { ...(djState.playB || {}), isPlaying: false } };
            updateDjState(up);
          }
        }
      });
    }

    if (!isFullyClosedSync && activeDeckSong?.id) {
      const ytUrl = `https://www.youtube.com/watch?v=${activeDeckSong.id}`;
      items.push({ type: 'divider' });
      items.push({ icon: 'fas fa-link', label: 'คัดลอกลิงก์ YouTube เพลงนี้', onClick: () => navigator.clipboard.writeText(ytUrl) });
      items.push({ icon: 'fab fa-youtube', label: 'เปิดดูบน YouTube', onClick: () => window.open(ytUrl, '_blank', 'noopener,noreferrer') });
    }

    items.push({ type: 'divider' });
    if (onOpenDiscJam) {
      items.push({ icon: 'fas fa-compact-disc', label: 'เปิดหน้า Disc Jam', onClick: onOpenDiscJam });
    }
    items.push({ icon: 'fas fa-compress', label: 'ยุบตัวเล่นเป็นปุ่มวงกลม', onClick: () => setIsPlayerFloatingOpen(false) });

    openAppMenu(e, {
      header: { icon: 'fas fa-compact-disc', title: 'Disc Jam Radio', sub: isFullyClosedSync ? 'ปิดรับคิวชั่วคราว' : (activeDeckSong?.title || 'ไม่มีเพลงเล่น') },
      items
    });
  };

  if (!isPlayerFloatingOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsPlayerFloatingOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#0F2547] border-2 border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center justify-center text-xl hover:scale-110 transition-transform pointer-events-auto cursor-pointer"
        title="เปิด Disc Jam Radio"
      >
        🎧
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end pointer-events-none">
      <div
        onContextMenu={openFloatingPlayerMenu}
        {...longPressProps(openFloatingPlayerMenu)}
        className="pointer-events-auto bg-[#0B1325]/90 backdrop-blur-md border border-[#1E3A5F] p-3 rounded-2xl shadow-2xl flex flex-col gap-2 max-w-[280px]"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full border-2 border-slate-700 shrink-0 shadow-[0_0_10px_rgba(14,165,233,0.3)]">
            <div className="w-full h-full rounded-full overflow-hidden">
              {isFullyClosedSync ? (
                <img src="/jazzskull-trumpet.gif" className="w-full h-full object-cover" alt="" />
              ) : activeDeckSong?.id ? (
                <img src={`https://img.youtube.com/vi/${activeDeckSong.id}/default.jpg`} className={`w-full h-full object-cover ${isDeckPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`} alt="" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xs">💿</div>
              )}
            </div>
            <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-2" style={{ overflow: 'visible' }}>
              {flyingNotes.map((n) => (
                <div key={n.id} className="animate-music-note text-[10px]" style={{ left: n.left }}>{n.char}</div>
              ))}
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="text-[9px] text-sky-400 font-bold uppercase tracking-wider mb-0.5">Disc Jam Radio</div>
            <div className="text-xs font-bold text-white truncate w-32">
              {isFullyClosedSync ? 'สถานีปิดรับคิวชั่วคราว' : (activeDeckSong?.title || 'ไม่มีเพลงเล่น')}
            </div>
            <div className="flex items-center gap-2 mt-1.5 justify-between w-full">
              <button
                type="button"
                onClick={handleToggleLocalAudio}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${!isLocalPaused ? 'bg-sky-900/50 text-sky-300 border-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.4)]' : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700'}`}
              >
                {!isLocalPaused ? '🔊 กำลังฟัง' : '🔇 กดรับเสียง'}
              </button>
              {!isFullyClosedSync && activeDeckSong?.id && (
                <span className="text-[9px] font-mono text-slate-400 mr-2">
                  {fmtTime(localCrossfade < 50 ? trackTime.curA : trackTime.curB)} / {fmtTime(localCrossfade < 50 ? trackTime.durA : trackTime.durB)}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setIsPlayerFloatingOpen(false)} className="text-slate-500 hover:text-white p-1 self-start -mt-1 -mr-1">✕</button>
        </div>

        {!isLocalPaused && (
          <div className="flex items-center gap-2 px-1 pt-1.5 border-t border-[#1E3A5F]">
            <span className="text-xs text-slate-400">🔈</span>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={(e) => setLocalVolume(parseInt(e.target.value, 10))}
              className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-[9px] font-mono w-6 text-right text-sky-400">{localVolume}%</span>
          </div>
        )}
      </div>
    </div>
  );
}