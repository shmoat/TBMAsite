import React, { useState, useEffect, useCallback } from 'react';
import { db, tbmaAuthRequest } from '../../lib/firebase';
import { logAdminAudit } from '../../lib/security';
import { getTags } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, RoleBadge, TagBadges, Modal, getStatusInfo } from '../../components/BasicUI';
import { AuditLogPanel } from '../../components/AuditLogPanel';

export default function OwnerPage({
  posts = [],
  chatMessages = [],
  groups = [],
  bmaEvents = [],
  allTags = [],
  guestStats = { totalVisits: 0, uniqueVisitors: 0, daily: {}, lastVisitAt: 0 },
  guestFeedbacks = [],
  themePreview = 'auto',
  setThemePreview,
  xmasPreviewUnlock = false,
  setXmasPreviewUnlock,
  onOpenXmasTree,
  onOpenLoyWelcome
}) {
  const { users, currentUser } = useAuth();
  const { openMemberProfile } = useUI();

  const [subTab, setSubTab] = useState('dashboard');
  const [fbSearch, setFbSearch] = useState('');
  const [fbCatFilter, setFbCatFilter] = useState('ALL');
  const [fbStatusFilter, setFbStatusFilter] = useState('ALL');

  const [idType, setIdType] = useState('M');
  const [newMId, setNewMId] = useState('');
  const [hostMemberId, setHostMemberId] = useState('');
  const [newMTags, setNewMTags] = useState(['LCs & Pal']);
  const [cTag, setCTag] = useState('');
  const [lastCreatedUser, setLastCreatedUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [searchMember, setSearchMember] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');

  const [editTagU, setEditTagU] = useState(null);
  const [editTagL, setEditTagL] = useState([]);
  const [resetPassU, setResetPassU] = useState(null);
  const [newPassVal, setNewPassVal] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const getNextMId = useCallback(() => {
    const max = users.reduce((m, u) => {
      const r = String(u.id).match(/^M(\d+)$/i);
      return r ? Math.max(m, parseInt(r[1], 10)) : m;
    }, 0);
    return 'M' + String(max + 1).padStart(3, '0');
  }, [users]);

  const getNextFId = useCallback(() => {
    const max = users.reduce((m, u) => {
      const r = String(u.id).match(/^F(\d+)$/i);
      return r ? Math.max(m, parseInt(r[1], 10)) : m;
    }, 0);
    return 'F' + String(max + 1).padStart(3, '0');
  }, [users]);

  useEffect(() => {
    if (idType === 'M') {
      setNewMId(getNextMId());
    } else if (hostMemberId) {
      setNewMId('F' + hostMemberId.substring(1));
    } else {
      setNewMId(getNextFId());
    }
  }, [idType, hostMemberId, getNextMId, getNextFId]);

  const activeUsers = users.filter((u) => u.isActivated);
  const pendingUsers = users.filter((u) => !u.isActivated);
  const onlineNow = activeUsers.filter((u) => u.isOnline && (Date.now() - (u.lastActive || 0) < 300000));
  const active24h = activeUsers.filter((u) => (Date.now() - (u.lastActive || 0) < 86400000));
  const followersCount = users.filter((u) => String(u.id).startsWith('F')).length;
  const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);

  const getBkkDateKey = (offsetDays = 0) => {
    const now = new Date();
    const bkk = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (7 * 3600000));
    bkk.setDate(bkk.getDate() + offsetDays);
    return `${bkk.getFullYear()}-${String(bkk.getMonth() + 1).padStart(2, '0')}-${String(bkk.getDate()).padStart(2, '0')}`;
  };

  const dailyMap = guestStats?.daily || {};
  const todayVisits = dailyMap[getBkkDateKey(0)] || 0;
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const key = getBkkDateKey(i - 6);
    return { key, label: key.slice(5), val: dailyMap[key] || 0 };
  });
  const maxDailyVisits = Math.max(1, ...last7Days.map((d) => d.val));
  const unreadFbCount = guestFeedbacks.filter((f) => f.status === 'new').length;

  const formatLastVisit = (ts) => {
    if (!ts) return 'ยังไม่มีข้อมูล';
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} ชม. ที่แล้ว`;
    return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const FB_CATS = {
    request_tool: { label: 'ขอเครื่องมือใหม่', icon: 'fas fa-tools', cls: 'bg-sky-950/70 text-sky-300 border-sky-500/40' },
    bug: { label: 'แจ้งปัญหา / บั๊ก', icon: 'fas fa-bug', cls: 'bg-red-950/70 text-red-300 border-red-500/40' },
    suggestion: { label: 'เสนอแนะทั่วไป', icon: 'fas fa-lightbulb', cls: 'bg-amber-950/70 text-amber-300 border-amber-500/40' },
    other: { label: 'อื่นๆ / ทักทาย', icon: 'fas fa-comment', cls: 'bg-purple-950/70 text-purple-300 border-purple-500/40' }
  };

  const FB_STATUS = {
    new: { label: 'มาใหม่', cls: 'bg-red-500/20 text-red-300 border-red-500/50' },
    read: { label: 'อ่านแล้ว', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
    done: { label: 'ดำเนินการแล้ว', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' }
  };

  const filteredFeedbacks = guestFeedbacks.filter((f) => {
    if (fbCatFilter !== 'ALL' && f.category !== fbCatFilter) return false;
    if (fbStatusFilter !== 'ALL' && (f.status || 'new') !== fbStatusFilter) return false;
    if (fbSearch.trim()) {
      const q = fbSearch.toLowerCase();
      return (f.nickname || '').toLowerCase().includes(q) || (f.message || '').toLowerCase().includes(q) || (f.contact || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleCopyInvite = (id) => {
    const link = window.location.origin + window.location.pathname;
    const msg = `ยินดีต้อนรับสู่ The Blue Moon Association 🪐\n\nลิงก์เข้าสู่เว็บไซต์: ${link}\n\nรหัสประจำตัวของคุณคือ: ${id}\nกรุณากดที่ "เปิดใช้งาน Member ID" ในหน้าเข้าสู่ระบบเพื่อตั้งชื่อ Username และรหัสผ่านสำหรับการเข้าใช้งานครับ`;
    navigator.clipboard.writeText(msg);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateId = async (e) => {
    e.preventDefault();
    const id = newMId.trim().toUpperCase();
    if (!id) return;
    if (users.some((u) => String(u.id).toUpperCase() === id)) {
      return alert(`รหัส ${id} มีอยู่ในระบบแล้ว!`);
    }

    const newUserObj = {
      id,
      memberTag: newMTags[0] || 'Others',
      memberTags: newMTags.length ? newMTags : ['Others'],
      role: 'member',
      isActivated: false,
      isOnline: false,
      lastActive: 0,
      username: '',
      displayName: `รออนุมัติ (${id})`,
      bio: hostMemberId ? `ผู้ติดตามของสมาชิก ${hostMemberId}` : '',
      avatarUrl: '',
      socialLinks: [],
      usernameChangeHistory: [],
      joinedAt: new Date().toISOString().split('T')[0]
    };

    await db.collection('bma_users').doc(id).set(newUserObj);
    setLastCreatedUser(newUserObj);
    logAdminAudit({
      action: 'CREATE_MEMBER_ID',
      target: id,
      detail: `ประเภท: ${idType === 'F' ? 'Follower' : 'Member'} | หมวดหมู่: ${newUserObj.memberTags.join(', ')}${hostMemberId ? ` | ผูกกับ ${hostMemberId}` : ''}`,
      actor: currentUser
    });
    if (idType === 'M') setNewMId(getNextMId());
    else setHostMemberId('');
  };

  const filteredMembers = users.filter((u) => {
    if (statusFilter === 'ACTIVE' && !u.isActivated) return false;
    if (statusFilter === 'PENDING' && u.isActivated) return false;
    if (statusFilter === 'VICE' && u.role !== 'mod' && u.role !== 'admin') return false;
    if (statusFilter === 'FOLLOWER' && !String(u.id).startsWith('F')) return false;
    if (tagFilter !== 'ALL' && !getTags(u).includes(tagFilter)) return false;
    if (searchMember.trim()) {
      const q = searchMember.toLowerCase();
      return String(u.id).toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 text-xs pb-16 min-w-0">
      {/* Top Bar */}
      <div className="card p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#0B1325] border-[#1E3A5F]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-lg shrink-0">👑</div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate">Owner Control Center</h2>
            <p className="text-[10px] text-slate-400 truncate">ระบบจัดการและสถิติภาพรวม The Blue Moon Association</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap w-full xl:w-auto bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1">
          <button
            type="button"
            onClick={() => setSubTab('dashboard')}
            className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${subTab === 'dashboard' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-chart-pie shrink-0"></i>
            <span className="truncate">ภาพรวม &amp; ออกรหัส</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('members')}
            className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${subTab === 'members' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-users shrink-0"></i>
            <span className="truncate">จัดการสมาชิก</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${subTab === 'members' ? 'bg-[#050811] text-amber-400' : 'bg-[#0F2547] text-sky-300'}`}>{users.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('guests')}
            className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${subTab === 'guests' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-user-astronaut shrink-0"></i>
            <span className="truncate">Guest &amp; Feedback</span>
            {unreadFbCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-500 text-white animate-pulse shrink-0">{unreadFbCount}</span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${subTab === 'guests' ? 'bg-[#050811] text-amber-400' : 'bg-[#0F2547] text-sky-300'}`}>{guestFeedbacks.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('themes')}
            className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${subTab === 'themes' ? 'bg-amber-400 text-[#050811] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-palette shrink-0"></i>
            <span className="truncate">Theme Viewer</span>
            {themePreview !== 'auto' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>}
          </button>
        </div>
      </div>

      {/* TAB 1: DASHBOARD & ID GENERATOR */}
      {subTab === 'dashboard' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#070C18] border-[#1E3A5F]">
              <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">สมาชิกที่เปิดใช้งาน</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {activeUsers.length} <span className="text-xs text-slate-400 font-normal">/ {users.length}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>รออนุมัติ: <strong className="text-amber-300">{pendingUsers.length}</strong></span>
                <span>ผู้ติดตาม: <strong className="text-sky-300">{followersCount}</strong></span>
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#070C18] border-[#1E3A5F]">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">สถานะการออนไลน์</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
                <span>{onlineNow.length}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-sans">Online</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                แอคทีฟใน 24 ชม.: <strong className="text-white">{active24h.length} คน</strong>
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#070C18] border-[#1E3A5F]">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">กระดานโพสต์ (Board)</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{posts.length}</div>
              <div className="text-[10px] text-slate-400 mt-2">
                ความคิดเห็นรวม: <strong className="text-amber-300">{totalComments} รายการ</strong>
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#070C18] border-[#1E3A5F]">
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">ระบบแชต &amp; กิจกรรม</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{chatMessages.length}</div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>กลุ่มแชต: <strong className="text-purple-300">{groups.length}</strong></span>
                <span>อีเวนต์: <strong className="text-sky-300">{bmaEvents.length}</strong></span>
              </div>
            </div>

            <div
              onClick={() => setSubTab('guests')}
              className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#070C18] border-sky-500/40 hover:border-sky-400 cursor-pointer transition-colors col-span-2 lg:col-span-1"
            >
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>ผู้เยี่ยมชม (Guest)</span>
                {unreadFbCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-mono">{unreadFbCount} ใหม่</span>}
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{(guestStats?.totalVisits || 0).toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                <span>วันนี้: <strong className="text-cyan-300">+{todayVisits}</strong></span>
                <span>Feedback: <strong className="text-amber-300">{guestFeedbacks.length}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 card p-5 space-y-4 border-sky-500/40 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3A5F] pb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-amber-300">✨ ออกรหัสประจำตัวใหม่ (ID Generator)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">เลือกประเภทสมาชิกและหมวดหมู่เพื่อสร้างรหัสเข้าใช้งาน</p>
                </div>
                <div className="flex w-full sm:w-auto bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIdType('M')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${idType === 'M' ? 'bg-white text-[#050811]' : 'text-slate-400 hover:text-white'}`}
                  >
                    🪐 Member (M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdType('F')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${idType === 'F' ? 'bg-sky-400 text-[#050811]' : 'text-slate-400 hover:text-white'}`}
                  >
                    🛰️ Follower (F)
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateId} className="space-y-4">
                {idType === 'F' && (
                  <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/40 space-y-2">
                    <label className="block text-[11px] font-bold text-sky-300">🔗 เลือกสมาชิกหลักที่พาผู้ติดตามมา (1 คนต่อ 1 ผู้ติดตาม)</label>
                    <select
                      value={hostMemberId}
                      onChange={(e) => {
                        const mId = e.target.value;
                        setHostMemberId(mId);
                        const hostUser = users.find((u) => u.id === mId);
                        if (hostUser) setNewMTags(getTags(hostUser));
                      }}
                      className="w-full inp py-1.5 text-xs bg-[#0B1325]"
                    >
                      <option value="">-- กำหนดรหัส F เองโดยไม่ผูกเลข --</option>
                      {users.filter((u) => String(u.id).startsWith('M')).map((m) => {
                        const fId = 'F' + String(m.id).substring(1);
                        const hasFollower = users.some((x) => x.id === fId);
                        return (
                          <option key={m.id} value={m.id} disabled={hasFollower}>
                            {m.id} - {m.displayName} {hasFollower ? `(มีผู้ติดตาม ${fId} แล้ว)` : `(จะได้รับรหัส ${fId})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="sm:w-40">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">รหัสที่จะออก (แก้ไขได้)</label>
                    <input
                      type="text"
                      value={newMId}
                      onChange={(e) => setNewMId(e.target.value)}
                      className={`w-full inp font-mono font-bold text-base text-center uppercase ${idType === 'F' ? 'text-sky-300 border-sky-500/50' : 'text-amber-300 border-amber-500/50'}`}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">สร้างหมวดหมู่ (Tag) ใหม่เพิ่มเติม</label>
                    <div className="flex gap-2">
                      <input type="text" value={cTag} onChange={(e) => setCTag(e.target.value)} placeholder="พิมพ์ชื่อหมวดหมู่ใหม่..." className="flex-1 min-w-0 inp" />
                      <button
                        type="button"
                        onClick={() => {
                          if (cTag.trim() && !newMTags.includes(cTag.trim())) setNewMTags([...newMTags, cTag.trim()]);
                          setCTag('');
                        }}
                        className="btn-b shrink-0"
                      >
                        + เพิ่มแท็ก
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">เลือกหมวดหมู่ของสมาชิกนี้ (เลือกได้มากกว่า 1)</label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#050811] border border-[#1E3A5F]">
                    {Array.from(new Set([...allTags, ...newMTags])).map((t) => {
                      const sel = newMTags.includes(t);
                      return (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setNewMTags(sel ? (newMTags.length > 1 ? newMTags.filter((x) => x !== t) : newMTags) : [...newMTags, t])}
                          className={sel ? 'px-3 py-1 rounded-full bg-white text-[#050811] font-bold shadow transition-transform scale-105' : 'px-3 py-1 rounded-full bg-[#0B1325] text-slate-400 border border-[#1E3A5F] hover:text-white'}
                        >
                          {sel ? '✓ ' + t : '+ ' + t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="w-full btn-w py-2.5 text-sm shadow-lg hover:scale-[1.01] transition-transform">
                  ➕ ยืนยันการออกรหัส {newMId.toUpperCase()}
                </button>
              </form>

              {lastCreatedUser && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 space-y-2.5 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-300 text-xs">🎉 ออกรหัส {lastCreatedUser.id} สำเร็จเรียบร้อย!</span>
                    <button type="button" onClick={() => setLastCreatedUser(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#050811] border border-[#1E3A5F] font-mono text-[11px] text-slate-300 whitespace-pre-line">
                    {`รหัสประจำตัว: ${lastCreatedUser.id}\nหมวดหมู่: ${lastCreatedUser.memberTags.join(', ')}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(lastCreatedUser.id)}
                    className="w-full py-2 rounded-xl bg-emerald-500 text-[#050811] font-bold hover:bg-emerald-400 transition-colors shadow"
                  >
                    {copiedId === lastCreatedUser.id ? '✓ คัดลอกข้อความเชิญแล้ว!' : '📋 คัดลอกข้อความเชิญส่งให้สมาชิก'}
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="card p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#1E3A5F] pb-2">
                  <h3 className="font-bold text-amber-300">⏳ รหัสที่รอการเปิดใช้งาน ({pendingUsers.length})</h3>
                  {pendingUsers.length > 0 && (
                    <button type="button" onClick={() => { setStatusFilter('PENDING'); setSubTab('members'); }} className="text-[10px] text-sky-400 hover:underline">ดูทั้งหมด →</button>
                  )}
                </div>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">สมาชิกทุกคนเปิดใช้งานรหัสครบทั้งหมดแล้ว ✨</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {pendingUsers.map((u) => (
                      <div key={u.id} className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-bold text-xs ${String(u.id).startsWith('F') ? 'text-sky-400' : 'text-amber-300'}`}>{u.id}</span>
                            <TagBadges user={u} />
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">สร้างเมื่อ: {u.joinedAt || '-'}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleCopyInvite(u.id)} className="btn-w py-1 px-2.5 text-[10px]">
                            {copiedId === u.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอกคำเชิญ'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`ลบรหัส ${u.id} ทิ้ง?`)) return;
                              await db.collection('bma_users').doc(u.id).delete();
                              logAdminAudit({ action: 'DELETE_PENDING_ID', target: u.id, detail: 'ลบรหัสที่ยังไม่เปิดใช้งาน', actor: currentUser });
                            }}
                            className="p-1 rounded bg-red-950/50 text-red-400 hover:bg-red-900"
                            title="ลบรหัสนี้"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-4 space-y-2.5">
                <h3 className="font-bold text-sky-300 border-b border-[#1E3A5F] pb-2">🏷️ สัดส่วนสมาชิกตามหมวดหมู่</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {allTags.map((tag) => {
                    const count = users.filter((u) => getTags(u).includes(tag)).length;
                    const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                    return (
                      <div key={tag} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">{tag}</span>
                          <span className="font-mono text-slate-400">{count} คน ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#050811] overflow-hidden border border-[#1E3A5F]/50">
                          <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <AuditLogPanel />
        </div>
      )}

      {/* TAB 2: MEMBER DIRECTORY & MANAGEMENT */}
      {subTab === 'members' && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-2.5 justify-between">
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="🔍 ค้นหาด้วยรหัส (เช่น M001), ชื่อที่แสดง หรือ @username..."
              className="flex-1 inp text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inp py-1.5 text-xs bg-[#050811]">
                <option value="ALL">สถานะทั้งหมด ({users.length})</option>
                <option value="ACTIVE">🟢 เปิดใช้งานแล้ว ({activeUsers.length})</option>
                <option value="PENDING">⏳ รอเปิดใช้งาน ({pendingUsers.length})</option>
                <option value="VICE">🛡️ เฉพาะ Owner / Vice</option>
                <option value="FOLLOWER">🛰️ เฉพาะผู้ติดตาม (F)</option>
              </select>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="inp py-1.5 text-xs bg-[#050811]">
                <option value="ALL">ทุกหมวดหมู่</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 border border-dashed border-[#1E3A5F] rounded-xl">
                ไม่พบรายชื่อสมาชิกที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              filteredMembers.map((u) => {
                const stat = getStatusInfo(u);
                return (
                  <div key={u.id} className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] hover:border-white/30 transition-colors flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div onClick={() => u.isActivated && openMemberProfile(u)} className={u.isActivated ? 'cursor-pointer' : ''}>
                        <Avatar user={u} size="md" showStatus={u.isActivated} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${String(u.id).startsWith('F') ? 'bg-sky-400 text-[#050811]' : 'bg-white text-[#050811]'}`}>
                            {u.id}
                          </span>
                          <span className="font-bold text-sm text-white truncate">{u.displayName}</span>
                          <RoleBadge role={u.role} />
                          {!u.isActivated && <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-bold">⏳ ยังไม่เปิดใช้งาน</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                          {u.isActivated ? (
                            <>
                              <span className="font-mono text-sky-300">@{u.username}</span>
                              <span>•</span>
                              <span>{stat.t}</span>
                            </>
                          ) : (
                            <span>สร้างรหัสเมื่อ: {u.joinedAt || '-'}</span>
                          )}
                        </div>
                        <div className="mt-1.5"><TagBadges user={u} /></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {!u.isActivated && (
                        <button type="button" onClick={() => handleCopyInvite(u.id)} className="btn-w py-1.5 px-3 text-[11px]">
                          {copiedId === u.id ? '✓ คัดลอกแล้ว' : '📋 ส่งคำเชิญ'}
                        </button>
                      )}
                      <button type="button" onClick={() => { setEditTagU(u); setEditTagL(getTags(u)); }} className="btn-d text-blue-200 py-1.5">
                        🏷️ หมวดหมู่
                      </button>
                      {u.isActivated && (
                        <button type="button" onClick={() => { setResetPassU(u); setNewPassVal(''); }} className="btn-d text-amber-300 py-1.5" title="ตั้งรหัสผ่านใหม่ให้สมาชิก">
                          🔑 รีเซ็ตรหัส
                        </button>
                      )}
                      {u.role !== 'admin' && u.isActivated && (
                        <button
                          type="button"
                          onClick={async () => {
                            const nextRole = u.role === 'mod' ? 'member' : 'mod';
                            await db.collection('bma_users').doc(u.id).update({ role: nextRole });
                            logAdminAudit({
                              action: 'CHANGE_MEMBER_ROLE',
                              target: u.id,
                              detail: `เปลี่ยนยศของ ${u.displayName} เป็น ${nextRole}`,
                              actor: currentUser
                            });
                          }}
                          className="btn-b py-1.5"
                        >
                          {u.role === 'mod' ? 'ปลด Vice' : '🛡️ ตั้ง Vice'}
                        </button>
                      )}
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`ยืนยันการลบบัญชี ${u.id} (${u.displayName}) ออกจากระบบ?`)) return;
                            await db.collection('bma_users').doc(u.id).delete();
                            logAdminAudit({
                              action: 'DELETE_MEMBER',
                              target: u.id,
                              detail: `ลบบัญชี ${u.displayName} (${u.id})`,
                              actor: currentUser
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 font-bold border border-red-900/50"
                        >
                          🗑️ ลบ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GUEST ANALYTICS & FEEDBACK */}
      {subTab === 'guests' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#050811] border-[#1E3A5F]">
                <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">ยอดเข้าชมรวม (Visits)</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">{(guestStats?.totalVisits || 0).toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-1.5">วันนี้: <strong className="text-emerald-400">+{todayVisits} ครั้ง</strong></div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#050811] border-[#1E3A5F]">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">ไม่ซ้ำอุปกรณ์ (Unique)</div>
                <div className="text-2xl font-mono font-bold text-cyan-300 mt-1">{(guestStats?.uniqueVisitors || 0).toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 mt-1.5 truncate">ล่าสุด: <strong className="text-slate-200">{formatLastVisit(guestStats?.lastVisitAt)}</strong></div>
              </div>

              <div className="card p-4 bg-gradient-to-br from-[#0B1325] to-[#050811] border-[#1E3A5F] col-span-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Guest Feedback ทั้งหมด</div>
                  <div className="text-2xl font-mono font-bold text-white mt-0.5">
                    {guestFeedbacks.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
                  </div>
                </div>
                <div className="text-right space-y-1 text-[10px]">
                  <div>ยังไม่อ่าน: <strong className="text-red-400 font-mono">{unreadFbCount}</strong></div>
                  <div>ดำเนินการแล้ว: <strong className="text-emerald-400 font-mono">{guestFeedbacks.filter((f) => f.status === 'done').length}</strong></div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 card p-4 bg-[#0B1325] border-[#1E3A5F] flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-2 mb-3">
                <span className="font-bold text-sky-300"><i className="fas fa-chart-bar mr-1.5"></i>สถิติการเข้าชมของ Guest ย้อนหลัง 7 วัน</span>
                <span className="text-[10px] text-slate-400 font-mono">รวม 7 วัน: {last7Days.reduce((s, d) => s + d.val, 0)} ครั้ง</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4 px-1">
                {last7Days.map((d, i) => {
                  const pct = Math.round((d.val / maxDailyVisits) * 100);
                  const isToday = i === 6;
                  return (
                    <div key={d.key} className="flex flex-col items-center h-full justify-end gap-1.5">
                      <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-amber-300' : 'text-slate-400'}`}>{d.val}</span>
                      <div className="w-full max-w-[34px] flex-1 bg-[#050811] rounded-lg border border-[#1E3A5F]/70 flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-md transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-amber-500 to-amber-300' : 'bg-gradient-to-t from-sky-600 to-sky-400'}`}
                          style={{ height: d.val > 0 ? `${Math.max(10, pct)}%` : '0%' }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono ${isToday ? 'text-white font-bold' : 'text-slate-500'}`}>{isToday ? 'วันนี้' : d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3A5F] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="fas fa-inbox text-sky-400"></i> กล่องข้อความ &amp; ข้อเสนอแนะ (Feedback)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">ข้อความที่สมาชิกและผู้มาเยือนส่งผ่านปุ่ม Feedback ในหน้า Board</p>
              </div>
              {unreadFbCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const news = guestFeedbacks.filter((f) => f.status === 'new');
                    await Promise.all(news.map((f) => db.collection('bma_guest_feedback').doc(f.id).update({ status: 'read' })));
                  }}
                  className="btn-b py-1.5 px-3 text-[11px] text-sky-200 border-sky-500/40 hover:bg-sky-600 hover:text-white"
                >
                  <i className="fas fa-check-double mr-1"></i> อ่านแล้วทั้งหมด ({unreadFbCount})
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-2.5">
              <input type="text" value={fbSearch} onChange={(e) => setFbSearch(e.target.value)} placeholder="ค้นหาข้อความ, ชื่อเล่น หรือช่องทางติดต่อกลับ..." className="flex-1 inp text-xs" />
              <div className="flex flex-wrap gap-2">
                <select value={fbCatFilter} onChange={(e) => setFbCatFilter(e.target.value)} className="inp py-1.5 text-xs bg-[#050811]">
                  <option value="ALL">ทุกหัวข้อ</option>
                  {Object.entries(FB_CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={fbStatusFilter} onChange={(e) => setFbStatusFilter(e.target.value)} className="inp py-1.5 text-xs bg-[#050811]">
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="new">มาใหม่ ({unreadFbCount})</option>
                  <option value="read">อ่านแล้ว</option>
                  <option value="done">ดำเนินการแล้ว</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {filteredFeedbacks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-[#1E3A5F] rounded-xl space-y-2">
                  <i className="fas fa-comment-slash text-2xl opacity-30 block"></i>
                  <div>ยังไม่มีข้อความจาก Guest ในหมวดหมู่นี้</div>
                </div>
              ) : (
                filteredFeedbacks.map((fb) => {
                  const cat = FB_CATS[fb.category] || FB_CATS.other;
                  const stKey = fb.status || 'new';
                  const st = FB_STATUS[stKey] || FB_STATUS.new;

                  return (
                    <div key={fb.id} className={`p-4 rounded-xl border transition-colors space-y-2.5 ${stKey === 'new' ? 'bg-[#081226] border-sky-500/50 shadow-md' : 'bg-[#050811] border-[#1E3A5F]'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E3A5F]/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${cat.cls}`}>
                            <i className={cat.icon}></i> {cat.label}
                          </span>
                          <span className="font-bold text-white text-xs">{fb.nickname || 'Guest'}</span>
                          {fb.senderId && fb.senderId !== 'GUEST' ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">สมาชิก</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 text-[9px] font-bold">Guest</span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">{fb.createdAt}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                      </div>

                      <p className="text-slate-100 text-xs whitespace-pre-line leading-relaxed break-words">{fb.message}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E3A5F]/40">
                        <div className="text-[11px] text-slate-400">
                          {fb.contact ? (
                            <span><i className="fas fa-address-card text-sky-400 mr-1.5"></i>ติดต่อกลับ: <strong className="text-sky-200 select-all">{fb.contact}</strong></span>
                          ) : (
                            <span className="text-slate-600 italic">ไม่ได้ระบุช่องทางติดต่อกลับ</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {stKey !== 'read' && (
                            <button type="button" onClick={() => db.collection('bma_guest_feedback').doc(fb.id).update({ status: 'read' })} className="btn-d py-1 px-2.5 text-[10px] text-sky-300 hover:bg-sky-950">
                              <i className="fas fa-eye mr-1"></i> อ่านแล้ว
                            </button>
                          )}
                          {stKey !== 'done' ? (
                            <button type="button" onClick={() => db.collection('bma_guest_feedback').doc(fb.id).update({ status: 'done' })} className="btn-b py-1 px-2.5 text-[10px] bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white">
                              <i className="fas fa-check mr-1"></i> เสร็จสิ้น
                            </button>
                          ) : (
                            <button type="button" onClick={() => db.collection('bma_guest_feedback').doc(fb.id).update({ status: 'new' })} className="btn-d py-1 px-2.5 text-[10px] text-amber-300">
                              <i className="fas fa-undo mr-1"></i> เปิดใหม่
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => window.confirm('ยืนยันการลบข้อความ Feedback นี้?') && db.collection('bma_guest_feedback').doc(fb.id).delete()}
                            className="px-2.5 py-1 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 font-bold border border-red-900/50 text-[10px]"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THEME VIEWER & EVENT SANDBOX */}
      {subTab === 'themes' && (
        <div className="space-y-5 animate-fade-in">
          <div className="card p-5 space-y-4 border-amber-500/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3A5F] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="fas fa-palette text-amber-400"></i> Theme Viewer (โหมดพรีวิวธีมเทศกาล)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">สลับดูธีมเทศกาลได้ทันทีบนเครื่องนี้ (ไม่มีผลกระทบกับผู้ใช้คนอื่น)</p>
              </div>
              {themePreview !== 'auto' && (
                <button
                  type="button"
                  onClick={() => { setThemePreview?.('auto'); setXmasPreviewUnlock?.(false); }}
                  className="btn-w py-1.5 px-3.5 text-xs flex items-center gap-1.5"
                >
                  <i className="fas fa-undo"></i> กลับสู่โหมดอัตโนมัติ (Auto)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                { id: 'auto', name: 'อัตโนมัติตามปฏิทิน (Auto)', schedule: 'สลับธีมเองเมื่อถึงช่วงเทศกาล (เวลาไทย UTC+7)', icon: 'fas fa-magic', swatches: ['#050811', '#0F2547', '#38BDF8', '#FFFFFF'] },
                { id: 'normal', name: 'The Blue Moon (ปกติ)', schedule: 'ธีมดาราศาสตร์หลักประจำสมาคม', icon: 'fas fa-moon', swatches: ['#050811', '#0B1325', '#1E3A5F', '#60A5FA'] },
                { id: 'christmas', name: 'Midnight Winter (Christmas)', schedule: 'เปิดอัตโนมัติ: 11 – 26 ธันวาคม ของทุกปี', icon: 'fas fa-snowflake', swatches: ['#040D0E', '#081C1B', '#DC2626', '#FDE68A'] },
                { id: 'halloween', name: 'Spooky Night (Halloween)', schedule: 'เปิดอัตโนมัติ: 19 – 31 ตุลาคม ของทุกปี', icon: 'fas fa-ghost', swatches: ['#110419', '#260A37', '#EA580C', '#FDBA74'] },
                { id: 'loykrathong', name: 'Full Moon River (Loy Krathong)', schedule: 'เปิดอัตโนมัติ: วันเพ็ญเดือน 12 (ลอยกระทง)', icon: 'fas fa-water', swatches: ['#040914', '#0A162C', '#D97706', '#FEF08A'] }
              ].map((th) => {
                const isActive = themePreview === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setThemePreview?.(th.id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${isActive ? 'bg-[#0F2547]/80 border-amber-400 ring-2 ring-amber-400/40 shadow-lg' : 'bg-[#050811] border-[#1E3A5F] hover:border-slate-500'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 ${isActive ? 'bg-amber-400 text-[#050811] border-amber-300' : 'bg-[#0B1325] text-sky-300 border-[#1E3A5F]'}`}>
                          <i className={th.icon}></i>
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{th.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{th.schedule}</div>
                        </div>
                      </div>
                      {isActive && <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[#050811] text-[9px] font-bold shrink-0">ใช้งานอยู่</span>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#1E3A5F]/60">
                      <div className="flex items-center gap-1.5">
                        {th.swatches.map((hex, i) => (
                          <span key={i} className="w-5 h-5 rounded-full border border-white/30 shadow-inner" style={{ backgroundColor: hex }} title={hex}></span>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-sky-300">{isActive ? 'กำลังพรีวิว' : 'คลิกเพื่อพรีวิว →'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5 space-y-4 bg-[#0B1325] border-[#1E3A5F]">
            <h3 className="text-sm font-bold text-sky-300 border-b border-[#1E3A5F] pb-2 flex items-center gap-2">
              <i className="fas fa-flask"></i> เครื่องมือทดสอบกิจกรรมเทศกาล (Owner Sandbox)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-amber-300">จำลองเวลาหลังคริสต์มาส (25 ธ.ค.+)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ปลดล็อกการอ่านคำอวยพรบนต้นไม้, ทดสอบแจ้งเตือน @ และปลดล็อกปุ่ม "ต้นคริสต์มาสของฉัน" ในหน้า Board</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setXmasPreviewUnlock?.(!xmasPreviewUnlock)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] shrink-0 transition-colors ${xmasPreviewUnlock ? 'bg-emerald-500 text-[#050811]' : 'bg-[#0F2547] text-slate-300 border border-[#1E3A5F]'}`}
                  >
                    {xmasPreviewUnlock ? 'เปิดอยู่' : 'ปิดอยู่'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setThemePreview?.('christmas'); onOpenXmasTree?.(); }}
                  className="w-full btn-b py-2 text-xs hover:bg-red-700 hover:border-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-tree text-emerald-400"></i> เปิดหน้า Christmas Wish Tree ทันที
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#050811] border border-[#1E3A5F] flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-amber-300">ทดสอบหน้าต่างวันลอยกระทง</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">เปิด Welcome Overlay กิจกรรมลอยกระทง เซียมซี และมินิเกมรักษ์โลกเพื่อตรวจความเรียบร้อย</div>
                </div>
                <button
                  type="button"
                  onClick={() => { setThemePreview?.('loykrathong'); onOpenLoyWelcome?.(); }}
                  className="w-full btn-b py-2 text-xs hover:bg-amber-600 hover:text-[#050811] transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-water text-amber-300"></i> เปิดหน้าต่างลอยกระทง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal แก้ไขหมวดหมู่สมาชิก */}
      {editTagU && (
        <Modal title={`🏷️ แก้ไขหมวดหมู่: ${editTagU.displayName} (${editTagU.id})`} onClose={() => setEditTagU(null)}>
          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              <input type="text" value={cTag} onChange={(e) => setCTag(e.target.value)} placeholder="เพิ่มหมวดหมู่ใหม่..." className="flex-1 inp" />
              <button type="button" onClick={() => { if (cTag.trim() && !editTagL.includes(cTag.trim())) setEditTagL([...editTagL, cTag.trim()]); setCTag(''); }} className="btn-b">+ เพิ่ม</button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#050811] border border-[#1E3A5F]">
              {Array.from(new Set([...allTags, ...editTagL])).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setEditTagL(editTagL.includes(t) ? (editTagL.length > 1 ? editTagL.filter((x) => x !== t) : editTagL) : [...editTagL, t])}
                  className={editTagL.includes(t) ? 'px-3 py-1 rounded-full bg-white text-[#050811] font-bold' : 'px-3 py-1 rounded-full bg-[#0B1325] text-slate-400 border border-[#1E3A5F]'}
                >
                  {editTagL.includes(t) ? '✓ ' + t : '+ ' + t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                await db.collection('bma_users').doc(editTagU.id).update({ memberTag: editTagL[0], memberTags: editTagL });
                logAdminAudit({
                  action: 'UPDATE_MEMBER_TAGS',
                  target: String(editTagU.id || '-'),
                  detail: `อัปเดตหมวดหมู่ของ ${editTagU.displayName || editTagU.id} เป็น: ${editTagL.join(', ')}`,
                  actor: currentUser
                });
                setEditTagU(null);
              }}
              className="w-full btn-w py-2.5 mt-2"
            >
              💾 บันทึกหมวดหมู่
            </button>
          </div>
        </Modal>
      )}

      {/* Modal รีเซ็ตรหัสผ่านสมาชิก (เชื่อม /api/auth) */}
      {resetPassU && (
        <Modal title={`🔑 รีเซ็ตรหัสผ่าน: ${resetPassU.displayName} (${resetPassU.id})`} onClose={() => setResetPassU(null)}>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-1">
              <div className="text-slate-400">Username ปัจจุบัน: <strong className="font-mono text-white">@{resetPassU.username}</strong></div>
              <div className="text-[11px] text-emerald-300/90">🔒 รหัสผ่านถูกเข้ารหัสเก็บแยกไว้อย่างปลอดภัย (หากสมาชิกลืมสามารถตั้งรหัสใหม่ด้านล่างได้ทันที)</div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-bold">ตั้งรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)</label>
              <input
                type="text"
                value={newPassVal}
                onChange={(e) => setNewPassVal(e.target.value)}
                className="w-full inp font-mono"
                placeholder="ระบุรหัสผ่านใหม่..."
              />
            </div>
            <button
              type="button"
              disabled={resetBusy}
              onClick={async () => {
                const clean = newPassVal.trim();
                if (clean.length < 4) return alert('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
                setResetBusy(true);
                try {
                  await tbmaAuthRequest({
                    action: 'admin_reset_password',
                    targetId: resetPassU.id,
                    newPassword: clean
                  });
                  logAdminAudit({
                    action: 'RESET_PASSWORD',
                    target: String(resetPassU.id || '-'),
                    detail: `รีเซ็ตรหัสผ่านของ ${resetPassU.displayName || resetPassU.id} โดยผู้ดูแล`,
                    actor: currentUser
                  });
                  alert(`อัปเดตรหัสผ่านของ ${resetPassU.displayName} เรียบร้อยแล้ว`);
                  setResetPassU(null);
                } catch (err) {
                  alert(err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
                } finally {
                  setResetBusy(false);
                }
              }}
              className="w-full btn-w py-2.5 disabled:opacity-50"
            >
              {resetBusy ? '⏳ กำลังบันทึก...' : '✅ บันทึกรหัสผ่านใหม่'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}