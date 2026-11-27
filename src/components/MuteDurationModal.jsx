import React, { useState } from 'react';
import { Modal } from './BasicUI';

export const formatMuteUntil = (exp) => {
  if (!exp) return '';
  if (exp === -1) return 'จนกว่าจะเปิดอีกครั้ง';
  return 'ถึง ' + new Date(exp).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) + ' น.';
};

export function MuteDurationModal({ target, currentExp, onClose, onSave }) {
  const [customAmt, setCustomAmt] = useState(2);
  const [customUnit, setCustomUnit] = useState('hours');

  if (!target) return null;

  const isMutedNow = currentExp === -1 || (typeof currentExp === 'number' && currentExp > Date.now());
  const HOUR = 3600000;
  const DAY = 86400000;

  const PRESETS = [
    { label: '1 ชั่วโมง', sub: '1 hr', ms: HOUR },
    { label: '8 ชั่วโมง', sub: '8 hrs', ms: 8 * HOUR },
    { label: '1 วัน', sub: '24 hrs', ms: DAY },
    { label: '1 สัปดาห์', sub: '7 วัน', ms: 7 * DAY },
    { label: '1 เดือน', sub: '30 วัน', ms: 30 * DAY },
    { label: 'จนกว่าจะเปิดอีกครั้ง', sub: 'ถาวร', ms: -1 }
  ];

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const n = Math.max(1, parseInt(customAmt, 10) || 1);
    const unitMs = { hours: HOUR, days: DAY, weeks: 7 * DAY, months: 30 * DAY }[customUnit] || HOUR;
    onSave(target.key, Date.now() + n * unitMs);
  };

  return (
    <Modal title="ปิดการแจ้งเตือน" onClose={onClose} maxW="max-w-sm">
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm shrink-0 ${isMutedNow ? 'bg-red-950/60 border-red-500/40 text-red-400' : 'bg-sky-950/60 border-sky-500/40 text-sky-300'}`}>
            <i className={`fas ${isMutedNow ? 'fa-bell-slash' : 'fa-bell'}`}></i>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{target.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isMutedNow ? `ปิดแจ้งเตือนอยู่ (${formatMuteUntil(currentExp)})` : 'กำลังเปิดรับการแจ้งเตือนตามปกติ'}
            </div>
          </div>
        </div>

        {isMutedNow && (
          <button
            type="button"
            onClick={() => onSave(target.key, null)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow flex items-center justify-center gap-2 transition-colors"
          >
            <i className="fas fa-bell"></i> เปิดการแจ้งเตือนอีกครั้ง
          </button>
        )}

        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-300">
            {isMutedNow ? 'หรือเปลี่ยนระยะเวลาปิดการแจ้งเตือน:' : 'เลือกระยะเวลาที่ต้องการปิด:'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onSave(target.key, p.ms === -1 ? -1 : Date.now() + p.ms)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${p.ms === -1 ? 'col-span-2 bg-red-950/30 border-red-900/60 hover:border-red-400 text-red-200' : 'bg-[#050811] border-[#1E3A5F] hover:border-sky-400 hover:bg-[#0F2547] text-slate-100'}`}
              >
                <span className="font-bold">{p.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-[#1E3A5F] space-y-2">
          <div className="text-[11px] font-bold text-sky-300">กำหนดระยะเวลาเอง</div>
          <div className="flex gap-2">
            <input type="number" min="1" max="999" value={customAmt} onChange={(e) => setCustomAmt(e.target.value)} className="w-20 inp text-center font-mono text-xs py-1.5" required />
            <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} className="flex-1 inp text-xs py-1.5 bg-[#050811]">
              <option value="hours">ชั่วโมง</option>
              <option value="days">วัน</option>
              <option value="weeks">สัปดาห์</option>
              <option value="months">เดือน</option>
            </select>
            <button type="submit" className="btn-w py-1.5 px-4 text-xs shrink-0">ตกลง</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}