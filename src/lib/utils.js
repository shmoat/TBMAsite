import { useState, useEffect } from 'react';
import { db } from './firebase';

export const PRESET_TAGS = ['LCs & Pal', 'PCSHS', 'KPN', 'KMUTT', 'Instrumix', 'Others'];
export const SOCIALS = [
  { id: 'Facebook', icon: '📘' },
  { id: 'Instagram', icon: '📸' },
  { id: 'YouTube', icon: '▶️' },
  { id: 'TikTok', icon: '🎵' },
  { id: 'External Link', icon: '🔗' }
];

export const OWNER_SEED = {
  id: 'M000',
  username: '',
  isActivated: false,
  role: 'admin',
  memberTag: 'LCs & Pal',
  memberTags: ['LCs & Pal'],
  displayName: 'Founder (M000)',
  bio: 'ผู้ก่อตั้งและผู้ดูแลสูงสุดแห่ง The Blue Moon Association',
  avatarUrl: '',
  socialLinks: [],
  usernameChangeHistory: [],
  notifPrefs: { muteOwnPosts: false, muteGlobalChat: false, mutePrivateChat: false },
  isOnline: false,
  lastActive: 0,
  joinedAt: '2026-10-08',
  birthDate: ''
};

export const DEF_CH = [
  { id: 'global-lobby', name: 'blue-moon-lobby', icon: '🌐', desc: 'โถงหลักสำหรับสมาชิกทุกคนในสมาคม', createdBy: 'M000', isProtected: true, isSystemReadOnly: false, timestamp: 1000 },
  { id: 'global-announce', name: 'announcements', icon: '📢', desc: 'ห้องแจ้งเตือนอัตโนมัติเมื่อมีโพสต์ใหม่ในเว็บไซต์ (ไม่อนุญาตให้พิมพ์)', createdBy: 'SYSTEM', isProtected: true, isSystemReadOnly: true, timestamp: 2000 },
  { id: 'happy-birthday-dear', name: 'happy-birthday-dear', icon: '🎂', desc: 'ห้องสำหรับส่งคำอวยพรวันเกิดให้สมาชิก', createdBy: 'SYSTEM', isProtected: true, isSystemReadOnly: false, timestamp: 3000 }
];

export const parseYouTubeUrl = (url) => {
  const result = { videoId: null, listId: null };
  const listMatch = url.match(/[?&]list=([^#&?]+)/);
  if (listMatch && listMatch[1]) result.listId = listMatch[1];
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  if (match && match[2].length === 11) result.videoId = match[2];
  return (result.videoId || result.listId) ? result : null;
};

export const getMs = (d) =>
  d?.serverCreatedAt?.toMillis
    ? d.serverCreatedAt.toMillis()
    : (d?.serverCreatedAt?.seconds ? d.serverCreatedAt.seconds * 1000 : (d?.timestamp || 0));

export const getTimeStr = (d) => {
  if (d?.serverCreatedAt?.toDate) {
    const dt = d.serverCreatedAt.toDate();
    const dStr = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const tStr = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${dStr} ${tStr}`;
  }
  return d?.time || '';
};

export const getTags = (u) =>
  Array.isArray(u?.memberTags) && u.memberTags.length ? u.memberTags : [u?.memberTag || 'Others'];

export const fmtTime = (s) =>
  (!isFinite(s) || s === Infinity)
    ? 'Bomb'
    : `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export function getBkkNow() {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (7 * 3600000));
}

export function getGameDateStr() {
  const bkkDate = getBkkNow();
  if (bkkDate.getHours() < 6) bkkDate.setDate(bkkDate.getDate() - 1);
  return `${bkkDate.getFullYear()}-${String(bkkDate.getMonth() + 1).padStart(2, '0')}-${String(bkkDate.getDate()).padStart(2, '0')}`;
}

export function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const getDef = () => (typeof defaultValue === 'function' ? defaultValue() : defaultValue);
    try {
      const v = window.localStorage.getItem(key);
      if (v === null || v === 'undefined') return getDef();
      return JSON.parse(v);
    } catch {
      return getDef();
    }
  });
  useEffect(() => {
    try {
      if (value !== undefined) window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage เต็มหรือไม่สามารถเซฟได้:', e);
    }
  }, [key, value]);
  return [value, setValue];
}

export class PRNG {
  constructor(seedStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    this.a = h;
  }
  next() {
    let t = (this.a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  nextFloat() { return this.next() / 4294967296; }
  nextInt(min, max) { return min + Math.floor(this.nextFloat() * (max - min + 1)); }
  shuffle(arr) {
    const res = [...arr];
    for (let i = res.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }
}

let _bmaSfxCtx = null;
export const isGameSfxMuted = () => {
  try { return localStorage.getItem('tbma_game_sfx_muted') === '1'; } catch { return false; }
};

export const playGameSfx = (type = 'tap') => {
  if (isGameSfxMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_bmaSfxCtx || _bmaSfxCtx.state === 'closed') _bmaSfxCtx = new AC();
    if (_bmaSfxCtx.state === 'suspended') _bmaSfxCtx.resume();
    const ctx = _bmaSfxCtx;
    const now = ctx.currentTime;
    const tone = (freq, endFreq, dur, wave = 'sine', vol = 0.09, delay = 0) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + delay);
      if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + dur);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };
    if (type === 'tap') tone(520, 620, 0.045, 'triangle', 0.07);
    else if (type === 'card') tone(340, 500, 0.06, 'sine', 0.08);
    else if (type === 'flag') { tone(760, 880, 0.045, 'triangle', 0.07); tone(980, 980, 0.05, 'triangle', 0.06, 0.045); }
    else if (type === 'merge') tone(420, 680, 0.09, 'triangle', 0.09);
    else if (type === 'undo') tone(440, 290, 0.07, 'sine', 0.07);
    else if (type === 'error') tone(170, 120, 0.14, 'sawtooth', 0.06);
    else if (type === 'bonus') { tone(784, 784, 0.08, 'triangle', 0.09, 0); tone(1046, 1046, 0.09, 'triangle', 0.09, 0.07); tone(1318, 1318, 0.14, 'sine', 0.09, 0.14); }
    else if (type === 'win') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.09, i * 0.08)); }
    else if (type === 'bomb' || type === 'lose') { tone(190, 48, 0.34, 'sawtooth', 0.1); tone(110, 38, 0.38, 'square', 0.05, 0.04); }
  } catch {}
};

const CHUNK_LEN = 700 * 1024;
const compressImg = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      const m = 1400;
      if (w > h && w > m) { h *= m / w; w = m; } else if (h > m) { w *= m / h; h = m; }
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = rej;
    img.src = e.target.result;
  };
  r.onerror = rej;
  r.readAsDataURL(file);
});

export async function uploadChunked(file) {
  if (file.size > 10485760) throw new Error('ไฟล์ "' + file.name + '" เกิน 10MB กรุณาแนบเป็นลิงก์แทน');
  const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
  let dataUrl;
  if (type === 'image' && file.type !== 'image/gif') {
    dataUrl = await compressImg(file);
  } else {
    dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  const id = 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const size = file.size > 1048576 ? (file.size / 1048576).toFixed(2) + ' MB' : (file.size / 1024).toFixed(1) + ' KB';
  if (dataUrl.length <= CHUNK_LEN) return { id, name: file.name, type, url: dataUrl, isChunked: false, size };
  const chunkIds = [];
  for (let i = 0; i < Math.ceil(dataUrl.length / CHUNK_LEN); i++) {
    const cId = id + '_p' + i;
    await db.collection('bma_file_chunks').doc(cId).set({
      id: cId, parentId: id, index: i, data: dataUrl.slice(i * CHUNK_LEN, (i + 1) * CHUNK_LEN)
    });
    chunkIds.push(cId);
  }
  return { id, name: file.name, type, url: '', isChunked: true, chunkIds, size };
}