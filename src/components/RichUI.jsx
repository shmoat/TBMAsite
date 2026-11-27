import React, { useState, useEffect, useRef } from 'react';
import { db as defaultDb } from '../lib/firebase';
import { safeUrl } from '../lib/security';
import { getTags } from '../lib/utils';
import { useUI } from '../contexts/UIContext';
import { Avatar, RoleBadge, TagBadges } from './BasicUI';
import { longPressProps } from './ContextMenu';

export function SmartMedia({ att, onContextMenu }) {
  const { openZoom, openAppMenu } = useUI();
  const initialUrl = safeUrl(att?.url);
  const [url, setUrl] = useState(initialUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (att?.isChunked && !initialUrl && att.chunkIds?.length) {
      setLoading(true);
      Promise.all(att.chunkIds.map((id) => defaultDb.collection('bma_file_chunks').doc(id).get()))
        .then((docs) => {
          if (!active) return;
          const merged = docs
            .map((d) => d.data())
            .filter(Boolean)
            .sort((a, b) => a.index - b.index)
            .map((s) => s.data)
            .join('');
          setUrl(safeUrl(merged));
          setLoading(false);
        })
        .catch(() => active && setLoading(false));
    } else {
      setUrl(initialUrl);
    }
    return () => { active = false; };
  }, [att, initialUrl]);

  if (!att) return null;
  if (loading) return <div className="p-2.5 card text-xs text-sky-300 animate-pulse">⏳ กำลังโหลดไฟล์ "{att.name}"...</div>;
  if (!url) return null;

  const handleMediaCtx = (e) => {
    if (onContextMenu) return onContextMenu(e);
    const items = [];
    if (att.type === 'image') {
      items.push({ icon: 'fas fa-search-plus', label: 'ขยายภาพเต็มจอ', accent: true, onClick: () => openZoom(url) });
    }
    items.push({
      icon: 'fas fa-download',
      label: 'ดาวน์โหลด / เปิดไฟล์',
      onClick: () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = att.name || 'file';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    });
    if (!url.startsWith('data:')) {
      items.push({ icon: 'fas fa-link', label: 'คัดลอกลิงก์ไฟล์', onClick: () => navigator.clipboard.writeText(url) });
    }
    openAppMenu(e, {
      header: { icon: att.type === 'image' ? 'fas fa-image' : 'fas fa-paperclip', title: att.name || 'ไฟล์แนบ', sub: att.size || att.type },
      items
    });
  };

  const dId = (url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/))?.[1];
  const yId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/)?.[1];

  if (dId) {
    return (
      <div onContextMenu={handleMediaCtx} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black w-full max-w-md">
        <iframe src={'https://drive.google.com/file/d/' + dId + '/preview'} className="w-full h-60 border-0" allow="autoplay; fullscreen" allowFullScreen />
        <div className="px-3 py-1 bg-[#0B1325] flex justify-between text-[11px]">
          <span>▶️ Google Drive</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-400">เปิดแท็บใหม่ ↗</a>
        </div>
      </div>
    );
  }
  if (yId) {
    return (
      <div onContextMenu={handleMediaCtx} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black w-full max-w-md">
        <iframe src={'https://www.youtube.com/embed/' + yId} className="w-full h-60 border-0" allowFullScreen />
      </div>
    );
  }
  if (att.type === 'video') {
    return (
      <div onContextMenu={handleMediaCtx} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black max-w-md">
        <video src={url} controls className="max-h-72 w-full" />
      </div>
    );
  }
  if (att.type === 'audio') {
    return (
      <div onContextMenu={handleMediaCtx} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-[#0B1325] w-full max-w-md p-3">
        <audio src={url} controls className="w-full outline-none" />
      </div>
    );
  }
  if (att.type === 'image') {
    return (
      <div onContextMenu={handleMediaCtx} onClick={() => openZoom(url)} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-[#0B1325] max-w-md cursor-zoom-in relative group">
        <img src={url} alt={att.name} className="max-h-80 w-auto mx-auto object-contain" />
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] opacity-0 group-hover:opacity-100">🔍 ขยาย</span>
      </div>
    );
  }

  return (
    <a href={url} download={att.name} target="_blank" rel="noopener noreferrer" onContextMenu={handleMediaCtx} className="flex items-center justify-between p-3 card hover:bg-[#0F2547] text-xs max-w-md">
      <span className="truncate font-semibold">📎 {att.name} ({att.size || 'File'})</span>
      <span className="px-2 py-1 rounded bg-white text-[#050811] font-bold text-[10px] ml-2">ดาวน์โหลด</span>
    </a>
  );
}

export function FormattedText({ text, currentUser, isEdited }) {
  if (!text) return null;
  const myTags = currentUser ? getTags(currentUser) : [];

  return (
    <div className="text-sm text-slate-100 mt-1 leading-relaxed break-words space-y-1">
      {text.split('\n').map((line, i) => {
        let isQuote = false;
        let isBullet = false;
        let content = line;

        if (content.startsWith('> ')) { isQuote = true; content = content.substring(2); }
        else if (content.startsWith('- ')) { isBullet = true; content = content.substring(2); }

        const parts = content.split(/(https?:\/\/[^\s]+|@\[[^\]]+\]|@[a-zA-Z0-9_&-]+|\*\*.*?\*\*)/g);

        const lineContent = parts.map((p, j) => {
          if (!p) return null;
          if (p.startsWith('http')) {
            const clean = safeUrl(p);
            if (!clean) return <span key={j}>{p}</span>;
            return <a key={j} href={clean} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline break-all">{p}</a>;
          }
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} className="text-white font-bold">{p.slice(2, -2)}</strong>;
          if (p.startsWith('@')) {
            const lw = p.toLowerCase();
            const hi = currentUser && (
              lw === '@everyone' ||
              (lw === '@here' && currentUser.isOnline) ||
              myTags.some((t) => p === '@[' + t + ']' || lw === '@' + t.toLowerCase()) ||
              lw === '@' + String(currentUser.id).toLowerCase() ||
              (currentUser.username && lw === '@' + currentUser.username.toLowerCase())
            );
            return (
              <span
                key={j}
                className={hi
                  ? 'inline-block px-1.5 py-0.5 mx-0.5 rounded bg-amber-400 text-[#050811] font-mono text-xs font-bold shadow-sm'
                  : 'inline-block px-1.5 py-0.5 mx-0.5 rounded bg-[#0F2547] border border-blue-400/50 text-blue-200 font-mono text-xs'}
              >
                {p}
              </span>
            );
          }
          return <span key={j}>{p}</span>;
        });

        if (isQuote) return <blockquote key={i} className="border-l-4 border-sky-500 pl-3 py-1.5 my-1.5 bg-sky-900/20 text-sky-100 italic rounded-r-lg">{lineContent}</blockquote>;
        if (isBullet) return <li key={i} className="ml-5 list-disc marker:text-sky-400">{lineContent}</li>;
        return <div key={i}>{lineContent}</div>;
      })}
      {isEdited && <div className="text-[10px] italic text-slate-400 mt-2 opacity-70">(แก้ไขแล้ว)</div>}
    </div>
  );
}

export function LikeButton({ likes, currentUser, onLike, getAuthor, postId, db = defaultDb }) {
  const { openGuestPrompt } = useUI();
  const parsedLikes = (likes || []).map((l) => (typeof l === 'string' ? { userId: l, type: 'like' } : l));
  const myReact = currentUser ? parsedLikes.find((l) => l.userId === currentUser.id) : null;

  const [showNames, setShowNames] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const hideTimer = useRef(null);

  const EMOJIS = {
    like: { icon: '👍', label: 'ถูกใจ', color: 'text-sky-400' },
    love: { icon: '❤️', label: 'รักเลย', color: 'text-red-500' },
    haha: { icon: '😂', label: 'ฮ่าๆ', color: 'text-amber-400' },
    wow: { icon: '😮', label: 'ว้าว', color: 'text-amber-400' },
    sad: { icon: '😢', label: 'เศร้า', color: 'text-amber-400' },
    angry: { icon: '😡', label: 'โกรธ', color: 'text-orange-500' }
  };

  const handleReaction = async (type) => {
    if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อกดแสดงความรู้สึกให้โพสต์และคอมเมนต์');
    if (!postId || !db) {
      if (onLike) onLike();
      return;
    }

    let newLikes = [...parsedLikes];
    if (myReact && myReact.type === type) {
      newLikes = newLikes.filter((l) => l.userId !== currentUser.id);
    } else if (myReact) {
      newLikes = newLikes.map((l) => (l.userId === currentUser.id ? { ...l, type } : l));
    } else {
      newLikes.push({ userId: currentUser.id, type });
    }

    await db.collection('bma_posts').doc(postId).update({ likes: newLikes });
    setShowPicker(false);
  };

  const summary = {};
  parsedLikes.forEach((l) => { summary[l.type] = (summary[l.type] || 0) + 1; });
  const topReacts = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 3).map((r) => r[0]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => { clearTimeout(hideTimer.current); if (postId) setShowPicker(true); }}
      onMouseLeave={() => { hideTimer.current = setTimeout(() => setShowPicker(false), 300); }}
    >
      {showPicker && currentUser && postId && (
        <div className="absolute bottom-full left-0 mb-2 bg-[#0B1325] border border-[#1E3A5F] rounded-full px-2 py-1.5 flex gap-1 shadow-2xl animate-fade-in z-40">
          {Object.entries(EMOJIS).map(([type, data]) => (
            <button
              key={type}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleReaction(type); }}
              className={`w-8 h-8 rounded-full text-lg hover:scale-125 transition-transform origin-bottom flex items-center justify-center ${myReact?.type === type ? 'bg-white/20' : 'hover:bg-white/10'}`}
              title={data.label}
            >
              {data.icon}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleReaction(myReact ? myReact.type : 'like'); }}
        onMouseEnter={(e) => { if (parsedLikes.length) setShowNames({ x: e.clientX, y: e.clientY }); }}
        onMouseLeave={() => setShowNames(false)}
        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1.5 ${myReact ? 'bg-white/10 border-white/20' : 'bg-[#0B1325] border-[#1E3A5F] hover:bg-[#0F2547]'}`}
      >
        {myReact ? (
          <span className={EMOJIS[myReact.type]?.color || 'text-sky-400'}>
            {EMOJIS[myReact.type]?.icon} {EMOJIS[myReact.type]?.label}
          </span>
        ) : (
          <span className="text-slate-400">👍 ถูกใจ</span>
        )}
        {parsedLikes.length > 0 && (
          <span className="flex items-center gap-0.5 ml-1 border-l border-white/20 pl-1.5">
            {topReacts.map((t) => EMOJIS[t]?.icon || '👍').join('')}
            <span className="text-slate-300 font-mono ml-0.5">{parsedLikes.length}</span>
          </span>
        )}
      </button>

      {showNames && parsedLikes.length > 0 && (
        <div
          className="fixed z-50 bg-black/90 text-white text-[10px] px-3 py-2 rounded-lg border border-[#1E3A5F] pointer-events-none transform -translate-y-full -translate-x-1/2 mt-[-10px]"
          style={{ left: showNames.x, top: showNames.y, width: 'max-content', maxWidth: '200px' }}
        >
          <div className="space-y-1">
            {parsedLikes.map((l) => (
              <div key={l.userId} className="flex items-center gap-1.5">
                <span>{EMOJIS[l.type]?.icon || '👍'}</span>
                <span className="truncate">{getAuthor(l.userId).displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GiphyPickerPopover({ onSelect, onClose, align = 'left' }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const url = q.trim()
          ? `/api/giphy?type=search&q=${encodeURIComponent(q.trim())}&limit=12&rating=pg-13`
          : `/api/giphy?type=trending&limit=12&rating=pg-13`;
        const res = await fetch(url);
        const data = res.ok ? await res.json() : null;
        if (active) setItems((data?.data || []).map((g) => g.images?.fixed_height_small?.url).filter(Boolean));
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const t = setTimeout(run, q.trim() ? 450 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [q]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-full ${align === 'right' ? 'right-0' : 'left-0'} mb-2 w-64 sm:w-72 bg-[#0B1325] border border-purple-500/45 p-2.5 z-50 shadow-[0_0_28px_rgba(0,0,0,0.85)] rounded-xl animate-fade-in`}
      >
        <div className="relative mb-2">
          <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[11px]"></i>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา GIF..."
            className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg py-1.5 pl-7 pr-2 text-xs text-white outline-none focus:border-purple-500"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5 h-44 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="col-span-2 flex flex-col items-center justify-center text-[10px] text-purple-400 font-bold py-10">
              <i className="fas fa-circle-notch fa-spin text-xl mb-1.5"></i>
              กำลังโหลด GIF...
            </div>
          ) : items.length > 0 ? (
            items.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { onSelect(url); onClose(); }}
                className="h-20 rounded-lg bg-cover bg-center hover:ring-2 ring-purple-400 transition-all"
                style={{ backgroundImage: `url('${url}')` }}
              />
            ))
          ) : (
            <div className="col-span-2 text-center text-slate-500 text-[10px] py-10">ไม่พบ GIF ที่ค้นหา</div>
          )}
        </div>
        <div className="text-[8px] text-slate-500 text-right mt-1 font-bold tracking-widest">POWERED BY GIPHY</div>
      </div>
    </>
  );
}

export function PantipThread({ c, all, lbl, postId, me, getAuthor, canManage, onDel, onLike, onReact, onReply, onCtx, isQA, isOwner, onMarkBestAnswer }) {
  const { openAppMenu } = useUI();
  const ca = getAuthor(c.authorId);
  const subs = all.filter((x) => (x.parentId || x.replyTo?.id) === c.id);
  const [showReactBar, setShowReactBar] = useState(false);
  const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  const handleOpenCommMenu = (e) => {
    const selectedText = window.getSelection ? window.getSelection().toString().trim() : '';
    const isLiked = me && (c.likes || []).includes(me.id);
    const items = [];

    if (selectedText) {
      items.push({ icon: 'fas fa-highlighter', label: 'คัดลอกข้อความที่ไฮไลต์', accent: true, onClick: () => navigator.clipboard.writeText(selectedText) });
    }
    if (me) {
      items.push({ icon: 'fas fa-reply', label: 'ตอบกลับความเห็นนี้', accent: !selectedText, onClick: () => onReply(postId, c, lbl) });
      items.push({ icon: isLiked ? 'fas fa-heart-broken' : 'fas fa-heart', label: isLiked ? 'เลิกถูกใจ' : 'ถูกใจความเห็นนี้', onClick: () => onLike(postId, c.id) });
    }
    if (c.text) {
      items.push({ icon: 'fas fa-copy', label: 'คัดลอกข้อความ', onClick: () => navigator.clipboard.writeText(c.text) });
    }
    if (isQA && isOwner && onMarkBestAnswer) {
      items.push({ type: 'divider' });
      items.push({ icon: 'fas fa-crown', label: 'เลือก / ยกเลิก Best Answer', accent: true, onClick: () => onMarkBestAnswer(c.id) });
    }
    if (canManage(c.authorId)) {
      items.push({ type: 'divider' });
      items.push({
        icon: 'fas fa-trash-alt',
        label: 'ลบความคิดเห็นนี้',
        danger: true,
        onClick: () => { if (window.confirm('ยืนยันการลบความคิดเห็นนี้?')) onDel(postId, c.id); }
      });
    }

    openAppMenu(e, {
      header: { icon: 'fas fa-comment-alt', title: `${lbl} • ${ca.displayName}`, sub: c.createdAt },
      quickReactions: me && onReact ? QUICK_EMOJIS.map((em) => ({
        emoji: em,
        active: (c.reactions?.[em] || []).includes(me.id),
        onClick: () => onReact(postId, c.id, em)
      })) : [],
      items
    });
  };

  return (
    <div className="space-y-2">
      <div
        onContextMenu={handleOpenCommMenu}
        {...longPressProps(handleOpenCommMenu)}
        className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-xs hover:border-white/30"
      >
        <div className="flex justify-between mb-1 pb-1 border-b border-[#1E3A5F]/50 text-[10px]">
          <span className="font-mono font-bold text-sky-300">{lbl}</span>
          <div className="flex gap-2">
            {isQA && isOwner && onMarkBestAnswer && (
              <button type="button" onClick={() => onMarkBestAnswer(c.id)} className="text-emerald-400 font-bold hover:bg-emerald-900/50 px-2 rounded transition-colors">
                👑 เลือกเป็น Best Answer
              </button>
            )}
            <span className="text-slate-500">{c.createdAt}</span>
            {canManage(c.authorId) && <button type="button" onClick={() => onDel(postId, c.id)} className="text-slate-500 hover:text-red-400">ลบ</button>}
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Avatar user={ca} size="xs" showStatus={true} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold">{ca.displayName}</span>
              <span className="font-mono text-[10px] text-slate-400">({ca.id})</span>
              <TagBadges user={ca} />
              <RoleBadge role={ca.role} />
            </div>
            {c.text && <p className="text-slate-100 mt-1 whitespace-pre-line break-words">{c.text}</p>}
            {c.attachments?.length > 0 && (
              <div className="mt-2 space-y-2">
                {c.attachments.map((att) => <SmartMedia key={att.id} att={att} />)}
              </div>
            )}

            {c.reactions && Object.keys(c.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(c.reactions).map(([em, uids]) => {
                  if (!Array.isArray(uids) || uids.length === 0) return null;
                  const active = me && uids.includes(me.id);
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => me && onReact && onReact(postId, c.id, em)}
                      title={uids.map((id) => getAuthor(id).displayName).join(', ')}
                      className={`px-2 py-0.5 rounded-full text-[10px] border flex items-center gap-1 transition-all ${active ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold' : 'bg-[#0B1325] border-[#1E3A5F] text-slate-300 hover:border-slate-400'}`}
                    >
                      <span>{em}</span>
                      <span className="font-mono">{uids.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-1.5 items-center relative">
              <LikeButton likes={c.likes} currentUser={me} getAuthor={getAuthor} onLike={() => onLike(postId, c.id)} />
              {me && onReact && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReactBar((v) => !v)}
                    className="px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[10px] text-amber-300 hover:bg-[#0F2547] font-semibold"
                    title="เพิ่ม Quick Reaction"
                  >
                    🙂+
                  </button>
                  {showReactBar && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowReactBar(false)}></div>
                      <div className="absolute bottom-full left-0 mb-1.5 bg-[#0B1325] border border-[#1E3A5F] rounded-full px-1.5 py-1 flex gap-1 shadow-2xl z-40">
                        {QUICK_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => { onReact(postId, c.id, em); setShowReactBar(false); }}
                            className="w-7 h-7 rounded-full hover:bg-[#0F2547] hover:scale-125 transition-transform flex items-center justify-center text-sm"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {me && <button type="button" onClick={() => onReply(postId, c, lbl)} className="px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[10px] text-sky-300 font-semibold">↩️ ตอบกลับ</button>}
            </div>
          </div>
        </div>
      </div>
      {subs.length > 0 && (
        <div className="pl-3.5 md:pl-5 ml-2 border-l-2 border-sky-500/40 space-y-2">
          {subs.map((s, i) => (
            <PantipThread
              key={s.id}
              c={s}
              all={all}
              lbl={lbl + '-' + (i + 1)}
              postId={postId}
              me={me}
              getAuthor={getAuthor}
              canManage={canManage}
              onDel={onDel}
              onLike={onLike}
              onReact={onReact}
              onReply={onReply}
              onCtx={onCtx}
            />
          ))}
        </div>
      )}
    </div>
  );
}