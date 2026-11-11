// ==========================================
// ui_components.js - ชิ้นส่วน UI พื้นฐาน
// ==========================================

// 1. Icons & Graphics
const UpIcon = () => (
  <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4m0 0L8 8m4-4v12"/>
  </svg>
);

const Logo = ({ s = 38 }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none" className="shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]">
    <path d="M 52 10 L 14 86 L 86 86 Q 50 62 52 10 Z" fill="#0F2547" stroke="#FFFFFF" strokeWidth="5.5" strokeLinejoin="round"/>
  </svg>
);

// 2. Media Renderer (SmartMedia)
function SmartMedia({ att, onContextMenu }) {
  const [url, setUrl] = useState(att.url || '');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    let m = true;
    if (att.isChunked && !url && att.chunkIds?.length) {
      setLoading(true);
      Promise.all(att.chunkIds.map((id) => db.collection('bma_file_chunks').doc(id).get()))
        .then((docs) => {
          if (m) { 
            setUrl(docs.map((d) => d.data()).filter(Boolean).sort((a, b) => a.index - b.index).map((s) => s.data).join('')); 
            setLoading(false); 
          }
        }).catch(() => m && setLoading(false));
    } else if (att.url) {
      setUrl(att.url);
    }
    return () => { m = false; };
  }, [att, url]);

  if (loading) return <div className="p-2.5 card text-xs text-sky-300 animate-pulse">⏳ กำลังโหลดไฟล์ "{att.name}"...</div>;
  
  const dId = (url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/))?.[1];
  const yId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/)?.[1];
  
  if (dId) return (
    <div onContextMenu={onContextMenu} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black w-full max-w-md">
      <iframe src={'https://drive.google.com/file/d/' + dId + '/preview'} className="w-full h-60 border-0" allow="autoplay; fullscreen" allowFullScreen />
      <div className="px-3 py-1 bg-[#0B1325] flex justify-between text-[11px]">
        <span>▶️ Google Drive</span>
        <a href={url} target="_blank" rel="noreferrer" className="text-sky-400">เปิดแท็บใหม่ ↗</a>
      </div>
    </div>
  );
  if (yId) return (
    <div onContextMenu={onContextMenu} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black w-full max-w-md">
      <iframe src={'https://www.youtube.com/embed/' + yId} className="w-full h-60 border-0" allowFullScreen />
    </div>
  );
  if (att.type === 'video') return (
    <div onContextMenu={onContextMenu} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-black max-w-md">
      <video src={url} controls className="max-h-72 w-full" />
    </div>
  );
  if (att.type === 'audio') return (
    <div onContextMenu={onContextMenu} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-[#0B1325] w-full max-w-md p-3">
      <audio src={url} controls className="w-full outline-none" />
    </div>
  );
  if (att.type === 'image') return (
    <div onContextMenu={onContextMenu} onClick={() => openZoom(url)} className="rounded-xl overflow-hidden border border-[#1E3A5F] bg-[#0B1325] max-w-md cursor-zoom-in relative group">
      <img src={url} alt={att.name} className="max-h-80 w-auto mx-auto object-contain" />
      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] opacity-0 group-hover:opacity-100">🔍 ขยาย</span>
    </div>
  );
  
  return (
    <a href={url} download={att.name} target="_blank" rel="noreferrer" onContextMenu={onContextMenu} className="flex items-center justify-between p-3 card hover:bg-[#0F2547] text-xs max-w-md">
      <span className="truncate font-semibold">📎 {att.name} ({att.size || 'File'})</span>
      <span className="px-2 py-1 rounded bg-white text-[#050811] font-bold text-[10px] ml-2">ดาวน์โหลด</span>
    </a>
  );
}

// 3. User Avatar & Badges
const getStatusInfo = (u) => {
  if(!u) return { c: 'bg-slate-500', t: 'Offline' };
  const diff = Date.now() - (u.lastActive || 0);
  if(u.isOnline && diff < 300000) return { c: 'bg-emerald-400', t: 'Online' };
  if(u.isOnline && diff < 900000) return { c: 'bg-amber-400', t: 'AFK' };
  
  let offTxt = 'Offline';
  if(u.lastActive) {
    const min = Math.floor(diff / 60000);
    if(min < 60) offTxt = `Offline (${min} นาทีที่แล้ว)`;
    else if(min < 1440) offTxt = `Offline (${Math.floor(min/60)} ชั่วโมงที่แล้ว)`;
    else offTxt = `Offline (${Math.floor(min/1440)} วันที่แล้ว)`;
  }
  return { c: 'bg-slate-500', t: offTxt };
};

const Avatar = ({ user, size = 'md', showStatus = false }) => {
  const sc = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-xs', lg: 'w-14 h-14 text-sm', xl: 'w-20 h-20 text-lg' }[size] || 'w-10 h-10 text-xs';
  const stat = getStatusInfo(user);
  return (
    <div className="relative inline-flex shrink-0">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={sc + ' rounded-full object-cover border-2 border-white/40 bg-[#0F2547]'} />
      ) : (
        <div className={sc + ' rounded-full bg-[#0F2547] border-2 border-white/30 flex items-center justify-center font-mono font-bold'}>
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '#'}
        </div>
      )}
      {showStatus && user && <span title={stat.t} className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#050811] ${stat.c}`} />}
    </div>
  );
};

const RoleBadge = ({ role }) => (
  role === 'admin' ? <span className="px-1.5 py-0.5 rounded bg-amber-400 text-[#050811] text-[10px] font-bold uppercase">👑 Owner</span> : 
  role === 'mod' ? <span className="px-1.5 py-0.5 rounded bg-sky-400 text-[#050811] text-[10px] font-bold uppercase">🛡️ Vice</span> : null
);

const TagBadges = ({ user }) => (
  <div className="flex flex-wrap gap-1">
    {getTags(user).map((t, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-[#0F2547] border border-white/20 text-blue-100 text-[10px] font-semibold">{t}</span>)}
  </div>
);

// 4. Modal Container
const Modal = ({ title, onClose, maxW = 'max-w-md', children }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    {/* เพิ่ม border border-[#1E3A5F] และพื้นหลัง bg-[#0B1325] กลับเข้าไป */}
    <div className={`w-full ${maxW} card p-6 shadow-2xl my-8 animate-fade-in relative bg-[#0B1325] border border-[#1E3A5F]`}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E3A5F]">
        <h3 className="text-base font-bold">{title}</h3>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>}
      </div>
      {children}
    </div>
  </div>
);

// 5. Text Formatter (สำหรับแท็กเพื่อน และแปลง Link)
function FormattedText({ text, currentUser, isEdited }) {
  if (!text) return null;
  const myTags = currentUser ? getTags(currentUser) : [];
  return (
    <p className="text-sm text-slate-100 mt-1 whitespace-pre-line leading-relaxed break-words">
      {text.split(/(https?:\/\/[^\s]+|@\[[^\]]+\]|@[a-zA-Z0-9_&-]+)/g).map((p, i) => {
        if(p.startsWith('http')) return <a key={i} href={p} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline underline-offset-2 break-all">{p}</a>;
        if (p.startsWith('@')) {
            const lw = p.toLowerCase();
            const hi = currentUser && (lw === '@everyone' || (lw === '@here' && currentUser.isOnline) || myTags.some((t) => p === '@[' + t + ']' || lw === '@' + t.toLowerCase()) || lw === '@' + String(currentUser.id).toLowerCase() || (currentUser.username && lw === '@' + currentUser.username.toLowerCase()));
            return <span key={i} className={hi ? 'inline-block px-1.5 py-0.5 mx-0.5 rounded bg-amber-400 text-[#050811] font-mono text-xs font-bold' : 'inline-block px-1.5 py-0.5 mx-0.5 rounded bg-[#0F2547] border border-blue-400/50 text-blue-200 font-mono text-xs'}>{p}</span>;
        }
        return <span key={i}>{p}</span>;
      })}
      {isEdited && <span className="ml-2 text-[10px] italic text-slate-400">(แก้ไขแล้ว)</span>}
    </p>
  );
}

// 6. Interactive Like & Threads
function LikeButton({ likes, currentUser, onLike, getAuthor }) {
  const liked = currentUser && (likes || []).includes(currentUser.id);
  const [showNames, setShowNames] = useState(false);
  const pressTimer = useRef(null);
  
  const showL = (e) => { if(likes?.length) setShowNames({ x: e.clientX, y: e.clientY }); };
  const hideL = () => setShowNames(false);

  return (
    <div className="relative inline-block">
      <button 
        onClick={onLike}
        onMouseEnter={showL} onMouseLeave={hideL}
        onTouchStart={(e) => { 
          const touch = e.touches[0];
          pressTimer.current = setTimeout(() => { showL({clientX: touch.clientX, clientY: touch.clientY}); }, 400); 
        }}
        onTouchEnd={() => { clearTimeout(pressTimer.current); hideL(); }}
        className={liked ? 'px-2 py-0.5 rounded-full bg-white text-[#050811] text-[10px] font-bold' : 'px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[10px]'}
      >
        ♥ ถูกใจ {likes?.length ? '(' + likes.length + ')' : ''}
      </button>
      
      {showNames && (
        <div className="fixed z-50 bg-black/90 text-white text-[10px] px-2 py-1.5 rounded-lg border border-[#1E3A5F] pointer-events-none transform -translate-y-full -translate-x-1/2 mt-[-10px]" style={{ left: showNames.x, top: showNames.y, width: 'max-content', maxWidth: '200px' }}>
          👍 {likes.map(id => getAuthor(id).displayName).join(', ')}
        </div>
      )}
    </div>
  );
}

function PantipThread({ c, all, lbl, postId, me, getAuthor, canManage, onDel, onLike, onReply, onCtx }) {
  const ca = getAuthor(c.authorId), liked = me && (c.likes || []).includes(me.id);
  const subs = all.filter((x) => (x.parentId || x.replyTo?.id) === c.id);
  
  return (
    <div className="space-y-2">
      <div onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onCtx({ x: e.clientX, y: e.clientY, postId, comment: c, lbl }); }} className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-xs hover:border-white/30">
        <div className="flex justify-between mb-1 pb-1 border-b border-[#1E3A5F]/50 text-[10px]">
          <span className="font-mono font-bold text-sky-300">{lbl}</span>
          <div className="flex gap-2">
            <span className="text-slate-500">{c.createdAt}</span>
            {canManage(c.authorId) && <button onClick={() => onDel(postId, c.id)} className="text-slate-500 hover:text-red-400">ลบ</button>}
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
            <p className="text-slate-100 mt-1 whitespace-pre-line break-words">{c.text}</p>
            {c.attachments?.length > 0 && (
              <div className="mt-2 space-y-2">
                {c.attachments.map((att) => <SmartMedia key={att.id} att={att} onContextMenu={(e)=>{e.preventDefault();}} />)}
              </div>
            )}
            <div className="flex gap-2 mt-1.5 items-center">
              <LikeButton likes={c.likes} currentUser={me} getAuthor={getAuthor} onLike={() => onLike(postId, c.id)} />
              {me && <button onClick={() => onReply(postId, c, lbl)} className="px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[10px] text-sky-300 font-semibold">↩️ ตอบกลับ</button>}
            </div>
          </div>
        </div>
      </div>
      {subs.length > 0 && (
        <div className="pl-3.5 md:pl-5 ml-2 border-l-2 border-sky-500/40 space-y-2">
          {subs.map((s, i) => <PantipThread key={s.id} c={s} all={all} lbl={lbl + '-' + (i + 1)} postId={postId} me={me} getAuthor={getAuthor} canManage={canManage} onDel={onDel} onLike={onLike} onReply={onReply} onCtx={onCtx} />)}
        </div>
      )}
    </div>
  );
}