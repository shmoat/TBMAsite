import React from 'react';

export const KRATHONG_BASES = [
  { id: 'banana_leaf', label: 'ใบตอง', main: '#15803D', light: '#4ADE80', rim: '#166534' },
  { id: 'bread', label: 'ขนมปัง', main: '#D97706', light: '#FCD34D', rim: '#92400E' },
  { id: 'coconut', label: 'กะลา', main: '#78350F', light: '#B45309', rim: '#451A03' },
  { id: 'ice', label: 'น้ำแข็งใส', main: '#0284C7', light: '#BAE6FD', rim: '#0369A1' },
  { id: 'bluemoon', label: 'จันทร์สีน้ำเงิน', main: '#0F2547', light: '#38BDF8', rim: '#1E3A5F' }
];

export const KRATHONG_FLOWERS = [
  { id: 'marigold', label: 'ดาวเรือง', main: '#F59E0B', light: '#FEF08A' },
  { id: 'pink_lotus', label: 'บัวชมพู', main: '#EC4899', light: '#FBCFE8' },
  { id: 'white_lotus', label: 'บัวขาว', main: '#E2E8F0', light: '#FFFFFF' },
  { id: 'blue_orchid', label: 'กล้วยไม้ฟ้า', main: '#38BDF8', light: '#E0F2FE' }
];

export const KRATHONG_TOPPERS = [
  { id: 'candle', label: 'ธูปเทียน' },
  { id: 'sparkler', label: 'ไฟเย็น' },
  { id: 'moon_gem', label: 'จันทร์เสี้ยว' }
];

export function KrathongSVG({ design = {}, size = 84 }) {
  const base = KRATHONG_BASES.find((b) => b.id === design?.base) || KRATHONG_BASES[0];
  const flower = KRATHONG_FLOWERS.find((f) => f.id === design?.flower) || KRATHONG_FLOWERS[0];
  const topper = design?.topper || 'candle';

  return (
    <svg width={size} height={size * 0.88} viewBox="0 0 120 106" fill="none" className="drop-shadow-[0_6px_12px_rgba(245,158,11,0.35)]">
      <ellipse cx="60" cy="92" rx="46" ry="8" fill="rgba(251,191,36,0.22)" />

      {topper === 'candle' && (
        <>
          <line x1="51" y1="30" x2="49" y2="54" stroke="#A16207" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="69" y1="30" x2="71" y2="54" stroke="#A16207" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="51" cy="29" r="2.2" fill="#F97316" />
          <circle cx="69" cy="29" r="2.2" fill="#F97316" />
          <rect x="56.5" y="34" width="7" height="24" rx="2" fill="#FDE68A" stroke="#D97706" strokeWidth="1.2" />
          <path d="M60 15 C64 22 65 28 60 33 C55 28 56 22 60 15 Z" fill="#F59E0B" />
          <path d="M60 21 C62 25 62.5 29 60 32 C57.5 29 58 25 60 21 Z" fill="#FEF9C3" />
        </>
      )}
      {topper === 'sparkler' && (
        <>
          <line x1="60" y1="26" x2="60" y2="56" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
          <g stroke="#FEF08A" strokeWidth="2" strokeLinecap="round">
            <line x1="60" y1="10" x2="60" y2="38" />
            <line x1="46" y1="24" x2="74" y2="24" />
            <line x1="50" y1="14" x2="70" y2="34" />
            <line x1="70" y1="14" x2="50" y2="34" />
          </g>
          <circle cx="60" cy="24" r="4.5" fill="#FFFFFF" />
        </>
      )}
      {topper === 'moon_gem' && (
        <>
          <line x1="60" y1="36" x2="60" y2="56" stroke="#FDE68A" strokeWidth="2.2" />
          <path d="M66 14 A13 13 0 1 0 66 38 A10 12 0 0 1 66 14 Z" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.5" />
          <polygon points="72,22 73.5,25 76.5,26 73.5,27 72,30 70.5,27 67.5,26 70.5,25" fill="#FEF08A" />
        </>
      )}

      <g>
        {[28, 44, 60, 76, 92].map((cx, i) => (
          <g key={cx}>
            <circle cx={cx} cy={i % 2 === 0 ? 58 : 54} r={i === 2 ? 10 : 8.5} fill={flower.main} stroke={flower.light} strokeWidth="1.4" />
            <circle cx={cx} cy={i % 2 === 0 ? 58 : 54} r="3.2" fill="#FEF08A" />
          </g>
        ))}
      </g>

      <path d="M16 62 L24 50 L36 62 L48 49 L60 62 L72 49 L84 62 L96 50 L104 62 Z" fill={base.light} opacity="0.9" />
      <path d="M16 62 Q60 72 104 62 L95 84 Q60 94 25 84 Z" fill={base.main} stroke={base.light} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 71 Q60 80 98 71" stroke={base.rim} strokeWidth="2" opacity="0.7" fill="none" />

      {base.id === 'bluemoon' && (
        <path d="M60.5 68 L53 81 L67 81 Q60 76.5 60.5 68 Z" fill="#050811" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
      )}
    </svg>
  );
}