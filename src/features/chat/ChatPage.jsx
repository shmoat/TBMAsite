import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { getMs, getTimeStr, getTags, uploadChunked } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, RoleBadge, getStatusInfo } from '../../components/BasicUI';
import { SmartMedia, FormattedText, LikeButton, GiphyPickerPopover } from '../../components/RichUI';
import { longPressProps } from '../../components/ContextMenu';
import { formatMuteUntil } from '../../components/MuteDurationModal';
import { KrathongSVG } from '../../components/KrathongSVG';
import ChatModals from './ChatModals';

const ChatGameModal = lazy(() => import('./ChatGameModal'));

const XMAS_CHAT_REGEX = /(merry\s*christmas|merry\s*xmas|x'?mas|สุขสันต์วันคริสต์มาส|เมอร์รี่คริสต์มาส)/i;
const LOY_CHAT_REGEX = /(ลอยกระทง|สุขสันต์วันลอยกระทง|loy\s*krathong|ยี่เป็ง)/i;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function ChatPage({
  channels = [],
  groups = [],
  chatMessages = [],
  typingStatuses = [],
  allTags = [],
  activeRoom,
  setActiveRoom,
  sendNotif,
  isHalloween = false,
  isTargetMuted,
  getMuteExp,
  onOpenMuteModal,
  onMarkRoomAsRead,
  onJumpToPost,
  onOpenDailyGame,
  onOpenXmasTree,
  onOpenLoyKrathong,
  onOpenMemberMenu,
  voiceStageSlot = null
}) {
  const { activeMembers, currentUser, isModOrAdmin, getAuthor } = useAuth();
  const { openZoom, openAppMenu, openMemberProfile } = useUI();

  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 1024);
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 1024);
  const [rightTag, setRightTag] = useState('ALL');
  const [rightFilterMenuOpen, setRightFilterMenuOpen] = useState(false);
  const [rightOnlineOnly, setRightOnlineOnly] = useState(false);
  const [dmSortType, setDmSortType] = useState('latest');
  const [visibleChatLimit, setVisibleChatLimit] = useState(50);

  const [chatIn, setChatIn] = useState('');
  const [chatAtts, setChatAtts] = useState([]);
  const [cUrlOpen, setCUrlOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMsg, setEditMsg] = useState(null);
  const [repMsg, setRepMsg] = useState(null);
  const [fwdMsg, setFwdMsg] = useState(null);
  const [mentOpen, setMentOpen] = useState(false);
  const [mentF, setMentF] = useState('');
  const [emoOpen, setEmoOpen] = useState(false);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [isSilentMsg, setIsSilentMsg] = useState(false);

  const [activeChatGameId, setActiveChatGameId] = useState(null);
  const [cGameOpen, setCGameOpen] = useState(false);
  const [cChOpen, setCChOpen] = useState(false);
  const [cGrpOpen, setCGrpOpen] = useState(false);
  const [addMemOpen, setAddMemOpen] = useState(false);
  const [delTgt, setDelTgt] = useState(null);

  // บันทึกข้อความเสียง
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // เอฟเฟกต์คีย์เวิร์ดเทศกาลในแชต
  const [chatSnowBurst, setChatSnowBurst] = useState(false);
  const [chatLoyBurst, setChatLoyBurst] = useState(false);
  const lastBurstMsgIdRef = useRef(null);
  const lastLoyBurstIdRef = useRef(null);
  const chatBurstTimerRef = useRef(null);
  const chatLoyTimerRef = useRef(null);

  const cFileRef = useRef(null);
  const typTimer = useRef(null);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  const dmKey = (a, b) => 'dm_' + [a, b].sort().join('_');
  const roomKey = currentUser && activeRoom.type === 'dm' ? dmKey(currentUser.id, activeRoom.id) : activeRoom.id;
  const activeCh = activeRoom.type === 'channel' ? channels.find((c) => c.id === activeRoom.id) : null;
  const activeGrp = activeRoom.type === 'group' ? groups.find((g) => g.id === activeRoom.id) : null;
  const activeDmUser = activeRoom.type === 'dm' ? getAuthor(activeRoom.id) : null;
  const myGroups = currentUser ? groups.filter((g) => (g.members || []).includes(currentUser.id)) : [];
  const roomMsgs = chatMessages.filter((m) => m.roomKey === roomKey);
  const roomTypers = typingStatuses.filter((t) => t.roomKey === roomKey && t.userId !== currentUser?.id);
  const pinnedMsg = roomMsgs.find((m) => m.isPinned) || null;

  const canPinInActiveRoom = Boolean(
    currentUser && (
      activeRoom.type === 'dm' ||
      isModOrAdmin ||
      (activeRoom.type === 'group' && activeGrp?.createdBy === currentUser.id)
    )
  );

  useEffect(() => { setVisibleChatLimit(50); }, [roomKey]);

  const triggerChatSnowBurst = useCallback(() => {
    setChatSnowBurst(true);
    if (chatBurstTimerRef.current) clearTimeout(chatBurstTimerRef.current);
    chatBurstTimerRef.current = setTimeout(() => setChatSnowBurst(false), 4500);
  }, []);

  const triggerChatLoyBurst = useCallback(() => {
    setChatLoyBurst(true);
    if (chatLoyTimerRef.current) clearTimeout(chatLoyTimerRef.current);
    chatLoyTimerRef.current = setTimeout(() => setChatLoyBurst(false), 4500);
  }, []);

  useEffect(() => {
    if (roomMsgs.length === 0) return;
    const latest = roomMsgs[roomMsgs.length - 1];
    if (!latest || latest.isDeleted) return;
    const msgAgeMs = Date.now() - getMs(latest);
    if (msgAgeMs < 15000) {
      if (latest.id !== lastBurstMsgIdRef.current && XMAS_CHAT_REGEX.test(latest.text || '')) {
        lastBurstMsgIdRef.current = latest.id;
        triggerChatSnowBurst();
      }
      if (latest.id !== lastLoyBurstIdRef.current && LOY_CHAT_REGEX.test(latest.text || '')) {
        lastLoyBurstIdRef.current = latest.id;
        triggerChatLoyBurst();
      }
    }
  }, [roomMsgs, triggerChatSnowBurst, triggerChatLoyBurst]);

  // อ่านข้อความอัตโนมัติในห้องที่เปิดอยู่
  useEffect(() => {
    if (!currentUser) return;
    roomMsgs
      .filter((m) => m.senderId !== currentUser.id && !(m.readBy || []).includes(currentUser.id))
      .forEach((m) => {
        db.collection('bma_messages').doc(m.id).update({
          readBy: Array.from(new Set([...(m.readBy || []), currentUser.id]))
        }).catch(() => {});
      });
  }, [roomMsgs.length, roomKey, currentUser]);

  // เลื่อนลงล่างสุดเมื่อเปลี่ยนห้องหรือมีข้อความใหม่
  useEffect(() => {
    if (chatBoxRef.current) {
      setTimeout(() => {
        if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }, 100);
    }
  }, [roomKey, roomMsgs.length]);

  const setTyping = (isTyping) => {
    if (!currentUser) return;
    db.collection('bma_typing').doc(roomKey + '_' + currentUser.id).set({
      id: roomKey + '_' + currentUser.id,
      roomKey,
      userId: currentUser.id,
      displayName: currentUser.displayName,
      isTyping,
      updatedAt: Date.now()
    }).catch(() => {});
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
      else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };
      else if (MediaRecorder.isTypeSupported('audio/aac')) options = { mimeType: 'audio/aac' };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const actualMimeType = mediaRecorderRef.current.mimeType || options.mimeType || 'audio/mp4';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        let ext = 'mp4';
        if (actualMimeType.includes('webm')) ext = 'webm';
        else if (actualMimeType.includes('mp3')) ext = 'mp3';
        else if (actualMimeType.includes('aac') || actualMimeType.includes('m4a')) ext = 'm4a';
        else if (actualMimeType.includes('ogg')) ext = 'ogg';

        const file = new File([audioBlob], `voice-message.${ext}`, { type: actualMimeType });
        setUploading(true);
        try {
          const att = await uploadChunked(file);
          setChatAtts((prev) => [...prev, att]);
        } catch (err) { alert(err.message); }
        setUploading(false);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      alert('กรุณาอนุญาตการเข้าถึงไมโครโฟนเพื่อส่งข้อความเสียง');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handleSendChat = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!currentUser) return;
    if (editMsg) {
      const t = chatIn.trim();
      const id = editMsg.id;
      if (!t) return;
      setEditMsg(null);
      setChatIn('');
      setTyping(false);
      return db.collection('bma_messages').doc(id).update({ text: t, isEdited: true });
    }
    const text = chatIn.trim();
    const atts = [...chatAtts];
    const rep = repMsg;
    if ((!text && !atts.length) || activeCh?.isSystemReadOnly || activeGrp?.isArchived) return;

    let finalText = text;
    if (isHalloween && finalText.length > 0 && Math.random() < 0.15) {
      const spookySuffixes = [' 👻', ' 🎃', ' 🕸️', ' 🦇', ' ...ระวังหลังให้ดีนะ', ' ...แฮ่!'];
      finalText += spookySuffixes[Math.floor(Math.random() * spookySuffixes.length)];
    }
    if (XMAS_CHAT_REGEX.test(finalText)) triggerChatSnowBurst();
    if (LOY_CHAT_REGEX.test(finalText)) triggerChatLoyBurst();

    setChatIn('');
    setChatAtts([]);
    setRepMsg(null);
    setMentOpen(false);
    setTyping(false);

    const now = Date.now();
    const id = 'msg-' + now + '-' + Math.random().toString(36).slice(2, 5);
    const dStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const fullTime = `${dStr} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
    const wasSilent = isSilentMsg;
    setIsSilentMsg(false);

    await db.collection('bma_messages').doc(id).set({
      id,
      roomKey,
      senderId: currentUser.id,
      receiverId: activeRoom.type === 'dm' ? activeRoom.id : null,
      text: finalText,
      attachments: atts,
      likes: [],
      replyTo: rep ? { id: rep.id, senderName: getAuthor(rep.senderId).displayName, text: rep.text || '[ไฟล์แนบ]' } : null,
      readBy: [currentUser.id],
      isEdited: false,
      isDeleted: false,
      isSystemPostAlert: false,
      isSilent: wasSilent,
      time: fullTime,
      timestamp: now,
      serverCreatedAt: svrTs()
    });

    if (!wasSilent && sendNotif) {
      if (activeRoom.type === 'dm') {
        await sendNotif({ recipientId: activeRoom.id, actorId: currentUser.id, category: 'messages', subType: 'dm_chat', title: '💬 ข้อความส่วนตัวจาก ' + currentUser.displayName, body: text || '[ไฟล์แนบ]', targetView: 'chat', targetRoomType: 'dm', targetRoomId: currentUser.id });
      } else if (activeRoom.type === 'group' && activeGrp) {
        for (const mId of activeGrp.members || []) {
          if (mId !== currentUser.id) {
            await sendNotif({ recipientId: mId, actorId: currentUser.id, category: 'messages', subType: 'group_chat', title: '👥 ข้อความในกลุ่ม ' + activeGrp.name, body: currentUser.displayName + ': ' + (text || '[ไฟล์แนบ]'), targetView: 'chat', targetRoomType: 'group', targetRoomId: activeGrp.id });
          }
        }
      } else if (activeCh) {
        await sendNotif({ recipientId: 'ALL', actorId: currentUser.id, category: 'messages', subType: 'global_chat', title: '🌐 ข้อความใน #' + activeCh.name, body: currentUser.displayName + ': ' + (text || '[ไฟล์แนบ]'), targetView: 'chat', targetRoomType: 'channel', targetRoomId: activeCh.id });
      }
    }
  };

  const toggleMsgReaction = async (msg, emoji) => {
    if (!currentUser || !msg?.id) return;
    const nextReacts = { ...(msg.reactions || {}) };
    const arr = Array.isArray(nextReacts[emoji]) ? [...nextReacts[emoji]] : [];
    const updated = arr.includes(currentUser.id)
      ? arr.filter((id) => id !== currentUser.id)
      : [...arr, currentUser.id];
    if (updated.length > 0) nextReacts[emoji] = updated;
    else delete nextReacts[emoji];
    await db.collection('bma_messages').doc(msg.id).update({ reactions: nextReacts }).catch(() => {});
  };

  const downloadAttachment = async (att) => {
    if (!att) return;
    let url = att.url || '';
    if (att.isChunked && !url && att.chunkIds?.length) {
      const docs = await Promise.all(att.chunkIds.map((id) => db.collection('bma_file_chunks').doc(id).get()));
      url = docs.map((d) => d.data()).filter(Boolean).sort((a, b) => a.index - b.index).map((s) => s.data).join('');
    }
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name || 'file';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const updateEventRSVP = async (eventId, status) => {
    if (!currentUser) return alert('กรุณาเข้าสู่ระบบก่อน');
    const doc = await db.collection('bma_events').doc(eventId).get();
    if (!doc.exists) return alert('ไม่พบกิจกรรมนี้ (อาจถูกลบหรือยกเลิกไปแล้ว)');
    const ev = doc.data();
    const going = (ev.going || []).filter((id) => id !== currentUser.id);
    const maybe = (ev.maybe || []).filter((id) => id !== currentUser.id);
    if (status === 'going') going.push(currentUser.id);
    if (status === 'maybe') maybe.push(currentUser.id);
    await db.collection('bma_events').doc(eventId).update({ going, maybe });
    alert(status === 'decline' ? 'ปฏิเสธคำเชิญเรียบร้อย' : 'ตอบรับคำเชิญเรียบร้อยแล้ว!');
  };

  const openChatMsgMenu = (e, msg, mediaItem = null) => {
    if (!msg || msg.isDeleted) return;
    const selectedText = window.getSelection ? window.getSelection().toString().trim() : '';
    const isSender = currentUser?.id === msg.senderId;

    const quickReactions = currentUser
      ? ['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => ({
          emoji,
          active: (msg.reactions?.[emoji] || []).includes(currentUser.id),
          onClick: () => toggleMsgReaction(msg, emoji)
        }))
      : [];

    const items = [];
    if (selectedText) {
      items.push({ icon: 'fas fa-highlighter', label: 'คัดลอกข้อความที่ไฮไลต์', accent: true, onClick: () => navigator.clipboard.writeText(selectedText) });
    }
    if (mediaItem) {
      if (mediaItem.type === 'image' && mediaItem.url) {
        items.push({ icon: 'fas fa-search-plus', label: 'ขยายภาพเต็มจอ', onClick: () => openZoom(mediaItem.url) });
      }
      items.push({ icon: 'fas fa-download', label: 'ดาวน์โหลดไฟล์', onClick: () => downloadAttachment(mediaItem) });
      if (mediaItem.url && !mediaItem.url.startsWith('data:')) {
        items.push({ icon: 'fas fa-link', label: 'คัดลอกลิงก์ไฟล์', onClick: () => navigator.clipboard.writeText(mediaItem.url) });
      }
      items.push({ type: 'divider' });
    }

    items.push({ icon: 'fas fa-reply', label: 'ตอบกลับข้อความ', accent: !selectedText, onClick: () => setRepMsg(msg) });
    if (msg.text) {
      items.push({ icon: 'fas fa-copy', label: 'คัดลอกข้อความ', onClick: () => navigator.clipboard.writeText(msg.text) });
    }
    items.push({ icon: 'fas fa-share', label: 'ส่งต่อ...', onClick: () => setFwdMsg({ message: msg, mediaItem }) });

    if (canPinInActiveRoom) {
      items.push({ type: 'divider' });
      if (!msg.isPinned) {
        items.push({
          icon: 'fas fa-thumbtack',
          label: 'ปักหมุดข้อความในห้องนี้',
          accent: true,
          onClick: async () => {
            const prevPins = roomMsgs.filter((m) => m.isPinned);
            for (const pm of prevPins) await db.collection('bma_messages').doc(pm.id).update({ isPinned: false });
            await db.collection('bma_messages').doc(msg.id).update({ isPinned: true });
          }
        });
      } else {
        items.push({
          icon: 'fas fa-thumbtack',
          label: 'เลิกปักหมุดข้อความ',
          danger: true,
          onClick: () => db.collection('bma_messages').doc(msg.id).update({ isPinned: false })
        });
      }
    }

    if (isSender) {
      items.push({ type: 'divider' });
      if (!mediaItem && msg.text) {
        items.push({ icon: 'fas fa-pen', label: 'แก้ไขข้อความ', accent: true, onClick: () => { setEditMsg(msg); setChatIn(msg.text || ''); } });
      }
      items.push({
        icon: 'fas fa-ban',
        label: 'ยกเลิกข้อความ',
        danger: true,
        onClick: () => db.collection('bma_messages').doc(msg.id).update({ isDeleted: true, text: '', attachments: [], reactions: {} })
      });
    }

    openAppMenu(e, { quickReactions, items });
  };

  const openRoomMenu = (e, roomType, roomObj) => {
    if (!currentUser || !roomObj) return;
    const mKey = `${roomType}:${roomObj.id}`;
    const muted = isTargetMuted?.(mKey);
    const label = roomType === 'channel'
      ? `แชตรวม #${roomObj.name}`
      : roomType === 'group'
        ? `กลุ่ม ${roomObj.name}`
        : `แชตส่วนตัวกับ ${roomObj.displayName}`;

    const items = [
      {
        icon: muted ? 'fas fa-bell' : 'fas fa-bell-slash',
        label: muted ? 'ตั้งค่า / เปิดการแจ้งเตือน' : 'ปิดการแจ้งเตือนห้องนี้...',
        accent: !muted,
        onClick: () => onOpenMuteModal?.({ key: mKey, label })
      },
      {
        icon: 'fas fa-check-double',
        label: 'ทำเครื่องหมายว่าอ่านแล้ว',
        onClick: () => onMarkRoomAsRead?.(roomType, roomObj.id)
      }
    ];

    if (roomType === 'dm') {
      items.push({ type: 'divider' });
      items.push({ icon: 'fas fa-user', label: 'ดูโปรไฟล์สมาชิก', onClick: () => openMemberProfile(roomObj) });
      items.push({ icon: 'fas fa-id-badge', label: 'คัดลอก Member ID', sub: roomObj.id, onClick: () => navigator.clipboard.writeText(roomObj.id) });
    }

    if (roomType === 'group') {
      items.push({ type: 'divider' });
      if (!roomObj.isArchived) {
        items.push({ icon: 'fas fa-users-cog', label: 'จัดการสมาชิกกลุ่ม', onClick: () => { setActiveRoom({ type: 'group', id: roomObj.id }); setAddMemOpen(true); } });
      }
      if (currentUser.id === roomObj.createdBy || currentUser.role === 'admin') {
        items.push({
          icon: roomObj.isArchived ? 'fas fa-unlock' : 'fas fa-box',
          label: roomObj.isArchived ? 'เปิดใช้งานกลุ่มอีกครั้ง' : 'Archive กลุ่มนี้',
          onClick: () => db.collection('bma_groups').doc(roomObj.id).update({ isArchived: !roomObj.isArchived })
        });
        items.push({
          icon: 'fas fa-trash-alt',
          label: 'ลบกลุ่มนี้ถาวร',
          danger: true,
          onClick: () => setDelTgt({ roomType: 'group', id: roomObj.id, name: roomObj.name })
        });
      }
    }

    if (roomType === 'channel' && isModOrAdmin && !roomObj.isProtected) {
      items.push({ type: 'divider' });
      items.push({
        icon: 'fas fa-trash-alt',
        label: 'ลบห้องแชตนี้',
        danger: true,
        onClick: () => setDelTgt({ roomType: 'channel', id: roomObj.id, name: '#' + roomObj.name })
      });
    }

    openAppMenu(e, {
      header: {
        icon: roomType === 'channel' ? 'fas fa-hashtag' : roomType === 'group' ? 'fas fa-users' : 'fas fa-user',
        title: roomType === 'dm' ? roomObj.displayName : roomObj.name,
        sub: muted ? `ปิดแจ้งเตือน (${formatMuteUntil(getMuteExp?.(mKey))})` : (roomType === 'dm' ? roomObj.id : roomType.toUpperCase())
      },
      items
    });
  };

  const mentionList = () => {
    const l = [
      { token: '@everyone', label: '@everyone', sub: 'แจ้งเตือนทุกคน' },
      { token: '@here', label: '@here', sub: 'คนที่ออนไลน์' }
    ];
    allTags.forEach((t) => l.push({ token: '@[' + t + ']', label: '@[' + t + ']', sub: 'หมวดหมู่ ' + t }));
    activeMembers.forEach((m) => {
      l.push({ token: '@' + m.id, label: '@' + m.id + ' (' + m.displayName + ')', sub: '@' + m.username });
      if (m.username) l.push({ token: '@' + m.username, label: '@' + m.username + ' (' + m.displayName + ')', sub: m.id });
    });
    return !mentF ? l : l.filter((x) => x.label.toLowerCase().includes(mentF) || x.sub.toLowerCase().includes(mentF));
  };

  const conversedDms = currentUser
    ? activeMembers.filter((m) =>
        m.id !== currentUser.id && (
          chatMessages.some((msg) => msg.roomKey === dmKey(currentUser.id, m.id)) ||
          (activeRoom.type === 'dm' && activeRoom.id === m.id)
        )
      )
    : [];

  if (dmSortType === 'alpha') {
    conversedDms.sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
  } else {
    conversedDms.sort((a, b) => {
      const aMsgs = chatMessages.filter((msg) => msg.roomKey === dmKey(currentUser.id, a.id));
      const bMsgs = chatMessages.filter((msg) => msg.roomKey === dmKey(currentUser.id, b.id));
      const aLast = aMsgs.length > 0 ? getMs(aMsgs[aMsgs.length - 1]) : 0;
      const bLast = bMsgs.length > 0 ? getMs(bMsgs[bMsgs.length - 1]) : 0;
      return bLast - aLast;
    });
  }

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 relative">
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 md:hidden ${leftOpen || rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => { setLeftOpen(false); setRightOpen(false); }}
      ></div>

      {/* LEFT SIDEBAR */}
      <aside className={`absolute z-40 w-64 bg-[#070C18] border-r border-[#1E3A5F] flex flex-col shrink-0 h-full overflow-y-auto text-xs transition-transform duration-300 ${leftOpen ? 'translate-x-0 shadow-2xl relative' : '-translate-x-full absolute'} md:w-64`}>
        <div className="p-3 border-b border-[#1E3A5F] flex justify-between items-center bg-[#050811] sticky top-0 z-10">
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] font-bold uppercase text-slate-400">แชตรวม (Global)</span>
            <div className="flex gap-2">
              {isModOrAdmin && <button type="button" onClick={() => setCChOpen(true)} className="px-2 py-0.5 rounded bg-[#0F2547] text-[10px] font-bold text-sky-300 hover:bg-[#1E3A5F] transition-colors"><i className="fas fa-plus mr-1"></i> สร้าง</button>}
              <button type="button" onClick={() => setLeftOpen(false)} className="md:hidden text-slate-400 hover:text-white px-2 py-1"><i className="fas fa-times"></i></button>
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-[#1E3A5F]">
          {channels.map((ch) => (
            <div key={ch.id} className="flex items-center gap-1 mb-1 group">
              <button
                type="button"
                onClick={() => { setActiveRoom({ type: 'channel', id: ch.id }); if (window.innerWidth < 768) setLeftOpen(false); }}
                onContextMenu={(e) => openRoomMenu(e, 'channel', ch)}
                {...longPressProps((ev) => openRoomMenu(ev, 'channel', ch))}
                className={`flex-1 px-3 py-2 rounded-xl text-left truncate transition-all font-bold ${activeRoom.type === 'channel' && activeRoom.id === ch.id ? 'bg-sky-600 text-white shadow-md' : 'text-slate-300 hover:bg-[#0F2547] hover:text-white'}`}
              >
                <span className="opacity-70 mr-1.5">{ch.icon}</span> {ch.name}
                {isTargetMuted?.('channel:' + ch.id) && <i className="fas fa-bell-slash text-[10px] text-red-400/80 ml-1.5"></i>}
              </button>
              {isModOrAdmin && !ch.isProtected && (
                <button type="button" onClick={() => setDelTgt({ roomType: 'channel', id: ch.id, name: '#' + ch.name })} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                  <i className="fas fa-trash-alt"></i>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-b border-[#1E3A5F]">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">กลุ่มแชต (Groups)</span>
            <button type="button" onClick={() => setCGrpOpen(true)} className="px-2 py-0.5 rounded bg-white text-[#050811] text-[10px] font-bold hover:bg-slate-200 transition-colors"><i className="fas fa-plus mr-1"></i> สร้างกลุ่ม</button>
          </div>
          {myGroups.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => { setActiveRoom({ type: 'group', id: g.id }); if (window.innerWidth < 768) setLeftOpen(false); }}
              onContextMenu={(e) => openRoomMenu(e, 'group', g)}
              {...longPressProps((ev) => openRoomMenu(ev, 'group', g))}
              className={`w-full flex justify-between items-center px-3 py-2 mb-1 rounded-xl font-bold transition-all ${activeRoom.type === 'group' && activeRoom.id === g.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-[#0F2547] hover:text-white'}`}
            >
              <span className="truncate">
                {g.isArchived ? '📦 ' : '👥 '}{g.name}
                {isTargetMuted?.('group:' + g.id) && <i className="fas fa-bell-slash text-[10px] text-red-400/80 ml-1.5"></i>}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${activeRoom.type === 'group' && activeRoom.id === g.id ? 'bg-white/20 text-white' : 'bg-[#050811] text-slate-400'}`}>
                {(g.members || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-3 flex-1 flex flex-col min-h-0">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase text-slate-400">แชตส่วนตัว</span>
            <select value={dmSortType} onChange={(e) => setDmSortType(e.target.value)} className="bg-[#0B1325] border border-[#1E3A5F] text-[10px] text-slate-300 rounded outline-none p-0.5 max-w-[80px]">
              <option value="latest">ใหม่สุด</option>
              <option value="alpha">ตามอักษร</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pt-1">
            {conversedDms.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => { setActiveRoom({ type: 'dm', id: m.id }); if (window.innerWidth < 768) setLeftOpen(false); }}
                onContextMenu={(e) => openRoomMenu(e, 'dm', m)}
                {...longPressProps((ev) => openRoomMenu(ev, 'dm', m))}
                className={`w-full flex items-center gap-2.5 p-2 mb-1 rounded-xl text-left transition-all ${activeRoom.type === 'dm' && activeRoom.id === m.id ? 'bg-white text-[#050811] shadow-md' : 'text-slate-200 hover:bg-[#0F2547]'}`}
              >
                <Avatar user={m} size="xs" showStatus={true} />
                <span className="truncate font-bold text-sm">{m.displayName}</span>
                {isTargetMuted?.('dm:' + m.id) && <i className="fas fa-bell-slash text-[10px] text-red-400/80 ml-auto shrink-0"></i>}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER CHAT SECTION */}
      <main className="flex-1 flex flex-col bg-[#050811] min-w-0 h-full overflow-hidden relative z-10">
        {/* Seasonal Keyword Effects */}
        {chatSnowBurst && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#081C1B]/95 border border-amber-300/80 text-amber-200 text-xs font-bold shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-bounce whitespace-nowrap">
              <i className="fas fa-snowflake text-sky-300 mr-1.5"></i>Merry Christmas!<i className="fas fa-star text-amber-300 ml-1.5"></i>
            </div>
            {Array.from({ length: 24 }, (_, idx) => (
              <div key={idx} className="chat-burst-flake" style={{ left: `${(idx * 4.2 + (idx % 3) * 1.1) % 96}%`, '--bdur': `${2.4 + (idx % 5) * 0.4}s`, '--bdel': `${(idx % 6) * 0.16}s`, '--bx': `${((idx % 2 === 0 ? 1 : -1) * (18 + (idx % 4) * 14))}px` }}>
                {idx % 3 === 0 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FDE68A"><polygon points="12,2 14.5,9 22,9.5 16,14 18,21.5 12,17.2 6,21.5 8,14 2,9.5 9.5,9" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22" /><line x1="3.3" y1="7" x2="20.7" y2="17" /><line x1="20.7" y1="7" x2="3.3" y2="17" /></svg>
                )}
              </div>
            ))}
          </div>
        )}

        {chatLoyBurst && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#0A162C]/95 border border-amber-400/80 text-amber-200 text-xs font-bold shadow-[0_0_20px_rgba(245,158,11,0.45)] animate-bounce whitespace-nowrap">
              🪷 สุขสันต์วันลอยกระทง! 🌕
            </div>
            {Array.from({ length: 18 }, (_, idx) => (
              <div key={idx} className="chat-burst-lantern" style={{ left: `${(idx * 5.3 + (idx % 3) * 1.4) % 94}%`, '--ldur': `${2.8 + (idx % 5) * 0.45}s`, '--ldel': `${(idx % 6) * 0.16}s`, '--lx': `${((idx % 2 === 0 ? 1 : -1) * (16 + (idx % 4) * 12))}px` }}>
                <svg width="20" height="28" viewBox="0 0 28 38" fill="none">
                  <path d="M5 10 Q14 2 23 10 L20 30 Q14 33 8 30 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.4" opacity="0.92" />
                  <ellipse cx="14" cy="27" rx="4.5" ry="3.5" fill="#FEF9C3" />
                </svg>
              </div>
            ))}
          </div>
        )}

        {/* Chat Header */}
        <div className="h-14 px-3 sm:px-4 bg-[#0B1325] border-b border-[#1E3A5F] flex items-center justify-between shrink-0 text-xs shadow-sm z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button type="button" onClick={() => setLeftOpen(!leftOpen)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${!leftOpen ? 'bg-sky-500 text-white shadow-md' : 'bg-[#0F2547] text-slate-300 hover:text-white hover:bg-sky-600 border border-[#1E3A5F]'}`} title={leftOpen ? 'ซ่อนแถบเมนู (ซ้าย)' : 'แสดงแถบเมนู (ซ้าย)'}>
              <i className={`fas ${leftOpen ? 'fa-angle-double-left' : 'fa-bars'}`}></i>
            </button>

            <div className="truncate font-bold text-sm sm:text-base flex items-center gap-2">
              {activeCh && <><span className="opacity-80">{activeCh.icon}</span><span>{activeCh.name}</span></>}
              {activeGrp && <><span className="opacity-80">👥</span><span>{activeGrp.name} {activeGrp.isArchived ? '(Archived)' : ''}</span></>}
              {activeDmUser && (
                <div onClick={() => openMemberProfile(activeDmUser)} className="cursor-pointer hover:underline flex items-center gap-2">
                  <span className="opacity-80">👤</span>
                  <span>{activeDmUser.displayName}</span>
                  <span className="text-[10px] bg-[#050811] px-1.5 py-0.5 rounded-md border border-[#1E3A5F] font-mono text-sky-400">{activeDmUser.id}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative hidden sm:flex items-center">
              <i className="fas fa-search absolute left-3 text-slate-500 text-[10px]"></i>
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="ค้นหาข้อความในห้องนี้..."
                className="bg-[#050811] border border-[#1E3A5F] rounded-full py-1.5 pl-8 pr-7 text-xs text-sky-200 outline-none focus:border-sky-500 w-32 md:w-48 transition-all"
              />
              {chatSearch && (
                <button type="button" onClick={() => setChatSearch('')} className="absolute right-2 text-slate-500 hover:text-red-400">
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 border-r border-[#1E3A5F] pr-2 mr-1">
              {currentUser && (() => {
                const chatMuteKey = `${activeRoom.type}:${activeRoom.id}`;
                const chatMuted = isTargetMuted?.(chatMuteKey);
                const chatExp = getMuteExp?.(chatMuteKey);
                const roomLabel = activeCh
                  ? `แชตรวม #${activeCh.name}`
                  : activeGrp
                    ? `กลุ่ม ${activeGrp.name}`
                    : `แชตส่วนตัวกับ ${activeDmUser?.displayName || activeRoom.id}`;
                return (
                  <button
                    type="button"
                    onClick={() => onOpenMuteModal?.({ key: chatMuteKey, label: roomLabel })}
                    className={`w-8 h-8 rounded-full border transition flex items-center justify-center shrink-0 shadow-sm ${chatMuted ? 'bg-red-950/80 border-red-500/60 text-red-400 hover:bg-red-900 hover:text-white' : 'bg-[#0F2547] text-slate-300 border-[#1E3A5F] hover:text-amber-300 hover:border-amber-400/60'}`}
                    title={chatMuted ? `ปิดแจ้งเตือนห้องนี้อยู่ (${formatMuteUntil(chatExp)})` : 'ปิดการแจ้งเตือนห้องแชตนี้'}
                  >
                    <i className={`fas ${chatMuted ? 'fa-bell-slash' : 'fa-bell'}`}></i>
                  </button>
                );
              })()}
              {activeRoom.type === 'group' && activeGrp && !activeGrp.isArchived && (
                <button type="button" onClick={() => setAddMemOpen(true)} className="w-8 h-8 rounded-full bg-[#0F2547] text-sky-300 border border-sky-500/30 hover:bg-sky-600 hover:text-white transition flex items-center justify-center shrink-0 shadow-sm" title="แก้ไขสมาชิกกลุ่ม">
                  <i className="fas fa-user-edit"></i>
                </button>
              )}
              {activeRoom.type === 'group' && activeGrp && currentUser?.id === activeGrp.createdBy && (
                <>
                  <button type="button" onClick={() => db.collection('bma_groups').doc(activeGrp.id).update({ isArchived: !activeGrp.isArchived })} className="btn-b text-[10px] px-2 shadow-sm flex items-center gap-1" title="Archive กลุ่ม">
                    <i className={`fas ${activeGrp.isArchived ? 'fa-unlock' : 'fa-box'}`}></i> {activeGrp.isArchived ? 'เปิด' : 'Archive'}
                  </button>
                  <button type="button" onClick={() => setDelTgt({ roomType: 'group', id: activeGrp.id, name: activeGrp.name })} className="w-8 h-8 rounded-full bg-red-950/80 border border-red-900 text-red-400 hover:bg-red-600 hover:text-white transition flex items-center justify-center shrink-0 shadow-sm" title="ลบกลุ่มนี้">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </>
              )}
            </div>

            <button type="button" onClick={() => setRightOpen(!rightOpen)} className={`w-8 h-8 md:w-auto md:px-3 md:py-1.5 rounded-full md:rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md border ${!rightOpen ? 'bg-sky-500 text-white border-sky-400' : 'bg-[#0F2547] text-slate-300 border-[#1E3A5F] hover:bg-slate-200 hover:text-black'}`} title={rightOpen ? 'ซ่อนแถบสมาชิก (ขวา)' : 'แสดงแถบสมาชิก (ขวา)'}>
              <i className={`fas ${rightOpen ? 'fa-angle-double-right' : 'fa-users'}`}></i>
              <span className="hidden md:inline">สมาชิก</span>
            </button>
          </div>
        </div>

        {/* ช่องเสียบแถบห้องเสียง / เวที 5 คน (อนาคต) */}
        {voiceStageSlot}

        {/* Pinned Message */}
        {pinnedMsg && (
          <div
            className="bg-amber-950/30 border-b border-amber-900/50 p-2.5 px-4 flex items-center justify-between gap-3 shrink-0 cursor-pointer shadow-md z-10 hover:bg-amber-950/50 transition-colors"
            onClick={() => document.getElementById('msg-' + pinnedMsg.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            <div className="flex-1 min-w-0 text-xs text-slate-300 border-l-2 border-amber-500 pl-2.5">
              <div className="font-bold text-amber-400 mb-0.5 flex items-center gap-1.5"><i className="fas fa-thumbtack text-[10px]"></i> ข้อความปักหมุด</div>
              <div className="truncate text-slate-200">
                {pinnedMsg.text || (pinnedMsg.attachments?.length > 0 ? `[${pinnedMsg.attachments[0].type === 'image' ? 'รูปภาพ' : pinnedMsg.attachments[0].type === 'video' ? 'วิดีโอ' : pinnedMsg.attachments[0].type === 'audio' ? 'ไฟล์เสียง' : 'ไฟล์แนบ'}]` : 'ข้อความ')}
              </div>
            </div>
            {canPinInActiveRoom && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); db.collection('bma_messages').doc(pinnedMsg.id).update({ isPinned: false }); }}
                className="text-slate-500 hover:text-red-400 w-8 h-8 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors"
                title="เลิกปักหมุด"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        )}

        {/* Messages Feed */}
        <div
          ref={chatBoxRef}
          onScroll={(e) => { if (e.target.scrollTop < 100 && visibleChatLimit < roomMsgs.length) setVisibleChatLimit((v) => v + 50); }}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#050811] to-[#030509]"
        >
          {visibleChatLimit < roomMsgs.length && (
            <div className="text-center py-2 text-[10px] text-sky-400 font-bold animate-pulse bg-sky-950/20 rounded-full w-max mx-auto px-4 border border-sky-900/50">
              ⏳ กำลังโหลดข้อความเก่า...
            </div>
          )}

          {roomMsgs.slice(Math.max(0, roomMsgs.length - visibleChatLimit)).map((msg) => {
            const tStr = getTimeStr(msg);

            if (msg.isSystemPostAlert) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 card flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" />
                    <div>
                      <div className="text-[10px] text-blue-300 font-bold">📝 โพสต์ใหม่ • {tStr}</div>
                      <div className="text-xs font-bold">{msg.text}</div>
                      {msg.postTitle && <div className="text-xs text-slate-300">"{msg.postTitle}"</div>}
                    </div>
                  </div>
                  {msg.linkedPostId && <button type="button" onClick={() => onJumpToPost?.(msg.linkedPostId)} className="btn-w text-xs shrink-0"><i className="fas fa-link mr-1"></i> ดูโพสต์</button>}
                </div>
              );
            }

            if (msg.isGameInvite) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 card border-sky-400/50 flex flex-col gap-2 shadow-lg bg-[#0F2547]/50">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div>
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-sky-300">{pa.displayName}</span><span className="text-[10px] text-slate-400">{tStr}</span></div>
                      <p className="text-sm mt-0.5 font-bold">🎮 ชวนเล่นเกม {msg.gameName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setActiveChatGameId(msg.gameId)} className="btn-w text-xs self-start ml-11 hover:scale-105 transition-transform">
                    <i className="fas fa-gamepad mr-1"></i> เข้าร่วม / เปิดเกม
                  </button>
                </div>
              );
            }

            if (msg.isGameResult) {
              const pa = getAuthor(msg.senderId);
              const wName = msg.gameResultData?.winner === 'draw' ? 'เสมอ' : getAuthor(msg.gameResultData?.winner)?.displayName;
              return (
                <div key={msg.id} className="p-3.5 card border-amber-400/50 flex flex-col gap-2 shadow-lg bg-[#0F2547]/50">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div>
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-amber-300">{pa.displayName}</span><span className="text-[10px] text-slate-400">{tStr}</span></div>
                      <p className="text-sm mt-0.5">🏆 ผลการแข่งขัน {msg.gameName}</p>
                      <p className="text-xs font-bold text-amber-400 mt-1">ผู้ชนะ: {wName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setActiveChatGameId(msg.gameId)} className="btn-b text-xs self-start ml-11 hover:scale-105 transition-transform text-amber-300 border-amber-500/50">
                    <i className="fas fa-eye mr-1"></i> ดูหน้ากระดานสรุป
                  </button>
                </div>
              );
            }

            if (msg.dailyGameShare) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 card border-amber-400/50 flex flex-col gap-2 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div>
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-amber-300">{pa.displayName}</span><span className="text-[10px] text-slate-400">{tStr}</span></div>
                      <p className="text-sm mt-0.5 whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => onOpenDailyGame?.(msg.dailyGameShare.gameIndex)} className="btn-w text-xs self-start ml-11 hover:scale-105 transition-transform">
                    <i className="fas fa-play mr-1"></i> ท้าดวลเกมนี้เลย
                  </button>
                </div>
              );
            }

            if (msg.isEventInvite) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 card border-emerald-400/50 flex flex-col gap-2 shadow-lg bg-[#0F2547]/50 w-full max-w-[280px]">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div>
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-emerald-300">{pa.displayName}</span><span className="text-[10px] text-slate-400">{tStr}</span></div>
                      <p className="text-xs mt-0.5 font-bold text-white">📅 ชวนเข้าร่วมกิจกรรม</p>
                    </div>
                  </div>
                  <div className="bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F] text-xs shadow-inner mt-1">
                    <div className="font-bold text-sky-200 mb-1.5 leading-snug">{msg.eventName}</div>
                    <div className="text-slate-400 text-[10px] flex items-center gap-1.5">
                      <span className="bg-[#0B1325] px-1.5 py-0.5 rounded border border-[#1E3A5F]"><i className="fas fa-map-marker-alt"></i> {msg.eventDate}</span>
                      <span className="bg-[#0B1325] px-1.5 py-0.5 rounded border border-[#1E3A5F]"><i className="fas fa-clock"></i> {msg.eventTime}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    <button type="button" onClick={() => updateEventRSVP(msg.eventId, 'going')} className="flex-1 btn-w text-[10px] py-1.5 shadow-md hover:bg-emerald-500 hover:text-white"><i className="fas fa-check"></i> ไป</button>
                    <button type="button" onClick={() => updateEventRSVP(msg.eventId, 'maybe')} className="flex-1 btn-d text-[10px] py-1.5 border-amber-500/50 text-amber-300 hover:bg-amber-900">🤷 อาจจะ</button>
                    <button type="button" onClick={() => updateEventRSVP(msg.eventId, 'decline')} className="flex-1 btn-d text-[10px] py-1.5 border-red-500/50 text-red-300 hover:bg-red-900"><i className="fas fa-times"></i> ไม่ไป</button>
                  </div>
                </div>
              );
            }

            if (msg.xmasTreeShare) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-[#081C1B] to-[#040D0E] flex flex-col gap-2.5 shadow-lg max-w-sm">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-amber-300 truncate">{pa.displayName}</span><span className="text-[10px] text-slate-400 shrink-0">{tStr}</span></div>
                      <p className="text-xs text-slate-100 mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                  <div className="bg-[#040D0E]/90 p-2.5 rounded-xl border border-amber-500/35 text-xs">
                    <div className="font-bold text-amber-200 truncate"><i className="fas fa-tree text-emerald-400 mr-1.5"></i>ต้นคริสต์มาสของ {msg.xmasTreeShare.ownerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {msg.xmasTreeShare.code} • ปี {msg.xmasTreeShare.year}</div>
                  </div>
                  <button type="button" onClick={() => onOpenXmasTree?.(msg.xmasTreeShare.code)} className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs self-start hover:scale-105 transition-transform flex items-center gap-1.5 shadow">
                    <i className="fas fa-gift"></i> เข้าไปแขวนคำอวยพร
                  </button>
                </div>
              );
            }

            if (msg.loySiemsiShare) {
              const pa = getAuthor(msg.senderId);
              return (
                <div key={msg.id} className="p-3.5 rounded-2xl border border-amber-400/55 bg-gradient-to-br from-[#0A162C] to-[#040914] flex flex-col gap-2.5 shadow-lg max-w-sm">
                  <div className="flex items-center gap-3">
                    <Avatar user={pa} size="sm" showStatus={true} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-amber-300 truncate">{pa.displayName}</span><span className="text-[10px] text-slate-400 shrink-0">{tStr}</span></div>
                      <p className="text-xs text-slate-100 mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                  <div className="bg-[#040914]/90 p-2.5 rounded-xl border border-amber-500/35 text-xs flex items-center gap-2.5">
                    {msg.loySiemsiShare.krathong && <div className="shrink-0"><KrathongSVG design={msg.loySiemsiShare.krathong} size={52} /></div>}
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5 flex-wrap">
                        <span>🎋 ใบที่ {msg.loySiemsiShare.num}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-[#040914] text-[9px]">{msg.loySiemsiShare.tier}</span>
                      </div>
                      <div className="text-white font-bold truncate">"{msg.loySiemsiShare.title}"</div>
                      <div className="text-[10px] text-slate-400 font-mono">เลขมงคล: {msg.loySiemsiShare.luckyNum}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onOpenLoyKrathong?.()} className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#040914] font-bold text-xs self-start hover:scale-105 transition-transform flex items-center gap-1.5 shadow">
                    <span>🪷</span> ไปลอยกระทง &amp; เสี่ยงเซียมซี
                  </button>
                </div>
              );
            }

            const s = getAuthor(msg.senderId);
            const rdrs = (msg.readBy || []).filter((id) => id !== msg.senderId);
            const isMe = currentUser && msg.senderId === currentUser.id;

            const highlightText = (text, highlight) => {
              if (!highlight.trim()) return <FormattedText text={text} currentUser={currentUser} isEdited={msg.isEdited} />;
              const parts = text.split(new RegExp(`(${escapeRegex(highlight.trim())})`, 'gi'));
              return (
                <span className="break-words">
                  {parts.map((part, i) =>
                    part.toLowerCase() === highlight.trim().toLowerCase()
                      ? <span key={i} className="search-highlight">{part}</span>
                      : part
                  )}
                  {msg.isEdited && <span className="ml-2 text-[10px] italic text-slate-400 opacity-70">(แก้ไขแล้ว)</span>}
                </span>
              );
            };

            const renderMediaGrid = (attachments) => {
              if (!attachments || attachments.length === 0) return null;
              const images = attachments.filter((a) => a.type === 'image');
              const others = attachments.filter((a) => a.type !== 'image');
              const gridClass = images.length === 2 ? 'media-grid-2' : images.length === 3 ? 'media-grid-3' : images.length >= 4 ? 'media-grid-4' : '';

              return (
                <div className="mt-2 space-y-2">
                  {images.length > 0 && (
                    <div className={images.length > 1 ? `media-grid ${gridClass} w-full max-w-sm` : 'w-full max-w-sm'}>
                      {images.slice(0, 4).map((att, idx) => (
                        <div key={att.id} className="relative">
                          <SmartMedia att={att} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openChatMsgMenu(e, msg, att); }} />
                          {idx === 3 && images.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xl font-bold rounded-xl pointer-events-none">
                              +{images.length - 4}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {others.length > 0 && (
                    <div className="space-y-2 w-full max-w-sm">
                      {others.map((att) => (
                        <SmartMedia key={att.id} att={att} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openChatMsgMenu(e, msg, att); }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div
                id={'msg-' + msg.id}
                key={msg.id}
                onContextMenu={(e) => openChatMsgMenu(e, msg, null)}
                {...longPressProps((ev) => openChatMsgMenu(ev, msg, null))}
                className={`flex items-end gap-2.5 group/msg ${isMe ? 'msg-right self-end flex-row-reverse' : 'msg-left self-start'} ${chatSearch && (msg.text || '').toLowerCase().includes(chatSearch.toLowerCase()) ? 'ring-2 ring-amber-500/50 rounded-2xl p-1 bg-amber-900/10' : ''}`}
              >
                <div onClick={() => openMemberProfile(s)} className="cursor-pointer shrink-0 mb-1 z-10">
                  <Avatar user={s} size="sm" showStatus={!isMe} />
                </div>

                <div className={`msg-bubble flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`text-[10px] text-slate-400 mb-1 flex items-center gap-2 ${isMe ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
                    {!isMe && (
                      <div className="flex items-center gap-1.5 cursor-pointer hover:underline" onClick={() => openMemberProfile(s)}>
                        <span className="font-bold text-sky-300">{s.displayName}</span>
                        <RoleBadge role={s.role} />
                      </div>
                    )}
                    <span>{tStr}</span>
                    {!msg.isDeleted && isMe && (
                      <div className="relative group/read cursor-pointer flex items-center gap-1">
                        {rdrs.length ? <span className="font-bold text-emerald-400 hover:underline">✓✓ อ่านแล้ว {rdrs.length}</span> : <span className="text-sky-300">✓ ส่งแล้ว</span>}
                        {rdrs.length > 0 && (
                          <div className="absolute bottom-full right-0 mb-2 w-max min-w-[150px] max-w-[200px] bg-[#0B1325] border border-[#1E3A5F] rounded-xl p-2 hidden group-hover/read:block z-50 shadow-2xl">
                            <div className="text-[10px] text-slate-400 mb-1.5 font-bold border-b border-[#1E3A5F] pb-1">👀 อ่านแล้วโดย:</div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                              {rdrs.map((rId) => {
                                const rUser = getAuthor(rId);
                                return (
                                  <div key={rId} className="flex items-center gap-2">
                                    <Avatar user={rUser} size="xs" />
                                    <span className="text-[10px] text-white truncate">{rUser.displayName}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.isSilent && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700" title="ส่งแบบไม่แจ้งเตือน"><i className="fas fa-bell-slash"></i></span>}
                  </div>

                  <div className={`msg-content text-sm p-3 rounded-2xl relative shadow-md ${isMe ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-[#0F2547] border border-[#1E3A5F] text-slate-200 rounded-tl-none'} ${msg.isDeleted ? 'bg-slate-800 border-slate-700 text-slate-400' : ''}`}>
                    {msg.isDeleted ? (
                      <p className="text-xs italic"><i className="fas fa-ban mr-1"></i> ข้อความนี้ถูกยกเลิกไปโดยผู้ส่ง</p>
                    ) : (
                      <>
                        {msg.replyTo && (
                          <div
                            className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-2 text-[11px] opacity-90 cursor-pointer ${isMe ? 'bg-sky-700 border-white text-sky-100' : 'bg-[#050811] border-sky-400 text-slate-300'}`}
                            onClick={() => document.getElementById('msg-' + msg.replyTo.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          >
                            <strong className={isMe ? 'text-white' : 'text-sky-300'}><i className="fas fa-reply mr-1"></i> {msg.replyTo.senderName}:</strong>
                            <div className="line-clamp-2 mt-0.5">{msg.replyTo.text}</div>
                          </div>
                        )}
                        {msg.text && <div className="whitespace-pre-line leading-relaxed">{highlightText(msg.text, chatSearch)}</div>}
                        {renderMediaGrid(msg.attachments)}
                      </>
                    )}
                  </div>

                  {!msg.isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions).map(([em, uids]) => {
                        if (!Array.isArray(uids) || uids.length === 0) return null;
                        const reacted = currentUser && uids.includes(currentUser.id);
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={() => toggleMsgReaction(msg, em)}
                            title={uids.map((id) => getAuthor(id).displayName).join(', ')}
                            className={`px-2 py-0.5 rounded-full text-[11px] border flex items-center gap-1 transition-all ${reacted ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold' : 'bg-[#0B1325] border-[#1E3A5F] text-slate-300 hover:border-slate-400'}`}
                          >
                            <span>{em}</span>
                            <span className="font-mono text-[10px]">{uids.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!msg.isDeleted && (
                    <div className={`flex gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isMe ? 'mr-2' : 'ml-2'}`}>
                      <LikeButton
                        likes={msg.likes}
                        currentUser={currentUser}
                        getAuthor={getAuthor}
                        onLike={() => db.collection('bma_messages').doc(msg.id).update({
                          likes: (msg.likes || []).includes(currentUser?.id)
                            ? msg.likes.filter((i) => i !== currentUser.id)
                            : [...(msg.likes || []), currentUser.id]
                        })}
                      />
                      {!(msg.roomKey === 'happy-birthday-dear' && msg.targetUserId && Date.now() - msg.timestamp > 86400000) && (
                        <button type="button" onClick={() => setRepMsg(msg)} className="px-2 py-0.5 rounded-full bg-[#0B1325] border border-[#1E3A5F] text-[9px] hover:bg-[#0F2547] text-slate-300 transition-colors">
                          <i className="fas fa-reply"></i> ตอบ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {roomTypers.length > 0 && (
            <div className="text-[10px] text-sky-300 animate-pulse bg-sky-950/30 w-max px-3 py-1.5 rounded-full border border-sky-900/50 self-start ml-2 mt-2 flex items-center gap-2">
              <div className="flex gap-[2px] items-center h-2 waveform text-sky-400">
                <span style={{ animationDelay: '0s' }}></span>
                <span style={{ animationDelay: '0.2s' }}></span>
                <span style={{ animationDelay: '0.4s' }}></span>
              </div>
              <strong>{roomTypers.map((t) => t.displayName).join(', ')}</strong> กำลังพิมพ์...
            </div>
          )}
        </div>

        {/* Mention Dropdown */}
        {mentOpen && (
          <div className="absolute bottom-24 left-4 max-w-sm w-full card p-2 z-40 max-h-48 overflow-y-auto space-y-1 text-xs shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-sky-500/50">
            <div className="text-[10px] text-slate-400 font-bold mb-1 px-2 border-b border-[#1E3A5F] pb-1">แท็กบุคคลหรือกลุ่ม</div>
            {mentionList().map((m, i) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  const w = chatIn.split(/\s+/);
                  if (w[w.length - 1]?.startsWith('@')) { w[w.length - 1] = m.token; setChatIn(w.join(' ') + ' '); }
                  else setChatIn((chatIn ? chatIn + ' ' : '') + m.token + ' ');
                  setMentOpen(false);
                  inputRef.current?.focus();
                }}
                className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-sky-900/40 transition-colors"
              >
                <span className="font-mono font-bold text-sky-100">{m.label}</span>
                <span className="text-slate-500 text-[10px]">{m.sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        {activeCh?.isSystemReadOnly || activeGrp?.isArchived ? (
          <div className="p-3 bg-[#0B1325] border-t border-[#1E3A5F] text-center text-xs text-slate-400 shrink-0">ห้องนี้อยู่ในโหมดอ่านอย่างเดียว</div>
        ) : (
          <div className="p-3 bg-[#0B1325] border-t border-[#1E3A5F] shrink-0 z-20 relative">
            <div className="space-y-2 mb-2 text-xs">
              {editMsg && <div className="flex justify-between px-2.5 py-1 rounded bg-amber-950/70 text-amber-200"><span><i className="fas fa-pen mr-1"></i> แก้ไข: {editMsg.text}</span><button type="button" onClick={() => { setEditMsg(null); setChatIn(''); }}><i className="fas fa-times"></i></button></div>}
              {repMsg && <div className="flex justify-between px-2.5 py-1 rounded bg-sky-950/70 text-sky-200"><span><i className="fas fa-reply mr-1"></i> ตอบกลับ {getAuthor(repMsg.senderId).displayName}: {repMsg.text || '[ไฟล์]'}</span><button type="button" onClick={() => setRepMsg(null)}><i className="fas fa-times"></i></button></div>}
              {uploading && <div className="text-sky-300 animate-pulse"><i className="fas fa-spinner fa-spin mr-1"></i> กำลังอัปโหลดไฟล์...</div>}
              {chatAtts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {chatAtts.map((a) => (
                    <span key={a.id} className="px-2 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-white flex items-center gap-1.5">
                      <i className={`fas ${a.type === 'image' ? 'fa-image' : a.type === 'video' ? 'fa-video' : a.type === 'audio' ? 'fa-music' : a.type === 'link' ? 'fa-link' : 'fa-file'} text-slate-400`}></i>
                      {a.name}
                      <button type="button" onClick={() => setChatAtts(chatAtts.filter((x) => x.id !== a.id))} className="text-red-400 font-bold ml-1 hover:text-red-300"><i className="fas fa-times"></i></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex items-end gap-2 bg-[#050811] rounded-2xl border border-[#1E3A5F] p-1 pr-1.5 focus-within:border-sky-500 transition-colors relative z-30">
              <div className="flex items-center gap-1 pb-1 pl-1 shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setCUrlOpen(!cUrlOpen); setEmoOpen(false); setShowGifPanel(false); }}
                    className={`w-8 h-8 rounded-full transition flex items-center justify-center font-bold border shadow-md ${cUrlOpen ? 'bg-red-500 text-white border-red-400 hover:bg-red-600' : 'bg-sky-500 text-white border-sky-400 hover:bg-sky-400 hover:scale-105'}`}
                    title="แนบไฟล์ / ฟังก์ชันพิเศษ"
                  >
                    <i className={`fas ${cUrlOpen ? 'fa-times' : 'fa-plus'} text-[14px]`}></i>
                  </button>

                  {cUrlOpen && (
                    <div className="absolute bottom-full left-0 mb-3 w-max bg-[#0B1325] border border-[#1E3A5F] rounded-xl p-1.5 flex flex-col shadow-2xl z-50 text-xs text-left animate-fade-in">
                      <input
                        type="file"
                        multiple
                        ref={cFileRef}
                        onChange={async (e) => {
                          const fl = Array.from(e.target.files || []);
                          e.target.value = '';
                          setUploading(true);
                          for (const f of fl) {
                            try { const a = await uploadChunked(f); setChatAtts((p) => [...p, a]); } catch (err) { alert(err.message); }
                          }
                          setUploading(false);
                          setCUrlOpen(false);
                        }}
                        className="hidden"
                      />
                      <button type="button" onClick={() => cFileRef.current?.click()} className="px-3 py-2.5 hover:bg-[#0F2547] rounded-lg text-slate-200 hover:text-white flex items-center gap-2.5 text-left"><i className="fas fa-upload w-4 text-center text-slate-400"></i> อัปโหลดไฟล์จากเครื่อง</button>
                      <button type="button" onClick={() => { setShowLinkModal(true); setCUrlOpen(false); }} className="px-3 py-2.5 hover:bg-[#0F2547] rounded-lg text-slate-200 hover:text-white flex items-center gap-2.5 text-left"><i className="fas fa-link w-4 text-center text-slate-400"></i> แนบลิงก์ (URL)</button>
                      <button type="button" onClick={() => { setMentOpen(!mentOpen); setMentF(''); setCUrlOpen(false); }} className="px-3 py-2.5 hover:bg-[#0F2547] rounded-lg text-slate-200 hover:text-white flex items-center gap-2.5 text-left"><i className="fas fa-at w-4 text-center text-slate-400"></i> แท็กบุคคล (@)</button>

                      <div className="relative">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCGameOpen(!cGameOpen); }} className="w-full px-3 py-2.5 hover:bg-amber-900/30 rounded-lg text-amber-300 flex items-center gap-2.5 text-left font-bold">
                          <i className="fas fa-gamepad w-4 text-center"></i> ชวนเล่นแชตเกม <i className={`fas fa-chevron-${cGameOpen ? 'down' : 'right'} ml-auto text-[10px]`}></i>
                        </button>
                        {cGameOpen && (
                          <div className="mt-1 ml-6 space-y-1 border-l-2 border-[#1E3A5F] pl-2">
                            {[
                              { id: 'chess', n: 'หมากรุก (ไม่จำกัดเวลา)', i: '♟️' },
                              { id: 'chess_3', n: 'หมากรุก (3 นาที)', i: '⏳' },
                              { id: 'chess_5', n: 'หมากรุก (5 นาที)', i: '⏳' },
                              { id: 'checkers', n: 'หมากฮอส', i: '🔴' },
                              { id: 'snl', n: 'บันไดงู', i: '🐍' },
                              { id: 'connect4', n: 'Connect 4', i: '🟡' },
                              { id: 'domino', n: 'โดมิโน', i: '🁣' },
                              { id: 'sttt', n: 'Super Tic-Tac-Toe', i: '✖️' }
                            ].map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setCGameOpen(false);
                                  setCUrlOpen(false);
                                  const gid = 'cg-' + Date.now();
                                  const realId = g.id.split('_')[0];
                                  const timerSetting = g.id.includes('_') ? parseInt(g.id.split('_')[1], 10) * 60 : null;
                                  await db.collection('bma_chat_games').doc(gid).set({
                                    id: gid, type: realId, name: g.n, players: [currentUser.id], status: 'waiting', gameState: {}, timerSetting, rematch: [], timestamp: Date.now()
                                  });
                                  const mid = 'msg-' + Date.now();
                                  await db.collection('bma_messages').doc(mid).set({
                                    id: mid, roomKey, senderId: currentUser.id, receiverId: activeRoom.type === 'dm' ? activeRoom.id : null,
                                    text: 'ชวนเล่นเกม ' + g.n, isGameInvite: true, gameId: gid, gameType: realId, gameName: g.n,
                                    readBy: [currentUser.id], isDeleted: false, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), timestamp: Date.now(), serverCreatedAt: svrTs()
                                  });
                                  setActiveChatGameId(gid);
                                }}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-[#0F2547] rounded-lg flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                              >
                                <span>{g.i}</span> <span>{g.n}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {activeRoom.type === 'dm' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const now = Date.now();
                            const id = 'msg-' + now;
                            await db.collection('bma_messages').doc(id).set({
                              id, roomKey, senderId: currentUser.id, receiverId: activeRoom.id, text: '👋 สะกิดคุณ!', attachments: [], likes: [],
                              readBy: [currentUser.id], isEdited: false, isDeleted: false, isSystemPostAlert: false,
                              time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), timestamp: now, serverCreatedAt: svrTs()
                            });
                            sendNotif?.({ recipientId: activeRoom.id, actorId: currentUser.id, category: 'messages', subType: 'dm_chat', title: '👋 ' + currentUser.displayName + ' สะกิดคุณ!', body: 'สะกิดคุณ!', targetView: 'chat', targetRoomType: 'dm', targetRoomId: currentUser.id });
                            setCUrlOpen(false);
                          }}
                          className="px-3 py-2.5 mt-1 border-t border-[#1E3A5F] hover:bg-fuchsia-900/30 rounded-lg text-fuchsia-300 flex items-center gap-2.5 text-left font-bold"
                        >
                          <i className="fas fa-hand-sparkles w-4 text-center"></i> สะกิดเตือน (Poke)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Emoji */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setEmoOpen(!emoOpen); setShowGifPanel(false); setCUrlOpen(false); }}
                    className={`w-8 h-8 rounded-full transition flex items-center justify-center text-[16px] border shadow-sm ${emoOpen ? 'bg-amber-900/40 border-amber-500/50' : 'text-slate-200 bg-[#0F2547] border-white/20 hover:text-white hover:bg-amber-900/40 hover:border-amber-500/50'}`}
                    title="ส่งอีโมจิ"
                  >
                    🙂
                  </button>
                  {emoOpen && (
                    <div className="absolute bottom-full left-0 mb-3 w-64 bg-[#0B1325] border border-[#1E3A5F] p-2 z-50 shadow-2xl rounded-xl text-xl grid grid-cols-6 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {['😀','😂','🤣','😊','😍','😘','🥰','😜','😎','🤩','😭','😡','🤯','🥶','😱','🤡','👻','💀','👽','👾','💖','💔','💯','💥','💦','💨','👍','👎','👏','🙌','🤝','🙏','💪','🏆','🔥','✨','🎉','🎊','🎈','🧸'].map((em) => (
                        <button key={em} type="button" onClick={() => { setChatIn((prev) => prev + em); setEmoOpen(false); inputRef.current?.focus(); }} className="hover:bg-[#0F2547] rounded p-1 flex items-center justify-center h-8">{em}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* GIF */}
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => { setShowGifPanel(!showGifPanel); setEmoOpen(false); setCUrlOpen(false); }}
                    className={`w-8 h-8 rounded-full transition flex items-center justify-center text-[10px] font-bold border shadow-sm ${showGifPanel ? 'bg-purple-900/50 text-purple-300 border-purple-500/50' : 'bg-[#0F2547] text-purple-300 border-white/20 hover:bg-purple-900/50 hover:text-purple-200 hover:border-purple-500/50'}`}
                    title="ส่ง GIF"
                  >
                    GIF
                  </button>
                  {showGifPanel && (
                    <GiphyPickerPopover
                      onClose={() => setShowGifPanel(false)}
                      onSelect={(gifUrl) => setChatAtts((prev) => [...prev, { id: 'att-gif-' + Date.now(), name: 'GIF', type: 'image', url: gifUrl, size: 'GIF' }])}
                    />
                  )}
                </div>
              </div>

              <textarea
                ref={inputRef}
                rows={1}
                value={chatIn}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(e); } }}
                onChange={(e) => {
                  const v = e.target.value;
                  setChatIn(v);
                  setTyping(v.trim().length > 0);
                  clearTimeout(typTimer.current);
                  typTimer.current = setTimeout(() => setTyping(false), 3500);
                  const lw = v.split(/\s+/).pop() || '';
                  if (lw.startsWith('@')) { setMentOpen(true); setMentF(lw.slice(1).toLowerCase()); }
                  else setMentOpen(false);
                }}
                placeholder="พิมพ์ข้อความ... (ใช้ @ เพื่อแท็ก)"
                className="flex-1 bg-transparent text-sm text-white resize-none outline-none py-2.5 custom-scrollbar max-h-24 placeholder-slate-500"
              />

              <div className="flex items-center gap-1 pb-1 pr-1 shrink-0">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-8 h-8 rounded-full transition flex items-center justify-center ${isRecording ? 'bg-red-900/50 text-red-400 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'}`}
                  title={isRecording ? 'หยุดบันทึกเสียง' : 'ส่งข้อความเสียง'}
                >
                  {isRecording ? (
                    <div className="flex gap-[2px] waveform text-red-400 h-3.5 items-center">
                      <span style={{ animationDelay: '0.1s' }}></span>
                      <span style={{ animationDelay: '0.3s' }}></span>
                      <span style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  ) : (
                    <i className="fas fa-microphone"></i>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSilentMsg(!isSilentMsg)}
                  className={`w-8 h-8 rounded-full transition flex items-center justify-center ${isSilentMsg ? 'text-amber-400 bg-amber-900/30' : 'text-slate-400 hover:text-amber-400 hover:bg-[#0F2547]'}`}
                  title={isSilentMsg ? 'โหมดส่งข้อความ: ไม่แจ้งเตือน (Silent)' : 'โหมดส่งข้อความ: แจ้งเตือนปกติ'}
                >
                  <i className={`fas ${isSilentMsg ? 'fa-bell-slash' : 'fa-bell'}`}></i>
                </button>

                <button type="submit" className="w-8 h-8 rounded-full bg-sky-500 text-white hover:bg-sky-400 transition flex items-center justify-center shadow-md ml-0.5" title="ส่งข้อความ">
                  <i className="fas fa-paper-plane text-xs -ml-0.5"></i>
                </button>
              </div>
            </form>

            {isSilentMsg && (
              <div className="absolute -top-6 right-4 bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[10px] px-3 py-1 rounded-full shadow-lg z-50 animate-fade-in font-bold">
                🔕 ส่งแบบไม่แจ้งเตือน
              </div>
            )}
          </div>
        )}
      </main>

      {/* RIGHT SIDEBAR (Members Drawer) */}
      <aside className={`absolute z-40 w-64 bg-[#070C18] border-l border-[#1E3A5F] flex flex-col shrink-0 h-full overflow-hidden text-xs right-0 transition-transform duration-300 ${rightOpen ? 'translate-x-0 shadow-[-10px_0_20px_rgba(0,0,0,0.5)] relative' : 'translate-x-full absolute'} md:w-64`}>
        <div className="p-3 border-b border-[#1E3A5F] flex justify-between items-center bg-[#050811]">
          <span className="font-bold text-slate-200">👥 สมาชิกห้อง ({activeMembers.length})</span>
          <button type="button" onClick={() => setRightOpen(false)} className="md:hidden w-7 h-7 rounded bg-[#0F2547] text-slate-400 hover:text-white flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>

        <div className="p-3 border-b border-[#1E3A5F] relative z-20 bg-gradient-to-b from-[#050811] to-transparent">
          <button
            type="button"
            onClick={() => setRightFilterMenuOpen(!rightFilterMenuOpen)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex justify-between items-center border transition-colors shadow-sm ${rightTag !== 'ALL' || rightOnlineOnly ? 'bg-sky-600 border-sky-500 text-white' : 'bg-white text-[#050811] border-transparent hover:bg-slate-200'}`}
          >
            <div className="flex items-center gap-2"><i className="fas fa-sliders-h"></i><span>คัดกรองสมาชิก</span></div>
            {(rightTag !== 'ALL' || rightOnlineOnly) ? <span className="bg-[#050811] text-sky-400 px-1.5 py-0.5 rounded-md text-[10px]">เปิดอยู่</span> : <i className="fas fa-chevron-down text-[10px]"></i>}
          </button>

          {rightFilterMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setRightFilterMenuOpen(false)}></div>
              <div className="absolute top-full mt-2 left-3 right-3 bg-[#0B1325] p-3 z-40 shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-[#1E3A5F] rounded-xl text-xs flex flex-col gap-3">
                <div>
                  <div className="font-bold text-sky-300 mb-1.5 flex items-center gap-1.5"><i className="fas fa-tag"></i> หมวดหมู่สมาชิก</div>
                  <select value={rightTag} onChange={(e) => setRightTag(e.target.value)} className="w-full inp py-1.5 text-xs text-white bg-[#050811]">
                    <option value="ALL">ทั้งหมด (All Tags)</option>
                    {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer border-t border-[#1E3A5F] pt-3 mt-1">
                  <input type="checkbox" checked={rightOnlineOnly} onChange={(e) => setRightOnlineOnly(e.target.checked)} className="rounded bg-[#050811] border-[#1E3A5F] w-4 h-4 accent-sky-500" />
                  <span className="font-bold text-slate-200">🟢 เฉพาะคนที่ออนไลน์ใน 24 ชม.</span>
                </label>
                {(rightTag !== 'ALL' || rightOnlineOnly) && (
                  <button type="button" onClick={() => { setRightTag('ALL'); setRightOnlineOnly(false); setRightFilterMenuOpen(false); }} className="mt-2 btn-d py-1.5 w-full text-red-300 hover:text-white hover:bg-red-950 font-bold border-red-900/50">
                    ✕ ล้างฟิลเตอร์
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {activeMembers
            .filter((m) => {
              if (rightTag !== 'ALL' && !getTags(m).includes(rightTag)) return false;
              if (rightOnlineOnly && Date.now() - (m.lastActive || 0) > 86400000) return false;
              return true;
            })
            .map((m) => {
              const stat = getStatusInfo(m);
              return (
                <div
                  key={m.id}
                  onClick={() => openMemberProfile(m)}
                  onContextMenu={(e) => onOpenMemberMenu?.(e, m, (token) => {
                    setChatIn((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${token} `);
                    inputRef.current?.focus();
                  })}
                  {...longPressProps((ev) => onOpenMemberMenu?.(ev, m))}
                  className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-colors ${stat.t === 'Online' ? 'bg-[#0B1325] border-emerald-900/40 hover:border-emerald-500/80' : 'bg-[#050811] border-[#1E3A5F] hover:bg-[#0F2547]'}`}
                >
                  <Avatar user={m} size="sm" showStatus={true} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate text-[12px] text-slate-100">{m.displayName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono bg-black/40 px-1 rounded text-sky-400">{m.id}</span>
                      <div className={`text-[9px] font-bold ${stat.t === 'Online' ? 'text-emerald-400' : stat.t === 'AFK' ? 'text-amber-400' : 'text-slate-500'}`}>{stat.t}</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </aside>

      {/* Lazy Chat Game Modal */}
      {activeChatGameId && (
        <Suspense fallback={null}>
          <ChatGameModal
            gameId={activeChatGameId}
            onClose={() => setActiveChatGameId(null)}
            activeRoom={activeRoom}
            roomKey={roomKey}
          />
        </Suspense>
      )}

      {/* Chat Modals */}
      <ChatModals
        currentUser={currentUser}
        activeMembers={activeMembers}
        channels={channels}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        activeGrp={activeGrp}
        isModOrAdmin={isModOrAdmin}
        dmKey={dmKey}
        addMemOpen={addMemOpen} setAddMemOpen={setAddMemOpen}
        cGrpOpen={cGrpOpen} setCGrpOpen={setCGrpOpen}
        cChOpen={cChOpen} setCChOpen={setCChOpen}
        delTgt={delTgt} setDelTgt={setDelTgt}
        fwdMsg={fwdMsg} setFwdMsg={setFwdMsg}
        showLinkModal={showLinkModal} setShowLinkModal={setShowLinkModal}
        onAttachLink={(att) => setChatAtts((prev) => [...prev, att])}
      />
    </div>
  );
}