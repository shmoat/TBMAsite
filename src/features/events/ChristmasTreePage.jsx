import React, { useState, useEffect } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { getBkkNow, useStickyState } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Modal } from '../../components/BasicUI';
import { FormattedText } from '../../components/RichUI';
import { longPressProps } from '../../components/ContextMenu';
import { isXmasMidnightUnlocked, doesOrnamentMentionUser } from './eventHelpers';

const XMAS_COLORS = [
  { id: 'crimson', label: 'แดงทับทิม', main: '#E11D48', light: '#FDA4AF', dark: '#881337' },
  { id: 'gold', label: 'ทองแชมเปญ', main: '#F59E0B', light: '#FEF08A', dark: '#92400E' },
  { id: 'ice', label: 'ฟ้าน้ำแข็ง', main: '#38BDF8', light: '#E0F2FE', dark: '#0369A1' },
  { id: 'emerald', label: 'เขียวมรกต', main: '#10B981', light: '#A7F3D0', dark: '#065F46' },
  { id: 'snow', label: 'เงินหิมะ', main: '#E2E8F0', light: '#FFFFFF', dark: '#64748B' }
];

const XMAS_SHAPES = [
  { id: 'bauble', label: 'ลูกบอล' },
  { id: 'star', label: 'ดวงดาว' },
  { id: 'moon', label: 'พระจันทร์เสี้ยว' },
  { id: 'bell', label: 'กระดิ่ง' },
  { id: 'gingerbread', label: 'ขนมปังขิง' },
  { id: 'santahat', label: 'หมวกซานต้า' },
  { id: 'stocking', label: 'ถุงเท้า' },
  { id: 'mistletoe', label: 'มิสเติลโท' }
];

const XMAS_SLOTS = [
  { x: 50, y: 24 }, { x: 43, y: 31 }, { x: 57, y: 31 },
  { x: 37, y: 39 }, { x: 49, y: 38 }, { x: 62, y: 39 },
  { x: 32, y: 47 }, { x: 44, y: 46 }, { x: 56, y: 46 }, { x: 68, y: 47 },
  { x: 28, y: 56 }, { x: 39, y: 55 }, { x: 50, y: 54 }, { x: 61, y: 55 }, { x: 72, y: 56 },
  { x: 24, y: 65 }, { x: 35, y: 64 }, { x: 46, y: 63 }, { x: 56, y: 64 }, { x: 67, y: 65 }, { x: 76, y: 66 },
  { x: 30, y: 73 }, { x: 50, y: 73 }, { x: 70, y: 73 }
];

const generateRandomTreeCode = (year) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  return `X${String(year).slice(-2)}-${rand}`;
};

function XmasOrnamentSVG({ shape = 'bauble', colorId = 'crimson', size = 34 }) {
  const c = XMAS_COLORS.find((x) => x.id === colorId) || XMAS_COLORS[0];
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" fill="none" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
      <line x1="20" y1="0" x2="20" y2="8" stroke="#FDE68A" strokeWidth="1.6" />
      <circle cx="20" cy="8.5" r="2.2" fill="none" stroke="#FDE68A" strokeWidth="1.5" />

      {shape === 'bauble' && (
        <>
          <rect x="16" y="10" width="8" height="4" rx="1" fill="#F59E0B" />
          <circle cx="20" cy="26" r="12.5" fill={c.main} stroke={c.light} strokeWidth="1.2" />
          <path d="M9.5 26 Q20 31 30.5 26" stroke={c.light} strokeWidth="1.4" strokeDasharray="2 2" opacity="0.85" />
          <ellipse cx="15.5" cy="21" rx="3.2" ry="2" transform="rotate(-28 15.5 21)" fill="#FFFFFF" opacity="0.55" />
        </>
      )}

      {shape === 'star' && (
        <>
          <polygon
            points="20,10 23.6,18.2 32.5,19 25.8,24.8 27.8,33.6 20,28.9 12.2,33.6 14.2,24.8 7.5,19 16.4,18.2"
            fill={c.main}
            stroke={c.light}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="22.5" r="2.8" fill={c.light} opacity="0.7" />
        </>
      )}

      {shape === 'moon' && (
        <>
          <path d="M25.5 12.5 A12 12 0 1 0 25.5 35.5 A9.5 11.6 0 0 1 25.5 12.5 Z" fill={c.main} stroke={c.light} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M15.5 17.5 A8.5 8.5 0 0 0 15.5 30.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <polygon points="27,20 28.1,22.4 30.5,23.5 28.1,24.6 27,27 25.9,24.6 23.5,23.5 25.9,22.4" fill="#FEF08A" />
        </>
      )}

      {shape === 'bell' && (
        <>
          <path d="M20 11 C13.5 11 11 16.5 10.5 24 L8 29.5 L32 29.5 L29.5 24 C29 16.5 26.5 11 20 11 Z" fill={c.main} stroke={c.light} strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="8" y="28.5" width="24" height="3.2" rx="1.6" fill={c.dark} stroke={c.light} strokeWidth="0.9" />
          <circle cx="20" cy="34" r="3" fill="#FDE68A" />
          <path d="M15.5 16.5 Q14 21 13.5 25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </>
      )}

      {shape === 'gingerbread' && (
        <>
          <circle cx="20" cy="16.5" r="5.5" fill="#B45309" stroke="#FDE68A" strokeWidth="1.1" />
          <path d="M10.5 23.5 L29.5 23.5" stroke="#B45309" strokeWidth="5.2" strokeLinecap="round" />
          <path d="M15.5 22 L13.5 35.5 M24.5 22 L26.5 35.5" stroke="#B45309" strokeWidth="5.2" strokeLinecap="round" />
          <rect x="15.2" y="21.5" width="9.6" height="10.5" rx="3" fill="#B45309" />
          <circle cx="18.1" cy="15.6" r="0.9" fill="#FFFFFF" />
          <circle cx="21.9" cy="15.6" r="0.9" fill="#FFFFFF" />
          <path d="M18 18.4 Q20 20 22 18.4" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
          <circle cx="20" cy="24.5" r="1.7" fill={c.main} stroke={c.light} strokeWidth="0.6" />
          <circle cx="20" cy="29" r="1.7" fill={c.main} stroke={c.light} strokeWidth="0.6" />
          <path d="M10.5 23.5 L12.5 23.5 M27.5 23.5 L29.5 23.5" stroke={c.light} strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}

      {shape === 'santahat' && (
        <>
          <path d="M9 31 C11 19 18 12 29 14 C25 18 27 24 30 31 Z" fill={c.main} stroke={c.light} strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="7" y="29.5" width="25" height="6" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <circle cx="30.5" cy="15.5" r="3.6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
        </>
      )}

      {shape === 'stocking' && (
        <>
          <path d="M15 13 L26 13 L26 27 C26 32.5 22 36 15.5 36 C11 36 8.5 33.2 8.5 30 C8.5 26.8 11.2 25 15 25 Z" fill={c.main} stroke={c.light} strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="13.5" y="10.5" width="14" height="5.5" rx="2.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <path d="M15 21.5 L26 21.5" stroke={c.light} strokeWidth="1.4" strokeDasharray="2 2" opacity="0.85" />
        </>
      )}

      {shape === 'mistletoe' && (
        <>
          <path d="M20 14 C13 15 8 21 10 28 C14.5 27.5 18.5 23.5 20 19 Z" fill="#059669" stroke="#6EE7B7" strokeWidth="1.1" />
          <path d="M20 14 C27 15 32 21 30 28 C25.5 27.5 21.5 23.5 20 19 Z" fill="#10B981" stroke="#A7F3D0" strokeWidth="1.1" />
          <path d="M20 15 C16 22 16.5 30 20 35 C23.5 30 24 22 20 15 Z" fill="#047857" stroke="#6EE7B7" strokeWidth="1" />
          <circle cx="17.5" cy="21" r="2.6" fill={c.main} stroke={c.light} strokeWidth="0.9" />
          <circle cx="22.5" cy="21" r="2.6" fill={c.main} stroke={c.light} strokeWidth="0.9" />
          <circle cx="20" cy="24.5" r="2.8" fill={c.main} stroke={c.light} strokeWidth="0.9" />
          <path d="M15 11.5 Q20 15 25 11.5" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function XmasTreeCanvas({ ornaments, selectedId, onSelectOrnament, currentUser, isAssocTree, canReadWishes }) {
  const { openAppMenu } = useUI();

  return (
    <div className="relative w-full max-w-[390px] aspect-[390/460] mx-auto select-none">
      <svg viewBox="0 0 360 430" className="w-full h-full drop-shadow-[0_12px_30px_rgba(0,0,0,0.75)]">
        <defs>
          <radialGradient id="xmasStarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="xmasTreeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#115E59" />
            <stop offset="55%" stopColor="#0D3B38" />
            <stop offset="100%" stopColor="#06201F" />
          </linearGradient>
        </defs>

        <ellipse cx="180" cy="402" rx="125" ry="18" fill="rgba(186,230,253,0.1)" />
        <rect x="158" y="346" width="44" height="52" rx="6" fill="#451A03" stroke="#92400E" strokeWidth="1.5" />
        <polygon points="180,62 114,160 246,160" fill="url(#xmasTreeGrad)" stroke="rgba(253,230,138,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="180,122 92,235 268,235" fill="url(#xmasTreeGrad)" stroke="rgba(253,230,138,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="180,192 68,312 292,312" fill="url(#xmasTreeGrad)" stroke="rgba(253,230,138,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="180,262 46,368 314,368" fill="url(#xmasTreeGrad)" stroke="rgba(253,230,138,0.45)" strokeWidth="1.6" strokeLinejoin="round" />

        <path d="M126 148 Q180 170 234 148" fill="none" stroke="rgba(253,230,138,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M102 222 Q180 250 258 222" fill="none" stroke="rgba(186,230,253,0.38)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M78 298 Q180 330 282 298" fill="none" stroke="rgba(253,230,138,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />

        <circle cx="180" cy="46" r="34" fill="url(#xmasStarGlow)" />
        <polygon
          points="180,20 186.5,36 203.5,37.2 190.4,48.2 194.5,64.8 180,55.6 165.5,64.8 169.6,48.2 156.5,37.2 173.5,36"
          fill="#FEF08A"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {ornaments.map((orn, idx) => {
        const slot = XMAS_SLOTS[(orn.slotIdx ?? idx) % XMAS_SLOTS.length];
        const isSel = selectedId === orn.id;
        const isMentioningMe = isAssocTree && canReadWishes && currentUser && doesOrnamentMentionUser(orn, currentUser);

        const handleOrnCtx = (e) => {
          const senderLbl = orn.isAnonymous ? 'ผู้ส่งนิรนาม' : orn.senderName;
          const items = [
            { icon: 'fas fa-eye', label: 'เปิดดูรายละเอียดของประดับนี้', accent: true, onClick: () => onSelectOrnament(orn) }
          ];
          if (canReadWishes && orn.message) {
            items.push({
              icon: 'fas fa-copy',
              label: 'คัดลอกคำอวยพร',
              onClick: () => {
                navigator.clipboard.writeText(orn.message);
                alert('คัดลอกคำอวยพรเรียบร้อยแล้ว!');
              }
            });
          } else {
            items.push({ icon: 'fas fa-lock', label: 'คำอวยพรยังถูกปิดผนึกอยู่', disabled: true });
          }
          openAppMenu(e, {
            header: { icon: 'fas fa-gift', title: `จาก ${senderLbl}`, sub: orn.createdAt },
            items
          });
        };

        return (
          <button
            key={orn.id}
            type="button"
            onClick={() => onSelectOrnament(orn)}
            onContextMenu={handleOrnCtx}
            {...longPressProps(handleOrnCtx)}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-125 hover:z-30 cursor-pointer rounded-full p-0.5 ${isSel ? 'scale-125 z-30 ring-2 ring-amber-300 bg-amber-400/20' : 'z-20'} ${isMentioningMe ? 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.9)]' : ''}`}
            title={canReadWishes ? `คำอวยพรจาก ${orn.isAnonymous ? 'ผู้ส่งนิรนาม' : orn.senderName}` : 'ปิดผนึกถึง 25 ธ.ค. 00:00 น.'}
          >
            <XmasOrnamentSVG shape={orn.shape} colorId={orn.color} size={32} />
          </button>
        );
      })}
    </div>
  );
}

const generateXmasStoryDataUrl = (treeMeta, ornaments, shareUrl) => {
  return new Promise((resolve) => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const rRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#030A0C');
    bg.addColorStop(0.45, '#071E1F');
    bg.addColorStop(0.85, '#092623');
    bg.addColorStop(1, '#040D0E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, 840, 40, W / 2, 840, 520);
    glow.addColorStop(0, 'rgba(253, 230, 138, 0.20)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
    glow.addColorStop(1, 'rgba(4, 13, 14, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 65; i++) {
      const sx = ((i * 197) % 1020) + 30;
      const sy = ((i * 313) % 1820) + 40;
      const sr = (i % 4) + 1.5;
      ctx.fillStyle = i % 5 === 0 ? 'rgba(253, 230, 138, 0.75)' : 'rgba(186, 230, 253, 0.48)';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
    ctx.lineWidth = 3;
    rRect(38, 38, W - 76, H - 76, 44);
    ctx.stroke();

    rRect(W / 2 - 270, 95, 540, 54, 27);
    ctx.fillStyle = 'rgba(136, 19, 55, 0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 22px "Inter", "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`THE BLUE MOON ASSOCIATION • ${treeMeta.year}`, W / 2, 130);

    const ownerTitle = `ต้นคริสต์มาสของ ${treeMeta.ownerName}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = ownerTitle.length > 22
      ? 'bold 46px "Noto Sans Thai", "Inter", sans-serif'
      : 'bold 58px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText(ownerTitle, W / 2, 235, W - 140);

    ctx.fillStyle = '#BAE6FD';
    ctx.font = '600 30px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText('มาแขวนของประดับและเขียนคำอวยพรให้กันนะ', W / 2, 295);

    const treeW = 760;
    const treeH = 908;
    const ox = (W - treeW) / 2;
    const oy = 355;
    const scX = treeW / 360;
    const scY = treeH / 430;
    const px = (x) => ox + x * scX;
    const py = (y) => oy + y * scY;

    ctx.fillStyle = 'rgba(186, 230, 253, 0.14)';
    ctx.beginPath();
    ctx.ellipse(px(180), py(402), 125 * scX, 18 * scY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#451A03';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 3;
    rRect(px(158), py(346), 44 * scX, 52 * scY, 12);
    ctx.fill();
    ctx.stroke();

    const treeGrad = ctx.createLinearGradient(0, py(60), 0, py(370));
    treeGrad.addColorStop(0, '#115E59');
    treeGrad.addColorStop(0.55, '#0D3B38');
    treeGrad.addColorStop(1, '#06201F');

    const tiers = [
      [[180, 62], [114, 160], [246, 160]],
      [[180, 122], [92, 235], [268, 235]],
      [[180, 192], [68, 312], [292, 312]],
      [[180, 262], [46, 368], [314, 368]]
    ];
    tiers.forEach((pts) => {
      ctx.beginPath();
      ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
      ctx.lineTo(px(pts[1][0]), py(pts[1][1]));
      ctx.lineTo(px(pts[2][0]), py(pts[2][1]));
      ctx.closePath();
      ctx.fillStyle = treeGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    const garlands = [
      [126, 148, 180, 174, 234, 148, 'rgba(253,230,138,0.45)'],
      [102, 222, 180, 254, 258, 222, 'rgba(186,230,253,0.42)'],
      [78, 298, 180, 334, 282, 298, 'rgba(253,230,138,0.45)']
    ];
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3.5;
    garlands.forEach(([x1, y1, cx, cy, x2, y2, col]) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(px(x1), py(y1));
      ctx.quadraticCurveTo(px(cx), py(cy), px(x2), py(y2));
      ctx.stroke();
    });
    ctx.restore();

    const starG = ctx.createRadialGradient(px(180), py(46), 4, px(180), py(46), 70);
    starG.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    starG.addColorStop(0.55, 'rgba(245, 158, 11, 0.3)');
    starG.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = starG;
    ctx.beginPath();
    ctx.arc(px(180), py(46), 70, 0, Math.PI * 2);
    ctx.fill();

    const drawStarPoly = (cx, cy, spikes, outerR, innerR, fill, stroke) => {
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    };
    drawStarPoly(px(180), py(46), 5, 48, 22, '#FEF08A', '#F59E0B');

    const listToDraw = ornaments.slice(0, 24);
    if (listToDraw.length === 0) {
      [0, 2, 4, 7, 11, 14, 17, 20].forEach((si, k) => {
        const slot = XMAS_SLOTS[si];
        ctx.fillStyle = k % 2 === 0 ? '#FEF08A' : '#BAE6FD';
        ctx.beginPath();
        ctx.arc(ox + (slot.x / 100) * treeW, oy + (slot.y / 100) * treeH, 9, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      listToDraw.forEach((orn, idx) => {
        const slot = XMAS_SLOTS[(orn.slotIdx ?? idx) % XMAS_SLOTS.length];
        const cx = ox + (slot.x / 100) * treeW;
        const cy = oy + (slot.y / 100) * treeH;
        const col = XMAS_COLORS.find((c) => c.id === orn.color) || XMAS_COLORS[0];

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 10;
        if (orn.shape === 'star') {
          drawStarPoly(cx, cy, 5, 26, 12, col.main, col.light);
        } else if (orn.shape === 'moon') {
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0.35 * Math.PI, 1.65 * Math.PI, false);
          ctx.quadraticCurveTo(cx - 4, cy, cx + 10, cy + 19);
          ctx.closePath();
          ctx.fillStyle = col.main;
          ctx.fill();
          ctx.strokeStyle = col.light;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (orn.shape === 'santahat') {
          ctx.beginPath();
          ctx.moveTo(cx - 20, cy + 14);
          ctx.quadraticCurveTo(cx - 4, cy - 22, cx + 22, cy - 14);
          ctx.lineTo(cx + 18, cy + 14);
          ctx.closePath();
          ctx.fillStyle = col.main;
          ctx.fill();
          ctx.fillStyle = '#F8FAFC';
          rRect(cx - 22, cy + 10, 44, 11, 5);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 23, cy - 12, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (orn.shape === 'gingerbread') {
          ctx.fillStyle = '#B45309';
          ctx.beginPath();
          ctx.arc(cx, cy - 11, 10, 0, Math.PI * 2);
          ctx.fill();
          rRect(cx - 12, cy - 2, 24, 22, 8);
          ctx.fill();
          ctx.fillStyle = col.main;
          ctx.beginPath();
          ctx.arc(cx, cy + 5, 3.5, 0, Math.PI * 2);
          ctx.arc(cx, cy + 14, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = col.main;
          ctx.strokeStyle = col.light;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.arc(cx - 7, cy - 7, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    rRect(W / 2 - 330, 1295, 660, 66, 33);
    ctx.fillStyle = 'rgba(4, 13, 14, 0.86)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 26px "Noto Sans Thai", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`แขวนแล้ว ${ornaments.length} ชิ้น  •  เปิดอ่าน 25 ธ.ค. เวลา 00:00 น.`, W / 2, 1337);

    const cardX = 90;
    const cardY = 1405;
    const cardW = W - 180;
    const cardH = 385;
    rRect(cardX, cardY, cardW, cardH, 34);
    ctx.fillStyle = 'rgba(8, 28, 27, 0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const textCenterX = cardX + 610;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px "Noto Sans Thai", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('สแกน QR หรือกดลิงก์ด้านล่าง', textCenterX, cardY + 90);

    ctx.fillStyle = '#BAE6FD';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillText(`TREE ID: ${treeMeta.code}`, textCenterX, cardY + 138);

    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.65)';
    ctx.lineWidth = 2.5;
    rRect(cardX + 375, cardY + 185, 470, 130, 24);
    ctx.fillStyle = 'rgba(4, 13, 14, 0.6)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(253, 230, 138, 0.75)';
    ctx.font = '600 24px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText('วางสติกเกอร์ลิงก์ IG / FB ตรงนี้', textCenterX, cardY + 258);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(window.location.host || 'The Blue Moon Association', W / 2, 1842);

    const qrBoxX = cardX + 50;
    const qrBoxY = cardY + 52;
    const qrBoxSize = 280;
    rRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    if (window.QRCode) {
      try {
        const tempDiv = document.createElement('div');
        new window.QRCode(tempDiv, {
          text: shareUrl,
          width: 240,
          height: 240,
          colorDark: '#040D0E',
          colorLight: '#FFFFFF',
          correctLevel: window.QRCode.CorrectLevel.M
        });
        setTimeout(() => {
          const qrCanvas = tempDiv.querySelector('canvas');
          if (qrCanvas) ctx.drawImage(qrCanvas, qrBoxX + 20, qrBoxY + 20, 240, 240);
          resolve(canvas.toDataURL('image/png'));
        }, 80);
        return;
      } catch {}
    }
    resolve(canvas.toDataURL('image/png'));
  });
};

function XmasShareModal({
  isOpen, onClose, treeMeta, ornaments,
  channels = [], myGroups = [], onShareToBoard, onShareToChat
}) {
  const { currentUser } = useAuth();
  const { openGuestPrompt } = useUI();
  const [view, setView] = useState('menu');
  const [copied, setCopied] = useState(false);
  const [storyImg, setStoryImg] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [boardNote, setBoardNote] = useState('');
  const [chatRoomId, setChatRoomId] = useState('global-lobby');
  const [chatNote, setChatNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView('menu');
      setCopied(false);
      setStoryImg('');
      setBoardNote('');
      setChatNote('');
    }
  }, [isOpen]);

  if (!isOpen || !treeMeta) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}?tree=${treeMeta.code}`;
  const shareableRooms = [
    ...channels.filter((c) => !c.isSystemReadOnly).map((c) => ({ id: c.id, label: `# ${c.name}` })),
    ...myGroups.filter((g) => !g.isArchived).map((g) => ({ id: g.id, label: `[กลุ่ม] ${g.name}` }))
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenStoryView = async () => {
    setView('story');
    setStoryLoading(true);
    const url = await generateXmasStoryDataUrl(treeMeta, ornaments, shareUrl);
    setStoryImg(url);
    setStoryLoading(false);
  };

  const handleDownloadStory = () => {
    if (!storyImg) return;
    const a = document.createElement('a');
    a.href = storyImg;
    a.download = `xmas-tree-${treeMeta.code}-story.png`;
    a.click();
  };

  const handleNativeShareStory = async () => {
    if (!storyImg) return;
    try {
      const res = await fetch(storyImg);
      const blob = await res.blob();
      const file = new File([blob], `xmas-tree-${treeMeta.code}-story.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `ต้นคริสต์มาสของ ${treeMeta.ownerName}`,
          text: `มาแขวนคำอวยพรบนต้นคริสต์มาสของ ${treeMeta.ownerName} กันนะ! ${shareUrl}`
        });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    handleDownloadStory();
    alert('ดาวน์โหลดภาพสตอรี่ 9:16 เรียบร้อยแล้ว! สามารถอัปโหลดลง IG / Facebook Story และกดคัดลอกลิงก์ไปแปะสติกเกอร์ได้เลยครับ');
  };

  return (
    <Modal
      title={
        view === 'story' ? 'แชร์ลงสตอรี่ IG / Facebook (9:16)'
        : view === 'board' ? 'แชร์ต้นไม้ลงกระดานโพสต์ (Board)'
        : view === 'chat' ? 'ส่งต้นไม้เข้าห้องแชต (Chat)'
        : 'เลือกช่องทางแชร์ต้นคริสต์มาส'
      }
      onClose={onClose}
      maxW="max-w-md"
    >
      <div className="space-y-3.5 text-xs">
        {view === 'menu' && (
          <>
            <div className="p-3 rounded-xl bg-[#040D0E] border border-amber-500/35 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-amber-200 truncate">ต้นคริสต์มาสของ {treeMeta.ownerName}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {treeMeta.code} • แขวนแล้ว {ornaments.length} ชิ้น</div>
              </div>
              <i className="fas fa-tree text-emerald-400 text-xl shrink-0"></i>
            </div>

            <div className="space-y-2">
              <button type="button" onClick={handleOpenStoryView} className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#831843]/70 via-[#9D174D]/60 to-[#92400E]/70 hover:brightness-110 border border-amber-400/50 text-left flex items-center justify-between gap-3 transition-all shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-black/35 border border-white/20 text-amber-200 flex items-center justify-center text-lg shrink-0"><i className="fab fa-instagram"></i></div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm">แชร์ลงสตอรี่ IG / Facebook</div>
                    <div className="text-[10px] text-amber-100/80">สร้างภาพแนวตั้ง 9:16 พร้อม QR Code และกรอบสติกเกอร์ลิงก์</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-amber-200 shrink-0"></i>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อแชร์ต้นคริสต์มาสลงกระดานโพสต์ของสมาคม');
                  setView('board');
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${currentUser ? 'bg-[#050811] border-[#1E3A5F] hover:border-sky-400 hover:bg-[#0F2547]/50' : 'bg-[#050811]/60 border-[#1E3A5F]/50 opacity-75'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/40 text-sky-300 flex items-center justify-center text-base shrink-0"><i className="fas fa-clipboard-list"></i></div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm flex items-center gap-1.5"><span>แชร์ลงกระดานโพสต์ (Board)</span>{!currentUser && <i className="fas fa-lock text-[10px] text-amber-400"></i>}</div>
                    <div className="text-[10px] text-slate-400">สร้างโพสต์การ์ดชวนเพื่อนในสมาคมมากดแขวนคำอวยพร</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-slate-400 shrink-0"></i>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อส่งต้นคริสต์มาสเข้าห้องแชตของสมาคม');
                  setView('chat');
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${currentUser ? 'bg-[#050811] border-[#1E3A5F] hover:border-emerald-400 hover:bg-[#0F2547]/50' : 'bg-[#050811]/60 border-[#1E3A5F]/50 opacity-75'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-base shrink-0"><i className="fas fa-comments"></i></div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm flex items-center gap-1.5"><span>ส่งเข้าห้องแชต (Chat)</span>{!currentUser && <i className="fas fa-lock text-[10px] text-amber-400"></i>}</div>
                    <div className="text-[10px] text-slate-400">ส่งการ์ดชวนแขวนคำอวยพรไปยังห้องแชตหรือกลุ่มที่เลือก</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-slate-400 shrink-0"></i>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${copied ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200' : 'bg-[#050811] border-[#1E3A5F] hover:border-amber-400'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center text-base shrink-0"><i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i></div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm">{copied ? 'คัดลอกลิงก์เรียบร้อยแล้ว!' : 'คัดลอกลิงก์ต้นไม้ (?tree=...)'}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{shareUrl}</div>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {view === 'story' && (
          <div className="space-y-3.5">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white flex items-center gap-1.5 font-bold"><i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น</button>
            <div className="bg-[#040D0E] border border-amber-500/35 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[340px]">
              {storyLoading ? (
                <div className="text-amber-300 font-bold py-16 animate-pulse flex flex-col items-center gap-2">
                  <i className="fas fa-spinner fa-spin text-2xl"></i>
                  <span>กำลังเรนเดอร์ภาพสตอรี่ 9:16 พร้อม QR Code...</span>
                </div>
              ) : (
                <img src={storyImg} alt="Christmas Story Preview" className="max-h-[380px] w-auto rounded-xl border border-amber-400/40 shadow-2xl object-contain" />
              )}
            </div>
            <div className="space-y-2">
              <button type="button" disabled={storyLoading} onClick={handleNativeShareStory} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-amber-500 text-white font-bold shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <i className="fas fa-share-square"></i> แชร์ลงสตอรี่ (IG / Facebook / แอปอื่น)
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={storyLoading} onClick={handleDownloadStory} className="btn-w py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"><i className="fas fa-download"></i> บันทึกภาพ PNG</button>
                <button type="button" onClick={handleCopyLink} className={`py-2 px-3 rounded-xl font-bold border text-xs flex items-center justify-center gap-1.5 transition-colors ${copied ? 'bg-emerald-500 text-[#050811] border-emerald-400' : 'bg-[#050811] text-amber-200 border-amber-500/40 hover:border-amber-300'}`}>
                  <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i><span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์ IG'}</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F] leading-relaxed">
              <strong>ทิปส์ลงสตอรี่:</strong> กด <strong>"คัดลอกลิงก์ IG"</strong> แล้วบันทึก/แชร์ภาพเข้า Instagram หรือ Facebook Story จากนั้นแปะ <strong>สติกเกอร์ลิงก์</strong> ลงในกรอบเส้นประด้านล่างของภาพได้เลย
            </div>
          </div>
        )}

        {view === 'board' && (
          <div className="space-y-3.5">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white flex items-center gap-1.5 font-bold"><i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น</button>
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1.5">ข้อความชวนเพื่อนบนกระดานโพสต์ (ไม่บังคับ)</label>
              <textarea rows="3" maxLength={300} value={boardNote} onChange={(e) => setBoardNote(e.target.value)} placeholder={`มาแขวนของประดับและเขียนคำอวยพรบนต้นคริสต์มาสของ ${treeMeta.ownerName} กันเถอะ!`} className="w-full inp text-xs resize-none" />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onShareToBoard(treeMeta, ornaments.length, boardNote.trim());
                setBusy(false);
                onClose();
              }}
              className="w-full btn-w py-2.5 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-clipboard-list'}`}></i>
              {busy ? 'กำลังโพสต์ลงกระดาน...' : 'ยืนยันแชร์ลง Board'}
            </button>
          </div>
        )}

        {view === 'chat' && (
          <div className="space-y-3.5">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white flex items-center gap-1.5 font-bold"><i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น</button>
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1.5">เลือกห้องแชตหรือกลุ่มที่จะส่ง</label>
              <select value={chatRoomId} onChange={(e) => setChatRoomId(e.target.value)} className="w-full inp py-2 text-xs bg-[#050811]">
                {shareableRooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1.5">ข้อความแนบสั้นๆ (ไม่บังคับ)</label>
              <input type="text" maxLength={200} value={chatNote} onChange={(e) => setChatNote(e.target.value)} placeholder={`มาแขวนคำอวยพรให้ ${treeMeta.ownerName} กัน!`} className="w-full inp text-xs" />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onShareToChat(treeMeta, ornaments.length, chatRoomId, chatNote.trim());
                setBusy(false);
                onClose();
              }}
              className="w-full btn-b py-2.5 text-xs hover:bg-sky-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
              {busy ? 'กำลังส่งเข้าแชต...' : 'ส่งการ์ดต้นไม้เข้าห้องแชต'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ChristmasTreePage({
  allTags = [],
  onBackHome,
  initialTreeCode,
  isOwnerPreviewUnlock = false,
  channels = [],
  myGroups = [],
  onShareToBoard,
  onShareToChat
}) {
  const { currentUser, users } = useAuth();
  const { openGuestPrompt } = useUI();

  const currentYear = getBkkNow().getFullYear();
  const assocCode = `assoc_${currentYear}`;

  const [activeTab, setActiveTab] = useState(initialTreeCode ? 'personal' : 'assoc');
  const [activePersonalCode, setActivePersonalCode] = useState(initialTreeCode || null);
  const [personalTreeMeta, setPersonalTreeMeta] = useState(null);
  const [personalLoading, setPersonalLoading] = useState(false);

  const [guestTrees, setGuestTrees] = useStickyState({}, 'tbma_guest_xmas_trees');
  const [myMemberTree, setMyMemberTree] = useState(null);
  const [ornaments, setOrnaments] = useState([]);
  const [selectedOrn, setSelectedOrn] = useState(null);

  const [newTreeOwnerName, setNewTreeOwnerName] = useState('');
  const [creatingTree, setCreatingTree] = useState(false);

  const [shape, setShape] = useState('moon');
  const [color, setColor] = useState('gold');
  const [wishText, setWishText] = useState('');
  const [guestSenderName, setGuestSenderName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [countdown, setCountdown] = useState('');

  const isDateUnlocked = isXmasMidnightUnlocked(currentYear) || Boolean(isOwnerPreviewUnlock);

  useEffect(() => {
    if (isDateUnlocked) { setCountdown('ปลดล็อกแล้ว!'); return; }
    const updateTimer = () => {
      const bkk = getBkkNow();
      const target = new Date(currentYear, 11, 25, 0, 0, 0);
      const diff = Math.max(0, Math.floor((target - bkk) / 1000));
      const d = Math.floor(diff / 86400);
      const h = String(Math.floor((diff % 86400) / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setCountdown(`${d} วัน ${h}:${m}:${s}`);
    };
    updateTimer();
    const t = setInterval(updateTimer, 1000);
    return () => clearInterval(t);
  }, [currentYear, isDateUnlocked]);

  useEffect(() => {
    if (initialTreeCode) {
      setActivePersonalCode(initialTreeCode);
      setActiveTab('personal');
    }
  }, [initialTreeCode]);

  useEffect(() => {
    if (!currentUser) { setMyMemberTree(null); return; }
    const unsub = db.collection('bma_xmas_trees')
      .where('ownerId', '==', currentUser.id)
      .onSnapshot((s) => {
        const list = s.docs.map((d) => d.data());
        setMyMemberTree(list.find((t) => t.year === currentYear) || null);
      }, () => {});
    return () => unsub();
  }, [currentUser, currentYear]);

  const myOwnPersonalCode = currentUser ? myMemberTree?.code || null : (guestTrees[currentYear]?.code || null);
  const viewingPersonalCode = activePersonalCode || myOwnPersonalCode;

  useEffect(() => {
    if (activeTab !== 'personal' || !viewingPersonalCode) {
      setPersonalTreeMeta(null);
      return;
    }
    setPersonalLoading(true);
    const unsub = db.collection('bma_xmas_trees').doc(viewingPersonalCode).onSnapshot((doc) => {
      setPersonalTreeMeta(doc.exists ? doc.data() : { notFound: true, code: viewingPersonalCode });
      setPersonalLoading(false);
    }, () => setPersonalLoading(false));
    return () => unsub();
  }, [activeTab, viewingPersonalCode]);

  const activeTreeCode = activeTab === 'assoc' ? assocCode : (viewingPersonalCode || null);

  useEffect(() => {
    if (!activeTreeCode) { setOrnaments([]); return; }
    setSelectedOrn(null);
    const unsub = db.collection('bma_xmas_ornaments')
      .where('treeCode', '==', activeTreeCode)
      .onSnapshot((s) => {
        setOrnaments(s.docs.map((d) => d.data()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
      }, () => {});
    return () => unsub();
  }, [activeTreeCode]);

  const isMyPersonalTree = activeTab === 'personal' && personalTreeMeta && !personalTreeMeta.notFound && (
    (currentUser && personalTreeMeta.ownerId === currentUser.id) ||
    (!currentUser && guestTrees[personalTreeMeta.year]?.code === personalTreeMeta.code && guestTrees[personalTreeMeta.year]?.guestToken === personalTreeMeta.guestToken)
  );

  const canReadCurrentTree = activeTab === 'assoc'
    ? (isDateUnlocked && Boolean(currentUser))
    : (isDateUnlocked && (isMyPersonalTree || Boolean(isOwnerPreviewUnlock)));

  const handleCreatePersonalTree = async (e) => {
    e.preventDefault();
    const ownerName = currentUser ? currentUser.displayName : newTreeOwnerName.trim();
    if (!ownerName) return alert('กรุณากรอกชื่อเจ้าของต้นไม้ก่อนครับ');

    setCreatingTree(true);
    try {
      let code = generateRandomTreeCode(currentYear);
      for (let attempt = 0; attempt < 5; attempt++) {
        const check = await db.collection('bma_xmas_trees').doc(code).get();
        if (!check.exists) break;
        code = generateRandomTreeCode(currentYear);
      }

      const guestToken = !currentUser ? ('gt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)) : '';
      const payload = {
        code,
        year: currentYear,
        ownerType: currentUser ? 'member' : 'guest',
        ownerId: currentUser ? currentUser.id : ('GUEST_' + code),
        ownerName,
        guestToken,
        createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        timestamp: Date.now(),
        serverCreatedAt: svrTs()
      };

      await db.collection('bma_xmas_trees').doc(code).set(payload);
      if (!currentUser) {
        setGuestTrees((prev) => ({ ...prev, [currentYear]: { code, ownerName, guestToken, year: currentYear } }));
      }
      setActivePersonalCode(code);
      setNewTreeOwnerName('');
    } catch {
      alert('ไม่สามารถสร้างต้นไม้ได้ กรุณาลองใหม่อีกครั้ง');
    }
    setCreatingTree(false);
  };

  const handleHangOrnament = async (e) => {
    e.preventDefault();
    if (!activeTreeCode) return;
    const msg = wishText.trim();
    if (!msg) return alert('กรุณาพิมพ์คำอวยพรก่อนแขวนครับ');
    if (!currentUser && !guestSenderName.trim()) return alert('กรุณาใส่ชื่อเล่นของคุณก่อนแขวนครับ');

    if (!currentUser) {
      const lastHang = parseInt(localStorage.getItem('tbma_guest_last_orn') || '0', 10);
      if (Date.now() - lastHang < 20000) return alert('กรุณารอสักครู่ก่อนแขวนของประดับชิ้นถัดไปครับ');
    }

    setSending(true);
    try {
      const mentions = (activeTab === 'assoc' && currentUser)
        ? Array.from(new Set(msg.match(/(@\[[^\]]+\]|@[a-zA-Z0-9_&-]+)/g) || []))
        : [];
      const id = 'orn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const payload = {
        id,
        treeCode: activeTreeCode,
        year: activeTab === 'assoc' ? currentYear : (personalTreeMeta?.year || currentYear),
        isAssoc: activeTab === 'assoc',
        shape,
        color,
        message: msg,
        senderName: currentUser ? (isAnonymous ? 'ผู้ส่งนิรนาม' : currentUser.displayName) : guestSenderName.trim(),
        senderId: currentUser ? currentUser.id : 'GUEST',
        isAnonymous: currentUser ? isAnonymous : false,
        isGuest: !currentUser,
        mentions,
        slotIdx: ornaments.length % XMAS_SLOTS.length,
        createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        serverCreatedAt: svrTs()
      };

      await db.collection('bma_xmas_ornaments').doc(id).set(payload);
      if (!currentUser) {
        try { localStorage.setItem('tbma_guest_last_orn', String(Date.now())); } catch {}
      }
      setWishText('');
      setMentionOpen(false);
      setSelectedOrn(payload);
    } catch {
      alert('ไม่สามารถแขวนของประดับได้ กรุณาลองใหม่อีกครั้ง');
    }
    setSending(false);
  };

  const getXmasMentionCandidates = () => {
    const list = [{ token: '@everyone', label: '@everyone', sub: 'สมาชิกทุกคน' }];
    allTags.forEach((t) => list.push({ token: `@[${t}]`, label: `@[${t}]`, sub: `หมวดหมู่ ${t}` }));
    users.filter((u) => u.isActivated).forEach((m) => {
      list.push({ token: `@${m.id}`, label: `@${m.id} (${m.displayName})`, sub: `@${m.username}` });
    });
    if (!mentionQuery) return list.slice(0, 12);
    return list.filter((x) => x.label.toLowerCase().includes(mentionQuery) || x.sub.toLowerCase().includes(mentionQuery)).slice(0, 12);
  };

  const isViewingForeignPersonalTree = activeTab === 'personal' && viewingPersonalCode && viewingPersonalCode !== myOwnPersonalCode;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gradient-to-b from-[#040D0E] via-[#061517] to-[#040D0E]">
      <div className="max-w-6xl mx-auto space-y-5 pb-12">
        <div className="card p-4 sm:p-5 bg-gradient-to-br from-[#081C1B] to-[#040D0E] border-amber-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBackHome} className="btn-d py-2 px-3 text-xs font-bold shrink-0 hover:bg-white hover:text-[#050811] transition-colors" title="กลับหน้า Home">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/60 border border-amber-500/40 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                <i className="fas fa-holly-berry text-red-400"></i> Midnight Winter Event • {currentYear}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Christmas Wish Tree</h2>
              <p className="text-xs text-slate-300 mt-0.5">แขวนของประดับพร้อมคำอวยพรส่งท้ายปี — เปิดอ่านข้อความได้ตั้งแต่ 00:00 น. วันที่ 25 ธันวาคม</p>
            </div>
          </div>

          <div className="bg-[#040D0E] border border-amber-500/40 rounded-2xl px-4 py-2.5 flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm ${isDateUnlocked ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300' : 'bg-amber-500/15 border-amber-400/50 text-amber-300'}`}>
              <i className={`fas ${isDateUnlocked ? 'fa-unlock-alt' : 'fa-clock'}`}></i>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isDateUnlocked ? 'สถานะการเปิดอ่าน' : 'นับถอยหลังสู่คืนคริสต์มาส'}</div>
              <div className={`text-sm sm:text-base font-mono font-bold ${isDateUnlocked ? 'text-emerald-300' : 'text-amber-300'}`}>{countdown}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[#081C1B] p-1 rounded-xl border border-amber-500/40 gap-1 text-xs font-bold">
            <button type="button" onClick={() => setActiveTab('assoc')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'assoc' ? 'bg-white text-[#040D0E] shadow' : 'text-slate-300 hover:text-white'}`}>
              <i className="fas fa-tree text-emerald-600"></i> ต้นไม้สมาคม
            </button>
            <button type="button" onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'personal' ? 'bg-amber-400 text-[#040D0E] shadow' : 'text-slate-300 hover:text-white'}`}>
              <i className="fas fa-gift text-red-600"></i>
              <span>{isViewingForeignPersonalTree ? 'ต้นไม้ที่เปิดจากลิงก์' : 'ต้นไม้ส่วนตัวของฉัน'}</span>
            </button>
          </div>

          {activeTab === 'personal' && isViewingForeignPersonalTree && myOwnPersonalCode && (
            <button type="button" onClick={() => setActivePersonalCode(myOwnPersonalCode)} className="btn-b text-xs py-1.5 px-3 flex items-center gap-1.5">
              <i className="fas fa-home"></i> กลับไปต้นไม้ของฉัน
            </button>
          )}
        </div>

        {activeTab === 'personal' && !viewingPersonalCode ? (
          <div className="card p-6 sm:p-8 max-w-lg mx-auto text-center space-y-5 border-amber-500/40">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-300 flex items-center justify-center text-3xl">
              <i className="fas fa-tree"></i>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">สร้างต้นคริสต์มาสส่วนตัวปี {currentYear}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">ระบบจะสร้างรหัสสุ่มเฉพาะตัวให้คุณนำไปแชร์ลิงก์ให้เพื่อนๆ มาแขวนคำอวยพรได้ทันที (รองรับทั้งสมาชิกและผู้มาเยือน)</p>
            </div>
            <form onSubmit={handleCreatePersonalTree} className="space-y-3 text-left">
              {!currentUser && (
                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-1">ชื่อเจ้าของต้นไม้ (แสดงบนหัวต้นไม้)</label>
                  <input type="text" maxLength={40} value={newTreeOwnerName} onChange={(e) => setNewTreeOwnerName(e.target.value)} placeholder="เช่น น้องมิ้นต์, พี่เอ..." className="w-full inp text-xs" required />
                </div>
              )}
              <button type="submit" disabled={creatingTree} className="w-full btn-w py-3 text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50">
                <i className={`fas ${creatingTree ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
                {creatingTree ? 'กำลังสร้างรหัสต้นไม้...' : `สร้างต้นคริสต์มาสส่วนตัวปี ${currentYear}`}
              </button>
            </form>
            {!currentUser && (
              <p className="text-[10px] text-slate-400">หมายเหตุ: สำหรับ Guest ระบบจะจำสิทธิ์เจ้าของต้นไม้ไว้ในเบราว์เซอร์เครื่องนี้เพื่อใช้เปิดอ่านข้อความในวันที่ 25 ธ.ค.</p>
            )}
          </div>
        ) : activeTab === 'personal' && personalTreeMeta?.notFound ? (
          <div className="card p-8 max-w-md mx-auto text-center space-y-4 border-red-500/40">
            <i className="fas fa-exclamation-triangle text-3xl text-red-400"></i>
            <div className="font-bold text-base text-white">ไม่พบต้นคริสต์มาสรหัส {viewingPersonalCode}</div>
            <p className="text-xs text-slate-400">ลิงก์อาจพิมพ์ผิดหรือยังไม่ได้สร้างต้นไม้นี้ในระบบ</p>
            <button type="button" onClick={() => { setActivePersonalCode(null); setActiveTab('assoc'); }} className="btn-w text-xs px-5 py-2">กลับไปต้นไม้สมาคม</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="card p-4 sm:p-6 bg-gradient-to-b from-[#081C1B] to-[#040D0E] border-amber-500/40 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-amber-500/25">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-amber-200 flex items-center gap-2">
                      <i className={`fas ${activeTab === 'assoc' ? 'fa-moon text-sky-300' : 'fa-star text-amber-300'}`}></i>
                      {activeTab === 'assoc'
                        ? `ต้นคริสต์มาสสมาคม (${currentYear})`
                        : (personalLoading ? 'กำลังโหลด...' : `ต้นคริสต์มาสของ ${personalTreeMeta?.ownerName || viewingPersonalCode}`)}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>แขวนแล้ว <strong className="text-white font-mono">{ornaments.length}</strong> ชิ้น</span>
                      {activeTab === 'personal' && viewingPersonalCode && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#040D0E] border border-amber-500/30 text-amber-300">ID: {viewingPersonalCode}</span>
                      )}
                    </div>
                  </div>

                  {activeTab === 'personal' && viewingPersonalCode && personalTreeMeta && !personalTreeMeta.notFound && (
                    <button type="button" onClick={() => setShareModalOpen(true)} className="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 bg-[#040D0E] text-amber-200 border-amber-500/60 hover:bg-amber-400 hover:text-[#040D0E] shadow">
                      <i className="fas fa-share-alt"></i><span>แชร์ต้นไม้นี้</span>
                    </button>
                  )}
                </div>

                <XmasTreeCanvas
                  ornaments={ornaments}
                  selectedId={selectedOrn?.id}
                  onSelectOrnament={(orn) => setSelectedOrn(orn)}
                  currentUser={currentUser}
                  isAssocTree={activeTab === 'assoc'}
                  canReadWishes={canReadCurrentTree}
                />

                <div className="mt-4 p-4 rounded-xl bg-[#040D0E]/90 border border-amber-500/35 text-xs">
                  {!selectedOrn ? (
                    <div className="text-center text-slate-400 py-2">
                      <i className="fas fa-hand-pointer text-amber-300 mr-1.5"></i>คลิกที่ของประดับบนต้นไม้เพื่อดูรายละเอียด
                    </div>
                  ) : canReadCurrentTree ? (
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <XmasOrnamentSVG shape={selectedOrn.shape} colorId={selectedOrn.color} size={24} />
                          <div>
                            <div className="font-bold text-amber-200 flex items-center gap-1.5">
                              <span>{selectedOrn.isAnonymous ? 'ผู้ส่งนิรนาม' : selectedOrn.senderName}</span>
                              {selectedOrn.isGuest && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">Guest</span>}
                              {selectedOrn.isAnonymous && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600">นิรนาม</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{selectedOrn.createdAt}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedOrn(null)} className="text-slate-400 hover:text-white px-2">✕</button>
                      </div>
                      <div className="text-slate-100 leading-relaxed">
                        <FormattedText text={selectedOrn.message} currentUser={currentUser} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0"><i className="fas fa-lock"></i></div>
                        <div>
                          <div className="font-bold text-amber-200">
                            {activeTab === 'assoc' && !currentUser
                              ? 'คำอวยพรบนต้นไม้สมาคมสงวนไว้สำหรับสมาชิก'
                              : activeTab === 'personal' && isDateUnlocked && !isMyPersonalTree
                                ? 'ข้อความบนต้นไม้ส่วนตัวเปิดอ่านได้เฉพาะเจ้าของต้นไม้'
                                : 'คำอวยพรถูกปิดผนึกไว้จนถึงเที่ยงคืนวันคริสต์มาส'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            แขวนโดย: <strong className="text-slate-200">{selectedOrn.isAnonymous ? 'ผู้ส่งนิรนาม' : selectedOrn.senderName}</strong> • {selectedOrn.createdAt}
                          </div>
                        </div>
                      </div>
                      {activeTab === 'assoc' && !currentUser && (
                        <button type="button" onClick={() => openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อเปิดอ่านคำอวยพรบนต้นไม้สมาคมในวันคริสต์มาส')} className="btn-w py-1.5 px-3 text-[11px] shrink-0">เข้าสู่ระบบ</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <form onSubmit={handleHangOrnament} className="card p-5 space-y-4 border-amber-500/40 shadow-2xl text-xs">
                <div className="flex items-center justify-between border-b border-amber-500/25 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><i className="fas fa-magic text-amber-300"></i> ออกแบบและแขวนของประดับ</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">เลือกทรง สี และเขียนคำอวยพรลงบนต้นไม้นี้</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#040D0E] border border-amber-500/40 flex items-center justify-center shrink-0">
                    <XmasOrnamentSVG shape={shape} colorId={color} size={34} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-2">1. เลือกรูปทรงของประดับ</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {XMAS_SHAPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setShape(s.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${shape === s.id ? 'bg-amber-400/20 border-amber-300 text-white shadow' : 'bg-[#040D0E] border-[#1E3A5F] text-slate-400 hover:text-white'}`}
                      >
                        <XmasOrnamentSVG shape={s.id} colorId={color} size={24} />
                        <span className="text-[9px] font-bold truncate w-full text-center">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-2">2. เลือกโทนสี</label>
                  <div className="flex flex-wrap gap-2">
                    {XMAS_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 transition-all ${color === c.id ? 'border-white bg-white/15 text-white scale-105' : 'border-[#1E3A5F] bg-[#040D0E] text-slate-400 hover:text-white'}`}
                      >
                        <span className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: c.main }}></span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {currentUser ? (
                  <div className="p-3 rounded-xl bg-[#040D0E] border border-amber-500/30 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-200">ส่งในชื่อ: <span className="text-amber-300">{isAnonymous ? 'ผู้ส่งนิรนาม' : currentUser.displayName}</span></div>
                      <div className="text-[10px] text-slate-400">เฉพาะสมาชิกสามารถซ่อนชื่อเป็นนิรนามได้</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(!isAnonymous)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors shrink-0 ${isAnonymous ? 'bg-amber-400 text-[#040D0E] border-amber-300' : 'bg-[#081C1B] text-slate-300 border-[#1E3A5F]'}`}
                    >
                      <i className={`fas ${isAnonymous ? 'fa-user-secret' : 'fa-user'} mr-1`}></i>
                      {isAnonymous ? 'นิรนาม: เปิด' : 'นิรนาม: ปิด'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-amber-200 font-bold mb-1">ชื่อเล่นผู้ส่ง (Guest) <span className="text-red-400">*</span></label>
                    <input type="text" maxLength={35} value={guestSenderName} onChange={(e) => setGuestSenderName(e.target.value)} placeholder="ใส่ชื่อเล่นของคุณ..." className="w-full inp text-xs" required />
                  </div>
                )}

                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-amber-200 font-bold">3. เขียนคำอวยพร <span className="text-red-400">*</span></label>
                    <span className="text-[10px] font-mono text-slate-400">{wishText.length}/400</span>
                  </div>
                  <textarea
                    rows="4"
                    maxLength={400}
                    value={wishText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setWishText(v);
                      if (activeTab === 'assoc' && currentUser) {
                        const lastWord = v.split(/\s+/).pop() || '';
                        if (lastWord.startsWith('@')) {
                          setMentionOpen(true);
                          setMentionQuery(lastWord.slice(1).toLowerCase());
                        } else {
                          setMentionOpen(false);
                        }
                      }
                    }}
                    placeholder={activeTab === 'assoc' && currentUser
                      ? 'พิมพ์คำอวยพร... (พิมพ์ @ เพื่อแท็กสมาชิก จะแจ้งเตือนให้ในวันที่ 25 ธ.ค.)'
                      : 'พิมพ์คำอวยพรส่งท้ายปีถึงเจ้าของต้นไม้...'}
                    className="w-full inp text-xs resize-none custom-scrollbar"
                    required
                  />

                  {mentionOpen && activeTab === 'assoc' && currentUser && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 bg-[#081C1B] border border-amber-400/60 rounded-xl p-1.5 max-h-40 overflow-y-auto shadow-2xl z-40 space-y-1 custom-scrollbar">
                      <div className="text-[9px] text-amber-300 font-bold px-2 py-0.5">เลือกแท็กสมาชิก (แจ้งเตือน 25 ธ.ค.)</div>
                      {getXmasMentionCandidates().map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const words = wishText.split(/\s+/);
                            if (words[words.length - 1]?.startsWith('@')) words[words.length - 1] = item.token;
                            else words.push(item.token);
                            setWishText(words.join(' ') + ' ');
                            setMentionOpen(false);
                          }}
                          className="w-full flex justify-between items-center px-2.5 py-1.5 rounded-lg hover:bg-amber-400/20 text-left"
                        >
                          <span className="font-mono font-bold text-white text-[11px]">{item.label}</span>
                          <span className="text-[9px] text-slate-400">{item.sub}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={sending} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_18px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-gift'}`}></i>
                  {sending ? 'กำลังแขวนบนต้นไม้...' : 'แขวนของประดับลงบนต้นไม้'}
                </button>
              </form>
            </div>
          </div>
        )}

        <XmasShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          treeMeta={personalTreeMeta}
          ornaments={ornaments}
          channels={channels}
          myGroups={myGroups}
          onShareToBoard={onShareToBoard}
          onShareToChat={onShareToChat}
        />
      </div>
    </div>
  );
}

export function MyChristmasTreeArchiveModal({ isOpen, onClose, archivedTrees = [] }) {
  const { currentUser } = useAuth();
  const [selectedTree, setSelectedTree] = useState(null);
  const [ornaments, setOrnaments] = useState([]);
  const [selectedOrn, setSelectedOrn] = useState(null);

  useEffect(() => {
    if (isOpen && archivedTrees.length > 0 && !selectedTree) {
      setSelectedTree(archivedTrees[0]);
    }
  }, [isOpen, archivedTrees, selectedTree]);

  useEffect(() => {
    if (!isOpen || !selectedTree) { setOrnaments([]); return; }
    setSelectedOrn(null);
    const unsub = db.collection('bma_xmas_ornaments')
      .where('treeCode', '==', selectedTree.code)
      .onSnapshot((s) => {
        setOrnaments(s.docs.map((d) => d.data()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)));
      }, () => {});
    return () => unsub();
  }, [isOpen, selectedTree]);

  if (!isOpen) return null;

  return (
    <Modal title="ต้นคริสต์มาสของฉัน (คลังสะสมรายปี)" onClose={onClose} maxW="max-w-4xl">
      <div className="space-y-4 text-xs">
        <div className="flex flex-wrap gap-2 pb-3 border-b border-[#1E3A5F]">
          {archivedTrees.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setSelectedTree(t)}
              className={`px-3.5 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-2 ${selectedTree?.code === t.code ? 'bg-amber-400 text-[#050811] border-amber-300 shadow' : 'bg-[#050811] text-slate-300 border-[#1E3A5F] hover:text-white'}`}
            >
              <i className="fas fa-tree"></i>
              <span>คริสต์มาส {t.year}</span>
              <span className="font-mono text-[10px] opacity-75">({t.code})</span>
            </button>
          ))}
        </div>

        {selectedTree && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-7 bg-[#050811] rounded-2xl border border-[#1E3A5F] p-4">
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2">
                <span>ต้นคริสต์มาสปี <strong className="text-amber-300">{selectedTree.year}</strong></span>
                <span>ของประดับทั้งหมด <strong className="text-white font-mono">{ornaments.length}</strong> ชิ้น</span>
              </div>
              <XmasTreeCanvas
                ornaments={ornaments}
                selectedId={selectedOrn?.id}
                onSelectOrnament={(orn) => setSelectedOrn(orn)}
                currentUser={currentUser}
                isAssocTree={false}
                canReadWishes={true}
              />
            </div>

            <div className="md:col-span-5 space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="font-bold text-amber-300 text-xs pb-1 border-b border-[#1E3A5F]">
                คำอวยพรทั้งหมดในปี {selectedTree.year}
              </div>
              {ornaments.length === 0 ? (
                <div className="text-center text-slate-500 py-8 border border-dashed border-[#1E3A5F] rounded-xl">ไม่มีคำอวยพรบนต้นไม้นี้</div>
              ) : (
                ornaments.map((orn) => (
                  <div
                    key={orn.id}
                    onClick={() => setSelectedOrn(orn)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors space-y-1.5 ${selectedOrn?.id === orn.id ? 'bg-amber-950/30 border-amber-400' : 'bg-[#050811] border-[#1E3A5F] hover:border-slate-500'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <XmasOrnamentSVG shape={orn.shape} colorId={orn.color} size={20} />
                        <span className="font-bold text-white truncate">{orn.isAnonymous ? 'ผู้ส่งนิรนาม' : orn.senderName}</span>
                        {orn.isGuest && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300">Guest</span>}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0">{orn.createdAt}</span>
                    </div>
                    <p className="text-slate-200 whitespace-pre-line leading-relaxed break-words">{orn.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}