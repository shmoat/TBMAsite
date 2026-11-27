import React, { useState, useEffect } from 'react';

export const BeamCalculator = () => {
  const [L, setL] = useState(10);
  const [supports, setSupports] = useState([{ id: 's1', x: 0 }, { id: 's2', x: 10 }]);
  const [pointLoads, setPointLoads] = useState([{ id: 'p1', x: 5, p: 1000 }]);
  const [uniLoads, setUniLoads] = useState([]);
  const [result, setResult] = useState(null);

  const solveLinearSystem = (A, B) => {
    const n = A.length;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) { if (Math.abs(A[k][i]) > maxEl) { maxEl = Math.abs(A[k][i]); maxRow = k; } }
      if (maxEl < 1e-10) return null;
      for (let k = i; k < n; k++) { const tmp = A[maxRow][k]; A[maxRow][k] = A[i][k]; A[i][k] = tmp; }
      const tmp = B[maxRow]; B[maxRow] = B[i]; B[i] = tmp;
      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) { if (i === j) A[k][j] = 0; else A[k][j] += c * A[i][j]; }
        B[k] += c * B[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i > -1; i--) {
      x[i] = B[i] / A[i][i];
      for (let k = i - 1; k > -1; k--) B[k] -= A[k][i] * x[i];
    }
    return x;
  };

  const calculateBeam = () => {
    const n = supports.length;
    if (n < 2) return setResult({ error: '⚠️ ต้องการ Support อย่างน้อย 2 จุด เพื่อให้คานมีเสถียรภาพ' });

    const A = Array(n + 2).fill(0).map(() => Array(n + 2).fill(0));
    const B = Array(n + 2).fill(0);

    const totalP = pointLoads.reduce((s, p) => s + p.p, 0);
    const totalW = uniLoads.reduce((s, w) => s + w.w * (w.x2 - w.x1), 0);
    for (let i = 0; i < n; i++) A[0][i] = 1;
    B[0] = totalP + totalW;

    const totalMP = pointLoads.reduce((s, p) => s + p.p * p.x, 0);
    const totalMW = uniLoads.reduce((s, w) => s + w.w * (Math.pow(w.x2, 2) - Math.pow(w.x1, 2)) / 2, 0);
    for (let i = 0; i < n; i++) A[1][i] = supports[i].x;
    B[1] = totalMP + totalMW;

    const mac = (x, a, pow) => (x > a ? Math.pow(x - a, pow) : 0);
    for (let k = 0; k < n; k++) {
      const xk = supports[k].x;
      for (let i = 0; i < n; i++) A[k + 2][i] = mac(xk, supports[i].x, 3) / 6;
      A[k + 2][n] = xk;
      A[k + 2][n + 1] = 1;
      const pTerm = pointLoads.reduce((s, p) => s + p.p * mac(xk, p.x, 3) / 6, 0);
      const wTerm = uniLoads.reduce((s, w) => s + w.w * mac(xk, w.x1, 4) / 24 - w.w * mac(xk, w.x2, 4) / 24, 0);
      B[k + 2] = pTerm + wTerm;
    }

    const X = solveLinearSystem(A, B);
    if (!X) return setResult({ error: '⚠️ โครงสร้างไม่สมดุล (Unstable) หรือตำแหน่ง Support ทับซ้อนกัน' });

    const reacs = supports.map((s, i) => ({ ...s, r: X[i] }));
    const getV = (x) => reacs.reduce((s, r) => s + (x >= r.x ? r.r : 0), 0) - pointLoads.reduce((s, p) => s + (x >= p.x ? p.p : 0), 0) - uniLoads.reduce((s, w) => s + w.w * (x > w.x1 ? (Math.min(x, w.x2) - w.x1) : 0), 0);
    const getM = (x) => reacs.reduce((s, r) => s + (x > r.x ? r.r * (x - r.x) : 0), 0) - pointLoads.reduce((s, p) => s + (x > p.x ? p.p * (x - p.x) : 0), 0) - uniLoads.reduce((s, w) => { if (x <= w.x1) return s; const loadLen = Math.min(x, w.x2) - w.x1; const cgDist = x - (w.x1 + loadLen / 2); return s + (w.w * loadLen) * cgDist; }, 0);

    let critXs = [0, L, ...supports.map((s) => s.x), ...pointLoads.map((p) => p.x), ...uniLoads.flatMap((w) => [w.x1, w.x2])];
    critXs = Array.from(new Set(critXs)).filter((x) => x >= 0 && x <= L).sort((a, b) => a - b);

    const plotPts = [];
    let maxV = 0;
    let maxM = 0;
    critXs.forEach((x) => {
      const dx = 0.0001;
      if (x > 0) {
        const vL = getV(x - dx); const mL = getM(x - dx);
        plotPts.push({ x, v: vL, m: mL });
        if (Math.abs(vL) > maxV) maxV = Math.abs(vL);
        if (Math.abs(mL) > maxM) maxM = Math.abs(mL);
      }
      if (x <= L) {
        const vR = getV(x + dx); const mR = getM(x + dx);
        plotPts.push({ x, v: vR, m: mR });
        if (Math.abs(vR) > maxV) maxV = Math.abs(vR);
        if (Math.abs(mR) > maxM) maxM = Math.abs(mR);
      }
    });

    setResult({ reacs, plotPts, maxV, maxM });
  };

  useEffect(() => { calculateBeam(); }, [L, supports, pointLoads, uniLoads]);

  const downloadReport = () => {
    if (!result || result.error) return alert('ไม่สามารถสร้าง Report ได้ กรุณาตรวจสอบข้อมูล');
    let content = `=== THE BLUE MOON ASSOCIATION : STRUCTURAL ANALYSIS REPORT ===\n`;
    content += `Date: ${new Date().toLocaleString('th-TH')}\nBeam Length: ${L} m\n\n[ SUPPORTS & REACTIONS ]\n`;
    result.reacs.forEach((r, i) => { content += `Support ${i + 1} at x = ${r.x} m : Reaction = ${r.r.toFixed(2)} kg\n`; });
    content += `\n[ MAX INTERNAL FORCES ]\nMax Shear Force (V_max): ${result.maxV.toFixed(2)} kg\nMax Bending Moment (M_max): ${result.maxM.toFixed(2)} kg-m\n\n=== END OF REPORT ===\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BMA_Beam_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const svgW = 600;
  const svgH = 150;
  const scaleX = (x) => (x / L) * (svgW - 40) + 20;

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto">
      <div className="bg-[#0B1325] p-4 sm:p-6 rounded-xl border border-[#1E3A5F] shadow-inner space-y-5 text-xs">
        <div className="flex justify-between items-center border-b border-[#1E3A5F] pb-3">
          <label className="text-sky-400 font-bold text-sm">📏 ความยาวคานรวม (L)</label>
          <div className="flex items-center gap-2">
            <input type="number" min="1" step="0.1" value={L} onChange={(e) => setL(parseFloat(e.target.value) || 1)} className="w-24 inp font-mono text-center" />
            <span className="text-slate-400">เมตร</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-emerald-400 font-bold">🔼 จุดรองรับ (Supports)</label>
            <button type="button" onClick={() => setSupports([...supports, { id: 's' + Date.now(), x: L / 2 }])} className="btn-b py-1 px-3 text-[10px]">+ เพิ่ม Support</button>
          </div>
          {supports.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 bg-[#050811] p-2 rounded-lg border border-[#1E3A5F]">
              <span className="text-slate-400 w-16">จุดที่ {i + 1} : x =</span>
              <input type="number" min="0" max={L} step="0.1" value={s.x} onChange={(e) => { const n = [...supports]; n[i] = { ...n[i], x: parseFloat(e.target.value) || 0 }; setSupports(n); }} className="flex-1 inp font-mono py-1" />
              <button type="button" onClick={() => setSupports(supports.filter((x) => x.id !== s.id))} className="text-red-400 font-bold px-2">✕</button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-amber-400 font-bold">⬇️ แรงกระทำแบบจุด (Point Loads)</label>
            <button type="button" onClick={() => setPointLoads([...pointLoads, { id: 'p' + Date.now(), x: L / 2, p: 1000 }])} className="btn-b py-1 px-3 text-[10px]">+ เพิ่ม Point Load</button>
          </div>
          {pointLoads.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 bg-[#050811] p-2 rounded-lg border border-[#1E3A5F]">
              <span className="text-slate-400">x =</span>
              <input type="number" min="0" max={L} step="0.1" value={p.x} onChange={(e) => { const n = [...pointLoads]; n[i] = { ...n[i], x: parseFloat(e.target.value) || 0 }; setPointLoads(n); }} className="w-16 inp font-mono py-1 px-1" />
              <span className="text-slate-400 pl-2">P =</span>
              <input type="number" step="10" value={p.p} onChange={(e) => { const n = [...pointLoads]; n[i] = { ...n[i], p: parseFloat(e.target.value) || 0 }; setPointLoads(n); }} className="flex-1 inp font-mono py-1" />
              <button type="button" onClick={() => setPointLoads(pointLoads.filter((x) => x.id !== p.id))} className="text-red-400 font-bold px-2">✕</button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-fuchsia-400 font-bold">⏬ แรงกระทำแบบแผ่ (Uniform Loads)</label>
            <button type="button" onClick={() => setUniLoads([...uniLoads, { id: 'u' + Date.now(), x1: 0, x2: L, w: 500 }])} className="btn-b py-1 px-3 text-[10px]">+ เพิ่ม Uniform Load</button>
          </div>
          {uniLoads.map((u, i) => (
            <div key={u.id} className="flex items-center gap-2 bg-[#050811] p-2 rounded-lg border border-[#1E3A5F]">
              <span className="text-slate-400">เริ่ม x =</span>
              <input type="number" min="0" max={L} step="0.1" value={u.x1} onChange={(e) => { const n = [...uniLoads]; n[i] = { ...n[i], x1: parseFloat(e.target.value) || 0 }; setUniLoads(n); }} className="w-14 inp font-mono py-1 px-1" />
              <span className="text-slate-400">จบ x =</span>
              <input type="number" min="0" max={L} step="0.1" value={u.x2} onChange={(e) => { const n = [...uniLoads]; n[i] = { ...n[i], x2: parseFloat(e.target.value) || 0 }; setUniLoads(n); }} className="w-14 inp font-mono py-1 px-1" />
              <span className="text-slate-400 pl-2">w =</span>
              <input type="number" step="10" value={u.w} onChange={(e) => { const n = [...uniLoads]; n[i] = { ...n[i], w: parseFloat(e.target.value) || 0 }; setUniLoads(n); }} className="flex-1 inp font-mono py-1" />
              <button type="button" onClick={() => setUniLoads(uniLoads.filter((x) => x.id !== u.id))} className="text-red-400 font-bold px-2">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#050811] border border-[#1E3A5F] rounded-xl p-4 sm:p-6 shadow-2xl space-y-6">
        {result?.error ? (
          <div className="text-red-400 font-bold bg-red-950/50 p-4 rounded-xl border border-red-900/50 w-full text-center">{result.error}</div>
        ) : result && (
          <>
            <div className="flex justify-between items-center">
              <div className="text-sky-300 font-bold text-sm">📊 แผนภาพและผลลัพธ์ (Diagrams)</div>
              <button type="button" onClick={downloadReport} className="btn-w py-1.5 text-[10px] flex items-center gap-1.5 shadow-lg hover:scale-105">📥 โหลด Report (.txt)</button>
            </div>

            <div className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2 relative overflow-x-auto no-scrollbar">
              <div className="text-[10px] text-slate-500 absolute top-2 left-4 font-bold">Free Body Diagram (FBD)</div>
              <svg viewBox={`0 0 ${svgW} 120`} className="w-full min-w-[500px] h-auto">
                <line x1={scaleX(0)} y1="60" x2={scaleX(L)} y2="60" stroke="#60A5FA" strokeWidth="8" strokeLinecap="round" />
                {uniLoads.map((u) => (
                  <g key={u.id}>
                    <rect x={scaleX(u.x1)} y="30" width={scaleX(u.x2) - scaleX(u.x1)} height="26" fill="#d946ef" opacity="0.3" />
                    <text x={scaleX(u.x1 + (u.x2 - u.x1) / 2)} y="25" fill="#d946ef" fontSize="10" textAnchor="middle" fontWeight="bold">{u.w} kg/m</text>
                  </g>
                ))}
                {result.reacs.map((r, i) => (
                  <g key={i}>
                    <polygon points={`${scaleX(r.x)},64 ${scaleX(r.x) - 8},80 ${scaleX(r.x) + 8},80`} fill="#34D399" />
                    <line x1={scaleX(r.x)} y1="80" x2={scaleX(r.x)} y2="105" stroke="#34D399" strokeWidth="2" markerEnd="url(#arrowUp)" />
                    <text x={scaleX(r.x)} y="115" fill="#34D399" fontSize="10" textAnchor="middle" fontWeight="bold">R{i + 1}={r.r.toFixed(1)}</text>
                  </g>
                ))}
                {pointLoads.map((p, i) => (
                  <g key={i}>
                    <line x1={scaleX(p.x)} y1="15" x2={scaleX(p.x)} y2="55" stroke="#FBBF24" strokeWidth="2" markerEnd="url(#arrowDown)" />
                    <text x={scaleX(p.x)} y="10" fill="#FBBF24" fontSize="10" textAnchor="middle" fontWeight="bold">{p.p} kg</text>
                  </g>
                ))}
                <defs>
                  <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto"><path d="M0,0 L6,0 L3,6 Z" fill="#FBBF24" /></marker>
                  <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto"><path d="M0,6 L6,6 L3,0 Z" fill="#34D399" /></marker>
                </defs>
              </svg>
            </div>

            <div className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2 relative overflow-x-auto no-scrollbar">
              <div className="text-[10px] text-red-400 absolute top-2 left-4 font-bold">Shear Force Diagram (SFD)</div>
              <div className="text-[10px] text-slate-400 absolute top-2 right-4 font-mono">V_max = {result.maxV.toFixed(2)} kg</div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[500px] h-auto">
                <line x1={scaleX(0)} y1={svgH / 2} x2={scaleX(L)} y2={svgH / 2} stroke="#475569" strokeWidth="1" />
                <polyline points={result.plotPts.map((p) => `${scaleX(p.x)},${svgH / 2 - (p.v / (result.maxV || 1)) * 50}`).join(' ')} fill="none" stroke="#F87171" strokeWidth="2" />
                <polygon points={`${scaleX(0)},${svgH / 2} ${result.plotPts.map((p) => `${scaleX(p.x)},${svgH / 2 - (p.v / (result.maxV || 1)) * 50}`).join(' ')} ${scaleX(L)},${svgH / 2}`} fill="#F87171" opacity="0.2" />
              </svg>
            </div>

            <div className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2 relative overflow-x-auto no-scrollbar">
              <div className="text-[10px] text-sky-400 absolute top-2 left-4 font-bold">Bending Moment Diagram (BMD)</div>
              <div className="text-[10px] text-slate-400 absolute top-2 right-4 font-mono">M_max = {result.maxM.toFixed(2)} kg-m</div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[500px] h-auto">
                <line x1={scaleX(0)} y1={svgH / 2} x2={scaleX(L)} y2={svgH / 2} stroke="#475569" strokeWidth="1" />
                <polyline points={result.plotPts.map((p) => `${scaleX(p.x)},${svgH / 2 + (p.m / (result.maxM || 1)) * 50}`).join(' ')} fill="none" stroke="#38BDF8" strokeWidth="2" />
                <polygon points={`${scaleX(0)},${svgH / 2} ${result.plotPts.map((p) => `${scaleX(p.x)},${svgH / 2 + (p.m / (result.maxM || 1)) * 50}`).join(' ')} ${scaleX(L)},${svgH / 2}`} fill="#38BDF8" opacity="0.2" />
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const RCBeamDesign = () => {
  const [fc, setFc] = useState(240);
  const [fy, setFy] = useState(4000);
  const [b, setB] = useState(20);
  const [d, setD] = useState(40);
  const [Mu, setMu] = useState(3000);

  const Mu_kgcm = Mu * 100;
  const Rn = Mu_kgcm / (0.9 * b * d * d);
  let rho = 0;
  let As = 0;
  let warning = '';

  const rootTerm = 1 - (2 * Rn) / (0.85 * fc);
  if (rootTerm < 0) {
    warning = '⚠️ หน้าตัดคานเล็กเกินไป (ต้องเสริมเหล็กรับแรงอัด หรือเพิ่มขนาดคาน)';
  } else {
    rho = ((0.85 * fc) / fy) * (1 - Math.sqrt(rootTerm));
    As = rho * b * d;
  }

  const As_min = (14 / fy) * b * d;
  const finalAs = Math.max(As, As_min);

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] text-slate-400 font-bold">fc' (ksc)</label><input type="number" value={fc} onChange={(e) => setFc(e.target.value)} className="w-full inp text-sm font-mono" /></div>
        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] text-slate-400 font-bold">fy (ksc)</label><input type="number" value={fy} onChange={(e) => setFy(e.target.value)} className="w-full inp text-sm font-mono" /></div>
        <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold">b (cm)</label><input type="number" value={b} onChange={(e) => setB(e.target.value)} className="w-full inp text-sm font-mono" /></div>
        <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold">d (cm)</label><input type="number" value={d} onChange={(e) => setD(e.target.value)} className="w-full inp text-sm font-mono" /></div>
        <div className="col-span-2 sm:col-span-1"><label className="text-[10px] text-sky-400 font-bold">Mu (kg-m)</label><input type="number" value={Mu} onChange={(e) => setMu(e.target.value)} className="w-full inp text-sm font-mono border-sky-500/50 bg-sky-950/20" /></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#0B1325] p-5 rounded-xl border border-[#1E3A5F] shadow-lg">
        <div className="w-32 h-40 bg-[#050811] border-2 border-slate-600 rounded flex flex-col items-center justify-end p-2 relative shrink-0">
          <div className="absolute top-1/2 left-[-25px] -translate-y-1/2 text-[10px] text-slate-400 -rotate-90 font-mono">d={d}</div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono">b={b}</div>
          <div className="w-[85%] h-[90%] border border-amber-500/50 rounded-sm absolute top-[5%] flex items-end justify-center pb-1">
            <div className="flex gap-1.5 justify-center w-full">
              <div className={`w-3 h-3 rounded-full ${warning ? 'bg-red-500' : 'bg-amber-400'}`}></div>
              <div className={`w-3 h-3 rounded-full ${warning ? 'bg-red-500' : 'bg-amber-400'}`}></div>
              <div className={`w-3 h-3 rounded-full ${warning ? 'bg-red-500' : 'bg-amber-400'}`}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3 pl-0 sm:pl-4 border-l-0 sm:border-l border-[#1E3A5F]">
          {warning ? (
            <div className="text-red-400 font-bold text-sm bg-red-950/50 p-3 rounded border border-red-900/50 animate-pulse">{warning}</div>
          ) : (
            <>
              <div>
                <div className="text-xs text-slate-400">เนื้อที่เหล็กเสริมที่ต้องการ (As req)</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{As.toFixed(2)} <span className="text-sm text-slate-500">cm²</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#1E3A5F]">
                <div><span className="text-slate-400">As min:</span> <span className="font-mono text-amber-200">{As_min.toFixed(2)} cm²</span></div>
                <div><span className="text-slate-400">อัตราส่วน (ρ):</span> <span className="font-mono text-amber-200">{rho.toFixed(5)}</span></div>
              </div>
              <div className="text-[10px] text-sky-300 font-bold bg-sky-950/30 p-2 rounded border border-sky-900/50">
                ✅ ควรใช้เหล็ก: As = {finalAs.toFixed(2)} cm²
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const SteelSectionViewer = () => {
  const DB = {
    'H-Beam': [
      { id: 'h1', name: 'H 100x100x6x8', d: 100, bf: 100, tw: 6, tf: 8, w: 17.2, a: 21.9, ix: 383, iy: 134, sx: 76.5, sy: 26.7 },
      { id: 'h2', name: 'H 125x125x6.5x9', d: 125, bf: 125, tw: 6.5, tf: 9, w: 23.8, a: 30.3, ix: 847, iy: 293, sx: 136, sy: 46.9 },
      { id: 'h3', name: 'H 150x150x7x10', d: 150, bf: 150, tw: 7, tf: 10, w: 31.5, a: 40.1, ix: 1640, iy: 563, sx: 219, sy: 75.1 },
      { id: 'h4', name: 'H 200x200x8x12', d: 200, bf: 200, tw: 8, tf: 12, w: 49.9, a: 63.5, ix: 4720, iy: 1600, sx: 472, sy: 160 },
      { id: 'h5', name: 'H 250x250x9x14', d: 250, bf: 250, tw: 9, tf: 14, w: 72.4, a: 92.2, ix: 10800, iy: 3650, sx: 867, sy: 292 }
    ],
    'C-Channel': [
      { id: 'c1', name: 'C 100x50x5x7.5', d: 100, bf: 50, tw: 5, tf: 7.5, w: 9.36, a: 11.9, ix: 188, iy: 26, sx: 37.6, sy: 7.5 },
      { id: 'c2', name: 'C 150x75x6.5x10', d: 150, bf: 75, tw: 6.5, tf: 10, w: 18.6, a: 23.7, ix: 861, iy: 117, sx: 115, sy: 22.4 }
    ],
    Angle: [
      { id: 'a1', name: 'L 50x50x4', d: 50, bf: 50, tw: 4, tf: 4, w: 3.06, a: 3.89, ix: 9.16, iy: 9.16, sx: 2.56, sy: 2.56 },
      { id: 'a2', name: 'L 100x100x10', d: 100, bf: 100, tw: 10, tf: 10, w: 14.9, a: 19.0, ix: 175, iy: 175, sx: 24.5, sy: 24.5 }
    ],
    Rebar: [
      { id: 'rb6', name: 'RB6 (Round Bar)', d: 6, bf: 6, tw: 6, tf: 6, w: 0.222, a: 0.283, ix: 0, iy: 0, sx: 0, sy: 0 },
      { id: 'rb9', name: 'RB9 (Round Bar)', d: 9, bf: 9, tw: 9, tf: 9, w: 0.499, a: 0.636, ix: 0, iy: 0, sx: 0, sy: 0 },
      { id: 'db12', name: 'DB12 (Deformed Bar)', d: 12, bf: 12, tw: 12, tf: 12, w: 0.888, a: 1.13, ix: 0, iy: 0, sx: 0, sy: 0 },
      { id: 'db16', name: 'DB16 (Deformed Bar)', d: 16, bf: 16, tw: 16, tf: 16, w: 1.58, a: 2.01, ix: 0, iy: 0, sx: 0, sy: 0 },
      { id: 'db20', name: 'DB20 (Deformed Bar)', d: 20, bf: 20, tw: 20, tf: 20, w: 2.47, a: 3.14, ix: 0, iy: 0, sx: 0, sy: 0 },
      { id: 'db25', name: 'DB25 (Deformed Bar)', d: 25, bf: 25, tw: 25, tf: 25, w: 3.85, a: 4.91, ix: 0, iy: 0, sx: 0, sy: 0 }
    ]
  };

  const [tab, setTab] = useState('browse');
  const [cat, setCat] = useState('H-Beam');
  const [secId, setSecId] = useState('h1');
  const [len, setLen] = useState(6);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(25);
  const [targetProp, setTargetProp] = useState('sx');
  const [targetVal, setTargetVal] = useState(200);
  const [cmp1, setCmp1] = useState('h1');
  const [cmp2, setCmp2] = useState('h3');
  const [buBase, setBuBase] = useState('h4');
  const [plW, setPlW] = useState(200);
  const [plT, setPlT] = useState(10);

  const getAllSecs = () => Object.values(DB).flat();
  const getSec = (id) => getAllSecs().find((s) => s.id === id) || DB['H-Beam'][0];
  const selSec = getSec(secId);

  const renderSVG = (sec, category) => {
    if (!sec) return null;
    const w = 120;
    const h = 120;
    const maxDim = Math.max(sec.d, sec.bf);
    const scale = 100 / maxDim;
    const drawD = sec.d * scale;
    const drawB = sec.bf * scale;
    const drawTw = Math.max(4, sec.tw * scale);
    const drawTf = Math.max(4, sec.tf * scale);

    if (category === 'Rebar') {
      const isDeformed = sec.name.includes('DB');
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-32 h-32 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
          <circle cx={w / 2} cy={h / 2} r={drawD / 2} fill="#0F2547" stroke="#38BDF8" strokeWidth="3" />
          {isDeformed && (
            <>
              <line x1={w / 2 - drawD / 2} y1={h / 2 - drawD / 2} x2={w / 2 + drawD / 2} y2={h / 2 + drawD / 2} stroke="#38BDF8" strokeWidth="2" opacity="0.5" />
              <line x1={w / 2 - drawD / 2} y1={h / 2 + drawD / 2} x2={w / 2 + drawD / 2} y2={h / 2 - drawD / 2} stroke="#38BDF8" strokeWidth="2" opacity="0.5" />
            </>
          )}
          <text x={w / 2} y={h / 2 + 3} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">⌀{sec.d}</text>
        </svg>
      );
    }

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-32 h-32 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
        <g transform={`translate(${(w - drawB) / 2}, ${(h - drawD) / 2})`}>
          {category === 'H-Beam' && <path d={`M 0 0 H ${drawB} V ${drawTf} H ${(drawB + drawTw) / 2} V ${drawD - drawTf} H ${drawB} V ${drawD} H 0 V ${drawD - drawTf} H ${(drawB - drawTw) / 2} V ${drawTf} H 0 Z`} fill="#38BDF8" />}
          {category === 'C-Channel' && <path d={`M 0 0 H ${drawB} V ${drawTf} H ${drawTw} V ${drawD - drawTf} H ${drawB} V ${drawD} H 0 Z`} fill="#38BDF8" />}
          {category === 'Angle' && <path d={`M 0 0 H ${drawTw} V ${drawD - drawTf} H ${drawB} V ${drawD} H 0 Z`} fill="#38BDF8" />}
        </g>
        <line x1="5" y1={(h - drawD) / 2} x2="5" y2={(h + drawD) / 2} stroke="#94A3B8" strokeWidth="1" />
        <text x="8" y={h / 2 + 3} fill="#94A3B8" fontSize="8" fontWeight="bold">d={sec.d}</text>
        <line x1={(w - drawB) / 2} y1="5" x2={(w + drawB) / 2} y2="5" stroke="#94A3B8" strokeWidth="1" />
        <text x={w / 2} y="14" fill="#94A3B8" fontSize="8" textAnchor="middle" fontWeight="bold">bf={sec.bf}</text>
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      <div className="flex bg-[#0B1325] p-1.5 rounded-xl border border-[#1E3A5F] overflow-x-auto no-scrollbar font-bold">
        <button type="button" onClick={() => setTab('browse')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'browse' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>🔍 เปิดตาราง &amp; ประเมินราคา</button>
        <button type="button" onClick={() => setTab('reverse')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'reverse' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>🔄 ค้นหากลับ (Reverse)</button>
        <button type="button" onClick={() => setTab('compare')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'compare' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>⚖️ เปรียบเทียบหน้าตัด</button>
        <button type="button" onClick={() => setTab('builtup')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'builtup' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>🛠️ Built-up Section</button>
      </div>

      {tab === 'browse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-lg flex flex-col gap-3">
            <div>
              <label className="text-sky-400 font-bold mb-1 block">ประเภท (Category)</label>
              <select value={cat} onChange={(e) => { setCat(e.target.value); setSecId(DB[e.target.value][0].id); }} className="w-full inp bg-[#050811] font-bold">
                {Object.keys(DB).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sky-400 font-bold mb-1 block">ขนาด (Section Size)</label>
              <select value={secId} onChange={(e) => setSecId(e.target.value)} className="w-full inp bg-[#050811] font-mono">
                {DB[cat].map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-center py-4 border-y border-[#1E3A5F] bg-[#050811] rounded-lg mt-2">
              {renderSVG(selSec, cat)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Weight (W)</div><div className="font-bold text-emerald-400 font-mono">{selSec.w} <span className="text-[9px] text-slate-500">kg/m</span></div></div>
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Area (A)</div><div className="font-bold text-white font-mono">{selSec.a} <span className="text-[9px] text-slate-500">cm²</span></div></div>
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Inertia (Ix)</div><div className="font-bold text-white font-mono">{selSec.ix} <span className="text-[9px] text-slate-500">cm⁴</span></div></div>
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Inertia (Iy)</div><div className="font-bold text-white font-mono">{selSec.iy} <span className="text-[9px] text-slate-500">cm⁴</span></div></div>
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Sec Mod (Sx)</div><div className="font-bold text-white font-mono">{selSec.sx} <span className="text-[9px] text-slate-500">cm³</span></div></div>
              <div className="bg-[#050811] p-2 rounded border border-[#1E3A5F]"><div className="text-slate-400 text-[10px]">Sec Mod (Sy)</div><div className="font-bold text-white font-mono">{selSec.sy} <span className="text-[9px] text-slate-500">cm³</span></div></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#050811] to-[#0B1325] p-5 rounded-xl border border-emerald-900/50 shadow-lg flex flex-col gap-4">
            <div className="text-emerald-400 font-bold uppercase tracking-widest border-b border-[#1E3A5F] pb-2">💰 ประเมินน้ำหนักและราคา (Cost Estimator)</div>
            <div className="flex items-center gap-3">
              <label className="w-24 text-slate-400 font-bold">ความยาว/ท่อน</label>
              <div className="flex-1 flex gap-2 items-center"><input type="number" min="0" step="0.5" value={len} onChange={(e) => setLen(parseFloat(e.target.value) || 0)} className="w-full inp font-mono" /><span>ม.</span></div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 text-slate-400 font-bold">จำนวนที่ใช้</label>
              <div className="flex-1 flex gap-2 items-center"><input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)} className="w-full inp font-mono" /><span>ท่อน</span></div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 text-amber-400 font-bold">ราคาเหล็ก/กก.</label>
              <div className="flex-1 flex gap-2 items-center"><input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full inp font-mono border-amber-900/50 bg-amber-950/20" /><span>บาท</span></div>
            </div>
            <div className="mt-auto pt-4 space-y-2">
              <div className="flex justify-between p-3 bg-[#0a101f] rounded-lg border border-slate-700">
                <span className="text-slate-400">น้ำหนักรวม (Total Weight)</span>
                <span className="font-bold text-lg font-mono text-emerald-300">{(selSec.w * len * qty).toLocaleString()} <span className="text-[10px]">kg</span></span>
              </div>
              <div className="flex justify-between p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                <span className="text-emerald-400 font-bold">ราคาประเมิน (Est. Cost)</span>
                <span className="font-bold text-2xl font-mono text-emerald-400">{(selSec.w * len * qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">฿</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'reverse' && (() => {
        const matches = getAllSecs().filter((s) => s[targetProp] >= targetVal && s[targetProp] > 0).sort((a, b) => a.w - b.w).slice(0, 10);
        return (
          <div className="bg-[#0B1325] p-5 rounded-xl border border-amber-500/50 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-4 items-end border-b border-[#1E3A5F] pb-4 mb-4">
              <div className="flex-1 w-full">
                <label className="text-amber-400 font-bold mb-1 block">ค้นหาจากคุณสมบัติ (Property)</label>
                <select value={targetProp} onChange={(e) => setTargetProp(e.target.value)} className="w-full inp bg-[#050811] font-bold">
                  <option value="sx">Section Modulus (Sx) อย่างน้อย...</option>
                  <option value="a">เนื้อที่หน้าตัด (Area) อย่างน้อย...</option>
                  <option value="ix">Moment of Inertia (Ix) อย่างน้อย...</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="text-amber-400 font-bold mb-1 block">ค่าที่ต้องการ (Target Value)</label>
                <input type="number" value={targetVal} onChange={(e) => setTargetVal(parseFloat(e.target.value) || 0)} className="w-full inp font-mono text-amber-200 text-lg py-1.5" />
              </div>
            </div>
            <div className="text-xs font-bold text-slate-300 mb-2">💡 รายชื่อเหล็กที่ผ่านเกณฑ์ (เรียงจากเบาที่สุด/ประหยัดสุด)</div>
            <div className="space-y-2 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#050811] text-sky-400 border-b border-[#1E3A5F]">
                    <th className="p-2 whitespace-nowrap">Section Name</th>
                    <th className="p-2">W (kg/m)</th>
                    <th className="p-2">Area (cm²)</th>
                    <th className="p-2">Ix (cm⁴)</th>
                    <th className="p-2">Sx (cm³)</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? <tr><td colSpan="5" className="p-4 text-center text-slate-500">ไม่พบเหล็กที่ตรงตามเงื่อนไข</td></tr> : null}
                  {matches.map((s, i) => (
                    <tr key={s.id} className={`border-b border-[#1E3A5F] hover:bg-[#0F2547] font-mono ${i === 0 ? 'bg-emerald-950/20' : ''}`}>
                      <td className="p-2 font-sans font-bold flex items-center gap-2">
                        {i === 0 && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">เบาสุด</span>} {s.name}
                      </td>
                      <td className={`p-2 ${i === 0 ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{s.w}</td>
                      <td className={`p-2 ${targetProp === 'a' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>{s.a}</td>
                      <td className={`p-2 ${targetProp === 'ix' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>{s.ix}</td>
                      <td className={`p-2 ${targetProp === 'sx' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>{s.sx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {tab === 'compare' && (() => {
        const s1 = getSec(cmp1);
        const s2 = getSec(cmp2);
        return (
          <div className="bg-[#0B1325] p-5 rounded-xl border border-emerald-500/50 shadow-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-emerald-400 font-bold mb-1 block">Section 1</label>
                <select value={cmp1} onChange={(e) => setCmp1(e.target.value)} className="w-full inp bg-[#050811] font-mono text-[10px] sm:text-xs">
                  {getAllSecs().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sky-400 font-bold mb-1 block">Section 2</label>
                <select value={cmp2} onChange={(e) => setCmp2(e.target.value)} className="w-full inp bg-[#050811] font-mono text-[10px] sm:text-xs">
                  {getAllSecs().map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 text-center border-t border-[#1E3A5F] pt-4 font-mono">
              <div className="font-bold text-slate-400 text-[10px] sm:text-xs space-y-3">
                <div className="h-6">Property</div><div className="h-6">W (kg/m)</div><div className="h-6">Area (cm²)</div>
                <div className="h-6">Ix (cm⁴)</div><div className="h-6">Iy (cm⁴)</div><div className="h-6">Sx (cm³)</div><div className="h-6">Sy (cm³)</div>
              </div>
              <div className="font-bold text-emerald-300 space-y-3">
                <div className="h-6 font-sans text-emerald-400 bg-emerald-950/50 rounded line-clamp-1">{s1.name}</div>
                <div className="h-6">{s1.w}</div><div className="h-6">{s1.a}</div><div className="h-6">{s1.ix}</div>
                <div className="h-6">{s1.iy}</div><div className="h-6">{s1.sx}</div><div className="h-6">{s1.sy}</div>
              </div>
              <div className="font-bold text-sky-300 space-y-3 border-l border-[#1E3A5F]">
                <div className="h-6 font-sans text-sky-400 bg-sky-950/50 rounded line-clamp-1">{s2.name}</div>
                <div className="h-6 flex justify-center items-center gap-1">{s2.w} {s2.w > s1.w ? <span className="text-red-400 text-[9px]">▲</span> : s2.w < s1.w ? <span className="text-emerald-400 text-[9px]">▼</span> : ''}</div>
                <div className="h-6 flex justify-center items-center gap-1">{s2.a} {s2.a > s1.a ? <span className="text-emerald-400 text-[9px]">▲</span> : s2.a < s1.a ? <span className="text-red-400 text-[9px]">▼</span> : ''}</div>
                <div className="h-6 flex justify-center items-center gap-1">{s2.ix} {s2.ix > s1.ix ? <span className="text-emerald-400 text-[9px]">▲</span> : s2.ix < s1.ix ? <span className="text-red-400 text-[9px]">▼</span> : ''}</div>
                <div className="h-6">{s2.iy}</div>
                <div className="h-6 flex justify-center items-center gap-1">{s2.sx} {s2.sx > s1.sx ? <span className="text-emerald-400 text-[9px]">▲</span> : s2.sx < s1.sx ? <span className="text-red-400 text-[9px]">▼</span> : ''}</div>
                <div className="h-6">{s2.sy}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {tab === 'builtup' && (() => {
        const base = DB['H-Beam'].find((s) => s.id === buBase) || DB['H-Beam'][0];
        const ptCm = plT / 10;
        const pwCm = plW / 10;
        const plArea = pwCm * ptCm;
        const plWgt = plArea * 100 * 0.00785;
        const newW = base.w + plWgt * 2;
        const newA = base.a + plArea * 2;
        const I_plate_x = (pwCm * Math.pow(ptCm, 3)) / 12;
        const d_cg = (base.d / 10) / 2 + ptCm / 2;
        const newIx = base.ix + 2 * (I_plate_x + plArea * Math.pow(d_cg, 2));
        const I_plate_y = (ptCm * Math.pow(pwCm, 3)) / 12;
        const newIy = base.iy + 2 * I_plate_y;
        const c_new = (base.d / 10) / 2 + ptCm;
        const newSx = newIx / c_new;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0B1325] p-4 rounded-xl border border-fuchsia-500/50 shadow-lg space-y-4">
              <div className="text-fuchsia-400 font-bold uppercase tracking-widest border-b border-[#1E3A5F] pb-2">H-Beam + Cover Plates</div>
              <div>
                <label className="text-slate-400 font-bold mb-1 block">เหล็กแกนหลัก (Base H-Beam)</label>
                <select value={buBase} onChange={(e) => setBuBase(e.target.value)} className="w-full inp bg-[#050811] font-mono">
                  {DB['H-Beam'].map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-[#050811] p-3 rounded-lg border border-[#1E3A5F]">
                <div className="col-span-2 text-[10px] text-fuchsia-300 font-bold">ขนาดแผ่นประกบ บน-ล่าง (Cover Plate)</div>
                <div>
                  <label className="text-slate-400 text-[10px]">ความกว้าง (Width, mm)</label>
                  <input type="number" step="10" value={plW} onChange={(e) => setPlW(parseFloat(e.target.value) || 0)} className="w-full inp font-mono mt-1" />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px]">ความหนา (Thk, mm)</label>
                  <input type="number" step="1" value={plT} onChange={(e) => setPlT(parseFloat(e.target.value) || 0)} className="w-full inp font-mono mt-1" />
                </div>
              </div>
              <div className="text-center pt-2">
                <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto drop-shadow-[0_0_10px_rgba(217,70,239,0.4)]">
                  <path d="M 25 20 H 75 V 28 H 54 V 72 H 75 V 80 H 25 V 72 H 46 V 28 H 25 Z" fill="#38BDF8" opacity="0.6" />
                  <rect x="15" y="10" width="70" height="10" fill="#d946ef" />
                  <rect x="15" y="80" width="70" height="10" fill="#d946ef" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#050811] to-[#1a0f2e] p-5 rounded-xl border border-fuchsia-900/50 shadow-lg flex flex-col gap-3">
              <div className="text-fuchsia-400 font-bold mb-2">คุณสมบัติหน้าตัดใหม่ (New Properties)</div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between bg-[#0B1325] p-2.5 rounded border border-[#1E3A5F]"><span className="text-slate-400">Total W</span><span className="font-bold text-emerald-400">{newW.toFixed(2)} <span className="text-[10px]">kg/m</span></span></div>
                <div className="flex justify-between bg-[#0B1325] p-2.5 rounded border border-[#1E3A5F]"><span className="text-slate-400">Total Area</span><span className="font-bold text-white">{newA.toFixed(2)} <span className="text-[10px]">cm²</span></span></div>
                <div className="flex justify-between bg-fuchsia-950/30 p-2.5 rounded border border-fuchsia-900/50"><span className="text-fuchsia-300">New Ix</span><span className="font-bold text-white">{newIx.toFixed(2)} <span className="text-red-400 text-[10px]">(+{(((newIx - base.ix) / base.ix) * 100).toFixed(0)}%)</span></span></div>
                <div className="flex justify-between bg-fuchsia-950/30 p-2.5 rounded border border-fuchsia-900/50"><span className="text-fuchsia-300">New Iy</span><span className="font-bold text-white">{newIy.toFixed(2)}</span></div>
                <div className="flex justify-between bg-sky-950/30 p-2.5 rounded border border-sky-900/50"><span className="text-sky-300">New Sx</span><span className="font-bold text-white">{newSx.toFixed(2)} <span className="text-red-400 text-[10px]">(+{(((newSx - base.sx) / base.sx) * 100).toFixed(0)}%)</span></span></div>
              </div>
              <div className="text-[9px] text-slate-500 mt-auto leading-relaxed text-center">* คำนวณด้วย Parallel Axis Theorem<br />* ค่า Ix และ Sx ที่เพิ่มขึ้น % เทียบกับ H-Beam เดิม</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export const ConcreteCalculator = () => {
  const [w, setW] = useState(5);
  const [l, setL] = useState(5);
  const [t, setT] = useState(0.1);
  const [sf, setSf] = useState(10);
  const [env, setEnv] = useState('normal');
  const [sandMoist, setSandMoist] = useState(2.0);
  const [sandAbsorp, setSandAbsorp] = useState(1.0);
  const [stoneMoist, setStoneMoist] = useState(1.0);
  const [stoneAbsorp, setStoneAbsorp] = useState(0.5);

  const baseVol = w * l * t;
  const totalVol = baseVol * (1 + sf / 100);
  const cementType = env === 'marine'
    ? 'ปูนซีเมนต์ประเภท 2 หรือ 5 (ทนซัลเฟต/สัมผัสน้ำทะเล)'
    : 'ปูนซีเมนต์ประเภท 1 (งานโครงสร้างทั่วไป)';

  const sandFreeWater = ((sandMoist - sandAbsorp) / 100) * 830;
  const stoneFreeWater = ((stoneMoist - stoneAbsorp) / 100) * 1600;
  const adjWaterPerCube = 180 - sandFreeWater - stoneFreeWater;

  const cementBags = Math.ceil(totalVol * 6.4);
  const sand = (totalVol * 0.52).toFixed(2);
  const stone = (totalVol * 1.04).toFixed(2);
  const water = (totalVol * adjWaterPerCube).toFixed(0);

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-inner">
        <div><label className="text-[10px] text-slate-400 font-bold">กว้าง (m)</label><input type="number" min="0" step="0.1" value={w} onChange={(e) => setW(parseFloat(e.target.value) || 0)} className="w-full inp text-sm font-mono" /></div>
        <div><label className="text-[10px] text-slate-400 font-bold">ยาว (m)</label><input type="number" min="0" step="0.1" value={l} onChange={(e) => setL(parseFloat(e.target.value) || 0)} className="w-full inp text-sm font-mono" /></div>
        <div><label className="text-[10px] text-slate-400 font-bold">หนา (m)</label><input type="number" min="0" step="0.05" value={t} onChange={(e) => setT(parseFloat(e.target.value) || 0)} className="w-full inp text-sm font-mono" /></div>
        <div className="col-span-3 sm:col-span-1"><label className="text-[10px] text-amber-400 font-bold">เผื่อเหลือ (SF %)</label><input type="number" min="0" max="50" value={sf} onChange={(e) => setSf(parseFloat(e.target.value) || 0)} className="w-full inp text-sm font-mono border-amber-500/50 bg-amber-950/20 text-amber-300" /></div>
      </div>

      <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-inner space-y-3">
        <div>
          <label className="text-[10px] text-sky-400 font-bold mb-1 block">สภาพแวดล้อมไซต์งาน (Environment)</label>
          <select value={env} onChange={(e) => setEnv(e.target.value)} className="w-full inp text-sm bg-[#050811]">
            <option value="normal">สภาวะปกติ (Normal Environment)</option>
            <option value="marine">สภาวะรุนแรง / ใกล้ทะเล / แช่น้ำ (Marine / High Sulfate)</option>
          </select>
          <div className="text-[10px] text-emerald-400 mt-1.5 font-bold">💡 แนะนำ: {cementType}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-[#1E3A5F] pt-3">
          <div className="space-y-2">
            <label className="text-[10px] text-amber-300 font-bold">สภาพทราย (Fine Agg.)</label>
            <div className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-400">ชื้น (MC%)</span><input type="number" step="0.1" value={sandMoist} onChange={(e) => setSandMoist(parseFloat(e.target.value) || 0)} className="flex-1 inp font-mono py-1 px-2" /></div>
            <div className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-400">ดูดซึม (Abs%)</span><input type="number" step="0.1" value={sandAbsorp} onChange={(e) => setSandAbsorp(parseFloat(e.target.value) || 0)} className="flex-1 inp font-mono py-1 px-2" /></div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-300 font-bold">สภาพหิน (Coarse Agg.)</label>
            <div className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-400">ชื้น (MC%)</span><input type="number" step="0.1" value={stoneMoist} onChange={(e) => setStoneMoist(parseFloat(e.target.value) || 0)} className="flex-1 inp font-mono py-1 px-2" /></div>
            <div className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-400">ดูดซึม (Abs%)</span><input type="number" step="0.1" value={stoneAbsorp} onChange={(e) => setStoneAbsorp(parseFloat(e.target.value) || 0)} className="flex-1 inp font-mono py-1 px-2" /></div>
          </div>
        </div>
      </div>

      <div className="bg-[#050811] rounded-xl border border-[#1E3A5F] overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1E3A5F] bg-gradient-to-r from-emerald-900/40 to-transparent flex justify-between items-center">
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ปริมาตรคอนกรีตที่ต้องใช้</div>
            <div className="text-2xl font-bold font-mono mt-1 text-white">{totalVol.toFixed(2)} <span className="text-sm text-slate-400">คิว (m³)</span></div>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            ปริมาตรสุทธิ: <span className="font-mono text-slate-200">{baseVol.toFixed(2)}</span> คิว<br />
            เผื่อสูญเสีย ({sf}%): <span className="font-mono text-amber-300">+{(totalVol - baseVol).toFixed(2)}</span> คิว
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-300 mb-3 font-bold flex justify-between items-center">
            <span>🛒 ประเมินวัสดุผสมหน้างาน (สัดส่วน 1:2:4)</span>
            {(sandFreeWater + stoneFreeWater) > 0 && <span className="text-[10px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-900/50">💧 ลดน้ำลงจากการปรับแก้ความชื้นแล้ว</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
            <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-2xl mb-1">🧱</div><div className="text-[10px] text-slate-400">ปูนซีเมนต์ (50kg)</div><div className="font-bold font-mono text-sm text-white mt-1">{cementBags} <span className="text-[10px]">ถุง</span></div></div>
            <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-2xl mb-1">🏖️</div><div className="text-[10px] text-slate-400">ทรายหยาบ</div><div className="font-bold font-mono text-sm text-white mt-1">{sand} <span className="text-[10px]">คิว</span></div></div>
            <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-2xl mb-1">🪨</div><div className="text-[10px] text-slate-400">หิน (เบอร์ 1,2)</div><div className="font-bold font-mono text-sm text-white mt-1">{stone} <span className="text-[10px]">คิว</span></div></div>
            <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-2xl mb-1">💧</div><div className="text-[10px] text-slate-400">น้ำสะอาด (ปรับแก้แล้ว)</div><div className="font-bold font-mono text-sm text-sky-300 mt-1">{water} <span className="text-[10px]">ลิตร</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SoilPhaseCalculator = () => {
  const [mode, setMode] = useState('w_Gs_bulk');
  const [Gs, setGs] = useState(2.65);
  const [w, setW] = useState(15);
  const [bulk, setBulk] = useState(1.95);
  const [eInput, setEInput] = useState(0.65);

  let V_s = 1, V_w = 0, V_a = 0, V_v = 0, V_t = 0;
  let W_s = 0, W_w = 0;
  let S = 0, n = 0, gamma_d = 0, e = 0, error = '';

  try {
    W_s = Gs * 1;
    if (mode === 'w_Gs_bulk') {
      e = (Gs * (1 + w / 100)) / bulk - 1;
      if (e < 0) error = '⚠️ ข้อมูลไม่สอดคล้องกัน (e < 0)';
    } else {
      e = eInput;
    }

    if (!error) {
      V_v = e;
      V_t = 1 + e;
      n = e / V_t;
      W_w = (w / 100) * W_s;
      V_w = W_w;
      V_a = V_v - V_w;
      if (V_a < -0.001) error = '⚠️ ข้อมูลเป็นไปไม่ได้ (น้ำล้นช่องว่าง S > 100%)';
      if (V_a < 0) V_a = 0;
      S = (V_w / V_v) * 100;
      gamma_d = W_s / V_t;
    }
  } catch { error = 'เกิดข้อผิดพลาดในการคำนวณ'; }

  const h_a = V_t ? (V_a / V_t) * 100 : 0;
  const h_w = V_t ? (V_w / V_t) * 100 : 0;
  const h_s = V_t ? (V_s / V_t) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-inner space-y-4">
        <div>
          <label className="text-xs text-sky-400 font-bold">ข้อมูลที่ทราบค่า (Known Parameters)</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full inp mt-1 text-sm bg-[#050811]">
            <option value="w_Gs_bulk">ทราบ w, Gs, และ γ (Bulk Unit Weight)</option>
            <option value="w_Gs_e">ทราบ w, Gs, และ e (Void Ratio)</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-[10px] text-slate-400 font-bold">Gs (Specific Gravity)</label><input type="number" min="1" step="0.01" value={Gs} onChange={(e) => setGs(parseFloat(e.target.value) || 0)} className="w-full inp mt-1 text-sm font-mono" /></div>
          <div><label className="text-[10px] text-slate-400 font-bold">w (Water Content, %)</label><input type="number" min="0" step="0.1" value={w} onChange={(e) => setW(parseFloat(e.target.value) || 0)} className="w-full inp mt-1 text-sm font-mono" /></div>
          {mode === 'w_Gs_bulk' ? (
            <div><label className="text-[10px] text-slate-400 font-bold">γ (Bulk, t/m³)</label><input type="number" min="0.1" step="0.01" value={bulk} onChange={(e) => setBulk(parseFloat(e.target.value) || 0)} className="w-full inp mt-1 text-sm font-mono border-amber-500/50 bg-amber-950/20" /></div>
          ) : (
            <div><label className="text-[10px] text-slate-400 font-bold">e (Void Ratio)</label><input type="number" min="0.1" step="0.01" value={eInput} onChange={(e) => setEInput(parseFloat(e.target.value) || 0)} className="w-full inp mt-1 text-sm font-mono border-amber-500/50 bg-amber-950/20" /></div>
          )}
        </div>
      </div>

      <div className="bg-[#050811] border border-[#1E3A5F] rounded-xl p-6 relative overflow-hidden flex flex-col items-center shadow-lg">
        {error ? (
          <div className="text-red-400 font-bold bg-red-950/50 p-4 rounded-xl border border-red-900/50 w-full text-center">{error}</div>
        ) : (
          <div className="flex flex-col md:flex-row w-full gap-8 items-center justify-center">
            <div className="relative w-48 h-64 flex shrink-0 font-mono text-[10px] font-bold">
              <div className="w-16 h-full flex flex-col pr-2 text-right">
                <div className="w-full border-b border-slate-600 border-t" style={{ height: `${h_a}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-sky-200">Va={V_a.toFixed(3)}</span></div>
                <div className="w-full border-b border-slate-600" style={{ height: `${h_w}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-blue-300">Vw={V_w.toFixed(3)}</span></div>
                <div className="w-full border-b border-slate-600" style={{ height: `${h_s}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-amber-600">Vs={V_s.toFixed(3)}</span></div>
              </div>
              <div className="flex-1 h-full border-2 border-slate-500 rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div className="w-full bg-transparent flex items-center justify-center text-slate-400 tracking-widest" style={{ height: `${h_a}%` }}>AIR</div>
                <div className="w-full bg-blue-900/60 border-t-2 border-slate-500 flex items-center justify-center text-blue-200 tracking-widest" style={{ height: `${h_w}%` }}>WATER</div>
                <div className="w-full bg-amber-900/80 border-t-2 border-slate-500 flex items-center justify-center text-amber-400 tracking-widest" style={{ height: `${h_s}%` }}>SOLID</div>
              </div>
              <div className="w-16 h-full flex flex-col pl-2 text-left">
                <div className="w-full border-b border-slate-600 border-t" style={{ height: `${h_a}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-slate-500">Wa=0</span></div>
                <div className="w-full border-b border-slate-600" style={{ height: `${h_w}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-blue-300">Ww={W_w.toFixed(3)}</span></div>
                <div className="w-full border-b border-slate-600" style={{ height: `${h_s}%` }}><span className="relative top-1/2 -translate-y-1/2 block text-amber-600">Ws={W_s.toFixed(3)}</span></div>
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><span className="text-slate-400 block mb-0.5">Void Ratio (e)</span><span className="font-bold font-mono text-emerald-400 text-lg">{e.toFixed(3)}</span></div>
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><span className="text-slate-400 block mb-0.5">Porosity (n)</span><span className="font-bold font-mono text-emerald-400 text-lg">{(n * 100).toFixed(1)} <span className="text-[10px]">%</span></span></div>
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><span className="text-slate-400 block mb-0.5">Degree of Saturation (S)</span><span className="font-bold font-mono text-emerald-400 text-lg">{S.toFixed(1)} <span className="text-[10px]">%</span></span></div>
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><span className="text-slate-400 block mb-0.5">Dry Unit Wt. (γ_d)</span><span className="font-bold font-mono text-white text-lg">{gamma_d.toFixed(3)} <span className="text-[10px]">t/m³</span></span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SoilStrengthCalculator = () => {
  const [testMode, setTestMode] = useState('direct');
  const [d1, setD1] = useState({ s: 50, t: 65 });
  const [d2, setD2] = useState({ s: 100, t: 90 });
  const [d3, setD3] = useState({ s: 200, t: 140 });
  const [t1, setT1] = useState({ s3: 50, s1: 150 });
  const [t2, setT2] = useState({ s3: 100, s1: 300 });
  const [t3, setT3] = useState({ s3: 200, s1: 600 });
  const [qu, setQu] = useState(120);
  const [useThreePts, setUseThreePts] = useState(true);

  let c = 0, phi = 0, circles = [], maxS = 100, error = '';

  const linReg = (pts) => {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = pts.length;
    pts.forEach((p) => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x; });
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    return { m, b };
  };

  try {
    if (testMode === 'direct') {
      const pts = [d1, d2];
      if (useThreePts) pts.push(d3);
      const { m, b } = linReg(pts.map((d) => ({ x: d.s, y: d.t })));
      phi = Math.atan(m) * (180 / Math.PI);
      c = b;
      maxS = Math.max(...pts.map((d) => d.s)) * 1.2;
    } else if (testMode === 'triaxial') {
      const pts = [t1, t2];
      if (useThreePts) pts.push(t3);
      const reg = linReg(pts.map((d) => ({ x: d.s3, y: d.s1 })));
      if (reg.m <= 0) error = 'ข้อมูลไม่สามารถหาจุดตัดความวิบัติได้';
      else {
        phi = 2 * (Math.atan(Math.sqrt(reg.m)) * (180 / Math.PI) - 45);
        c = reg.b / (2 * Math.sqrt(reg.m));
        circles = pts.map((d) => ({ cx: (d.s1 + d.s3) / 2, r: (d.s1 - d.s3) / 2 }));
        maxS = Math.max(...pts.map((d) => d.s1)) * 1.1;
      }
    } else if (testMode === 'uct') {
      c = qu / 2;
      phi = 0;
      circles = [{ cx: qu / 2, r: qu / 2 }];
      maxS = qu * 1.2;
    }
  } catch { error = 'เกิดข้อผิดพลาดในการคำนวณ'; }

  if (maxS <= 0) maxS = 100;
  const svgW = 400;
  const svgH = 220;
  const scale = (svgW - 50) / maxS;

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] shadow-inner space-y-3 text-xs">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sky-400 font-bold">เลือกวิธีทดสอบ (Test Type)</label>
          <select value={testMode} onChange={(e) => setTestMode(e.target.value)} className="inp py-1 bg-[#050811]">
            <option value="direct">Direct Shear Test</option>
            <option value="triaxial">Triaxial Test</option>
            <option value="uct">Unconfined Compression Test (UCT)</option>
          </select>
        </div>

        {testMode === 'direct' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center text-slate-400 font-bold"><span className="border-b border-[#1E3A5F] pb-1">Normal Stress (σ)</span><span className="border-b border-[#1E3A5F] pb-1">Shear Stress (τ)</span></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" value={d1.s} onChange={(e) => setD1({ ...d1, s: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={d1.t} onChange={(e) => setD1({ ...d1, t: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" value={d2.s} onChange={(e) => setD2({ ...d2, s: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={d2.t} onChange={(e) => setD2({ ...d2, t: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>
            {useThreePts && <div className="grid grid-cols-2 gap-2"><input type="number" value={d3.s} onChange={(e) => setD3({ ...d3, s: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={d3.t} onChange={(e) => setD3({ ...d3, t: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>}
            <label className="flex items-center gap-2 mt-2 text-sky-300 font-bold cursor-pointer"><input type="checkbox" checked={useThreePts} onChange={(e) => setUseThreePts(e.target.checked)} className="accent-sky-500" /> ใช้ข้อมูล 3 จุดประเมินค่า</label>
          </div>
        )}

        {testMode === 'triaxial' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center text-slate-400 font-bold"><span className="border-b border-[#1E3A5F] pb-1">Confining Stress (σ3)</span><span className="border-b border-[#1E3A5F] pb-1">Major Principal (σ1)</span></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" value={t1.s3} onChange={(e) => setT1({ ...t1, s3: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={t1.s1} onChange={(e) => setT1({ ...t1, s1: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>
            <div className="grid grid-cols-2 gap-2"><input type="number" value={t2.s3} onChange={(e) => setT2({ ...t2, s3: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={t2.s1} onChange={(e) => setT2({ ...t2, s1: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>
            {useThreePts && <div className="grid grid-cols-2 gap-2"><input type="number" value={t3.s3} onChange={(e) => setT3({ ...t3, s3: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /><input type="number" value={t3.s1} onChange={(e) => setT3({ ...t3, s1: parseFloat(e.target.value) || 0 })} className="inp text-center font-mono" /></div>}
            <label className="flex items-center gap-2 mt-2 text-sky-300 font-bold cursor-pointer"><input type="checkbox" checked={useThreePts} onChange={(e) => setUseThreePts(e.target.checked)} className="accent-sky-500" /> ใช้ข้อมูล 3 จุดประเมินค่า</label>
          </div>
        )}

        {testMode === 'uct' && (
          <div className="flex gap-4 items-center">
            <label className="text-slate-400 font-bold">Unconfined Compressive Strength (qu)</label>
            <input type="number" value={qu} onChange={(e) => setQu(parseFloat(e.target.value) || 0)} className="flex-1 inp text-center font-mono" />
          </div>
        )}
      </div>

      <div className="bg-[#050811] border border-[#1E3A5F] rounded-xl p-4 sm:p-6 overflow-hidden flex flex-col shadow-lg">
        {error ? (
          <div className="text-red-400 font-bold bg-red-950/50 p-4 rounded-xl border border-red-900/50 w-full text-center">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-center mb-6">
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-[10px] text-amber-400 font-bold uppercase mb-1">Cohesion (c)</div><div className="text-xl sm:text-2xl font-bold font-mono text-white">{c.toFixed(2)}</div></div>
              <div className="bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F]"><div className="text-[10px] text-sky-400 font-bold uppercase mb-1">Friction Angle (φ)</div><div className="text-xl sm:text-2xl font-bold font-mono text-white">{phi.toFixed(2)}°</div></div>
            </div>
            <div className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2 relative shadow-inner overflow-x-auto no-scrollbar">
              <div className="text-[9px] text-slate-500 absolute top-2 right-4 font-mono font-bold">Mohr-Coulomb Failure Envelope</div>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[300px] h-auto drop-shadow-md">
                <g transform={`translate(20, ${svgH - 20}) scale(1, -1)`}>
                  <line x1="0" y1="0" x2={svgW - 30} y2="0" stroke="#475569" strokeWidth="2" />
                  <line x1="0" y1="0" x2="0" y2={svgH - 40} stroke="#475569" strokeWidth="2" />
                  <line x1="0" y1={c * scale} x2={maxS * scale} y2={(c + maxS * Math.tan((phi * Math.PI) / 180)) * scale} stroke="#F59E0B" strokeWidth="2.5" />
                  {(testMode === 'triaxial' || testMode === 'uct') && circles.map((cir, idx) => (
                    <circle key={idx} cx={cir.cx * scale} cy="0" r={cir.r * scale} fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 2" />
                  ))}
                  {testMode === 'direct' && [d1, d2, useThreePts ? d3 : null].filter(Boolean).map((pt, idx) => (
                    <circle key={idx} cx={pt.s * scale} cy={pt.t * scale} r="4" fill="#38BDF8" />
                  ))}
                </g>
                <text x="25" y="15" fill="#94A3B8" fontSize="10" fontWeight="bold">τ</text>
                <text x={svgW - 15} y={svgH - 5} fill="#94A3B8" fontSize="10" fontWeight="bold">σ</text>
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function CivilTools({ toolId }) {
  if (toolId === 'beam') return <BeamCalculator />;
  if (toolId === 'rc_design') return <RCBeamDesign />;
  if (toolId === 'steel_table') return <SteelSectionViewer />;
  if (toolId === 'concrete') return <ConcreteCalculator />;
  if (toolId === 'soil_phase') return <SoilPhaseCalculator />;
  if (toolId === 'mohr_circle') return <SoilStrengthCalculator />;
  return null;
}