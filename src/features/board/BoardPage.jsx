import React, { useState } from 'react';
import { db, FieldValue } from '../../lib/firebase';
import { promptSafeUrl } from '../../lib/security';
import { fmtTime, uploadChunked } from '../../lib/utils';
import { GAMES } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, TagBadges } from '../../components/BasicUI';
import { SmartMedia, FormattedText, LikeButton, GiphyPickerPopover, PantipThread } from '../../components/RichUI';
import { formatMuteUntil } from '../../components/MuteDurationModal';
import { KrathongSVG } from '../../components/KrathongSVG';

export default function BoardPage({
  searchQ, setSearchQ, setVisiblePosts, setCreatePost,
  filterMenuOpen, setFilterMenuOpen, tagFilter, setTagFilter, allTags,
  filterType, setFilterType, filterLatestOnly, setFilterLatestOnly,
  filteredPosts, posts, visiblePosts, postMenu, setPostMenu,
  handleEditPostReq, setCurrentView, setActiveGameTab,
  toggleCommLike, toggleCommReact, repComm, setRepComm, setCommMenu,
  cInputs, setCInputs, handleAddComment,
  setBoardMenuOpen, onOpenXmasTree, onOpenLoyKrathong,
  isTargetMuted, getMuteExp, onOpenMuteModal
}) {
  const { currentUser, getAuthor } = useAuth();
  const { openAppMenu, openGuestPrompt, openMemberProfile } = useUI();

  const [showComments, setShowComments] = useState({});
  const [visibleCommCount, setVisibleCommCount] = useState({});
  const [boardView, setBoardView] = useState('standard');
  const [spoilerRevealed, setSpoilerRevealed] = useState({});
  const [commGifPostId, setCommGifPostId] = useState(null);
  const [commReactPostId, setCommReactPostId] = useState(null);

  const openPostMenu = (e, post) => {
    const author = getAuthor(post.authorId);
    const isBm = currentUser && (post.bookmarks || []).includes(currentUser.id);
    const canManage = currentUser?.role === 'admin' || currentUser?.role === 'mod' || currentUser?.id === post.authorId;
    const selectedText = window.getSelection ? window.getSelection().toString().trim() : '';

    const items = [];
    if (selectedText) {
      items.push({ icon: 'fas fa-highlighter', label: 'คัดลอกข้อความที่ไฮไลต์', accent: true, onClick: () => navigator.clipboard.writeText(selectedText) });
    }

    items.push({
      icon: 'fas fa-link',
      label: 'คัดลอกลิงก์แชร์โพสต์',
      accent: !selectedText,
      onClick: () => {
        const u = window.location.origin + window.location.pathname + '?post=' + post.id;
        navigator.clipboard.writeText(u);
        alert('คัดลอกลิงก์โพสต์นี้แล้ว!\n' + u);
      }
    });

    items.push({
      icon: isBm ? 'fas fa-star' : 'far fa-star',
      label: isBm ? 'เลิกบันทึกโพสต์นี้' : 'บันทึกโพสต์ไว้อ่านทีหลัง',
      onClick: async () => {
        if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกโพสต์เก็บไว้อ่านภายหลัง');
        const b = post.bookmarks || [];
        await db.collection('bma_posts').doc(post.id).update({
          bookmarks: b.includes(currentUser.id) ? b.filter((i) => i !== currentUser.id) : [...b, currentUser.id]
        });
      }
    });

    items.push({ type: 'divider' });
    items.push({ icon: 'fas fa-user', label: `ดูโปรไฟล์ ${author.displayName}`, onClick: () => openMemberProfile(author) });
    items.push({ icon: 'fas fa-search', label: 'ดูโพสต์ทั้งหมดของคนนี้', onClick: () => { setSearchQ(post.authorId); setCurrentView('feed'); } });

    if (currentUser && currentUser.id === post.authorId && onOpenMuteModal) {
      const mKey = 'post:' + post.id;
      const muted = isTargetMuted && isTargetMuted(mKey);
      items.push({
        icon: muted ? 'fas fa-bell' : 'fas fa-bell-slash',
        label: muted ? 'ตั้งค่า / เปิดแจ้งเตือนโพสต์นี้' : 'ปิดการแจ้งเตือนโพสต์นี้...',
        onClick: () => onOpenMuteModal({
          key: mKey,
          label: 'โพสต์: ' + (post.title || post.content?.slice(0, 32) || 'โพสต์ของคุณ')
        })
      });
    }

    if (canManage) {
      items.push({ type: 'divider' });
      if (currentUser?.role !== 'member') {
        items.push({
          icon: 'fas fa-thumbtack',
          label: post.isPinned ? 'เลิกปักหมุดโพสต์' : 'ปักหมุดโพสต์ไว้บนสุด',
          accent: !post.isPinned,
          onClick: () => db.collection('bma_posts').doc(post.id).update({ isPinned: !post.isPinned })
        });
      }
      items.push({
        icon: post.isGuestAllowed ? 'fas fa-lock' : 'fas fa-globe',
        label: post.isGuestAllowed ? 'เปลี่ยนเป็นเฉพาะสมาชิก' : 'เปิดให้ Guest อ่านได้',
        onClick: () => db.collection('bma_posts').doc(post.id).update({ isGuestAllowed: !post.isGuestAllowed })
      });
      items.push({ icon: 'fas fa-pen', label: 'แก้ไขโพสต์', accent: true, onClick: () => handleEditPostReq(post) });
      items.push({
        icon: 'fas fa-trash-alt',
        label: 'ลบโพสต์นี้',
        danger: true,
        onClick: () => {
          if (window.confirm('ต้องการลบโพสต์นี้ใช่หรือไม่?')) db.collection('bma_posts').doc(post.id).delete();
        }
      });
    }

    openAppMenu(e, {
      header: { icon: 'fas fa-clipboard-list', title: post.title || `โพสต์ของ ${author.displayName}`, sub: `${author.id} • ${post.createdAt}` },
      items
    });
  };

  const markPostAsRead = (postId, postReadBy) => {
    if (currentUser && !(postReadBy || []).includes(currentUser.id)) {
      db.collection('bma_posts').doc(postId).update({ readBy: FieldValue.arrayUnion(currentUser.id) }).catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="card p-3.5 space-y-2.5 shadow-lg border-sky-900/30">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBoardMenuOpen?.(true)}
            className="lg:hidden w-10 h-10 rounded-xl bg-[#0F2547] text-sky-400 flex items-center justify-center border border-[#1E3A5F] shrink-0 shadow-sm"
            title="เมนูบอร์ด"
          >
            <i className="fas fa-bars"></i>
          </button>

          <div className="relative flex-1 flex items-center">
            <i className="fas fa-search absolute left-3 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setVisiblePosts(10); }}
              placeholder="ค้นหาโพสต์, แท็ก..."
              className="w-full inp text-xs pl-8 py-2.5 rounded-xl border-[#1E3A5F] bg-[#050811] focus:border-sky-500 transition-colors"
            />
          </div>

          {currentUser && (
            <button
              type="button"
              onClick={() => setCreatePost(true)}
              className="btn-w text-xs whitespace-nowrap px-4 rounded-xl shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 shrink-0"
            >
              <i className="fas fa-pen"></i><span className="hidden sm:inline">เขียนโพสต์</span>
            </button>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 pt-1 border-t border-[#1E3A5F]/50">
          <div className="flex bg-[#050811] p-1 rounded-full border border-[#1E3A5F] text-slate-400">
            <button type="button" onClick={() => setBoardView('standard')} className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors ${boardView === 'standard' ? 'bg-sky-600 text-white shadow-md' : 'hover:bg-[#0F2547] hover:text-white'}`} title="มุมมองมาตรฐาน"><i className="fas fa-list"></i></button>
            <button type="button" onClick={() => setBoardView('grid')} className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors ${boardView === 'grid' ? 'bg-sky-600 text-white shadow-md' : 'hover:bg-[#0F2547] hover:text-white'}`} title="มุมมองตาราง (Grid)"><i className="fas fa-th-large"></i></button>
            <button type="button" onClick={() => setBoardView('compact')} className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors ${boardView === 'compact' ? 'bg-sky-600 text-white shadow-md' : 'hover:bg-[#0F2547] hover:text-white'}`} title="มุมมองย่อ (Compact)"><i className="fas fa-bars"></i></button>
          </div>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-2 border transition-colors ${tagFilter !== 'ALL' || filterType !== 'ALL' || filterLatestOnly ? 'bg-sky-900/50 border-sky-500 text-sky-100' : 'bg-[#050811] border-[#1E3A5F] text-slate-300 hover:text-white'}`}
            >
              <span><i className="fas fa-cog mr-1"></i>ตัวกรอง</span>
              {(tagFilter !== 'ALL' || filterType !== 'ALL' || filterLatestOnly) && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>

            {filterMenuOpen && <div className="fixed inset-0 z-20" onClick={() => setFilterMenuOpen(false)}></div>}

            {filterMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-64 card p-4 z-30 shadow-2xl border-sky-500/30 text-xs flex flex-col gap-3">
                <div>
                  <div className="font-bold text-sky-300 mb-1.5"><i className="fas fa-tag mr-1"></i> หมวดหมู่สมาชิก</div>
                  <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-full inp py-1.5 text-xs text-white">
                    <option value="ALL">ทั้งหมด</option>
                    {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <div className="font-bold text-sky-300 mb-1.5"><i className="fas fa-filter mr-1"></i> ประเภทโพสต์</div>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full inp py-1.5 text-xs text-white">
                    <option value="ALL">ทั้งหมด</option>
                    <option value="NORMAL">โพสต์ทั่วไป</option>
                    <option value="GAME">🎮 ผล Daily Games</option>
                    <option value="MEDIA">🖼️ มีสื่อประกอบ</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer border-t border-[#1E3A5F] pt-3 mt-1">
                  <input type="checkbox" checked={filterLatestOnly} onChange={(e) => setFilterLatestOnly(e.target.checked)} className="rounded bg-[#0B1325] border-[#1E3A5F] w-4 h-4 accent-sky-500" />
                  <span className="font-bold text-slate-200">📌 ดูเฉพาะโพสต์ล่าสุดของทุกคน</span>
                </label>

                {(tagFilter !== 'ALL' || filterType !== 'ALL' || filterLatestOnly) && (
                  <button type="button" onClick={() => { setTagFilter('ALL'); setFilterType('ALL'); setFilterLatestOnly(false); setFilterMenuOpen(false); }} className="mt-1 btn-d py-1.5 w-full text-red-300 hover:text-white hover:bg-red-950 font-bold border-red-900/50">
                    ✕ ล้างตัวกรองทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className={boardView === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 items-start' : 'space-y-4'}>
        {filteredPosts.slice(0, visiblePosts).map((post) => {
          const author = getAuthor(post.authorId);
          const isBm = currentUser && (post.bookmarks || []).includes(currentUser.id);
          const isClosed = post.poll?.closesAt && Date.now() > post.poll.closesAt;
          const totalVotes = post.poll ? (post.poll.options || []).reduce((s, o) => s + (o.votes?.length || 0), 0) : 0;
          const canManage = (uid) => currentUser?.role === 'admin' || currentUser?.role === 'mod' || currentUser?.id === uid;
          const allComm = post.comments || [];
          const rootComm = allComm.filter((c) => {
            const pid = c.parentId || c.replyTo?.id;
            return !pid || !allComm.some((x) => x.id === pid);
          });

          let borderStyle = 'border-[#1E3A5F] bg-[#0B1325]';
          let shadowStyle = 'shadow-xl';
          let headerRoleBadge = null;

          if (author.id === 'SYSTEM') {
            borderStyle = 'border-red-500/50 bg-red-950/20';
            shadowStyle = 'shadow-[0_0_15px_rgba(239,68,68,0.15)]';
            headerRoleBadge = <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider"><i className="fas fa-bullhorn mr-1"></i> System</span>;
          } else if (author.role === 'admin') {
            borderStyle = 'border-amber-500/50 bg-amber-950/10';
            shadowStyle = 'shadow-[0_0_15px_rgba(251,191,36,0.1)]';
            headerRoleBadge = <span className="bg-amber-500 text-[#050811] text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider"><i className="fas fa-crown mr-1"></i> Owner</span>;
          } else if (author.role === 'mod') {
            borderStyle = 'border-sky-400/50 bg-sky-950/10';
            shadowStyle = 'shadow-[0_0_15px_rgba(56,189,248,0.1)]';
            headerRoleBadge = <span className="bg-sky-500 text-[#050811] text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider"><i className="fas fa-shield-alt mr-1"></i> Vice</span>;
          }

          const isCompact = boardView === 'compact';

          return (
            <article
              id={'post-' + post.id}
              key={post.id}
              onContextMenu={(e) => openPostMenu(e, post)}
              onMouseEnter={() => setTimeout(() => markPostAsRead(post.id, post.readBy), 1000)}
              className={`rounded-[1rem] p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-300 border ${borderStyle} ${shadowStyle}`}
            >
              {post.isPinned && <div className="text-amber-300 text-[11px] font-bold -mt-1 mb-1 border-b border-amber-900/30 pb-2"><i className="fas fa-thumbtack mr-1"></i> โพสต์ปักหมุด</div>}

              <div className="flex justify-between items-start gap-2">
                <div onClick={() => openMemberProfile(author)} className="flex items-center gap-2.5 cursor-pointer min-w-0">
                  {!isCompact && <Avatar user={author} size="md" showStatus={true} />}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isCompact && <Avatar user={author} size="xs" showStatus={true} />}
                      <span className="font-bold text-sm hover:underline truncate max-w-[120px] sm:max-w-[200px]">{author.displayName}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${String(author.id).startsWith('F') ? 'bg-[#38BDF8] text-[#050811]' : 'bg-white text-[#050811]'}`}>{author.id}</span>
                      {!isCompact && <TagBadges user={author} />}
                      {headerRoleBadge}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">@{author.username} • {post.createdAt}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 relative shrink-0">
                  {!canManage(post.authorId) && !isCompact && <span className="px-2 py-0.5 rounded-full bg-[#050811] border border-[#1E3A5F] text-[9px] text-slate-400">{post.isGuestAllowed ? '🌐 Guest' : '🔒 สมาชิก'}</span>}
                  {currentUser && currentUser.id === post.authorId && (() => {
                    const mKey = 'post:' + post.id;
                    const muted = isTargetMuted && isTargetMuted(mKey);
                    const exp = getMuteExp ? getMuteExp(mKey) : null;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMuteModal?.({
                            key: mKey,
                            label: 'โพสต์: ' + (post.title || post.content?.slice(0, 32) || 'โพสต์ของคุณ')
                          });
                        }}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] transition-colors ${muted ? 'bg-red-950/70 border-red-500/60 text-red-400 hover:bg-red-900' : 'bg-[#050811] border-[#1E3A5F] text-slate-400 hover:text-amber-300 hover:border-amber-400/60'}`}
                        title={muted ? `ปิดแจ้งเตือนอยู่ (${formatMuteUntil(exp)}) — คลิกเพื่อตั้งค่า` : 'ปิดการแจ้งเตือนโพสต์นี้'}
                      >
                        <i className={`fas ${muted ? 'fa-bell-slash' : 'fa-bell'}`}></i>
                      </button>
                    );
                  })()}
                  {canManage(post.authorId) && (
                    <button type="button" onClick={() => setPostMenu(postMenu === post.id ? null : post.id)} className="text-slate-400 hover:text-white px-2 font-bold"><i className="fas fa-ellipsis-v"></i></button>
                  )}
                  {postMenu === post.id && (
                    <div className="absolute top-6 right-0 w-48 card border border-white/20 shadow-2xl py-1 z-30 flex flex-col text-left text-xs">
                      <button type="button" onClick={() => { setPostMenu(null); db.collection('bma_posts').doc(post.id).update({ isGuestAllowed: !post.isGuestAllowed }); }} className="w-full px-4 py-2 text-left hover:bg-[#0F2547] flex justify-between items-center">
                        <span>{post.isGuestAllowed ? '🔒 เปลี่ยนเป็นเฉพาะสมาชิก' : '🌐 ให้ Guest อ่านได้'}</span>
                      </button>
                      <button type="button" onClick={() => { setPostMenu(null); handleEditPostReq(post); }} className="w-full px-4 py-2 text-left hover:bg-[#0F2547] text-amber-300"><i className="fas fa-pen mr-1"></i> แก้ไขโพสต์</button>
                      <button type="button" onClick={() => { setPostMenu(null); if (window.confirm('ต้องการลบโพสต์นี้ใช่หรือไม่?')) db.collection('bma_posts').doc(post.id).delete(); }} className="w-full px-4 py-2 text-left hover:bg-red-950 text-red-400"><i className="fas fa-trash-alt mr-1"></i> ลบโพสต์</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {post.isQA && <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ml-1"><i className="fas fa-question-circle mr-1"></i> Q&amp;A</span>}
                {post.title && <h3 className={`font-bold text-sky-50 ${isCompact ? 'text-sm' : 'text-base'}`}>{post.title}</h3>}
              </div>

              {!isCompact && (
                <div
                  className={`transition-all duration-500 relative ${post.isSpoiler && !spoilerRevealed[post.id] ? 'filter blur-md cursor-pointer select-none' : ''}`}
                  onClick={() => { if (post.isSpoiler) setSpoilerRevealed((p) => ({ ...p, [post.id]: true })); }}
                >
                  {post.isSpoiler && !spoilerRevealed[post.id] && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-red-950/80 text-red-200 border border-red-500/50 px-4 py-2 rounded-full font-bold text-xs shadow-2xl backdrop-blur">
                        <i className="fas fa-eye-slash mr-1"></i> มีเนื้อหาสปอยล์ (คลิกเพื่อดู)
                      </div>
                    </div>
                  )}

                  {post.content && <FormattedText text={post.content} currentUser={currentUser} />}

                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 relative z-10">
                      {post.tags.map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={(e) => { e.stopPropagation(); setSearchQ(t); setCurrentView('feed'); if (window.innerWidth < 1024) setBoardMenuOpen?.(false); }}
                          className="px-2 py-0.5 bg-sky-900/30 text-sky-300 hover:bg-sky-700/50 rounded text-[9px] border border-sky-800 transition-colors shadow-sm"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}

                  {post.dailyGameShare && (
                    <div className="p-3.5 card border-amber-400/50 flex flex-col gap-2 shadow-lg bg-[#0F2547]/50 mt-1">
                      <div className="text-amber-300 font-bold text-sm">🎯 {GAMES[post.dailyGameShare.gameIndex]?.name || 'Daily Game'}</div>
                      <div className="text-xs">
                        ผู้โพสต์ทำสถิติได้:{' '}
                        <span className="font-mono text-white font-bold bg-black/40 px-2 py-0.5 rounded">
                          {post.dailyGameShare.score ? `สถิติ ${post.dailyGameShare.score} / ${fmtTime(post.dailyGameShare.timeMs)}` : fmtTime(post.dailyGameShare.timeMs)}
                        </span>
                      </div>
                      <button type="button" onClick={() => { window.history.replaceState({}, document.title, window.location.pathname); setActiveGameTab(post.dailyGameShare.gameIndex); setCurrentView('daily_game'); }} className="btn-w text-[10px] self-start mt-1 hover:scale-105 transition-transform">
                        <i className="fas fa-gamepad mr-1"></i> ตามไปเล่นเกมนี้เลย
                      </button>
                    </div>
                  )}

                  {post.xmasTreeShare && (
                    <div className="p-4 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#081C1B] via-[#0B2624] to-[#040D0E] flex flex-col gap-2.5 shadow-lg mt-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                          <i className="fas fa-tree text-emerald-400"></i>
                          <span>ต้นคริสต์มาสของ {post.xmasTreeShare.ownerName}</span>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#040D0E] border border-amber-500/40 text-amber-200">{post.xmasTreeShare.code}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        ปี {post.xmasTreeShare.year} • แขวนของประดับแล้ว <strong className="text-white font-mono">{post.xmasTreeShare.count || 0}</strong> ชิ้น • เปิดอ่านคำอวยพร 25 ธ.ค.
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenXmasTree?.(post.xmasTreeShare.code); }}
                        className="self-start mt-0.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow transition-transform hover:scale-105 flex items-center gap-1.5"
                      >
                        <i className="fas fa-gift"></i> เข้าไปแขวนคำอวยพรบนต้นไม้นี้
                      </button>
                    </div>
                  )}

                  {post.loySiemsiShare && (
                    <div className="p-4 rounded-2xl border border-amber-400/55 bg-gradient-to-br from-[#0A162C] via-[#13284C]/80 to-[#040914] flex flex-col gap-3 shadow-lg mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/25">
                        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                          <span>🎋 เซียมซีใบที่ {post.loySiemsiShare.num}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-[#040914] font-bold">{post.loySiemsiShare.tier}</span>
                        </div>
                        <span className="font-mono text-[10px] text-amber-200 bg-[#040914] px-2 py-0.5 rounded-full border border-amber-500/40">
                          เลขมงคล {post.loySiemsiShare.luckyNum}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {post.loySiemsiShare.krathong && (
                          <div className="shrink-0 bg-[#040914]/85 border border-amber-500/35 rounded-xl p-2 flex flex-col items-center">
                            <KrathongSVG design={post.loySiemsiShare.krathong} size={74} />
                            <span className="text-[9px] text-amber-200/85 mt-0.5">กระทงของ {post.loySiemsiShare.ownerName}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1 text-xs">
                          <div className="font-bold text-amber-200 text-sm">"{post.loySiemsiShare.title}"</div>
                          <p className="text-slate-200 leading-relaxed">{post.loySiemsiShare.main}</p>
                          <div className="text-[10px] text-slate-300 pt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>📚 {post.loySiemsiShare.work}</span>
                            <span>💖 {post.loySiemsiShare.love}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenLoyKrathong?.(); }}
                        className="self-start px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#040914] font-bold text-xs shadow transition-transform hover:scale-105 flex items-center gap-1.5"
                      >
                        <i className="fas fa-water"></i> ไปลอยกระทง &amp; เสี่ยงเซียมซี
                      </button>
                    </div>
                  )}

                  {post.poll && (
                    <div className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2 mt-2">
                      <div className="flex justify-between text-xs"><span className="font-bold">📊 {post.poll.question}</span><span className="text-slate-400 text-[10px]">{post.poll.isAnonymous ? '🕵️ ไม่ระบุชื่อ' : '👁️ แสดงชื่อ'}</span></div>
                      {(post.poll.options || []).map((opt) => {
                        const voted = currentUser && (opt.votes || []).includes(currentUser.id);
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            disabled={isClosed}
                            onClick={async () => {
                              if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อร่วมโหวตโพลล์');
                              const opts = post.poll.options.map((o) => ({
                                ...o,
                                votes: (o.votes || []).filter((u) => u !== currentUser.id).concat(o.id === opt.id ? [currentUser.id] : [])
                              }));
                              await db.collection('bma_posts').doc(post.id).update({ poll: { ...post.poll, options: opts } });
                            }}
                            className={voted ? 'w-full flex justify-between px-3.5 py-2 rounded-xl bg-white text-[#050811] font-bold text-[11px]' : 'w-full flex justify-between px-3.5 py-2 rounded-xl bg-[#0B1325] border border-[#1E3A5F] text-[11px] hover:bg-[#0F2547]'}
                          >
                            <span className="text-left line-clamp-1 pr-2">{voted ? '✓ ' + opt.text : opt.text}</span>
                            <span className="shrink-0">โหวต</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {post.attachments?.length > 0 && <div className="space-y-2 mt-2">{post.attachments.map((att) => <SmartMedia key={att.id} att={att} />)}</div>}
                </div>
              )}

              {isCompact && (post.content || post.attachments?.length > 0 || post.poll) && (
                <button type="button" onClick={() => setBoardView('standard')} className="text-[10px] text-sky-400 text-left hover:underline">
                  ดูเนื้อหาเพิ่มเติม ({post.attachments?.length ? post.attachments.length + ' ไฟล์, ' : ''}{post.poll ? '1 โพลล์' : 'อ่านต่อ...'})
                </button>
              )}

              <div className={`flex justify-between items-center pt-2.5 border-t text-[10px] mt-auto ${author.role === 'admin' ? 'border-amber-900/50' : author.role === 'mod' ? 'border-emerald-900/50' : 'border-[#1E3A5F]'}`}>
                <div className="flex items-center gap-3">
                  <LikeButton likes={post.likes} currentUser={currentUser} getAuthor={getAuthor} postId={post.id} db={db} />
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold" title="จำนวนสมาชิกที่เข้าชมโพสต์นี้">
                    <i className="fas fa-eye"></i> {post.readBy?.length || 0}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { const u = window.location.origin + window.location.pathname + '?post=' + post.id; navigator.clipboard.writeText(u); alert('คัดลอกลิงก์โพสต์นี้แล้ว!\n' + u); }} className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1 rounded-full bg-[#050811] border border-[#1E3A5F] hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-1.5">
                    <i className="fas fa-share-alt"></i> <span className="hidden sm:inline">แชร์</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกโพสต์เก็บไว้อ่านภายหลัง');
                      const b = post.bookmarks || [];
                      await db.collection('bma_posts').doc(post.id).update({ bookmarks: b.includes(currentUser.id) ? b.filter((i) => i !== currentUser.id) : [...b, currentUser.id] });
                    }}
                    className={isBm ? 'px-2.5 py-1 rounded-lg font-bold bg-white text-[#050811] flex items-center gap-1' : 'btn-d py-1 px-2.5 flex items-center gap-1'}
                  >
                    {isBm ? '★ บันทึกแล้ว' : '☆ บันทึก'}
                  </button>
                </div>
              </div>

              {!isCompact && (
                <div className={`pt-2 border-t space-y-2 ${author.role === 'admin' ? 'border-amber-900/50' : author.role === 'mod' ? 'border-emerald-900/50' : 'border-[#1E3A5F]/60'}`}>
                  {post.poll && (
                    <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/40 space-y-1.5 text-xs">
                      <div className="font-bold text-sky-300"><i className="fas fa-chart-pie mr-1"></i> ผลโพลล์ในคอมเมนต์ (รวม {totalVotes} โหวต)</div>
                      {(post.poll.options || []).map((o) => {
                        const c = o.votes?.length || 0;
                        const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0;
                        return (
                          <div key={o.id}>
                            <div className="flex justify-between"><span>{o.text}</span><span className="font-mono">{c} โหวต ({pct}%)</span></div>
                            {!post.poll.isAnonymous && c > 0 && <div className="text-[9px] text-slate-400">ผู้โหวต: {o.votes.map((u) => getAuthor(u).displayName).join(', ')}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const isShowing = showComments[post.id];
                        setShowComments((prev) => ({ ...prev, [post.id]: !isShowing }));
                        if (!isShowing && !visibleCommCount[post.id]) {
                          setVisibleCommCount((prev) => ({ ...prev, [post.id]: 8 }));
                        }
                      }}
                      className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border shadow-sm ${showComments[post.id] ? 'bg-sky-950/40 text-sky-300 border-sky-900/50 hover:bg-sky-900/60' : 'bg-[#050811] text-slate-300 border-[#1E3A5F] hover:bg-[#0F2547] hover:text-white'}`}
                    >
                      <i className={`fas ${showComments[post.id] ? 'fa-chevron-up' : 'fa-comment-alt'}`}></i>
                      {showComments[post.id] ? 'ซ่อนความคิดเห็น' : `แสดงความคิดเห็น (${allComm.length})`}
                    </button>
                  </div>

                  {showComments[post.id] && (
                    <div className="space-y-3 pt-3 animate-fade-in border-t border-sky-900/30 mt-3">
                      {rootComm.length === 0 ? (
                        <div className="text-center text-slate-500 text-[10px] py-4 bg-[#050811] rounded-xl border border-dashed border-[#1E3A5F]">ยังไม่มีความคิดเห็น มาร่วมเป็นคนแรกสิ!</div>
                      ) : (
                        <div className="space-y-2">
                          {rootComm.slice(0, visibleCommCount[post.id] || 8).map((c, idx) => {
                            const isBestAnswer = post.isQA && post.bestAnswerId === c.id;
                            return (
                              <div key={c.id} className="relative">
                                {isBestAnswer && <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-md border-2 border-[#0B1325]">👑 คำตอบที่ดีที่สุด (Best Answer)</div>}
                                <div className={isBestAnswer ? 'ring-2 ring-emerald-500 rounded-xl bg-emerald-950/20 pt-2' : ''}>
                                  <PantipThread
                                    c={c}
                                    all={allComm}
                                    lbl={'ความเห็นที่ ' + (idx + 1)}
                                    postId={post.id}
                                    me={currentUser}
                                    getAuthor={getAuthor}
                                    canManage={canManage}
                                    onDel={async (pid, cid) => {
                                      const p = posts.find((x) => x.id === pid);
                                      if (p) await db.collection('bma_posts').doc(pid).update({ comments: (p.comments || []).filter((x) => x.id !== cid) });
                                    }}
                                    onLike={toggleCommLike}
                                    onReact={toggleCommReact}
                                    onReply={(pid, comm, lbl) => setRepComm({ ...repComm, [pid]: { ...comm, labelNum: lbl } })}
                                    onCtx={setCommMenu}
                                    isQA={post.isQA}
                                    isOwner={currentUser && currentUser.id === post.authorId}
                                    onMarkBestAnswer={async (cid) => {
                                      await db.collection('bma_posts').doc(post.id).update({ bestAnswerId: post.bestAnswerId === cid ? null : cid });
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(visibleCommCount[post.id] || 8) < rootComm.length && (
                        <button
                          type="button"
                          onClick={() => setVisibleCommCount((prev) => ({ ...prev, [post.id]: (prev[post.id] || 8) + 8 }))}
                          className="w-full py-2 bg-transparent text-sky-400 text-[10px] font-bold hover:underline hover:text-sky-300 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <i className="fas fa-level-down-alt"></i> ดูความคิดเห็นเพิ่มเติม (เหลืออีก {rootComm.length - (visibleCommCount[post.id] || 8)} รายการ)
                        </button>
                      )}
                    </div>
                  )}

                  {currentUser && showComments[post.id] && (
                    <div className="space-y-1.5 pt-2 border-t border-[#1E3A5F]/50 mt-2">
                      {repComm[post.id] && (
                        <div className="flex justify-between px-3 py-1 rounded bg-sky-950/60 text-[11px] text-sky-200">
                          <span><i className="fas fa-reply mr-1"></i> ตอบกลับ {repComm[post.id].labelNum || getAuthor(repComm[post.id].authorId).displayName}</span>
                          <button type="button" onClick={() => setRepComm({ ...repComm, [post.id]: null })}><i className="fas fa-times"></i></button>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-end">
                          <textarea
                            rows={1}
                            value={cInputs[post.id] || ''}
                            onChange={(e) => setCInputs({ ...cInputs, [post.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id, null); } }}
                            placeholder="แสดงความคิดเห็น..."
                            className="flex-1 inp text-xs resize-none max-h-24 py-2"
                          />
                          <button type="button" onClick={() => handleAddComment(post.id, null)} className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-md shrink-0">
                            <i className="fas fa-paper-plane text-[10px] -ml-0.5"></i>
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 relative">
                          <input
                            type="file"
                            multiple
                            id={`file-upload-${post.id}`}
                            onChange={async (e) => {
                              const fl = Array.from(e.target.files || []);
                              e.target.value = '';
                              for (const f of fl) {
                                try { const a = await uploadChunked(f); handleAddComment(post.id, a); } catch (err) { alert(err.message); }
                              }
                            }}
                            className="hidden"
                          />
                          <button type="button" onClick={() => document.getElementById(`file-upload-${post.id}`)?.click()} className="btn-d py-1 text-[9px]"><i className="fas fa-image mr-1"></i>แนบไฟล์</button>
                          <button
                            type="button"
                            onClick={() => {
                              const u = promptSafeUrl('ใส่ลิงก์รูปภาพ หรือ วิดีโอ (https://...)');
                              if (u) handleAddComment(post.id, { id: 'att-' + Date.now(), name: 'Link', type: 'image', url: u, size: 'URL' });
                            }}
                            className="btn-d py-1 text-[9px]"
                          >
                            <i className="fas fa-link mr-1"></i>แนบลิงก์
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => { setCommGifPostId(commGifPostId === post.id ? null : post.id); setCommReactPostId(null); }}
                              className={`btn-d py-1 px-2 text-[9px] font-bold ${commGifPostId === post.id ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'text-purple-300'}`}
                            >
                              GIF
                            </button>
                            {commGifPostId === post.id && (
                              <GiphyPickerPopover
                                onClose={() => setCommGifPostId(null)}
                                onSelect={(gifUrl) => handleAddComment(post.id, { id: 'att-gif-' + Date.now(), name: 'GIF', type: 'image', url: gifUrl, size: 'GIF' })}
                              />
                            )}
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => { setCommReactPostId(commReactPostId === post.id ? null : post.id); setCommGifPostId(null); }}
                              className={`btn-d py-1 px-2 text-[9px] font-bold ${commReactPostId === post.id ? 'bg-amber-900/50 border-amber-400 text-amber-200' : 'text-amber-300'}`}
                            >
                              🙂 Emoji
                            </button>
                            {commReactPostId === post.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setCommReactPostId(null)}></div>
                                <div className="absolute bottom-full left-0 mb-2 bg-[#0B1325] border border-amber-500/40 rounded-xl p-1.5 flex flex-wrap gap-1 w-56 shadow-2xl z-50">
                                  {['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🙏', '😎', '💯', '✨'].map((em) => (
                                    <button
                                      key={em}
                                      type="button"
                                      onClick={() => {
                                        setCInputs((prev) => ({ ...prev, [post.id]: (prev[post.id] || '') + em }));
                                        setCommReactPostId(null);
                                      }}
                                      className="w-8 h-8 rounded-lg hover:bg-[#0F2547] hover:scale-125 transition-transform flex items-center justify-center text-base"
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {visiblePosts < filteredPosts.length && (
        <div className="text-center pt-4 pb-6 text-sky-400 text-xs font-bold animate-pulse">
          <i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดโพสต์เพิ่มเติม...
        </div>
      )}
    </div>
  );
}