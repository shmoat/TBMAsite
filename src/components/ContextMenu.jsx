import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

let _bmaLpTimer = null;
let _bmaLpX = 0;
let _bmaLpY = 0;

export const cancelLongPress = () => {
  if (_bmaLpTimer) {
    clearTimeout(_bmaLpTimer);
    _bmaLpTimer = null;
  }
};

export const longPressProps = (onTrigger) => ({
  onTouchStart: (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    cancelLongPress();
    _bmaLpX = e.touches[0].clientX;
    _bmaLpY = e.touches[0].clientY;
    _bmaLpTimer = setTimeout(() => {
      _bmaLpTimer = null;
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch {}
      }
      onTrigger({
        clientX: _bmaLpX,
        clientY: _bmaLpY,
        shiftKey: false,
        preventDefault: () => {},
        stopPropagation: () => {}
      });
    }, 450);
  },
  onTouchMove: (e) => {
    if (!_bmaLpTimer || !e.touches?.[0]) return;
    if (Math.abs(e.touches[0].clientX - _bmaLpX) > 10 || Math.abs(e.touches[0].clientY - _bmaLpY) > 10) {
      cancelLongPress();
    }
  },
  onTouchEnd: cancelLongPress,
  onTouchCancel: cancelLongPress
});

export function AppContextMenu({ menu, onClose }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999, ready: false });

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 10;
    let left = menu.x;
    let top = menu.y;
    if (left + rect.width + pad > window.innerWidth) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (top + rect.height + pad > window.innerHeight) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    setPos({ left, top, ready: true });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onWin = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onWin);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      style={{ left: `${pos.left}px`, top: `${pos.top}px`, opacity: pos.ready ? 1 : 0 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[120] min-w-[215px] max-w-[270px] card bg-[#0B1325]/95 backdrop-blur-md border border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.85)] py-1.5 text-xs select-none transition-opacity duration-75"
    >
      {menu.header && (
        <div className="px-3 py-1.5 mb-1 border-b border-[#1E3A5F] flex items-center gap-2">
          {menu.header.icon && <i className={`${menu.header.icon} text-sky-400 text-xs shrink-0`}></i>}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white truncate text-[11px]">{menu.header.title}</div>
            {menu.header.sub && <div className="text-[9px] text-slate-400 truncate font-mono">{menu.header.sub}</div>}
          </div>
        </div>
      )}

      {menu.quickReactions?.length > 0 && (
        <div className="px-2 py-1.5 mb-1 border-b border-[#1E3A5F] flex items-center justify-between gap-1">
          {menu.quickReactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => { r.onClick(); onClose(); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform hover:scale-125 ${r.active ? 'bg-sky-500/30 ring-1 ring-sky-400' : 'hover:bg-[#0F2547]'}`}
              title={`รีแอ็กชัน ${r.emoji}`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        {(menu.items || []).filter(Boolean).map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={`d-${idx}`} className="my-1 border-t border-[#1E3A5F]/80" />;
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                onClose();
                item.onClick && item.onClick();
              }}
              className={`w-full px-3 py-1.5 text-left flex items-center justify-between gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                item.danger
                  ? 'text-red-400 hover:bg-red-950/70 hover:text-red-200'
                  : item.accent
                    ? 'text-amber-300 hover:bg-[#0F2547] font-bold'
                    : 'text-slate-100 hover:bg-[#0F2547]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {item.icon && <i className={`${item.icon} w-3.5 text-center shrink-0 opacity-85`}></i>}
                <span className="truncate">{item.label}</span>
              </span>
              {item.sub && <span className="text-[9px] text-slate-400 font-mono shrink-0">{item.sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}