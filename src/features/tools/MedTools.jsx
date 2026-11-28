import React, { useState } from 'react';

const MedicalDisclaimer = () => (
  <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/35 text-[10px] text-amber-200/90 leading-relaxed flex items-start gap-2">
    <i className="fas fa-exclamation-triangle text-amber-400 mt-0.5 shrink-0"></i>
    <span>
      <b>หมายเหตุทางการแพทย์:</b> เครื่องมือนี้จัดทำขึ้นเพื่อการศึกษาและช่วยคำนวณเบื้องต้นเท่านั้น
      ควรตรวจสอบซ้ำกับแนวทางเวชปฏิบัติ (Guidelines), ข้อมูลยา และดุลยพินิจทางคลินิกก่อนนำไปใช้กับผู้ป่วยจริงเสมอ
    </span>
  </div>
);

export const RenalWeightSuite = () => {
  const [patientMode, setPatientMode] = useState('adult'); // 'adult' | 'pediatric'
  const [sex, setSex] = useState('male'); // 'male' | 'female'
  const [age, setAge] = useState('55');
  const [weight, setWeight] = useState('72'); // kg
  const [height, setHeight] = useState('168'); // cm
  const [scr, setScr] = useState('1.2');
  const [scrUnit, setScrUnit] = useState('mgdl'); // 'mgdl' | 'umol'
  const [cgWeightChoice, setCgWeightChoice] = useState('auto'); // 'auto' | 'abw' | 'ibw' | 'adjbw'
  const [showSteps, setShowSteps] = useState(true);
  const [copied, setCopied] = useState(false);

  const ageNum = parseFloat(age) || 0;
  const wt = parseFloat(weight) || 0;
  const ht = parseFloat(height) || 0;
  const scrRaw = parseFloat(scr) || 0;
  const scrMgDl = scrUnit === 'mgdl' ? scrRaw : scrRaw / 88.4;

  const isValid = wt > 0 && ht > 0 && scrMgDl > 0 && (patientMode === 'pediatric' || ageNum > 0);

  // 1. Body Metrics: BMI, BSA, IBW, AdjBW
  const htM = ht / 100;
  const bmi = htM > 0 ? wt / (htM * htM) : 0;

  const bmiAsia = (() => {
    if (bmi <= 0) return { label: '-', cls: 'text-slate-400 border-[#1E3A5F]' };
    if (bmi < 18.5) return { label: 'ผอม / น้ำหนักน้อย (<18.5)', cls: 'text-sky-300 border-sky-500/50 bg-sky-950/30' };
    if (bmi < 23.0) return { label: 'ปกติ / สมส่วน (18.5–22.9)', cls: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/30' };
    if (bmi < 25.0) return { label: 'ท้วม / น้ำหนักเกิน (23.0–24.9)', cls: 'text-amber-300 border-amber-500/50 bg-amber-950/30' };
    if (bmi < 30.0) return { label: 'อ้วนระดับ 1 (25.0–29.9)', cls: 'text-orange-300 border-orange-500/50 bg-orange-950/30' };
    return { label: 'อ้วนระดับ 2 (≥30.0)', cls: 'text-red-300 border-red-500/50 bg-red-950/35' };
  })();

  const bsaMosteller = wt > 0 && ht > 0 ? Math.sqrt((ht * wt) / 3600) : 0;
  const bsaDuBois = wt > 0 && ht > 0 ? 0.007184 * Math.pow(wt, 0.425) * Math.pow(ht, 0.725) : 0;

  // Devine Formula (cm -> inches)
  const htIn = ht / 2.54;
  const ibwRaw = (sex === 'male' ? 50 : 45.5) + 2.3 * (htIn - 60);
  const ibw = Math.max(0, ibwRaw);
  const adjBw = ibw + 0.4 * (wt - ibw);
  const pctIbw = ibw > 0 ? (wt / ibw) * 100 : 100;
  const shortStatureWarn = patientMode === 'adult' && ht > 0 && ht < 152.4;

  // Auto Weight Selection for Cockcroft-Gault (Pharmacy Standard)
  const autoWeightInfo = (() => {
    if (ibw <= 0 || wt < ibw) {
      return { key: 'abw', label: 'Actual BW (ABW)', val: wt, reason: 'น้ำหนักตัวจริงน้อยกว่า IBW → ใช้น้ำหนักตัวจริง' };
    }
    if (wt >= ibw * 1.2) {
      return { key: 'adjbw', label: 'Adjusted BW (AdjBW)', val: adjBw, reason: `น้ำหนักตัวจริง ≥ 120% ของ IBW (${pctIbw.toFixed(0)}%) → ใช้ AdjBW (0.4)` };
    }
    return { key: 'ibw', label: 'Ideal BW (IBW)', val: ibw, reason: `น้ำหนักตัวจริงอยู่ในช่วง 100–120% ของ IBW (${pctIbw.toFixed(0)}%) → ใช้ IBW` };
  })();

  const cgWeightUsed =
    cgWeightChoice === 'auto'
      ? autoWeightInfo.val
      : cgWeightChoice === 'abw'
        ? wt
        : cgWeightChoice === 'ibw'
          ? ibw
          : adjBw;

  const cgWeightLabel =
    cgWeightChoice === 'auto'
      ? `${autoWeightInfo.label} (Auto)`
      : cgWeightChoice === 'abw'
        ? 'Actual BW (ABW)'
        : cgWeightChoice === 'ibw'
          ? 'Ideal BW (IBW)'
          : 'Adjusted BW (AdjBW)';

  const calcCG = (wUse) => {
    if (scrMgDl <= 0 || ageNum <= 0 || wUse <= 0) return 0;
    const base = ((140 - ageNum) * wUse) / (72 * scrMgDl);
    return sex === 'female' ? base * 0.85 : base;
  };

  const crclSelected = calcCG(cgWeightUsed);
  const crclAbw = calcCG(wt);
  const crclIbw = calcCG(ibw);
  const crclAdj = calcCG(adjBw);

  // 2. CKD-EPI 2021 (Race-free Creatinine Equation)
  const egfrCkdEpi = (() => {
    if (scrMgDl <= 0 || ageNum <= 0) return 0;
    const kappa = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.241 : -0.302;
    const sexFactor = sex === 'female' ? 1.012 : 1.0;
    const ratio = scrMgDl / kappa;
    return 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.2) * Math.pow(0.9938, ageNum) * sexFactor;
  })();

  const egfrNonIndexed = bsaMosteller > 0 ? egfrCkdEpi * (bsaMosteller / 1.73) : 0;

  // 3. Bedside Schwartz (2009) for Pediatric (< 18 yrs)
  const egfrSchwartz = scrMgDl > 0 && ht > 0 ? (0.413 * ht) / scrMgDl : 0;

  const primaryGfr = patientMode === 'adult' ? egfrCkdEpi : egfrSchwartz;

  const getCkdStage = (gfr) => {
    if (gfr >= 90) return { stage: 'G1', title: 'ปกติหรือสูง (≥90)', desc: 'การทำงานของไตอยู่ในเกณฑ์ปกติ (หากไม่มีโปรตีนรั่ว/ความผิดปกติของโครงสร้างไต)', cls: 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300', bar: 'bg-emerald-400', pct: 100 };
    if (gfr >= 60) return { stage: 'G2', title: 'ลดลงเล็กน้อย (60–89)', desc: 'ไตทำงานลดลงเล็กน้อย ยาส่วนใหญ่ยังใช้ขนาดปกติได้ แต่ควรติดตามยาเสี่ยงพิษต่อไต', cls: 'bg-sky-950/40 border-sky-500/60 text-sky-300', bar: 'bg-sky-400', pct: 78 };
    if (gfr >= 45) return { stage: 'G3a', title: 'ลดลงเล็กน้อย–ปานกลาง (45–59)', desc: 'เริ่มต้องพิจารณาปรับขนาดยาบางกลุ่ม (เช่น Metformin, ยาปฏิชีวนะบางชนิด, DOACs)', cls: 'bg-amber-950/40 border-amber-500/60 text-amber-300', bar: 'bg-amber-400', pct: 58 };
    if (gfr >= 30) return { stage: 'G3b', title: 'ลดลงปานกลาง–มาก (30–44)', desc: 'ต้องปรับขนาดยาที่ขับออกทางไตอย่างเคร่งครัด หลีกเลี่ยง NSAIDs และสารทึบรังสีหากไม่จำเป็น', cls: 'bg-orange-950/40 border-orange-500/60 text-orange-300', bar: 'bg-orange-400', pct: 40 };
    if (gfr >= 15) return { stage: 'G4', title: 'ลดลงมาก (15–29)', desc: 'ห้ามใช้ยาหลายชนิดที่ขับทางไต (เช่น Metformin) ต้องปรับขนาดยาทุกตัวและเตรียมแผนบำบัดทดแทนไต', cls: 'bg-red-950/45 border-red-500/60 text-red-300', bar: 'bg-red-500', pct: 22 };
    return { stage: 'G5', title: 'ไตวายระยะสุดท้าย (<15)', desc: 'Kidney Failure — ต้องปรับขนาดยาตามเกณฑ์ ESRD / Hemodialysis / CAPD อย่างระมัดระวัง', cls: 'bg-red-950/70 border-red-500 text-red-200', bar: 'bg-red-600', pct: 10 };
  };

  const ckd = getCkdStage(primaryGfr);

  const handleCopySummary = () => {
    const lines = [
      `=== Renal Function & Body Metrics Summary ===`,
      `Patient: ${patientMode === 'adult' ? 'Adult' : 'Pediatric'} | ${sex === 'male' ? 'Male' : 'Female'} | Age ${age} y | Wt ${wt} kg | Ht ${ht} cm | SCr ${scrMgDl.toFixed(2)} mg/dL`,
      `BMI: ${bmi.toFixed(1)} kg/m² (${bmiAsia.label}) | BSA (Mosteller): ${bsaMosteller.toFixed(2)} m²`,
      ...(patientMode === 'adult'
        ? [
            `IBW: ${ibw.toFixed(1)} kg (${pctIbw.toFixed(0)}% IBW) | AdjBW: ${adjBw.toFixed(1)} kg`,
            `CrCl (Cockcroft-Gault, ${cgWeightLabel}): ${crclSelected.toFixed(1)} mL/min`,
            `eGFR (CKD-EPI 2021): ${egfrCkdEpi.toFixed(1)} mL/min/1.73m² | Non-indexed: ${egfrNonIndexed.toFixed(1)} mL/min`,
            `KDIGO Stage: ${ckd.stage} — ${ckd.title}`
          ]
        : [
            `eGFR (Bedside Schwartz): ${egfrSchwartz.toFixed(1)} mL/min/1.73m²`,
            `KDIGO Stage: ${ckd.stage} — ${ckd.title}`
          ])
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      {/* แผงกรอกข้อมูลผู้ป่วย */}
      <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-3">
          <div className="font-bold text-sm text-sky-400 flex items-center gap-2">
            <i className="fas fa-kidneys"></i>
            <span>Renal Function &amp; Weight Suite</span>
          </div>
          <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold text-[11px]">
            <button
              type="button"
              onClick={() => { setPatientMode('adult'); if (ageNum < 18) setAge('55'); }}
              className={`px-3 py-1 rounded-lg transition-colors ${patientMode === 'adult' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ผู้ใหญ่ (≥18 ปี)
            </button>
            <button
              type="button"
              onClick={() => { setPatientMode('pediatric'); setAge('6'); setWeight('20'); setHeight('115'); setScr('0.5'); }}
              className={`px-3 py-1 rounded-lg transition-colors ${patientMode === 'pediatric' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'}`}
            >
              เด็ก (Schwartz)
            </button>
          </div>
        </div>

        {/* แถบเพศ + หน่วย SCr */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">เพศ (Sex)</label>
            <div className="grid grid-cols-2 gap-1 bg-[#050811] p-1 rounded-xl border border-[#1E3A5F]">
              <button type="button" onClick={() => setSex('male')} className={`py-1.5 rounded-lg font-bold ${sex === 'male' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>ชาย</button>
              <button type="button" onClick={() => setSex('female')} className={`py-1.5 rounded-lg font-bold ${sex === 'female' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}>หญิง</button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">อายุ (ปี)</label>
            <input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} className="inp w-full font-mono text-center py-2" />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">น้ำหนักจริง (kg)</label>
            <input type="number" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="inp w-full font-mono text-center py-2" />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">ส่วนสูง (cm)</label>
            <input type="number" min="0" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} className="inp w-full font-mono text-center py-2" />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-amber-300 font-bold">SCr</label>
              <button
                type="button"
                onClick={() => {
                  if (scrUnit === 'mgdl') {
                    setScrUnit('umol');
                    setScr((scrRaw * 88.4).toFixed(0));
                  } else {
                    setScrUnit('mgdl');
                    setScr((scrRaw / 88.4).toFixed(2));
                  }
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[#050811] border border-amber-500/40 text-amber-300 font-mono font-bold"
                title="คลิกสลับหน่วย SCr"
              >
                {scrUnit === 'mgdl' ? 'mg/dL ⇄' : 'µmol/L ⇄'}
              </button>
            </div>
            <input type="number" min="0" step={scrUnit === 'mgdl' ? '0.05' : '1'} value={scr} onChange={(e) => setScr(e.target.value)} className="inp w-full font-mono text-center py-2 border-amber-500/50 bg-amber-950/15 text-amber-200" />
          </div>
        </div>

        {/* ตัวเลือกน้ำหนักสำหรับ Cockcroft-Gault (โหมดผู้ใหญ่) */}
        {patientMode === 'adult' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E3A5F]/60">
            <span className="text-[11px] text-slate-300 font-bold">น้ำหนักที่ใช้คำนวณ CrCl (Cockcroft-Gault):</span>
            <div className="flex flex-wrap gap-1 bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] text-[10px] font-bold">
              {[
                ['auto', '✨ Auto (แนะนำ)'],
                ['abw', 'Actual BW'],
                ['ibw', 'IBW'],
                ['adjbw', 'AdjBW']
              ].map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCgWeightChoice(k)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${cgWeightChoice === k ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ผลลัพธ์หลัก */}
      {!isValid ? (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">
          ⚠️ กรุณากรอกอายุ น้ำหนัก ส่วนสูง และค่า SCr ให้มากกว่า 0
        </div>
      ) : (
        <>
          <div className="bg-[#050811] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-sky-400 text-sm">📊 ผลประเมินการทำงานของไต (Renal Function)</span>
              <button
                type="button"
                onClick={handleCopySummary}
                className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                  copied ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-[#0B1325] text-sky-300 border-[#1E3A5F] hover:border-sky-400'
                }`}
              >
                {copied ? '✓ คัดลอกสรุปแล้ว' : '📋 คัดลอกสรุปเคส'}
              </button>
            </div>

            {patientMode === 'adult' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* CrCl Cockcroft-Gault */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2547]/80 to-[#0B1325] border border-sky-500/50 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">CrCl (Cockcroft-Gault)</div>
                      <div className="text-[10px] text-slate-400">นิยมใช้ปรับขนาดยาตามเอกสารกำกับยา</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-sky-950 border border-sky-500/40 text-sky-200 text-[10px] font-bold">
                      {cgWeightLabel}
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-400">
                    {crclSelected.toFixed(1)} <span className="text-sm text-slate-400 font-sans">mL/min</span>
                  </div>
                  <div className="text-[10px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg">
                    💡 {autoWeightInfo.reason}
                  </div>
                  {/* ตารางเทียบ CrCl ทั้ง 3 น้ำหนัก */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[10px]">
                    <div className="p-1.5 rounded-lg bg-[#050811] border border-[#1E3A5F]">
                      <div className="text-slate-400 font-sans">ใช้ ABW</div>
                      <div className="font-bold text-white">{crclAbw.toFixed(1)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#050811] border border-[#1E3A5F]">
                      <div className="text-slate-400 font-sans">ใช้ IBW</div>
                      <div className="font-bold text-white">{crclIbw.toFixed(1)}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#050811] border border-[#1E3A5F]">
                      <div className="text-slate-400 font-sans">ใช้ AdjBW</div>
                      <div className="font-bold text-white">{crclAdj.toFixed(1)}</div>
                    </div>
                  </div>
                </div>

                {/* eGFR CKD-EPI 2021 */}
                <div className="p-4 rounded-2xl bg-[#0B1325] border border-emerald-500/40 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">eGFR (CKD-EPI 2021)</div>
                        <div className="text-[10px] text-slate-400">สูตรมาตรฐาน KDIGO (ไม่ใช้เชื้อชาติ)</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-200 text-[10px] font-mono font-bold">
                        {ckd.stage}
                      </span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 mt-2">
                      {egfrCkdEpi.toFixed(1)} <span className="text-xs text-slate-400 font-sans">mL/min/1.73m²</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Non-indexed eGFR (ปรับตาม BSA จริง)</div>
                      <div className="text-[9px] text-slate-500">ใช้ปรับขนาดยาในคนตัวเล็กมาก/อ้วนมาก (BSA {bsaMosteller.toFixed(2)} m²)</div>
                    </div>
                    <div className="font-mono text-base font-bold text-sky-300 shrink-0">
                      {egfrNonIndexed.toFixed(1)} <span className="text-[10px]">mL/min</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Pediatric Bedside Schwartz */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2547]/80 to-[#0B1325] border border-amber-500/50 text-center space-y-2">
                <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">Pediatric eGFR — Bedside Schwartz (2009)</div>
                <div className="text-4xl font-mono font-bold text-amber-400">
                  {egfrSchwartz.toFixed(1)} <span className="text-sm text-slate-400 font-sans">mL/min/1.73m²</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  สูตร: eGFR = 0.413 × Height ({ht} cm) ÷ SCr ({scrMgDl.toFixed(2)} mg/dL)
                </div>
              </div>
            )}

            {/* แถบระดับ CKD Stage (KDIGO) */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${ckd.cls}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-xs">
                  KDIGO Stage {ckd.stage}: {ckd.title}
                </span>
                <span className="font-mono text-[11px] font-bold">eGFR = {primaryGfr.toFixed(1)}</span>
              </div>
              <div className="h-2 w-full bg-[#050811] rounded-full overflow-hidden border border-white/10">
                <div className={`h-full transition-all duration-500 ${ckd.bar}`} style={{ width: `${ckd.pct}%` }}></div>
              </div>
              <div className="text-[11px] opacity-90">{ckd.desc}</div>
            </div>

            {/* Body Metrics Grid: BMI / BSA / IBW / AdjBW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F] space-y-1">
                <div className="text-[10px] text-slate-400 font-sans font-bold">BMI (เกณฑ์เอเชีย)</div>
                <div className="text-xl font-bold text-white">{bmi.toFixed(1)} <span className="text-[10px] text-slate-400">kg/m²</span></div>
                <div className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded border inline-block ${bmiAsia.cls}`}>
                  {bmiAsia.label}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F] space-y-1">
                <div className="text-[10px] text-slate-400 font-sans font-bold">BSA (Mosteller)</div>
                <div className="text-xl font-bold text-sky-300">{bsaMosteller.toFixed(2)} <span className="text-[10px] text-slate-400">m²</span></div>
                <div className="text-[10px] text-slate-500">DuBois: {bsaDuBois.toFixed(2)} m²</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F] space-y-1">
                <div className="text-[10px] text-slate-400 font-sans font-bold">IBW (Devine)</div>
                <div className="text-xl font-bold text-emerald-300">{ibw.toFixed(1)} <span className="text-[10px] text-slate-400">kg</span></div>
                <div className="text-[10px] text-slate-400">ABW = {pctIbw.toFixed(0)}% ของ IBW</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F] space-y-1">
                <div className="text-[10px] text-slate-400 font-sans font-bold">AdjBW (Factor 0.4)</div>
                <div className="text-xl font-bold text-amber-300">{adjBw.toFixed(1)} <span className="text-[10px] text-slate-400">kg</span></div>
                <div className="text-[10px] text-slate-500">ใช้เมื่อ ABW ≥ 120% IBW</div>
              </div>
            </div>

            {shortStatureWarn && (
              <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/45 text-amber-200 text-[11px]">
                ⚠️ ส่วนสูงต่ำกว่า 152.4 cm (5 ฟุต) — สูตร Devine IBW อาจประเมินค่าต่ำกว่าความเป็นจริง ควรพิจารณาใช้น้ำหนักตัวจริงหรือ eGFR ร่วมด้วย
              </div>
            )}

            {/* แสดงวิธีทำทีละขั้น */}
            <div className="border-t border-[#1E3A5F] pt-3">
              <button
                type="button"
                onClick={() => setShowSteps((v) => !v)}
                className="text-sky-300 hover:text-sky-200 font-bold text-xs flex items-center gap-1.5"
              >
                <i className={`fas ${showSteps ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                <span>{showSteps ? 'ซ่อนวิธีคำนวณ (Hide Steps)' : '👁️ แสดงสูตรและวิธีแทนค่าทีละขั้น'}</span>
              </button>

              {showSteps && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-[#0B1325] border border-dashed border-sky-500/40 font-mono text-[11px] text-slate-300 space-y-2 leading-relaxed">
                  <div>
                    <span className="text-sky-400 font-bold">1. BMI &amp; BSA:</span>{' '}
                    BMI = {wt} / ({htM.toFixed(2)})² = <b className="text-white">{bmi.toFixed(2)} kg/m²</b> |{' '}
                    BSA = √({ht} × {wt} / 3600) = <b className="text-white">{bsaMosteller.toFixed(3)} m²</b>
                  </div>
                  {patientMode === 'adult' ? (
                    <>
                      <div>
                        <span className="text-sky-400 font-bold">2. IBW &amp; AdjBW:</span>{' '}
                        ส่วนสูง = {htIn.toFixed(2)} นิ้ว → IBW = {sex === 'male' ? '50' : '45.5'} + 2.3 × ({htIn.toFixed(2)} − 60) = <b className="text-emerald-300">{ibw.toFixed(2)} kg</b><br />
                        AdjBW = {ibw.toFixed(2)} + 0.4 × ({wt} − {ibw.toFixed(2)}) = <b className="text-amber-300">{adjBw.toFixed(2)} kg</b>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">3. Cockcroft-Gault CrCl:</span>{' '}
                        [(140 − {ageNum}) × {cgWeightUsed.toFixed(1)}] ÷ (72 × {scrMgDl.toFixed(2)}){sex === 'female' ? ' × 0.85' : ''} = <b className="text-amber-400">{crclSelected.toFixed(2)} mL/min</b>
                      </div>
                      <div>
                        <span className="text-sky-400 font-bold">4. CKD-EPI 2021:</span>{' '}
                        κ = {sex === 'female' ? '0.7' : '0.9'}, α = {sex === 'female' ? '-0.241' : '-0.302'} →{' '}
                        eGFR = <b className="text-emerald-400">{egfrCkdEpi.toFixed(2)} mL/min/1.73m²</b>{' '}
                        (Non-indexed = {egfrCkdEpi.toFixed(1)} × {bsaMosteller.toFixed(2)} / 1.73 = <b className="text-sky-300">{egfrNonIndexed.toFixed(1)} mL/min</b>)
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="text-sky-400 font-bold">2. Bedside Schwartz (2009):</span>{' '}
                      eGFR = (0.413 × {ht}) ÷ {scrMgDl.toFixed(2)} = <b className="text-amber-400">{egfrSchwartz.toFixed(2)} mL/min/1.73m²</b>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <MedicalDisclaimer />
        </>
      )}
    </div>
  );
};
export const AbgElectrolyteAnalyzer = () => {
  const [subTab, setSubTab] = useState('abg'); // 'abg' | 'electrolyte'

  // --- SUB-TAB 1: ABG & ANION GAP ---
  const [phIn, setPhIn] = useState('7.22');
  const [pco2In, setPco2In] = useState('24');
  const [hco3In, setHco3In] = useState('10');
  const [naIn, setNaIn] = useState('138');
  const [clIn, setClIn] = useState('100');
  const [albIn, setAlbIn] = useState('3.5');
  const [showAbgSteps, setShowAbgSteps] = useState(true);
  const [copiedAbg, setCopiedAbg] = useState(false);

  const ph = parseFloat(phIn);
  const pco2 = parseFloat(pco2In);
  const hco3 = parseFloat(hco3In);
  const na = parseFloat(naIn);
  const cl = parseFloat(clIn);
  const alb = parseFloat(albIn);
  const abgValid = ![ph, pco2, hco3].some(Number.isNaN) && ph > 6 && ph < 8 && pco2 > 0 && hco3 > 0;
  const hasLytes = ![na, cl].some(Number.isNaN) && na > 0 && cl > 0;
  const albUsed = !Number.isNaN(alb) && alb > 0 ? alb : 4.0;

  const abgResult = (() => {
    if (!abgValid) return null;

    // Step 1: pH status
    let phStatus = 'Normal pH (7.35–7.45)';
    let phColor = 'text-emerald-400';
    if (ph < 7.35) { phStatus = 'Acidemia (pH < 7.35)'; phColor = 'text-red-400'; }
    else if (ph > 7.45) { phStatus = 'Alkalemia (pH > 7.45)'; phColor = 'text-sky-400'; }

    // Step 2: Primary Disorder
    let primary = 'Normal Acid-Base';
    let primaryType = 'normal'; // 'met_acid' | 'met_alk' | 'resp_acid' | 'resp_alk' | 'mixed_acid' | 'mixed_alk' | 'normal' | 'compensated_mixed'

    if (ph < 7.35) {
      if (pco2 > 45 && hco3 < 22) { primary = 'Mixed Respiratory + Metabolic Acidosis'; primaryType = 'mixed_acid'; }
      else if (pco2 > 45) { primary = 'Primary Respiratory Acidosis'; primaryType = 'resp_acid'; }
      else if (hco3 < 22) { primary = 'Primary Metabolic Acidosis'; primaryType = 'met_acid'; }
      else { primary = 'Acidemia (ค่า PaCO₂/HCO₃⁻ ใกล้เกณฑ์ปกติ — ตรวจซ้ำ)'; primaryType = 'normal'; }
    } else if (ph > 7.45) {
      if (pco2 < 35 && hco3 > 26) { primary = 'Mixed Respiratory + Metabolic Alkalosis'; primaryType = 'mixed_alk'; }
      else if (pco2 < 35) { primary = 'Primary Respiratory Alkalosis'; primaryType = 'resp_alk'; }
      else if (hco3 > 26) { primary = 'Primary Metabolic Alkalosis'; primaryType = 'met_alk'; }
      else { primary = 'Alkalemia (ค่า PaCO₂/HCO₃⁻ ใกล้เกณฑ์ปกติ — ตรวจซ้ำ)'; primaryType = 'normal'; }
    } else {
      // pH 7.35 - 7.45
      if (pco2 >= 35 && pco2 <= 45 && hco3 >= 22 && hco3 <= 26) {
        primary = 'Normal ABG (ปกติ)';
        primaryType = 'normal';
      } else if (ph < 7.4) {
        if (pco2 > 45) { primary = 'Compensated Respiratory Acidosis (หรือ Mixed)'; primaryType = 'resp_acid'; }
        else if (hco3 < 22) { primary = 'Compensated Metabolic Acidosis (หรือ Mixed)'; primaryType = 'met_acid'; }
        else { primary = 'Mixed / Compensated Disorder'; primaryType = 'compensated_mixed'; }
      } else {
        if (pco2 < 35) { primary = 'Compensated Respiratory Alkalosis (หรือ Mixed)'; primaryType = 'resp_alk'; }
        else if (hco3 > 26) { primary = 'Compensated Metabolic Alkalosis (หรือ Mixed)'; primaryType = 'met_alk'; }
        else { primary = 'Mixed / Compensated Disorder'; primaryType = 'compensated_mixed'; }
      }
    }

    // Step 3: Compensation Check
    let compFormula = '-';
    let compExpected = '-';
    let compStatus = 'ไม่จำเป็นต้องคำนวณการชดเชย';
    let secondaryRespOrMet = null;

    if (primaryType === 'met_acid') {
      const exp = 1.5 * hco3 + 8;
      const lo = exp - 2;
      const hi = exp + 2;
      compFormula = "Winter's Formula: Expected PaCO₂ = 1.5(HCO₃⁻) + 8 ± 2";
      compExpected = `${lo.toFixed(1)} – ${hi.toFixed(1)} mmHg (กลาง ${exp.toFixed(1)})`;
      if (pco2 >= lo && pco2 <= hi) {
        compStatus = 'Appropriate Respiratory Compensation (ชดเชยเหมาะสม)';
      } else if (pco2 > hi) {
        compStatus = `PaCO₂ สูงกว่าที่คาด (${pco2} > ${hi.toFixed(1)}) → มี Concurrent Respiratory Acidosis ร่วมด้วย`;
        secondaryRespOrMet = 'Concurrent Respiratory Acidosis';
      } else {
        compStatus = `PaCO₂ ต่ำกว่าที่คาด (${pco2} < ${lo.toFixed(1)}) → มี Concurrent Respiratory Alkalosis ร่วมด้วย`;
        secondaryRespOrMet = 'Concurrent Respiratory Alkalosis';
      }
    } else if (primaryType === 'met_alk') {
      const exp = 40 + 0.7 * (hco3 - 24);
      const lo = exp - 2;
      const hi = exp + 2;
      compFormula = 'Expected PaCO₂ = 40 + 0.7 × (HCO₃⁻ − 24) ± 2';
      compExpected = `${lo.toFixed(1)} – ${hi.toFixed(1)} mmHg`;
      if (pco2 >= lo && pco2 <= hi) {
        compStatus = 'Appropriate Respiratory Compensation (ชดเชยเหมาะสม)';
      } else if (pco2 > hi) {
        compStatus = `PaCO₂ สูงกว่าที่คาด → มี Concurrent Respiratory Acidosis ร่วมด้วย`;
        secondaryRespOrMet = 'Concurrent Respiratory Acidosis';
      } else {
        compStatus = `PaCO₂ ต่ำกว่าที่คาด → มี Concurrent Respiratory Alkalosis ร่วมด้วย`;
        secondaryRespOrMet = 'Concurrent Respiratory Alkalosis';
      }
    } else if (primaryType === 'resp_acid') {
      const dPco2 = (pco2 - 40) / 10;
      const acuteHco3 = 24 + 1 * dPco2;
      const chronicHco3 = 24 + 3.5 * dPco2;
      compFormula = 'Acute: +1 mEq/L ต่อ ΔPaCO₂ 10 | Chronic: +3.5–4 mEq/L ต่อ ΔPaCO₂ 10';
      compExpected = `Acute ≈ ${acuteHco3.toFixed(1)} | Chronic ≈ ${chronicHco3.toFixed(1)} mEq/L`;
      if (Math.abs(hco3 - acuteHco3) <= 2) compStatus = 'เข้าได้กับ Acute Respiratory Acidosis';
      else if (Math.abs(hco3 - chronicHco3) <= 2.5) compStatus = 'เข้าได้กับ Chronic Respiratory Acidosis (ไตชดเชยแล้ว)';
      else if (hco3 > chronicHco3 + 2.5) {
        compStatus = 'HCO₃⁻ สูงกว่าเกณฑ์ Chronic → มี Concurrent Metabolic Alkalosis ร่วมด้วย';
        secondaryRespOrMet = 'Concurrent Metabolic Alkalosis';
      } else if (hco3 < acuteHco3 - 2) {
        compStatus = 'HCO₃⁻ ต่ำกว่าเกณฑ์ Acute → มี Concurrent Metabolic Acidosis ร่วมด้วย';
        secondaryRespOrMet = 'Concurrent Metabolic Acidosis';
      } else {
        compStatus = 'อยู่ระหว่าง Acute กับ Chronic (Acute-on-Chronic หรือกำลังปรับชดเชย)';
      }
    } else if (primaryType === 'resp_alk') {
      const dPco2 = (40 - pco2) / 10;
      const acuteHco3 = 24 - 2 * dPco2;
      const chronicHco3 = 24 - 4.5 * dPco2;
      compFormula = 'Acute: −2 mEq/L ต่อ ΔPaCO₂ 10 | Chronic: −4–5 mEq/L ต่อ ΔPaCO₂ 10';
      compExpected = `Acute ≈ ${acuteHco3.toFixed(1)} | Chronic ≈ ${chronicHco3.toFixed(1)} mEq/L`;
      if (Math.abs(hco3 - acuteHco3) <= 2) compStatus = 'เข้าได้กับ Acute Respiratory Alkalosis';
      else if (Math.abs(hco3 - chronicHco3) <= 2.5) compStatus = 'เข้าได้กับ Chronic Respiratory Alkalosis';
      else if (hco3 < chronicHco3 - 2.5) {
        compStatus = 'HCO₃⁻ ต่ำกว่าเกณฑ์ Chronic → มี Concurrent Metabolic Acidosis ร่วมด้วย';
        secondaryRespOrMet = 'Concurrent Metabolic Acidosis';
      } else if (hco3 > acuteHco3 + 2) {
        compStatus = 'HCO₃⁻ สูงกว่าเกณฑ์ Acute → มี Concurrent Metabolic Alkalosis ร่วมด้วย';
        secondaryRespOrMet = 'Concurrent Metabolic Alkalosis';
      } else {
        compStatus = 'อยู่ระหว่าง Acute กับ Chronic (กำลังปรับชดเชย)';
      }
    } else if (primaryType === 'mixed_acid' || primaryType === 'mixed_alk') {
      compFormula = 'PaCO₂ และ HCO₃⁻ ผิดปกติไปในทิศทางเดียวกัน';
      compExpected = '-';
      compStatus = 'ภาวะกรด-ด่างผิดปกติแบบผสม (Mixed Disorder)';
    }

    // Step 4 & 5: Anion Gap, Albumin Correction, Delta-Delta
    let ag = null;
    let corrAg = null;
    let agType = null;
    let deltaRatio = null;
    let corrHco3 = null;
    let deltaText = null;

    if (hasLytes) {
      ag = na - (cl + hco3);
      corrAg = ag + 2.5 * (4.0 - albUsed);
      if (corrAg > 12) {
        agType = 'HAGMA';
        const dAg = corrAg - 12;
        const dHco3 = 24 - hco3;
        corrHco3 = hco3 + dAg;
        if (dHco3 <= 0) {
          deltaRatio = Infinity;
          deltaText = `Corrected HCO₃⁻ = ${corrHco3.toFixed(1)} (>26) → มี Concurrent Metabolic Alkalosis ซ่อนอยู่ชัดเจน`;
        } else {
          deltaRatio = dAg / dHco3;
          if (deltaRatio < 1) {
            deltaText = `Δ/Δ = ${deltaRatio.toFixed(2)} (<1.0) | Corr HCO₃⁻ = ${corrHco3.toFixed(1)} → HAGMA ร่วมกับ NAGMA`;
          } else if (deltaRatio <= 2) {
            deltaText = `Δ/Δ = ${deltaRatio.toFixed(2)} (1.0–2.0) | Corr HCO₃⁻ = ${corrHco3.toFixed(1)} → Pure HAGMA`;
          } else {
            deltaText = `Δ/Δ = ${deltaRatio.toFixed(2)} (>2.0) | Corr HCO₃⁻ = ${corrHco3.toFixed(1)} → HAGMA ร่วมกับ Metabolic Alkalosis (หรือมี HCO₃⁻ สูงเดิม)`;
          }
        }
      } else if (primaryType === 'met_acid' || primaryType === 'mixed_acid' || secondaryRespOrMet === 'Concurrent Metabolic Acidosis') {
        agType = 'NAGMA';
      } else {
        agType = 'NORMAL_AG';
      }
    }

    // Build Final Clinical Impression
    const impressions = [primary];
    if (agType === 'HAGMA') {
      if (primaryType === 'normal') impressions[0] = 'Hidden High Anion Gap Metabolic Acidosis (HAGMA)';
      else if (primaryType === 'met_acid') impressions[0] = `${primary} (HAGMA)`;
      else impressions.push('Hidden HAGMA (Corrected AG > 12)');
    } else if (agType === 'NAGMA' && primaryType === 'met_acid') {
      impressions[0] = `${primary} (NAGMA)`;
    }
    if (secondaryRespOrMet) impressions.push(secondaryRespOrMet);
    if (deltaRatio !== null) {
      if (deltaRatio < 1) impressions.push('Concurrent NAGMA (จาก Δ/Δ < 1)');
      else if (deltaRatio > 2) impressions.push('Concurrent Metabolic Alkalosis (จาก Δ/Δ > 2)');
    }

    return {
      phStatus,
      phColor,
      primary,
      primaryType,
      compFormula,
      compExpected,
      compStatus,
      ag,
      corrAg,
      agType,
      deltaRatio,
      corrHco3,
      deltaText,
      impressions
    };
  })();

  const phGaugePct = abgValid ? Math.max(0, Math.min(100, ((ph - 7.0) / 0.7) * 100)) : 50;

  // --- SUB-TAB 2: ELECTROLYTE & OSMOLALITY ---
  const [caMeas, setCaMeas] = useState('7.6');
  const [caAlb, setCaAlb] = useState('2.5');

  const [naMeas, setNaMeas] = useState('130');
  const [naGlu, setNaGlu] = useState('520');

  const [fwdWt, setFwdWt] = useState('60');
  const [fwdCurNa, setFwdCurNa] = useState('156');
  const [fwdTargetNa, setFwdTargetNa] = useState('140');
  const [fwdFactor, setFwdFactor] = useState('0.6');

  const [osmNa, setOsmNa] = useState('140');
  const [osmGlu, setOsmGlu] = useState('110');
  const [osmBun, setOsmBun] = useState('18');
  const [osmMeas, setOsmMeas] = useState('310');

  // Calculations for Sub-tab 2
  const corrCa = (parseFloat(caMeas) || 0) + 0.8 * (4.0 - (parseFloat(caAlb) || 4.0));
  const caStatus =
    corrCa < 8.5
      ? { txt: 'Hypocalcemia (<8.5)', cls: 'text-sky-300 bg-sky-950/40 border-sky-500/40' }
      : corrCa > 10.5
        ? { txt: 'Hypercalcemia (>10.5)', cls: 'text-red-300 bg-red-950/40 border-red-500/40' }
        : { txt: 'Normal (8.5–10.5)', cls: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40' };

  const gluNum = parseFloat(naGlu) || 0;
  const naNum = parseFloat(naMeas) || 0;
  const gluExcess = Math.max(0, gluNum - 100) / 100;
  const corrNaKatz = naNum + 1.6 * gluExcess;
  const corrNaHillier = naNum + 2.4 * gluExcess;
  const useHillier = gluNum > 400;

  const fwdWtNum = parseFloat(fwdWt) || 0;
  const fwdCurNum = parseFloat(fwdCurNa) || 0;
  const fwdTgtNum = parseFloat(fwdTargetNa) || 140;
  const fwdFacNum = parseFloat(fwdFactor) || 0.6;
  const tbw = fwdWtNum * fwdFacNum;
  const fwdLiters = fwdTgtNum > 0 && fwdCurNum > fwdTgtNum ? tbw * (fwdCurNum / fwdTgtNum - 1) : 0;
  const minSafeHours = fwdCurNum > fwdTgtNum ? ((fwdCurNum - fwdTgtNum) / 10) * 24 : 0;

  const calcOsm = 2 * (parseFloat(osmNa) || 0) + (parseFloat(osmGlu) || 0) / 18 + (parseFloat(osmBun) || 0) / 2.8;
  const measOsmNum = parseFloat(osmMeas);
  const osmGap = !Number.isNaN(measOsmNum) && osmMeas.trim() !== '' ? measOsmNum - calcOsm : null;

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      {/* แถบสลับโหมดย่อย */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#0B1325] p-1.5 rounded-2xl border border-[#1E3A5F] font-bold">
        <button
          type="button"
          onClick={() => setSubTab('abg')}
          className={`py-2 px-3 rounded-xl transition-all ${subTab === 'abg' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'}`}
        >
          🫁 ABG &amp; Anion Gap (ทีละขั้น)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('electrolyte')}
          className={`py-2 px-3 rounded-xl transition-all ${subTab === 'electrolyte' ? 'bg-amber-400 text-[#050811] shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'}`}
        >
          ⚡ Electrolyte &amp; Osmolality
        </button>
      </div>

      {/* ================= SUB-TAB 1: ABG & ANION GAP ================= */}
      {subTab === 'abg' && (
        <div className="space-y-4">
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-3">
            {/* เคสตัวอย่างสำหรับฝึกอ่าน/ทบทวน */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#1E3A5F]/70">
              <span className="text-[10px] text-slate-400 font-bold">เคสตัวอย่าง:</span>
              {[
                ['DKA (HAGMA)', '7.22', '24', '10', '138', '100', '3.5'],
                ['COPD (Resp Acid)', '7.31', '60', '30', '140', '100', '4.0'],
                ['อาเจียน (Met Alk)', '7.49', '48', '36', '138', '92', '4.0'],
                ['หอบ (Resp Alk)', '7.52', '26', '21', '140', '106', '4.0'],
                ['Mixed HAGMA+Alk', '7.40', '40', '24', '140', '92', '4.0']
              ].map(([lbl, a, b, c, d, e, f]) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => { setPhIn(a); setPco2In(b); setHco3In(c); setNaIn(d); setClIn(e); setAlbIn(f); }}
                  className="px-2.5 py-1 rounded-full bg-[#050811] border border-[#1E3A5F] hover:border-sky-400 text-sky-200 text-[10px] font-bold transition-colors"
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* ช่องกรอกค่า ABG + Electrolytes */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              <div>
                <label className="text-[10px] text-amber-300 font-bold block mb-1">pH (7.35–7.45)</label>
                <input type="number" step="0.01" value={phIn} onChange={(e) => setPhIn(e.target.value)} className="inp w-full font-mono text-center py-2 border-amber-500/40" />
              </div>
              <div>
                <label className="text-[10px] text-sky-300 font-bold block mb-1">PaCO₂ (35–45)</label>
                <input type="number" step="0.5" value={pco2In} onChange={(e) => setPco2In(e.target.value)} className="inp w-full font-mono text-center py-2" />
              </div>
              <div>
                <label className="text-[10px] text-sky-300 font-bold block mb-1">HCO₃⁻ (22–26)</label>
                <input type="number" step="0.5" value={hco3In} onChange={(e) => setHco3In(e.target.value)} className="inp w-full font-mono text-center py-2" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Na⁺ (mEq/L)</label>
                <input type="number" step="1" value={naIn} onChange={(e) => setNaIn(e.target.value)} className="inp w-full font-mono text-center py-2" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Cl⁻ (mEq/L)</label>
                <input type="number" step="1" value={clIn} onChange={(e) => setClIn(e.target.value)} className="inp w-full font-mono text-center py-2" />
              </div>
              <div>
                <label className="text-[10px] text-emerald-300 font-bold block mb-1">Albumin (g/dL)</label>
                <input type="number" step="0.1" value={albIn} onChange={(e) => setAlbIn(e.target.value)} className="inp w-full font-mono text-center py-2" />
              </div>
            </div>
          </div>

          {!abgResult ? (
            <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">
              ⚠️ กรุณากรอกค่า pH (6.0–8.0), PaCO₂ และ HCO₃⁻ ให้ถูกต้อง
            </div>
          ) : (
            <div className="bg-[#050811] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              {/* สรุปการแปลผลหลัก */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2547]/80 to-[#0B1325] border border-sky-500/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-sky-300">Final Interpretation (สรุปการแปลผล)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = [
                        `=== ABG & Anion Gap Interpretation ===`,
                        `ABG: pH ${ph.toFixed(2)}, PaCO2 ${pco2} mmHg, HCO3 ${hco3} mEq/L`,
                        hasLytes ? `Electrolytes: Na ${na}, Cl ${cl}, Albumin ${albUsed.toFixed(1)} | AG ${abgResult.ag.toFixed(1)} (Corrected AG ${abgResult.corrAg.toFixed(1)})` : '',
                        `Impression: ${abgResult.impressions.join(' + ')}`,
                        `Compensation: ${abgResult.compStatus}`,
                        abgResult.deltaText ? `Delta-Delta: ${abgResult.deltaText}` : ''
                      ].filter(Boolean).join('\n');
                      navigator.clipboard.writeText(txt);
                      setCopiedAbg(true);
                      setTimeout(() => setCopiedAbg(false), 2000);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                      copiedAbg ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-[#050811] text-sky-300 border-[#1E3A5F]'
                    }`}
                  >
                    {copiedAbg ? '✓ คัดลอกแล้ว' : '📋 คัดลอกผลแปล'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {abgResult.impressions.map((imp, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-xl font-bold text-xs sm:text-sm border ${
                        idx === 0
                          ? 'bg-amber-400 text-[#050811] border-amber-300'
                          : 'bg-red-950/60 text-red-200 border-red-500/50'
                      }`}
                    >
                      {imp}
                    </span>
                  ))}
                </div>

                {/* pH Visual Bar */}
                <div className="pt-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                    <span>7.00 (กรดรุนแรง)</span>
                    <span className="text-emerald-400 font-bold">7.35–7.45 (ปกติ)</span>
                    <span>7.70 (ด่างรุนแรง)</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gradient-to-r from-red-600 via-emerald-500 to-sky-500 overflow-visible">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#050811] shadow-lg transition-all duration-300"
                      style={{ left: `${phGaugePct}%` }}
                      title={`pH ${ph.toFixed(2)}`}
                    />
                  </div>
                </div>
              </div>

              {/* การ์ด Anion Gap & Delta-Delta */}
              {hasLytes && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center font-mono">
                  <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F]">
                    <div className="text-[10px] text-slate-400 font-sans font-bold">Anion Gap (ปกติ 8–12)</div>
                    <div className="text-xl font-bold text-white mt-0.5">{abgResult.ag.toFixed(1)} <span className="text-[10px] text-slate-400">mEq/L</span></div>
                  </div>
                  <div className={`p-3 rounded-xl border ${abgResult.corrAg > 12 ? 'bg-red-950/35 border-red-500/50' : 'bg-[#0B1325] border-emerald-500/40'}`}>
                    <div className="text-[10px] text-slate-300 font-sans font-bold">Corrected AG (Alb {albUsed.toFixed(1)})</div>
                    <div className={`text-xl font-bold mt-0.5 ${abgResult.corrAg > 12 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {abgResult.corrAg.toFixed(1)} <span className="text-[10px] opacity-75">mEq/L</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B1325] border border-[#1E3A5F]">
                    <div className="text-[10px] text-amber-300 font-sans font-bold">Delta-Delta / Corr HCO₃⁻</div>
                    <div className="text-base font-bold text-amber-300 mt-1">
                      {abgResult.deltaRatio !== null
                        ? `${Number.isFinite(abgResult.deltaRatio) ? abgResult.deltaRatio.toFixed(2) : '∞'} / ${abgResult.corrHco3.toFixed(1)}`
                        : 'ใช้เมื่อ Corr AG > 12'}
                    </div>
                  </div>
                </div>
              )}

              {/* แสดงวิธีวิเคราะห์ทีละขั้น (5 Steps) */}
              <div className="border-t border-[#1E3A5F] pt-3">
                <button
                  type="button"
                  onClick={() => setShowAbgSteps((v) => !v)}
                  className="text-sky-300 hover:text-sky-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <i className={`fas ${showAbgSteps ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                  <span>{showAbgSteps ? 'ซ่อนขั้นตอนการแปลผล 5 ขั้น' : '👁️ แสดงขั้นตอนการแปลผลทีละขั้น (Step-by-Step)'}</span>
                </button>

                {showAbgSteps && (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-[#0B1325] border border-dashed border-sky-500/40 text-[11px] text-slate-300 space-y-2.5 leading-relaxed">
                    <div>
                      <span className="text-sky-400 font-bold">ขั้นที่ 1 — ดู pH:</span>{' '}
                      pH = <b className={`font-mono ${abgResult.phColor}`}>{ph.toFixed(2)}</b> → <b>{abgResult.phStatus}</b>
                    </div>
                    <div>
                      <span className="text-sky-400 font-bold">ขั้นที่ 2 — หาความผิดปกติหลัก (Primary):</span>{' '}
                      PaCO₂ = <b className="font-mono text-white">{pco2}</b>, HCO₃⁻ = <b className="font-mono text-white">{hco3}</b> → <b className="text-amber-300">{abgResult.primary}</b>
                    </div>
                    <div>
                      <span className="text-sky-400 font-bold">ขั้นที่ 3 — เช็กการชดเชย (Compensation):</span><br />
                      <span className="font-mono text-slate-400">{abgResult.compFormula}</span> → ค่าคาดหวัง: <b className="font-mono text-white">{abgResult.compExpected}</b><br />
                      ผลประเมิน: <b className="text-emerald-300">{abgResult.compStatus}</b>
                    </div>
                    {hasLytes && (
                      <div>
                        <span className="text-sky-400 font-bold">ขั้นที่ 4 — Anion Gap &amp; ปรับตาม Albumin:</span><br />
                        <span className="font-mono">
                          AG = {na} − ({cl} + {hco3}) = <b>{abgResult.ag.toFixed(1)}</b> | Corr AG = {abgResult.ag.toFixed(1)} + 2.5 × (4.0 − {albUsed.toFixed(1)}) = <b className={abgResult.corrAg > 12 ? 'text-red-400' : 'text-emerald-400'}>{abgResult.corrAg.toFixed(1)} mEq/L</b>
                        </span>
                        {abgResult.agType === 'HAGMA' && (
                          <div className="mt-1 text-[10px] text-amber-200/90 bg-amber-950/30 border border-amber-500/30 px-2.5 py-1.5 rounded-lg">
                            💡 สาเหตุ HAGMA (GOLDMARK): <b>G</b>lycols, <b>O</b>xoproline, <b>L</b>-lactate, <b>D</b>-lactate, <b>M</b>ethanol, <b>A</b>spirin, <b>R</b>enal failure, <b>K</b>etoacidosis (DKA)
                          </div>
                        )}
                        {abgResult.agType === 'NAGMA' && (
                          <div className="mt-1 text-[10px] text-sky-200/90 bg-sky-950/30 border border-sky-500/30 px-2.5 py-1.5 rounded-lg">
                            💡 สาเหตุ NAGMA (HARDUP): <b>H</b>yperalimentation, <b>A</b>cetazolamide, <b>R</b>TA, <b>D</b>iarrhea, <b>U</b>retero-pelvic shunt, <b>P</b>ost-hypocapnia / Saline overload
                          </div>
                        )}
                      </div>
                    )}
                    {abgResult.deltaText && (
                      <div>
                        <span className="text-sky-400 font-bold">ขั้นที่ 5 — Delta-Delta Ratio (เช็กความผิดปกติซ่อนเร้น):</span><br />
                        <span className="font-mono text-amber-300">{abgResult.deltaText}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: ELECTROLYTE & OSMOLALITY ================= */}
      {subTab === 'electrolyte' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Corrected Calcium */}
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="font-bold text-sm text-sky-400 border-b border-[#1E3A5F] pb-2">
                🦴 Corrected Calcium (ปรับตาม Albumin)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Total Ca (mg/dL)</label>
                  <input type="number" step="0.1" value={caMeas} onChange={(e) => setCaMeas(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Albumin (g/dL)</label>
                  <input type="number" step="0.1" value={caAlb} onChange={(e) => setCaAlb(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-center space-y-1.5">
              <div className="text-[10px] font-mono text-slate-400">Ca + 0.8 × (4.0 − Albumin)</div>
              <div className="text-2xl font-mono font-bold text-amber-400">{corrCa.toFixed(2)} <span className="text-xs text-slate-400">mg/dL</span></div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${caStatus.cls}`}>{caStatus.txt}</span>
            </div>
          </div>

          {/* 2. Corrected Sodium (Hyperglycemia) */}
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="font-bold text-sm text-amber-400 border-b border-[#1E3A5F] pb-2">
                🍬 Corrected Sodium (กรณีน้ำตาลสูง)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Measured Na⁺ (mEq/L)</label>
                  <input type="number" step="1" value={naMeas} onChange={(e) => setNaMeas(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Glucose (mg/dL)</label>
                  <input type="number" step="10" value={naGlu} onChange={(e) => setNaGlu(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className={`p-2.5 rounded-xl border ${!useHillier ? 'bg-emerald-950/35 border-emerald-500/50' : 'bg-[#050811] border-[#1E3A5F]'}`}>
                <div className="text-[9px] text-slate-300 font-sans font-bold">Katz (1.6) {!useHillier && '★ แนะนำ'}</div>
                <div className="text-xl font-bold text-white mt-0.5">{corrNaKatz.toFixed(1)}</div>
                <div className="text-[9px] text-slate-400 font-sans">Glu ≤ 400</div>
              </div>
              <div className={`p-2.5 rounded-xl border ${useHillier ? 'bg-amber-950/35 border-amber-500/60' : 'bg-[#050811] border-[#1E3A5F]'}`}>
                <div className="text-[9px] text-amber-300 font-sans font-bold">Hillier (2.4) {useHillier && '★ แนะนำ'}</div>
                <div className="text-xl font-bold text-amber-300 mt-0.5">{corrNaHillier.toFixed(1)}</div>
                <div className="text-[9px] text-slate-400 font-sans">Glu &gt; 400</div>
              </div>
            </div>
          </div>

          {/* 3. Free Water Deficit */}
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="font-bold text-sm text-sky-400 border-b border-[#1E3A5F] pb-2">
                💧 Free Water Deficit (Hypernatremia)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">น้ำหนัก (kg)</label>
                  <input type="number" step="1" value={fwdWt} onChange={(e) => setFwdWt(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Na⁺ ปัจจุบัน</label>
                  <input type="number" step="1" value={fwdCurNa} onChange={(e) => setFwdCurNa(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Na⁺ เป้าหมาย</label>
                  <input type="number" step="1" value={fwdTargetNa} onChange={(e) => setFwdTargetNa(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
              </div>
              <select value={fwdFactor} onChange={(e) => setFwdFactor(e.target.value)} className="inp w-full py-1.5 bg-[#050811] text-[11px] font-bold">
                <option value="0.6">ผู้ใหญ่ชาย / เด็ก (TBW Factor = 0.60)</option>
                <option value="0.5">ผู้ใหญ่หญิง / ชายสูงอายุ (TBW Factor = 0.50)</option>
                <option value="0.45">หญิงสูงอายุ (TBW Factor = 0.45)</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-center space-y-1">
              <div className="text-2xl font-mono font-bold text-sky-300">
                {fwdLiters.toFixed(2)} <span className="text-xs text-slate-400">ลิตร ({Math.round(fwdLiters * 1000).toLocaleString()} mL)</span>
              </div>
              <div className="text-[10px] text-amber-200/90">
                {fwdLiters > 0
                  ? `⚠️ ควรลด Na⁺ ไม่เกิน 8–10 mEq/L/วัน (ใช้เวลาอย่างน้อย ~${minSafeHours.toFixed(0)} ชม.) เพื่อกันสมองบวม`
                  : 'ค่า Na⁺ ปัจจุบันไม่สูงกว่าค่าเป้าหมาย'}
              </div>
            </div>
          </div>

          {/* 4. Serum Osmolality & Osmolar Gap */}
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div className="font-bold text-sm text-emerald-400 border-b border-[#1E3A5F] pb-2">
                🧪 Serum Osmolality &amp; Osmolar Gap
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Na⁺ (mEq/L)</label>
                  <input type="number" value={osmNa} onChange={(e) => setOsmNa(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Glucose (mg/dL)</label>
                  <input type="number" value={osmGlu} onChange={(e) => setOsmGlu(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">BUN (mg/dL)</label>
                  <input type="number" value={osmBun} onChange={(e) => setOsmBun(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">Measured Osm (ถ้ามี)</label>
                  <input type="number" value={osmMeas} onChange={(e) => setOsmMeas(e.target.value)} placeholder="เว้นว่างได้" className="inp w-full font-mono text-center py-1.5 border-amber-500/40" />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-center space-y-1">
              <div className="text-[10px] font-mono text-slate-400">2(Na) + Glu/18 + BUN/2.8 (ปกติ 275–295)</div>
              <div className="text-2xl font-mono font-bold text-emerald-400">
                {calcOsm.toFixed(1)} <span className="text-xs text-slate-400">mOsm/kg</span>
              </div>
              {osmGap !== null && (
                <div className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg border ${
                  osmGap > 10
                    ? 'bg-red-950/45 border-red-500/60 text-red-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                }`}>
                  Osmolar Gap = {osmGap >= 0 ? '+' : ''}{osmGap.toFixed(1)}{' '}
                  {osmGap > 10 ? '⚠️ สูง (>10: สงสัยพิษแอลกอฮอล์/สารแปลกปลอม)' : '(ปกติ ≤10)'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
};

export const DrugDoseConverter = () => {
  const [subTab, setSubTab] = useState('peds'); // 'peds' | 'iv' | 'pharma'

  // ==================== 1. PEDIATRIC DOSING & SYRUP ====================
  const PEDS_PRESETS = [
    { name: 'Paracetamol (120mg/5mL)', mode: 'dose', target: '15', freq: '4', concMg: '120', concMl: '5', maxSingle: '1000', maxDaily: '4000', note: '10–15 mg/kg/dose q4–6h (ไม่เกิน 75 mg/kg/day หรือ 4,000 mg/day)' },
    { name: 'Paracetamol (250mg/5mL)', mode: 'dose', target: '15', freq: '4', concMg: '250', concMl: '5', maxSingle: '1000', maxDaily: '4000', note: 'สูตรเข้มข้นสำหรับเด็กโต 10–15 mg/kg/dose q4–6h' },
    { name: 'Amoxicillin (250mg/5mL)', mode: 'day', target: '45', freq: '3', concMg: '250', concMl: '5', maxSingle: '1000', maxDaily: '3000', note: 'Standard 40–50 mg/kg/day (หรือ High-dose 80–90 mg/kg/day แบ่งให้ q8–12h)' },
    { name: 'Ibuprofen (100mg/5mL)', mode: 'dose', target: '10', freq: '3', concMg: '100', concMl: '5', maxSingle: '600', maxDaily: '2400', note: '5–10 mg/kg/dose q6–8h หลังอาหารทันที (หลีกเลี่ยงในไข้เลือดออก)' },
    { name: 'Azithromycin (200mg/5mL)', mode: 'day', target: '10', freq: '1', concMg: '200', concMl: '5', maxSingle: '500', maxDaily: '500', note: '10 mg/kg/day วันละครั้ง (OD) นาน 3–5 วัน' }
  ];

  const [pedsWt, setPedsWt] = useState('15');
  const [pedsMode, setPedsMode] = useState('dose'); // 'dose' (mg/kg/dose) | 'day' (mg/kg/day)
  const [pedsTarget, setPedsTarget] = useState('15');
  const [pedsFreq, setPedsFreq] = useState('4'); // times/day
  const [pedsConcMg, setPedsConcMg] = useState('120');
  const [pedsConcMl, setPedsConcMl] = useState('5');
  const [pedsMaxSingle, setPedsMaxSingle] = useState('1000');
  const [pedsMaxDaily, setPedsMaxDaily] = useState('4000');
  const [pedsDays, setPedsDays] = useState('5');
  const [pedsNote, setPedsNote] = useState(PEDS_PRESETS[0].note);

  const pWt = parseFloat(pedsWt) || 0;
  const pTarget = parseFloat(pedsTarget) || 0;
  const pFreq = Math.max(1, parseFloat(pedsFreq) || 1);
  const pConcMg = parseFloat(pedsConcMg) || 0;
  const pConcMl = parseFloat(pedsConcMl) || 1;
  const pMaxS = parseFloat(pedsMaxSingle) || 0;
  const pMaxD = parseFloat(pedsMaxDaily) || 0;
  const pDays = Math.max(1, parseFloat(pedsDays) || 1);

  const pConcPerMl = pConcMl > 0 ? pConcMg / pConcMl : 0;
  const pDoseMg = pedsMode === 'dose' ? pWt * pTarget : (pWt * pTarget) / pFreq;
  const pDailyMg = pedsMode === 'dose' ? pDoseMg * pFreq : pWt * pTarget;
  const pDoseMl = pConcPerMl > 0 ? pDoseMg / pConcPerMl : 0;
  const pDailyMl = pConcPerMl > 0 ? pDailyMg / pConcPerMl : 0;
  const pTotalDispenseMl = pDailyMl * pDays;
  const pTeaspoons = pDoseMl / 5;
  const pOverSingle = pMaxS > 0 && pDoseMg > pMaxS;
  const pOverDaily = pMaxD > 0 && pDailyMg > pMaxD;

  // ==================== 2. IV DRIP / 4-2-1 / HIGH-ALERT ====================
  const [ivSub, setIvSub] = useState('drip'); // 'drip' | 'm421' | 'infusion'

  // 2.1 IV Drip Rate
  const [ivVol, setIvVol] = useState('1000');
  const [ivHours, setIvHours] = useState('8');
  const [ivDropFactor, setIvDropFactor] = useState('20'); // 10, 15, 20, 60

  const ivVolNum = parseFloat(ivVol) || 0;
  const ivHrsNum = parseFloat(ivHours) || 0;
  const ivDfNum = parseFloat(ivDropFactor) || 20;
  const ivMlHr = ivHrsNum > 0 ? ivVolNum / ivHrsNum : 0;
  const ivGttMin = ivHrsNum > 0 ? (ivVolNum * ivDfNum) / (ivHrsNum * 60) : 0;
  const ivSecPerDrop = ivGttMin > 0 ? 60 / ivGttMin : 0;

  // 2.2 Maintenance Fluid (4-2-1 Holliday-Segar)
  const [m421Wt, setM421Wt] = useState('24');
  const mWt = Math.max(0, parseFloat(m421Wt) || 0);
  const wFirst10 = Math.min(mWt, 10);
  const wNext10 = Math.min(Math.max(mWt - 10, 0), 10);
  const wRest = Math.max(mWt - 20, 0);
  const mHourly = wFirst10 * 4 + wNext10 * 2 + wRest * 1;
  const mDaily = mHourly * 24;

  // 2.3 High-Alert Vasopressor / Infusion
  const INFUSION_PRESETS = [
    { name: 'Norepinephrine (4mg / 250mL)', mg: '4', vol: '250', unit: 'mcg_kg_min', dose: '0.05' },
    { name: 'Dopamine (400mg / 250mL)', mg: '400', vol: '250', unit: 'mcg_kg_min', dose: '5' },
    { name: 'Dobutamine (250mg / 250mL)', mg: '250', vol: '250', unit: 'mcg_kg_min', dose: '5' },
    { name: 'Nitroglycerin (50mg / 250mL)', mg: '50', vol: '250', unit: 'mcg_min', dose: '10' }
  ];

  const [infDir, setInfDir] = useState('dose_to_rate'); // 'dose_to_rate' | 'rate_to_dose'
  const [infWt, setInfWt] = useState('60');
  const [infDrugMg, setInfDrugMg] = useState('4');
  const [infBagMl, setInfBagMl] = useState('250');
  const [infUnit, setInfUnit] = useState('mcg_kg_min'); // 'mcg_kg_min' | 'mcg_min'
  const [infDoseIn, setInfDoseIn] = useState('0.05');
  const [infRateIn, setInfRateIn] = useState('11.25');

  const iWt = parseFloat(infWt) || 0;
  const iMg = parseFloat(infDrugMg) || 0;
  const iBag = parseFloat(infBagMl) || 0;
  const iConcMcgMl = iBag > 0 ? (iMg * 1000) / iBag : 0;
  const iDoseNum = parseFloat(infDoseIn) || 0;
  const iRateNum = parseFloat(infRateIn) || 0;

  const infOutRate =
    iConcMcgMl > 0
      ? infUnit === 'mcg_kg_min'
        ? (iDoseNum * iWt * 60) / iConcMcgMl
        : (iDoseNum * 60) / iConcMcgMl
      : 0;

  const infOutDose =
    infUnit === 'mcg_kg_min'
      ? iWt > 0
        ? (iRateNum * iConcMcgMl) / (iWt * 60)
        : 0
      : (iRateNum * iConcMcgMl) / 60;

  // ==================== 3. PHARMACY CONVERTERS ====================
  const [pharmaSub, setPharmaSub] = useState('steroid'); // 'steroid' | 'alligation' | 'meq'

  // 3.1 Corticosteroid Equianalgesic / Potency Converter
  const STEROIDS = [
    { id: 'hydro', name: 'Hydrocortisone', eq: 20, anti: '1', mineralo: '1.0', halfLife: '8–12 ชม. (Short)' },
    { id: 'pred', name: 'Prednisolone / Prednisone', eq: 5, anti: '4', mineralo: '0.8', halfLife: '12–36 ชม. (Int.)' },
    { id: 'methyl', name: 'Methylprednisolone', eq: 4, anti: '5', mineralo: '0.5', halfLife: '12–36 ชม. (Int.)' },
    { id: 'triam', name: 'Triamcinolone', eq: 4, anti: '5', mineralo: '0', halfLife: '12–36 ชม. (Int.)' },
    { id: 'dexa', name: 'Dexamethasone', eq: 0.75, anti: '25–30', mineralo: '0', halfLife: '36–72 ชม. (Long)' },
    { id: 'beta', name: 'Betamethasone', eq: 0.6, anti: '25–30', mineralo: '0', halfLife: '36–72 ชม. (Long)' }
  ];

  const [srcSteroid, setSrcSteroid] = useState('pred');
  const [srcSteroidMg, setSrcSteroidMg] = useState('20');
  const srcSteroidObj = STEROIDS.find((s) => s.id === srcSteroid) || STEROIDS[1];
  const srcSteroidVal = parseFloat(srcSteroidMg) || 0;

  // 3.2 Alligation Alternate (ตารางไขว้)
  const [alliHigh, setAlliHigh] = useState('95');
  const [alliLow, setAlliLow] = useState('0');
  const [alliTarget, setAlliTarget] = useState('70');
  const [alliTotal, setAlliTotal] = useState('500');
  const [alliUnit, setAlliUnit] = useState('mL');

  const aH = parseFloat(alliHigh);
  const aL = parseFloat(alliLow);
  const aT = parseFloat(alliTarget);
  const aTot = parseFloat(alliTotal) || 0;
  const alliValid = ![aH, aL, aT].some(Number.isNaN) && aH > aT && aT > aL && aTot > 0;
  const partsHigh = alliValid ? aT - aL : 0;
  const partsLow = alliValid ? aH - aT : 0;
  const totalParts = partsHigh + partsLow;
  const amtHigh = alliValid && totalParts > 0 ? aTot * (partsHigh / totalParts) : 0;
  const amtLow = alliValid && totalParts > 0 ? aTot * (partsLow / totalParts) : 0;

  // 3.3 mg ↔ mEq ↔ mmol Converter
  const ELECTROLYTE_SALTS = [
    { id: 'kcl', name: 'KCl (Potassium Chloride)', mw: 74.55, valence: 1, note: '1 g KCl ≈ 13.4 mEq K⁺' },
    { id: 'nacl', name: 'NaCl (Sodium Chloride)', mw: 58.44, valence: 1, note: '1 g NaCl ≈ 17.1 mEq Na⁺' },
    { id: 'nahco3', name: 'NaHCO₃ (Sodium Bicarbonate)', mw: 84.01, valence: 1, note: '1 g NaHCO₃ ≈ 11.9 mEq Na⁺/HCO₃⁻' },
    { id: 'cagluc', name: 'Ca Gluconate (anhydrous)', mw: 430.37, valence: 2, note: '10% Ca Gluconate 10 mL (1 g) ≈ 4.65 mEq Ca²⁺' },
    { id: 'mgso4', name: 'MgSO₄·7H₂O (Magnesium Sulfate)', mw: 246.47, valence: 2, note: '1 g MgSO₄ ≈ 8.11 mEq Mg²⁺' },
    { id: 'elem_k', name: 'Elemental K⁺ (โพแทสเซียมอิสระ)', mw: 39.1, valence: 1, note: 'MW = 39.1, Valence = 1' },
    { id: 'elem_na', name: 'Elemental Na⁺ (โซเดียมอิสระ)', mw: 23.0, valence: 1, note: 'MW = 23.0, Valence = 1' },
    { id: 'elem_ca', name: 'Elemental Ca²⁺ (แคลเซียมอิสระ)', mw: 40.08, valence: 2, note: 'MW = 40.08, Valence = 2' }
  ];

  const [saltId, setSaltId] = useState('kcl');
  const [saltInputVal, setSaltInputVal] = useState('1000');
  const [saltInputUnit, setSaltInputUnit] = useState('mg'); // 'mg' | 'meq' | 'mmol'

  const saltObj = ELECTROLYTE_SALTS.find((s) => s.id === saltId) || ELECTROLYTE_SALTS[0];
  const sValNum = parseFloat(saltInputVal) || 0;
  const saltCalc = (() => {
    if (saltInputUnit === 'mg') {
      const mmol = sValNum / saltObj.mw;
      return { mg: sValNum, mmol, meq: mmol * saltObj.valence };
    }
    if (saltInputUnit === 'mmol') {
      return { mg: sValNum * saltObj.mw, mmol: sValNum, meq: sValNum * saltObj.valence };
    }
    const mmol = sValNum / saltObj.valence;
    return { mg: mmol * saltObj.mw, mmol, meq: sValNum };
  })();

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      {/* แถบเลือก 3 โหมดหลัก */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#0B1325] p-1.5 rounded-2xl border border-[#1E3A5F] font-bold">
        {[
          ['peds', '👶 ยาเด็ก (mL)'],
          ['iv', '💧 IV Drip / 4-2-1'],
          ['pharma', '💊 เทียบยา / ผสมยา']
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`py-2 px-2 rounded-xl transition-all ${
              subTab === id ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: PEDIATRIC DOSING ================= */}
      {subTab === 'peds' && (
        <div className="space-y-4">
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] shadow-lg space-y-3">
            {/* พรีเซตยาน้ำเด็ก */}
            <div className="space-y-1.5 pb-2 border-b border-[#1E3A5F]/70">
              <span className="text-[10px] text-amber-300 font-bold block">⚡ พรีเซตยาน้ำเด็กที่เจอบ่อย:</span>
              <div className="flex flex-wrap gap-1.5">
                {PEDS_PRESETS.map((pr) => (
                  <button
                    key={pr.name}
                    type="button"
                    onClick={() => {
                      setPedsMode(pr.mode);
                      setPedsTarget(pr.target);
                      setPedsFreq(pr.freq);
                      setPedsConcMg(pr.concMg);
                      setPedsConcMl(pr.concMl);
                      setPedsMaxSingle(pr.maxSingle);
                      setPedsMaxDaily(pr.maxDaily);
                      setPedsNote(pr.note);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#050811] border border-[#1E3A5F] hover:border-sky-400 text-sky-200 text-[10px] font-bold transition-colors"
                  >
                    {pr.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-amber-300 font-bold block mb-1">น้ำหนักเด็ก (kg)</label>
                <input type="number" min="0" step="0.5" value={pedsWt} onChange={(e) => setPedsWt(e.target.value)} className="inp w-full font-mono text-center py-1.5 border-amber-500/40" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">รูปแบบขนาดยา</label>
                <select value={pedsMode} onChange={(e) => setPedsMode(e.target.value)} className="inp w-full bg-[#050811] py-1.5 text-[11px] font-bold">
                  <option value="dose">mg / kg / dose</option>
                  <option value="day">mg / kg / day</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-sky-300 font-bold block mb-1">ขนาดยา ({pedsMode === 'dose' ? 'mg/kg/dose' : 'mg/kg/day'})</label>
                <input type="number" min="0" step="0.5" value={pedsTarget} onChange={(e) => setPedsTarget(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ความถี่ (ครั้ง/วัน)</label>
                <select value={pedsFreq} onChange={(e) => setPedsFreq(e.target.value)} className="inp w-full bg-[#050811] py-1.5 font-mono font-bold">
                  <option value="1">1 ครั้ง/วัน (OD / q24h)</option>
                  <option value="2">2 ครั้ง/วัน (BID / q12h)</option>
                  <option value="3">3 ครั้ง/วัน (TID / q8h)</option>
                  <option value="4">4 ครั้ง/วัน (QID / q6h)</option>
                  <option value="6">6 ครั้ง/วัน (q4h)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-[#1E3A5F]/60">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ความแรงยา (mg)</label>
                <input type="number" min="0" value={pedsConcMg} onChange={(e) => setPedsConcMg(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">ต่อปริมาตร (mL)</label>
                <input type="number" min="0.1" step="0.5" value={pedsConcMl} onChange={(e) => setPedsConcMl(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
              <div>
                <label className="text-[10px] text-red-300 font-bold block mb-1">Max/ครั้ง (mg)</label>
                <input type="number" min="0" value={pedsMaxSingle} onChange={(e) => setPedsMaxSingle(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
              <div>
                <label className="text-[10px] text-red-300 font-bold block mb-1">Max/วัน (mg)</label>
                <input type="number" min="0" value={pedsMaxDaily} onChange={(e) => setPedsMaxDaily(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-emerald-300 font-bold block mb-1">จ่ายยากี่วัน</label>
                <input type="number" min="1" value={pedsDays} onChange={(e) => setPedsDays(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
              </div>
            </div>
          </div>

          {/* ผลคำนวณยาเด็ก */}
          <div className="bg-[#050811] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-3">
            {(pOverSingle || pOverDaily) && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500 text-red-200 font-bold text-xs animate-pulse">
                🚨 แจ้งเตือนขนาดยาเกิน Max Adult Dose:{' '}
                {pOverSingle && `ต่อครั้ง (${pDoseMg.toFixed(0)} mg > ${pMaxS} mg) `}
                {pOverDaily && `ต่อวัน (${pDailyMg.toFixed(0)} mg > ${pMaxD} mg) `}
                — ควรปรับลดไม่ให้เกินขนาดสูงสุดของผู้ใหญ่!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0F2547]/80 to-[#0B1325] border border-sky-500/50">
                <div className="text-[10px] text-sky-300 font-sans font-bold">ปริมาณที่ให้ต่อครั้ง</div>
                <div className="text-3xl font-bold text-amber-400 mt-1">
                  {pDoseMl.toFixed(1)} <span className="text-sm text-slate-300 font-sans">mL</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  ({pDoseMg.toFixed(1)} mg ≈ {pTeaspoons.toFixed(2)} ช้อนชา)
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0B1325] border border-[#1E3A5F]">
                <div className="text-[10px] text-slate-400 font-sans font-bold">ขนาดยารวมต่อวัน ({pFreq} ครั้ง)</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {pDailyMg.toFixed(0)} <span className="text-xs text-slate-400 font-sans">mg/day</span>
                </div>
                <div className="text-[11px] text-sky-300 mt-0.5">{pDailyMl.toFixed(1)} mL / วัน</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0B1325] border border-emerald-500/40">
                <div className="text-[10px] text-emerald-400 font-sans font-bold">ปริมาณจ่ายยารวม {pDays} วัน</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">
                  {pTotalDispenseMl.toFixed(0)} <span className="text-xs text-slate-400 font-sans">mL</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                  ≈ {Math.ceil(pTotalDispenseMl / 60)} ขวด (ขนาด 60 mL)
                </div>
              </div>
            </div>

            {pedsNote && (
              <div className="p-2.5 rounded-xl bg-[#0B1325] border border-[#1E3A5F] text-[11px] text-slate-300">
                💡 <b>คำแนะนำยา:</b> {pedsNote}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: IV DRIP / 4-2-1 / HIGH-ALERT ================= */}
      {subTab === 'iv' && (
        <div className="space-y-4">
          <div className="flex bg-[#0B1325] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold text-[11px]">
            {[
              ['drip', '💧 อัตราหยด IV (gtt/min)'],
              ['m421', '⚖️ สารน้ำ 4-2-1 (เด็ก)'],
              ['infusion', '🚨 High-Alert (mcg/kg/min)']
            ].map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                onClick={() => setIvSub(id)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-colors ${
                  ivSub === id ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* 2.1 IV Drip Rate */}
          {ivSub === 'drip' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">ปริมาตรสารน้ำรวม (mL)</label>
                  <input type="number" min="0" step="50" value={ivVol} onChange={(e) => setIvVol(e.target.value)} className="inp w-full font-mono text-center py-2 text-base" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">ระยะเวลาให้ยา (ชั่วโมง)</label>
                  <input type="number" min="0.1" step="0.5" value={ivHours} onChange={(e) => setIvHours(e.target.value)} className="inp w-full font-mono text-center py-2 text-base" />
                </div>
                <div>
                  <label className="text-[10px] text-sky-300 font-bold block mb-1">ชุดให้สารน้ำ (Drop Factor)</label>
                  <select value={ivDropFactor} onChange={(e) => setIvDropFactor(e.target.value)} className="inp w-full bg-[#050811] py-2 font-bold">
                    <option value="20">Macrodrip — 20 gtt/mL (มาตรฐาน)</option>
                    <option value="15">Macrodrip — 15 gtt/mL</option>
                    <option value="10">Blood Set — 10 gtt/mL</option>
                    <option value="60">Microdrip — 60 gtt/mL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F]">
                <div>
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Infusion Pump Rate</div>
                  <div className="text-2xl font-bold text-sky-300 mt-1">{ivMlHr.toFixed(1)} <span className="text-xs font-sans">mL/hr</span></div>
                </div>
                <div className="border-y sm:border-y-0 sm:border-x border-[#1E3A5F] py-3 sm:py-0">
                  <div className="text-[10px] text-amber-300 font-sans font-bold">อัตราการหยด (Gravity Drip)</div>
                  <div className="text-3xl font-bold text-amber-400 mt-0.5">{Math.round(ivGttMin)} <span className="text-xs font-sans">หยด/นาที</span></div>
                  <div className="text-[10px] text-slate-400">({ivGttMin.toFixed(1)} gtt/min)</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400 font-sans font-bold">จังหวะหยด</div>
                  <div className="text-xl font-bold text-emerald-300 mt-1">1 หยด / {ivSecPerDrop.toFixed(1)} วิ</div>
                </div>
              </div>
            </div>
          )}

          {/* 2.2 Holliday-Segar 4-2-1 Rule */}
          {ivSub === 'm421' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-sky-400">Holliday-Segar Maintenance Fluid (กฎ 4-2-1)</div>
                  <div className="text-[10px] text-slate-400">10 kg แรก × 4 mL/kg/hr • 10 kg ถัดมา × 2 mL/kg/hr • ส่วนที่เกิน 20 kg × 1 mL/kg/hr</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">น้ำหนัก:</span>
                  <input type="number" min="0" step="0.5" value={m421Wt} onChange={(e) => setM421Wt(e.target.value)} className="inp w-24 font-mono text-center text-base py-1.5" />
                  <span className="font-bold text-slate-400">kg</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center font-mono">
                <div className="p-4 rounded-2xl bg-[#050811] border border-sky-500/40">
                  <div className="text-[10px] text-sky-300 font-sans font-bold">Maintenance Rate (รายชั่วโมง)</div>
                  <div className="text-3xl font-bold text-amber-400 mt-1">{mHourly.toFixed(1)} <span className="text-sm text-slate-400 font-sans">mL/hr</span></div>
                </div>
                <div className="p-4 rounded-2xl bg-[#050811] border border-emerald-500/40">
                  <div className="text-[10px] text-emerald-300 font-sans font-bold">ปริมาณสารน้ำรวม 24 ชม.</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">{mDaily.toFixed(0)} <span className="text-sm text-slate-400 font-sans">mL/day</span></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-dashed border-[#1E3A5F] font-mono text-[11px] text-slate-300 text-center">
                วิธีคิด: ({wFirst10.toFixed(1)} × 4) + ({wNext10.toFixed(1)} × 2) + ({wRest.toFixed(1)} × 1) ={' '}
                {(wFirst10 * 4).toFixed(1)} + {(wNext10 * 2).toFixed(1)} + {wRest.toFixed(1)} = <b className="text-amber-300">{mHourly.toFixed(1)} mL/hr</b>
              </div>
            </div>
          )}

          {/* 2.3 High-Alert Vasopressor / Infusion */}
          {ivSub === 'infusion' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {INFUSION_PRESETS.map((pr) => (
                    <button
                      key={pr.name}
                      type="button"
                      onClick={() => {
                        setInfDrugMg(pr.mg);
                        setInfBagMl(pr.vol);
                        setInfUnit(pr.unit);
                        setInfDoseIn(pr.dose);
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#050811] border border-red-500/40 text-red-200 hover:bg-red-900/40 text-[10px] font-bold"
                    >
                      {pr.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex bg-[#050811] p-0.5 rounded-lg border border-[#1E3A5F] text-[10px] font-bold">
                  <button type="button" onClick={() => setInfDir('dose_to_rate')} className={`px-3 py-1 rounded ${infDir === 'dose_to_rate' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>หา Rate (Dose → mL/hr)</button>
                  <button type="button" onClick={() => setInfDir('rate_to_dose')} className={`px-3 py-1 rounded ${infDir === 'rate_to_dose' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>เช็ก Dose (mL/hr → Dose)</button>
                </div>
                <div className="flex bg-[#050811] p-0.5 rounded-lg border border-[#1E3A5F] text-[10px] font-bold">
                  <button type="button" onClick={() => setInfUnit('mcg_kg_min')} className={`px-2.5 py-1 rounded ${infUnit === 'mcg_kg_min' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>mcg/kg/min</button>
                  <button type="button" onClick={() => setInfUnit('mcg_min')} className={`px-2.5 py-1 rounded ${infUnit === 'mcg_min' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>mcg/min</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {infUnit === 'mcg_kg_min' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">น้ำหนัก (kg)</label>
                    <input type="number" min="1" value={infWt} onChange={(e) => setInfWt(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">ปริมาณยาในขวด (mg)</label>
                  <input type="number" min="0" step="1" value={infDrugMg} onChange={(e) => setInfDrugMg(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">สารละลายรวม (mL)</label>
                  <input type="number" min="1" step="10" value={infBagMl} onChange={(e) => setInfBagMl(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">
                    {infDir === 'dose_to_rate' ? `Dose (${infUnit === 'mcg_kg_min' ? 'mcg/kg/min' : 'mcg/min'})` : 'Infusion Rate (mL/hr)'}
                  </label>
                  {infDir === 'dose_to_rate' ? (
                    <input type="number" min="0" step="0.01" value={infDoseIn} onChange={(e) => setInfDoseIn(e.target.value)} className="inp w-full font-mono text-center py-1.5 border-amber-500/50 text-amber-200" />
                  ) : (
                    <input type="number" min="0" step="0.5" value={infRateIn} onChange={(e) => setInfRateIn(e.target.value)} className="inp w-full font-mono text-center py-1.5 border-amber-500/50 text-amber-200" />
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#050811] border border-red-500/40 text-center space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400">
                  ความเข้มข้นสารละลาย = <b className="text-sky-300">{iConcMcgMl.toFixed(1)} mcg/mL</b>
                </div>
                <div className="text-3xl font-mono font-bold text-amber-400">
                  {infDir === 'dose_to_rate'
                    ? `${infOutRate.toFixed(2)} mL/hr`
                    : `${infOutDose.toFixed(3)} ${infUnit === 'mcg_kg_min' ? 'mcg/kg/min' : 'mcg/min'}`}
                </div>
                <div className="text-[10px] text-red-300">
                  ⚠️ High-Alert Medication — ตรวจสอบความเข้มข้นและ Double-check กับเภสัชกร/พยาบาลก่อนปรับ Pump เสมอ
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PHARMACY CONVERTERS ================= */}
      {subTab === 'pharma' && (
        <div className="space-y-4">
          <div className="flex bg-[#0B1325] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold text-[11px]">
            {[
              ['steroid', '💊 เทียบ Steroid'],
              ['alligation', '✖️ Alligation (ตารางไขว้)'],
              ['meq', '⚗️ mg ↔ mEq ↔ mmol']
            ].map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPharmaSub(id)}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-colors ${
                  pharmaSub === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* 3.1 Corticosteroid Converter */}
          {pharmaSub === 'steroid' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-sky-300 font-bold block mb-1">ยาตั้งต้น (Source Corticosteroid)</label>
                  <select value={srcSteroid} onChange={(e) => setSrcSteroid(e.target.value)} className="inp w-full bg-[#050811] py-2 font-bold">
                    {STEROIDS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (Equiv {s.eq} mg)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">ขนาดยาตั้งต้น (mg)</label>
                  <input type="number" min="0" step="0.5" value={srcSteroidMg} onChange={(e) => setSrcSteroidMg(e.target.value)} className="inp w-full font-mono text-center text-base py-1.5 border-amber-500/40" />
                </div>
              </div>

              <div className="overflow-x-auto bg-[#050811] rounded-xl border border-[#1E3A5F]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E3A5F] text-[10px] text-slate-400">
                      <th className="py-2.5 px-3">ชื่อยา</th>
                      <th className="py-2.5 px-2 text-right text-amber-300">ขนาดเทียบเท่า</th>
                      <th className="py-2.5 px-2 text-center">ต้านอักเสบ</th>
                      <th className="py-2.5 px-2 text-center">กักเกลือน้ำ</th>
                      <th className="py-2.5 px-3 text-right">ระยะออกฤทธิ์ (t½)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E3A5F]/50">
                    {STEROIDS.map((s) => {
                      const eqVal = srcSteroidObj.eq > 0 ? srcSteroidVal * (s.eq / srcSteroidObj.eq) : 0;
                      const isSelf = s.id === srcSteroid;
                      return (
                        <tr key={s.id} className={isSelf ? 'bg-sky-950/40' : 'hover:bg-[#0B1325]'}>
                          <td className="py-2 px-3 font-bold text-white">
                            {s.name} {isSelf && <span className="text-[9px] text-sky-400 ml-1">(ตั้งต้น)</span>}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-amber-400 text-sm">
                            {eqVal < 1 ? eqVal.toFixed(2) : eqVal.toFixed(1)} mg
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-300">{s.anti}</td>
                          <td className="py-2 px-2 text-center font-mono text-slate-300">{s.mineralo}</td>
                          <td className="py-2 px-3 text-right text-[10px] text-slate-400">{s.halfLife}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3.2 Alligation Alternate */}
          {pharmaSub === 'alligation' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-sky-300 font-bold block mb-1">ความเข้มข้นสูง (%)</label>
                  <input type="number" step="0.1" value={alliHigh} onChange={(e) => setAlliHigh(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-300 font-bold block mb-1">ความเข้มข้นต่ำ (%)</label>
                  <input type="number" step="0.1" value={alliLow} onChange={(e) => setAlliLow(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">เป้าหมาย (%)</label>
                  <input type="number" step="0.1" value={alliTarget} onChange={(e) => setAlliTarget(e.target.value)} className="inp w-full font-mono text-center py-1.5 border-amber-500/50 text-amber-200" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">ปริมาณรวมที่ต้องการ</label>
                  <div className="flex gap-1">
                    <input type="number" min="1" value={alliTotal} onChange={(e) => setAlliTotal(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                    <select value={alliUnit} onChange={(e) => setAlliUnit(e.target.value)} className="inp px-2 py-1.5 bg-[#050811] font-bold">
                      <option value="mL">mL</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>
              </div>

              {!alliValid ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">
                  ⚠️ ความเข้มข้นเป้าหมายต้องอยู่ระหว่างค่าต่ำและค่าสูง (ต่ำ &lt; เป้าหมาย &lt; สูง) และปริมาณรวมต้องมากกว่า 0
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F]">
                  {/* ผังไขว้ Alligation */}
                  <div className="grid grid-cols-3 gap-y-3 items-center text-center font-mono py-2">
                    <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-500/40 text-sky-300 font-bold">{aH}%</div>
                    <div className="text-slate-500 text-lg">↘</div>
                    <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-500/40 text-white font-bold">{parseFloat(partsHigh.toFixed(2))} ส่วน</div>

                    <div></div>
                    <div className="p-2 rounded-full bg-amber-400 text-[#050811] font-bold text-sm shadow">{aT}%</div>
                    <div></div>

                    <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold">{aL}%</div>
                    <div className="text-slate-500 text-lg">↗</div>
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-white font-bold">{parseFloat(partsLow.toFixed(2))} ส่วน</div>
                  </div>

                  {/* สรุปปริมาณชั่งตวง */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] text-slate-400 font-bold">
                      อัตราส่วนผสม (รวม {parseFloat(totalParts.toFixed(2))} ส่วน) เพื่อให้ได้ {aTot} {alliUnit}:
                    </div>
                    <div className="p-3 rounded-xl bg-[#0B1325] border border-sky-500/40 flex justify-between items-center">
                      <span className="text-sky-300 font-bold">ใช้ตัวเข้มข้น {aH}%:</span>
                      <span className="font-mono text-lg font-bold text-white">{amtHigh.toFixed(2)} {alliUnit}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0B1325] border border-emerald-500/40 flex justify-between items-center">
                      <span className="text-emerald-300 font-bold">ใช้ตัวเจือจาง {aL}%:</span>
                      <span className="font-mono text-lg font-bold text-white">{amtLow.toFixed(2)} {alliUnit}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3.3 mg ↔ mEq ↔ mmol */}
          {pharmaSub === 'meq' && (
            <div className="bg-[#0B1325] p-4 sm:p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-sky-300 font-bold block mb-1">เลือกเกลือแร่ / สารอิเล็กโทรไลต์</label>
                  <select value={saltId} onChange={(e) => setSaltId(e.target.value)} className="inp w-full bg-[#050811] py-2 font-bold">
                    {ELECTROLYTE_SALTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (MW {s.mw}, v={s.valence})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">ค่าที่ต้องการแปลง</label>
                  <div className="flex gap-1">
                    <input type="number" min="0" step="0.1" value={saltInputVal} onChange={(e) => setSaltInputVal(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                    <select value={saltInputUnit} onChange={(e) => setSaltInputUnit(e.target.value)} className="inp px-2 py-1.5 bg-[#050811] font-mono font-bold text-amber-300">
                      <option value="mg">mg</option>
                      <option value="meq">mEq</option>
                      <option value="mmol">mmol</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center font-mono bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F]">
                <div className="p-2.5 rounded-xl bg-[#0B1325] border border-[#1E3A5F]">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">มิลลิกรัม (mg)</div>
                  <div className="text-xl font-bold text-white mt-1">{saltCalc.mg.toFixed(2)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1325] border border-amber-500/40">
                  <div className="text-[10px] text-amber-300 font-sans font-bold">mEq</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{saltCalc.meq.toFixed(2)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1325] border border-sky-500/40">
                  <div className="text-[10px] text-sky-300 font-sans font-bold">mmol</div>
                  <div className="text-xl font-bold text-sky-300 mt-1">{saltCalc.mmol.toFixed(2)}</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050811] border border-dashed border-[#1E3A5F] text-[11px] text-slate-300 flex flex-wrap justify-between gap-2 font-mono">
                <span>สูตร: mEq = (mg ÷ {saltObj.mw}) × {saltObj.valence}</span>
                <span className="text-emerald-300 font-sans">💡 {saltObj.note}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <MedicalDisclaimer />
    </div>
  );
};

export default function MedTools({ toolId }) {
  if (toolId === 'renal_weight') return <RenalWeightSuite />;
  if (toolId === 'abg_electrolyte') return <AbgElectrolyteAnalyzer />;
  if (toolId === 'drug_dose') return <DrugDoseConverter />;
  return null;
}