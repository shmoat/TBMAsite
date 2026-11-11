// ==========================================
// utils.js - การตั้งค่า Firebase และฟังก์ชันตัวช่วยพื้นฐาน
// ==========================================
const { useState, useEffect, useRef, useCallback } = React;

// 1. Firebase Config
const firebaseConfig = { 
  apiKey: "AIzaSyD80Ml5mk7IGFOx0qx4HRL-D_3TEy9h0YI", 
  authDomain: "tbmasite.firebaseapp.com", 
  projectId: "tbmasite", 
  storageBucket: "tbmasite.firebasestorage.app", 
  messagingSenderId: "616851307256", 
  appId: "1:616851307256:web:15b49dfec2de521af6990d", 
  measurementId: "G-JDW0E0S138" 
};
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
const db = firebase.firestore(app);
const svrTs = () => firebase.firestore.FieldValue.serverTimestamp();
let openZoom = () => {};

// 2. Base Utilities (ฟังก์ชันพื้นฐาน)
const parseYouTubeUrl = (url) => {
  const result = { videoId: null, listId: null };
  const listRegExp = /[?&]list=([^#\&\?]+)/;
  const listMatch = url.match(listRegExp);
  if (listMatch && listMatch[1]) result.listId = listMatch[1];
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) result.videoId = match[2];
  return (result.videoId || result.listId) ? result : null;
};

const getMs = (d) => d?.serverCreatedAt?.toMillis ? d.serverCreatedAt.toMillis() : (d?.serverCreatedAt?.seconds ? d.serverCreatedAt.seconds * 1000 : (d?.timestamp || 0));

const getTimeStr = (d) => {
  if (d?.serverCreatedAt?.toDate) {
    const dt = d.serverCreatedAt.toDate();
    const dStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const tStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${dStr} ${tStr}`;
  }
  return d?.time || '';
};

const getTags = (u) => Array.isArray(u?.memberTags) && u.memberTags.length ? u.memberTags : [u?.memberTag || 'Others'];
const safeUrl = (u) => (!u ? '#' : /^https?:\/\//i.test(u.trim()) ? u.trim() : 'https://' + u.trim());
const fmtTime = (s) => (!isFinite(s) || s === Infinity) ? "Bomb" : `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

function getGameDateStr() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bkkDate = new Date(utcMs + (7 * 3600000));
  if (bkkDate.getHours() < 6) bkkDate.setDate(bkkDate.getDate() - 1);
  return `${bkkDate.getFullYear()}-${(bkkDate.getMonth()+1).toString().padStart(2,'0')}-${bkkDate.getDate().toString().padStart(2,'0')}`;
}

// 3. Custom Hooks
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try { const v = window.localStorage.getItem(key); return v !== null ? JSON.parse(v) : defaultValue; } 
    catch (e) { return defaultValue; }
  });
  useEffect(() => { window.localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

// 4. Constants (ค่าคงที่ต่างๆ)
const PRESET_TAGS = ['LCs & Pal', 'PCSHS', 'KPN', 'KMUTT', 'Instrumix', 'Others'];
const SOCIALS = [{ id: 'Facebook', icon: '📘' }, { id: 'Instagram', icon: '📸' }, { id: 'YouTube', icon: '▶️' }, { id: 'TikTok', icon: '🎵' }, { id: 'External Link', icon: '🔗' }];
const OWNER_SEED = { id: 'M000', username: '', password: '', isActivated: false, role: 'admin', memberTag: 'LCs & Pal', memberTags: ['LCs & Pal'], displayName: 'Founder (M000)', bio: 'ผู้ก่อตั้งและผู้ดูแลสูงสุดแห่ง The Blue Moon Association', avatarUrl: '', socialLinks: [], usernameChangeHistory: [], notifPrefs: { muteOwnPosts: false, muteGlobalChat: false, mutePrivateChat: false }, isOnline: false, lastActive: 0, joinedAt: '2026-10-08', birthDate: '' };
const DEF_CH = [
  { id: 'global-lobby', name: 'blue-moon-lobby', icon: '🌐', desc: 'โถงหลักสำหรับสมาชิกทุกคนในสมาคม', createdBy: 'M000', isProtected: true, isSystemReadOnly: false, timestamp: 1000 },
  { id: 'global-announce', name: 'announcements', icon: '📢', desc: 'ห้องแจ้งเตือนอัตโนมัติเมื่อมีโพสต์ใหม่ในเว็บไซต์ (ไม่อนุญาตให้พิมพ์)', createdBy: 'SYSTEM', isProtected: true, isSystemReadOnly: true, timestamp: 2000 },
  { id: 'happy-birthday-dear', name: 'happy-birthday-dear', icon: '🎂', desc: 'ห้องสำหรับส่งคำอวยพรวันเกิดให้สมาชิก', createdBy: 'SYSTEM', isProtected: true, isSystemReadOnly: false, timestamp: 3000 }
];
const GAMES = [{ id: 'sudoku', name: "Sudoku (9x9)", icon: "🔢" }, { id: 'minesweeper', name: "Minesweeper", icon: "💣" }, { id: 'flag', name: "Flag Guesser", icon: "🏳️" }, { id: 'solitaire', name: "Solitaire", icon: "🃏" }, { id: 'wordle', name: "Wordle", icon: "🔤" }, { id: 'snake', name: "Snake", icon: "🐍" }, { id: '2048', name: "2048 (100 Moves)", icon: "🟨" }, { id: '24game', name: "Daily 24", icon: "➗" }, { id: 'resistor', name: "Resistor Code", icon: "🔌" }];

// 5. PRNG (ระบบสุ่ม)
class PRNG {
  constructor(seedStr) { let h = 2166136261 >>> 0; for(let i=0; i<seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); } this.a = h; }
  next() { let t = this.a += 0x6D2B79F5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0); }
  nextFloat() { return this.next() / 4294967296; }
  nextInt(min, max) { return min + Math.floor(this.nextFloat() * (max - min + 1)); }
  shuffle(arr) { let res = [...arr]; for(let i=res.length-1; i>0; i--) { const j = this.nextInt(0, i); [res[i], res[j]] = [res[j], res[i]]; } return res; }
}

// 6. File Upload Utils
const CHUNK_LEN = 700 * 1024;
const compressImg = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); let w = img.width, h = img.height, m = 1400;
      if (w > h && w > m) { h *= m / w; w = m; } else if (h > m) { w *= m / h; h = m; }
      c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); res(c.toDataURL('image/jpeg', 0.82));
    }; img.onerror = rej; img.src = e.target.result;
  }; r.onerror = rej; r.readAsDataURL(file);
});

async function uploadChunked(file) {
  if (file.size > 10485760) throw new Error('ไฟล์ "' + file.name + '" เกิน 10MB กรุณาแนบเป็นลิงก์แทน');
  const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
  let dataUrl;
  if (type === 'image' && file.type !== 'image/gif') {
     dataUrl = await compressImg(file);
  } else {
     dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  const id = 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const size = file.size > 1048576 ? (file.size / 1048576).toFixed(2) + ' MB' : (file.size / 1024).toFixed(1) + ' KB';
  if (dataUrl.length <= CHUNK_LEN) return { id, name: file.name, type, url: dataUrl, isChunked: false, size };
  const chunkIds = [];
  for (let i = 0; i < Math.ceil(dataUrl.length / CHUNK_LEN); i++) {
    const cId = id + '_p' + i;
    await db.collection('bma_file_chunks').doc(cId).set({ id: cId, parentId: id, index: i, data: dataUrl.slice(i * CHUNK_LEN, (i + 1) * CHUNK_LEN) });
    chunkIds.push(cId);
  }
  return { id, name: file.name, type, url: '', isChunked: true, chunkIds, size };
}