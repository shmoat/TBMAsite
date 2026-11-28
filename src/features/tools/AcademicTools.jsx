import React, { useState, useEffect, useRef } from 'react';

export const AdvancedUnitConverter = () => {
  const CATEGORIES = {
    'Length (ความยาว)': { m: 1, cm: 100, mm: 1000, km: 0.001, in: 39.3701, ft: 3.28084, yd: 1.09361, mile: 0.000621371, 'วา (wa)': 0.5, 'ศอก (sok)': 2, 'คืบ (khuep)': 4, 'เส้น (sen)': 0.025, 'โยชน์ (yot)': 0.0000625 },
    'Area (พื้นที่)': { 'm²': 1, 'cm²': 10000, 'km²': 1e-6, hectare: 1e-4, acre: 0.000247105, 'sq ft': 10.7639, 'ตารางวา (sq wa)': 0.25, 'งาน (ngan)': 0.0025, 'ไร่ (rai)': 0.000625 },
    'Mass (น้ำหนัก)': { kg: 1, g: 1000, mg: 1e6, lb: 2.20462, oz: 35.274, ton: 0.001, 'ขีด (khit)': 10, 'บาท (ทอง)': 65.59958, 'สลึง (ทอง)': 262.3983, 'ตำลึง': 16.39989 },
    'Volume (ปริมาตร)': { L: 1, mL: 1000, 'm³': 0.001, 'cm³': 1000, 'gal (US)': 0.264172, 'qt (US)': 1.05669, 'fl oz (US)': 33.814, 'ถัง (thang)': 0.05, 'เกวียน (kwian)': 0.0005, 'ทะนาน (thanan)': 1 },
    'Force (แรง)': { N: 1, kN: 1e-3, kgf: 0.10197, lbf: 0.224809 },
    'Pressure (ความดัน)': { Pa: 1, kPa: 1e-3, MPa: 1e-6, bar: 1e-5, psi: 0.000145038, atm: 0.0000098692 },
    'Energy (พลังงาน)': { J: 1, kJ: 1e-3, cal: 0.239006, kcal: 0.000239006, Wh: 0.000277778, kWh: 2.77778e-7, eV: 6.242e18 },
    'Torque (แรงบิด)': { 'N·m': 1, 'lbf·ft': 0.737562, 'kgf·m': 0.101972, 'ozf·in': 141.6119 },
    'Power (กำลัง)': { W: 1, kW: 1e-3, HP: 0.00134102, 'BTU/hr': 3.41214 },
    'Velocity (ความเร็ว)': { 'm/s': 1, 'km/h': 3.6, mph: 2.23694, knot: 1.94384, 'ft/s': 3.28084 },
    'Data Storage (ข้อมูล)': { Byte: 1, KB: 1e-3, MB: 1e-6, GB: 1e-9, TB: 1e-12 },
    'Angle (มุม)': { Degree: 1, Radian: 0.0174533, Gradian: 1.11111 },
    'Temperature (อุณหภูมิ)': 'special',
    'Custom (พิมพ์หน่วยเอง)': 'compound'
  };

  const BASE_UNITS = {
    kg: { type: 'mass', val: 1 }, g: { type: 'mass', val: 1000 }, lb: { type: 'mass', val: 2.20462 },
    m: { type: 'length', val: 1 }, cm: { type: 'length', val: 100 }, mm: { type: 'length', val: 1000 }, km: { type: 'length', val: 0.001 }, in: { type: 'length', val: 39.3701 }, ft: { type: 'length', val: 3.28084 },
    s: { type: 'time', val: 1 }, min: { type: 'time', val: 1 / 60 }, h: { type: 'time', val: 1 / 3600 },
    L: { type: 'volume', val: 1 }, mL: { type: 'volume', val: 1000 }
  };

  const [category, setCategory] = useState('Length (ความยาว)');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('cm');
  const [customFrom, setCustomFrom] = useState('kg * m / s^2');
  const [customTo, setCustomTo] = useState('g * cm / s^2');
  const [inputValue, setInputValue] = useState('');
  const [useSciNotation, setUseSciNotation] = useState(false);
  const [precision, setPrecision] = useState(6);
  const [copied, setCopied] = useState(false);
  const [visualContext, setVisualContext] = useState(null);

  useEffect(() => {
    if (category === 'Temperature (อุณหภูมิ)') {
      setFromUnit('C');
      setToUnit('F');
    } else if (category !== 'Custom (พิมพ์หน่วยเอง)') {
      const units = Object.keys(CATEGORIES[category]);
      setFromUnit(units[0]);
      setToUnit(units[1] || units[0]);
    }
    setInputValue('');
    setVisualContext(null);
  }, [category]);

  const parseCompoundUnit = (unitStr) => {
    if (!unitStr) return null;
    try {
      let str = unitStr.replace(/\s+/g, '');
      Object.keys(BASE_UNITS)
        .sort((a, b) => b.length - a.length)
        .forEach((u) => {
          const regex = new RegExp(`(?<![a-zA-Z])${u}(?![a-zA-Z])`, 'g');
          str = str.replace(regex, BASE_UNITS[u].val);
        });
      str = str.replace(/\^/g, '**');
      if (/[a-zA-Z]/.test(str)) return null;
      return new Function('return ' + str)();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0 || category === 'Custom (พิมพ์หน่วยเอง)') {
      setVisualContext(null);
      return;
    }

    let ctx = null;
    if (category === 'Length (ความยาว)' && CATEGORIES[category][fromUnit]) {
      const meters = val / CATEGORIES[category][fromUnit];
      if (meters > 1000) ctx = { txt: `เทียบเท่าความยาวสนามฟุตบอล ${(meters / 105).toFixed(1)} สนาม ⚽`, bg: 'bg-emerald-950/40', textCol: 'text-emerald-300' };
      else if (meters > 10) ctx = { txt: `ความยาวพอๆ กับตึก ${(meters / 3).toFixed(1)} ชั้น 🏢`, bg: 'bg-sky-950/40', textCol: 'text-sky-300' };
      else if (meters > 0.1) ctx = { txt: `ยาวประมาณไม้บรรทัด ${(meters / 0.3).toFixed(1)} อันต่อกัน 📏`, bg: 'bg-amber-950/40', textCol: 'text-amber-300' };
    } else if (category === 'Mass (น้ำหนัก)' && CATEGORIES[category][fromUnit]) {
      const kg = val / CATEGORIES[category][fromUnit];
      if (kg > 1000) ctx = { txt: `น้ำหนักเทียบเท่าช้างเอเชีย ${(kg / 3000).toFixed(2)} ตัว 🐘`, bg: 'bg-slate-800', textCol: 'text-slate-300' };
      else if (kg > 50) ctx = { txt: `น้ำหนักพอๆ กับผู้ใหญ่ ${(kg / 65).toFixed(1)} คน 🧑`, bg: 'bg-sky-950/40', textCol: 'text-sky-300' };
      else if (kg > 1) ctx = { txt: `หนักเท่าแตงโม ${(kg / 3).toFixed(1)} ลูก 🍉`, bg: 'bg-red-950/40', textCol: 'text-red-300' };
    } else if (category === 'Volume (ปริมาตร)' && CATEGORIES[category][fromUnit]) {
      const liters = val / CATEGORIES[category][fromUnit];
      if (liters > 1000) ctx = { txt: `ใส่น้ำเต็มสระว่ายน้ำโอลิมปิกได้ ${(liters / 2500000).toExponential(2)} สระ 🏊‍♂️`, bg: 'bg-blue-950/40', textCol: 'text-blue-300' };
      else if (liters > 10) ctx = { txt: `เทียบเท่าน้ำขวดใหญ่ (1.5L) จำนวน ${(liters / 1.5).toFixed(0)} ขวด 💧`, bg: 'bg-sky-950/40', textCol: 'text-sky-300' };
    } else if (category === 'Temperature (อุณหภูมิ)') {
      let celsius = 0;
      if (fromUnit === 'C') celsius = val;
      else if (fromUnit === 'F') celsius = ((val - 32) * 5) / 9;
      else if (fromUnit === 'K') celsius = val - 273.15;

      if (celsius > 100) ctx = { txt: 'อุณหภูมินี้ น้ำจะเดือดจนระเหยเป็นไอ ♨️', bg: 'bg-red-950/40', textCol: 'text-red-400' };
      else if (celsius > 35) ctx = { txt: 'อุณหภูมิประมาณแดดประเทศไทยตอนเที่ยง 🥵', bg: 'bg-amber-950/40', textCol: 'text-amber-400' };
      else if (celsius > 20) ctx = { txt: 'อากาศห้องแอร์กำลังเย็นสบาย ❄️', bg: 'bg-sky-950/40', textCol: 'text-sky-300' };
      else if (celsius < 0) ctx = { txt: 'จุดเยือกแข็ง น้ำกลายเป็นน้ำแข็งแล้ว 🧊', bg: 'bg-blue-950/40', textCol: 'text-blue-200' };
    }

    setVisualContext(ctx);
  }, [inputValue, fromUnit, category]);

  const calculateResult = () => {
    if (inputValue === '') return '';
    const val = parseFloat(inputValue);
    if (isNaN(val)) return 'Invalid Input';
    let resultNum = 0;

    if (category === 'Temperature (อุณหภูมิ)') {
      if (fromUnit === toUnit) resultNum = val;
      else if (fromUnit === 'C' && toUnit === 'F') resultNum = (val * 9) / 5 + 32;
      else if (fromUnit === 'C' && toUnit === 'K') resultNum = val + 273.15;
      else if (fromUnit === 'F' && toUnit === 'C') resultNum = ((val - 32) * 5) / 9;
      else if (fromUnit === 'F' && toUnit === 'K') resultNum = ((val - 32) * 5) / 9 + 273.15;
      else if (fromUnit === 'K' && toUnit === 'C') resultNum = val - 273.15;
      else if (fromUnit === 'K' && toUnit === 'F') resultNum = ((val - 273.15) * 9) / 5 + 32;
    } else if (category === 'Custom (พิมพ์หน่วยเอง)') {
      const factorFrom = parseCompoundUnit(customFrom);
      const factorTo = parseCompoundUnit(customTo);
      if (!factorFrom || !factorTo) return 'Unit Error';
      resultNum = (val / factorFrom) * factorTo;
    } else {
      const fromRate = CATEGORIES[category]?.[fromUnit];
      const toRate = CATEGORIES[category]?.[toUnit];
      if (!fromRate || !toRate) return '';
      resultNum = (val / fromRate) * toRate;
    }

    if (useSciNotation) return resultNum.toExponential(precision > 0 ? precision - 1 : 2);
    const absVal = Math.abs(resultNum);
    if (absVal > 0 && (absVal < 0.0001 || absVal > 1e7)) return resultNum.toExponential(precision > 0 ? precision - 1 : 2);
    if (Number.isInteger(resultNum)) return resultNum.toString();
    return parseFloat(resultNum.toPrecision(precision)).toString();
  };

  const handleSwap = () => {
    if (category === 'Custom (พิมพ์หน่วยเอง)') {
      const temp = customFrom;
      setCustomFrom(customTo);
      setCustomTo(temp);
    } else {
      const temp = fromUnit;
      setFromUnit(toUnit);
      setToUnit(temp);
    }
    const res = calculateResult();
    if (res && res !== 'Invalid Input' && res !== 'Unit Error') {
      setInputValue(useSciNotation ? parseFloat(res).toExponential(precision - 1) : parseFloat(res).toString());
    }
  };

  const handleCopy = () => {
    const res = calculateResult();
    if (res && res !== 'Invalid Input' && res !== 'Unit Error') {
      navigator.clipboard.writeText(res);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tempUnits = ['C', 'F', 'K'];
  const unitOptions = category === 'Temperature (อุณหภูมิ)'
    ? tempUnits
    : (typeof CATEGORIES[category] === 'object' ? Object.keys(CATEGORIES[category]) : []);

  return (
    <div className="flex flex-col gap-5 py-4 w-full max-w-lg mx-auto bg-[#0a101f] p-4 sm:p-6 rounded-2xl border border-[#1E3A5F] shadow-2xl relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

      <div className="flex justify-between items-center z-10 flex-wrap gap-2">
        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">ประเภทหน่วยวัด</label>
        <div className="flex items-center gap-2">
          <select value={precision} onChange={(e) => setPrecision(parseInt(e.target.value, 10))} className="bg-[#050811] text-sky-300 text-[10px] px-2 py-1.5 rounded-lg border border-[#1E3A5F] outline-none cursor-pointer font-bold">
            <option value="4">4 ตำแหน่ง</option>
            <option value="6">6 ตำแหน่ง</option>
            <option value="8">8 ตำแหน่ง</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer text-[10px] bg-[#050811] px-2.5 py-1.5 rounded-lg border border-[#1E3A5F]">
            <input type="checkbox" checked={useSciNotation} onChange={(e) => setUseSciNotation(e.target.checked)} className="rounded bg-slate-800 accent-sky-500" />
            <span className="text-sky-300 font-bold">1.2e-5</span>
          </label>
        </div>
      </div>

      <select value={category} onChange={(e) => setCategory(e.target.value)} className="inp py-2.5 text-sm text-sky-300 font-bold z-10 bg-[#0B1325] shadow-inner cursor-pointer">
        {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="flex flex-col gap-4 z-10 mt-2">
        <div className="flex flex-col bg-[#050811] rounded-xl border border-[#1E3A5F] p-3 focus-within:border-sky-500 transition-colors">
          <span className="text-[10px] text-slate-500 font-bold mb-1">จาก (From)</span>
          <div className="flex items-center gap-2">
            <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full bg-transparent text-2xl font-mono text-white outline-none" placeholder="0" />
            <div className="w-[1px] h-8 bg-[#1E3A5F] mx-1 shrink-0"></div>
            {category === 'Custom (พิมพ์หน่วยเอง)' ? (
              <input type="text" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-32 bg-[#0B1325] border border-[#1E3A5F] rounded p-1 text-xs text-sky-200 font-mono text-center outline-none focus:border-sky-500 shrink-0" placeholder="kg*m/s^2" />
            ) : (
              <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="bg-transparent text-sm font-bold text-sky-200 outline-none cursor-pointer w-28 sm:w-32 text-right shrink-0 truncate">
                {unitOptions.map((u) => <option key={u} value={u} className="bg-[#0B1325]">{u}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-center -my-6 z-20 relative">
          <button type="button" onClick={handleSwap} className="w-10 h-10 rounded-full bg-[#1E3A5F] border-4 border-[#0a101f] text-white flex items-center justify-center hover:bg-sky-500 hover:scale-110 transition-all shadow-lg group">
            <span className="group-hover:rotate-180 transition-transform duration-300 font-bold">⇅</span>
          </button>
        </div>

        <div className="flex flex-col bg-[#11241a] rounded-xl border border-emerald-900/50 p-3 relative">
          <span className="text-[10px] text-emerald-600 font-bold mb-1">ผลลัพธ์ (To)</span>
          <div className="flex items-center gap-2">
            <div className="w-full bg-transparent text-xl sm:text-2xl font-mono text-emerald-400 min-h-[32px] overflow-hidden text-ellipsis whitespace-nowrap pt-1">
              {calculateResult() || '0'}
            </div>
            <div className="w-[1px] h-8 bg-emerald-900 mx-1 shrink-0"></div>
            {category === 'Custom (พิมพ์หน่วยเอง)' ? (
              <input type="text" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-32 bg-[#0B1325] border border-emerald-900/50 rounded p-1 text-xs text-emerald-200 font-mono text-center outline-none focus:border-emerald-500 shrink-0" placeholder="g*cm/s^2" />
            ) : (
              <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="bg-transparent text-sm font-bold text-emerald-200 outline-none cursor-pointer w-28 sm:w-32 text-right shrink-0 truncate">
                {unitOptions.map((u) => <option key={u} value={u} className="bg-[#0B1325]">{u}</option>)}
              </select>
            )}
          </div>

          <button type="button" onClick={handleCopy} className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded border transition-colors ${copied ? 'bg-emerald-500 text-white border-emerald-400 font-bold' : 'bg-[#0B1325] text-slate-400 border-[#1E3A5F] hover:text-white'}`}>
            {copied ? '✓ คัดลอกแล้ว' : '📋 Copy'}
          </button>
        </div>
      </div>

      {visualContext && (
        <div className={`mt-2 p-3 rounded-lg ${visualContext.bg} border border-[#1E3A5F]/50 text-center animate-fade-in shadow-inner z-10`}>
          <div className={`text-xs font-bold ${visualContext.textCol}`}>{visualContext.txt}</div>
        </div>
      )}

      {category === 'Temperature (อุณหภูมิ)' ? (
        <div className="text-[10px] text-slate-500 text-center font-mono bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]/50 shadow-inner z-10">
          สูตร:{' '}
          {(fromUnit === 'C' && toUnit === 'F') ? '°F = (°C × 9/5) + 32' :
           (fromUnit === 'F' && toUnit === 'C') ? '°C = (°F - 32) × 5/9' :
           (fromUnit === 'C' && toUnit === 'K') ? 'K = °C + 273.15' :
           (fromUnit === 'K' && toUnit === 'C') ? '°C = K - 273.15' :
           (fromUnit === 'F' && toUnit === 'K') ? 'K = (°F - 32) × 5/9 + 273.15' :
           (fromUnit === 'K' && toUnit === 'F') ? '°F = (K - 273.15) × 9/5 + 32' :
           'K = °C + 273.15 | °F = (°C × 9/5) + 32'}
        </div>
      ) : category === 'Custom (พิมพ์หน่วยเอง)' ? (
        <div className="text-[10px] text-slate-400 text-center bg-amber-950/30 py-2 px-3 rounded-lg border border-amber-900/50 shadow-inner leading-relaxed z-10">
          💡 พิมพ์หน่วยฐานที่ต้องการผสมลงในกล่อง<br />(รองรับ: kg, g, lb, m, cm, mm, km, in, ft, s, min, h, L, mL)<br />ตัวอย่าง: <span className="text-amber-300 font-mono">kg*m/s^2</span>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 text-center font-mono bg-[#050811] py-1.5 rounded-lg border border-sky-900/50 shadow-inner z-10">
          <i className="fas fa-info-circle text-sky-400 mr-1"></i>
          สูตรแปลงหน่วย: 1 {fromUnit} = {(() => {
            const fromR = CATEGORIES[category]?.[fromUnit];
            const toR = CATEGORIES[category]?.[toUnit];
            if (!fromR || !toR) return '-';
            const rate = toR / fromR;
            return (rate >= 10000 || rate <= 0.0001) ? rate.toExponential(4) : rate.toLocaleString(undefined, { maximumFractionDigits: 6 });
          })()} {toUnit}
        </div>
      )}
    </div>
  );
};

export const GradeCrisisManager = () => {
  const [midtermFull, setMidtermFull] = useState(30);
  const [midtermScore, setMidtermScore] = useState(15);
  const [projectFull, setProjectFull] = useState(30);
  const [projectScore, setProjectScore] = useState(25);
  const [finalFull, setFinalFull] = useState(40);
  const [targetGrade, setTargetGrade] = useState(80);

  const currentScore = midtermScore + projectScore;
  const totalFullSoFar = midtermFull + projectFull;
  const needScore = targetGrade - currentScore;

  let status = 'safe';
  let msg = 'สบายๆ ชิลๆ';
  let colorClass = 'text-emerald-400';
  let bgClass = 'bg-emerald-950/30 border-emerald-500/50';

  if (needScore > finalFull) {
    status = 'impossible';
    msg = 'ปาฏิหาริย์เท่านั้นที่ช่วยคุณได้ (ต้องการคะแนนมากกว่าคะแนนเต็ม)';
    colorClass = 'text-red-500 font-bold animate-pulse';
    bgClass = 'bg-red-950/50 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
  } else if (needScore > finalFull * 0.85) {
    status = 'danger';
    msg = 'วิกฤตหนัก! ต้องอ่านหนังสือแบบไม่ได้นอน';
    colorClass = 'text-red-400';
    bgClass = 'bg-red-950/30 border-red-500/50';
  } else if (needScore > finalFull * 0.6) {
    status = 'warning';
    msg = 'ต้องตั้งใจอ่านหนังสือแล้วนะ ประมาทไม่ได้';
    colorClass = 'text-amber-400';
    bgClass = 'bg-amber-950/30 border-amber-500/50';
  } else if (needScore <= 0) {
    status = 'passed';
    msg = 'ถึงไม่ไปสอบก็ผ่านเป้าหมายแล้ว นอนตีพุงอยู่บ้านได้เลย!';
    colorClass = 'text-sky-400 font-bold';
    bgClass = 'bg-sky-950/30 border-sky-500/50';
  }

  const gaugeWidth = Math.max(0, Math.min(100, (needScore / (finalFull || 1)) * 100));

  return (
    <div className="flex flex-col gap-6 py-4 w-full max-w-2xl mx-auto text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
          <div className="text-sky-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 mb-2"><i className="fas fa-edit"></i> ใส่คะแนนที่มีปัจจุบัน</div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-slate-400 font-bold">มิดเทอม (Mid)</span>
            <input type="number" value={midtermScore} onChange={(e) => setMidtermScore(parseFloat(e.target.value) || 0)} className="w-16 inp font-mono text-center" />
            <span className="text-slate-500">/</span>
            <input type="number" value={midtermFull} onChange={(e) => setMidtermFull(parseFloat(e.target.value) || 0)} className="w-16 inp font-mono text-center" />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-slate-400 font-bold">เก็บ/โปรเจกต์</span>
            <input type="number" value={projectScore} onChange={(e) => setProjectScore(parseFloat(e.target.value) || 0)} className="w-16 inp font-mono text-center" />
            <span className="text-slate-500">/</span>
            <input type="number" value={projectFull} onChange={(e) => setProjectFull(parseFloat(e.target.value) || 0)} className="w-16 inp font-mono text-center" />
          </div>
          <div className="pt-2 border-t border-[#1E3A5F] flex justify-between items-center bg-[#050811] p-3 rounded-xl mt-2">
            <span className="text-slate-300 font-bold">คะแนนเก็บรวมตอนนี้</span>
            <span className="text-xl font-mono font-bold text-white">{currentScore} <span className="text-[10px] text-slate-500">/ {totalFullSoFar}</span></span>
          </div>
        </div>

        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-amber-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 mb-4"><i className="fas fa-bullseye"></i> กำหนดเป้าหมาย</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-400 font-bold">เป้าหมายเกรดที่อยากได้:</span>
              <select value={targetGrade} onChange={(e) => setTargetGrade(parseInt(e.target.value, 10))} className="flex-1 inp bg-[#050811] font-bold text-amber-300 text-center">
                <option value="80">A (80 คะแนน)</option>
                <option value="75">B+ (75 คะแนน)</option>
                <option value="70">B (70 คะแนน)</option>
                <option value="65">C+ (65 คะแนน)</option>
                <option value="60">C (60 คะแนน)</option>
                <option value="55">D+ (55 คะแนน)</option>
                <option value="50">D (50 คะแนน - แค่ผ่าน)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold">คะแนนเต็มไฟนอล (Final):</span>
              <input type="number" value={finalFull} onChange={(e) => setFinalFull(parseFloat(e.target.value) || 0)} className="w-20 inp font-mono text-center" />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-center mt-4">⚠️ ตรวจสอบให้แน่ใจว่าผลรวมคะแนนเต็ม 3 ช่อง = 100 พอดี</div>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${bgClass} shadow-2xl relative overflow-hidden transition-colors duration-500 text-center flex flex-col items-center justify-center min-h-[200px]`}>
        <div className="text-slate-300 font-bold mb-2">เพื่อให้ได้เกรดเป้าหมาย คุณต้องทำคะแนนสอบไฟนอลให้ได้:</div>
        <div className={`text-5xl md:text-6xl font-mono font-bold my-4 ${colorClass}`}>
          {needScore > 0 ? needScore : 0} <span className="text-xl sm:text-2xl text-slate-400 font-sans">/ {finalFull}</span>
        </div>
        <div className={`text-sm md:text-base font-bold mb-6 ${colorClass}`}>"{msg}"</div>
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
            <span className="text-emerald-400">ชิลๆ</span>
            <span className="text-amber-400">เริ่มเครียด</span>
            <span className="text-red-400">วิกฤต</span>
          </div>
          <div className="h-3 w-full bg-[#050811] rounded-full overflow-hidden border border-slate-700/50">
            <div className={`h-full transition-all duration-700 ease-out ${status === 'impossible' ? 'bg-red-500' : status === 'danger' ? 'bg-red-400' : status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${gaugeWidth}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinancialReality = () => {
  const [mode, setMode] = useState('loan');
  const [principal, setPrincipal] = useState(3000000);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(30);

  const r = (rate / 100) / 12;
  const n = years * 12;
  const monthlyPay = r > 0 && n > 0 ? (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : (n > 0 ? principal / n : 0);
  const totalPaid = monthlyPay * n;
  const totalInterest = totalPaid - principal;
  const interestPct = totalPaid > 0 ? (totalInterest / totalPaid) * 100 : 0;

  const investTotal = principal * Math.pow(1 + rate / 100, years);
  const investProfit = investTotal - principal;
  const profitPct = investTotal > 0 ? (investProfit / investTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 py-4 w-full max-w-3xl mx-auto text-xs">
      <div className="flex bg-[#0B1325] p-1.5 rounded-xl border border-[#1E3A5F] overflow-x-auto no-scrollbar font-bold">
        <button type="button" onClick={() => setMode('loan')} className={`px-4 py-2 rounded-lg whitespace-nowrap flex-1 transition-all ${mode === 'loan' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="fas fa-home mr-1"></i> ผ่อนบ้าน (ลดต้นลดดอก)</button>
        <button type="button" onClick={() => setMode('invest')} className={`px-4 py-2 rounded-lg whitespace-nowrap flex-1 transition-all ${mode === 'invest' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="fas fa-chart-line mr-1"></i> เงินลงทุน (ดอกเบี้ยทบต้น)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
          <div className="text-sky-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 mb-2"><i className="fas fa-sliders-h"></i> กรอกข้อมูลตัวเลข</div>
          <div>
            <label className="text-slate-400 font-bold mb-1 block">{mode === 'loan' ? 'ยอดกู้ (เงินต้น) / บาท' : 'เงินต้นสำหรับลงทุน (บาท)'}</label>
            <input type="number" value={principal} onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)} className="w-full inp font-mono text-lg py-2" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1"><label className="text-slate-400 font-bold mb-1 block">ดอกเบี้ยต่อปี (%)</label><input type="number" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-full inp font-mono text-center py-2" /></div>
            <div className="flex-1"><label className="text-slate-400 font-bold mb-1 block">ระยะเวลา (ปี)</label><input type="number" min="1" value={years} onChange={(e) => setYears(parseInt(e.target.value, 10) || 0)} className="w-full inp font-mono text-center py-2" /></div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border shadow-2xl flex flex-col justify-center min-h-[220px] ${mode === 'loan' ? 'bg-gradient-to-br from-[#1a0b0b] to-[#050811] border-red-900/50' : 'bg-gradient-to-br from-[#0b1a11] to-[#050811] border-emerald-900/50'}`}>
          {mode === 'loan' ? (
            <>
              <div className="text-red-400 font-bold text-sm uppercase tracking-widest text-center mb-4">ความจริงของการผ่อนบ้าน</div>
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-2 mb-2"><span className="text-slate-400">เงินต้นทั้งหมด:</span><span className="font-mono text-white text-lg">{principal.toLocaleString()} ฿</span></div>
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-2 mb-2"><span className="text-slate-400">ดอกเบี้ยที่แบงก์ได้:</span><span className="font-mono text-red-400 text-lg font-bold">{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })} ฿</span></div>
              <div className="flex justify-between items-end pb-2 mb-4 bg-red-950/30 p-2 rounded"><span className="text-white font-bold">รวมที่ต้องจ่ายจริง:</span><span className="font-mono text-white text-2xl font-bold">{totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} ฿</span></div>
              <div className="text-center font-bold text-amber-300 text-[11px] bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]">ผ่อนเดือนละ: {monthlyPay.toLocaleString(undefined, { maximumFractionDigits: 0 })} ฿ ตลอด {years} ปี</div>
            </>
          ) : (
            <>
              <div className="text-emerald-400 font-bold text-sm uppercase tracking-widest text-center mb-4">พลังของดอกเบี้ยทบต้น</div>
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-2 mb-2"><span className="text-slate-400">เงินต้นทั้งหมด:</span><span className="font-mono text-white text-lg">{principal.toLocaleString()} ฿</span></div>
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-2 mb-2"><span className="text-slate-400">ผลกำไรที่งอกเงย:</span><span className="font-mono text-emerald-400 text-lg font-bold">+{investProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} ฿</span></div>
              <div className="flex justify-between items-end pb-2 mb-4 bg-emerald-950/30 p-2 rounded"><span className="text-white font-bold">รวมเงินสุทธิในปีที่ {years}:</span><span className="font-mono text-white text-2xl font-bold">{investTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ฿</span></div>
              <div className="text-center font-bold text-emerald-300 text-[11px] bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]">กำไรโตขึ้นจากเงินต้นถึง {principal > 0 ? ((investProfit / principal) * 100).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}%</div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#050811] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg mt-2">
        <div className="text-center text-slate-400 font-bold mb-4 text-[10px]">กราฟแสดงสัดส่วน {mode === 'loan' ? '(เงินต้น vs ดอกเบี้ย)' : '(เงินต้น vs กำไร)'}</div>
        <div className="w-full h-8 flex rounded-xl overflow-hidden shadow-inner font-mono text-[10px] font-bold text-[#050811] relative">
          {mode === 'loan' ? (
            <>
              <div className="bg-sky-400 h-full flex items-center justify-center transition-all duration-1000 ease-out" style={{ width: `${100 - interestPct}%` }}>{(100 - interestPct) > 10 ? 'เงินต้น ' + (100 - interestPct).toFixed(1) + '%' : ''}</div>
              <div className="bg-red-400 h-full flex items-center justify-center transition-all duration-1000 ease-out" style={{ width: `${interestPct}%` }}>{interestPct > 10 ? 'ดอกเบี้ยแบงก์ ' + interestPct.toFixed(1) + '%' : ''}</div>
            </>
          ) : (
            <>
              <div className="bg-slate-400 h-full flex items-center justify-center transition-all duration-1000 ease-out" style={{ width: `${100 - profitPct}%` }}>{(100 - profitPct) > 10 ? 'เงินต้น ' + (100 - profitPct).toFixed(1) + '%' : ''}</div>
              <div className="bg-emerald-400 h-full flex items-center justify-center transition-all duration-1000 ease-out" style={{ width: `${profitPct}%` }}>{profitPct > 10 ? 'กำไร ' + profitPct.toFixed(1) + '%' : ''}</div>
            </>
          )}
        </div>
        {mode === 'loan' && interestPct > 40 && (
          <div className="text-center mt-3 text-[10px] text-red-300 font-bold">⚠️ จ่ายดอกเบี้ยเยอะมาก! ควรวางแผนรีไฟแนนซ์ (Refinance) ทุก 3 ปีเพื่อลดดอกเบี้ยครับ</div>
        )}
      </div>
    </div>
  );
};

export const GachaSimulator = () => {
  const [rate, setRate] = useState(1.0);
  const [pulls, setPulls] = useState(10);
  const [balls, setBalls] = useState([]);

  const resultChance = rate <= 0 || pulls <= 0 ? 0 : (1 - Math.pow(1 - rate / 100, pulls)) * 100;

  const triggerAnim = () => {
    setBalls([]);
    setTimeout(() => {
      const newBalls = Array.from({ length: Math.min(pulls, 50) }).map((_, i) => ({
        id: i,
        isWin: Math.random() * 100 < rate,
        delay: Math.random() * 1.5,
        left: Math.random() * 80 + 10
      }));
      setBalls(newBalls);
    }, 100);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 py-4 w-full max-w-4xl mx-auto text-xs items-center">
      <div className="w-full md:w-1/2 bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
        <div className="text-purple-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 mb-2"><i className="fas fa-dice"></i> Gacha Rate Reality Check</div>
        <div>
          <label className="text-slate-400 font-bold mb-1 block">เรตออกหน้าตู้ (Drop Rate %)</label>
          <div className="flex items-center gap-2"><input type="number" step="0.01" min="0" max="100" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-full inp font-mono text-lg" /><span className="text-xl">%</span></div>
        </div>
        <div>
          <label className="text-slate-400 font-bold mb-1 block">จำนวนครั้งที่กดสุ่ม (Pulls/Rolls)</label>
          <div className="flex items-center gap-2"><input type="number" min="1" max="1000" value={pulls} onChange={(e) => setPulls(parseInt(e.target.value, 10) || 0)} className="w-full inp font-mono text-lg" /><span className="text-xl whitespace-nowrap">ครั้ง</span></div>
        </div>
        <button type="button" onClick={triggerAnim} className="w-full btn-b py-3 font-bold bg-purple-900/40 border-purple-500/50 hover:bg-purple-600 hover:text-white transition-colors text-sm shadow">
          🎰 กดสุ่มตู้กาชาจำลอง
        </button>
        <div className="text-[10px] text-slate-500 bg-[#050811] p-3 rounded-lg border border-[#1E3A5F] mt-4 leading-relaxed">
          <span className="font-bold text-sky-400">💡 ความจริงของความน่าจะเป็น (Binomial Distribution):</span><br />
          ต่อให้เรตออกคือ 1% การสุ่ม 100 ครั้ง โอกาสที่จะได้ก็ไม่ใช่ 100% แต่เป็นแค่ 63.4% เท่านั้น เพราะแต่ละครั้งของการสุ่มคือเหตุการณ์อิสระ (Independent Events)
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#12071a] to-[#050811] rounded-2xl border border-purple-900/50 shadow-2xl relative min-h-[350px]">
        <div className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-4 z-10 text-center">โอกาสที่คุณจะได้ของชิ้นนี้<br />อย่างน้อย 1 ชิ้น คือ...</div>
        <div className="relative z-10 text-5xl sm:text-6xl font-mono font-bold my-2 text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] bg-[#050811]/50 px-4 py-2 rounded-2xl backdrop-blur-sm border border-purple-900/30">
          {resultChance.toFixed(2)}<span className="text-3xl text-slate-400">%</span>
        </div>
        <div className={`mt-6 text-sm font-bold z-10 px-4 py-1.5 rounded-full border ${resultChance > 90 ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' : resultChance > 50 ? 'bg-amber-950/50 text-amber-400 border-amber-900' : 'bg-red-950/50 text-red-400 border-red-900'}`}>
          {resultChance > 90 ? 'ออกแน่นอน (เกือบการันตี) 🎉' : resultChance > 50 ? 'มีโอกาสได้สูง ลุยเลย! 🤔' : 'เตรียมตัวเกลือได้เลย 🧂'}
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0 opacity-50">
          {balls.map((b) => (
            <div
              key={b.id}
              className="absolute top-[-30px] rounded-full shadow-[0_0_15px_currentColor]"
              style={{
                left: `${b.left}%`,
                width: b.isWin ? '24px' : '12px',
                height: b.isWin ? '24px' : '12px',
                backgroundColor: b.isWin ? '#eab308' : '#64748b',
                color: b.isWin ? '#eab308' : '#64748b',
                animation: `fallDown 2s ease-in forwards ${b.delay}s`,
                zIndex: b.isWin ? 20 : 10
              }}
            />
          ))}
        </div>
        <style>{`@keyframes fallDown { 0% { transform: translateY(-30px) rotate(0deg); opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }`}</style>
      </div>
    </div>
  );
};

export const InteractiveProjectile = () => {
  const [v0, setV0] = useState(50);
  const [angle, setAngle] = useState(45);
  const [isFlying, setIsFlying] = useState(false);

  const g = 9.81;
  const rad = angle * (Math.PI / 180);
  const tTotal = (2 * v0 * Math.sin(rad)) / g;
  const sMax = (v0 * v0 * Math.sin(2 * rad)) / g;
  const hMax = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);

  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const drawTrajectory = () => {
    if (v0 <= 0 || angle <= 0 || angle >= 90) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#1E3A5F';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h - 5);
    ctx.lineTo(w, h - 5);
    ctx.stroke();

    const scale = Math.min((w - 20) / Math.max(10, sMax), (h - 20) / Math.max(10, hMax));
    let t = 0;
    setIsFlying(true);

    const animate = () => {
      if (t > tTotal) { setIsFlying(false); return; }
      const x = v0 * Math.cos(rad) * t * scale + 10;
      const y = (h - 5) - ((v0 * Math.sin(rad) * t - 0.5 * g * t * t) * scale);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      t += tTotal / 100;
      animRef.current = requestAnimationFrame(animate);
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animate();
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col gap-5 py-4 w-full max-w-3xl mx-auto text-xs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
          <div className="text-sky-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 mb-2"><i className="fas fa-rocket"></i> พารามิเตอร์เริ่มต้น</div>
          <div><label className="text-slate-400 font-bold mb-1 block">ความเร็วต้น (v₀) - m/s</label><input type="number" min="1" max="500" value={v0} onChange={(e) => setV0(parseFloat(e.target.value) || 0)} className="w-full inp font-mono" /></div>
          <div>
            <label className="text-slate-400 font-bold mb-1 block">มุมยิง (θ) - องศา</label>
            <input type="range" min="1" max="89" value={angle} onChange={(e) => setAngle(parseInt(e.target.value, 10))} className="w-full accent-sky-500 mt-2" />
            <div className="text-center font-bold text-sky-300 mt-1">{angle}°</div>
          </div>
          <button type="button" onClick={drawTrajectory} disabled={isFlying} className="w-full btn-b py-2.5 font-bold shadow-lg mt-2 border-sky-500/50 hover:bg-sky-600 disabled:opacity-50">
            {isFlying ? '🚀 กำลังลอย...' : '🚀 ยิงจรวดจำลอง'}
          </button>
        </div>

        <div className="col-span-2 bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F] shadow-inner relative flex flex-col justify-between">
          <canvas ref={canvasRef} width="500" height="220" className="w-full h-48 bg-[#0a101f] border border-slate-700 rounded-xl shadow-inner mb-4"></canvas>
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-[#0B1325] p-2 rounded-lg border border-[#1E3A5F]"><div className="text-[9px] text-slate-400 font-sans font-bold">ระยะไกลสุด (Sx)</div><div className="text-base sm:text-lg text-emerald-400 font-bold mt-0.5">{sMax.toFixed(2)} <span className="text-[10px] font-sans">m</span></div></div>
            <div className="bg-[#0B1325] p-2 rounded-lg border border-[#1E3A5F]"><div className="text-[9px] text-slate-400 font-sans font-bold">จุดสูงสุด (Sy)</div><div className="text-base sm:text-lg text-sky-400 font-bold mt-0.5">{hMax.toFixed(2)} <span className="text-[10px] font-sans">m</span></div></div>
            <div className="bg-[#0B1325] p-2 rounded-lg border border-[#1E3A5F]"><div className="text-[9px] text-slate-400 font-sans font-bold">เวลาตกพื้น (t)</div><div className="text-base sm:text-lg text-amber-400 font-bold mt-0.5">{tTotal.toFixed(2)} <span className="text-[10px] font-sans">s</span></div></div>
          </div>
          <div className="absolute top-6 left-6 text-[10px] text-slate-500 font-bold">g = 9.81 m/s² (ไม่มีแรงต้านอากาศ)</div>
        </div>
      </div>
    </div>
  );
};

export const MathSymbolBuilder = () => {
  const [expression, setExpression] = useState('');
  const btnGroups = {
    'เศษส่วน & รูท': [{ l: 'a/b', v: '\\frac{x}{y}' }, { l: '√x', v: '\\sqrt{x}' }, { l: 'ⁿ√x', v: '\\sqrt[n]{x}' }],
    'เลขยกกำลัง & ห้อย': [{ l: 'x²', v: 'x^2' }, { l: 'xⁿ', v: 'x^n' }, { l: 'xᵢ', v: 'x_i' }],
    'แคลคูลัส': [{ l: '∫', v: '\\int' }, { l: '∫ limits', v: '\\int_{a}^{b}' }, { l: 'lim', v: '\\lim_{x \\to \\infty}' }, { l: '∑', v: '\\sum_{i=1}^{n}' }],
    'กรีก & สัญลักษณ์': [{ l: 'α', v: '\\alpha' }, { l: 'β', v: '\\beta' }, { l: 'θ', v: '\\theta' }, { l: 'π', v: '\\pi' }, { l: '±', v: '\\pm' }, { l: '∞', v: '\\infty' }, { l: '≈', v: '\\approx' }, { l: '≠', v: '\\neq' }]
  };

  const previewUrl = expression.trim()
    ? `https://latex.codecogs.com/svg.image?\\color{white}\\large ${encodeURIComponent(expression)}`
    : null;

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col gap-4">
        <div className="text-amber-400 font-bold text-sm border-b border-[#1E3A5F] pb-2 flex justify-between items-center">
          <span><i className="fas fa-square-root-alt"></i> เครื่องมือสร้างสมการ (LaTeX Builder)</span>
          {previewUrl && (
            <button type="button" onClick={() => { navigator.clipboard.writeText(expression); alert('คัดลอกโค้ด LaTeX เรียบร้อยแล้ว'); }} className="btn-d py-1 px-3 text-[10px]">
              <i className="fas fa-copy"></i> ก๊อปปี้โค้ด LaTeX
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-2">
          {Object.entries(btnGroups).map(([group, btns]) => (
            <div key={group} className="bg-[#050811] p-2 rounded-lg border border-[#1E3A5F]">
              <div className="text-[9px] text-slate-400 font-bold mb-1.5 text-center">{group}</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {btns.map((btn, i) => (
                  <button key={i} type="button" onClick={() => setExpression((prev) => prev + ' ' + btn.v + ' ')} className="px-2 py-1 bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white rounded border border-slate-600 transition-colors font-mono text-[10px] shadow-sm">{btn.l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="text-slate-400 font-bold mb-1 block">โค้ดสมการ (พิมพ์แก้ที่นี่ได้เลย)</label>
          <textarea rows="3" value={expression} onChange={(e) => setExpression(e.target.value)} placeholder="พิมพ์สมการ หรือคลิกปุ่มด้านบนเพื่อแทรก..." className="w-full inp font-mono text-sky-200 bg-[#050811] resize-none"></textarea>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#050811] to-[#0a101f] p-6 rounded-2xl border border-dashed border-sky-500/50 shadow-2xl flex flex-col items-center justify-center min-h-[150px] relative">
        <div className="absolute top-3 left-4 text-[10px] text-sky-400 font-bold tracking-widest uppercase">Live Preview (พรีวิวภาพสมการ)</div>
        {previewUrl ? (
          <div className="mt-4 p-4"><img src={previewUrl} alt="Math Equation" className="max-w-full h-auto drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" /></div>
        ) : (
          <div className="text-slate-500 mt-4"><i className="fas fa-laptop-code text-2xl mb-2 block text-center opacity-50"></i>ระบบจะเรนเดอร์ภาพสมการที่นี่</div>
        )}
        <div className="absolute bottom-3 right-4 text-[9px] text-slate-500">คุณสามารถคลิกขวาที่ภาพแล้วกด Copy Image ไปวางใน Word/PowerPoint ได้เลย</div>
      </div>
    </div>
  );
};

export const MatrixSolver = () => {
  const [mainMode, setMainMode] = useState('equation');
  const [eqMode, setEqMode] = useState('2x2');
  const [mat, setMat] = useState([['', '', '', ''], ['', '', '', ''], ['', '', '', '']]);
  const [quad, setQuad] = useState({ a: '', b: '', c: '' });
  const [eqResult, setEqResult] = useState(null);
  const [showSteps, setShowSteps] = useState(false);

  const [matSize, setMatSize] = useState(2);
  const [matA, setMatA] = useState([['', '', ''], ['', '', ''], ['', '', '']]);
  const [matB, setMatB] = useState([['', '', ''], ['', '', ''], ['', '', '']]);
  const [matOp, setMatOp] = useState('add');
  const [opResult, setOpResult] = useState(null);

  const handleMat = (r, c, val) => {
    setMat((prev) => prev.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? val : v)) : row)));
    setEqResult(null);
  };

  const solve2x2 = () => {
    const a1 = parseFloat(mat[0][0]), b1 = parseFloat(mat[0][1]), c1 = parseFloat(mat[0][2]);
    const a2 = parseFloat(mat[1][0]), b2 = parseFloat(mat[1][1]), c2 = parseFloat(mat[1][2]);
    if ([a1, b1, c1, a2, b2, c2].some(isNaN)) return setEqResult({ err: 'กรุณากรอกตัวเลขให้ครบทุกช่อง' });
    const det = a1 * b2 - a2 * b1;
    const detX = c1 * b2 - c2 * b1;
    const detY = a1 * c2 - a2 * c1;
    if (det === 0) return setEqResult({ err: detX === 0 && detY === 0 ? 'สมการมีคำตอบนับไม่ถ้วน (เส้นทับกัน)' : 'สมการไม่มีคำตอบ (เส้นขนานกัน)', det: 0 });
    setEqResult({ type: '2x2', x: detX / det, y: detY / det, det, detX, detY, eq: { a1, b1, c1, a2, b2, c2 } });
  };

  const solve3x3 = () => {
    const m = mat.map((row) => row.map((v) => parseFloat(v)));
    if (m.some((row) => row.some(isNaN))) return setEqResult({ err: 'กรุณากรอกตัวเลขให้ครบทุกช่อง' });
    const getDet3 = (a, b, c, d, e, f, g, h, i) => a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    const det = getDet3(m[0][0], m[0][1], m[0][2], m[1][0], m[1][1], m[1][2], m[2][0], m[2][1], m[2][2]);
    const detX = getDet3(m[0][3], m[0][1], m[0][2], m[1][3], m[1][1], m[1][2], m[2][3], m[2][1], m[2][2]);
    const detY = getDet3(m[0][0], m[0][3], m[0][2], m[1][0], m[1][3], m[1][2], m[2][0], m[2][3], m[2][2]);
    const detZ = getDet3(m[0][0], m[0][1], m[0][3], m[1][0], m[1][1], m[1][3], m[2][0], m[2][1], m[2][3]);
    if (det === 0) return setEqResult({ err: 'หาค่าไม่ได้ (Determinant = 0)', det: 0 });
    setEqResult({ type: '3x3', x: detX / det, y: detY / det, z: detZ / det, det, detX, detY, detZ });
  };

  const solveQuad = () => {
    const a = parseFloat(quad.a), b = parseFloat(quad.b), c = parseFloat(quad.c);
    if ([a, b, c].some(isNaN)) return setEqResult({ err: 'กรุณากรอกตัวเลขให้ครบทุกช่อง' });
    if (a === 0) return setEqResult({ err: 'ค่า a ต้องไม่เป็น 0 (ไม่ใช่สมการกำลังสอง)' });
    const D = b * b - 4 * a * c;
    if (D > 0) setEqResult({ type: 'quad', roots: 2, x1: (-b + Math.sqrt(D)) / (2 * a), x2: (-b - Math.sqrt(D)) / (2 * a), D, a, b, c });
    else if (D === 0) setEqResult({ type: 'quad', roots: 1, x: -b / (2 * a), D, a, b, c });
    else setEqResult({ type: 'quad', roots: 0, real: -b / (2 * a), img: Math.sqrt(-D) / (2 * Math.abs(a)), D, a, b, c, isComplex: true });
  };

  const handleSolveEq = () => {
    setShowSteps(false);
    if (eqMode === '2x2') solve2x2();
    else if (eqMode === '3x3') solve3x3();
    else solveQuad();
  };

  const handleMatOpUpdate = (matType, r, c, val) => {
    const updater = (prev) => prev.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? val : v)) : row));
    if (matType === 'A') setMatA(updater);
    else setMatB(updater);
    setOpResult(null);
  };

  const calculateMatrixOp = () => {
    const A = matA.slice(0, matSize).map((r) => r.slice(0, matSize).map((v) => parseFloat(v) || 0));
    const B = matB.slice(0, matSize).map((r) => r.slice(0, matSize).map((v) => parseFloat(v) || 0));
    const res = Array(matSize).fill(0).map(() => Array(matSize).fill(0));
    if (matOp === 'add') for (let i = 0; i < matSize; i++) for (let j = 0; j < matSize; j++) res[i][j] = A[i][j] + B[i][j];
    else if (matOp === 'sub') for (let i = 0; i < matSize; i++) for (let j = 0; j < matSize; j++) res[i][j] = A[i][j] - B[i][j];
    else if (matOp === 'mul') for (let i = 0; i < matSize; i++) for (let j = 0; j < matSize; j++) for (let k = 0; k < matSize; k++) res[i][j] += A[i][k] * B[k][j];
    setOpResult(res);
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto">
      <div className="flex bg-[#0B1325] p-1.5 rounded-xl border border-[#1E3A5F] overflow-x-auto no-scrollbar font-bold text-xs">
        <button type="button" onClick={() => setMainMode('equation')} className={`px-4 py-2 rounded-lg whitespace-nowrap flex-1 transition-all ${mainMode === 'equation' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="fas fa-equals mr-1"></i> Equation Solver</button>
        <button type="button" onClick={() => setMainMode('matrix_ops')} className={`px-4 py-2 rounded-lg whitespace-nowrap flex-1 transition-all ${mainMode === 'matrix_ops' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="fas fa-border-all mr-1"></i> Matrix Operations</button>
      </div>

      {mainMode === 'equation' && (
        <div className="bg-[#050811] p-4 sm:p-6 rounded-xl border border-[#1E3A5F] w-full shadow-lg">
          <div className="bg-[#0B1325] p-1.5 rounded-xl border border-[#1E3A5F] flex gap-1 mb-6 max-w-sm mx-auto">
            <button type="button" onClick={() => { setEqMode('2x2'); setEqResult(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${eqMode === '2x2' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-[#0F2547]'}`}>2 Variables</button>
            <button type="button" onClick={() => { setEqMode('3x3'); setEqResult(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${eqMode === '3x3' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-[#0F2547]'}`}>3 Variables</button>
            <button type="button" onClick={() => { setEqMode('quad'); setEqResult(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${eqMode === 'quad' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-[#0F2547]'}`}>Quadratic</button>
          </div>

          <div className="flex flex-col gap-3 items-center justify-center min-h-[120px]">
            {eqMode === '2x2' && (
              <div className="space-y-3 font-mono text-sm sm:text-base text-slate-300 w-full max-w-sm">
                <div className="flex items-center gap-2"><input type="number" value={mat[0][0]} onChange={(e) => handleMat(0, 0, e.target.value)} className="inp w-16 text-center" placeholder="a1" /> <span>X +</span><input type="number" value={mat[0][1]} onChange={(e) => handleMat(0, 1, e.target.value)} className="inp w-16 text-center" placeholder="b1" /> <span>Y =</span><input type="number" value={mat[0][2]} onChange={(e) => handleMat(0, 2, e.target.value)} className="inp w-20 text-center text-sky-200 border-sky-500/50 bg-sky-950/20" placeholder="c1" /></div>
                <div className="flex items-center gap-2"><input type="number" value={mat[1][0]} onChange={(e) => handleMat(1, 0, e.target.value)} className="inp w-16 text-center" placeholder="a2" /> <span>X +</span><input type="number" value={mat[1][1]} onChange={(e) => handleMat(1, 1, e.target.value)} className="inp w-16 text-center" placeholder="b2" /> <span>Y =</span><input type="number" value={mat[1][2]} onChange={(e) => handleMat(1, 2, e.target.value)} className="inp w-20 text-center text-sky-200 border-sky-500/50 bg-sky-950/20" placeholder="c2" /></div>
              </div>
            )}
            {eqMode === '3x3' && (
              <div className="space-y-3 font-mono text-xs sm:text-sm text-slate-300 w-full max-w-md">
                {[0, 1, 2].map((r) => (
                  <div key={r} className="flex items-center justify-center gap-1.5 w-full">
                    <input type="number" value={mat[r][0]} onChange={(e) => handleMat(r, 0, e.target.value)} className="inp w-14 sm:w-16 text-center" placeholder="a" /> <span>X +</span>
                    <input type="number" value={mat[r][1]} onChange={(e) => handleMat(r, 1, e.target.value)} className="inp w-14 sm:w-16 text-center" placeholder="b" /> <span>Y +</span>
                    <input type="number" value={mat[r][2]} onChange={(e) => handleMat(r, 2, e.target.value)} className="inp w-14 sm:w-16 text-center" placeholder="c" /> <span>Z =</span>
                    <input type="number" value={mat[r][3]} onChange={(e) => handleMat(r, 3, e.target.value)} className="inp w-16 sm:w-20 text-center text-sky-200 border-sky-500/50 bg-sky-950/20" placeholder="d" />
                  </div>
                ))}
              </div>
            )}
            {eqMode === 'quad' && (
              <div className="flex items-center gap-2 font-mono text-sm sm:text-base text-amber-400 justify-center">
                <input type="number" value={quad.a} onChange={(e) => { setQuad({ ...quad, a: e.target.value }); setEqResult(null); }} className="inp w-16 text-center bg-amber-950/20 border-amber-500/50" placeholder="a" /> <span>X² +</span>
                <input type="number" value={quad.b} onChange={(e) => { setQuad({ ...quad, b: e.target.value }); setEqResult(null); }} className="inp w-16 text-center bg-amber-950/20 border-amber-500/50" placeholder="b" /> <span>X +</span>
                <input type="number" value={quad.c} onChange={(e) => { setQuad({ ...quad, c: e.target.value }); setEqResult(null); }} className="inp w-16 text-center bg-amber-950/20 border-amber-500/50" placeholder="c" /> <span>= 0</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center border-t border-[#1E3A5F] pt-6">
            <button type="button" onClick={handleSolveEq} className="btn-w py-2.5 px-10 text-sm shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"><i className="fas fa-rocket mr-1"></i> ประมวลผลสมการ</button>
          </div>

          {eqResult && (
            <div className="mt-6 bg-[#0B1325] border border-sky-500/30 rounded-xl p-5 shadow-2xl animate-fade-in relative">
              {eqResult.err && !eqResult.isComplex ? (
                <div className="text-red-400 font-bold bg-red-950/50 p-4 rounded text-center border border-red-900/50">{eqResult.err}</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sky-300 font-bold text-sm border-b border-[#1E3A5F] pb-2 flex justify-between items-center">
                    <span>🎯 คำตอบ (Final Answers)</span>
                    <button type="button" onClick={() => setShowSteps(!showSteps)} className="bg-sky-900/50 text-sky-200 px-3 py-1 rounded-lg text-[10px] border border-sky-500/30 hover:bg-sky-600 transition-colors">
                      {showSteps ? 'ซ่อนวิธีทำ' : '👁️ ดูวิธีทำ (Show Steps)'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center font-mono text-xl sm:text-2xl font-bold text-white">
                    {eqResult.type === '2x2' && (
                      <>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-[#1E3A5F]">X = <span className="text-sky-400">{eqResult.x.toFixed(4)}</span></div>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-[#1E3A5F]">Y = <span className="text-sky-400">{eqResult.y.toFixed(4)}</span></div>
                      </>
                    )}
                    {eqResult.type === '3x3' && (
                      <>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-[#1E3A5F] text-lg">X = <span className="text-sky-400">{eqResult.x.toFixed(4)}</span></div>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-[#1E3A5F] text-lg">Y = <span className="text-sky-400">{eqResult.y.toFixed(4)}</span></div>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-[#1E3A5F] text-lg">Z = <span className="text-sky-400">{eqResult.z.toFixed(4)}</span></div>
                      </>
                    )}
                    {eqResult.type === 'quad' && eqResult.roots === 2 && (
                      <>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-amber-500/30">X₁ = <span className="text-amber-400">{eqResult.x1.toFixed(4)}</span></div>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-amber-500/30">X₂ = <span className="text-amber-400">{eqResult.x2.toFixed(4)}</span></div>
                      </>
                    )}
                    {eqResult.type === 'quad' && eqResult.roots === 1 && (
                      <div className="bg-[#050811] px-4 py-2 rounded-lg border border-amber-500/30">X = <span className="text-amber-400">{eqResult.x.toFixed(4)}</span></div>
                    )}
                    {eqResult.type === 'quad' && eqResult.isComplex && (
                      <>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-red-500/30 text-lg">X₁ = <span className="text-red-400">{eqResult.real.toFixed(4)} + {eqResult.img.toFixed(4)}i</span></div>
                        <div className="bg-[#050811] px-4 py-2 rounded-lg border border-red-500/30 text-lg">X₂ = <span className="text-red-400">{eqResult.real.toFixed(4)} - {eqResult.img.toFixed(4)}i</span></div>
                      </>
                    )}
                  </div>

                  {showSteps && (
                    <div className="mt-4 p-4 bg-[#050811] rounded-xl border border-dashed border-sky-500/50 text-xs text-slate-300 font-mono animate-fade-in space-y-3">
                      <div className="text-sky-400 font-bold mb-2 uppercase">📝 Step-by-Step Solution</div>
                      {eqResult.type === '2x2' && (
                        <>
                          <div><span className="text-slate-400">1. Determinant หลัก (Δ):</span><br />Δ = ({eqResult.eq.a1})({eqResult.eq.b2}) - ({eqResult.eq.a2})({eqResult.eq.b1}) = <span className="text-amber-300">{eqResult.det}</span></div>
                          <div><span className="text-slate-400">2. Δx =</span> <span className="text-amber-300">{eqResult.detX}</span> | <span className="text-slate-400">Δy =</span> <span className="text-amber-300">{eqResult.detY}</span></div>
                          <div className="pt-2 border-t border-[#1E3A5F] text-sky-200">X = {eqResult.detX} / {eqResult.det} = <b>{eqResult.x.toFixed(4)}</b><br />Y = {eqResult.detY} / {eqResult.det} = <b>{eqResult.y.toFixed(4)}</b></div>
                        </>
                      )}
                      {eqResult.type === '3x3' && (
                        <div className="text-sky-200">Δ = {eqResult.det} | Δx = {eqResult.detX} | Δy = {eqResult.detY} | Δz = {eqResult.detZ}</div>
                      )}
                      {eqResult.type === 'quad' && (
                        <>
                          <div><span className="text-slate-400">1. สมการ:</span> {eqResult.a}x² + {eqResult.b}x + {eqResult.c} = 0</div>
                          <div><span className="text-slate-400">2. Discriminant (D):</span> ({eqResult.b})² - 4({eqResult.a})({eqResult.c}) = <span className="text-amber-300">{eqResult.D}</span></div>
                          {eqResult.D >= 0 ? (
                            <div className="pt-2 border-t border-[#1E3A5F] text-sky-200">x₁ = <b>{eqResult.x1?.toFixed(4) || eqResult.x?.toFixed(4)}</b>, x₂ = <b>{eqResult.x2?.toFixed(4) || '-'}</b></div>
                          ) : (
                            <div className="pt-2 border-t border-[#1E3A5F] text-red-300">D น้อยกว่า 0 ทำให้ได้รากเป็นจำนวนเชิงซ้อน (Complex Number)</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mainMode === 'matrix_ops' && (
        <div className="bg-[#050811] p-4 sm:p-6 rounded-xl border border-[#1E3A5F] w-full shadow-lg animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-[#0B1325] p-1.5 rounded-xl border border-[#1E3A5F] flex gap-1 text-[11px]">
              <button type="button" onClick={() => setMatSize(2)} className={`px-3 py-1 rounded font-bold ${matSize === 2 ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-white'}`}>2x2</button>
              <button type="button" onClick={() => setMatSize(3)} className={`px-3 py-1 rounded font-bold ${matSize === 3 ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-white'}`}>3x3</button>
            </div>
            <select value={matOp} onChange={(e) => setMatOp(e.target.value)} className="inp py-1.5 bg-[#0B1325] text-fuchsia-300 font-bold border-fuchsia-900/50 text-xs">
              <option value="add">A + B (บวก)</option>
              <option value="sub">A - B (ลบ)</option>
              <option value="mul">A × B (คูณ)</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 font-mono text-sm overflow-x-auto no-scrollbar pb-4 pt-4">
            <div className="relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-fuchsia-400 font-bold font-sans">Matrix A</div>
              <div className="border-l-2 border-r-2 border-fuchsia-500/50 rounded-[8px] p-2 grid gap-1.5 bg-fuchsia-950/10" style={{ gridTemplateColumns: `repeat(${matSize}, minmax(0, 1fr))` }}>
                {Array(matSize).fill().map((_, r) => Array(matSize).fill().map((_, c) => (
                  <input key={`a${r}${c}`} type="number" value={matA[r][c]} onChange={(e) => handleMatOpUpdate('A', r, c, e.target.value)} className="inp w-12 sm:w-16 text-center px-1 border-fuchsia-900/50 focus:border-fuchsia-500" placeholder="0" />
                )))}
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-400">{matOp === 'add' ? '+' : matOp === 'sub' ? '-' : '×'}</div>
            <div className="relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-sky-400 font-bold font-sans">Matrix B</div>
              <div className="border-l-2 border-r-2 border-sky-500/50 rounded-[8px] p-2 grid gap-1.5 bg-sky-950/10" style={{ gridTemplateColumns: `repeat(${matSize}, minmax(0, 1fr))` }}>
                {Array(matSize).fill().map((_, r) => Array(matSize).fill().map((_, c) => (
                  <input key={`b${r}${c}`} type="number" value={matB[r][c]} onChange={(e) => handleMatOpUpdate('B', r, c, e.target.value)} className="inp w-12 sm:w-16 text-center px-1 border-sky-900/50 focus:border-sky-500" placeholder="0" />
                )))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center border-t border-[#1E3A5F] pt-6">
            <button type="button" onClick={calculateMatrixOp} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2.5 px-10 rounded-xl text-sm shadow-[0_0_15px_rgba(192,38,211,0.3)] hover:scale-105 transition-transform">
              <i className="fas fa-calculator mr-1"></i> คำนวณ (Calculate)
            </button>
          </div>

          {opResult && (
            <div className="mt-6 bg-[#0B1325] border border-emerald-500/30 rounded-xl p-5 shadow-2xl flex flex-col items-center animate-fade-in">
              <div className="text-emerald-400 font-bold text-sm mb-4">✨ ผลลัพธ์ (Result Matrix)</div>
              <div className="border-l-4 border-r-4 border-emerald-500/50 rounded-[12px] p-4 grid gap-3 bg-[#050811] font-mono text-lg sm:text-xl font-bold" style={{ gridTemplateColumns: `repeat(${matSize}, minmax(0, 1fr))` }}>
                {Array(matSize).fill().map((_, r) => Array(matSize).fill().map((_, c) => (
                  <div key={`res${r}${c}`} className="w-16 sm:w-20 text-center text-white">{opResult[r][c]}</div>
                )))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ResistorCalcReal = () => {
  const DIGIT_COLORS = [
    { n: 'Black', th: 'ดำ', abbr: 'Blk', v: 0, m: 1, mLbl: '×1Ω', c: '#111827', t: '#fff' },
    { n: 'Brown', th: 'น้ำตาล', abbr: 'Brn', v: 1, m: 10, mLbl: '×10Ω', tol: 1, tcr: 100, c: '#8B4513', t: '#fff' },
    { n: 'Red', th: 'แดง', abbr: 'Red', v: 2, m: 100, mLbl: '×100Ω', tol: 2, tcr: 50, c: '#DC2626', t: '#fff' },
    { n: 'Orange', th: 'ส้ม', abbr: 'Org', v: 3, m: 1e3, mLbl: '×1kΩ', tcr: 15, c: '#F97316', t: '#000' },
    { n: 'Yellow', th: 'เหลือง', abbr: 'Yel', v: 4, m: 1e4, mLbl: '×10kΩ', tcr: 25, c: '#FACC15', t: '#000' },
    { n: 'Green', th: 'เขียว', abbr: 'Grn', v: 5, m: 1e5, mLbl: '×100kΩ', tol: 0.5, c: '#16A34A', t: '#fff' },
    { n: 'Blue', th: 'น้ำเงิน', abbr: 'Blu', v: 6, m: 1e6, mLbl: '×1MΩ', tol: 0.25, tcr: 10, c: '#2563EB', t: '#fff' },
    { n: 'Violet', th: 'ม่วง', abbr: 'Vio', v: 7, m: 1e7, mLbl: '×10MΩ', tol: 0.1, tcr: 5, c: '#9333EA', t: '#fff' },
    { n: 'Gray', th: 'เทา', abbr: 'Gry', v: 8, m: 1e8, mLbl: '×100MΩ', tol: 0.05, c: '#6B7280', t: '#fff' },
    { n: 'White', th: 'ขาว', abbr: 'Wht', v: 9, m: 1e9, mLbl: '×1GΩ', c: '#F8FAFC', t: '#000' }
  ];

  const MULT_COLORS = [
    ...DIGIT_COLORS,
    { n: 'Gold', th: 'ทอง', abbr: 'Gld', m: 0.1, mLbl: '×0.1Ω', tol: 5, c: '#EAB308', t: '#000' },
    { n: 'Silver', th: 'เงิน', abbr: 'Slv', m: 0.01, mLbl: '×0.01Ω', tol: 10, c: '#CBD5E1', t: '#000' }
  ];

  const TOL_COLORS = MULT_COLORS.filter((x) => x.tol !== undefined);
  const TCR_COLORS = DIGIT_COLORS.filter((x) => x.tcr !== undefined);

  const E24_BASE = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
  const EIA96_BASE = [
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143,
    147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210,
    215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
    316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453,
    464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665,
    681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976
  ];
  const EIA96_MULT = { Z: 0.001, Y: 0.01, R: 0.01, X: 0.1, S: 0.1, A: 1, B: 10, H: 10, C: 100, D: 1000, E: 10000, F: 100000 };

  const formatOhm = (v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '-';
    if (v === 0) return '0 Ω';
    const clean = (n) => parseFloat(n.toFixed(3)).toString();
    if (v >= 1e9) return `${clean(v / 1e9)} GΩ`;
    if (v >= 1e6) return `${clean(v / 1e6)} MΩ`;
    if (v >= 1e3) return `${clean(v / 1e3)} kΩ`;
    return `${clean(v)} Ω`;
  };

  const parseOhm = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim().replace(/Ω|ohm|ohms|\s+/gi, '');
    if (!s) return null;
    const rNotation = s.match(/^(\d*)([rRkKmMgG])(\d+)$/);
    if (rNotation) {
      const num = parseFloat(`${rNotation[1] || '0'}.${rNotation[3]}`);
      const unit = rNotation[2].toUpperCase();
      const mult = unit === 'R' ? 1 : unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : 1e9;
      return num * mult;
    }
    const std = s.match(/^(\d+(?:\.\d+)?)([rRkKmMgG])?$/);
    if (!std) return null;
    const num = parseFloat(std[1]);
    const unit = (std[2] || 'R').toUpperCase();
    const mult = unit === 'R' ? 1 : unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : 1e9;
    return num * mult;
  };

  const getNearestE24 = (target, ceilOnly = false) => {
    if (!target || target <= 0) return null;
    let best = null;
    let bestDiff = Infinity;
    for (let dec = -1; dec <= 7; dec++) {
      const factor = Math.pow(10, dec);
      for (const base of E24_BASE) {
        const val = parseFloat((base * factor).toPrecision(4));
        if (ceilOnly && val < target) continue;
        const diff = Math.abs(val - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = val;
        }
      }
    }
    return best;
  };

  const recommendWatt = (p) => {
    const safe = p * 2;
    if (safe <= 0.125) return '1/8W (0.125W)';
    if (safe <= 0.25) return '1/4W (0.25W)';
    if (safe <= 0.5) return '1/2W (0.5W)';
    if (safe <= 1) return '1W';
    if (safe <= 2) return '2W';
    if (safe <= 5) return '5W';
    return `${Math.ceil(safe)}W+ (ตัวต้านทานกำลังสูง)`;
  };

  // Main Tabs
  const [tab, setTab] = useState('color'); // 'color' | 'smd' | 'circuit' | 'quiz'

  // --- TAB 1: COLOR CODE ---
  const [bandCount, setBandCount] = useState(4);
  const [b1, setB1] = useState(DIGIT_COLORS[1]); // Brown
  const [b2, setB2] = useState(DIGIT_COLORS[0]); // Black
  const [b3, setB3] = useState(DIGIT_COLORS[0]); // Black
  const [mult, setMult] = useState(MULT_COLORS[2]); // Red (x100)
  const [tol, setTol] = useState(TOL_COLORS.find((x) => x.n === 'Gold'));
  const [tcr, setTcr] = useState(TCR_COLORS[0]); // Brown 100ppm
  const [activeSlot, setActiveSlot] = useState('b1');
  const [valueInput, setValueInput] = useState('');
  const [valueInputErr, setValueInputErr] = useState('');
  const [pwrMode, setPwrMode] = useState('V'); // 'V' | 'I'
  const [pwrVal, setPwrVal] = useState('5');
  const [copiedRes, setCopiedRes] = useState(false);

  const currentOhm = bandCount === 4
    ? (b1.v * 10 + b2.v) * mult.m
    : (b1.v * 100 + b2.v * 10 + b3.v) * mult.m;

  const minOhm = currentOhm * (1 - (tol.tol || 0) / 100);
  const maxOhm = currentOhm * (1 + (tol.tol || 0) / 100);
  const nearestE24 = getNearestE24(currentOhm);
  const isExactE24 = nearestE24 !== null && Math.abs(nearestE24 - currentOhm) / Math.max(currentOhm, 1e-9) < 0.005;

  const applyOhmToBands = (ohmVal, targetBandCount = bandCount) => {
    if (!ohmVal || ohmVal <= 0) return false;
    const isFour = targetBandCount === 4;
    let exp = Math.floor(Math.log10(ohmVal)) - (isFour ? 1 : 2);
    let sig = Math.round(ohmVal / Math.pow(10, exp));
    const maxSig = isFour ? 100 : 1000;
    const minSig = isFour ? 10 : 100;
    if (sig >= maxSig) { sig = Math.round(sig / 10); exp += 1; }
    if (sig < minSig) { sig *= 10; exp -= 1; }
    if (exp < -2 || exp > 9) return false;

    const targetMult = Math.pow(10, exp);
    const multObj = MULT_COLORS.find((x) => Math.abs(x.m - targetMult) / Math.max(targetMult, 1e-9) < 0.01);
    if (!multObj) return false;

    if (isFour) {
      setB1(DIGIT_COLORS[Math.floor(sig / 10)] || DIGIT_COLORS[1]);
      setB2(DIGIT_COLORS[sig % 10] || DIGIT_COLORS[0]);
    } else {
      setB1(DIGIT_COLORS[Math.floor(sig / 100)] || DIGIT_COLORS[1]);
      setB2(DIGIT_COLORS[Math.floor((sig % 100) / 10)] || DIGIT_COLORS[0]);
      setB3(DIGIT_COLORS[sig % 10] || DIGIT_COLORS[0]);
    }
    setMult(multObj);
    return true;
  };

  const handleApplyInput = (e) => {
    e?.preventDefault?.();
    const parsed = parseOhm(valueInput);
    if (!parsed || parsed <= 0) {
      setValueInputErr('รูปแบบไม่ถูกต้อง ลองพิมพ์เช่น 220, 4.7k, 4R7, 1M');
      return;
    }
    const ok = applyOhmToBands(parsed, bandCount);
    if (!ok) {
      setValueInputErr('ค่านี้อยู่นอกช่วงแถบสีมาตรฐาน (0.1Ω – 999GΩ)');
    } else {
      setValueInputErr('');
    }
  };

  const handleBandCountChange = (n) => {
    setBandCount(n);
    if (n === 4 && (activeSlot === 'b3' || activeSlot === 'tcr')) setActiveSlot('b1');
    if (n === 5 && activeSlot === 'tcr') setActiveSlot('b1');
    applyOhmToBands(currentOhm, n);
  };

  const powerNum = parseFloat(pwrVal);
  const calcPower = currentOhm > 0 && !Number.isNaN(powerNum) && powerNum >= 0
    ? (pwrMode === 'V' ? (powerNum * powerNum) / currentOhm : (powerNum / 1000) * (powerNum / 1000) * currentOhm)
    : 0;
  const calcCurrentMa = currentOhm > 0 && !Number.isNaN(powerNum) && powerNum >= 0
    ? (pwrMode === 'V' ? (powerNum / currentOhm) * 1000 : powerNum)
    : 0;

  const bandSlots = [
    { key: 'b1', lbl: 'หลัก 1', cur: b1, set: setB1, list: DIGIT_COLORS.slice(1), tag: `${b1.abbr} (${b1.v})` },
    { key: 'b2', lbl: 'หลัก 2', cur: b2, set: setB2, list: DIGIT_COLORS, tag: `${b2.abbr} (${b2.v})` },
    ...(bandCount >= 5 ? [{ key: 'b3', lbl: 'หลัก 3', cur: b3, set: setB3, list: DIGIT_COLORS, tag: `${b3.abbr} (${b3.v})` }] : []),
    { key: 'mult', lbl: 'ตัวคูณ', cur: mult, set: setMult, list: MULT_COLORS, tag: `${mult.abbr} (${mult.mLbl})` },
    { key: 'tol', lbl: 'คลาดเคลื่อน', cur: tol, set: setTol, list: TOL_COLORS, tag: `${tol.abbr} (±${tol.tol}%)` },
    ...(bandCount === 6 ? [{ key: 'tcr', lbl: 'อุณหภูมิ', cur: tcr, set: setTcr, list: TCR_COLORS, tag: `${tcr.abbr} (${tcr.tcr}ppm)` }] : [])
  ];
  const currentSlotObj = bandSlots.find((s) => s.key === activeSlot) || bandSlots[0];

  // --- TAB 2: SMD CODE ---
  const [smdCode, setSmdCode] = useState('472');

  const decodeSmd = (raw) => {
    const code = String(raw || '').trim().toUpperCase();
    if (!code) return null;

    if (code === '0' || code === '000' || code === '0000') {
      return { val: 0, type: 'Zero-Ohm Jumper', detail: 'จัมเปอร์ 0 Ω (ใช้เชื่อมลายวงจร)' };
    }
    if (code.includes('R')) {
      const m = code.match(/^(\d*)R(\d*)$/);
      if (m && (m[1] || m[2])) {
        const val = parseFloat(`${m[1] || '0'}.${m[2] || '0'}`);
        return { val, type: 'R-Notation (ทศนิยม)', detail: `ตัว R แทนจุดทศนิยม → ${val} Ω` };
      }
      return { err: 'รูปแบบ R-Notation ไม่ถูกต้อง (ตัวอย่าง: 4R7, R22, 10R5)' };
    }
    if (/^\d{3}$/.test(code)) {
      const digits = parseInt(code.slice(0, 2), 10);
      const exp = parseInt(code[2], 10);
      const val = digits * Math.pow(10, exp);
      return { val, type: '3-Digit Standard (±5%)', detail: `${digits} × 10^${exp} = ${formatOhm(val)}` };
    }
    if (/^\d{4}$/.test(code)) {
      const digits = parseInt(code.slice(0, 3), 10);
      const exp = parseInt(code[3], 10);
      const val = digits * Math.pow(10, exp);
      return { val, type: '4-Digit Precision (±1%)', detail: `${digits} × 10^${exp} = ${formatOhm(val)}` };
    }
    const eia = code.match(/^(\d{2})([A-Z])$/);
    if (eia) {
      const idx = parseInt(eia[1], 10);
      const multVal = EIA96_MULT[eia[2]];
      if (idx >= 1 && idx <= 96 && multVal !== undefined) {
        const base = EIA96_BASE[idx - 1];
        const val = base * multVal;
        return { val, type: 'EIA-96 Precision (±1%)', detail: `รหัส ${eia[1]} (${base}) × ตัวคูณ ${eia[2]} (${multVal}) = ${formatOhm(val)}` };
      }
      return { err: 'รหัส EIA-96 ต้องเป็นเลข 01–96 ตามด้วยตัวอักษร Z,Y,R,X,S,A,B,H,C,D,E,F' };
    }
    return { err: 'ไม่ตรงรูปแบบ SMD มาตรฐาน ลองใส่เช่น 103, 4701, 4R7 หรือ 01C' };
  };
  const smdRes = decodeSmd(smdCode);

  // --- TAB 3: CIRCUIT CALCULATORS ---
  const [circSub, setCircSub] = useState('led'); // 'led' | 'divider' | 'target'
  const [ledVs, setLedVs] = useState('5');
  const [ledVf, setLedVf] = useState('2.0');
  const [ledIf, setLedIf] = useState('20');
  const [divVin, setDivVin] = useState('12');
  const [divR1, setDivR1] = useState('10k');
  const [divR2, setDivR2] = useState('4.7k');
  const [targetStr, setTargetStr] = useState('750');

  const ledCalc = (() => {
    const vs = parseFloat(ledVs), vf = parseFloat(ledVf), imA = parseFloat(ledIf);
    if ([vs, vf, imA].some((x) => Number.isNaN(x)) || imA <= 0) return { err: 'กรุณากรอกค่าตัวเลขให้ถูกต้อง' };
    if (vs <= vf) return { err: 'แรงดันแหล่งจ่าย (Vs) ต้องมากกว่าแรงดันตกคร่อม LED (Vf)' };
    const iA = imA / 1000;
    const rExact = (vs - vf) / iA;
    const rStd = getNearestE24(rExact, true) || rExact;
    const actualI = ((vs - vf) / rStd) * 1000;
    const powerW = ((vs - vf) * (vs - vf)) / rStd;
    return { rExact, rStd, actualI, powerW, recWatt: recommendWatt(powerW) };
  })();

  const divCalc = (() => {
    const vin = parseFloat(divVin);
    const r1 = parseOhm(divR1);
    const r2 = parseOhm(divR2);
    if (Number.isNaN(vin) || !r1 || !r2 || r1 <= 0 || r2 <= 0) return { err: 'กรุณากรอกค่า Vin, R1 และ R2 ให้ถูกต้อง (เช่น 10k, 4.7k)' };
    const vout = vin * (r2 / (r1 + r2));
    const iA = vin / (r1 + r2);
    return { vout, iMa: iA * 1000, p1Mw: iA * iA * r1 * 1000, p2Mw: iA * iA * r2 * 1000, ratio: (r2 / (r1 + r2)) * 100 };
  })();

  const targetCalc = (() => {
    const target = parseOhm(targetStr);
    if (!target || target <= 0) return { err: 'พิมพ์ค่าความต้านทานเป้าหมาย เช่น 750, 3.5k, 12.5k' };
    const single = getNearestE24(target);
    const singleErr = ((single - target) / target) * 100;

    const pool = [];
    for (let dec = -1; dec <= 7; dec++) {
      const f = Math.pow(10, dec);
      for (const b of E24_BASE) {
        const v = parseFloat((b * f).toPrecision(4));
        if (v >= target / 50 && v <= target * 50) pool.push(v);
      }
    }

    let bestSeries = null;
    let bestParallel = null;
    for (let i = 0; i < pool.length; i++) {
      const r1 = pool[i];
      for (let j = i; j < pool.length; j++) {
        const r2 = pool[j];
        const sVal = r1 + r2;
        const sErr = Math.abs(sVal - target) / target;
        if (!bestSeries || sErr < bestSeries.absErr) {
          bestSeries = { r1, r2, val: sVal, err: ((sVal - target) / target) * 100, absErr: sErr };
        }
        const pVal = (r1 * r2) / (r1 + r2);
        const pErr = Math.abs(pVal - target) / target;
        if (!bestParallel || pErr < bestParallel.absErr) {
          bestParallel = { r1, r2, val: pVal, err: ((pVal - target) / target) * 100, absErr: pErr };
        }
      }
    }
    return { target, single, singleErr, bestSeries, bestParallel };
  })();

  const jumpToColorCode = (ohmVal) => {
    applyOhmToBands(ohmVal, bandCount);
    setValueInput(formatOhm(ohmVal).replace(/\s*Ω$/, ''));
    setValueInputErr('');
    setTab('color');
  };

  // --- TAB 4: QUIZ MODE ---
  const [quizBands, setQuizBands] = useState(4);
  const [quizState, setQuizState] = useState(null);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizBest, setQuizBest] = useState(0);

  const generateQuiz = (bandsMode = quizBands) => {
    const base = E24_BASE[Math.floor(Math.random() * E24_BASE.length)];
    const dec = [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
    const val = parseFloat((base * Math.pow(10, dec)).toPrecision(3));
    const isFour = bandsMode === 4;
    let exp = Math.floor(Math.log10(val)) - (isFour ? 1 : 2);
    let sig = Math.round(val / Math.pow(10, exp));
    if (sig >= (isFour ? 100 : 1000)) { sig = Math.round(sig / 10); exp += 1; }
    const multObj = MULT_COLORS.find((x) => Math.abs(x.m - Math.pow(10, exp)) < 0.001) || MULT_COLORS[2];
    const tolObj = TOL_COLORS[isFour ? 7 : 0] || TOL_COLORS[0];

    const qBands = isFour
      ? [DIGIT_COLORS[Math.floor(sig / 10)], DIGIT_COLORS[sig % 10], multObj, tolObj]
      : [DIGIT_COLORS[Math.floor(sig / 100)], DIGIT_COLORS[Math.floor((sig % 100) / 10)], DIGIT_COLORS[sig % 10], multObj, tolObj];

    const opts = new Set([val]);
    const candidates = [
      val * 10,
      val / 10,
      val * 100,
      parseFloat((E24_BASE[(E24_BASE.indexOf(base) + 3) % E24_BASE.length] * Math.pow(10, dec)).toPrecision(3)),
      parseFloat((E24_BASE[(E24_BASE.indexOf(base) + 7) % E24_BASE.length] * Math.pow(10, dec)).toPrecision(3))
    ];
    for (const c of candidates) {
      if (opts.size < 4 && c > 0 && c !== val) opts.add(c);
    }
    const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);
    setQuizState({ val, bands: qBands, options: shuffled, picked: null, bandsMode });
  };

  useEffect(() => {
    if (tab === 'quiz' && !quizState) generateQuiz(quizBands);
  }, [tab]);

  const handleAnswerQuiz = (opt) => {
    if (!quizState || quizState.picked !== null) return;
    const isCorrect = opt === quizState.val;
    setQuizState((prev) => ({ ...prev, picked: opt }));
    if (isCorrect) {
      const next = quizStreak + 1;
      setQuizStreak(next);
      if (next > quizBest) setQuizBest(next);
    } else {
      setQuizStreak(0);
    }
  };

  const renderResistorBody = (slots, interactive = true, isMetal = false) => (
    <div className="flex flex-col items-center w-full my-1">
      <div className="relative w-full max-w-[360px] h-20 sm:h-24 flex items-center justify-center select-none">
        {/* ขาลวดตัวต้านทาน */}
        <div className="absolute inset-x-0 h-2.5 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-600 rounded-full shadow z-0"></div>
        {/* ตัวถังตัวต้านทาน */}
        <div
          className={`relative w-56 sm:w-64 h-16 sm:h-20 rounded-[28px] border-2 z-10 flex items-center justify-between px-4 sm:px-5 shadow-[inset_0_4px_10px_rgba(255,255,255,0.28),inset_0_-6px_12px_rgba(0,0,0,0.45),0_8px_20px_rgba(0,0,0,0.5)] transition-colors duration-300 ${
            isMetal
              ? 'bg-gradient-to-b from-[#60A5FA] via-[#3B82F6] to-[#1D4ED8] border-sky-300/60'
              : 'bg-gradient-to-b from-[#F5C68A] via-[#E5A763] to-[#C27D38] border-amber-900/80'
          }`}
        >
          {slots.map((slot, idx) => {
            const isTol = slot.key === 'tol';
            const isSelected = interactive && activeSlot === slot.key;
            return (
              <React.Fragment key={slot.key || idx}>
                {isTol && <div className="w-2 sm:w-3 shrink-0" />}
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() => interactive && setActiveSlot(slot.key)}
                  title={interactive ? `คลิกเพื่อเปลี่ยนสี: ${slot.lbl}` : slot.cur.n}
                  style={{ backgroundColor: slot.cur.c }}
                  className={`relative w-3.5 sm:w-4 h-full shadow-md transition-all ${
                    interactive ? 'cursor-pointer hover:scale-x-125' : 'cursor-default'
                  } ${isSelected ? 'ring-2 ring-white scale-x-125 z-20 shadow-[0_0_12px_rgba(255,255,255,0.9)]' : 'border-x border-black/20'}`}
                >
                  {isSelected && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-sky-300 animate-bounce">▼</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ป้ายตัวช่วยแยกสี (Colorblind / Low-light Aid) */}
      {interactive && (
        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
          {slots.map((slot) => (
            <button
              key={slot.key}
              type="button"
              onClick={() => setActiveSlot(slot.key)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                activeSlot === slot.key
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-[#050811] border-[#1E3A5F] text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: slot.cur.c }}></span>
              <span>{slot.lbl}:</span>
              <span className="font-mono text-white">{slot.tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      {/* แถบเลือกโหมดหลัก */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0B1325] p-1.5 rounded-2xl border border-[#1E3A5F] font-bold">
        {[
          ['color', '🎨 แถบสี (4-6)'],
          ['smd', '🔲 รหัส SMD'],
          ['circuit', '⚡ คำนวณวงจร'],
          ['quiz', '🎯 ฝึกอ่านสี']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`py-2 px-3 rounded-xl transition-all ${
              tab === id ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: COLOR CODE ================= */}
      {tab === 'color' && (
        <div className="space-y-4">
          {/* เลือกจำนวนแถบ + พิมพ์ค่าแบบ 2 ทาง */}
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1">
                {[4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleBandCountChange(n)}
                    className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                      bandCount === n ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {n} แถบ
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400">
                {bandCount === 4 ? 'Carbon Film (ตัวถังสีเบจ)' : 'Metal Film Precision (ตัวถังสีฟ้า)'}
              </span>
            </div>

            <form onSubmit={handleApplyInput} className="flex gap-2">
              <input
                type="text"
                value={valueInput}
                onChange={(e) => { setValueInput(e.target.value); setValueInputErr(''); }}
                placeholder="พิมพ์ค่าเพื่อแปลงเป็นสี เช่น 220, 4.7k, 4R7, 1M..."
                className="inp flex-1 font-mono text-xs py-2 bg-[#050811]"
              />
              <button type="submit" className="btn-b px-4 text-xs font-bold shrink-0">แปลงเป็นสี</button>
            </form>
            {valueInputErr && <div className="text-[11px] text-red-400">{valueInputErr}</div>}

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold mr-1">ค่าฮิต:</span>
              {[220, 330, 1000, 4700, 10000, 100000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => jumpToColorCode(v)}
                  className="px-2.5 py-1 rounded-full bg-[#050811] border border-[#1E3A5F] hover:border-sky-400 text-sky-200 font-mono text-[10px] transition-colors"
                >
                  {formatOhm(v)}
                </button>
              ))}
            </div>
          </div>

          {/* กล่องผลลัพธ์ + ตัวต้านทาน Interactive */}
          <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
            <div className="relative bg-[#050811] border border-[#1E3A5F] rounded-2xl p-4 text-center space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${formatOhm(currentOhm)} ±${tol.tol}%${bandCount === 6 ? ` (${tcr.tcr} ppm/°C)` : ''}`);
                  setCopiedRes(true);
                  setTimeout(() => setCopiedRes(false), 1800);
                }}
                className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                  copiedRes ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-[#0B1325] text-slate-300 border-[#1E3A5F] hover:text-white'
                }`}
              >
                {copiedRes ? '✓ คัดลอกแล้ว' : '📋 Copy'}
              </button>

              <div className="text-3xl sm:text-4xl font-bold font-mono text-amber-400">
                {formatOhm(currentOhm)} <span className="text-xl text-sky-300">± {tol.tol}%</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                ช่วงค่าจริง: <span className="text-emerald-300">{formatOhm(minOhm)}</span> – <span className="text-emerald-300">{formatOhm(maxOhm)}</span>
                {bandCount === 6 && <span className="ml-2 text-purple-300">• TCR: {tcr.tcr} ppm/°C</span>}
              </div>
              <div className="pt-1 flex flex-wrap justify-center gap-2 text-[10px]">
                {isExactE24 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                    ✓ ค่ามาตรฐาน E24 (มีขายทั่วไป)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => nearestE24 && jumpToColorCode(nearestE24)}
                    className="px-2.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-500/40 text-amber-300 hover:bg-amber-900/50 font-bold"
                  >
                    ⚠️ นอกมาตรฐาน E24 • ใกล้เคียงสุด: {formatOhm(nearestE24)} (คลิกเพื่อตั้งค่านี้)
                  </button>
                )}
              </div>
            </div>

            {renderResistorBody(bandSlots, true, bandCount >= 5)}

            {/* แผงเลือกสีของแถบที่กำลังเลือก */}
            <div className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300">
                  เลือกสีสำหรับ: <span className="text-white">{currentSlotObj.lbl}</span>
                </span>
                <span className="text-[10px] text-slate-400">คลิกที่แถบสีบนตัวต้านทานเพื่อสลับช่องได้</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {currentSlotObj.list.map((c) => {
                  const active = currentSlotObj.cur.n === c.n;
                  const sub =
                    currentSlotObj.key === 'mult'
                      ? c.mLbl
                      : currentSlotObj.key === 'tol'
                        ? `±${c.tol}%`
                        : currentSlotObj.key === 'tcr'
                          ? `${c.tcr} ppm`
                          : `${c.v}`;
                  return (
                    <button
                      key={currentSlotObj.key + c.n}
                      type="button"
                      onClick={() => currentSlotObj.set(c)}
                      style={{ backgroundColor: c.c, color: c.t }}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-between border transition-all shadow-sm ${
                        active ? 'border-white ring-2 ring-sky-400 scale-[1.03] z-10' : 'border-black/25 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <span>{c.n} ({c.th})</span>
                      <span className="font-mono text-[10px] opacity-90">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* เช็กพิกัดกำลังไฟ (Power Dissipation Check) */}
            <div className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-300"><i className="fas fa-bolt mr-1"></i> เช็กกำลังไฟและความร้อน (Power Check)</span>
                <div className="flex bg-[#0B1325] rounded-lg border border-[#1E3A5F] p-0.5 text-[10px]">
                  <button type="button" onClick={() => setPwrMode('V')} className={`px-2.5 py-1 rounded font-bold ${pwrMode === 'V' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>ป้อนแรงดัน (V)</button>
                  <button type="button" onClick={() => setPwrMode('I')} className={`px-2.5 py-1 rounded font-bold ${pwrMode === 'I' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>ป้อนกระแส (mA)</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={pwrVal}
                    onChange={(e) => setPwrVal(e.target.value)}
                    className="inp w-full font-mono text-sm py-1.5"
                  />
                  <span className="font-bold text-slate-300 shrink-0">{pwrMode === 'V' ? 'V' : 'mA'}</span>
                </div>
                <div className="bg-[#0B1325] px-3 py-2 rounded-xl border border-[#1E3A5F] text-center font-mono">
                  <div className="text-[10px] text-slate-400 font-sans">กำลังไฟสูญเสีย / กระแส</div>
                  <div className={`font-bold ${calcPower > 0.25 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {calcPower >= 1 ? `${calcPower.toFixed(2)} W` : `${(calcPower * 1000).toFixed(1)} mW`} • {calcCurrentMa.toFixed(1)} mA
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-xl border text-center font-bold ${calcPower > 0.25 ? 'bg-red-950/40 border-red-500/60 text-red-300' : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'}`}>
                  <div className="text-[10px] opacity-80">พิกัดวัตต์แนะนำ (เผื่อ 2×)</div>
                  <div>{recommendWatt(calcPower)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SMD CODE ================= */}
      {tab === 'smd' && (
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-5">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-sky-300">ตัวแปลงรหัสตัวต้านทานแบบชิป (SMD Resistor Decoder)</h3>
            <p className="text-[11px] text-slate-400">รองรับ 3 หลัก (103), 4 หลัก (4701), ทศนิยม R (4R7, R22) และ EIA-96 (01C)</p>
          </div>

          {/* ภาพชิป SMD */}
          <div className="flex justify-center">
            <div className="relative flex items-center">
              <div className="w-7 h-20 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-l-lg border border-slate-500 shadow"></div>
              <div className="w-40 h-20 bg-[#0d1117] border-y-2 border-slate-700 flex items-center justify-center shadow-inner">
                <span className="font-mono text-3xl font-bold tracking-widest text-slate-100 uppercase">
                  {smdCode.trim() || '---'}
                </span>
              </div>
              <div className="w-7 h-20 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 rounded-r-lg border border-slate-500 shadow"></div>
            </div>
          </div>

          <div className="max-w-sm mx-auto space-y-2.5">
            <input
              type="text"
              maxLength={6}
              value={smdCode}
              onChange={(e) => setSmdCode(e.target.value.toUpperCase())}
              placeholder="พิมพ์รหัสบนชิป เช่น 472, 1002, 4R7, 01C"
              className="inp w-full text-center font-mono text-lg py-2.5 bg-[#050811] uppercase tracking-widest"
            />
            <div className="flex flex-wrap justify-center gap-1.5">
              {['103', '472', '4701', '4R7', 'R22', '01C', '68X', '000'].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setSmdCode(ex)}
                  className="px-2.5 py-1 rounded-lg bg-[#050811] border border-[#1E3A5F] hover:border-sky-400 font-mono text-[11px] text-sky-200"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {smdRes && (
            <div className={`p-4 rounded-2xl border text-center space-y-1.5 ${smdRes.err ? 'bg-red-950/30 border-red-500/50 text-red-300' : 'bg-[#050811] border-emerald-500/40'}`}>
              {smdRes.err ? (
                <div className="font-bold">{smdRes.err}</div>
              ) : (
                <>
                  <div className="text-[11px] font-bold text-sky-400">{smdRes.type}</div>
                  <div className="text-3xl font-mono font-bold text-amber-400">{formatOhm(smdRes.val)}</div>
                  <div className="text-[11px] text-slate-300 font-mono">{smdRes.detail}</div>
                  {smdRes.val > 0 && (
                    <button
                      type="button"
                      onClick={() => jumpToColorCode(smdRes.val)}
                      className="mt-2 px-3 py-1 rounded-full bg-sky-900/40 border border-sky-500/50 text-sky-200 hover:bg-sky-600 text-[10px] font-bold"
                    >
                      🎨 ดูแถบสีของค่านี้
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: CIRCUIT CALCULATORS ================= */}
      {tab === 'circuit' && (
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
          <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold">
            {[
              ['led', '💡 LED Resistor'],
              ['divider', '➗ แบ่งแรงดัน'],
              ['target', '🔗 หาคู่ต่ออนุกรม/ขนาน']
            ].map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCircSub(id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] transition-colors ${
                  circSub === id ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* 3.1 LED Resistor */}
          {circSub === 'led' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold">พรีเซตสี LED (Vf):</span>
                {[
                  ['แดง 2.0V', '2.0', 'bg-red-600'],
                  ['เหลือง 2.1V', '2.1', 'bg-yellow-500 text-black'],
                  ['เขียว 2.2V', '2.2', 'bg-green-600'],
                  ['น้ำเงิน 3.2V', '3.2', 'bg-blue-600'],
                  ['ขาว 3.3V', '3.3', 'bg-slate-200 text-black']
                ].map(([lbl, vf, cls]) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLedVf(vf)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">แรงดันแหล่งจ่าย Vs (V)</label>
                  <input type="number" step="0.1" value={ledVs} onChange={(e) => setLedVs(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">แรงดัน LED Vf (V)</label>
                  <input type="number" step="0.1" value={ledVf} onChange={(e) => setLedVf(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">กระแสที่ต้องการ If (mA)</label>
                  <input type="number" step="1" value={ledIf} onChange={(e) => setLedIf(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
              </div>

              {ledCalc.err ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">{ledCalc.err}</div>
              ) : (
                <div className="p-4 rounded-xl bg-[#050811] border border-emerald-500/40 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-[#0B1325] border border-[#1E3A5F]">
                      <div className="text-[10px] text-slate-400">ค่าคำนวณเป๊ะ (R)</div>
                      <div className="text-lg font-mono font-bold text-white">{formatOhm(ledCalc.rExact)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50">
                      <div className="text-[10px] text-emerald-300 font-bold">ค่ามาตรฐาน E24 ที่แนะนำ</div>
                      <div className="text-xl font-mono font-bold text-amber-400">{formatOhm(ledCalc.rStd)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0B1325] border border-[#1E3A5F]">
                      <div className="text-[10px] text-slate-400">พิกัดวัตต์แนะนำ</div>
                      <div className="text-base font-bold text-sky-300">{ledCalc.recWatt}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-300 font-mono">
                    <span>กระแสจริงเมื่อใช้ {formatOhm(ledCalc.rStd)}: <b className="text-emerald-400">{ledCalc.actualI.toFixed(1)} mA</b> ({(ledCalc.powerW * 1000).toFixed(1)} mW)</span>
                    <button
                      type="button"
                      onClick={() => jumpToColorCode(ledCalc.rStd)}
                      className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-sans font-bold text-[10px]"
                    >
                      🎨 ดูแถบสี {formatOhm(ledCalc.rStd)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3.2 Voltage Divider */}
          {circSub === 'divider' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">แรงดันเข้า Vin (V)</label>
                  <input type="number" step="0.1" value={divVin} onChange={(e) => setDivVin(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">R1 (ตัวบน เช่น 10k)</label>
                  <input type="text" value={divR1} onChange={(e) => setDivR1(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">R2 (ตัวล่าง เช่น 4.7k)</label>
                  <input type="text" value={divR2} onChange={(e) => setDivR2(e.target.value)} className="inp w-full font-mono text-center py-2" />
                </div>
              </div>

              {divCalc.err ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">{divCalc.err}</div>
              ) : (
                <div className="p-4 rounded-xl bg-[#050811] border border-sky-500/40 space-y-2 text-center">
                  <div className="text-[10px] text-slate-400 font-mono">Vout = Vin × R2 / (R1 + R2)</div>
                  <div className="text-3xl font-mono font-bold text-amber-400">
                    {divCalc.vout.toFixed(3)} V <span className="text-sm text-sky-300">({divCalc.ratio.toFixed(1)}%)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">กระแสวงจร<br /><b className="text-emerald-400">{divCalc.iMa.toFixed(2)} mA</b></div>
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">กำลังไฟ R1<br /><b className="text-sky-300">{divCalc.p1Mw.toFixed(2)} mW</b></div>
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">กำลังไฟ R2<br /><b className="text-sky-300">{divCalc.p2Mw.toFixed(2)} mW</b></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3.3 Target Resistance Finder */}
          {circSub === 'target' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ค่าความต้านทานเป้าหมายที่อยากได้ (เช่น 750, 3.5k, 12.5k)</label>
                <input type="text" value={targetStr} onChange={(e) => setTargetStr(e.target.value)} className="inp w-full font-mono text-base py-2 bg-[#050811]" />
              </div>

              {targetCalc.err ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">{targetCalc.err}</div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">ตัวเดียว (Single E24 ใกล้สุด)</div>
                      <div className="font-mono text-base font-bold text-white">{formatOhm(targetCalc.single)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-300">คลาดเคลื่อน {targetCalc.singleErr >= 0 ? '+' : ''}{targetCalc.singleErr.toFixed(2)}%</span>
                      <button type="button" onClick={() => jumpToColorCode(targetCalc.single)} className="px-2.5 py-1 rounded-lg bg-[#0B1325] border border-sky-500/40 text-sky-300 text-[10px] font-bold">ดูสี</button>
                    </div>
                  </div>

                  {targetCalc.bestSeries && (
                    <div className="p-3 rounded-xl bg-[#050811] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-emerald-400 font-bold">ต่ออนุกรม (Series: R1 + R2)</div>
                        <div className="font-mono text-base font-bold text-amber-300">
                          {formatOhm(targetCalc.bestSeries.r1)} + {formatOhm(targetCalc.bestSeries.r2)} = {formatOhm(targetCalc.bestSeries.val)}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        {targetCalc.bestSeries.err >= 0 ? '+' : ''}{targetCalc.bestSeries.err.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {targetCalc.bestParallel && (
                    <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/40 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-sky-400 font-bold">ต่อขนาน (Parallel: R1 ∥ R2)</div>
                        <div className="font-mono text-base font-bold text-sky-200">
                          {formatOhm(targetCalc.bestParallel.r1)} ∥ {formatOhm(targetCalc.bestParallel.r2)} = {formatOhm(targetCalc.bestParallel.val)}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/40">
                        {targetCalc.bestParallel.err >= 0 ? '+' : ''}{targetCalc.bestParallel.err.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: QUIZ MODE ================= */}
      {tab === 'quiz' && quizState && (
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-3">
            <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1">
              {[4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setQuizBands(n); generateQuiz(n); }}
                  className={`px-3 py-1 rounded-lg font-bold ${quizBands === n ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  ฝึก {n} แถบ
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-500/40 text-amber-300 font-bold">🔥 Streak: {quizStreak}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#050811] border border-[#1E3A5F] text-slate-300">🏆 Best: {quizBest}</span>
            </div>
          </div>

          <div className="text-center text-slate-300 font-bold">ตัวต้านทานนี้มีค่าความต้านทานเท่าไร?</div>

          {renderResistorBody(
            quizState.bands.map((c, idx) => ({
              key: idx === quizState.bands.length - 1 ? 'tol' : `q-${idx}`,
              lbl: '',
              cur: c
            })),
            false,
            quizState.bandsMode === 5
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {quizState.options.map((opt) => {
              const isPicked = quizState.picked === opt;
              const isRight = opt === quizState.val;
              let cls = 'bg-[#050811] border-[#1E3A5F] text-white hover:border-sky-400';
              if (quizState.picked !== null) {
                if (isRight) cls = 'bg-emerald-600 border-emerald-400 text-white shadow-lg';
                else if (isPicked) cls = 'bg-red-600 border-red-400 text-white';
                else cls = 'bg-[#050811]/50 border-[#1E3A5F] text-slate-500';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={quizState.picked !== null}
                  onClick={() => handleAnswerQuiz(opt)}
                  className={`py-3 px-4 rounded-xl border font-mono text-base font-bold transition-all ${cls}`}
                >
                  {formatOhm(opt)}
                </button>
              );
            })}
          </div>

          {quizState.picked !== null && (
            <div className="p-3.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 animate-fade-in">
              <div className="space-y-0.5">
                <div className={`font-bold ${quizState.picked === quizState.val ? 'text-emerald-400' : 'text-red-400'}`}>
                  {quizState.picked === quizState.val ? '✓ ถูกต้อง!' : `✕ ผิด! คำตอบที่ถูกคือ ${formatOhm(quizState.val)}`}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  แถบสี: {quizState.bands.slice(0, -1).map((c) => `${c.th} (${c.n})`).join(' • ')}
                </div>
              </div>
              <button type="button" onClick={() => generateQuiz(quizBands)} className="btn-w px-4 py-2 text-xs">
                ข้อถัดไป →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AcademicTools({ toolId }) {
  if (toolId === 'converter') return <AdvancedUnitConverter />;
  if (toolId === 'solver') return <MatrixSolver />;
  if (toolId === 'resistor') return <ResistorCalcReal />;
  if (toolId === 'grade_crisis') return <GradeCrisisManager />;
  if (toolId === 'gacha') return <GachaSimulator />;
  if (toolId === 'projectile') return <InteractiveProjectile />;
  if (toolId === 'finance') return <FinancialReality />;
  if (toolId === 'math_latex') return <MathSymbolBuilder />;
  return null;
}