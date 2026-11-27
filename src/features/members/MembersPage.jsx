import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { PRESET_TAGS, getTags } from '../../lib/utils';
import { Avatar, RoleBadge, TagBadges } from '../../components/BasicUI';
import { longPressProps } from '../../components/ContextMenu';

export default function MembersPage({ onOpenMemberMenu }) {
  const { users, activeMembers, currentUser } = useAuth();
  const { openMemberProfile } = useUI();
  const [dirTag, setDirTag] = useState('ALL');

  const allTags = useMemo(
    () => Array.from(new Set([...PRESET_TAGS, ...users.flatMap((u) => getTags(u))])),
    [users]
  );

  const visibleMembers = activeMembers.filter((u) => dirTag === 'ALL' || getTags(u).includes(dirTag));

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-5 flex-1 overflow-y-auto">
      <div className="card p-5 flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-bold">ทำเนียบสมาชิก ({activeMembers.length})</h2>
        <select
          value={dirTag}
          onChange={(e) => setDirTag(e.target.value)}
          className="inp py-1.5 text-xs text-white max-w-[200px] w-full bg-[#050811] border border-[#1E3A5F]"
        >
          <option value="ALL">หมวดหมู่ทั้งหมด</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {visibleMembers.map((m) => (
          <div
            key={m.id}
            onClick={() => openMemberProfile(m)}
            onContextMenu={(e) => onOpenMemberMenu?.(e, m)}
            {...longPressProps((ev) => onOpenMemberMenu?.(ev, m))}
            className={`card overflow-hidden transition-colors cursor-pointer ${currentUser ? 'hover:border-white/50' : 'hover:border-sky-500/40'}`}
          >
            <div className="bg-[#0F2547] px-4 py-2.5 border-b border-[#1E3A5F] flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className={`font-mono text-xs font-bold ${String(m.id).startsWith('F') ? 'text-[#38BDF8]' : 'text-white'}`}>{m.id}</span>
                <RoleBadge role={m.role} />
              </div>
              <TagBadges user={m} />
            </div>
            <div className="p-4 flex items-center gap-3">
              <Avatar user={m} size={currentUser ? 'lg' : 'md'} showStatus={Boolean(currentUser)} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold truncate">{m.displayName}</h3>
                {currentUser ? (
                  <>
                    <p className="text-xs font-mono text-slate-400">@{m.username}</p>
                    <p className="text-xs text-slate-200 mt-1.5 bg-[#050811] p-2 rounded-xl border border-[#1E3A5F] line-clamp-2">{m.bio}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <i className="fas fa-lock text-[9px]"></i> สงวนรายละเอียดโปรไฟล์สำหรับสมาชิก
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}