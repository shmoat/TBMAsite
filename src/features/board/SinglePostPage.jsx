import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { promptSafeUrl } from '../../lib/security';
import { fmtTime, uploadChunked } from '../../lib/utils';
import { GAMES } from '../../lib/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Logo, Avatar, RoleBadge, TagBadges } from '../../components/BasicUI';
import { SmartMedia, FormattedText, LikeButton, GiphyPickerPopover, PantipThread } from '../../components/RichUI';
import { formatMuteUntil } from '../../components/MuteDurationModal';
import { KrathongSVG } from '../../components/KrathongSVG';

export default function SinglePostPage({
  sharedPostId, posts, postMenu, setPostMenu,
  handleEditPostReq, setCurrentView, setSearchQ, setActiveGameTab,
  toggleCommLike, toggleCommReact, repComm, setRepComm, setCommMenu,
  cInputs, setCInputs, handleAddComment,
  onOpenXmasTree, onOpenLoyKrathong,
  isTargetMuted, getMuteExp, onOpenMuteModal
}) {
  const { currentUser, getAuthor } = useAuth();
  const { openMemberProfile, openGuestPrompt } = useUI();

  const [commGifPostId, setCommGifPostId] = useState(null);
  const [commReactPostId, setCommReactPostId] = useState(null);

  const matched = posts.filter((p) => p.id === sharedPostId);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 min-h-0 flex flex-col h-full overflow-y-auto">
      <div className="mb-6 flex justify-between items-center bg-[#070C18] p-3 rounded-2xl border border-[#1E3A5F]">
        <div className="flex items-center gap-3">
          <Logo s={30} />
          <div className="font-bold text-lg text-amber-300">โพสต์ที่แชร์</div>
        </div>
        <button
          type="button"
          onClick={() => { window.history.replaceState({}, document.title, window.location.pathname); setCurrentView('home'); }}
          className="btn-w text-xs shadow-lg hover:scale-105 transition-transform"
        >
          กลับสู่หน้าหลัก / เข้าสู่ระบบ
        </button>
      </div>

      <div className="space-y-4 pb-10">
        {matched.map((post) => {
          if (!post.isGuestAllowed && !currentUser) {
            return (
              <div key={post.id} className="card p-8 text-center text-red-400 font-bold">
                🔒 โพสต์นี้อนุญาตให้อ่านได้เฉพาะสมาชิกที่เข้าสู่ระบบแล้วเท่านั้น
              </div>
            );
          }

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

          return (
            <article id={'post-' + post.id} key={post.id} className="card p-5 space-y-3.5 shadow-2xl border border-sky-900/50">
              {post.isPinned && <div className="text-amber-300 text-xs font-bold -mt-1 mb-1 border-b border-amber-900/30 pb-2">📌 โพสต์ปักหมุด</div>}
              <div className="flex justify-between items-start gap-2">
                <div onClick={() => openMemberProfile(author)} className="flex items-center gap-2.5 cursor-pointer">
                  <Avatar user={author} size="md" showStatus={true} />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm hover:underline">{author.displayName}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${String(author.id).startsWith('F') ? 'bg-[#38BDF8] text-[#050811]' : 'bg-white text-[#050811]'}`}>{author.id}</span>
                      <TagBadges user={author} />
                      <RoleBadge role={author.role} />
                    </div>
                    <div className="text-[11px] text-slate-400">@{author.username} • {post.createdAt}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 relative">
                  {!canManage(post.authorId) && <span className="px-2 py-0.5 rounded-full bg-[#050811] text-[10px] text-slate-400">{post.isGuestAllowed ? '🌐 Guest' : '🔒 สมาชิก'}</span>}
                  {currentUser && currentUser.id === post.authorId && (() => {
                    const mKey = 'post:' + post.id;
                    const muted = isTargetMuted?.(mKey);
                    const exp = getMuteExp?.(mKey);
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMuteModal?.({ key: mKey, label: 'โพสต์: ' + (post.title || post.content?.slice(0, 32) || 'โพสต์ของคุณ') });
                        }}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] transition-colors ${muted ? 'bg-red-950/70 border-red-500/60 text-red-400 hover:bg-red-900' : 'bg-[#050811] border-[#1E3A5F] text-slate-400 hover:text-amber-300 hover:border-amber-400/60'}`}
                        title={muted ? `ปิดแจ้งเตือนอยู่ (${formatMuteUntil(exp)})` : 'ปิดการแจ้งเตือนโพสต์นี้'}
                      >
                        <i className={`fas ${muted ? 'fa-bell-slash' : 'fa-bell'}`}></i>
                      </button>
                    );
                  })()}
                  {canManage(post.authorId) && (
                    <button type="button" onClick={() => setPostMenu(postMenu === post.id ? null : post.id)} className="text-slate-400 hover:text-white px-2 font-bold">⋮</button>
                  )}
                  {postMenu === post.id && (
                    <div className="absolute top-6 right-0 w-48 card border border-white/20 shadow-2xl py-1 z-30 flex flex-col text-left text-xs">
                      <button type="button" onClick={() => { setPostMenu(null); db.collection('bma_posts').doc(post.id).update({ isGuestAllowed: !post.isGuestAllowed }); }} className="w-full px-4 py-2 text-left hover:bg-[#0F2547]">
                        {post.isGuestAllowed ? '🔒 เปลี่ยนเป็นเฉพาะสมาชิก' : '🌐 ให้ Guest อ่านได้'}
                      </button>
                      <button type="button" onClick={() => { setPostMenu(null); handleEditPostReq(post); }} className="w-full px-4 py-2 text-left hover:bg-[#0F2547] text-amber-300"><i className="fas fa-pen mr-1"></i> แก้ไขโพสต์</button>
                      <button type="button" onClick={() => { setPostMenu(null); if (window.confirm('ต้องการลบโพสต์นี้ใช่หรือไม่?')) { db.collection('bma_posts').doc(post.id).delete(); window.history.replaceState({}, document.title, window.location.pathname); setCurrentView('home'); } }} className="w-full px-4 py-2 text-left hover:bg-red-950 text-red-400"><i className="fas fa-trash-alt mr-1"></i> ลบโพสต์</button>
                    </div>
                  )}
                </div>
              </div>

              {post.isQA && <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ml-1"><i className="fas fa-question-circle mr-1"></i> Q&amp;A</span>}
              {post.title && <h3 className="text-base font-bold">{post.title}</h3>}
              {post.content && <FormattedText text={post.content} currentUser={currentUser} />}

              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {post.tags.map((t) => (
                    <button type="button" key={t} onClick={() => { setSearchQ(t); setCurrentView('feed'); }} className="px-2 py-0.5 bg-sky-900/30 text-sky-300 hover:bg-sky-700/50 rounded text-[10px] border border-sky-800 transition-colors shadow-sm">
                      #{t}
                    </button>
                  ))}
                </div>
              )}

              {post.dailyGameShare && (
                <div className="p-3.5 card border-amber-400/50 flex flex-col gap-2 shadow-lg bg-[#0F2547]/50">
                  <div className="text-amber-300 font-bold">🎯 {GAMES[post.dailyGameShare.gameIndex]?.name || 'Daily Game'}</div>
                  <div className="text-sm">ผู้โพสต์ทำสถิติได้: <span className="font-mono text-white font-bold bg-black/40 px-2 py-0.5 rounded">{post.dailyGameShare.score ? `สถิติ ${post.dailyGameShare.score} / ${fmtTime(post.dailyGameShare.timeMs)}` : fmtTime(post.dailyGameShare.timeMs)}</span></div>
                  <button type="button" onClick={() => { window.history.replaceState({}, document.title, window.location.pathname); setActiveGameTab(post.dailyGameShare.gameIndex); setCurrentView('daily_game'); }} className="btn-w text-xs self-start mt-1">🎮 ตามไปเล่นเกมนี้เลย</button>
                </div>
              )}

              {post.xmasTreeShare && (
                <div className="p-4 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#081C1B] via-[#0B2624] to-[#040D0E] flex flex-col gap-2.5 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm"><i className="fas fa-tree text-emerald-400"></i><span>ต้นคริสต์มาสของ {post.xmasTreeShare.ownerName}</span></div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#040D0E] border border-amber-500/40 text-amber-200">{post.xmasTreeShare.code}</span>
                  </div>
                  <div className="text-xs text-slate-300">ปี {post.xmasTreeShare.year} • แขวนของประดับแล้ว <strong className="text-white font-mono">{post.xmasTreeShare.count || 0}</strong> ชิ้น</div>
                  <button type="button" onClick={() => { window.history.replaceState({}, document.title, window.location.pathname); onOpenXmasTree?.(post.xmasTreeShare.code); }} className="self-start mt-0.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow flex items-center gap-1.5">
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
                    <span className="font-mono text-[10px] text-amber-200 bg-[#040914] px-2 py-0.5 rounded-full border border-amber-500/40">เลขมงคล {post.loySiemsiShare.luckyNum}</span>
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
                  <button type="button" onClick={() => onOpenLoyKrathong?.()} className="self-start px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#040914] font-bold text-xs shadow flex items-center gap-1.5">
                    <i className="fas fa-water"></i> ไปลอยกระทง &amp; เสี่ยงเซียมซี
                  </button>
                </div>
              )}

              {post.poll && (
                <div className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2">
                  <div className="flex justify-between text-xs"><span className="font-bold">📊 {post.poll.question}</span><span className="text-slate-400">{post.poll.isAnonymous ? '🕵️ ไม่ระบุชื่อ' : '👁️ แสดงชื่อในคอมเมนต์'}</span></div>
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
                        className={voted ? 'w-full flex justify-between px-3.5 py-2 rounded-xl bg-white text-[#050811] font-bold text-xs' : 'w-full flex justify-between px-3.5 py-2 rounded-xl bg-[#0B1325] border border-[#1E3A5F] text-xs'}
                      >
                        <span>{voted ? '✓ ' + opt.text : opt.text}</span><span>โหวต</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {post.attachments?.length > 0 && <div className="space-y-2">{post.attachments.map((att) => <SmartMedia key={att.id} att={att} />)}</div>}

              <div className="flex justify-between pt-2.5 border-t border-[#1E3A5F] text-xs">
                <LikeButton likes={post.likes} currentUser={currentUser} getAuthor={getAuthor} postId={post.id} db={db} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { const u = window.location.origin + window.location.pathname + '?post=' + post.id; navigator.clipboard.writeText(u); alert('คัดลอกลิงก์โพสต์นี้แล้ว!\n' + u); }} className="px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[10px]">🔗 คัดลอกลิงก์แชร์</button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกโพสต์เก็บไว้อ่านภายหลัง');
                      const b = post.bookmarks || [];
                      await db.collection('bma_posts').doc(post.id).update({ bookmarks: b.includes(currentUser.id) ? b.filter((i) => i !== currentUser.id) : [...b, currentUser.id] });
                    }}
                    className={isBm ? 'px-3 py-1 rounded-lg font-bold bg-white text-[#050811]' : 'btn-d py-1'}
                  >
                    {isBm ? '★ บันทึกแล้ว' : '☆ บันทึก'}
                  </button>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#1E3A5F]/60 space-y-2">
                {post.poll && (
                  <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/40 space-y-1.5 text-xs">
                    <div className="font-bold text-sky-300">📊 ผลโพลล์ในคอมเมนต์ (รวม {totalVotes} โหวต)</div>
                    {(post.poll.options || []).map((o) => {
                      const c = o.votes?.length || 0;
                      const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0;
                      return (
                        <div key={o.id}>
                          <div className="flex justify-between"><span>{o.text}</span><span className="font-mono">{c} โหวต ({pct}%)</span></div>
                          {!post.poll.isAnonymous && c > 0 && <div className="text-[10px] text-slate-400">ผู้โหวต: {o.votes.map((u) => getAuthor(u).displayName).join(', ')}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  {rootComm.map((c, idx) => (
                    <PantipThread
                      key={c.id}
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
                    />
                  ))}
                </div>

                {currentUser && (
                  <div className="space-y-1.5 pt-1">
                    {repComm[post.id] && (
                      <div className="flex justify-between px-3 py-1 rounded bg-sky-950/60 text-[11px] text-sky-200">
                        <span><i className="fas fa-reply mr-1"></i> ตอบกลับ {repComm[post.id].labelNum || getAuthor(repComm[post.id].authorId).displayName}</span>
                        <button type="button" onClick={() => setRepComm({ ...repComm, [post.id]: null })}>✕</button>
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
                          className="flex-1 inp text-xs resize-none max-h-24"
                        />
                        <button type="button" onClick={() => handleAddComment(post.id, null)} className="btn-b text-xs">ส่ง</button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 relative">
                        <input
                          type="file"
                          multiple
                          id={`single-file-upload-${post.id}`}
                          onChange={async (e) => {
                            const fl = Array.from(e.target.files || []);
                            e.target.value = '';
                            for (const f of fl) {
                              try { const a = await uploadChunked(f); handleAddComment(post.id, a); } catch (err) { alert(err.message); }
                            }
                          }}
                          className="hidden"
                        />
                        <button type="button" onClick={() => document.getElementById(`single-file-upload-${post.id}`)?.click()} className="btn-d py-1 text-[10px]"><i className="fas fa-image mr-1"></i>แนบไฟล์</button>
                        <button
                          type="button"
                          onClick={() => {
                            const u = promptSafeUrl('ใส่ลิงก์รูปภาพ หรือ วิดีโอ (https://...)');
                            if (u) handleAddComment(post.id, { id: 'att-' + Date.now(), name: 'Link', type: 'image', url: u, size: 'URL' });
                          }}
                          className="btn-d py-1 text-[10px]"
                        >
                          <i className="fas fa-link mr-1"></i>แนบลิงก์
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setCommGifPostId(commGifPostId === post.id ? null : post.id); setCommReactPostId(null); }}
                            className={`btn-d py-1 px-2 text-[10px] font-bold ${commGifPostId === post.id ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'text-purple-300'}`}
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
                            className={`btn-d py-1 px-2 text-[10px] font-bold ${commReactPostId === post.id ? 'bg-amber-900/50 border-amber-400 text-amber-200' : 'text-amber-300'}`}
                          >
                            🙂 Reaction
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
            </article>
          );
        })}

        {matched.length === 0 && (
          <div className="card p-10 text-center space-y-4">
            <div className="text-4xl">❌</div>
            <div className="font-bold text-lg text-slate-300">ไม่พบโพสต์ที่อ้างอิง หรือโพสต์นี้ถูกลบไปแล้ว</div>
          </div>
        )}
      </div>
    </div>
  );
}