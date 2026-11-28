import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { db, svrTs, FieldValue } from './lib/firebase';
import { safeUrl } from './lib/security';
import { PRESET_TAGS, DEF_CH, getMs, getTimeStr, getTags, getGameDateStr, getBkkNow } from './lib/utils';
import { useAuth } from './contexts/AuthContext';
import { useUI } from './contexts/UIContext';
import { Logo, Avatar, RoleBadge, TagBadges } from './components/BasicUI';
import { FloatingRadio } from './components/FloatingRadio';
import { MuteDurationModal } from './components/MuteDurationModal';
import GlobalModals from './components/GlobalModals';
import HalloweenGhostHunt from './features/events/HalloweenGhostHunt';
import HalloweenCurseAndTreats, { playSpookySound } from './features/events/HalloweenCurseAndTreats';
import {
  checkIsHalloween,
  checkIsLoyKrathong,
  checkIsChristmas,
  isXmasSeasonPassed,
  isXmasMidnightUnlocked,
  doesOrnamentMentionUser
} from './features/events/eventHelpers';

// Lazy-loaded Feature Pages (Code Splitting)
const HomePage = lazy(() => import('./features/home/HomePage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const MembersPage = lazy(() => import('./features/members/MembersPage'));
const OwnerPage = lazy(() => import('./features/owner/OwnerPage'));
const BoardPage = lazy(() => import('./features/board/BoardPage'));
const SinglePostPage = lazy(() => import('./features/board/SinglePostPage'));
const CreatePostModal = lazy(() => import('./features/board/CreatePostModal'));
const DiscJamPage = lazy(() => import('./features/discjam/DiscJamPage'));
const ChatPage = lazy(() => import('./features/chat/ChatPage'));
const DailyGamesPage = lazy(() => import('./features/daily-games/DailyGamesPage'));
const ToolsPage = lazy(() => import('./features/tools/ToolsPage'));
const AssociationCalendar = lazy(() => import('./features/calendar/AssociationCalendar'));
const ChristmasTreePage = lazy(() => import('./features/events/ChristmasTreePage'));
const MyChristmasTreeArchiveModal = lazy(() =>
  import('./features/events/ChristmasTreePage').then((m) => ({ default: m.MyChristmasTreeArchiveModal }))
);
const LoyKrathongPage = lazy(() => import('./features/events/LoyKrathongPage'));

const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-10 text-sky-400 gap-2.5">
    <div className="w-7 h-7 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-mono tracking-wider">กำลังโหลดหน้าเว็บ...</span>
  </div>
);

export default function App() {
  const { users, activeMembers, isUsersLoaded, autoLoginAttempted, currentUser, setCurrentUser, signOut, getAuthor } = useAuth();
  const { openAppMenu, openGuestPrompt, openMemberProfile } = useUI();

  const todayStr = getGameDateStr();

  // Routing & Layout States
  const [currentView, setCurrentView] = useState('home');
  const [authMode, setAuthMode] = useState('signin');
  const [activeTool, setActiveTool] = useState(null);
  const [activeGameTab, setActiveGameTab] = useState(null);
  const [sharedPostId, setSharedPostId] = useState(null);
  const [sharedTreeCode, setSharedTreeCode] = useState(null);
  const [activeRoom, setActiveRoom] = useState({ type: 'channel', id: 'global-lobby' });
  const [navPill, setNavPill] = useState({ left: 4, width: 0 });
  const navRef = useRef(null);

  // Header & Overlays
  const [profMenuOpen, setProfMenuOpen] = useState(false);
  const [editProf, setEditProf] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showGuestBar, setShowGuestBar] = useState(true);
  const [showGuestGuide, setShowGuestGuide] = useState(false);
  const [guestFbOpen, setGuestFbOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showXmasArchive, setShowXmasArchive] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);

  // Seasonal Themes & Effects
  const [themePreview, setThemePreview] = useState('auto');
  const [xmasPreviewUnlock, setXmasPreviewUnlock] = useState(false);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [lanternEnabled, setLanternEnabled] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [cursedUserId, setCursedUserId] = useState(null);
  const [scareTriggered, setScareTriggered] = useState(false);

  const IS_HALLOWEEN = themePreview === 'halloween' || (themePreview === 'auto' && checkIsHalloween());
  const IS_LOY_KRATHONG = themePreview === 'loykrathong' || (themePreview === 'auto' && checkIsLoyKrathong());
  const IS_CHRISTMAS = themePreview === 'christmas' || (themePreview === 'auto' && checkIsChristmas());

  // Firestore Data States
  const [posts, setPosts] = useState([]);
  const [channels, setChannels] = useState(DEF_CH);
  const [groups, setGroups] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingStatuses, setTypingStatuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bmaEvents, setBmaEvents] = useState([]);
  const [guestStats, setGuestStats] = useState({ totalVisits: 0, uniqueVisitors: 0, daily: {}, lastVisitAt: 0 });
  const [guestFeedbacks, setGuestFeedbacks] = useState([]);
  const [myXmasTrees, setMyXmasTrees] = useState([]);

  // Board / Post States
  const [searchQ, setSearchQ] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterLatestOnly, setFilterLatestOnly] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [visiblePosts, setVisiblePosts] = useState(10);
  const [postMenu, setPostMenu] = useState(null);
  const [cInputs, setCInputs] = useState({});
  const [repComm, setRepComm] = useState({});
  const [, setCommMenu] = useState(null);

  // Create / Edit Post Modal States
  const [createPost, setCreatePost] = useState(false);
  const [editPostData, setEditPostData] = useState(null);
  const [pTitle, setPTitle] = useState('');
  const [pCont, setPCont] = useState('');
  const [pGuest, setPGuest] = useState(false);
  const [pPinned, setPPinned] = useState(false);
  const [pAtts, setPAtts] = useState([]);
  const [pTags, setPTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);
  const [pollAnon, setPollAnon] = useState(false);
  const [pollClose, setPollClose] = useState('');
  const [isQA, setIsQA] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(false);

  // Notifications, Toasts & Mute
  const [toasts, setToasts] = useState([]);
  const [muteModalTarget, setMuteModalTarget] = useState(null);
  const [pushPerm, setPushPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'));
  const shownNotifsRef = useRef(new Set());
  const notifInitRef = useRef(false);

  // Visual Particles (Static Memoized)
  const xmasSnowflakes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: ((i * 3.7 + (i % 5) * 2.1) % 98).toFixed(1),
        size: 8 + (i % 4) * 4,
        dur: 9 + (i % 7) * 2.1,
        delay: -(i * 0.9),
        drift: `${(i % 2 === 0 ? 1 : -1) * (18 + (i % 4) * 12)}px`
      })),
    []
  );

  const loyLanterns = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: ((i * 6.3 + (i % 3) * 2.7) % 96).toFixed(1),
        size: 16 + (i % 4) * 5,
        dur: 14 + (i % 6) * 2.5,
        delay: -(i * 1.4),
        drift: `${(i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 14)}px`
      })),
    []
  );

  // Derived Values
  const allTags = useMemo(
    () => Array.from(new Set([...PRESET_TAGS, ...users.flatMap((u) => getTags(u))])),
    [users]
  );

  const allPostTags = useMemo(() => {
    const counts = {};
    posts.forEach((p) => (p.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [posts]);

  const myGroups = useMemo(
    () => (currentUser ? groups.filter((g) => (g.members || []).includes(currentUser.id)) : []),
    [groups, currentUser]
  );

  const myArchivedXmasTrees = useMemo(() => {
    const isPreview = currentUser?.role === 'admin' && xmasPreviewUnlock;
    return myXmasTrees
      .filter((t) => isPreview || isXmasSeasonPassed(t.year))
      .sort((a, b) => b.year - a.year);
  }, [myXmasTrees, currentUser, xmasPreviewUnlock]);

  const changeViewWithTransition = useCallback((view) => {
    setProfMenuOpen(false);
    setBoardMenuOpen(false);
    setCurrentView(view);
  }, []);

  const openTool = useCallback((toolId) => {
    setActiveTool(toolId);
    const url = new URL(window.location.href);
    if (toolId) url.searchParams.set('tool', toolId);
    else url.searchParams.delete('tool');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const openXmasTreeByCode = useCallback((code) => {
    setSharedTreeCode(code || null);
    changeViewWithTransition('xmas_tree');
  }, [changeViewWithTransition]);

  // 1. Parse URL Query Params on Load (?qr=, ?post=, ?tool=, ?tree=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get('qr');
    const postId = params.get('post');
    const toolId = params.get('tool');
    const treeCode = params.get('tree');

    if (qrId) {
      db.collection('bma_qrcodes').doc(qrId).get().then(async (doc) => {
        if (!doc.exists) return alert('QR Code นี้ไม่ถูกต้องหรือถูกลบไปแล้ว');
        const data = doc.data();
        if (data.expiresAt && Date.now() > data.expiresAt) return alert('QR Code นี้หมดอายุแล้ว');
        if (data.scanLimit && (data.scans || 0) >= data.scanLimit) return alert('QR Code นี้ถูกสแกนครบจำนวนที่กำหนดแล้ว');
        const cleanTarget = safeUrl(data.target);
        if (!cleanTarget || !/^https?:\/\//i.test(cleanTarget)) {
          return alert('ลิงก์ปลายทางของ QR Code ไม่ปลอดภัย ระบบยกเลิกการเปิดลิงก์');
        }
        await db.collection('bma_qrcodes').doc(qrId).update({ scans: FieldValue.increment(1) }).catch(() => {});
        window.location.replace(cleanTarget);
      }).catch(() => {});
      return;
    }

    if (postId) {
      setSharedPostId(postId);
      setCurrentView('single_post');
    } else if (toolId) {
      setActiveTool(toolId);
      setCurrentView('tools');
    } else if (treeCode) {
      setSharedTreeCode(treeCode.trim().toUpperCase());
      setCurrentView('xmas_tree');
    }
  }, []);

  // 2. Sync Body Theme Classes & Seasonal Side Effects
  useEffect(() => {
    document.body.classList.toggle('halloween-theme', IS_HALLOWEEN);
    document.body.classList.toggle('loykrathong-theme', IS_LOY_KRATHONG);
    document.body.classList.toggle('christmas-theme', IS_CHRISTMAS);
    return () => {
      document.body.classList.remove('halloween-theme', 'loykrathong-theme', 'christmas-theme');
    };
  }, [IS_HALLOWEEN, IS_LOY_KRATHONG, IS_CHRISTMAS]);

  useEffect(() => {
    if (IS_LOY_KRATHONG && !sessionStorage.getItem('bma_loykrathong_seen')) {
      setShowWelcome(true);
    }
  }, [IS_LOY_KRATHONG]);

  useEffect(() => {
    if (!IS_HALLOWEEN) {
      setCursedUserId(null);
      return;
    }
    const year = getBkkNow().getFullYear();
    const docRef = db.collection('bma_system').doc(`halloween_curse_${year}`);
    return docRef.onSnapshot((doc) => {
      if (doc.exists && doc.data()?.cursedUserId) {
        setCursedUserId(doc.data().cursedUserId);
      } else if (activeMembers.length > 0) {
        const randId = activeMembers[Math.floor(Math.random() * activeMembers.length)].id;
        docRef.set({ cursedUserId: randId, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      }
    }, () => {});
  }, [IS_HALLOWEEN, activeMembers.length]);

  // 3. Measure Nav Pill Indicator
  useEffect(() => {
    const updatePill = () => {
      const el = document.getElementById('nav-' + currentView);
      if (el) {
        setNavPill((prev) =>
          prev.left === el.offsetLeft && prev.width === el.offsetWidth
            ? prev
            : { left: el.offsetLeft, width: el.offsetWidth }
        );
      } else {
        setNavPill((prev) => (prev.width === 0 ? prev : { left: 4, width: 0 }));
      }
    };

    updatePill();
    const rafId = requestAnimationFrame(updatePill);
    const t1 = setTimeout(updatePill, 150);
    const t2 = setTimeout(updatePill, 350);

    const navEl = navRef.current;
    let ro = null;
    if (navEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updatePill);
      ro.observe(navEl);
      navEl.querySelectorAll('button').forEach((btn) => ro.observe(btn));
    }

    const onTransitionEnd = (e) => {
      if (e.target !== navEl) updatePill();
    };
    navEl?.addEventListener('transitionend', onTransitionEnd);
    window.addEventListener('resize', updatePill);
    document.fonts?.ready?.then(updatePill);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      navEl?.removeEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('resize', updatePill);
    };
  }, [currentView, currentUser?.id, currentUser?.role]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const closeMenu = () => setProfMenuOpen(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // 4. Conditional Firestore Listeners (ประหยัดแบนด์วิดท์และไม่บล็อกหน้าแรก)
  const shouldLoadPosts = Boolean(currentUser || ['feed', 'bookmarks', 'single_post', 'admin'].includes(currentView));
  useEffect(() => {
    if (!shouldLoadPosts) return;
    return db.collection('bma_posts')
      .orderBy('timestamp', 'desc')
      .limit(150)
      .onSnapshot((s) => setPosts(s.docs.map((d) => d.data())), () => {});
  }, [shouldLoadPosts]);

  const shouldLoadChannels = Boolean(currentUser || currentView === 'chat');
  useEffect(() => {
    if (!shouldLoadChannels) return;
    const unsubCh = db.collection('bma_channels').onSnapshot((s) => {
      const l = s.docs.map((d) => d.data());
      if (l.length === 0) {
        DEF_CH.forEach((c) => db.collection('bma_channels').doc(c.id).set(c).catch(() => {}));
        setChannels(DEF_CH);
      } else {
        setChannels(l.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
      }
    }, () => {});
    const unsubGrp = db.collection('bma_groups').onSnapshot((s) => {
      setGroups(s.docs.map((d) => d.data()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, () => {});
    return () => { unsubCh(); unsubGrp(); };
  }, [shouldLoadChannels]);

  const shouldLoadAllChat = Boolean(currentUser);
  const shouldLoadDjChatGuest = Boolean(!currentUser && currentView === 'discjam');
  useEffect(() => {
    if (shouldLoadAllChat) {
      return db.collection('bma_messages')
        .orderBy('timestamp', 'desc')
        .limit(400)
        .onSnapshot((s) => {
          setChatMessages(s.docs.map((d) => d.data()).sort((a, b) => getMs(a) - getMs(b)));
        }, () => {});
    }
    if (shouldLoadDjChatGuest) {
      return db.collection('bma_messages')
        .where('roomKey', '==', 'global-discjam')
        .limit(80)
        .onSnapshot((s) => {
          setChatMessages(s.docs.map((d) => d.data()).sort((a, b) => getMs(a) - getMs(b)));
        }, () => {});
    }
  }, [shouldLoadAllChat, shouldLoadDjChatGuest]);

  useEffect(() => {
    if (!currentUser || currentView !== 'chat') return;
    return db.collection('bma_typing').onSnapshot((s) => {
      const now = Date.now();
      setTypingStatuses(s.docs.map((d) => d.data()).filter((t) => t.isTyping && now - (t.updatedAt || 0) < 5000));
    }, () => {});
  }, [currentUser, currentView]);

  useEffect(() => {
    if (!currentUser) { setNotifications([]); return; }
    return db.collection('bma_notifications')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .onSnapshot((s) => setNotifications(s.docs.map((d) => d.data())), () => {});
  }, [currentUser]);

  const shouldLoadEvents = Boolean(showCalendar || currentView === 'admin' || currentView === 'chat');
  useEffect(() => {
    if (!shouldLoadEvents) return;
    return db.collection('bma_events').onSnapshot((s) => setBmaEvents(s.docs.map((d) => d.data())), () => {});
  }, [shouldLoadEvents]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    const unsubStats = db.collection('bma_system').doc('guest_stats').onSnapshot((doc) => {
      if (doc.exists) setGuestStats(doc.data());
    }, () => {});
    const unsubFb = db.collection('bma_guest_feedback')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .onSnapshot((s) => setGuestFeedbacks(s.docs.map((d) => d.data())), () => {});
    return () => { unsubStats(); unsubFb(); };
  }, [currentUser?.role]);

  useEffect(() => {
    if (!currentUser) { setMyXmasTrees([]); return; }
    return db.collection('bma_xmas_trees')
      .where('ownerId', '==', currentUser.id)
      .onSnapshot((s) => setMyXmasTrees(s.docs.map((d) => d.data())), () => {});
  }, [currentUser]);

  // Guest Visit Counter (1 ครั้งต่อ Session)
  useEffect(() => {
    if (!autoLoginAttempted || currentUser) return;
    try {
      if (sessionStorage.getItem('tbma_guest_visit_counted')) return;
      sessionStorage.setItem('tbma_guest_visit_counted', '1');
      const isUnique = !localStorage.getItem('tbma_guest_ever_visited');
      if (isUnique) localStorage.setItem('tbma_guest_ever_visited', '1');
      const bkk = getBkkNow();
      const dayKey = `${bkk.getFullYear()}-${String(bkk.getMonth() + 1).padStart(2, '0')}-${String(bkk.getDate()).padStart(2, '0')}`;
      const payload = {
        totalVisits: FieldValue.increment(1),
        lastVisitAt: Date.now(),
        [`daily.${dayKey}`]: FieldValue.increment(1)
      };
      if (isUnique) payload.uniqueVisitors = FieldValue.increment(1);
      db.collection('bma_system').doc('guest_stats').set(payload, { merge: true }).catch(() => {});
    } catch {}
  }, [autoLoginAttempted, currentUser]);

  // 5. Mute & Notification System
  const getMuteExp = useCallback((key) => {
    const map = currentUser?.mutedTargets || {};
    return map[key] ?? null;
  }, [currentUser]);

  const isTargetMuted = useCallback((key) => {
    const exp = getMuteExp(key);
    if (exp === -1) return true;
    return typeof exp === 'number' && exp > Date.now();
  }, [getMuteExp]);

  const handleSetTargetMute = async (key, expiresAt) => {
    if (!currentUser) return;
    const nextMap = { ...(currentUser.mutedTargets || {}) };
    if (expiresAt === null) delete nextMap[key];
    else nextMap[key] = expiresAt;
    setCurrentUser((prev) => (prev ? { ...prev, mutedTargets: nextMap } : prev));
    await db.collection('bma_users').doc(currentUser.id).update({ mutedTargets: nextMap }).catch(() => {});
    setMuteModalTarget(null);
  };

  const sendNotif = useCallback(async ({ recipientId, actorId, category, subType, title, body, targetView, targetPostId = null, targetRoomType = null, targetRoomId = null }) => {
    if (!recipientId || recipientId === actorId) return;
    const id = 'nf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    await db.collection('bma_notifications').doc(id).set({
      id,
      recipientId,
      actorId,
      category,
      subType,
      title,
      body: String(body || '').slice(0, 160),
      targetView,
      targetPostId,
      targetRoomType,
      targetRoomId,
      readBy: [],
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      serverCreatedAt: svrTs()
    }).catch(() => {});
  }, []);

  const myNotifs = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter((n) => {
      if (n.actorId === currentUser.id) return false;
      if (n.recipientId !== 'ALL' && n.recipientId !== currentUser.id) return false;
      if (n.targetPostId && isTargetMuted('post:' + n.targetPostId)) return false;
      if (n.targetRoomType && n.targetRoomId && isTargetMuted(`${n.targetRoomType}:${n.targetRoomId}`)) return false;
      return true;
    });
  }, [notifications, currentUser, isTargetMuted]);

  const unreadNotifs = useMemo(
    () => myNotifs.filter((n) => !(n.readBy || []).includes(currentUser?.id)),
    [myNotifs, currentUser?.id]
  );

  // Toast & Browser Push Notification for Incoming Unread
  useEffect(() => {
    if (!currentUser) {
      notifInitRef.current = false;
      shownNotifsRef.current.clear();
      return;
    }
    if (!notifInitRef.current) {
      myNotifs.forEach((n) => shownNotifsRef.current.add(n.id));
      notifInitRef.current = true;
      return;
    }
    unreadNotifs.forEach((n) => {
      if (shownNotifsRef.current.has(n.id)) return;
      shownNotifsRef.current.add(n.id);
      if (Date.now() - getMs(n) > 30000) return;

      setToasts((prev) => [n, ...prev].slice(0, 3));
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== n.id)), 5000);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        try {
          new Notification(n.title, { body: n.body, icon: '/tbmalogo.png' });
        } catch {}
      }
    });
  }, [myNotifs, unreadNotifs, currentUser]);

  // Christmas Dec 25+ Mention Alert
  useEffect(() => {
    if (!currentUser) return;
    const year = getBkkNow().getFullYear();
    const unlocked = isXmasMidnightUnlocked(year) || (currentUser.role === 'admin' && xmasPreviewUnlock);
    if (!unlocked) return;
    const seenKey = `tbma_xmas_mention_notified_${year}_${currentUser.id}`;
    if (localStorage.getItem(seenKey)) return;

    db.collection('bma_xmas_ornaments')
      .where('treeCode', '==', `assoc_${year}`)
      .get()
      .then((snap) => {
        const hit = snap.docs.map((d) => d.data()).filter((o) => o.senderId !== currentUser.id && doesOrnamentMentionUser(o, currentUser));
        if (hit.length > 0) {
          localStorage.setItem(seenKey, '1');
          sendNotif({
            recipientId: currentUser.id,
            actorId: 'SYSTEM',
            category: 'posts',
            subType: 'xmas_mention',
            title: `🎄 มีคำอวยพรคริสต์มาสแท็กถึงคุณ (${hit.length} ชิ้น)`,
            body: 'เปิดดูคำอวยพรบนต้นคริสต์มาสสมาคมได้แล้ววันนี้!',
            targetView: 'xmas_tree'
          });
        }
      })
      .catch(() => {});
  }, [currentUser, xmasPreviewUnlock, sendNotif]);

  // 6. Post & Comment Handlers
  const jumpToPost = useCallback((postId) => {
    setSearchQ('');
    setTagFilter('ALL');
    setFilterType('ALL');
    setFilterLatestOnly(false);
    setVisiblePosts(150);
    setCurrentView('feed');
    setTimeout(() => {
      document.getElementById('post-' + postId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }, []);

  const openCreatePostModal = () => {
    setEditPostData(null);
    try {
      const saved = JSON.parse(localStorage.getItem('tbma_post_draft') || 'null');
      if (saved && (saved.title || saved.content)) {
        setPTitle(saved.title || '');
        setPCont(saved.content || '');
        setPTags(saved.tags || []);
      } else {
        setPTitle(''); setPCont(''); setPTags([]);
      }
    } catch {
      setPTitle(''); setPCont(''); setPTags([]);
    }
    setPGuest(false); setPPinned(false); setPAtts([]); setHasPoll(false);
    setPollQ(''); setPollOpts(['', '']); setPollAnon(false); setPollClose('');
    setIsQA(false); setIsSpoiler(false);
    setCreatePost(true);
  };

  const handleEditPostReq = (post) => {
    setEditPostData(post);
    setPTitle(post.title || '');
    setPCont(post.content || '');
    setPGuest(Boolean(post.isGuestAllowed));
    setPPinned(Boolean(post.isPinned));
    setPAtts(post.attachments || []);
    setPTags(post.tags || []);
    setIsQA(Boolean(post.isQA));
    setIsSpoiler(Boolean(post.isSpoiler));
    if (post.poll) {
      setHasPoll(true);
      setPollQ(post.poll.question || '');
      setPollOpts((post.poll.options || []).map((o) => o.text));
      setPollAnon(Boolean(post.poll.isAnonymous));
      setPollClose(post.poll.closesAt ? new Date(post.poll.closesAt).toISOString().slice(0, 16) : '');
    } else {
      setHasPoll(false); setPollQ(''); setPollOpts(['', '']); setPollAnon(false); setPollClose('');
    }
    setCreatePost(true);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem('tbma_post_draft', JSON.stringify({ title: pTitle, content: pCont, tags: pTags }));
      alert('บันทึกฉบับร่างไว้ในเครื่องเรียบร้อยแล้ว');
    } catch {}
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!pTitle.trim() && !pCont.trim() && pAtts.length === 0 && !hasPoll) {
      return alert('กรุณากรอกเนื้อหาหรือแนบไฟล์อย่างน้อย 1 อย่าง');
    }

    const pollData = hasPoll && pollQ.trim()
      ? {
          question: pollQ.trim(),
          isAnonymous: pollAnon,
          closesAt: pollClose ? new Date(pollClose).getTime() : null,
          options: pollOpts
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text, idx) => ({
              id: editPostData?.poll?.options?.[idx]?.id || ('opt-' + Date.now() + '-' + idx),
              text,
              votes: editPostData?.poll?.options?.[idx]?.votes || []
            }))
        }
      : null;

    if (editPostData) {
      await db.collection('bma_posts').doc(editPostData.id).update({
        title: pTitle.trim(),
        content: pCont.trim(),
        isGuestAllowed: pGuest,
        isPinned: currentUser.role !== 'member' ? pPinned : Boolean(editPostData.isPinned),
        attachments: pAtts,
        tags: pTags,
        poll: pollData,
        isQA,
        isSpoiler,
        isEdited: true
      });
    } else {
      const now = Date.now();
      const postId = 'post-' + now;
      await db.collection('bma_posts').doc(postId).set({
        id: postId,
        authorId: currentUser.id,
        title: pTitle.trim(),
        content: pCont.trim(),
        isGuestAllowed: pGuest,
        isPinned: currentUser.role !== 'member' ? pPinned : false,
        attachments: pAtts,
        tags: pTags,
        poll: pollData,
        isQA,
        isSpoiler,
        readBy: [currentUser.id],
        createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        timestamp: now,
        serverCreatedAt: svrTs(),
        likes: [],
        bookmarks: [],
        comments: []
      });

      // แจ้งเตือนลงห้อง announcements
      const alertId = 'msg-' + (now + 1);
      await db.collection('bma_messages').doc(alertId).set({
        id: alertId,
        roomKey: 'global-announce',
        senderId: currentUser.id,
        text: `${currentUser.displayName} ได้โพสต์ใหม่ลงกระดาน`,
        postTitle: pTitle.trim() || pCont.trim().slice(0, 60),
        linkedPostId: postId,
        isSystemPostAlert: true,
        readBy: [currentUser.id],
        isDeleted: false,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now + 1,
        serverCreatedAt: svrTs()
      }).catch(() => {});

      await sendNotif({
        recipientId: 'ALL',
        actorId: currentUser.id,
        category: 'posts',
        subType: 'new_post',
        title: `📝 โพสต์ใหม่จาก ${currentUser.displayName}`,
        body: pTitle.trim() || pCont.trim().slice(0, 80) || '[สื่อแนบ]',
        targetView: 'feed',
        targetPostId: postId
      });

      try { localStorage.removeItem('tbma_post_draft'); } catch {}
    }

    setCreatePost(false);
    setEditPostData(null);
    setPTitle(''); setPCont(''); setPAtts([]); setPTags([]); setHasPoll(false);
  };

  const handleAddComment = async (postId, extraAtt = null) => {
    if (!currentUser) return;
    const text = (cInputs[postId] || '').trim();
    if (!text && !extraAtt) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const rep = repComm[postId] || null;
    const newC = {
      id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
      authorId: currentUser.id,
      text: extraAtt && !text ? '' : text,
      attachments: extraAtt ? [extraAtt] : [],
      parentId: rep ? rep.id : null,
      replyTo: rep ? { id: rep.id, authorId: rep.authorId } : null,
      likes: [],
      reactions: {},
      createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    await db.collection('bma_posts').doc(postId).update({
      comments: [...(post.comments || []), newC]
    });

    if (!extraAtt) setCInputs((prev) => ({ ...prev, [postId]: '' }));
    setRepComm((prev) => ({ ...prev, [postId]: null }));

    if (post.authorId !== currentUser.id) {
      await sendNotif({
        recipientId: post.authorId,
        actorId: currentUser.id,
        category: 'posts',
        subType: 'post_comment',
        title: `💬 ${currentUser.displayName} แสดงความคิดเห็นในโพสต์ของคุณ`,
        body: text || '[แนบสื่อ]',
        targetView: 'feed',
        targetPostId: postId
      });
    }
    if (rep && rep.authorId !== currentUser.id && rep.authorId !== post.authorId) {
      await sendNotif({
        recipientId: rep.authorId,
        actorId: currentUser.id,
        category: 'posts',
        subType: 'comment_reply',
        title: `↩️ ${currentUser.displayName} ตอบกลับความคิดเห็นของคุณ`,
        body: text || '[แนบสื่อ]',
        targetView: 'feed',
        targetPostId: postId
      });
    }
  };

  const toggleCommLike = async (postId, commId) => {
    if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อกดถูกใจความคิดเห็น');
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const next = (post.comments || []).map((c) => {
      if (c.id !== commId) return c;
      const likes = c.likes || [];
      return { ...c, likes: likes.includes(currentUser.id) ? likes.filter((x) => x !== currentUser.id) : [...likes, currentUser.id] };
    });
    await db.collection('bma_posts').doc(postId).update({ comments: next });
  };

  const toggleCommReact = async (postId, commId, emoji) => {
    if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อกดแสดงความรู้สึก');
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const next = (post.comments || []).map((c) => {
      if (c.id !== commId) return c;
      const reacts = { ...(c.reactions || {}) };
      const arr = Array.isArray(reacts[emoji]) ? [...reacts[emoji]] : [];
      const updated = arr.includes(currentUser.id) ? arr.filter((id) => id !== currentUser.id) : [...arr, currentUser.id];
      if (updated.length > 0) reacts[emoji] = updated;
      else delete reacts[emoji];
      return { ...c, reactions: reacts };
    });
    await db.collection('bma_posts').doc(postId).update({ comments: next });
  };

  // Filtered Posts for Board / Bookmarks
  const filteredPosts = useMemo(() => {
    let list = posts.filter((p) => currentUser || p.isGuestAllowed);
    if (currentView === 'bookmarks' && currentUser) {
      list = list.filter((p) => (p.bookmarks || []).includes(currentUser.id));
    }
    if (tagFilter !== 'ALL') {
      list = list.filter((p) => getTags(getAuthor(p.authorId)).includes(tagFilter));
    }
    if (filterType === 'GAME') list = list.filter((p) => Boolean(p.dailyGameShare));
    else if (filterType === 'MEDIA') list = list.filter((p) => (p.attachments || []).length > 0);
    else if (filterType === 'NORMAL') list = list.filter((p) => !p.dailyGameShare);

    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter((p) => {
        const a = getAuthor(p.authorId);
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          String(p.authorId).toLowerCase() === q ||
          (a.displayName || '').toLowerCase().includes(q)
        );
      });
    }

    if (filterLatestOnly) {
      const seen = new Set();
      list = list.filter((p) => {
        if (seen.has(p.authorId)) return false;
        seen.add(p.authorId);
        return true;
      });
    }

    return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || getMs(b) - getMs(a));
  }, [posts, currentUser, currentView, tagFilter, filterType, searchQ, filterLatestOnly, getAuthor]);

  // 7. Share Handlers for Christmas & Loy Krathong
  const shareXmasTreeToBoard = async (treeMeta, count, note) => {
    if (!currentUser || !treeMeta) return;
    const now = Date.now();
    const postId = 'post-' + now;
    await db.collection('bma_posts').doc(postId).set({
      id: postId,
      authorId: currentUser.id,
      title: `🎄 มาแขวนคำอวยพรบนต้นคริสต์มาสของ ${treeMeta.ownerName} กัน!`,
      content: note || `มาแขวนของประดับและเขียนคำอวยพรส่งท้ายปีบนต้นคริสต์มาสของ ${treeMeta.ownerName} กันเถอะ!`,
      xmasTreeShare: { code: treeMeta.code, ownerName: treeMeta.ownerName, year: treeMeta.year, count },
      isGuestAllowed: true,
      tags: ['Christmas'],
      attachments: [],
      likes: [],
      bookmarks: [],
      comments: [],
      createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timestamp: now,
      serverCreatedAt: svrTs()
    });
    alert('แชร์ต้นคริสต์มาสลงกระดานโพสต์แล้ว!');
    changeViewWithTransition('feed');
  };

  const shareXmasTreeToChat = async (treeMeta, count, roomId, note) => {
    if (!currentUser || !treeMeta) return;
    const now = Date.now();
    const mid = 'msg-' + now + '-' + Math.random().toString(36).slice(2, 5);
    const isGrp = myGroups.some((g) => g.id === roomId);
    await db.collection('bma_messages').doc(mid).set({
      id: mid,
      roomKey: roomId || 'global-lobby',
      senderId: currentUser.id,
      receiverId: null,
      text: note || `🎄 มาแขวนคำอวยพรบนต้นคริสต์มาสของ ${treeMeta.ownerName} กัน!`,
      xmasTreeShare: { code: treeMeta.code, ownerName: treeMeta.ownerName, year: treeMeta.year, count },
      attachments: [],
      likes: [],
      readBy: [currentUser.id],
      isEdited: false,
      isDeleted: false,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now,
      serverCreatedAt: svrTs()
    });
    alert('ส่งต้นคริสต์มาสเข้าห้องแชตแล้ว!');
    setActiveRoom({ type: isGrp ? 'group' : 'channel', id: roomId || 'global-lobby' });
    changeViewWithTransition('chat');
  };

  const shareSiemsiToBoard = async (fortune, krathongDesign, note) => {
    if (!currentUser || !fortune) return;
    const now = Date.now();
    const postId = 'post-' + now;
    await db.collection('bma_posts').doc(postId).set({
      id: postId,
      authorId: currentUser.id,
      title: `🎋 เซียมซีใบที่ ${fortune.num} (${fortune.tier}) — คืนวันลอยกระทง`,
      content: note || `ได้เซียมซีใบที่ ${fortune.num} "${fortune.title}" พร้อมกระทง DIY ของฉัน!`,
      loySiemsiShare: { ...fortune, krathong: krathongDesign, ownerName: currentUser.displayName },
      isGuestAllowed: true,
      tags: ['LoyKrathong'],
      attachments: [],
      likes: [],
      bookmarks: [],
      comments: [],
      createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timestamp: now,
      serverCreatedAt: svrTs()
    });
    alert('แชร์ผลเซียมซีลงกระดานโพสต์แล้ว!');
    changeViewWithTransition('feed');
  };

  const shareSiemsiToChat = async (fortune, krathongDesign, roomId) => {
    if (!currentUser || !fortune) return;
    const now = Date.now();
    const mid = 'msg-' + now + '-' + Math.random().toString(36).slice(2, 5);
    const isGrp = myGroups.some((g) => g.id === roomId);
    await db.collection('bma_messages').doc(mid).set({
      id: mid,
      roomKey: roomId || 'global-lobby',
      senderId: currentUser.id,
      receiverId: null,
      text: `🎋 ได้เซียมซีใบที่ ${fortune.num} (${fortune.tier}) คืนวันลอยกระทง!`,
      loySiemsiShare: { ...fortune, krathong: krathongDesign, ownerName: currentUser.displayName },
      attachments: [],
      likes: [],
      readBy: [currentUser.id],
      isEdited: false,
      isDeleted: false,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now,
      serverCreatedAt: svrTs()
    });
    alert('ส่งผลเซียมซีเข้าห้องแชตแล้ว!');
    setActiveRoom({ type: isGrp ? 'group' : 'channel', id: roomId || 'global-lobby' });
    changeViewWithTransition('chat');
  };

  // 8. Member Context Menu & Mark Room As Read
  const openMemberMenu = (e, member, onInsertMention = null) => {
    if (!member) return;
    if (!currentUser) {
      e?.preventDefault?.();
      openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อดูตัวเลือกเพิ่มเติมของสมาชิก');
      return;
    }
    const items = [
      { icon: 'fas fa-user', label: 'ดูโปรไฟล์สมาชิก', accent: true, onClick: () => openMemberProfile(member) }
    ];
    if (member.id !== currentUser.id) {
      items.push({
        icon: 'fas fa-comment-dots',
        label: 'ส่งข้อความส่วนตัว (DM)',
        onClick: () => { setActiveRoom({ type: 'dm', id: member.id }); changeViewWithTransition('chat'); }
      });
    }
    if (onInsertMention) {
      items.push({ icon: 'fas fa-at', label: `แท็ก @${member.id} ในแชต`, onClick: () => onInsertMention('@' + member.id) });
    }
    items.push({ type: 'divider' });
    items.push({ icon: 'fas fa-id-badge', label: 'คัดลอก Member ID', sub: member.id, onClick: () => navigator.clipboard.writeText(member.id) });
    items.push({
      icon: 'fas fa-clipboard-list',
      label: 'ดูโพสต์ทั้งหมดของคนนี้',
      onClick: () => { setSearchQ(member.id); changeViewWithTransition('feed'); }
    });
    if (member.id !== currentUser.id) {
      const mKey = 'dm:' + member.id;
      const muted = isTargetMuted(mKey);
      items.push({ type: 'divider' });
      items.push({
        icon: muted ? 'fas fa-bell' : 'fas fa-bell-slash',
        label: muted ? 'ตั้งค่า / เปิดแจ้งเตือน DM นี้' : 'ปิดการแจ้งเตือนแชตกับคนนี้...',
        onClick: () => setMuteModalTarget({ key: mKey, label: `แชตส่วนตัวกับ ${member.displayName}` })
      });
    }
    openAppMenu(e, {
      header: { icon: 'fas fa-user-astronaut', title: member.displayName, sub: `${member.id} • @${member.username}` },
      items
    });
  };

  const markRoomAsRead = (roomType, roomId) => {
    if (!currentUser) return;
    const rk = roomType === 'dm' ? 'dm_' + [currentUser.id, roomId].sort().join('_') : roomId;
    chatMessages
      .filter((m) => m.roomKey === rk && m.senderId !== currentUser.id && !(m.readBy || []).includes(currentUser.id))
      .forEach((m) => {
        db.collection('bma_messages').doc(m.id).update({
          readBy: Array.from(new Set([...(m.readBy || []), currentUser.id]))
        }).catch(() => {});
      });
  };

  const isAuthLoading = !isUsersLoaded || !autoLoginAttempted;

  return (
    <div className={`min-h-screen h-screen flex flex-col bg-[#050811] text-white overflow-hidden relative ${IS_HALLOWEEN ? 'halloween-theme' : ''} ${IS_LOY_KRATHONG ? 'loykrathong-theme' : ''} ${IS_CHRISTMAS ? 'christmas-theme' : ''}`}>
      {/* CHRISTMAS SNOWFLAKES LAYER */}
      {IS_CHRISTMAS && snowEnabled && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          {xmasSnowflakes.map((f) => (
            <div
              key={f.id}
              className="xmas-snowflake text-sky-100/75"
              style={{ left: `${f.left}vw`, '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, '--drift': f.drift }}
            >
              <svg width={f.size} height={f.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="3.3" y1="7" x2="20.7" y2="17" />
                <line x1="20.7" y1="7" x2="3.3" y2="17" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* LOY KRATHONG YEE PENG LANTERNS LAYER */}
      {IS_LOY_KRATHONG && lanternEnabled && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          {loyLanterns.map((l) => (
            <div
              key={l.id}
              className="loy-lantern"
              style={{ left: `${l.left}vw`, '--ldur': `${l.dur}s`, '--ldelay': `${l.delay}s`, '--ldrift': l.drift }}
            >
              <svg width={l.size} height={l.size * 1.35} viewBox="0 0 28 38" fill="none">
                <defs>
                  <radialGradient id={`loyGlow-${l.id}`} cx="50%" cy="65%" r="55%">
                    <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="14" cy="18" rx="11" ry="14" fill={`url(#loyGlow-${l.id})`} opacity="0.9" />
                <path d="M5 10 Q14 2 23 10 L20 30 Q14 33 8 30 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" opacity="0.82" />
                <ellipse cx="14" cy="27" rx="4.5" ry="3.5" fill="#FEF9C3" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* WELCOME OVERLAY (Loy Krathong) */}
      {showWelcome && (
        <div id="welcome-overlay" className="fixed inset-0 bg-[#040914]/95 backdrop-blur-md z-[1000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-gradient-to-b from-[#0A162C] to-[#040914] border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-5 animate-fade-in">
            <div className="full-moon"></div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">✨ The Blue Moon Association ✨</div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">สุขสันต์วันลอยกระทง</h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                ร่วมแต่งกระทง DIY ลอยในแม่น้ำรวมกับทุกคน เสี่ยงเซียมซี 24 ใบพร้อมแชร์ภาพสตอรี่คู่กระทง และเล่นมินิเกมรักษ์สายน้ำ
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => { setShowWelcome(false); sessionStorage.setItem('bma_loykrathong_seen', 'true'); changeViewWithTransition('loy_krathong'); }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-[#040914] font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.45)] hover:scale-[1.02] transition-transform"
              >
                🪷 เข้าสู่กิจกรรมวันลอยกระทง
              </button>
              <button
                type="button"
                onClick={() => { setShowWelcome(false); sessionStorage.setItem('bma_loykrathong_seen', 'true'); }}
                className="w-full py-2.5 rounded-2xl bg-[#040914] border border-amber-500/40 text-amber-200 hover:bg-[#13284C] font-bold text-xs transition-colors"
              >
                เข้าสู่เว็บไซต์หลัก
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthLoading && (
        <div className="fixed inset-0 z-[200] bg-[#050811] flex items-center justify-center text-sky-400 font-bold animate-pulse">
          กำลังเชื่อมต่อ...
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed top-16 right-4 z-50 space-y-2 w-80 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              setNotifOpen(false);
              if (t.targetPostId) jumpToPost(t.targetPostId);
              else if (t.targetRoomType) { setActiveRoom({ type: t.targetRoomType, id: t.targetRoomId }); changeViewWithTransition('chat'); }
              else if (t.targetView) changeViewWithTransition(t.targetView);
              setToasts((p) => p.filter((x) => x.id !== t.id));
            }}
            className="pointer-events-auto cursor-pointer bg-[#0F2547] border-2 border-white/80 rounded-2xl p-3 shadow-2xl text-xs"
          >
            <div className="flex justify-between font-bold text-amber-300">
              <span>{t.title}</span>
              <span>{getTimeStr(t)}</span>
            </div>
            <p className="line-clamp-2 mt-0.5">{t.body}</p>
          </div>
        ))}
      </div>

      {/* HEADER NAV */}
      <header className="sticky top-0 z-40 bg-[#070C18]/95 backdrop-blur-md border-b border-[#1E3A5F] shrink-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-1 sm:gap-2 overflow-visible">
          <button type="button" onClick={() => changeViewWithTransition('home')} className="flex items-center gap-2 text-left shrink-0">
            <Logo s={32} />
            <div className="hidden lg:block">
              <h1 className="text-sm font-bold uppercase">The Blue Moon</h1>
              <p className="text-[10px] text-slate-400 uppercase">Association</p>
            </div>
          </button>

          <nav ref={navRef} className="relative flex items-center justify-start md:justify-center gap-1 bg-[#050811] border border-[#1E3A5F] rounded-full p-1 flex-1 md:flex-none md:mx-auto overflow-x-auto no-scrollbar mx-1 sm:mx-2">
            <div
              className="absolute inset-y-1 bg-white rounded-full transition-all duration-300 ease-out pointer-events-none hidden md:block"
              style={{ left: navPill.left, width: navPill.width }}
            />

            {[
              ['home', <i className="fas fa-home" key="i-home"></i>, 'Home'],
              ['feed', <i className="fas fa-clipboard-list" key="i-feed"></i>, 'Board'],
              ['chat', <i className="fas fa-comments" key="i-chat"></i>, 'Chat'],
              ['members', <i className="fas fa-users" key="i-mem"></i>, 'Members'],
              ['daily_game', <i className="fas fa-gamepad" key="i-game"></i>, 'Daily Game'],
              ['discjam', <i className="fas fa-compact-disc" key="i-dj"></i>, 'Disc Jam'],
              ['tools', <i className="fas fa-tools" key="i-tools"></i>, 'Tools']
            ].map(([v, icon, l]) => {
              const isLocked = !currentUser && v === 'chat';
              return (
                <button
                  id={'nav-' + v}
                  key={v}
                  type="button"
                  onClick={() => (isLocked ? openGuestPrompt('ห้องแชตและแชตเกมสงวนสิทธิ์สำหรับสมาชิกสมาคมเท่านั้น') : changeViewWithTransition(v))}
                  className={`group relative z-10 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center shrink-0 ${
                    currentView === v
                      ? 'text-[#050811] bg-white shadow-md md:bg-transparent md:shadow-none'
                      : isLocked
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-[#0F2547]/60'
                        : 'text-slate-300 hover:text-white hover:bg-[#0F2547]'
                  }`}
                  title={isLocked ? `${l} (เฉพาะสมาชิก)` : l}
                >
                  <span className="text-sm sm:text-base shrink-0 relative">
                    {icon}
                    {isLocked && <i className="fas fa-lock text-[8px] text-amber-400/90 absolute -top-1 -right-1.5"></i>}
                  </span>
                  <span className={`hidden md:flex overflow-hidden transition-all duration-300 items-center ${currentView === v ? 'max-w-[150px] opacity-100 ml-1.5' : 'max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-1.5'}`}>
                    {l}
                    {isLocked && <i className="fas fa-lock text-[9px] text-amber-400/80 ml-1.5"></i>}
                  </span>
                </button>
              );
            })}

            {currentUser?.role === 'admin' && (
              <button
                id="nav-admin"
                type="button"
                onClick={() => changeViewWithTransition('admin')}
                className={`group relative z-10 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center shrink-0 ${currentView === 'admin' ? 'text-[#050811] bg-white shadow-md md:bg-transparent md:shadow-none' : 'text-slate-300 hover:text-white hover:bg-[#0F2547]'}`}
              >
                <span className="text-sm sm:text-base shrink-0"><i className="fas fa-crown"></i></span>
                <span className={`hidden md:flex overflow-hidden transition-all duration-300 items-center ${currentView === 'admin' ? 'max-w-[150px] opacity-100 ml-1.5' : 'max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-1.5'}`}>Owner</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {IS_CHRISTMAS && (
              <button
                type="button"
                onClick={() => setSnowEnabled(!snowEnabled)}
                className={`btn-d text-xs px-2 sm:px-2.5 flex items-center gap-1 transition-colors ${snowEnabled ? 'text-sky-200 border-amber-500/60' : 'text-slate-500 opacity-70'}`}
                title={snowEnabled ? 'ปิดเอฟเฟกต์หิมะตก' : 'เปิดเอฟเฟกต์หิมะตก'}
              >
                <i className="fas fa-snowflake"></i>
              </button>
            )}

            {IS_LOY_KRATHONG && (
              <button
                type="button"
                onClick={() => setLanternEnabled(!lanternEnabled)}
                className={`btn-d text-xs px-2 sm:px-2.5 flex items-center gap-1 transition-colors ${lanternEnabled ? 'text-amber-300 border-amber-500/60' : 'text-slate-500 opacity-70'}`}
                title={lanternEnabled ? 'ปิดเอฟเฟกต์โคมลอย' : 'เปิดเอฟเฟกต์โคมลอย'}
              >
                <i className="fas fa-fire-alt"></i>
              </button>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(true);
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission().then((perm) => setPushPerm(perm));
                  }
                }}
                className="btn-d text-xs font-semibold flex items-center gap-1 px-2 sm:px-3"
              >
                <span>🔔</span>
                {unreadNotifs.length > 0 && <span className="px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{unreadNotifs.length}</span>}
              </button>
            )}

            {currentUser ? (
              <div className="relative flex items-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setProfMenuOpen(!profMenuOpen); }}
                  className="rounded-full border-2 border-sky-400 bg-[#0F2547] shadow-[0_0_10px_rgba(56,189,248,0.5)] shrink-0 hover:scale-110 transition-transform focus:outline-none flex items-center justify-center p-0.5"
                >
                  <Avatar user={currentUser} size="sm" showStatus={true} />
                </button>

                {profMenuOpen && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-3 w-64 bg-[#070C18] border border-[#1E3A5F] rounded-2xl p-5 z-50 shadow-2xl flex flex-col items-center animate-fade-in ring-1 ring-sky-500/30">
                    <Avatar user={currentUser} size="xl" showStatus={true} />
                    <h3 className="font-bold mt-3 text-white flex items-center justify-center gap-1.5 text-base w-full flex-wrap leading-tight">
                      {currentUser.displayName} <RoleBadge role={currentUser.role} />
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mb-3">@{currentUser.username}</p>
                    <TagBadges user={currentUser} />

                    <div className="w-full border-t border-[#1E3A5F] mt-4 pt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => { setProfMenuOpen(false); setEditProf(true); }}
                        className="w-full btn-b py-2 text-xs flex justify-center items-center gap-2 hover:bg-sky-600 transition-colors shadow"
                      >
                        <i className="fas fa-cog text-sm"></i> ตั้งค่าโปรไฟล์
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setProfMenuOpen(false);
                          await signOut();
                          changeViewWithTransition('home');
                        }}
                        className="w-full py-2 rounded-lg bg-red-950/40 text-red-400 font-bold border border-red-900/50 hover:bg-red-900 hover:text-white transition-colors text-xs flex justify-center items-center gap-2 shadow"
                      >
                        <i className="fas fa-sign-out-alt text-sm"></i> ออกจากระบบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); changeViewWithTransition('login'); }}
                className="btn-w text-xs px-3 py-1.5 sm:px-4 sm:py-2"
              >
                เข้าสู่ระบบ
              </button>
            )}
          </div>
        </div>

        {/* CHRISTMAS FAIRY LIGHTS STRING */}
        {IS_CHRISTMAS && (
          <div className="absolute left-0 right-0 -bottom-4 h-5 pointer-events-none overflow-hidden z-40" aria-hidden="true">
            <svg viewBox="0 0 1200 28" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,2 Q50,18 100,2 T200,2 T300,2 T400,2 T500,2 T600,2 T700,2 T800,2 T900,2 T1000,2 T1100,2 T1200,2" fill="none" stroke="rgba(217, 119, 6, 0.55)" strokeWidth="1.5" />
              {[50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150].map((cx, idx) => {
                const palette = ['#FDE68A', '#F43F5E', '#BAE6FD', '#34D399'];
                const color = palette[idx % palette.length];
                return (
                  <g key={cx} className={idx % 2 === 0 ? 'fairy-bulb-a' : 'fairy-bulb-b'} style={{ color }}>
                    <rect x={cx - 2} y="9" width="4" height="3" rx="1" fill="#92400E" />
                    <circle cx={cx} cy="15" r="4" fill={color} />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </header>

      {/* Owner Theme Preview Bar */}
      {currentUser?.role === 'admin' && themePreview !== 'auto' && (
        <div className="bg-amber-400 text-[#050811] px-3 py-1 text-[11px] font-bold shrink-0 z-40 flex items-center justify-between gap-2">
          <span className="truncate">
            <i className="fas fa-palette mr-1.5"></i>
            กำลังพรีวิวธีม: <span className="uppercase font-mono">{themePreview}</span>
            {xmasPreviewUnlock && ' • (จำลองปลดล็อก 25 ธ.ค.+)'}
          </span>
          <button
            type="button"
            onClick={() => { setThemePreview('auto'); setXmasPreviewUnlock(false); }}
            className="px-2.5 py-0.5 rounded-lg bg-[#050811] text-amber-300 text-[10px] hover:opacity-90 shrink-0"
          >
            ปิดพรีวิว (Auto)
          </button>
        </div>
      )}

      {/* Guest Mode Banner */}
      {!currentUser && currentView !== 'login' && showGuestBar && (
        <div className="bg-gradient-to-r from-[#0B162C] via-[#0F2547] to-[#0B162C] border-b border-sky-500/30 px-3 sm:px-4 py-1.5 text-[11px] shrink-0 z-30">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sky-100 min-w-0">
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold text-[10px] shrink-0">
                <i className="fas fa-user-astronaut mr-1"></i> Guest Mode
              </span>
              <span className="truncate text-slate-300 hidden sm:inline">คุณกำลังเข้าชมในฐานะผู้มาเยือน — ใช้ Tools, ฟัง Disc Jam และทดลองเล่น Daily Games ได้ฟรี</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
              <button type="button" onClick={() => setShowGuestGuide(true)} className="px-2.5 py-1 rounded-lg bg-[#050811] border border-[#1E3A5F] text-sky-300 hover:text-white hover:border-sky-400 font-bold transition-colors">
                <i className="fas fa-info-circle mr-1"></i> คู่มือผู้มาเยือน
              </button>
              <button type="button" onClick={() => { setAuthMode('signin'); changeViewWithTransition('login'); }} className="px-2.5 py-1 rounded-lg bg-white text-[#050811] font-bold hover:bg-sky-200 transition-colors">
                เข้าสู่ระบบ
              </button>
              <button type="button" onClick={() => setShowGuestBar(false)} className="text-slate-400 hover:text-white px-1" title="ซ่อนแถบนี้">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWS (Code-Split via Suspense) */}
      <Suspense fallback={<PageLoader />}>
        {currentView === 'home' && (
          <HomePage
            onNavigate={changeViewWithTransition}
            onOpenXmasTree={openXmasTreeByCode}
            onOpenMemberMenu={openMemberMenu}
            isHalloween={IS_HALLOWEEN}
            isChristmas={IS_CHRISTMAS}
            isLoyKrathong={IS_LOY_KRATHONG}
            cursedUserId={cursedUserId}
            onTriggerScare={(m) => {
              playSpookySound();
              setScareTriggered(true);
              setTimeout(() => setScareTriggered(false), 1200);
              const year = getBkkNow().getFullYear();
              const nextId =
                currentUser && currentUser.id !== m.id
                  ? currentUser.id
                  : activeMembers.filter((x) => x.id !== m.id)[0]?.id || null;
              if (nextId) {
                db.collection('bma_system')
                  .doc(`halloween_curse_${year}`)
                  .set({ cursedUserId: nextId, passedBy: m.id, updatedAt: Date.now() }, { merge: true })
                  .catch(() => {});
              }
            }}
          />
        )}

        {currentView === 'login' && (
          <LoginPage initialMode={authMode} onSuccess={() => changeViewWithTransition('home')} />
        )}

        {currentView === 'members' && (
          <MembersPage onOpenMemberMenu={openMemberMenu} />
        )}

        {currentView === 'discjam' && (
          <DiscJamPage chatMessages={chatMessages} />
        )}

        {currentView === 'chat' && currentUser && (
          <ChatPage
            channels={channels}
            groups={groups}
            chatMessages={chatMessages}
            typingStatuses={typingStatuses}
            allTags={allTags}
            activeRoom={activeRoom}
            setActiveRoom={setActiveRoom}
            sendNotif={sendNotif}
            isHalloween={IS_HALLOWEEN}
            isTargetMuted={isTargetMuted}
            getMuteExp={getMuteExp}
            onOpenMuteModal={setMuteModalTarget}
            onMarkRoomAsRead={markRoomAsRead}
            onJumpToPost={jumpToPost}
            onOpenDailyGame={(gIdx) => { setActiveGameTab(gIdx); changeViewWithTransition('daily_game'); }}
            onOpenXmasTree={openXmasTreeByCode}
            onOpenLoyKrathong={() => changeViewWithTransition('loy_krathong')}
            onOpenMemberMenu={openMemberMenu}
          />
        )}

        {currentView === 'daily_game' && (
          <DailyGamesPage
            activeGameTab={activeGameTab}
            setActiveGameTab={setActiveGameTab}
            channels={channels}
            myGroups={myGroups}
            onShareToBoardDone={() => changeViewWithTransition('feed')}
            onShareToChatDone={(room) => { setActiveRoom(room); changeViewWithTransition('chat'); }}
          />
        )}

        {currentView === 'tools' && (
          <ToolsPage activeTool={activeTool} onOpenTool={openTool} />
        )}

        {currentView === 'xmas_tree' && (
          <ChristmasTreePage
            allTags={allTags}
            onBackHome={() => { setSharedTreeCode(null); changeViewWithTransition('home'); }}
            initialTreeCode={sharedTreeCode}
            isOwnerPreviewUnlock={currentUser?.role === 'admin' && xmasPreviewUnlock}
            channels={channels}
            myGroups={myGroups}
            onShareToBoard={shareXmasTreeToBoard}
            onShareToChat={shareXmasTreeToChat}
          />
        )}

        {currentView === 'loy_krathong' && (
          <LoyKrathongPage
            sendNotif={sendNotif}
            todayStr={todayStr}
            onBackHome={() => changeViewWithTransition('home')}
            channels={channels}
            myGroups={myGroups}
            onShareSiemsiToBoard={shareSiemsiToBoard}
            onShareSiemsiToChat={shareSiemsiToChat}
          />
        )}

        {currentView === 'single_post' && (
          <SinglePostPage
            sharedPostId={sharedPostId}
            posts={posts}
            postMenu={postMenu}
            setPostMenu={setPostMenu}
            handleEditPostReq={handleEditPostReq}
            setCurrentView={changeViewWithTransition}
            setSearchQ={setSearchQ}
            setActiveGameTab={setActiveGameTab}
            toggleCommLike={toggleCommLike}
            toggleCommReact={toggleCommReact}
            repComm={repComm}
            setRepComm={setRepComm}
            setCommMenu={setCommMenu}
            cInputs={cInputs}
            setCInputs={setCInputs}
            handleAddComment={handleAddComment}
            onOpenXmasTree={openXmasTreeByCode}
            onOpenLoyKrathong={() => changeViewWithTransition('loy_krathong')}
            isTargetMuted={isTargetMuted}
            getMuteExp={getMuteExp}
            onOpenMuteModal={setMuteModalTarget}
          />
        )}

        {/* BOARD / BOOKMARKS / OWNER LAYOUT */}
        {(currentView === 'feed' || currentView === 'bookmarks' || currentView === 'admin') && (
          <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {boardMenuOpen && (
              <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setBoardMenuOpen(false)} />
            )}

            <aside
              onClick={(e) => { if (e.target.closest('button')) setBoardMenuOpen(false); }}
              className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#070C18] border-r border-[#1E3A5F] p-4 overflow-y-auto custom-scrollbar space-y-4 transition-transform duration-300 ${boardMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:static lg:z-auto lg:w-auto lg:bg-transparent lg:border-0 lg:p-0 lg:overflow-visible lg:translate-x-0 lg:shadow-none lg:col-span-4 xl:col-span-3`}
            >
              <div className="flex justify-between items-center pb-3 mb-2 border-b border-[#1E3A5F] lg:hidden">
                <span className="font-bold text-sm text-sky-400">เมนูบอร์ด</span>
                <button type="button" onClick={() => setBoardMenuOpen(false)} className="w-8 h-8 rounded-lg bg-[#0F2547] text-slate-300 hover:text-white flex items-center justify-center">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {!currentUser ? (
                <div className="card p-4 text-xs text-slate-300 bg-[#0B1325] border-[#1E3A5F]">
                  <div className="font-bold text-white mb-1">👁️ โหมดผู้มาเยือน (Guest)</div>
                  แสดงเฉพาะโพสต์ที่อนุญาตให้อ่านได้
                </div>
              ) : (
                <div className="card p-5 flex flex-col items-center text-center space-y-3 relative overflow-hidden bg-[#0B1325] border-[#1E3A5F]">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#1E3A5F]/80 via-[#0F2547]/50 to-transparent opacity-80"></div>
                  <div className="relative z-10 mt-2"><Avatar user={currentUser} size="lg" showStatus={true} /></div>
                  <div className="relative z-10">
                    <h3 className="font-bold text-base flex items-center justify-center gap-1.5">
                      {currentUser.displayName} <RoleBadge role={currentUser.role} />
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">@{currentUser.username} • {currentUser.id}</p>
                  </div>
                  <div className="relative z-10 w-full pt-3 border-t border-[#1E3A5F] flex justify-center">
                    <TagBadges user={currentUser} />
                  </div>
                </div>
              )}

              <div className="card p-2 space-y-1 text-xs">
                {currentView === 'admin' ? (
                  <button type="button" className="w-full flex justify-between items-center px-4 py-2.5 rounded-xl font-bold bg-white text-[#050811] shadow-md cursor-default">
                    <span>👑 หน้าจัดการสมาชิก (Owner)</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setSearchQ(''); changeViewWithTransition('feed'); }}
                      className={currentView === 'feed' && searchQ !== currentUser?.id ? 'w-full flex justify-between items-center px-4 py-2.5 rounded-xl font-bold bg-white text-[#050811] shadow-md' : 'w-full flex justify-between items-center px-4 py-2.5 rounded-xl hover:bg-[#0F2547] text-slate-300 hover:text-white transition-colors'}
                    >
                      <span><i className="fas fa-clipboard-list w-5 text-center"></i> กระดานโพสต์รวม</span>
                    </button>

                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => { setSearchQ(currentUser.id); changeViewWithTransition('feed'); }}
                        className={currentView === 'feed' && searchQ === currentUser.id ? 'w-full flex justify-between items-center px-4 py-2.5 rounded-xl font-bold bg-sky-500 text-white shadow-lg' : 'w-full flex justify-between items-center px-4 py-2.5 rounded-xl hover:bg-[#0F2547] text-slate-300 hover:text-white transition-colors'}
                      >
                        <span><i className="fas fa-user-edit w-5 text-center"></i> โพสต์ของฉัน</span>
                        <span className="bg-[#050811] px-2 py-0.5 rounded-full border border-[#1E3A5F] font-mono">
                          {posts.filter((p) => p.authorId === currentUser.id).length}
                        </span>
                      </button>
                    )}

                    {currentUser && (
                      <div className="flex flex-col gap-1.5 w-full mt-3 pt-3 border-t border-[#1E3A5F]/50">
                        <button
                          type="button"
                          onClick={() => { changeViewWithTransition('feed'); setFilterType('ALL'); setFilterLatestOnly(false); setTagFilter('ALL'); setSearchQ(''); }}
                          className={`w-full flex justify-start items-center px-4 py-2.5 rounded-xl font-bold transition-colors ${currentView === 'feed' && filterType === 'ALL' && !filterLatestOnly && tagFilter === 'ALL' && searchQ === '' ? 'bg-white text-[#050811] shadow-md' : 'hover:bg-[#0F2547] text-slate-300 hover:text-white'}`}
                        >
                          📖 โพสต์ทั้งหมด
                        </button>

                        <button
                          type="button"
                          onClick={() => changeViewWithTransition('bookmarks')}
                          className={`w-full flex justify-start items-center px-4 py-2.5 rounded-xl font-bold transition-colors ${currentView === 'bookmarks' ? 'bg-amber-400 text-[#050811] shadow-md' : 'hover:bg-[#0F2547] text-slate-300 hover:text-white'}`}
                        >
                          <i className="fas fa-star w-5 text-center"></i> โพสต์ที่บันทึก
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCalendar(true)}
                          className="w-full flex justify-start items-center px-4 py-2.5 rounded-xl font-bold border border-sky-500/50 bg-sky-950/30 text-sky-300 hover:bg-sky-600 hover:text-white hover:border-sky-400 transition-colors shadow-sm mt-1"
                        >
                          <i className="fas fa-calendar-alt w-5 text-center"></i> ปฏิทินสมาคม
                        </button>

                        <button
                          type="button"
                          disabled={myArchivedXmasTrees.length === 0}
                          onClick={() => myArchivedXmasTrees.length > 0 && setShowXmasArchive(true)}
                          className={`w-full flex justify-between items-center px-4 py-2.5 rounded-xl font-bold border transition-colors shadow-sm mt-1 ${myArchivedXmasTrees.length > 0 ? 'border-amber-500/50 bg-amber-950/25 text-amber-300 hover:bg-amber-500 hover:text-[#050811] hover:border-amber-400 cursor-pointer' : 'border-[#1E3A5F]/60 bg-[#050811]/60 text-slate-500 cursor-not-allowed opacity-70'}`}
                          title={myArchivedXmasTrees.length > 0 ? 'เปิดดูต้นคริสต์มาสส่วนตัวที่สะสมไว้ทุกปี' : 'เปิดให้เข้าชมหลังจบเทศกาลคริสต์มาสปีนี้'}
                        >
                          <span className="flex items-center"><i className="fas fa-tree w-5 text-center"></i> ต้นคริสต์มาสของฉัน</span>
                          {myArchivedXmasTrees.length > 0 ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#050811] text-amber-300 border border-amber-500/40">{myArchivedXmasTrees.length} ปี</span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#0B1325] text-slate-400 border border-[#1E3A5F]">เร็ว ๆ นี้</span>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {currentView === 'feed' && (
                <div className="card p-4 text-xs animate-fade-in border-[#1E3A5F]">
                  <div className="font-bold text-sky-400 mb-3 border-b border-[#1E3A5F] pb-2">
                    <i className="fas fa-fire-alt text-red-500 mr-1"></i> แท็กมาแรง (Trending)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const counts = {};
                      posts.filter((p) => currentUser || p.isGuestAllowed).forEach((p) => {
                        (p.tags || []).forEach((t) => {
                          counts[t] = (counts[t] || 0) + 1 + (p.likes?.length || 0) + (p.comments?.length || 0);
                        });
                      });
                      const topTags = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
                      if (topTags.length === 0) return <div className="text-slate-500 text-[10px]">ยังไม่มีแท็ก</div>;
                      return topTags.map(([t]) => (
                        <button key={t} type="button" onClick={() => { setSearchQ(t); changeViewWithTransition('feed'); }} className="px-2.5 py-1 bg-[#050811] hover:bg-sky-900/50 text-slate-300 hover:text-sky-200 border border-[#1E3A5F] hover:border-sky-500 rounded-full transition-colors shadow-sm">
                          #{t}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {(currentView === 'feed' || currentView === 'bookmarks') && (
                <div className="card p-4 text-xs border-sky-500/40 bg-gradient-to-br from-[#0B1325] to-[#070C18] space-y-2.5 shadow-lg">
                  <div className="font-bold text-sky-300 flex items-center gap-2">
                    <i className="fas fa-comment-dots text-amber-400"></i>
                    <span>ส่งข้อเสนอแนะ / แจ้งปัญหา</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    อยากได้เครื่องมือเพิ่ม เจอบั๊ก หรือมีไอเดียแนะนำ ส่งตรงถึงเจ้าของสมาคมได้เลย
                  </p>
                  <button
                    type="button"
                    onClick={() => { setGuestFbOpen(true); setBoardMenuOpen(false); }}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors shadow flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-paper-plane text-[11px]"></i> ส่ง Feedback
                  </button>
                </div>
              )}
            </aside>

            <main
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.target;
                if (scrollHeight - scrollTop <= clientHeight + 200 && visiblePosts < filteredPosts.length) {
                  setVisiblePosts((v) => v + 10);
                }
              }}
              className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-4 pb-24 lg:pb-10 overflow-y-auto overflow-x-hidden h-full sm:pr-2 custom-scrollbar"
            >
              {currentView === 'admin' && currentUser?.role === 'admin' ? (
                <OwnerPage
                  posts={posts}
                  chatMessages={chatMessages}
                  groups={groups}
                  bmaEvents={bmaEvents}
                  allTags={allTags}
                  guestStats={guestStats}
                  guestFeedbacks={guestFeedbacks}
                  themePreview={themePreview}
                  setThemePreview={setThemePreview}
                  xmasPreviewUnlock={xmasPreviewUnlock}
                  setXmasPreviewUnlock={setXmasPreviewUnlock}
                  onOpenXmasTree={() => openXmasTreeByCode(null)}
                  onOpenLoyWelcome={() => setShowWelcome(true)}
                />
              ) : (
                <BoardPage
                  setBoardMenuOpen={setBoardMenuOpen}
                  searchQ={searchQ}
                  setSearchQ={setSearchQ}
                  posts={posts}
                  setVisiblePosts={setVisiblePosts}
                  setCreatePost={openCreatePostModal}
                  filterMenuOpen={filterMenuOpen}
                  setFilterMenuOpen={setFilterMenuOpen}
                  tagFilter={tagFilter}
                  setTagFilter={setTagFilter}
                  allTags={allTags}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  filterLatestOnly={filterLatestOnly}
                  setFilterLatestOnly={setFilterLatestOnly}
                  filteredPosts={filteredPosts}
                  visiblePosts={visiblePosts}
                  postMenu={postMenu}
                  setPostMenu={setPostMenu}
                  handleEditPostReq={handleEditPostReq}
                  setCurrentView={changeViewWithTransition}
                  setActiveGameTab={setActiveGameTab}
                  toggleCommLike={toggleCommLike}
                  toggleCommReact={toggleCommReact}
                  repComm={repComm}
                  setRepComm={setRepComm}
                  setCommMenu={setCommMenu}
                  cInputs={cInputs}
                  setCInputs={setCInputs}
                  handleAddComment={handleAddComment}
                  onOpenXmasTree={openXmasTreeByCode}
                  onOpenLoyKrathong={() => changeViewWithTransition('loy_krathong')}
                  isTargetMuted={isTargetMuted}
                  getMuteExp={getMuteExp}
                  onOpenMuteModal={setMuteModalTarget}
                />
              )}
            </main>
          </div>
        )}
      </Suspense>

      {/* FLOATING DISC JAM RADIO */}
      <FloatingRadio onOpenDiscJam={() => changeViewWithTransition('discjam')} />

      {/* HALLOWEEN OVERLAYS */}
      <HalloweenGhostHunt isHalloween={IS_HALLOWEEN} />
      <HalloweenCurseAndTreats isHalloween={IS_HALLOWEEN} cursedUserId={cursedUserId} />
      {scareTriggered && (
        <div className="jump-scare-overlay">
          <div className="scare-img">👻</div>
        </div>
      )}

      {/* LAZY MODALS (Calendar, Xmas Archive, Create Post) */}
      <Suspense fallback={null}>
        {showCalendar && (
          <AssociationCalendar isOpen={showCalendar} onClose={() => setShowCalendar(false)} events={bmaEvents} />
        )}
        {showXmasArchive && (
          <MyChristmasTreeArchiveModal isOpen={showXmasArchive} onClose={() => setShowXmasArchive(false)} archivedTrees={myArchivedXmasTrees} />
        )}
        {createPost && (
          <CreatePostModal
            isOpen={createPost}
            onClose={() => { setCreatePost(false); setEditPostData(null); }}
            editPostData={editPostData}
            currentUser={currentUser}
            pTitle={pTitle} setPTitle={setPTitle}
            pCont={pCont} setPCont={setPCont}
            pGuest={pGuest} setPGuest={setPGuest}
            pPinned={pPinned} setPPinned={setPPinned}
            pAtts={pAtts} setPAtts={setPAtts}
            pTags={pTags} setPTags={setPTags}
            tagInput={tagInput} setTagInput={setTagInput}
            allPostTags={allPostTags}
            hasPoll={hasPoll} setHasPoll={setHasPoll}
            pollQ={pollQ} setPollQ={setPollQ}
            pollOpts={pollOpts} setPollOpts={setPollOpts}
            pollAnon={pollAnon} setPollAnon={setPollAnon}
            pollClose={pollClose} setPollClose={setPollClose}
            isQA={isQA} setIsQA={setIsQA}
            isSpoiler={isSpoiler} setIsSpoiler={setIsSpoiler}
            saveDraft={saveDraft}
            handleCreatePost={handleCreatePost}
          />
        )}
      </Suspense>

      {/* GLOBAL MODALS (Notifications, Member Profile, Edit Profile, Cropper, Guest Guide, Feedback) */}
      <GlobalModals
        notifOpen={notifOpen} setNotifOpen={setNotifOpen}
        myNotifs={myNotifs} unreadNotifs={unreadNotifs}
        pushPerm={pushPerm} setPushPerm={setPushPerm}
        onJumpToPost={jumpToPost}
        onNavigateView={changeViewWithTransition}
        onOpenChatRoom={(room) => { setActiveRoom(room); changeViewWithTransition('chat'); }}
        editProf={editProf} setEditProf={setEditProf}
        showGuestGuide={showGuestGuide} setShowGuestGuide={setShowGuestGuide}
        guestFbOpen={guestFbOpen} setGuestFbOpen={setGuestFbOpen}
        sendNotif={sendNotif}
        onOpenLogin={(mode) => { setAuthMode(mode); changeViewWithTransition('login'); }}
      />

      {/* MUTE DURATION MODAL */}
      <MuteDurationModal
        target={muteModalTarget}
        currentExp={muteModalTarget ? getMuteExp(muteModalTarget.key) : null}
        onClose={() => setMuteModalTarget(null)}
        onSave={handleSetTargetMute}
      />
    </div>
  );
}
