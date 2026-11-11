// ==========================================
// app.js - ฟังก์ชันหลักและการจัดการโครงสร้างเว็บ
// ==========================================

function App() {
  // 1. Core States
  const [users, setUsers] = useState([OWNER_SEED]);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);
  const [posts, setPosts] = useState([]);
  const [channels, setChannels] = useState(DEF_CH);
  const [groups, setGroups] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingStatuses, setTypingStatuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [zoomImg, setZoomImg] = useState(null);
  openZoom = setZoomImg;

  // 2. Music Player (Disc Jam) States
  const [djState, setDjState] = useState({ queue: [], deckA: null, deckB: null, playA: {}, playB: {}, crossfade: 0, djMode: 'auto', fadeDuration: 5, fadeCommand: null, jammerId: null, forceClosed: false, quickPlaylists: [] });
  const [localCrossfade, setLocalCrossfade] = useState(0);
  const [isDjMuted, _setIsDjMuted] = useState(true); 
  const [djVolume, setDjVolume] = useState(50);
  const [isLocalPaused, setIsLocalPaused] = useState(true);
  const [isPlayerFloatingOpen, setIsPlayerFloatingOpen] = useState(true);
  const [flyingNotes, setFlyingNotes] = useState([]);
  const [localVolume, setLocalVolume] = useState(50);
  const [trackTime, setTrackTime] = useState({ curA: 0, durA: 0, curB: 0, durB: 0 });
  const [djChatIn, setDjChatIn] = useState('');
  
  const ytA = useRef(null);
  const ytB = useRef(null);
  const loadedIdA = useRef(null);
  const loadedIdB = useRef(null);
  const isSeekingRef = useRef(false);
  const isFadingRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const djStateRef = useRef(djState);
  const isDjMutedRef = useRef(isDjMuted);
  const djVolumeRef = useRef(djVolume);
  const isLocalPausedRef = useRef(isLocalPaused);
  const djChatRef = useRef(null);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { djStateRef.current = djState; }, [djState]);
  useEffect(() => { isDjMutedRef.current = isDjMuted; }, [isDjMuted]);
  useEffect(() => { djVolumeRef.current = djVolume; }, [djVolume]);
  useEffect(() => { isLocalPausedRef.current = isLocalPaused; }, [isLocalPaused]);

  // 3. UI Navigation & Modes
  const urlParams = new URLSearchParams(window.location.search);
  const sharedPostId = urlParams.get('post');
  const [currentView, setCurrentView] = useState(() => {
      if (sharedPostId) return 'single_post';
      return sessionStorage.getItem('tbma_last_view') || localStorage.getItem('tbma_last_view') || 'home';
  });
  
  const [activeRoom, setActiveRoom] = useState(() => { 
      try { return JSON.parse(sessionStorage.getItem('tbma_last_room') || localStorage.getItem('tbma_last_room')) || { type: 'channel', id: 'global-lobby' }; } 
      catch { return { type: 'channel', id: 'global-lobby' }; } 
  });

  useEffect(() => { sessionStorage.setItem('tbma_last_view', currentView); localStorage.setItem('tbma_last_view', currentView); }, [currentView]);
  useEffect(() => { const s = JSON.stringify(activeRoom); sessionStorage.setItem('tbma_last_room', s); localStorage.setItem('tbma_last_room', s); }, [activeRoom]);

  const [tagFilter, setTagFilter] = useState('ALL');
  const [dirTag, setDirTag] = useState('ALL');
  const [searchQ, setSearchQ] = useState('');
  const [hiPostId, setHiPostId] = useState(null);
  const [memberModal, setMemberModal] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterLatestOnly, setFilterLatestOnly] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [rightFilterMenuOpen, setRightFilterMenuOpen] = useState(false);
  const [rightOnlineOnly, setRightOnlineOnly] = useState(false);
  const [visiblePosts, setVisiblePosts] = useState(10); 
  useEffect(() => { setVisiblePosts(10); }, [tagFilter, searchQ, currentView, filterType, filterLatestOnly]);

  const [authMode, setAuthMode] = useState('signin');
  const [lUser, setLUser] = useState(''); const [lPass, setLPass] = useState('');
  const [showPass, setShowPass] = useState(false); const [remMe, setRemMe] = useState(true); const [authErr, setAuthErr] = useState('');
  const [actId, setActId] = useState(''); const [actU, setActU] = useState(''); const [actP, setActP] = useState(''); const [actN, setActN] = useState('');

  const [editProf, setEditProf] = useState(false);
  const [eName, setEName] = useState(''); const [eBio, setEBio] = useState(''); const [eAv, setEAv] = useState(''); const [eBd, setEBd] = useState('');
  const [eUser, setEUser] = useState(''); const [ePass, setEPass] = useState(''); const [profErr, setProfErr] = useState('');
  const [eSocs, setESocs] = useState([]); const [sPlat, setSPlat] = useState('Instagram'); const [sLbl, setSLbl] = useState(''); const [sUrl, setSUrl] = useState('');
  const avRef = useRef(null);

  const [createPost, setCreatePost] = useState(false);
  const [pTitle, setPTitle] = useState(''); const [pCont, setPCont] = useState(''); const [pGuest, setPGuest] = useState(false); const [pPinned, setPPinned] = useState(false);
  const [pAtts, setPAtts] = useState([]); const [aUrl, setAUrl] = useState(''); const [aType, setAType] = useState('image');
  const pFileRef = useRef(null);
  const [pTags, setPTags] = useState([]); const [tagInput, setTagInput] = useState('');
  const allPostTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));
  const [cInputs, setCInputs] = useState({}); const [repComm, setRepComm] = useState({}); const [commMenu, setCommMenu] = useState(null);
  const [hasPoll, setHasPoll] = useState(false); const [pollQ, setPollQ] = useState(''); const [pollOpts, setPollOpts] = useState(['', '']); const [pollClose, setPollClose] = useState(''); const [pollAnon, setPollAnon] = useState(false);

  const [newMId, setNewMId] = useState('M001'); const [newMTags, setNewMTags] = useState(['LCs & Pal']); const [cTag, setCTag] = useState(''); const [copiedId, setCopiedId] = useState(null);
  const [actSuccessMsg, setActSuccessMsg] = useState('');
  const [editTagU, setEditTagU] = useState(null); const [editTagL, setEditTagL] = useState([]);

  const [openDms, setOpenDms] = useState([]); const [leftOpen, setLeftOpen] = useState(true); const [rightOpen, setRightOpen] = useState(true); const [rightTag, setRightTag] = useState('ALL'); const [dmSortType, setDmSortType] = useState('latest');
  const [chatIn, setChatIn] = useState(''); const [chatAtts, setChatAtts] = useState([]); const [cUrlOpen, setCUrlOpen] = useState(false); const [cAttUrl, setCAttUrl] = useState(''); const [cAttType, setCAttType] = useState('image');
  const [uploading, setUploading] = useState(false); const cFileRef = useRef(null); const typTimer = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [ctxMenu, setCtxMenu] = useState(null); const [editMsg, setEditMsg] = useState(null); const [repMsg, setRepMsg] = useState(null); const [fwdMsg, setFwdMsg] = useState(null);
  const [mentOpen, setMentOpen] = useState(false); const [mentF, setMentF] = useState(''); const [emoOpen, setEmoOpen] = useState(false);
  const [activeChatGameId, setActiveChatGameId] = useState(null); const [cGameOpen, setCGameOpen] = useState(false);
  const [cChOpen, setCChOpen] = useState(false); const [chName, setChName] = useState(''); const [chIcon, setChIcon] = useState('💬'); const [chDesc, setChDesc] = useState('');
  const [cGrpOpen, setCGrpOpen] = useState(false); const [grpName, setGrpName] = useState(''); const [grpMems, setGrpMems] = useState([]); const [addMemOpen, setAddMemOpen] = useState(false);
  const [delTgt, setDelTgt] = useState(null);

  const [notifOpen, setNotifOpen] = useState(false); const [notifTab, setNotifTab] = useState('posts'); const [toasts, setToasts] = useState([]);
  const [postMenu, setPostMenu] = useState(null);
  const [editPostData, setEditPostData] = useState(null);
  const [pushPerm, setPushPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const prevNLen = useRef(0); const chatBoxRef = useRef(null);

  const [activeTool, setActiveTool] = useState(null);
  const [toolSearchQ, setToolSearchQ] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [bmaEvents, setBmaEvents] = useState([]);

  // 4. Effects: Firebase Subscriptions
  useEffect(() => {
    const seedInitialData = async () => {
      const m000 = await db.collection('bma_users').doc(OWNER_SEED.id).get();
      if (!m000.exists) db.collection('bma_users').doc(OWNER_SEED.id).set(OWNER_SEED);

      const dj = await db.collection('bma_system').doc('discjam').get();
      if (!dj.exists) db.collection('bma_system').doc('discjam').set({ queue: [], isPlaying: false, loopMode: 'none', speed: 1, jammerId: null });

      for (const c of DEF_CH) {
        const cDoc = await db.collection('bma_channels').doc(c.id).get();
        if (!cDoc.exists) db.collection('bma_channels').doc(c.id).set(c);
      }
    };
    seedInitialData();

    const unsubUsers = db.collection('bma_users').onSnapshot((s) => {
      const l = s.docs.map((d) => d.data()).filter((u) => u.id !== 'BMA-000' && u.password !== 'bma-root-password' && u.password !== 'moon-8842');
      l.sort((a, b) => String(a.id).localeCompare(String(b.id))); 
      setUsers(l.length > 0 ? l : [OWNER_SEED]);
      const max = l.reduce((m, u) => { const r = String(u.id).match(/^M(\d+)$/i); return r ? Math.max(m, parseInt(r[1], 10)) : m; }, 0);
      const maxF = l.reduce((m, u) => { const r = String(u.id).match(/^F(\d+)$/i); return r ? Math.max(m, parseInt(r[1], 10)) : m; }, 0);
      setNewMId('M' + String(max + 1).padStart(3, '0'));
      setIsUsersLoaded(true);
    });
    
    const unsubPosts = db.collection('bma_posts').orderBy('timestamp', 'desc').limit(150).onSnapshot((s) => setPosts(s.docs.map((d) => d.data())));
    
    const unsubChannels = db.collection('bma_channels').onSnapshot((s) => {
      const l = s.docs.map((d) => d.data());
      setChannels(l.length > 0 ? l.sort((a, b) => getMs(a) - getMs(b)) : DEF_CH);
    });
    
    const unsubGroups = db.collection('bma_groups').onSnapshot((s) => setGroups(s.docs.map((d) => d.data()).sort((a, b) => getMs(b) - getMs(a))));
    const unsubMessages = db.collection('bma_messages').orderBy('timestamp', 'desc').limit(400).onSnapshot((s) => setChatMessages(s.docs.map((d) => d.data()).reverse()));
    const unsubTyping = db.collection('bma_typing').onSnapshot((s) => setTypingStatuses(s.docs.map((d) => d.data()).filter((t) => t.isTyping)), () => {});
    const unsubNotifs = db.collection('bma_notifications').orderBy('timestamp', 'desc').limit(100).onSnapshot((s) => setNotifications(s.docs.map((d) => d.data())), () => {});
    
    const unsubDj = db.collection('bma_system').doc('discjam').onSnapshot((s) => { if (s.exists) setDjState(s.data()); });
    const unsubEvents = db.collection('bma_events').onSnapshot((s) => setBmaEvents(s.docs.map(d => d.data())), () => {});
    
    return () => { unsubUsers(); unsubPosts(); unsubChannels(); unsubGroups(); unsubMessages(); unsubTyping(); unsubNotifs(); unsubDj(); unsubEvents(); };
  }, []);

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
      
  useEffect(() => {
    if (!isUsersLoaded || autoLoginAttempted) return; 

    const id = localStorage.getItem('tbma_saved_user_id') || sessionStorage.getItem('tbma_session_user_id');
    if (id) {
       const foundUser = users.find((u) => u.id === id && u.isActivated);
       if (foundUser) {
           setCurrentUser({...foundUser, isOnline: true, lastActive: Date.now()});
           db.collection('bma_users').doc(foundUser.id).update({ isOnline: true, lastActive: Date.now() }).catch(() => {});
           
           if (currentView === 'login' || currentView === 'home') {
               setCurrentView('feed');
           }
       }
    }
    
    setAutoLoginAttempted(true);
    setIsAuthLoading(false);
  }, [users, isUsersLoaded, autoLoginAttempted, currentView]); 

  useEffect(() => {
      if (currentUser && isUsersLoaded) {
          const me = users.find((u) => u.id === currentUser.id);
          if (me && JSON.stringify(me) !== JSON.stringify(currentUser)) {
              setCurrentUser(me);
          }
      }
  }, [users, isUsersLoaded, currentUser]);

  useEffect(() => {
     const timer = setTimeout(() => setIsAuthLoading(false), 3000);
     return () => clearTimeout(timer);
  }, []);

  const pingRef = useRef(0);
  const updateActivity = useCallback(() => {
     if(!currentUser) return;
     const now = Date.now();
     if(now - pingRef.current > 60000) {
        pingRef.current = now;
        db.collection('bma_users').doc(currentUser.id).update({ lastActive: now, isOnline: true }).catch(()=>{});
     }
  }, [currentUser]);

  useEffect(() => {
     window.addEventListener('pointerdown', updateActivity); window.addEventListener('keydown', updateActivity);
     return () => { window.removeEventListener('pointerdown', updateActivity); window.removeEventListener('keydown', updateActivity); };
  }, [updateActivity]);

  useEffect(() => { const fn = () => { setCtxMenu(null); setCommMenu(null); }; window.addEventListener('click', fn); return () => window.removeEventListener('click', fn); }, []);

  // 5. User & Active Data Helpers
  const getAuthor = (id) => users.find((u) => u.id === id) || { id, displayName: 'Member (' + id + ')', memberTags: ['Others'], username: 'member', role: 'member', socialLinks: [] };
  const activeMembers = users.filter((u) => u.isActivated);
  const allTags = Array.from(new Set([...PRESET_TAGS, ...users.flatMap((u) => getTags(u))]));
  const activeCh = activeRoom.type === 'channel' ? channels.find((c) => c.id === activeRoom.id) : null;
  const activeGrp = activeRoom.type === 'group' ? groups.find((g) => g.id === activeRoom.id) : null;
  const activeDmUser = activeRoom.type === 'dm' ? getAuthor(activeRoom.id) : null;
  const isModOrAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'mod');
  const saveSess = (u) => { if (remMe) { localStorage.setItem('tbma_saved_user_id', u.id); sessionStorage.removeItem('tbma_session_user_id'); } else { sessionStorage.setItem('tbma_session_user_id', u.id); localStorage.removeItem('tbma_saved_user_id'); } };

  // Orbit Rings
  const orbitRings = () => {
    const r1 = [], r2 = [], r3 = [], r4 = [], list = activeMembers.length ? activeMembers : users;
    list.forEach((u, i) => {
       if (i % 4 === 0) r1.push(u);
       else if (i % 4 === 1) r2.push(u);
       else if (i % 4 === 2) r3.push(u);
       else r4.push(u);
    });
    return [
       { r: 125, items: r1, rc: 'or1', cc: 'cr1' }, 
       { r: 190, items: r2, rc: 'or2', cc: 'cr2' }, 
       { r: 260, items: r3, rc: 'or3', cc: 'cr3' },
       { r: 335, items: r4, rc: 'or2', cc: 'cr2' }
    ];
  };

  const changeViewWithTransition = (view) => {
    setCurrentView(view);
  };

  const jumpToPost = (postId) => { setTagFilter('ALL'); setSearchQ(''); setCurrentView('feed'); setHiPostId(postId); setTimeout(() => document.getElementById('post-' + postId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180); setTimeout(() => setHiPostId(null), 4000); };
  const dmKey = (a, b) => 'dm_' + [a, b].sort().join('_');
  const roomKey = currentUser && activeRoom.type === 'dm' ? dmKey(currentUser.id, activeRoom.id) : activeRoom.id;
  const roomMsgs = chatMessages.filter((m) => m.roomKey === roomKey);
  const pinnedMsg = activeRoom.type === 'dm' ? roomMsgs.find(m => m.isPinned) : null;
  const roomTypers = typingStatuses.filter((t) => t.roomKey === roomKey && t.userId !== currentUser?.id);
  const myGroups = currentUser ? groups.filter((g) => (g.members || []).includes(currentUser.id)) : [];
  
  const conversedDms = currentUser ? activeMembers.filter((m) => m.id !== currentUser.id && (chatMessages.some((msg) => msg.roomKey === dmKey(currentUser.id, m.id)) || openDms.includes(m.id) || (activeRoom.type === 'dm' && activeRoom.id === m.id))) : [];
  if(dmSortType === 'alpha') {
     conversedDms.sort((a,b) => a.displayName.localeCompare(b.displayName, 'th'));
  } else {
     conversedDms.sort((a,b) => {
         const aMsgs = chatMessages.filter(msg => msg.roomKey === dmKey(currentUser.id, a.id));
         const bMsgs = chatMessages.filter(msg => msg.roomKey === dmKey(currentUser.id, b.id));
         const aLast = aMsgs.length > 0 ? getMs(aMsgs[aMsgs.length-1]) : 0;
         const bLast = bMsgs.length > 0 ? getMs(bMsgs[bMsgs.length-1]) : 0;
         return bLast - aLast;
     });
  }

  // Notif Filters
  const myNotifs = currentUser ? notifications.filter((n) => {
    if (n.recipientId !== currentUser.id && !(n.recipientId === 'ALL' && n.actorId !== currentUser.id)) return false;
    const p = currentUser.notifPrefs || {};
    if (n.category === 'posts') {
      if (p.muteOwnPosts && n.subType !== 'new_post') return false;
      const post = n.targetPostId && posts.find((x) => x.id === n.targetPostId);
      if (post && (post.mutedBy || []).includes(currentUser.id)) return false;
    }
    if (n.category === 'messages') {
      if (n.subType === 'global_chat' && p.muteGlobalChat) return false;
      if (n.subType !== 'global_chat' && p.mutePrivateChat) return false;
    }
    return true;
  }) : [];
  const unreadNotifs = myNotifs.filter((n) => !(n.readBy || []).includes(currentUser?.id));

  // Halloween Theme & Effects
  const checkIsHalloween = () => {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bkkDate = new Date(utcMs + (7 * 3600000));
    const month = bkkDate.getMonth() + 1;
    const date = bkkDate.getDate();
    return (month === 10 && date >= 19 && date <= 31);
  };
  const IS_HALLOWEEN = checkIsHalloween();
  useEffect(() => {
      if (IS_HALLOWEEN) {
          document.body.classList.add('halloween-theme');
      } else {
          document.body.classList.remove('halloween-theme');
      }
  }, [IS_HALLOWEEN]);
  const [ghosts, setGhosts] = useState([]);
  const [scareTriggered, setScareTriggered] = useState(false);
  const [cursedUserId, setCursedUserId] = useState(null);

  // Loy Krathong Theme & Effects
  const checkIsLoyKrathong = () => {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bkkDate = new Date(utcMs + (7 * 3600000));
    const year = bkkDate.getFullYear();
    const mmdd = `${String(bkkDate.getMonth() + 1).padStart(2, '0')}-${String(bkkDate.getDate()).padStart(2, '0')}`;
    const OFFICIAL_LOY_KRATHONG = {
        2026: '11-24', 2027: '11-13', 2028: '11-01', 2029: '11-20', 2030: '11-09',
        2031: '10-28', 2032: '11-17', 2033: '11-06', 2034: '11-25', 2035: '11-15',
        2036: '11-03', 2037: '11-22', 2038: '11-11', 2039: '10-31', 2040: '11-18'
    };
    if (OFFICIAL_LOY_KRATHONG[year]) return mmdd === OFFICIAL_LOY_KRATHONG[year];
    const m = bkkDate.getMonth() + 1;
    if (m !== 10 && m !== 11) return false;
    const synodicMonth = 29.530588853;
    const refFullMoon = Date.UTC(2026, 10, 24, 14, 53, 0); 
    const diffDays = (bkkDate.getTime() - refFullMoon) / 86400000;
    const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
    return (phase < 0.5 || phase > synodicMonth - 0.5) && (m === 11 || bkkDate.getDate() >= 25);
  };
  const IS_LOY_KRATHONG = checkIsLoyKrathong();
  useEffect(() => {
      if (IS_LOY_KRATHONG) document.body.classList.add('loykrathong-theme');
      else document.body.classList.remove('loykrathong-theme');
  }, [IS_LOY_KRATHONG]);
  const [showWelcome, setShowWelcome] = useState(() => {
    return IS_LOY_KRATHONG && !sessionStorage.getItem('bma_loykrathong_seen');
  });

  const isLateNight = () => {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bkkDate = new Date(utcMs + (7 * 3600000));
    const h = bkkDate.getHours();
    return h >= 22 || h < 6; 
  };
  const [lateNight, setLateNight] = useState(isLateNight());
  useEffect(() => {
    const interval = setInterval(() => setLateNight(isLateNight()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  const radioClosed = lateNight && djState.forceClosed === true;
  const isInputBlocked = radioClosed && !djState.jammerId; 
  const isFullyClosed = isInputBlocked && (!djState.queue || djState.queue.length === 0);

  // Auth Functions
  const handleSignIn = async (e) => {
    e.preventDefault(); setAuthErr('');
    if (!isUsersLoaded) return setAuthErr('กำลังเชื่อมต่อฐานข้อมูล กรุณารอสักครู่...');
    const f = users.find((u) => u.isActivated && u.username?.toLowerCase() === lUser.trim().toLowerCase() && u.password === lPass);
    if (!f) return setAuthErr('Username หรือ Password ไม่ถูกต้อง');
    setCurrentUser({ ...f, isOnline: true, lastActive: Date.now() }); 
    saveSess(f);
    await db.collection('bma_users').doc(f.id).update({ isOnline: true, lastActive: Date.now() }).catch(() => {});
    setLUser(''); setLPass(''); 
    setCurrentView('feed');
  };

  const handleActivate = async (e) => {
    e.preventDefault(); setAuthErr('');
    const id = actId.trim().toUpperCase(), uName = actU.trim(), pass = actP.trim(), dName = actN.trim() || ('Member #' + id);
    const t = users.find((u) => String(u.id).toUpperCase() === id);
    if (!t) return setAuthErr('ไม่พบรหัส "' + id + '" ในระบบ');
    if (t.isActivated) return setAuthErr('รหัสนี้ถูกเปิดใช้งานไปแล้ว');
    if (users.some((u) => u.id !== t.id && u.username?.toLowerCase() === uName.toLowerCase())) return setAuthErr('Username นี้มีผู้ใช้แล้ว');
    const up = { ...t, username: uName, password: pass, displayName: dName, isActivated: true, isOnline: true, lastActive: Date.now(), socialLinks: [], usernameChangeHistory: [], notifPrefs: { muteOwnPosts: false, muteGlobalChat: false, mutePrivateChat: false }, joinedAt: new Date().toISOString().split('T')[0] };
    await db.collection('bma_users').doc(t.id).set(up);
    setCurrentUser(up); saveSess(up); setActId(''); setActU(''); setActP(''); setActN(''); setCurrentView('feed');
  };

  // 6. Layout Rendering
  return (
      <div className="bg-[#050811] text-white flex flex-col h-screen overflow-hidden">
          
          {isAuthLoading && <div className="fixed inset-0 z-[200] bg-[#050811] flex items-center justify-center text-sky-400 font-bold animate-pulse">กำลังเชื่อมต่อ...</div>}
          {zoomImg && <div onClick={() => setZoomImg(null)} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"><img src={zoomImg} alt="" className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl" /><button className="fixed top-5 right-5 w-10 h-10 rounded-full card font-bold">✕</button></div>}

          <div className="fixed top-16 right-4 z-40 space-y-2 w-80 pointer-events-none">
            {toasts.map((t) => <div key={t.id} onClick={() => { setNotifOpen(false); if (t.targetPostId) jumpToPost(t.targetPostId); else if (t.targetRoomType) { setActiveRoom({ type: t.targetRoomType, id: t.targetRoomId }); setCurrentView('chat'); } setToasts((p) => p.filter((x) => x.id !== t.id)); }} className="pointer-events-auto cursor-pointer bg-[#0F2547] border-2 border-white/80 rounded-2xl p-3 shadow-2xl text-xs"><div className="flex justify-between font-bold text-amber-300"><span>{t.title}</span><span>{getTimeStr(t)}</span></div><p className="line-clamp-2 mt-0.5">{t.body}</p></div>)}
          </div>

          {/* Header / Navbar */}
          <header className="sticky top-0 z-40 bg-[#070C18]/95 backdrop-blur-md border-b border-[#1E3A5F] shrink-0">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                  <button onClick={() => changeViewWithTransition('home')} className="flex items-center gap-2.5 text-left shrink-0">
                      <Logo s={36} />
                      <div className="hidden sm:block">
                          <h1 className="text-sm md:text-base font-bold uppercase">The Blue Moon Association</h1>
                          <p className="text-[10px] text-slate-400 uppercase">Private Orbit & Community</p>
                      </div>
                  </button>
                
                  <nav className="relative flex items-center gap-1 bg-[#050811] border border-[#1E3A5F] rounded-full p-1 shrink-0 overflow-hidden">
                      <div className="absolute inset-y-1 bg-white rounded-full transition-all duration-300 ease-out pointer-events-none" 
                           style={{
                              left: document.getElementById('nav-' + currentView)?.offsetLeft || 4,
                              width: document.getElementById('nav-' + currentView)?.offsetWidth || 0
                           }}>
                      </div>

                      {[['home', '🪐 Home'], ['feed', '📝 Board'], ['chat', '💬 Chat'], ['members', '👥 Members'], ['daily_game', '🎮 Daily Game'], ['discjam', '💿 Disc Jam'], ['tools', '🛠️ Tools']].map(([v, l]) => 
                          <button id={'nav-' + v} key={v} onClick={() => (v === 'chat' || v === 'daily_game') && !currentUser ? setCurrentView('login') : setCurrentView(v)} className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${currentView === v ? 'text-[#050811]' : 'text-slate-300 hover:text-white'}`}>{l}</button>
                      )}
                      {currentUser?.role === 'admin' && <button id="nav-admin" onClick={() => setCurrentView('admin')} className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${currentView === 'admin' ? 'text-[#050811]' : 'text-slate-300 hover:text-white'}`}>👑 Owner</button>}
                  </nav>

                  <div className="flex items-center gap-2 shrink-0">
                      {currentUser && <button onClick={() => setNotifOpen(true)} className="btn-d text-xs font-semibold flex items-center gap-1"><span>🔔</span>{unreadNotifs.length > 0 && <span className="px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{unreadNotifs.length}</span>}</button>}
                      {currentUser ? (
                          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full card border-2 border-sky-400 bg-[#0F2547] shadow-[0_0_10px_rgba(56,189,248,0.5)] shrink-0">
                              <Avatar user={currentUser} size="xs" showStatus={true} />
                              <span className="text-xs font-semibold hidden sm:inline whitespace-nowrap">{currentUser.displayName}</span>
                          </button>
                      ) : (
                          <button onClick={() => { setAuthMode('signin'); setAuthErr(''); changeViewWithTransition('login'); }} className="btn-w text-xs">เข้าสู่ระบบ</button>
                      )}
                  </div>
              </div>
          </header>

          {/* Main Content Area Routing */}
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto no-scrollbar relative">
              {currentView === 'home' && (
                  <div className="animate-view relative flex-1 flex flex-col items-center py-8 px-4">
                      <div className="text-center space-y-1 z-10 shrink-0">
                          <h2 className="text-2xl md:text-3xl font-bold uppercase">The Blue Moon Association</h2>
                          <p className="text-xs text-slate-300">คลิกดาวบริวารเพื่อดูโปรไฟล์และส่งข้อความ หรือเข้าสู่กระดานโพสต์</p>
                      </div>
                      
                      {/* Orbit System */}
                      <div className="relative w-full max-w-[760px] h-[700px] flex items-center justify-center orbit-sys select-none shrink-0 my-4">
                        <div onClick={() => setCurrentView('feed')} className="relative z-20 w-32 h-32 rounded-full cursor-pointer flex flex-col items-center justify-center text-center p-4 hover:scale-105 transition" style={{ background: 'radial-gradient(circle at 30% 30%, #60A5FA, #1D4ED8 45%, #0F2547 80%, #050811 100%)', boxShadow: '0 0 60px rgba(37,99,235,0.65)' }}><Logo s={32} /><span className="text-[11px] font-bold uppercase mt-1">Blue Moon</span><span className="text-[10px] text-blue-200">{activeMembers.length} Satellites</span></div>
                        {orbitRings().map((ring, ri) => (
                          <div key={ri} className={'absolute top-1/2 left-1/2 rounded-full border border-[#1E3A5F]/70 pointer-events-none ' + ring.rc} style={{ width: ring.r * 2 + 'px', height: ring.r * 2 + 'px' }}>
                            {ring.items.map((m, mi) => {
                              const rad = ((360 / Math.max(1, ring.items.length)) * mi * Math.PI) / 180;
                              return <div key={m.id} style={{ left: ring.r + ring.r * Math.cos(rad) + 'px', top: ring.r + ring.r * Math.sin(rad) + 'px' }} className={'absolute pointer-events-auto ' + ring.cc}><button onClick={() => {
                                  if (IS_HALLOWEEN && m.id === cursedUserId) {
                                      setScareTriggered(true); setTimeout(() => setScareTriggered(false), 1200); 
                                      const mems = activeMembers.filter(x => x.id !== m.id); setCursedUserId(mems.length > 0 ? mems[Math.floor(Math.random() * mems.length)].id : null); 
                                  } else setMemberModal(m);
                              }} className="flex flex-col items-center"><Avatar user={m} size="md" showStatus={true} /><div className="mt-1 px-2 py-0.5 rounded-full bg-[#050811]/90 border border-[#1E3A5F] text-[10px] whitespace-nowrap">{m.displayName}</div></button></div>;
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 w-full max-w-md justify-center z-10 mt-8 shrink-0">
                          <button onClick={() => setCurrentView('feed')} className="flex-1 py-3 btn-b text-xs shadow-lg hover:scale-105">📖 กระดานโพสต์</button>
                          <button onClick={() => currentUser ? setCurrentView('chat') : setCurrentView('login')} className="flex-1 py-3 btn-w text-xs shadow-lg hover:scale-105">{currentUser ? '💬 ระบบแชต' : '🔑 เข้าสู่ระบบ'}</button>
                      </div>
                      
                      {/* ข้อตกลงสมาคม */}
                      <div className="z-10 mt-16 mb-8 w-full max-w-3xl bg-[#0B1325]/80 backdrop-blur-sm border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-xs text-slate-300 leading-relaxed shadow-2xl shrink-0 text-left">
                        <h3 className="font-bold text-sky-400 text-sm mb-4">📜 ข้อตกลง (อัพเดตล่าสุด 10 ตุลาคม 2026)</h3>
                        <ul className="space-y-3 list-none pl-0">
                          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">1.</span> <span>สมาคมนี้จัดตั้งขึ้นเพื่อสร้างคอนเนกชั่นระหว่างคนในจักรวาลของทอมสำหรับประโยชน์อันใดของสมาชิกในอนาคต</span></li>
                          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">2.</span> <span>สมาคมนี้ไม่แสวงหาผลกำไรใด ๆ</span></li>
                          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">3.</span> <span>สมาชิกทุกคนจะถูกเชิญโดยเจ้าของเท่านั้น</span></li>
                          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">4.</span> <span>สมาชิกทุกคนสามารถมีผู้ติดตามมาในนี้ได้ครั้งละ 1 คน หากต้องการเปลี่ยนคนหรือต้องการผู้ติดตามมากกว่า 1 คน โปรดแจ้งเจ้าของก่อน</span></li>
                          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">5.</span> <span>สมาคมนี้จะใช้ Website ของสมาคมเป็นช่องทางหลักในการติดต่อสื่อสาร และมี {currentUser ? <a href="https://discord.com/invite/HCqFYXCYBt" target="_blank" rel="noreferrer" className="text-[#5865F2] font-bold hover:underline bg-[#5865F2]/10 px-1 rounded transition-colors" title="คลิกเพื่อเข้าสู่ Discord Server">Discord</a> : <span className="text-slate-400 font-bold bg-[#5865F2]/10 px-1 rounded cursor-not-allowed" title="กรุณาเข้าสู่ระบบก่อนเพื่อเข้าร่วม Discord">Discord (เฉพาะสมาชิก)</span>} เป็นห้องเสียงในการพูดคุยกันอีกช่องทางหนึ่ง โดยเจ้าของจะออก ID ให้สำหรับสมาชิกในการเข้าเว็บไซต์</span></li>
                        </ul>
                      </div>
                  </div>
              )}

              {currentView === 'tools' && (
                  <div className="animate-view max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
                      <div className="text-center mb-8">
                          <h2 className="text-2xl font-bold text-sky-400">🛠️ สมาคม Tools</h2>
                          <p className="text-xs text-slate-400 mt-2">ชุดเครื่องมือและแอปพลิเคชันสำหรับใช้งานทั่วไป</p>
                      </div>
                      
                      {!activeTool ? (
                          <>
                              <div className="max-w-md mx-auto relative mt-4">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                  <input 
                                      type="text" 
                                      placeholder="ค้นหาเครื่องมือ..." 
                                      value={toolSearchQ}
                                      onChange={(e) => setToolSearchQ(e.target.value)}
                                      className="w-full bg-[#0B1325] border border-[#1E3A5F] rounded-full py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
                                  />
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10 mt-2">
                                  {[{id:'bpm', name:'BPM Tapper', icon:'🎵'}, {id:'tuner', name:'Guitar Tuner', icon:'🎸'}, {id:'transpose', name:'Chord Transposer', icon:'🎼'}, {id:'unit', name:'Unit Converter', icon:'⚖️'}, {id:'matrix', name:'Matrix Solver', icon:'🧮'}, {id:'resistor', name:'Resistor Code', icon:'🔌'}, {id:'split', name:'หารบิล', icon:'💸'}, {id:'random', name:'สุ่มชื่อ', icon:'🎲'}].filter(t => t.name.toLowerCase().includes(toolSearchQ.toLowerCase())).map(tool => (
                                      <button key={tool.id} onClick={() => setActiveTool(tool.id)} className="card p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#0F2547] hover:border-sky-500 hover:shadow-lg transition-all group">
                                          <span className="text-4xl group-hover:scale-110 transition-transform">{tool.icon}</span>
                                          <span className="font-bold text-sm">{tool.name}</span>
                                     </button>
                                  ))}
                              </div>
                          </>
                      ) : (
                          <div className="flex flex-col h-full min-h-0 space-y-4">
                              <div className="flex items-center gap-3 shrink-0 bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F] shadow-md">
                                  <button onClick={() => setActiveTool(null)} className="btn-d px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-white hover:text-[#050811] transition-colors">◀ กลับ</button>
                                  <h2 className="text-base sm:text-lg font-bold text-sky-300">เครื่องมือ</h2>
                              </div>

                              <div className="flex-1 w-full card p-4 sm:p-6 overflow-y-auto bg-[#050811]/50 shadow-inner">
                                  {activeTool === 'bpm' && <BPMTapper />}
                                  {activeTool === 'tuner' && <GuitarTuner />}
                                  {activeTool === 'transpose' && <ChordTransposer />}
                                  {activeTool === 'unit' && <AdvancedUnitConverter />}
                                  {activeTool === 'matrix' && <MatrixSolver />}
                                  {activeTool === 'resistor' && <ResistorCalcReal />}
                                  {activeTool === 'split' && <LunarSplitter />}
                                  {activeTool === 'random' && <Randomizer />}
                              </div>
                          </div>
                      )}
                  </div>
              )}
              
              {currentView === 'login' && (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="w-full max-w-md card p-7 space-y-4">
                    <div className="text-center"><div className="flex justify-center mb-2"><Logo s={46} /></div><h2 className="text-lg font-bold uppercase">The Blue Moon Portal</h2></div>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#050811] border border-[#1E3A5F]">
                      <button onClick={() => { setAuthMode('signin'); setAuthErr(''); }} className={authMode === 'signin' ? 'py-2 rounded-lg text-xs font-bold bg-white text-[#050811]' : 'py-2 text-xs text-slate-400'}>เข้าสู่ระบบ</button>
                      <button onClick={() => { setAuthMode('activate'); setAuthErr(''); }} className={authMode === 'activate' ? 'py-2 rounded-lg text-xs font-bold bg-white text-[#050811]' : 'py-2 text-xs text-slate-400'}>เปิดใช้งาน Member ID</button>
                    </div>
                    {authMode === 'signin' ? (
                      <form onSubmit={handleSignIn} className="space-y-3.5 text-xs">
                        <input type="text" value={lUser} onChange={(e) => setLUser(e.target.value)} placeholder="Username..." className="w-full inp" required />
                        <div className="relative flex items-center"><input type={showPass ? 'text' : 'password'} value={lPass} onChange={(e) => setLPass(e.target.value)} placeholder="Password..." className="w-full inp pr-16" required /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-1 rounded bg-[#0B1325]">{showPass ? '🙈 ซ่อน' : '👁️ ดู'}</button></div>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer"><input type="checkbox" checked={remMe} onChange={(e) => setRemMe(e.target.checked)} /> จดจำการเข้าสู่ระบบไว้ในเครื่องนี้</label>
                        {authErr && <div className="p-2.5 rounded-xl bg-red-950 text-red-200">{authErr}</div>}
                        <button type="submit" className="w-full btn-w py-2.5">เข้าสู่ระบบ</button>
                      </form>
                    ) : (
                      <form onSubmit={handleActivate} className="space-y-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] text-sky-300">💡 ทั้ง Username และรหัสผ่านสามารถเปลี่ยนภายหลังได้ที่หน้าโปรไฟล์ (เปลี่ยน Username ได้ 2 ครั้งใน 14 วัน)</div>
                        <input type="text" value={actId} onChange={(e) => setActId(e.target.value)} placeholder="Member ID (เช่น M000, M001) *" className="w-full inp font-mono uppercase" required />
                        <input type="text" value={actN} onChange={(e) => setActN(e.target.value)} placeholder="ชื่อที่แสดง (Display Name) *" className="w-full inp" required />
                        <input type="text" value={actU} onChange={(e) => setActU(e.target.value)} placeholder="ตั้ง Username *" className="w-full inp font-mono" required />
                        <div className="relative flex items-center"><input type={showPass ? 'text' : 'password'} value={actP} onChange={(e) => setActP(e.target.value)} placeholder="ตั้ง Password *" className="w-full inp pr-16" required /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-1 rounded bg-[#0B1325]">{showPass ? '🙈 ซ่อน' : '👁️ ดู'}</button></div>
                        {authErr && <div className="p-2.5 rounded-xl bg-red-950 text-red-200">{authErr}</div>}
                        <button type="submit" className="w-full btn-w py-2.5">ยืนยันและสร้างบัญชี</button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {currentView === 'members' && (
                <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-5 flex-1 overflow-y-auto">
                  <div className="card p-5 flex flex-wrap justify-between items-center gap-3">
                    <h2 className="text-lg font-bold">ทำเนียบสมาชิก ({activeMembers.length})</h2>
                    <select value={dirTag} onChange={(e) => setDirTag(e.target.value)} className="inp py-1.5 text-xs text-white max-w-[200px] w-full bg-[#050811] border border-[#1E3A5F]">
                      <option value="ALL">หมวดหมู่ทั้งหมด</option>
                      {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {activeMembers.filter((u) => dirTag === 'ALL' || getTags(u).includes(dirTag)).map((m) => (
                      <div key={m.id} onClick={() => setMemberModal(m)} className="cursor-pointer card hover:border-white/50 overflow-hidden">
                        <div className="bg-[#0F2547] px-4 py-2.5 border-b border-[#1E3A5F] flex justify-between items-center"><div className="flex items-center gap-1.5"><span className={`font-mono text-xs font-bold ${m.id.startsWith('F') ? 'text-[#38BDF8]' : 'text-white'}`}>{m.id}</span><RoleBadge role={m.role} /></div><TagBadges user={m} /></div>
                        <div className="p-4 flex items-start gap-3"><Avatar user={m} size="lg" showStatus={true} /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold truncate">{m.displayName}</h3><p className="text-xs font-mono text-slate-400">@{m.username}</p><p className="text-xs text-slate-200 mt-1.5 bg-[#050811] p-2 rounded-xl border border-[#1E3A5F] line-clamp-2">{m.bio}</p></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'discjam' && (
                <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-5 flex-1 overflow-y-auto">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-sky-400">
                      💿 Disc Jam {djState.djMode === 'auto' ? '🤖' : '🎧'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">ระบบวิทยุสมาคมรูปแบบ Dual-Deck</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {lateNight && currentUser?.role === 'admin' && (
                      <button onClick={() => updateDjState({ forceClosed: !djState.forceClosed })} className={`text-xs px-4 py-2 border-2 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.5)] font-bold transition-colors ${djState.forceClosed ? 'bg-emerald-950 text-emerald-400 border-emerald-900' : 'bg-red-950 text-red-400 border-red-900'}`}>
                        {djState.forceClosed ? '🟢 เปิดสถานี (คืนค่า)' : '🌙 ปิดสถานีวิทยุ'}
                      </button>
                    )}
                    {currentUser && currentUser.role === 'member' && (
                      !djState.jammerId ? (
                        <button onClick={() => updateDjState({ jammerId: currentUser.id })} className="btn-w text-xs px-4 py-2 border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                          🎤 รับสิทธิ์ Disc Jammer
                        </button>
                      ) : djState.jammerId === currentUser.id ? (
                        <button onClick={() => updateDjState({ jammerId: null })} className="bg-red-950 text-red-300 px-4 py-2 rounded-xl text-xs font-bold border border-red-900">
                          ⏹ คืนสิทธิ์ Jammer
                        </button>
                      ) : (
                        <div className="text-amber-400 text-xs font-bold px-4 py-2 bg-amber-950/50 rounded-xl border border-amber-900">
                          มีสมาชิกยึดตำแหน่ง Jammer อยู่
                        </div>
                      )
                    )}
                  </div>

                  {canManageAudio ? (
                    <div className="space-y-6">
                      <div className="card p-4 sm:p-6 shadow-2xl">
                         <div className="flex justify-between items-center mb-6 border-b border-[#1E3A5F] pb-4 flex-wrap gap-3">
                            <div className="flex gap-2">
                               <button onClick={() => updateDjState({ djMode: 'auto' })} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${djState.djMode === 'auto' ? 'bg-emerald-500 text-[#050811] shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800 text-slate-400'}`}>🤖 Auto DJ</button>
                               <button onClick={() => updateDjState({ djMode: 'manual' })} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${djState.djMode === 'manual' ? 'bg-sky-500 text-[#050811] shadow-[0_0_15px_rgba(14,165,233,0.5)]' : 'bg-slate-800 text-slate-400'}`}>🎧 Manual Pro</button>
                            </div>
                            
                            <div className="flex gap-3 items-center flex-wrap">
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 bg-[#050811] px-3 py-1.5 rounded-lg border border-[#1E3A5F] shadow-inner">
                                    ความเร็ว:
                                    <select value={djState.speed || 1} onChange={(e) => {
                                        const newSpeed = parseFloat(e.target.value);
                                        const updates = { speed: newSpeed };
                                        if (djState.playA?.isPlaying && ytA.current) {
                                            const cPos = ytA.current.getCurrentTime() || 0;
                                            updates.playA = { ...djState.playA, startedAt: Date.now() - (cPos / newSpeed) * 1000 };
                                        }
                                        if (djState.playB?.isPlaying && ytB.current) {
                                            const cPos = ytB.current.getCurrentTime() || 0;
                                            updates.playB = { ...djState.playB, startedAt: Date.now() - (cPos / newSpeed) * 1000 };
                                        }
                                        updateDjState(updates);
                                    }} className="bg-black border border-[#1E3A5F] rounded text-center text-white outline-none ml-1 py-0.5 cursor-pointer">
                                        <option value="0.25">0.25x</option>
                                        <option value="0.5">0.5x</option>
                                        <option value="0.75">0.75x</option>
                                        <option value="1">1.0x (ปกติ)</option>
                                        <option value="1.25">1.25x</option>
                                        <option value="1.5">1.5x</option>
                                        <option value="2">2.0x</option>
                                    </select>
                                </div>

                                {djState.djMode === 'auto' && (
                                   <div className="text-[10px] text-slate-400 flex items-center gap-2 bg-[#050811] px-3 py-1.5 rounded-lg border border-[#1E3A5F] shadow-inner">
                                     เฟด:
                                     <input type="number" min="1" max="15" value={djState.fadeDuration || 5} onChange={e => updateDjState({ fadeDuration: parseInt(e.target.value) })} className="bg-black border border-[#1E3A5F] rounded w-10 text-center text-white outline-none ml-1" />
                                     วิ
                                   </div>
                                )}
                            </div>
                         </div>

                         <div className="flex justify-center mb-6 -mt-2">
                            <div className="bg-[#050811] border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] px-4 py-2.5 rounded-full flex items-center gap-3 max-w-full overflow-x-auto no-scrollbar">
                               <span className="text-sky-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                  <span className="animate-pulse">🎧</span> Current DJ
                               </span>
                               <div className="w-[1px] h-5 bg-slate-700 shrink-0"></div>
                               <div className="flex items-center gap-1.5 shrink-0">
                                  {isFullyClosedSync ? (
                                     <span className="text-xs sm:text-sm font-bold text-red-400 mr-1">🌙 ปิดสถานียามวิกาล</span>
                                  ) : djState.jammerId ? (
                                     <>
                                        <Avatar user={getAuthor(djState.jammerId)} size="xs" showStatus={true} />
                                        <span className="text-xs sm:text-sm font-bold text-white">{getAuthor(djState.jammerId).displayName}</span>
                                        <RoleBadge role={getAuthor(djState.jammerId).role} />
                                     </>
                                  ) : (
                                     <>
                                        <span className="text-xs sm:text-sm font-bold text-white mr-1">Owner และ Vice</span>
                                        <RoleBadge role="admin" />
                                        <RoleBadge role="mod" />
                                     </>
                                  )}
                               </div>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4 sm:gap-8">
                            <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center transition-colors ${localCrossfade < 50 ? 'border-sky-500 bg-sky-900/10 shadow-[0_0_20px_rgba(14,165,233,0.1)]' : 'border-[#1E3A5F] bg-[#050811]/50'}`}>
                               <div className="text-sky-400 font-bold text-xs mb-3 bg-sky-900/30 px-3 py-1 rounded-full uppercase tracking-widest">Deck A</div>
                               <div className={`w-24 h-24 sm:w-36 sm:h-36 rounded-full border-8 border-slate-800 shadow-xl bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-zinc-900 flex items-center justify-center ${djState.playA?.isPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-200 border-4 border-slate-700 overflow-hidden">
                                     {isFullyClosedSync ? (
                                        <img src="jazzskull-trumpet.gif" className="w-full h-full object-cover scale-150" alt="" />
                                     ) : djState.deckA?.id ? (
                                        <img src={`https://img.youtube.com/vi/${djState.deckA.id}/default.jpg`} className="w-full h-full object-cover" alt="" />
                                     ) : (
                                        <div className="w-full h-full bg-slate-900"></div>
                                     )}
                                  </div>
                               </div>
                               {djState.deckA?.id && (
                                   <div className="w-full mt-3 px-2 flex items-center gap-2">
                                       <span className="text-[9px] font-mono w-8 text-right text-slate-400">{fmtTime(trackTime.curA)}</span>
                                       <input type="range" min="0" max={trackTime.durA || 100} value={trackTime.curA} onChange={(e) => handleSeek('A', e.target.value)} disabled={djState.djMode === 'auto'} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                       <span className="text-[9px] font-mono w-8 text-left text-slate-400">{fmtTime(trackTime.durA)}</span>
                                   </div>
                               )}
                                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                      {djState.djMode === 'manual' && (
                                         <button onClick={() => {
                                             const isP = djState.playA?.isPlaying;
                                             const cPos = ytA.current?.getCurrentTime() || 0;
                                             const spd = djState.speed || 1;
                                             updateDjState({ playA: { ...djState.playA, isPlaying: !isP, startedAt: isP ? djState.playA.startedAt : Date.now() - (cPos / spd) * 1000, pausedPos: isP ? cPos : 0 } });
                                         }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${djState.playA?.isPlaying ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'}`}>
                                           {djState.playA?.isPlaying ? '⏸ Global Pause' : '▶ Global Play'}
                                         </button>
                                      )}
                                      
                                      {djState.djMode === 'auto' && localCrossfade < 50 && (
                                         <>
                                             <button onClick={() => {
                                                 if (djState.fadeCommand) {
                                                     updateDjState({ crossfade: 100, fadeCommand: null, playA: { ...djState.playA, isPlaying: false }, deckA: null });
                                                 } else if(djState.queue?.length > 0) {
                                                     const nextSong = djState.queue[0];
                                                     const newQ = djState.queue.slice(1);
                                                     updateDjState({ queue: newQ, crossfade: 100, fadeCommand: null, deckB: nextSong, playB: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 }, playA: { ...djState.playA, isPlaying: false } });
                                                 } else {
                                                     updateDjState({ playA: { ...djState.playA, isPlaying: false }, deckA: null });
                                                 }
                                             }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#0F2547] text-white border border-[#1E3A5F] hover:bg-white hover:text-[#050811]">
                                               ⏭ ข้าม
                                             </button>
                                         </>
                                      )}
                                      
                                      <button onClick={() => {
                                          updateDjState({ playA: { ...djState.playA, isLooping: !djState.playA?.isLooping } });
                                      }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${djState.playA?.isLooping ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-[#0F2547] text-slate-300 border border-[#1E3A5F]'}`}>
                                          {djState.playA?.isLooping ? '🔂 วนซ้ำ' : '🔁 ไม่วน'}
                                      </button>
                                  </div>
                            </div>

                            <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center transition-colors ${localCrossfade >= 50 ? 'border-amber-500 bg-amber-900/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-[#1E3A5F] bg-[#050811]/50'}`}>
                               <div className="text-amber-400 font-bold text-xs mb-3 bg-amber-900/30 px-3 py-1 rounded-full uppercase tracking-widest">Deck B</div>
                               <div className={`w-24 h-24 sm:w-36 sm:h-36 rounded-full border-8 border-slate-800 shadow-xl bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-zinc-900 flex items-center justify-center ${djState.playB?.isPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-200 border-4 border-slate-700 overflow-hidden">
                                     {djState.deckB?.id ? <img src={`https://img.youtube.com/vi/${djState.deckB.id}/default.jpg`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-900"></div>}
                                  </div>
                               </div>
                               <div className="text-xs text-slate-200 font-bold mt-4 h-8 line-clamp-2">{djState.deckB?.title || 'Empty Deck'}</div>
                               {djState.deckB?.id && (
                                   <div className="w-full mt-3 px-2 flex items-center gap-2">
                                       <span className="text-[9px] font-mono w-8 text-right text-slate-400">{fmtTime(trackTime.curB)}</span>
                                       <input type="range" min="0" max={trackTime.durB || 100} value={trackTime.curB} onChange={(e) => handleSeek('B', e.target.value)} disabled={djState.djMode === 'auto'} className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                       <span className="text-[9px] font-mono w-8 text-left text-slate-400">{fmtTime(trackTime.durB)}</span>
                                   </div>
                               )}
                                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                      {djState.djMode === 'manual' && (
                                         <button onClick={() => {
                                             const isP = djState.playB?.isPlaying;
                                             const cPos = ytB.current?.getCurrentTime() || 0;
                                             const spd = djState.speed || 1;
                                             updateDjState({ playB: { ...djState.playB, isPlaying: !isP, startedAt: isP ? djState.playB.startedAt : Date.now() - (cPos / spd) * 1000, pausedPos: isP ? cPos : 0 } });
                                         }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${djState.playB?.isPlaying ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'}`}>
                                           {djState.playB?.isPlaying ? '⏸ Global Pause' : '▶ Global Play'}
                                         </button>
                                      )}
                                      
                                      {djState.djMode === 'auto' && localCrossfade >= 50 && (
                                         <>
                                             <button onClick={() => {
                                                 if (djState.fadeCommand) {
                                                     updateDjState({ crossfade: 0, fadeCommand: null, playB: { ...djState.playB, isPlaying: false }, deckB: null });
                                                 } else if(djState.queue?.length > 0) {
                                                     const nextSong = djState.queue[0];
                                                     const newQ = djState.queue.slice(1);
                                                     updateDjState({ queue: newQ, crossfade: 0, fadeCommand: null, deckA: nextSong, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 }, playB: { ...djState.playB, isPlaying: false } });
                                                 } else {
                                                     updateDjState({ playB: { ...djState.playB, isPlaying: false }, deckB: null });
                                                 }
                                             }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#0F2547] text-white border border-[#1E3A5F] hover:bg-white hover:text-[#050811]">
                                               ⏭ ข้าม
                                             </button>
                                         </>
                                      )}
                                      
                                      <button onClick={() => {
                                          updateDjState({ playB: { ...djState.playB, isLooping: !djState.playB?.isLooping } });
                                      }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${djState.playB?.isLooping ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-[#0F2547] text-slate-300 border border-[#1E3A5F]'}`}>
                                          {djState.playB?.isLooping ? '🔂 วนซ้ำ' : '🔁 ไม่วน'}
                                      </button>
                                  </div>
                            </div>
                         </div>

                         <div className="mt-8 bg-[#050811] p-4 rounded-xl border border-[#1E3A5F]">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest">
                               <span className="text-sky-400">← Deck A</span>
                               {djState.djMode === 'auto' ? <span className="text-emerald-400 animate-pulse">🤖 Auto Crossfade Control</span> : <span className="text-sky-400">🎧 Manual Crossfader</span>}
                               <span className="text-amber-400">Deck B →</span>
                            </div>
                            <input 
                               type="range" min="0" max="100" 
                               value={localCrossfade} 
                               onChange={(e) => { if(djState.djMode === 'manual') setLocalCrossfade(parseInt(e.target.value)); }} 
                               onMouseUp={(e) => { if(djState.djMode === 'manual') updateDjState({ crossfade: parseInt(e.target.value) }); }}
                               onTouchEnd={(e) => { if(djState.djMode === 'manual') updateDjState({ crossfade: parseInt(e.target.value) }); }}
                               className={`w-full h-2 bg-[#0B1325] rounded-lg appearance-none outline-none shadow-inner border border-[#1E3A5F] ${djState.djMode === 'auto' ? 'opacity-50 cursor-not-allowed' : 'cursor-ew-resize accent-sky-500'}`}
                               disabled={djState.djMode === 'auto'}
                            />
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-center -mb-2 mt-4">
                          <div className="bg-[#050811] border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] px-4 py-2.5 rounded-full flex items-center gap-3 max-w-full overflow-x-auto no-scrollbar">
                             <span className="text-sky-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                <span className="animate-pulse">🎧</span> Current DJ
                             </span>
                             <div className="w-[1px] h-5 bg-slate-700 shrink-0"></div>
                             <div className="flex items-center gap-1.5 shrink-0">
                                {isFullyClosedSync ? (
                                   <span className="text-xs sm:text-sm font-bold text-red-400 mr-1">🌙 ปิดสถานียามวิกาล</span>
                                ) : djState.jammerId ? (
                                   <>
                                      <Avatar user={getAuthor(djState.jammerId)} size="xs" showStatus={true} />
                                      <span className="text-xs sm:text-sm font-bold text-white">{getAuthor(djState.jammerId).displayName}</span>
                                      <RoleBadge role={getAuthor(djState.jammerId).role} />
                                   </>
                                ) : (
                                   <>
                                      <span className="text-xs sm:text-sm font-bold text-white mr-1">Owner และ Vice</span>
                                      <RoleBadge role="admin" />
                                      <RoleBadge role="mod" />
                                   </>
                                )}
                             </div>
                          </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-8 bg-[#0B1325] rounded-2xl border border-[#1E3A5F] shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-50"></div>
                          <div className="text-sky-400 font-bold text-xs sm:text-sm mb-6 uppercase tracking-widest px-6 py-1.5 bg-[#0F2547] rounded-full border border-sky-500/30 shadow-lg flex items-center gap-2">
                              <span className="animate-pulse">🔴</span> Now Playing
                          </div>
                          
                          <div className="relative w-48 h-48 sm:w-64 sm:h-64">
                              <div className={`absolute inset-0 rounded-full border-[10px] border-slate-800 shadow-[0_0_40px_rgba(14,165,233,0.2)] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-zinc-900 flex items-center justify-center ${isDeckPlaying && !isLocalPaused ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 border-4 border-slate-700 overflow-hidden">
                                      {isFullyClosedSync ? (
                                          <img src="jazzskull-trumpet.gif" className="w-full h-full object-cover scale-150" alt="" />
                                      ) : activeDeckSong?.id ? (
                                          <img src={`https://img.youtube.com/vi/${activeDeckSong.id}/default.jpg`} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                          <div className="w-full h-full bg-slate-900"></div>
                                      )}
                                  </div>
                              </div>
                              <div className="absolute top-[-10px] right-[-20px] w-4 h-24 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full origin-top transform rotate-12 shadow-lg hidden sm:block border-2 border-slate-800 z-10"></div>
                          </div>
                          
                          <div className="mt-8 w-full max-w-md px-4">
                              <div className="text-lg sm:text-xl font-bold text-white truncate text-center">{isFullyClosedSync ? 'สถานีปิดรับคิวเพลงชั่วคราว' : (activeDeckSong?.id ? activeDeckSong.title : 'ไม่มีเพลงกำลังเล่น')}</div>
                              {!isFullyClosedSync && activeDeckSong?.id && (
                                  <div className="text-xs font-mono text-sky-400 font-bold mt-2 text-center">
                                      {fmtTime(localCrossfade < 50 ? trackTime.curA : trackTime.curB)} / {fmtTime(localCrossfade < 50 ? trackTime.durA : trackTime.durB)}
                                  </div>
                              )}
                              {activeDeckSong?.addedBy && !isFullyClosedSync && <div className="text-[10px] text-slate-400 text-center mt-2 font-mono">Added by: {getAuthor(activeDeckSong.addedBy).displayName}</div>}
                          </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 space-y-4">
                       <div className="card p-4 h-[350px] flex flex-col shrink-0 border-sky-900/50">
                          <h3 className="font-bold mb-3 border-b border-[#1E3A5F] pb-2 text-sm text-sky-400 shrink-0">💬 แชตกับ DJ (Global)</h3>
                          <div ref={djChatRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                             {chatMessages.filter(m => m.roomKey === 'global-discjam').map((msg) => {
                                 const s = getAuthor(msg.senderId);
                                 const isDJ = djState.jammerId === msg.senderId;
                                 return (
                                     <div key={msg.id} className="flex items-start gap-2.5">
                                         <Avatar size="sm" user={s} />
                                         <div className="flex-1 bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F]">
                                             <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                 <span className="text-[11px] font-bold text-sky-300">{s.displayName}</span>
                                                 {isDJ && <span className="px-1.5 py-0.5 rounded bg-fuchsia-600 text-white text-[9px] font-bold uppercase shadow-[0_0_8px_rgba(192,38,211,0.5)]">🎧 DJ</span>}
                                                 <span className="text-[9px] text-slate-400">{getTimeStr(msg)}</span>
                                             </div>
                                             <div className="text-xs text-slate-200 break-words">{msg.isDeleted ? <span className="italic text-slate-500">🚫 ข้อความถูกยกเลิก</span> : msg.text}</div>
                                         </div>
                                     </div>
                                 );
                             })}
                          </div>
                          <form onSubmit={handleSendDjChat} className="mt-3 flex gap-2 shrink-0">
                             <input type="text" value={djChatIn} onChange={e=>setDjChatIn(e.target.value)} placeholder="เริ่มบทสนทนา..." className="flex-1 inp text-xs" />
                             <button type="submit" className="btn-w text-xs">ส่ง</button>
                          </form>
                       </div>
                       
                       <div className="card p-4">
                            <div className="text-sm font-bold text-sky-400 mb-3 border-b border-[#1E3A5F] pb-2">📁 Quick Playlists</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(djState.quickPlaylists || []).length === 0 && <span className="text-[10px] text-slate-500 italic">ยังไม่มีเพลย์ลิสต์</span>}
                                {(djState.quickPlaylists || []).map((qp, i) => (
                                    <div key={i} className="flex items-center rounded-lg bg-[#050811] border border-[#1E3A5F] overflow-hidden group shadow-md">
                                        <button onClick={() => {
                                            if(!djState.jammerId || djState.jammerId !== currentUser?.id) {
                                                if(!canManageAudio) return alert('เฉพาะ DJ เท่านั้นที่สามารถกดนำเข้าเพลย์ลิสต์ได้');
                                            }
                                            const parsed = parseYouTubeUrl(qp.url);
                                            if (parsed?.listId && (ytA.current || ytB.current)) {
                                                alert("กำลังนำเข้าเพลย์ลิสต์...");
                                                const helper = ytA.current || ytB.current;
                                                helper.loadPlaylist({list: parsed.listId});
                                                if (helper.playVideo) helper.playVideo();
                                                setTimeout(() => {
                                                     const playlistArr = helper.getPlaylist ? helper.getPlaylist() : null;
                                                     if (playlistArr && playlistArr.length > 0) {
                                                         const songsToAdd = playlistArr.slice(0, 50).map((vid, index) => ({ id: vid, title: `กำลังโหลดข้อมูล...`, addedBy: currentUser.id, key: Date.now() + index + Math.random() }));
                                                         handleAddTrack(songsToAdd.shift());
                                                         if (songsToAdd.length > 0) updateDjState({ queue: firebase.firestore.FieldValue.arrayUnion(...songsToAdd) });
                                                         alert(`เพิ่มเพลงจาก Playlist จำนวน ${songsToAdd.length + 1} เพลงเรียบร้อย`);
                                                     } else alert("ไม่พบเพลงในเพลย์ลิสต์นี้ หรือเพลย์ลิสต์ถูกตั้งเป็นส่วนตัว");
                                                }, 3500);
                                            }
                                        }} className="px-3 py-1.5 text-xs text-slate-300 hover:bg-[#0F2547] hover:text-white transition-colors">▶ {qp.name}</button>
                                        {(currentUser?.role === 'admin' || currentUser?.role === 'mod') && (
                                            <button onClick={() => {
                                                if(confirm(`ลบเพลย์ลิสต์ ${qp.name} ?`)) {
                                                    const newQp = [...djState.quickPlaylists];
                                                    newQp.splice(i, 1);
                                                    updateDjState({ quickPlaylists: newQp });
                                                }
                                            }} className="px-2 py-1.5 text-xs bg-red-950/40 text-red-400 hover:bg-red-500 hover:text-white border-l border-[#1E3A5F]">✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'mod') && (
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const nm = e.target.qpName.value.trim(), ur = e.target.qpUrl.value.trim();
                                    if(!nm || !ur) return;
                                    updateDjState({ quickPlaylists: [...(djState.quickPlaylists||[]), {name: nm, url: ur}] });
                                    e.target.reset();
                                }} className="flex gap-1.5">
                                    <input name="qpName" type="text" placeholder="ชื่อ" className="w-20 inp py-1.5 px-2 text-xs" required />
                                    <input name="qpUrl" type="url" placeholder="ลิงก์ YouTube Playlist" className="flex-1 inp py-1.5 px-2 text-xs" required />
                                    <button type="submit" className="btn-b py-1.5 px-3 text-xs">+</button>
                                </form>
                            )}
                       </div>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                       {currentUser ? (
                         <form onSubmit={(e) => {
                          e.preventDefault();
                          const radioClosed = lateNight && djState.forceClosed === true;
                          const isInputBlocked = radioClosed && !djState.jammerId; 
                          if(isInputBlocked) return alert("สถานีปิดรับคิวเพลงแล้ว เพลงที่เหลือจะเล่นจนจบก่อนปิดสถานี จะเปิดรับคิวใหม่เวลา 06:00 น.");
                          
                          const url = e.target.elements.ytUrl.value;
                          const parsed = parseYouTubeUrl(url);
                          
                          if (parsed?.listId || parsed?.videoId) {
                            const newId = parsed.listId || parsed.videoId;
                            const isPlaylist = !!parsed.listId;

                            if (isPlaylist && (ytA.current || ytB.current)) {
                                 alert("กำลังประมวลผล Playlist กรุณารอสักครู่...");
                                 const helper = ytA.current || ytB.current;
                                 helper.loadPlaylist({list: parsed.listId});
                                 if (helper.playVideo) helper.playVideo();
                                 setTimeout(() => {
                                     const playlistArr = helper.getPlaylist ? helper.getPlaylist() : null;
                                     if (playlistArr && playlistArr.length > 0) {
                                         const songsToAdd = playlistArr.slice(0, 50).map((vid, index) => ({ id: vid, title: `กำลังโหลดข้อมูล...`, addedBy: currentUser.id, key: Date.now() + index + Math.random() }));
                                         handleAddTrack(songsToAdd.shift());
                                         if (songsToAdd.length > 0) updateDjState({ queue: firebase.firestore.FieldValue.arrayUnion(...songsToAdd) });
                                         alert(`เพิ่มเพลงจาก Playlist จำนวน ${songsToAdd.length + 1} เพลงลงในคิวแล้ว`);
                                     } else alert("ไม่พบเพลง หรือ Playlist นี้ถูกตั้งเป็นส่วนตัว (Private)");
                                 }, 3500);
                            } else {
                                 handleAddTrack({ id: newId, title: `กำลังโหลดข้อมูล...`, addedBy: currentUser.id, key: Date.now()+Math.random() });
                            }
                          } else alert('กรุณาระบุ URL วิดีโอ หรือ Playlist ของ YouTube ให้ถูกต้อง');
                          e.target.reset();
                       }} className="flex gap-2">
                            <input name="ytUrl" type="url" placeholder="วางลิงก์ YouTube Video หรือ Playlist เพื่อเพิ่มเข้าคิวที่นี่..." className="inp flex-1 text-xs" required />
                            <button type="submit" className="btn-b text-xs font-bold px-6 shadow hover:scale-105">เพิ่มเข้าคิว</button>
                         </form>
                       ) : (
                         <div className="bg-blue-900/30 text-blue-200 p-3 rounded-xl border border-blue-800 text-xs text-center font-bold">
                            🎵 คุณกำลังรับชมในฐานะผู้มาเยือน สามารถฟังเพลงร่วมกับสมาคมได้ แต่ไม่สามารถเพิ่มเพลงหรือพิมพ์แชตได้
                         </div>
                       )}
                       
                       <div className="card p-4 h-[500px] flex flex-col shrink-0">
                          <h3 className="font-bold mb-3 border-b border-[#1E3A5F] pb-2 text-sm flex justify-between shrink-0 items-center">
                            <div className="flex gap-2 items-center">
                                <span>{canManageAudio && djState.djMode === 'manual' ? 'กล่องเก็บเพลง (Track Pool)' : 'รายการคิวเพลง (Auto Queue)'}</span>
                                <span className="text-amber-400 text-xs">({djState.queue?.length || 0} เพลง)</span>
                            </div>
                            {canManageAudio && djState.queue?.length > 0 && (
                                <button onClick={() => { if(confirm('คุณต้องการลบเพลงในคิวทิ้งทั้งหมดหรือไม่?')) updateDjState({ queue: [] }); }} className="text-[10px] px-2.5 py-1 bg-red-950/80 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors border border-red-900 shadow">
                                   🗑️ ล้างคิว
                                </button>
                            )}
                          </h3>
                          <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                            {(!djState.queue || djState.queue.length === 0) ? (
                                 <p className="text-slate-500 text-xs text-center py-6">ไม่มีเพลงในระบบ</p> 
                            ) : (
                              <>
                                {djState.queue.map((q, idx) => (
                                <div key={q.key} className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-[#050811] border border-[#1E3A5F] hover:border-slate-600 transition-colors">
                                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <img src={`https://img.youtube.com/vi/${q.id}/default.jpg`} className="w-10 h-7 object-cover rounded opacity-80 shrink-0" alt="" />
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate text-slate-200">{q.title}</span><span className="text-[9px] text-slate-500 font-normal">โดย {getAuthor(q.addedBy).displayName}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {canManageAudio && djState.djMode === 'manual' ? (
                                       <div className="flex gap-1 shrink-0 ml-2">
                                          <button onClick={() => { const nQ = djState.queue.filter(x => x.key !== q.key); updateDjState({ queue: nQ, deckA: q, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } }); }} className="bg-sky-900/50 hover:bg-sky-600 text-sky-200 px-2 py-1 text-[10px] rounded border border-sky-700 transition">เข้า A</button>
                                          <button onClick={() => { const nQ = djState.queue.filter(x => x.key !== q.key); updateDjState({ queue: nQ, deckB: q, playB: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 } }); }} className="bg-amber-900/50 hover:bg-amber-600 text-amber-200 px-2 py-1 text-[10px] rounded border border-amber-700 transition">เข้า B</button>
                                       </div>
                                    ) : (
                                       idx === 0 && <span className="text-[9px] font-bold bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded animate-pulse shrink-0">คิวถัดไป</span>
                                    )}
                                    {canManageAudio && idx > 0 && <button onClick={() => { const nQ = [...djState.queue]; [nQ[idx-1], nQ[idx]] = [nQ[idx], nQ[idx-1]]; updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-[#0F2547] rounded hover:bg-white hover:text-black">↑</button>}
                                    {canManageAudio && idx < djState.queue.length - 1 && <button onClick={() => { const nQ = [...djState.queue]; [nQ[idx+1], nQ[idx]] = [nQ[idx], nQ[idx+1]]; updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-[#0F2547] rounded hover:bg-white hover:text-black">↓</button>}
                                    {(canManageAudio || q.addedBy === currentUser?.id) && (
                                      <button onClick={() => { const nQ = [...djState.queue]; nQ.splice(idx, 1); updateDjState({ queue: nQ }); }} className="w-6 h-6 flex items-center justify-center bg-red-950/50 text-red-400 rounded hover:bg-red-500 hover:text-white ml-1" title="ลบเพลงนี้">✕</button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              </>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}
          </main>
          
          {/* Modal Overlay Components */}
          {addMemOpen && activeGrp && (
            <Modal title={'👥 แก้ไขสมาชิกกลุ่ม: ' + activeGrp.name} onClose={() => setAddMemOpen(false)}>
              <div className="space-y-4 max-h-80 overflow-y-auto text-xs">
                <div>
                  <h4 className="font-bold text-sky-300 mb-2">สมาชิกในกลุ่ม ({(activeGrp.members || []).length})</h4>
                  <div className="space-y-2">
                    {activeMembers.filter((m) => (activeGrp.members || []).includes(m.id)).map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex justify-between items-center">
                        <div className="flex items-center gap-2"><Avatar user={m} size="xs" /><span>{m.displayName} ({m.id})</span></div>
                        <div className="flex gap-2">
                          {m.id === activeGrp.createdBy && <span className="text-amber-400 text-[10px] self-center font-bold">👑 ผู้สร้าง</span>}
                          {m.id !== activeGrp.createdBy && m.id !== currentUser?.id && (
                            <button onClick={() => db.collection('bma_groups').doc(activeGrp.id).update({ members: (activeGrp.members || []).filter(id => id !== m.id) })} className="text-red-400 font-bold bg-red-950/50 px-2 py-1 rounded hover:bg-red-900 transition-colors">ลบออก</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-300 mb-2">เพิ่มสมาชิกใหม่</h4>
                  <div className="space-y-2">
                    {activeMembers.filter((m) => !(activeGrp.members || []).includes(m.id)).map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex justify-between items-center">
                        <div className="flex items-center gap-2"><Avatar user={m} size="xs" /><span>{m.displayName} ({m.id})</span></div>
                        <button onClick={() => db.collection('bma_groups').doc(activeGrp.id).update({ members: Array.from(new Set([...(activeGrp.members || []), m.id])) })} className="btn-w py-1 text-[10px] hover:scale-105 transition-transform">+ ดึงเข้ากลุ่ม</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {cGrpOpen && (
            <Modal title="👥 สร้างกลุ่มแชตใหม่" onClose={() => { setCGrpOpen(false); setGrpName(''); setGrpMems([]); }}>
              <form onSubmit={async (e) => { e.preventDefault(); if(!grpName.trim() || grpMems.length === 0) return alert('กรุณาตั้งชื่อกลุ่มและเลือกสมาชิกอย่างน้อย 1 คน'); const id = 'grp-' + Date.now(); await db.collection('bma_groups').doc(id).set({ id, name: grpName.trim(), members: [currentUser.id, ...grpMems], createdBy: currentUser.id, isArchived: false, timestamp: Date.now(), serverCreatedAt: svrTs() }); setCGrpOpen(false); setGrpName(''); setGrpMems([]); setActiveRoom({type: 'group', id}); }} className="space-y-3 text-xs">
                <input type="text" value={grpName} onChange={(e) => setGrpName(e.target.value)} placeholder="ตั้งชื่อกลุ่ม..." className="w-full inp" required />
                <div className="card p-2 max-h-48 overflow-y-auto space-y-1">
                   <div className="text-slate-400 mb-1 px-1">เลือกสมาชิก:</div>
                   {activeMembers.filter(m => m.id !== currentUser.id).map(m => (
                     <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-[#0F2547] rounded cursor-pointer">
                       <input type="checkbox" checked={grpMems.includes(m.id)} onChange={(e) => { if(e.target.checked) setGrpMems([...grpMems, m.id]); else setGrpMems(grpMems.filter(x => x !== m.id)); }} />
                       <Avatar user={m} size="xs" /> <span>{m.displayName} ({m.id})</span>
                     </label>
                   ))}
                </div>
                <button type="submit" className="w-full btn-w py-2">สร้างกลุ่มแชต</button>
              </form>
            </Modal>
          )}

          {cChOpen && isModOrAdmin && (
            <Modal title="💬 สร้างห้องแชตรวมใหม่" onClose={() => { setCChOpen(false); setChName(''); setChIcon('💬'); setChDesc(''); }}>
              <form onSubmit={async (e) => { e.preventDefault(); if(!chName.trim()) return; const id = 'ch-' + Date.now(); await db.collection('bma_channels').doc(id).set({ id, name: chName.trim().replace(/\s+/g, '-').toLowerCase(), icon: chIcon, desc: chDesc.trim(), createdBy: currentUser.id, isProtected: false, isSystemReadOnly: false, timestamp: Date.now(), serverCreatedAt: svrTs() }); setCChOpen(false); setChName(''); setChIcon('💬'); setChDesc(''); setActiveRoom({type: 'channel', id}); }} className="space-y-3 text-xs">
                <div className="flex gap-2">
                   <input type="text" value={chIcon} onChange={(e) => setChIcon(e.target.value)} className="inp w-16 text-center text-lg" placeholder="อีโมจิ" required />
                   <input type="text" value={chName} onChange={(e) => setChName(e.target.value)} placeholder="ชื่อห้องแชต (เช่น general-talk)..." className="flex-1 inp font-mono" required />
                </div>
                <input type="text" value={chDesc} onChange={(e) => setChDesc(e.target.value)} placeholder="คำอธิบายห้องแชตสั้น ๆ ..." className="w-full inp" />
                <button type="submit" className="w-full btn-w py-2">สร้างห้องแชต</button>
              </form>
            </Modal>
          )}

          {fwdMsg && (
            <Modal title="↪️ ส่งต่อข้อความ / ไฟล์" onClose={() => setFwdMsg(null)}>
              <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs">
                {channels.filter((c) => !c.isSystemReadOnly).map((c) => <button key={c.id} onClick={async () => { const now = Date.now(), id = 'msg-' + now; await db.collection('bma_messages').doc(id).set({ id, roomKey: c.id, senderId: currentUser.id, text: fwdMsg.mediaItem ? '↪️ [ส่งต่อไฟล์]' : '↪️ ' + fwdMsg.message.text, attachments: fwdMsg.mediaItem ? [fwdMsg.mediaItem] : (fwdMsg.message.attachments || []), likes: [], readBy: [currentUser.id], time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), timestamp: now, serverCreatedAt: svrTs() }); setFwdMsg(null); setActiveRoom({ type: 'channel', id: c.id }); }} className="w-full flex justify-between p-2 rounded-xl bg-[#050811] border border-[#1E3A5F]"><span>{c.icon} # {c.name}</span><span className="font-bold">ส่งต่อ</span></button>)}
                {activeMembers.filter((m) => m.id !== currentUser?.id).map((m) => <button key={m.id} onClick={async () => { const now = Date.now(), id = 'msg-' + now; await db.collection('bma_messages').doc(id).set({ id, roomKey: dmKey(currentUser.id, m.id), senderId: currentUser.id, receiverId: m.id, text: fwdMsg.mediaItem ? '↪️ [ส่งต่อไฟล์]' : '↪️ ' + fwdMsg.message.text, attachments: fwdMsg.mediaItem ? [fwdMsg.mediaItem] : (fwdMsg.message.attachments || []), likes: [], readBy: [currentUser.id], time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), timestamp: now, serverCreatedAt: svrTs() }); setFwdMsg(null); setActiveRoom({ type: 'dm', id: m.id }); }} className="w-full flex justify-between p-2 rounded-xl bg-[#050811] border border-[#1E3A5F]"><span>{m.displayName} ({m.id})</span><span className="font-bold">ส่งต่อ</span></button>)}
              </div>
            </Modal>
          )}

          {notifOpen && currentUser && (
            <Modal title="🔔 การแจ้งเตือน" onClose={() => setNotifOpen(false)} maxW="max-w-lg">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F]"><span>📱 แจ้งเตือนอุปกรณ์: {pushPerm === 'granted' ? '✓ เปิดแล้ว' : 'ยังไม่เปิด'}</span>{pushPerm !== 'granted' && <button onClick={async () => { if (typeof Notification !== 'undefined') setPushPerm(await Notification.requestPermission()); }} className="btn-w py-1">ขออนุญาต</button>}</div>
                <div className="flex justify-between">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">{[['posts', '📝 โพสต์'], ['messages', '💬 ข้อความ'], ['members', '👥 สมาชิกใหม่'], ['settings', '🔕 ตั้งค่า']].map(([k, l]) => <button key={k} onClick={() => setNotifTab(k)} className={notifTab === k ? 'px-2.5 py-1 rounded-lg font-bold bg-white text-[#050811] shrink-0' : 'px-2.5 py-1 rounded-lg bg-[#050811] shrink-0'}>{l}</button>)}</div>
                  {notifTab !== 'settings' && <button onClick={() => unreadNotifs.forEach((n) => db.collection('bma_notifications').doc(n.id).update({ readBy: Array.from(new Set([...(n.readBy || []), currentUser.id])) }))} className="text-sky-300 font-bold">✓ อ่านแล้วทั้งหมด</button>}
                </div>
                {notifTab === 'settings' ? (
                  <div className="space-y-2">{[['muteOwnPosts', 'ปิดแจ้งเตือนโพสต์ตนเอง'], ['muteGlobalChat', 'ปิดแจ้งเตือนช่องหลัก'], ['mutePrivateChat', 'ปิดแจ้งเตือนแชตกลุ่ม/ส่วนตัว']].map(([k, l]) => <div key={k} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex justify-between items-center"><span>{l}</span><button onClick={() => db.collection('bma_users').doc(currentUser.id).update({ notifPrefs: { ...(currentUser.notifPrefs || {}), [k]: !currentUser.notifPrefs?.[k] } })} className={currentUser.notifPrefs?.[k] ? 'px-2.5 py-1 rounded bg-red-600 font-bold' : 'btn-b py-1'}>{currentUser.notifPrefs?.[k] ? '🔕 ปิดอยู่' : '🔔 เปิดอยู่'}</button></div>)}</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {myNotifs.filter((n) => n.category === notifTab).map((n) => {
                      const rd = (n.readBy || []).includes(currentUser.id);
                      return <div key={n.id} onClick={() => { db.collection('bma_notifications').doc(n.id).update({ readBy: Array.from(new Set([...(n.readBy || []), currentUser.id])) }); setNotifOpen(false); if (n.targetPostId) jumpToPost(n.targetPostId); else if (n.targetRoomType) { setActiveRoom({ type: n.targetRoomType, id: n.targetRoomId }); setCurrentView('chat'); } else if (n.targetView === 'members') { setCurrentView('members'); setMemberModal(users.find(u => u.id === n.targetRoomId) || null); } }} className={'p-2.5 rounded-xl border cursor-pointer flex justify-between items-center ' + (rd ? 'bg-[#050811] border-[#1E3A5F] opacity-60' : 'bg-[#0F2547]/70 border-sky-400')}><div><div className="font-bold">{!rd && '● '}{n.title}</div><div className="text-slate-300">{n.body}</div></div><div className="flex items-center gap-2"><span className="text-sky-400 shrink-0">ดู →</span>{rd && <button onClick={(e) => { e.stopPropagation(); db.collection('bma_notifications').doc(n.id).delete(); }} className="text-red-400 px-2 py-1 bg-red-950/50 rounded hover:bg-red-900 font-bold ml-1">🗑️ ลบ</button>}</div></div>;
                    })}
                  </div>
                )}
              </div>
            </Modal>
          )}

          {memberModal && (
            <Modal title="โปรไฟล์สมาชิก" onClose={() => setMemberModal(null)}>
              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar user={memberModal} size="xl" showStatus={true} />
                <div>
                  <h3 className="text-lg font-bold flex justify-center items-center gap-1.5">{memberModal.displayName} <RoleBadge role={memberModal.role} /></h3>
                  <p className="text-sm font-mono text-slate-400">@{memberModal.username} • {memberModal.id}</p>
                </div>
                <TagBadges user={memberModal} />
                
                {memberModal.birthDate && (
                   <div className="px-3 py-1.5 bg-[#0F2547] border border-[#1E3A5F] rounded-full text-xs font-bold text-sky-300 shadow-md">
                     🎂 วันเกิด: {new Date(memberModal.birthDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
                   </div>
                )}
                
                <div className="w-full bg-[#050811] p-3 rounded-xl border border-[#1E3A5F] text-sm text-slate-200 mt-2">
                  {memberModal.bio || 'ยังไม่มีคำแนะนำตัว'}
                </div>
                <div className="flex gap-2 w-full mt-2">
                  {currentUser && currentUser.id !== memberModal.id && (
                     <button onClick={() => { setActiveRoom({ type: 'dm', id: memberModal.id }); setCurrentView('chat'); setMemberModal(null); }} className="flex-1 btn-b py-2 shadow hover:scale-105 transition-transform">💬 ส่งข้อความส่วนตัว</button>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {editProf && currentUser && (
            <Modal title="ตั้งค่าโปรไฟล์ & โซเชียล" onClose={() => setEditProf(false)} maxW="max-w-lg">
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F]"><Avatar user={{ ...currentUser, displayName: eName, avatarUrl: eAv }} size="md" /><input type="file" accept="image/*" ref={avRef} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setEAv(await compressImg(f)); }} className="hidden" /><button type="button" onClick={() => avRef.current?.click()} className="btn-w py-1.5"><UpIcon />อัปโหลดรูปโปรไฟล์</button></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block mb-1">ชื่อที่แสดง *</label><input type="text" value={eName} onChange={(e) => setEName(e.target.value)} className="w-full inp" required /></div>
                  <div><label className="block mb-1">Username ({Math.max(0, 2 - recentChg(currentUser).length)}/2 ใน 14 วัน)</label><input type="text" value={eUser} onChange={(e) => setEUser(e.target.value)} className="w-full inp font-mono" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative flex items-center"><input type={showPass ? 'text' : 'password'} value={ePass} onChange={(e) => setEPass(e.target.value)} className="w-full inp pr-16 font-mono" placeholder="Password *" required /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 px-2 py-0.5 rounded bg-[#0B1325] text-[10px]">{showPass ? '🙈 ซ่อน' : '👁️ ดู'}</button></div>
                  <div><input type="date" value={eBd} onChange={(e) => setEBd(e.target.value)} className="w-full inp font-mono text-slate-300" title="วันเกิด" /></div>
                </div>
                <textarea rows={2} value={eBio} onChange={(e) => setEBio(e.target.value)} placeholder="Bio..." className="w-full inp" />
                <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2">
                  <div className="flex gap-1"><select value={sPlat} onChange={(e) => setSPlat(e.target.value)} className="bg-[#0B1325] border border-[#1E3A5F] rounded px-1.5 py-1 shrink-0">{SOCIALS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.id}</option>)}</select><input type="text" value={sLbl} onChange={(e) => setSLbl(e.target.value)} placeholder="ชื่อปุ่ม..." className="w-20 sm:w-24 min-w-0 bg-[#0B1325] border border-[#1E3A5F] rounded px-2 py-1 shrink-0" /><input type="text" value={sUrl} onChange={(e) => setSUrl(e.target.value)} placeholder="URL..." className="flex-1 min-w-0 bg-[#0B1325] border border-[#1E3A5F] rounded px-2 py-1" /><button type="button" onClick={() => { if (sUrl.trim()) { setESocs([...eSocs, { id: 's-' + Date.now(), platform: sPlat, label: sLbl.trim() || sPlat, url: safeUrl(sUrl) }]); setSUrl(''); setSLbl(''); } }} className="btn-w py-1 shrink-0">เพิ่ม</button></div>
                  {eSocs.map((s) => <div key={s.id} className="flex justify-between px-2 py-1 rounded bg-[#0B1325]"><span>{s.label}: {s.url}</span><button type="button" onClick={() => setESocs(eSocs.filter((x) => x.id !== s.id))} className="text-red-400">ลบ</button></div>)}
                </div>
                {profErr && <div className="p-2 rounded bg-red-950 text-red-200">{profErr}</div>}
        	<div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#1E3A5F]">
         	  <button type="submit" className="w-full btn-w py-2">บันทึกโปรไฟล์</button>
	          <button type="button" onClick={async () => { setEditProf(false); await db.collection('bma_users').doc(currentUser.id).update({ isOnline: false }).catch(() => {}); localStorage.removeItem('tbma_saved_user_id'); sessionStorage.removeItem('tbma_session_user_id'); setCurrentUser(null); setCurrentView('home'); }} className="w-full py-2 rounded-lg bg-red-950/40 text-red-400 font-bold border border-red-900/50 hover:bg-red-900 hover:text-white transition-colors">🚪 ออกจากระบบ</button>
	        </div>
	      </form>
	    </Modal>
          )}

          {createPost && (
            <Modal title={editPostData ? "✎ แก้ไขโพสต์" : "เขียนโพสต์ใหม่ / สร้างโพลล์"} onClose={() => { setCreatePost(false); setEditPostData(null); }} maxW="max-w-xl">
              <form onSubmit={handleCreatePost} className="space-y-3 text-xs text-left">
                <input type="text" value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="หัวข้อเรื่อง (ไม่บังคับ)..." className="w-full inp text-sm" />
                <textarea rows={3} value={pCont} onChange={(e) => setPCont(e.target.value)} placeholder="เนื้อหาโพสต์..." className="w-full inp text-sm" />
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] cursor-pointer">
                  <span>🌐 อนุญาตให้ผู้มาเยือน (Guest) มองเห็นโพสต์นี้ได้ (ค่าเริ่มต้นเป็นความลับเฉพาะสมาชิก)</span>
                  <input type="checkbox" checked={pGuest} onChange={(e) => setPGuest(e.target.checked)} />
                </label>
                {(currentUser?.role === 'admin' || currentUser?.role === 'mod') && (
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] cursor-pointer mt-2">
                    <span className="font-bold text-amber-300">📌 ปักหมุดโพสต์ไว้บนสุด</span>
                    <input type="checkbox" checked={pPinned} onChange={(e) => setPPinned(e.target.checked)} />
                  </label>
                )}
		{/* ระบบแท็ก */}
                <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2 relative">
                  <div className="font-bold">🏷️ เพิ่มแท็กให้โพสต์</div>
                  <div className="flex gap-2">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim() && !pTags.includes(tagInput.trim())) { setPTags([...pTags, tagInput.trim()]); setTagInput(''); } } }} placeholder="พิมพ์ชื่อแท็ก (เช่น ข่าวสาร, อัปเดต)..." className="flex-1 inp text-xs" />
                      <button type="button" onClick={() => { if(tagInput.trim() && !pTags.includes(tagInput.trim())) { setPTags([...pTags, tagInput.trim()]); setTagInput(''); } }} className="btn-b text-xs px-4 font-bold">+ เพิ่ม</button>
                  </div>
                  {tagInput.trim() && allPostTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !pTags.includes(t)).length > 0 && (
                      <div className="absolute top-16 left-3 right-3 bg-[#0B1325] border border-sky-500/50 rounded-lg p-2 z-50 flex flex-wrap gap-1.5 shadow-2xl max-h-32 overflow-y-auto">
                          <div className="w-full text-[10px] text-slate-400 mb-1">แท็กที่มีคนใช้แล้ว (คลิกเพื่อเลือก):</div>
                          {allPostTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !pTags.includes(t)).map(t => (
                              <button key={t} type="button" onClick={() => { setPTags([...pTags, t]); setTagInput(''); }} className="px-2 py-1 bg-sky-900/50 hover:bg-sky-600 text-sky-200 rounded text-xs transition-colors border border-sky-800/50">#{t}</button>
                          ))}
                      </div>
                  )}
                  {pTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[#1E3A5F]/50">
                          {pTags.map(t => (
                              <span key={t} className="px-2 py-1 bg-[#1E3A5F] text-white rounded-md text-xs flex items-center gap-1.5 shadow-sm">
                                  #{t} <button type="button" onClick={() => setPTags(pTags.filter(x => x !== t))} className="text-red-400 hover:text-red-300 font-bold bg-black/20 rounded-full w-4 h-4 flex items-center justify-center">✕</button>
                              </span>
                          ))}
                      </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2">
                  <div className="flex justify-between items-center"><span className="font-bold">📊 โพลล์สำรวจความคิดเห็น</span><button type="button" onClick={() => setHasPoll(!hasPoll)} className="btn-b py-1">{hasPoll ? '✓ เปิดโพลล์แล้ว' : '+ เพิ่มโพลล์'}</button></div>
                  {hasPoll && (
                    <div className="space-y-1.5 pt-1.5 border-t border-[#1E3A5F]">
                      <input type="text" value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="คำถามโพลล์ *" className="w-full inp py-1.5" />
                      {pollOpts.map((o, i) => <input key={i} type="text" value={o} onChange={(e) => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }} placeholder={'ตัวเลือกที่ ' + (i + 1)} className="w-full inp py-1" />)}
                      <button type="button" onClick={() => setPollOpts([...pollOpts, ''])} className="btn-b py-0.5">+ เพิ่มตัวเลือก</button>
                      <div className="flex justify-between items-center pt-1"><input type="datetime-local" value={pollClose} onChange={(e) => setPollClose(e.target.value)} className="inp py-1" /><label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={pollAnon} onChange={(e) => setPollAnon(e.target.checked)} /> 🕵️ โหวตไม่แสดงชื่อ</label></div>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2">
                  <div className="flex justify-between items-center">
                    <span>อัปโหลดไฟล์ (สูงสุด 10MB) หรือแนบลิงก์</span>
                    <input type="file" multiple ref={pFileRef} onChange={async (e) => { const fl = Array.from(e.target.files || []); e.target.value = ''; setUploading(true); for (const f of fl) { try { const a = await uploadChunked(f); setPAtts((p) => [...p, a]); } catch (err) { alert(err.message); } } setUploading(false); }} className="hidden" />
                    <button type="button" onClick={() => pFileRef.current?.click()} className="btn-b py-1 font-bold"><UpIcon />อัปโหลดไฟล์</button>
                  </div>
                  {uploading && <div className="text-sky-300 animate-pulse">⏳ กำลังอัปโหลด...</div>}
                  <div className="flex gap-1.5"><select value={aType} onChange={(e) => setAType(e.target.value)} className="inp py-1"><option value="image">รูปภาพ/GIF</option><option value="video">วิดีโอ (Drive/YouTube)</option><option value="audio">เสียง (Audio)</option><option value="file">ไฟล์</option></select><input type="text" value={aUrl} onChange={(e) => setAUrl(e.target.value)} placeholder="วางลิงก์เว็บ, .gif, .mp4..." className="flex-1 inp py-1" /><button type="button" onClick={() => { if (aUrl.trim()) { setPAtts([...pAtts, { id: 'att-' + Date.now(), name: 'Link', type: aType, url: aUrl.trim(), size: 'URL' }]); setAUrl(''); } }} className="btn-w py-1">🔗 แนบลิงก์</button></div>
                  {pAtts.map((a) => <div key={a.id} className="flex justify-between px-2 py-1 rounded bg-[#0B1325]"><span>{a.name}</span><button type="button" onClick={() => setPAtts(pAtts.filter((x) => x.id !== a.id))} className="text-red-400">ลบ</button></div>)}
                </div>
                <button type="submit" className="w-full btn-w py-2.5">{editPostData ? 'บันทึกการแก้ไข' : 'เผยแพร่โพสต์'}</button>
              </form>
            </Modal>
          )}

          {/* 🎃 Halloween Overlays */}
          {IS_HALLOWEEN && ghosts.map(g => (
             <div key={g.id} onClick={() => catchGhost(g.id)} className="ghost-hunt" style={{ left: g.x + 'vw', top: g.y + 'vh' }} title="จับผี!">👻</div>
          ))}
          {scareTriggered && (
             <div className="jump-scare-overlay">
                <div className="scare-img">👻</div>
             </div>
          )}

          {activeChatGameId && (
              <ChatGameModal 
                  gameId={activeChatGameId} 
                  currentUser={currentUser} 
                  onClose={() => setActiveChatGameId(null)} 
                  getAuthor={getAuthor} 
                  db={db} 
                  activeRoom={activeRoom} 
                  roomKey={roomKey} 
              />
          )}

          {/* ปฏิทินสมาคม */}
          <AssociationCalendar 
              isOpen={showCalendar} 
              onClose={() => setShowCalendar(false)} 
              events={bmaEvents} 
              currentUser={currentUser} 
              db={db} 
              users={users} 
          />

      </div>
  );
}

// ผูก React เข้ากับ DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);