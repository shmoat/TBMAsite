import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { safeUrl } from '../../lib/security';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/BasicUI';

export const CURRENCY_META = {
  THB: { flag: '🇹🇭', name: 'บาทไทย' },
  USD: { flag: '🇺🇸', name: 'ดอลลาร์สหรัฐ' },
  JPY: { flag: '🇯🇵', name: 'เยนญี่ปุ่น' },
  KRW: { flag: '🇰🇷', name: 'วอนเกาหลีใต้' },
  EUR: { flag: '🇪🇺', name: 'ยูโร' },
  GBP: { flag: '🇬🇧', name: 'ปอนด์สเตอร์ลิง' },
  SGD: { flag: '🇸🇬', name: 'ดอลลาร์สิงคโปร์' },
  CNY: { flag: '🇨🇳', name: 'หยวนจีน' },
  HKD: { flag: '🇭🇰', name: 'ดอลลาร์ฮ่องกง' },
  AUD: { flag: '🇦🇺', name: 'ดอลลาร์ออสเตรเลีย' },
  CHF: { flag: '🇨🇭', name: 'ฟรังก์สวิส' },
  MYR: { flag: '🇲🇾', name: 'ริงกิตมาเลเซีย' },
  CAD: { flag: '🇨🇦', name: 'ดอลลาร์แคนาดา' },
  NZD: { flag: '🇳🇿', name: 'ดอลลาร์นิวซีแลนด์' },
  INR: { flag: '🇮🇳', name: 'รูปีอินเดีย' },
  IDR: { flag: '🇮🇩', name: 'รูเปียห์อินโดนีเซีย' },
  PHP: { flag: '🇵🇭', name: 'เปโซฟิลิปปินส์' }
};

const _fxCache = {};

export const fetchFrankfurterRates = async (base = 'THB') => {
  const key = String(base || 'THB').toUpperCase();
  const hit = _fxCache[key];
  if (hit && Date.now() - hit.fetchedAt < 30 * 60 * 1000) return hit;

  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error('Frankfurter API Error');
  const data = await res.json();
  const payload = {
    base: data.base,
    date: data.date,
    rates: { [data.base]: 1, ...(data.rates || {}) },
    fetchedAt: Date.now()
  };
  _fxCache[key] = payload;
  return payload;
};

function LunarSplitterFxBar({ onApplyThb }) {
  const [open, setOpen] = useState(false);
  const [fxCurr, setFxCurr] = useState('JPY');
  const [fxAmt, setFxAmt] = useState('');
  const [cardFeePct, setCardFeePct] = useState('0');
  const [splitCount, setSplitCount] = useState('1');
  const [fxData, setFxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || fxData) return;
    setLoading(true);
    fetchFrankfurterRates('THB')
      .then((d) => setFxData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, fxData]);

  const codes = Object.keys(CURRENCY_META).filter((c) => c !== 'THB');
  const rawForeign = parseFloat(fxAmt) || 0;
  const feeMultiplier = 1 + (parseFloat(cardFeePct) || 0) / 100;
  const rateToThb = fxData?.rates?.[fxCurr] ? 1 / fxData.rates[fxCurr] : 0;
  const thbTotal = rawForeign * rateToThb * feeMultiplier;
  const people = Math.max(1, parseInt(splitCount, 10) || 1);
  const thbPerPerson = thbTotal / people;

  const handleCopyThb = () => {
    if (thbTotal <= 0) return;
    navigator.clipboard.writeText(thbTotal.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl bg-[#0B1325] border border-sky-500/35 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-[#0F2547]/60 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-sky-300">
          <i className="fas fa-globe-asia text-emerald-400"></i>
          <span>บิลสกุลเงินต่างประเทศ (แปลงเป็นบาทอัตโนมัติ)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {fxData?.date && <span className="font-mono hidden sm:inline">เรท {fxData.date}</span>}
          <i className={`fas fa-chevron-${open ? 'up' : 'down'}`}></i>
        </div>
      </button>

      {open && (
        <div className="p-3.5 pt-2 border-t border-[#1E3A5F] space-y-3 bg-[#050811]/70">
          {loading && !fxData ? (
            <div className="py-3 text-center text-sky-400 animate-pulse">กำลังดึงเรทจาก Frankfurter...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">สกุลเงินบิล</label>
                  <select value={fxCurr} onChange={(e) => setFxCurr(e.target.value)} className="w-full inp py-1.5 text-xs font-bold">
                    {codes.map((c) => (
                      <option key={c} value={c}>
                        {CURRENCY_META[c].flag} {c} ({CURRENCY_META[c].name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ยอดเงิน ({fxCurr})</label>
                  <input
                    type="number"
                    step="any"
                    value={fxAmt}
                    onChange={(e) => setFxAmt(e.target.value)}
                    placeholder="เช่น 4800"
                    className="w-full inp py-1.5 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ค่าธรรมเนียมรูดบัตร (%)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={cardFeePct}
                      onChange={(e) => setCardFeePct(e.target.value)}
                      className="w-full inp py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setCardFeePct((p) => (p === '2.5' ? '0' : '2.5'))}
                      className={`px-2 rounded-lg border text-[10px] font-bold shrink-0 ${cardFeePct === '2.5' ? 'bg-amber-500 text-[#050811] border-amber-300' : 'bg-[#0B1325] text-slate-300 border-[#1E3A5F]'}`}
                      title="สลับค่าความเสี่ยงอัตราแลกเปลี่ยนบัตรเครดิต 2.5%"
                    >
                      +2.5%
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">หารด่วน (คน)</label>
                  <input
                    type="number"
                    min="1"
                    value={splitCount}
                    onChange={(e) => setSplitCount(e.target.value)}
                    className="w-full inp py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1325] border border-emerald-500/35 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-mono">
                    1 {fxCurr} ≈ {(rateToThb * feeMultiplier).toFixed(4)} THB
                    {parseFloat(cardFeePct) > 0 ? ` (รวมค่าบัตร +${cardFeePct}%)` : ''}
                  </div>
                  <div className="text-base sm:text-lg font-mono font-bold text-emerald-300">
                    {thbTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </div>
                  {people > 1 && thbTotal > 0 && (
                    <div className="text-[11px] text-amber-300 font-mono">
                      หาร {people} คน = คนละ{' '}
                      <strong>{thbPerPerson.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> บาท
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyThb}
                    disabled={thbTotal <= 0}
                    className="btn-d py-1.5 px-3 text-[11px] disabled:opacity-40"
                  >
                    <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy'} mr-1`}></i>
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอกยอดบาท'}
                  </button>
                  {onApplyThb && (
                    <button
                      type="button"
                      disabled={thbTotal <= 0}
                      onClick={() =>
                        onApplyThb(Number(thbTotal.toFixed(2)), {
                          currency: fxCurr,
                          originalAmount: rawForeign,
                          note: `${rawForeign.toLocaleString()} ${fxCurr}`
                        })
                      }
                      className="btn-b py-1.5 px-3 text-[11px] disabled:opacity-40"
                    >
                      <i className="fas fa-arrow-down mr-1"></i> ใช้ยอดนี้ในบิล
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const LunarSplitter = () => {
  const [members, setMembers] = useState([
    { id: 1, name: 'นาย A' },
    { id: 2, name: 'นาย B' }
  ]);
  const [bills, setBills] = useState([]);
  const [newMem, setNewMem] = useState('');
  const [bName, setBName] = useState('');
  const [bAmt, setBAmt] = useState('');
  const [bCurr, setBCurr] = useState('THB');
  const [bPayer, setBPayer] = useState(1);
  const [fxData, setFxData] = useState(null);

  useEffect(() => {
    fetchFrankfurterRates('THB')
      .then((d) => setFxData(d))
      .catch(() => {});
  }, []);

  const currencyCodes = Object.keys(CURRENCY_META);
  const getRateToThb = (code) => {
    if (code === 'THB') return 1;
    const r = fxData?.rates?.[code];
    return r ? 1 / r : 0;
  };

  const previewThb = (() => {
    const raw = parseFloat(bAmt) || 0;
    if (raw <= 0) return 0;
    if (bCurr === 'THB') return raw;
    const rate = getRateToThb(bCurr);
    return rate > 0 ? raw * rate : 0;
  })();

  const addMember = (e) => {
    e.preventDefault();
    if (newMem.trim()) {
      const nextId = Date.now();
      setMembers([...members, { id: nextId, name: newMem.trim() }]);
      if (members.length === 0) setBPayer(nextId);
      setNewMem('');
    }
  };

  const removeMember = (id) => {
    const nextMembers = members.filter((x) => x.id !== id);
    setMembers(nextMembers);
    if (bPayer === id && nextMembers.length > 0) setBPayer(nextMembers[0].id);
  };

  const addBill = (e) => {
    e.preventDefault();
    const raw = parseFloat(bAmt);
    if (!bName.trim() || !(raw > 0)) return;
    if (bCurr !== 'THB' && !fxData?.rates?.[bCurr]) {
      return alert('กำลังโหลดอัตราแลกเปลี่ยน กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
    }

    const thbAmt = bCurr === 'THB' ? raw : Number((raw * getRateToThb(bCurr)).toFixed(2));
    setBills([
      ...bills,
      {
        id: Date.now(),
        name: bName.trim(),
        amt: thbAmt,
        origAmt: bCurr !== 'THB' ? raw : null,
        origCurr: bCurr !== 'THB' ? bCurr : null,
        payer: bPayer
      }
    ]);
    setBName('');
    setBAmt('');
  };

  const calculateDebts = () => {
    if (members.length === 0 || bills.length === 0) return [];
    const balances = {};
    members.forEach((m) => { balances[m.id] = 0; });

    bills.forEach((b) => {
      if (balances[b.payer] !== undefined) balances[b.payer] += b.amt;
      const splitAmt = b.amt / members.length;
      members.forEach((m) => { balances[m.id] -= splitAmt; });
    });

    const debtors = [];
    const creditors = [];
    for (const [id, amt] of Object.entries(balances)) {
      if (amt < -0.01) debtors.push({ id: parseInt(id, 10), amt: -amt });
      else if (amt > 0.01) creditors.push({ id: parseInt(id, 10), amt });
    }
    debtors.sort((a, b) => b.amt - a.amt);
    creditors.sort((a, b) => b.amt - a.amt);

    const transactions = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const amount = Math.min(d.amt, c.amt);
      transactions.push({
        from: members.find((m) => m.id === d.id)?.name || 'Unknown',
        to: members.find((m) => m.id === c.id)?.name || 'Unknown',
        amt: amount
      });
      d.amt -= amount;
      c.amt -= amount;
      if (d.amt < 0.01) i++;
      if (c.amt < 0.01) j++;
    }
    return transactions;
  };

  const transactions = calculateDebts();
  const totalThb = bills.reduce((sum, b) => sum + b.amt, 0);

  return (
    <div className="flex flex-col gap-5 py-2 w-full max-w-2xl mx-auto text-xs">
      <LunarSplitterFxBar
        onApplyThb={(thbVal, meta) => {
          setBCurr('THB');
          setBAmt(String(thbVal));
          if (!bName.trim() && meta?.note) setBName(`บิลต่างประเทศ (${meta.note})`);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-lg">
          <div className="font-bold text-sky-300 mb-3 border-b border-[#1E3A5F] pb-2">
            <i className="fas fa-users"></i> สมาชิกทริป ({members.length} คน)
          </div>
          <form onSubmit={addMember} className="flex gap-2 mb-3">
            <input type="text" value={newMem} onChange={(e) => setNewMem(e.target.value)} placeholder="ชื่อสมาชิก..." className="flex-1 inp py-1.5" />
            <button type="submit" className="btn-b py-1.5 px-3">+</button>
          </form>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {members.map((m) => (
              <span key={m.id} className="bg-[#050811] border border-[#1E3A5F] px-2 py-1 rounded-full text-slate-300 flex items-center gap-2">
                {m.name} <button type="button" onClick={() => removeMember(m.id)} className="text-red-400 hover:text-red-300">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-lg">
          <div className="flex items-center justify-between font-bold text-amber-300 mb-3 border-b border-[#1E3A5F] pb-2">
            <span><i className="fas fa-receipt"></i> บิลค่าใช้จ่าย ({bills.length} รายการ)</span>
            {totalThb > 0 && (
              <span className="font-mono text-[10px] text-slate-300">
                รวม {totalThb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </span>
            )}
          </div>
          <form onSubmit={addBill} className="space-y-2 mb-3">
            <input type="text" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="ชื่อรายการ (เช่น ค่าที่พัก)..." className="w-full inp py-1.5" required />
            <div className="flex gap-1.5">
              <select value={bCurr} onChange={(e) => setBCurr(e.target.value)} className="w-24 inp py-1.5 bg-[#050811] font-mono font-bold shrink-0">
                {currencyCodes.map((c) => <option key={c} value={c}>{CURRENCY_META[c].flag} {c}</option>)}
              </select>
              <input type="number" step="any" value={bAmt} onChange={(e) => setBAmt(e.target.value)} placeholder={`จำนวนเงิน (${bCurr})`} className="flex-1 inp py-1.5 font-mono min-w-0" required />
            </div>
            {bCurr !== 'THB' && previewThb > 0 && (
              <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/35 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex justify-between">
                <span>แปลงเป็นบาท ({fxData?.date || 'ล่าสุด'})</span>
                <strong>≈ {previewThb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</strong>
              </div>
            )}
            <select value={bPayer} onChange={(e) => setBPayer(parseInt(e.target.value, 10))} className="w-full inp py-1.5 bg-[#050811]">
              {members.map((m) => <option key={m.id} value={m.id}>จ่ายโดย: {m.name}</option>)}
            </select>
            <button type="submit" className="w-full btn-b py-1.5 border-amber-500/50 text-amber-300 hover:bg-amber-900">+ เพิ่มบิล</button>
          </form>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {bills.map((b) => (
              <div key={b.id} className="flex justify-between items-center bg-[#050811] p-2 rounded border border-[#1E3A5F] text-[10px]">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold text-slate-200 truncate">{b.name}</span>
                  <span className="text-slate-500">
                    จ่ายโดย {members.find((m) => m.id === b.payer)?.name}
                    {b.origCurr && <span className="ml-1.5 text-sky-400 font-mono">({b.origAmt.toLocaleString()} {b.origCurr})</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-amber-300 font-bold">
                    {b.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                  </span>
                  <button type="button" onClick={() => setBills(bills.filter((x) => x.id !== b.id))} className="text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#050811] to-[#0a101f] p-5 rounded-xl border border-emerald-500/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl"><i className="fas fa-hand-holding-usd"></i></div>
        <div className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-4">สรุปการเคลียร์หนี้ (ใครโอนให้ใคร)</div>
        {transactions.length === 0 ? (
          <div className="text-slate-500 text-center py-6 border border-dashed border-[#1E3A5F] rounded-xl">ยังไม่มีหนี้ที่ต้องเคลียร์ หรือเพิ่มสมาชิก/บิลไม่ครบ</div>
        ) : (
          <div className="space-y-2 relative z-10">
            {transactions.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200 bg-[#0B1325] px-2.5 py-1 rounded border border-[#1E3A5F]">{t.from}</span>
                  <span className="text-emerald-500 text-lg animate-pulse">➡️</span>
                  <span className="font-bold text-slate-200 bg-[#0B1325] px-2.5 py-1 rounded border border-[#1E3A5F]">{t.to}</span>
                </div>
                <span className="font-mono font-bold text-emerald-300 text-sm sm:text-base bg-[#050811] px-3 py-1 rounded-lg border border-emerald-900/50 shadow-inner">
                  {t.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="text-[10px] text-slate-400 mt-4 text-center">💡 ระบบประมวลผลการเคลียร์เงินที่ซับซ้อน ให้เหลือเส้นทางการโอนที่น้อยที่สุด (Greedy Algorithm)</div>
      </div>
    </div>
  );
};

export const Randomizer = () => {
  const [names, setNames] = useState('ตัวเลือก 1\nตัวเลือก 2\nตัวเลือก 3\nตัวเลือก 4\nตัวเลือก 5');
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [mode, setMode] = useState('wheel');
  const [rotation, setRotation] = useState(0);

  const colors = ['#f87171', '#fbbf24', '#34d399', '#38bdf8', '#c084fc', '#fb7185', '#a3e635'];

  const handleSpin = () => {
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean);
    if (list.length === 0) return;
    setSpinning(true);
    setResult(null);

    if (mode === 'text') {
      let count = 0;
      const interval = setInterval(() => {
        setResult(list[Math.floor(Math.random() * list.length)]);
        count++;
        if (count > 20) {
          clearInterval(interval);
          setSpinning(false);
        }
      }, 80);
    } else {
      const winIdx = Math.floor(Math.random() * list.length);
      const sliceDeg = 360 / list.length;
      const centerDeg = winIdx * sliceDeg + sliceDeg / 2;
      const targetRot = 270 - centerDeg;
      const currentBase = rotation - (rotation % 360);
      setRotation(currentBase + 360 * 5 + targetRot + 360);
      setTimeout(() => {
        setSpinning(false);
        setResult(list[winIdx]);
      }, 4000);
    }
  };

  const removeResult = () => {
    if (!result) return;
    setNames(names.split('\n').map((n) => n.trim()).filter((n) => n && n !== result).join('\n'));
    setResult(null);
  };

  const list = names.split('\n').map((n) => n.trim()).filter(Boolean);
  const sliceAngle = 360 / Math.max(1, list.length);
  const conicGradient = list.map((_, i) => `${colors[i % colors.length]} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`).join(', ');

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mx-auto items-center md:items-start text-xs">
      <div className="w-full md:w-1/3 bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4 shrink-0">
        <div className="flex justify-between items-center border-b border-[#1E3A5F] pb-2">
          <label className="text-amber-400 font-bold text-sm"><i className="fas fa-list-ul"></i> ตัวเลือก</label>
          <select value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} className="bg-[#050811] text-sky-200 border border-[#1E3A5F] rounded p-1 outline-none font-bold">
            <option value="wheel">วงล้อ (Wheel)</option>
            <option value="text">ข้อความ (Text)</option>
          </select>
        </div>
        <textarea rows="10" value={names} onChange={(e) => setNames(e.target.value)} className="w-full inp resize-none text-sm leading-relaxed custom-scrollbar" placeholder="ใส่ชื่อหรือตัวเลือก บรรทัดละ 1 ข้อความ..."></textarea>
        <button type="button" onClick={handleSpin} disabled={spinning} className="w-full btn-w py-3 shadow-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
          {spinning ? <><i className="fas fa-spinner fa-spin"></i> กำลังสุ่ม...</> : <><i className="fas fa-dice"></i> สุ่มเลย!</>}
        </button>
        <div className="text-[10px] text-slate-400 mt-2">มีตัวเลือกทั้งหมด: {list.length} รายการ</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#050811] to-[#0a101f] rounded-2xl border border-[#1E3A5F] shadow-2xl relative w-full min-h-[400px]">
        {mode === 'text' ? (
          <div className="flex flex-col items-center justify-center w-full">
            <div className="text-sky-400 font-bold uppercase tracking-widest mb-6">Text Randomizer</div>
            {spinning || result ? (
              <div className={`w-full max-w-sm p-8 text-center rounded-2xl border-4 transition-all duration-300 ${spinning ? 'bg-[#0F2547] border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'bg-amber-500/20 border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.5)] animate-bounce'}`}>
                <div className="text-sm text-slate-400 mb-2">{spinning ? 'กำลังค้นหาผู้โชคดี...' : 'ผู้ที่ถูกเลือกคือ!'}</div>
                <div className={`text-3xl sm:text-4xl font-bold truncate ${spinning ? 'text-sky-300' : 'text-amber-400'}`}>{result}</div>
              </div>
            ) : (
              <div className="text-slate-500 text-center border-2 border-dashed border-[#1E3A5F] rounded-xl p-10 w-full max-w-sm">
                <i className="fas fa-random text-4xl mb-3 block"></i>คลิก "สุ่มเลย!" ทางซ้ายเพื่อเริ่ม
              </div>
            )}
            {result && !spinning && (
              <div className="mt-8 flex gap-3 animate-fade-in">
                <button type="button" onClick={handleSpin} className="btn-w py-2 px-6 font-bold shadow hover:scale-105"><i className="fas fa-redo-alt mr-1"></i> สุ่มอีกครั้ง</button>
                <button type="button" onClick={removeResult} className="btn-d py-2 px-4 text-red-300 border-red-900/50 hover:bg-red-950 font-bold"><i className="fas fa-trash-alt mr-1"></i> ลบตัวเลือกนี้ออก</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-white z-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
            <div
              className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden"
              style={{
                background: `conic-gradient(${conicGradient})`,
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
              }}
            >
              {list.map((name, i) => {
                const angle = i * sliceAngle + sliceAngle / 2;
                return (
                  <div key={i} className="absolute top-1/2 left-1/2 w-[50%] h-[2px] origin-left -translate-y-1/2 flex items-center justify-end pr-4 sm:pr-6" style={{ transform: `rotate(${angle}deg)` }}>
                    <span className="text-white font-bold drop-shadow-md text-sm sm:text-base absolute right-4 sm:right-6 w-24 sm:w-28 text-right truncate" style={{ transform: 'rotate(180deg) scale(-1, -1)' }}>
                      {name}
                    </span>
                  </div>
                );
              })}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#0B1325] rounded-full border-4 border-slate-600 shadow-[0_0_10px_rgba(0,0,0,0.8)] flex items-center justify-center z-10">
                <Logo s={28} />
              </div>
            </div>

            {result && !spinning && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center animate-fade-in rounded-2xl">
                <div className="bg-[#0B1325] border-2 border-amber-400 p-8 rounded-2xl text-center shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-bounce min-w-[250px]">
                  <div className="text-slate-300 mb-2 text-sm"><i className="fas fa-trophy text-amber-400 mr-1"></i> ผู้ที่ถูกเลือกคือ</div>
                  <div className="text-3xl sm:text-4xl font-bold text-amber-400 truncate max-w-[300px] mx-auto">{result}</div>
                  <div className="mt-6 flex flex-col gap-2">
                    <button type="button" onClick={() => setResult(null)} className="w-full px-6 py-2.5 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors shadow">ตกลง / ปิด</button>
                    <button type="button" onClick={removeResult} className="w-full px-6 py-2.5 bg-red-950/50 text-red-300 font-bold border border-red-900/50 rounded-lg hover:bg-red-900 hover:text-white transition-colors"><i className="fas fa-trash-alt mr-1"></i> ลบชื่อนี้ออกจากตัวเลือก</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const SmartDateCalc = () => {
  const [mode, setMode] = useState('diff');
  const [d1, setD1] = useState(new Date().toISOString().split('T')[0]);
  const [d2, setD2] = useState('');
  const [addAmt, setAddAmt] = useState(30);
  const [addUnit, setAddUnit] = useState('days');
  const [isSub, setIsSub] = useState(false);
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [resDiff, setResDiff] = useState(null);
  const [resAdd, setResAdd] = useState(null);

  useEffect(() => {
    if (mode === 'diff') {
      if (!d1 || !d2) return;
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      const diffDays = Math.ceil(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));
      let workDays = 0;
      const curDate = new Date(Math.min(date1, date2));
      const endDate = new Date(Math.max(date1, date2));
      while (curDate < endDate) {
        const day = curDate.getDay();
        if (day !== 0 && day !== 6) workDays++;
        curDate.setDate(curDate.getDate() + 1);
      }
      setResDiff({
        days: diffDays,
        workDays,
        weeks: Math.floor(diffDays / 7),
        months: (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth())
      });
    } else {
      if (!d1 || isNaN(addAmt)) return;
      const resultDate = new Date(d1);
      const amt = isSub ? -addAmt : addAmt;
      if (addUnit === 'days') {
        if (excludeWeekends) {
          let added = 0;
          const step = amt > 0 ? 1 : -1;
          while (added < Math.abs(amt)) {
            resultDate.setDate(resultDate.getDate() + step);
            const day = resultDate.getDay();
            if (day !== 0 && day !== 6) added++;
          }
        } else {
          resultDate.setDate(resultDate.getDate() + amt);
        }
      } else if (addUnit === 'months') {
        resultDate.setMonth(resultDate.getMonth() + amt);
      } else if (addUnit === 'years') {
        resultDate.setFullYear(resultDate.getFullYear() + amt);
      }
      setResAdd(
        new Intl.DateTimeFormat('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(resultDate)
      );
    }
  }, [d1, d2, addAmt, addUnit, isSub, excludeWeekends, mode]);

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl mx-auto text-xs">
      <div className="w-full md:w-1/2 bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
        <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] font-bold text-[11px]">
          <button type="button" onClick={() => setMode('diff')} className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'diff' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📅 หาระยะห่าง (Diff)</button>
          <button type="button" onClick={() => setMode('add')} className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'add' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>⏱️ คำนวณวันหน้า/ย้อนหลัง</button>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="text-slate-400 font-bold mb-1 block">วันที่เริ่มต้น (Start Date)</label>
            <input type="date" value={d1} onChange={(e) => setD1(e.target.value)} className="w-full inp text-slate-200" />
          </div>
          {mode === 'diff' ? (
            <div>
              <label className="text-slate-400 font-bold mb-1 block">วันที่สิ้นสุด (End Date)</label>
              <input type="date" value={d2} onChange={(e) => setD2(e.target.value)} className="w-full inp text-slate-200" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 font-bold mb-1 block">ระยะเวลา</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => setIsSub(false)} className={`w-10 sm:w-12 py-1.5 rounded border font-bold text-[14px] ${!isSub ? 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' : 'bg-[#050811] text-slate-500 border-[#1E3A5F]'}`}>+</button>
                    <button type="button" onClick={() => setIsSub(true)} className={`w-10 sm:w-12 py-1.5 rounded border font-bold text-[14px] ${isSub ? 'bg-red-900/50 text-red-400 border-red-500/50' : 'bg-[#050811] text-slate-500 border-[#1E3A5F]'}`}>-</button>
                  </div>
                  <div className="flex gap-2 flex-1 min-w-[150px]">
                    <input type="number" value={addAmt} onChange={(e) => setAddAmt(parseInt(e.target.value, 10) || 0)} className="w-16 flex-1 inp font-mono text-center px-1" />
                    <select value={addUnit} onChange={(e) => setAddUnit(e.target.value)} className="flex-1 inp bg-[#050811] px-1 sm:px-2 text-[11px] sm:text-xs text-center">
                      <option value="days">วัน (Days)</option>
                      <option value="months">เดือน (Months)</option>
                      <option value="years">ปี (Years)</option>
                    </select>
                  </div>
                </div>
              </div>
              {addUnit === 'days' && (
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#050811] rounded border border-[#1E3A5F]">
                  <input type="checkbox" checked={excludeWeekends} onChange={(e) => setExcludeWeekends(e.target.checked)} className="accent-sky-500 w-3.5 h-3.5" />
                  <span className="text-slate-300">ข้ามนับวันเสาร์-อาทิตย์ (นับเฉพาะวันทำงาน)</span>
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#050811] to-[#0F2547] rounded-2xl border border-sky-900/50 shadow-2xl relative overflow-hidden">
        <div className="text-sky-400 font-bold text-sm uppercase tracking-widest mb-4 z-10">ผลลัพธ์ (Result)</div>
        {mode === 'diff' ? (
          resDiff && d2 ? (
            <div className="grid grid-cols-2 gap-3 w-full z-10">
              <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] text-center"><div className="text-3xl font-mono font-bold text-white mb-1">{resDiff.days.toLocaleString()}</div><div className="text-[10px] text-slate-400">วัน (Total Days)</div></div>
              <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50 text-center"><div className="text-3xl font-mono font-bold text-emerald-400 mb-1">{resDiff.workDays.toLocaleString()}</div><div className="text-[10px] text-emerald-600">วันทำงาน (ตัด ส.-อา.)</div></div>
              <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F] text-center"><div className="text-xl font-mono font-bold text-sky-200">{resDiff.weeks}</div><div className="text-[10px] text-slate-400 mt-0.5">สัปดาห์ (Weeks)</div></div>
              <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F] text-center"><div className="text-xl font-mono font-bold text-sky-200">{resDiff.months}</div><div className="text-[10px] text-slate-400 mt-0.5">เดือนโดยประมาณ</div></div>
            </div>
          ) : (
            <div className="text-slate-500 z-10 border border-dashed border-[#1E3A5F] p-4 rounded-xl w-full text-center">กรุณาเลือกวันที่สิ้นสุด</div>
          )
        ) : (
          <div className="w-full z-10 flex flex-col items-center justify-center bg-[#0B1325] border-2 border-sky-500/30 p-6 rounded-2xl">
            <div className="text-[10px] text-slate-400 mb-2">วันที่เป้าหมายคือ</div>
            <div className="text-lg sm:text-xl font-bold text-sky-300 text-center leading-snug">{resAdd || '-'}</div>
            {excludeWeekends && addUnit === 'days' && (
              <div className="mt-3 text-[9px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded border border-emerald-900/50">✨ คำนวณแบบข้ามวันหยุดสุดสัปดาห์แล้ว</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const SecretCipher = () => {
  const [text, setText] = useState('');
  const [type, setType] = useState('base64');
  const [action, setAction] = useState('encrypt');
  const [result, setResult] = useState('');

  const RULES = {
    base64: { name: 'Base64 Encoding', icon: '💻', rule: 'เข้ารหัสข้อความพื้นฐานเป็นตัวอักษร A-Z, a-z, 0-9 และสัญลักษณ์ ถอดรหัสได้ด้วยมาตรฐานสากล' },
    caesar: { name: 'Caesar Cipher (Shift +3)', icon: '🏛️', rule: 'เลื่อนตัวอักษรภาษาอังกฤษไปด้านหน้า 3 ตำแหน่ง (A->D) ไม่รองรับภาษาไทยหรือสัญลักษณ์พิเศษ' },
    atbash: { name: 'Atbash Cipher', icon: '🪞', rule: 'สลับตัวอักษรภาษาอังกฤษจากหน้าไปหลัง (A<->Z, B<->Y) การถอดรหัสใช้หลักการเดียวกัน' },
    reverse: { name: 'Mirror Text (สลับหลังไปหน้า)', icon: '🔄', rule: 'กลับข้อความจากหลังมาหน้า ใช้ได้กับทุกภาษา อ่านยากนิดหน่อยแต่น่าสนุก' }
  };

  useEffect(() => {
    if (!text.trim()) return setResult('');
    try {
      let res = '';
      if (type === 'base64') {
        res = action === 'encrypt' ? btoa(encodeURIComponent(text)) : decodeURIComponent(atob(text));
      } else if (type === 'reverse') {
        res = text.split('').reverse().join('');
      } else if (type === 'caesar') {
        const shift = action === 'encrypt' ? 3 : 23;
        res = text.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
        });
      } else if (type === 'atbash') {
        res = text.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
        });
      }
      setResult(res);
    } catch {
      setResult('⚠️ ข้อความผิดรูปแบบ ไม่สามารถถอดรหัสได้');
    }
  }, [text, type, action]);

  return (
    <div className="flex flex-col gap-5 py-2 w-full max-w-3xl mx-auto text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
          <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] font-bold text-[11px]">
            <button type="button" onClick={() => setAction('encrypt')} className={`flex-1 py-2 rounded-lg transition-colors ${action === 'encrypt' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🔒 เข้ารหัสลับ (Encrypt)</button>
            <button type="button" onClick={() => setAction('decrypt')} className={`flex-1 py-2 rounded-lg transition-colors ${action === 'decrypt' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🔓 ถอดรหัส (Decrypt)</button>
          </div>
          <div>
            <label className="text-slate-400 font-bold mb-1 block">เลือกรูปแบบรหัส (Cipher Type)</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full inp bg-[#050811] font-bold">
              {Object.keys(RULES).map((k) => <option key={k} value={k}>{RULES[k].icon} {RULES[k].name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 font-bold mb-1 block">ข้อความ (Input)</label>
            <textarea rows="5" value={text} onChange={(e) => setText(e.target.value)} placeholder={action === 'encrypt' ? 'พิมพ์ข้อความที่ต้องการซ่อน...' : 'วางรหัสลับที่ก๊อปปี้มา...'} className="w-full inp resize-none custom-scrollbar font-mono"></textarea>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#050811] to-[#1a0f2e] p-5 rounded-2xl border border-purple-500/40 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-purple-300 uppercase tracking-widest">ผลลัพธ์ (Result)</span>
            {result && !result.includes('⚠️') && (
              <button type="button" onClick={() => { navigator.clipboard.writeText(result); alert('คัดลอกรหัสเรียบร้อยแล้ว เอาไปแปะในแชตได้เลย!'); }} className="btn-d py-1 px-3 text-[10px] bg-purple-900/50 border-purple-500/50 text-purple-200 hover:bg-purple-600 hover:text-white transition-colors">
                <i className="fas fa-copy"></i> คัดลอก
              </button>
            )}
          </div>
          <div className="flex-1 w-full bg-[#0B1325] border-2 border-dashed border-[#1E3A5F] rounded-xl p-4 font-mono text-sm sm:text-base text-white break-words overflow-y-auto max-h-48 custom-scrollbar">
            {result || <span className="text-slate-600 opacity-50">รอการประมวลผล...</span>}
          </div>
        </div>
      </div>

      <div className="bg-[#0B1325] border-l-4 border-amber-500 p-4 rounded-r-xl shadow-inner">
        <div className="font-bold text-amber-400 mb-1 flex items-center gap-2"><i className="fas fa-info-circle"></i> กฎและรูปแบบของ {RULES[type].name}</div>
        <div className="text-slate-300 leading-relaxed">{RULES[type].rule}</div>
      </div>
    </div>
  );
};

export const QRCodeGenerator = () => {
  const { currentUser } = useAuth();
  const [text, setText] = useState('');
  const [fgColor, setFgColor] = useState('#38BDF8');
  const [bgColor, setBgColor] = useState('#050811');
  const [hasLogo, setHasLogo] = useState(true);
  const [isDynamic, setIsDynamic] = useState(false);
  const [expireDate, setExpireDate] = useState('');
  const [scanLimit, setScanLimit] = useState('');
  const [qrImg, setQrImg] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async (e) => {
    e.preventDefault();
    if (!text.trim()) return alert('กรุณาระบุ URL หรือข้อความ');
    if (isDynamic && !currentUser) return alert('คุณต้องเข้าสู่ระบบเพื่อสร้าง QR Code แบบมีวันหมดอายุ (Dynamic)');

    let textToEncode = text.trim();
    if (isDynamic) {
      const clean = safeUrl(textToEncode);
      if (!clean || !/^https?:\/\//i.test(clean)) {
        return alert('Dynamic QR Code รองรับเฉพาะ URL ที่ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น');
      }
      textToEncode = clean;
    }

    setLoading(true);
    try {
      if (isDynamic) {
        const qrId = 'qr-' + Date.now() + Math.random().toString(36).slice(2, 6);
        const payload = { id: qrId, target: textToEncode, createdBy: currentUser.id, scans: 0, createdAt: Date.now() };
        if (expireDate) payload.expiresAt = new Date(expireDate).getTime();
        if (scanLimit) payload.scanLimit = parseInt(scanLimit, 10);
        await db.collection('bma_qrcodes').doc(qrId).set(payload);
        textToEncode = window.location.origin + window.location.pathname + '?qr=' + qrId;
      }

      if (!window.QRCode) throw new Error('ยังโหลดไลบรารี QRCode ไม่เสร็จ กรุณาลองอีกครั้ง');
      const qrDiv = document.createElement('div');
      new window.QRCode(qrDiv, {
        text: textToEncode,
        width: 300,
        height: 300,
        colorDark: fgColor,
        colorLight: bgColor,
        correctLevel: window.QRCode.CorrectLevel[hasLogo ? 'H' : 'M']
      });

      setTimeout(() => {
        const canvas = qrDiv.querySelector('canvas');
        if (hasLogo && canvas) {
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const size = 60;
            const center = (canvas.width - size) / 2;
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(center - 5, center - 5, size + 10, size + 10, 10);
            else ctx.fillRect(center - 5, center - 5, size + 10, size + 10);
            ctx.fill();
            ctx.drawImage(img, center, center, size, size);
            setQrImg(canvas.toDataURL());
            setLoading(false);
          };
          img.onerror = () => {
            setQrImg(canvas.toDataURL());
            setLoading(false);
          };
          img.src = '/tbmalogo.png';
        } else if (canvas) {
          setQrImg(canvas.toDataURL());
          setLoading(false);
        } else {
          setLoading(false);
        }
      }, 60);
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mx-auto text-xs">
      <form onSubmit={generate} className="flex-1 bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
        <div className="font-bold text-sky-400 text-sm border-b border-[#1E3A5F] pb-2 mb-2"><i className="fas fa-qrcode"></i> ตั้งค่า QR Code</div>
        <div>
          <label className="text-slate-400 font-bold mb-1 block">URL หรือ ข้อความ</label>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://..." className="w-full inp text-sm" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 font-bold mb-1 block">สี QR Code</label>
            <div className="flex items-center gap-2">
              <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
              <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1 inp font-mono" />
            </div>
          </div>
          <div>
            <label className="text-slate-400 font-bold mb-1 block">สีพื้นหลัง</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
              <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 inp font-mono" />
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#050811] rounded-xl border border-[#1E3A5F]">
          <input type="checkbox" checked={hasLogo} onChange={(e) => setHasLogo(e.target.checked)} className="accent-sky-500 w-4 h-4" />
          <span className="font-bold text-slate-200">ใส่โลโก้สมาคมตรงกลาง</span>
        </label>
        <div className="p-4 bg-gradient-to-br from-[#050811] to-[#0a101f] rounded-xl border border-emerald-900/50 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDynamic} onChange={(e) => setIsDynamic(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
            <span className="font-bold text-emerald-400 text-sm">เปิดใช้ลิงก์แบบกำหนดอายุ (Dynamic)</span>
          </label>
          <p className="text-[10px] text-slate-500 leading-relaxed">สามารถตั้งวันหมดอายุและจำนวนครั้งที่สแกนได้ หากครบกำหนด QR Code นี้จะสแกนเข้าไม่ได้อีกต่อไป</p>
          {isDynamic && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1E3A5F]/50 animate-fade-in">
              <div><label className="text-slate-400 font-bold mb-1 block">วันหมดอายุ (ไม่บังคับ)</label><input type="datetime-local" value={expireDate} onChange={(e) => setExpireDate(e.target.value)} className="w-full inp text-[10px]" /></div>
              <div><label className="text-slate-400 font-bold mb-1 block">จำกัดสแกนกี่ครั้ง (ไม่บังคับ)</label><input type="number" min="1" value={scanLimit} onChange={(e) => setScanLimit(e.target.value)} placeholder="ไม่จำกัด" className="w-full inp text-sm" /></div>
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="w-full btn-w py-3 shadow-lg text-sm mt-2 font-bold">
          {loading ? '⏳ กำลังสร้าง...' : '✨ สร้าง QR Code'}
        </button>
      </form>

      <div className="w-full md:w-72 flex flex-col items-center justify-center p-6 bg-[#050811] rounded-2xl border border-[#1E3A5F] shadow-2xl relative">
        <div className="text-sky-400 font-bold mb-4 text-sm">ผลลัพธ์ (Preview)</div>
        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden p-2">
          {qrImg ? <img src={qrImg} alt="QR Code" className="w-full h-full object-contain" /> : <div className="text-slate-400 text-4xl opacity-20"><i className="fas fa-qrcode"></i></div>}
        </div>
        {qrImg && (
          <button
            type="button"
            onClick={() => {
              const a = document.createElement('a');
              a.href = qrImg;
              a.download = `bma-qrcode-${Date.now()}.png`;
              a.click();
            }}
            className="mt-6 w-full btn-b py-2.5 font-bold shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2"
          >
            <i className="fas fa-download"></i> ดาวน์โหลดภาพ
          </button>
        )}
      </div>
    </div>
  );
};

export function CurrencyConverterTool() {
  const [amount, setAmount] = useState('1000');
  const [fromCurr, setFromCurr] = useState('JPY');
  const [toCurr, setToCurr] = useState('THB');
  const [fxData, setFxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [historyPts, setHistoryPts] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadRates = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      setFxData(await fetchFrankfurterRates('THB'));
    } catch {
      setErr('ไม่สามารถโหลดอัตราแลกเปลี่ยนจาก Frankfurter ได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  useEffect(() => {
    if (!fromCurr || !toCurr || fromCurr === toCurr) {
      setHistoryPts([]);
      return;
    }
    let cancelled = false;
    setHistLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);

    fetch(`https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(end)}?base=${fromCurr}&symbols=${toCurr}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const pts = Object.entries(d.rates || {})
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, obj]) => ({ date, val: obj[toCurr] }))
          .filter((p) => typeof p.val === 'number');
        setHistoryPts(pts);
      })
      .catch(() => { if (!cancelled) setHistoryPts([]); })
      .finally(() => { if (!cancelled) setHistLoading(false); });
    return () => { cancelled = true; };
  }, [fromCurr, toCurr]);

  const allCodes = useMemo(() => {
    const popular = Object.keys(CURRENCY_META);
    if (!fxData?.rates) return popular;
    return [...popular, ...Object.keys(fxData.rates).filter((c) => !popular.includes(c)).sort()];
  }, [fxData]);

  const numAmt = parseFloat(String(amount).replace(/,/g, '')) || 0;
  const convertVal = (val, from, to) => {
    if (!fxData?.rates) return 0;
    const rFrom = fxData.rates[from];
    const rTo = fxData.rates[to];
    return !rFrom || !rTo ? 0 : (val / rFrom) * rTo;
  };

  const unitRate = convertVal(1, fromCurr, toCurr);
  const converted = convertVal(numAmt, fromCurr, toCurr);
  const revRate = convertVal(1, toCurr, fromCurr);
  const fmtMoney = (n, code) => {
    const decimals = ['JPY', 'KRW', 'IDR'].includes(code) ? 0 : 2;
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const chartStats = useMemo(() => {
    if (historyPts.length < 2) return null;
    const vals = historyPts.map((p) => p.val);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1e-6;
    const pct = ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100;
    const W = 320;
    const H = 86;
    const pad = 8;
    const points = historyPts
      .map((p, i) => {
        const x = pad + (i / (historyPts.length - 1)) * (W - pad * 2);
        const y = H - pad - ((p.val - min) / span) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { min, max, pct, points, W, H };
  }, [historyPts]);

  const quickBoardCodes = ['THB', 'USD', 'JPY', 'KRW', 'EUR', 'GBP', 'SGD', 'CNY'].filter((c) => c !== fromCurr);

  return (
    <div className="max-w-3xl mx-auto space-y-5 text-xs">
      <div className="card p-5 bg-gradient-to-br from-[#0B1325] to-[#050811] border-[#1E3A5F] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-exchange-alt text-emerald-400"></i>
              <span>แปลงสกุลเงินเรียลไทม์ (Currency Converter)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              อัตราอ้างอิงจากธนาคารกลาง (Frankfurter / ECB &amp; BOT)
              {fxData?.date && <span className="ml-1.5 font-mono text-sky-300">• อัปเดต {fxData.date}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { delete _fxCache.THB; loadRates(); }}
            disabled={loading}
            className="btn-d py-1.5 px-3 text-[11px] flex items-center gap-1.5"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> รีเฟรชเรท
          </button>
        </div>

        {err && <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 font-bold">{err}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold">จากสกุลเงิน</label>
            <select value={fromCurr} onChange={(e) => setFromCurr(e.target.value)} className="w-full inp text-xs font-bold">
              {allCodes.map((c) => (
                <option key={c} value={c}>
                  {(CURRENCY_META[c]?.flag || '🌐')} {c} {CURRENCY_META[c]?.name ? `- ${CURRENCY_META[c].name}` : ''}
                </option>
              ))}
            </select>
            <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full inp text-lg font-mono font-bold text-white" placeholder="กรอกจำนวนเงิน" />
          </div>

          <button
            type="button"
            onClick={() => { setFromCurr(toCurr); setToCurr(fromCurr); }}
            className="h-11 w-11 mx-auto rounded-full bg-[#0F2547] hover:bg-sky-600 border border-[#1E3A5F] text-white flex items-center justify-center transition-all active:scale-90 shadow"
            title="สลับสกุลเงิน"
          >
            <i className="fas fa-exchange-alt"></i>
          </button>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-bold">เป็นสกุลเงิน</label>
            <select value={toCurr} onChange={(e) => setToCurr(e.target.value)} className="w-full inp text-xs font-bold">
              {allCodes.map((c) => (
                <option key={c} value={c}>
                  {(CURRENCY_META[c]?.flag || '🌐')} {c} {CURRENCY_META[c]?.name ? `- ${CURRENCY_META[c].name}` : ''}
                </option>
              ))}
            </select>
            <div className="w-full px-3 py-2 rounded-xl bg-emerald-950/35 border border-emerald-500/40 text-lg font-mono font-bold text-emerald-300 truncate">
              {loading ? '...' : `${fmtMoney(converted, toCurr)} ${toCurr}`}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {[100, 500, 1000, 5000, 10000].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className="px-2.5 py-1 rounded-lg bg-[#050811] hover:bg-[#0F2547] border border-[#1E3A5F] font-mono text-[11px] text-slate-300 transition-colors">
                {v.toLocaleString()}
              </button>
            ))}
          </div>
          {fxData && (
            <div className="text-[11px] font-mono text-slate-400">
              1 {fromCurr} = <strong className="text-white">{unitRate.toFixed(4)}</strong> {toCurr}
              <span className="mx-1.5 opacity-40">|</span>
              1 {toCurr} = <strong className="text-slate-200">{revRate.toFixed(4)}</strong> {fromCurr}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 bg-[#0B1325] border-[#1E3A5F] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-bold text-slate-200 flex items-center gap-2">
            <i className="fas fa-chart-line text-sky-400"></i>
            <span>แนวโน้ม 30 วันล่าสุด ({fromCurr} → {toCurr})</span>
          </div>
          {chartStats && (
            <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] border ${chartStats.pct >= 0 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border-red-500/40 text-red-300'}`}>
              {chartStats.pct >= 0 ? '▲' : '▼'} {Math.abs(chartStats.pct).toFixed(2)}%
            </span>
          )}
        </div>
        {histLoading ? (
          <div className="h-24 flex items-center justify-center text-sky-400 animate-pulse">กำลังโหลดกราฟย้อนหลัง...</div>
        ) : chartStats ? (
          <div className="space-y-2">
            <div className="bg-[#050811] rounded-xl border border-[#1E3A5F] p-2">
              <svg viewBox={`0 0 ${chartStats.W} ${chartStats.H}`} className="w-full h-24 overflow-visible">
                <polyline fill="none" stroke={chartStats.pct >= 0 ? '#34D399' : '#F87171'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chartStats.points} />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>ต่ำสุด 30 วัน: <strong className="text-slate-200">{chartStats.min.toFixed(4)}</strong></span>
              <span>สูงสุด 30 วัน: <strong className="text-slate-200">{chartStats.max.toFixed(4)}</strong></span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-[11px]">เลือกคู่สกุลเงินที่ต่างกันเพื่อดูกราฟแนวโน้ม 30 วัน</div>
        )}
      </div>

      {fxData && (
        <div className="card p-4 bg-[#0B1325] border-[#1E3A5F] space-y-3">
          <div className="font-bold text-slate-200">
            เทียบค่า <span className="font-mono text-amber-300">{numAmt.toLocaleString()} {fromCurr}</span> เป็นสกุลเงินยอดนิยม
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickBoardCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setToCurr(code)}
                className={`p-2.5 rounded-xl border text-left transition-all ${toCurr === code ? 'bg-sky-950/50 border-sky-400' : 'bg-[#050811] border-[#1E3A5F] hover:border-slate-500'}`}
              >
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{CURRENCY_META[code]?.flag || '🌐'} {code}</span>
                  <span className="truncate ml-1 opacity-70">{CURRENCY_META[code]?.name}</span>
                </div>
                <div className="font-mono font-bold text-sm text-white mt-1 truncate">
                  {fmtMoney(convertVal(numAmt, fromCurr, code), code)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityTools({ toolId }) {
  if (toolId === 'splitter') return <LunarSplitter />;
  if (toolId === 'smartdate') return <SmartDateCalc />;
  if (toolId === 'cipher') return <SecretCipher />;
  if (toolId === 'qrcode') return <QRCodeGenerator />;
  if (toolId === 'randomizer') return <Randomizer />;
  if (toolId === 'currency') return <CurrencyConverterTool />;
  return null;
}