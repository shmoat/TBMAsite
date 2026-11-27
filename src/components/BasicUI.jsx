import React from 'react';
import { getTags } from '../lib/utils';

export const UpIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

export const Logo = ({ s = 38 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" className="shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]">
    <path d="M 52 10 L 14 86 L 86 86 Q 50 62 52 10 Z" fill="#0F2547" stroke="#FFFFFF" strokeWidth="5.5" strokeLinejoin="round" />
  </svg>
);

export const getStatusInfo = (u) => {
  if (!u) return { c: 'bg-slate-500', t: 'Offline' };
  const diff = Date.now() - (u.lastActive || 0);
  if (u.isOnline && diff < 300000) return { c: 'bg-emerald-400', t: 'Online' };
  if (u.isOnline && diff < 900000) return { c: 'bg-amber-400', t: 'AFK' };

  let offTxt = 'Offline';
  if (u.lastActive) {
    const min = Math.floor(diff / 60000);
    if (min < 60) offTxt = `Offline (${min} นาทีที่แล้ว)`;
    else if (min < 1440) offTxt = `Offline (${Math.floor(min / 60)} ชั่วโมงที่แล้ว)`;
    else offTxt = `Offline (${Math.floor(min / 1440)} วันที่แล้ว)`;
  }
  return { c: 'bg-slate-500', t: offTxt };
};

export const Avatar = ({ user, size = 'md', showStatus = false }) => {
  const sc = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg'
  }[size] || 'w-10 h-10 text-xs';

  const hatCls = {
    xs: 'w-4 h-4 -top-1.5 -right-1',
    sm: 'w-5 h-5 -top-2 -right-1.5',
    md: 'w-6 h-6 -top-2.5 -right-1.5',
    lg: 'w-8 h-8 -top-3.5 -right-2',
    xl: 'w-11 h-11 -top-4 -right-2.5'
  }[size] || 'w-6 h-6 -top-2.5 -right-1.5';

  const lotusCls = {
    xs: 'w-3.5 h-3.5 -top-1 -left-1',
    sm: 'w-4 h-4 -top-1.5 -left-1',
    md: 'w-5 h-5 -top-1.5 -left-1.5',
    lg: 'w-6 h-6 -top-2 -left-1.5',
    xl: 'w-8 h-8 -top-2.5 -left-2'
  }[size] || 'w-5 h-5 -top-1.5 -left-1.5';

  const stat = getStatusInfo(user);

  return (
    <div className="relative inline-flex shrink-0">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={sc + ' avatar-loy-ring rounded-full object-cover border-2 border-white/40 bg-[#0F2547]'} />
      ) : (
        <div className={sc + ' avatar-loy-ring rounded-full bg-[#0F2547] border-2 border-white/30 flex items-center justify-center font-mono font-bold'}>
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '#'}
        </div>
      )}
      <svg viewBox="0 0 40 36" fill="none" className={`avatar-santa-hat absolute rotate-[18deg] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] ${hatCls}`} aria-hidden="true">
        <path d="M5 27 C8 13 17 5 30 8 C26 13 28 20 32 27 Z" fill="#DC2626" stroke="#FCA5A5" strokeWidth="1.3" strokeLinejoin="round" />
        <rect x="3" y="25" width="31" height="7" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
        <circle cx="32.5" cy="9.5" r="4.2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 36 30" fill="none" className={`avatar-loy-lotus absolute -rotate-[12deg] drop-shadow-[0_2px_5px_rgba(251,191,36,0.7)] ${lotusCls}`} aria-hidden="true">
        <path d="M18 4 C14 10 13 18 18 24 C23 18 22 10 18 4 Z" fill="#F472B6" stroke="#FEF08A" strokeWidth="1.2" />
        <path d="M18 24 C10 22 5 16 6 10 C11 12 15 17 18 24 Z" fill="#EC4899" stroke="#FDE68A" strokeWidth="1.1" />
        <path d="M18 24 C26 22 31 16 30 10 C25 12 21 17 18 24 Z" fill="#EC4899" stroke="#FDE68A" strokeWidth="1.1" />
        <ellipse cx="18" cy="24.5" rx="11" ry="3.2" fill="#15803D" stroke="#FDE68A" strokeWidth="1" />
      </svg>
      {showStatus && user && <span title={stat.t} className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#050811] ${stat.c}`} />}
    </div>
  );
};

export const RoleBadge = ({ role }) => (
  role === 'admin'
    ? <span className="px-1.5 py-0.5 rounded bg-amber-400 text-[#050811] text-[10px] font-bold uppercase">👑 Owner</span>
    : role === 'mod'
      ? <span className="px-1.5 py-0.5 rounded bg-sky-400 text-[#050811] text-[10px] font-bold uppercase">🛡️ Vice</span>
      : null
);

export const TagBadges = ({ user }) => (
  <div className="flex flex-wrap gap-1">
    {getTags(user).map((t, i) => (
      <span key={i} className="px-2 py-0.5 rounded-full bg-[#0F2547] border border-white/20 text-blue-100 text-[10px] font-semibold">
        {t}
      </span>
    ))}
  </div>
);

export const Modal = ({ title, onClose, maxW = 'max-w-md', children }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    <div className={'w-full ' + maxW + ' card p-6 shadow-2xl my-8 animate-fade-in relative'}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E3A5F]">
        <h3 className="text-base font-bold">{title}</h3>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>}
      </div>
      {children}
    </div>
  </div>
);