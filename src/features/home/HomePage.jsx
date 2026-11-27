import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Logo, Avatar } from '../../components/BasicUI';

export default function HomePage({
  onNavigate,
  onOpenXmasTree,
  onOpenMemberMenu,
  isHalloween = false,
  isChristmas = false,
  isLoyKrathong = false,
  cursedUserId = null,
  onTriggerScare
}) {
  const { users, activeMembers, currentUser } = useAuth();
  const { openMemberProfile, openGuestPrompt } = useUI();

  const rings = useMemo(() => {
    const r1 = [], r2 = [], r3 = [], r4 = [];
    const list = activeMembers.length ? activeMembers : users;
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
  }, [activeMembers, users]);

  return (
    <div className="animate-view relative flex-1 flex flex-col items-center py-8 px-4 overflow-y-auto no-scrollbar">
      <div className="text-center space-y-1 z-10 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold uppercase">The Blue Moon Association</h2>
        <p className="text-xs text-slate-300">
          {currentUser
            ? 'คลิกดาวบริวารเพื่อดูโปรไฟล์และส่งข้อความ หรือเข้าสู่กระดานโพสต์'
            : `ขณะนี้มีดาวบริวารในวงโคจรทั้งหมด ${activeMembers.length} ดวง • เข้าสู่ระบบเพื่อดูโปรไฟล์สมาชิก`}
        </p>
      </div>

      <div className="relative w-full max-w-[760px] h-[700px] flex items-center justify-center orbit-sys select-none shrink-0 my-4">
        <div
          onClick={() => onNavigate('feed')}
          className="relative z-20 w-32 h-32 rounded-full cursor-pointer flex flex-col items-center justify-center text-center p-4 hover:scale-105 transition"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #60A5FA, #1D4ED8 45%, #0F2547 80%, #050811 100%)',
            boxShadow: '0 0 60px rgba(37,99,235,0.65)'
          }}
        >
          <Logo s={32} />
          <span className="text-[11px] font-bold uppercase mt-1">Blue Moon</span>
          <span className="text-[10px] text-blue-200">{activeMembers.length} Satellites</span>
        </div>

        {rings.map((ring, ri) => (
          <div
            key={ri}
            className={'absolute top-1/2 left-1/2 rounded-full border border-[#1E3A5F]/70 pointer-events-none ' + ring.rc}
            style={{ width: ring.r * 2 + 'px', height: ring.r * 2 + 'px' }}
          >
            {ring.items.map((m, mi) => {
              const rad = ((360 / Math.max(1, ring.items.length)) * mi * Math.PI) / 180;
              return (
                <div
                  key={m.id}
                  style={{ left: ring.r + ring.r * Math.cos(rad) + 'px', top: ring.r + ring.r * Math.sin(rad) + 'px' }}
                  className={'absolute pointer-events-auto ' + ring.cc}
                >
                  {currentUser ? (
                    <button
                      type="button"
                      onContextMenu={(e) => onOpenMemberMenu?.(e, m)}
                      onClick={() => {
                        if (isHalloween && m.id === cursedUserId && onTriggerScare) {
                          onTriggerScare(m);
                        } else {
                          openMemberProfile(m);
                        }
                      }}
                      className="flex flex-col items-center"
                    >
                      <Avatar user={m} size="md" showStatus={true} />
                      <div className="mt-1 px-2 py-0.5 rounded-full bg-[#050811]/90 border border-[#1E3A5F] text-[10px] whitespace-nowrap">
                        {m.displayName}
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อดูโปรไฟล์ดาวบริวารในวงโคจร')}
                      title="สมาชิกสมาคม (เข้าสู่ระบบเพื่อดูโปรไฟล์)"
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-300 to-blue-700 border border-white/60 shadow-[0_0_12px_rgba(96,165,250,0.8)] hover:scale-125 transition-transform flex items-center justify-center"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/90"></span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 w-full max-w-md justify-center z-10 shrink-0">
        <button type="button" onClick={() => onNavigate('feed')} className="flex-1 py-3 btn-b text-xs shadow-lg hover:scale-105 transition-transform">
          📖 กระดานโพสต์
        </button>
        <button type="button" onClick={() => onNavigate('daily_game')} className="flex-1 py-3 btn-w text-xs shadow-lg hover:scale-105 transition-transform">
          {currentUser ? '🎮 ท้าดวล Daily Game' : '🎮 ทดลองเล่น Daily Game'}
        </button>
      </div>

      {isChristmas && (
        <div className="w-full max-w-md mt-3 z-10 shrink-0">
          <button
            type="button"
            onClick={() => onOpenXmasTree?.(null)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#881337] via-[#B91C1C] to-[#92400E] border-2 border-amber-300/80 text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5"
          >
            <i className="fas fa-holly-berry text-amber-300 text-base"></i>
            <span>Christmas Wish Tree — แขวนคำอวยพรคริสต์มาส</span>
            <i className="fas fa-arrow-right text-amber-200 text-xs"></i>
          </button>
        </div>
      )}

      {isLoyKrathong && (
        <div className="w-full max-w-md mt-3 z-10 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('loy_krathong')}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#92400E] via-[#D97706] to-[#B45309] border-2 border-amber-200/80 text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2.5"
          >
            <span className="text-base">🪷</span>
            <span>Loy Krathong River — ลอยกระทง &amp; เสี่ยงเซียมซี</span>
            <i className="fas fa-arrow-right text-amber-100 text-xs"></i>
          </button>
        </div>
      )}

      <div className="z-10 mt-16 mb-8 w-full max-w-3xl bg-[#0B1325]/80 backdrop-blur-sm border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 text-xs text-slate-300 leading-relaxed shadow-2xl shrink-0 text-left">
        <h3 className="font-bold text-sky-400 text-sm mb-4">📜 ข้อตกลง (อัพเดตล่าสุด 10 ตุลาคม 2026)</h3>
        <ul className="space-y-3 list-none pl-0">
          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">1.</span><span>สมาคมนี้จัดตั้งขึ้นเพื่อสร้างคอนเนกชั่นระหว่างคนในจักรวาลของทอมสำหรับประโยชน์อันใดของสมาชิกในอนาคต</span></li>
          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">2.</span><span>สมาคมนี้ไม่แสวงหาผลกำไรใด ๆ</span></li>
          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">3.</span><span>สมาชิกทุกคนจะถูกเชิญโดยเจ้าของเท่านั้น</span></li>
          <li className="flex gap-2.5"><span className="text-sky-500 font-bold">4.</span><span>สมาชิกทุกคนสามารถมีผู้ติดตามมาในนี้ได้ครั้งละ 1 คน หากต้องการเปลี่ยนคนหรือต้องการผู้ติดตามมากกว่า 1 คน โปรดแจ้งเจ้าของก่อน</span></li>
          <li className="flex gap-2.5">
            <span className="text-sky-500 font-bold">5.</span>
            <span>
              สมาคมนี้จะใช้ Website ของสมาคมเป็นช่องทางหลักในการติดต่อสื่อสาร และมี{' '}
              {currentUser ? (
                <a href="https://discord.com/invite/HCqFYXCYBt" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] font-bold hover:underline bg-[#5865F2]/10 px-1 rounded transition-colors">
                  Discord
                </a>
              ) : (
                <span className="text-slate-400 font-bold bg-[#5865F2]/10 px-1 rounded cursor-not-allowed">
                  Discord (เฉพาะสมาชิก)
                </span>
              )}{' '}
              เป็นห้องเสียงในการพูดคุยกันอีกช่องทางหนึ่ง โดยเจ้าของจะออก ID ให้สำหรับสมาชิกในการเข้าเว็บไซต์
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}