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
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const solverSvgRef = React.useRef(null);
  const labSvgRef = React.useRef(null);

  const [mainTab, setMainTab] = useState('solver'); // 'solver' | 'lab' | 'learn' | 'practice'
  const [copiedMsg, setCopiedMsg] = useState('');

  const flashCopy = (text, label = 'คัดลอกสรุปแล้ว') => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedMsg(label);
    setTimeout(() => setCopiedMsg(''), 2000);
  };

  const downloadSvgChart = (svgEl, filename) => {
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#0a101f');
    clone.insertBefore(bg, clone.firstChild);
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const linReg = (pts, forceZeroIntercept = false) => {
    const n = pts.length;
    if (n === 0) return { m: 0, b: 0, r2: 0 };
    if (forceZeroIntercept) {
      const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
      const sumXX = pts.reduce((s, p) => s + p.x * p.x, 0);
      const m = sumXX > 1e-12 ? sumXY / sumXX : 0;
      const meanY = pts.reduce((s, p) => s + p.y, 0) / n;
      const ssTot = pts.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
      const ssRes = pts.reduce((s, p) => s + Math.pow(p.y - m * p.x, 2), 0);
      const r2 = ssTot < 1e-12 ? 1 : Math.max(0, 1 - ssRes / ssTot);
      return { m, b: 0, r2 };
    }
    if (n < 2) return { m: 0, b: pts[0].y, r2: 1 };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    pts.forEach((p) => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x; });
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return { m: 0, b: sumY / n, r2: 0 };
    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;
    const meanY = sumY / n;
    const ssTot = pts.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
    const ssRes = pts.reduce((s, p) => s + Math.pow(p.y - (m * p.x + b), 2), 0);
    const r2 = ssTot < 1e-12 ? 1 : Math.max(0, 1 - ssRes / ssTot);
    return { m, b, r2 };
  };

  // ==================== TAB 1: SOLVER & INTERACTIVE MOHR'S CIRCLE ====================
  const [solverSub, setSolverSub] = useState('plane'); // 'plane' | 'principal'
  const [s1In, setS1In] = useState('400');
  const [s3In, setS3In] = useState('200');
  const [uIn, setUIn] = useState('100');
  const [cIn, setCIn] = useState('0');
  const [phiIn, setPhiIn] = useState('30');
  const [angleMode, setAngleMode] = useState('theta'); // 'theta' (from σ1 plane) | 'alpha' (from σ3 plane)
  const [angleIn, setAngleIn] = useState('60');
  const [showSolverSteps, setShowSolverSteps] = useState(true);

  // Reverse Principal Stress Solver
  const [revTarget, setRevTarget] = useState('s1'); // 's1' | 's3' | 'phi'
  const [revS1, setRevS1] = useState('300');
  const [revS3, setRevS3] = useState('100');
  const [revC, setRevC] = useState('0');
  const [revPhi, setRevPhi] = useState('30');

  const s1 = parseFloat(s1In) || 0;
  const s3 = parseFloat(s3In) || 0;
  const u = parseFloat(uIn) || 0;
  const cEff = Math.max(0, parseFloat(cIn) || 0);
  const phiEff = Math.max(0, Math.min(89, parseFloat(phiIn) || 0));
  const angVal = parseFloat(angleIn) || 0;

  const s1Eff = s1 - u;
  const s3Eff = s3 - u;
  const pTot = (s1 + s3) / 2;
  const pEff = (s1Eff + s3Eff) / 2;
  const R = (s1 - s3) / 2;
  const solverValid = s1 >= s3;

  const thetaDeg = angleMode === 'theta' ? angVal : 90 - angVal;
  const alphaDeg = angleMode === 'alpha' ? angVal : 90 - angVal;
  const thetaF = 45 + phiEff / 2;
  const alphaF = 45 - phiEff / 2;

  // Stresses on chosen plane (Total & Effective)
  const sigmaPlaneTot = pTot + R * Math.cos(2 * thetaDeg * DEG);
  const sigmaPlaneEff = pEff + R * Math.cos(2 * thetaDeg * DEG);
  const tauPlane = Math.abs(R * Math.sin(2 * thetaDeg * DEG));
  const tauStrengthPlane = cEff + sigmaPlaneEff * Math.tan(phiEff * DEG);
  const fsPlane = tauPlane > 1e-9 ? tauStrengthPlane / tauPlane : Infinity;

  // Overall Mohr Circle vs Failure Envelope check
  const distToEnv = pEff * Math.sin(phiEff * DEG) + cEff * Math.cos(phiEff * DEG);
  const circleStatus = !solverValid
    ? 'invalid'
    : R > distToEnv + 0.05
      ? 'fail'
      : Math.abs(R - distToEnv) <= 0.05
        ? 'tangent'
        : 'stable';

  // Mobilised Friction Angle (when c'=0) & Failure Pore Pressure
  const phiMobCircle = cEff === 0 && pEff > R && R >= 0 ? Math.asin(R / pEff) * RAD : null;
  const phiTotalApparent = cEff === 0 && pTot > R && R >= 0 ? Math.asin(R / pTot) * RAD : null;
  const phiMobPlane = cEff === 0 && sigmaPlaneEff > 0 ? Math.atan(tauPlane / sigmaPlaneEff) * RAD : null;
  const ufCircle = phiEff > 0 ? pTot - (R - cEff * Math.cos(phiEff * DEG)) / Math.sin(phiEff * DEG) : null;
  const ufPlane = phiEff > 0 ? sigmaPlaneTot - (tauPlane - cEff) / Math.tan(phiEff * DEG) : null;
  const sigmaFailPlane = pEff - R * Math.sin(phiEff * DEG);
  const tauFailPlane = R * Math.cos(phiEff * DEG);

  // Reverse Principal Stress Calculation
  const revCalc = (() => {
    const rS1 = parseFloat(revS1) || 0;
    const rS3 = parseFloat(revS3) || 0;
    const rC = Math.max(0, parseFloat(revC) || 0);
    const rPhi = Math.max(0, Math.min(89, parseFloat(revPhi) || 0));
    const nPhi = Math.pow(Math.tan((45 + rPhi / 2) * DEG), 2);
    const sqrtN = Math.sqrt(nPhi);

    if (revTarget === 's1') {
      const outS1 = rS3 * nPhi + 2 * rC * sqrtN;
      const p = (outS1 + rS3) / 2;
      const rad = (outS1 - rS3) / 2;
      const sn = p - rad * Math.sin(rPhi * DEG);
      const tf = rad * Math.cos(rPhi * DEG);
      return { label: "σ'₁ (Major Effective Principal Stress)", value: `${outS1.toFixed(2)} kPa`, nPhi, thetaF: 45 + rPhi / 2, sn, tf, s1: outS1, s3: rS3, phi: rPhi, c: rC };
    }
    if (revTarget === 's3') {
      const outS3 = (rS1 - 2 * rC * sqrtN) / nPhi;
      const p = (rS1 + outS3) / 2;
      const rad = (rS1 - outS3) / 2;
      const sn = p - rad * Math.sin(rPhi * DEG);
      const tf = rad * Math.cos(rPhi * DEG);
      return { label: "σ'₃ (Minor Effective Principal Stress)", value: `${outS3.toFixed(2)} kPa`, nPhi, thetaF: 45 + rPhi / 2, sn, tf, s1: rS1, s3: outS3, phi: rPhi, c: rC };
    }
    if (rS1 <= rS3 || rS1 + rS3 <= 0) return { err: "ต้องกำหนด σ'₁ > σ'₃ และ σ'₁ + σ'₃ > 0" };
    const sinP = (rS1 - rS3) / (rS1 + rS3);
    if (sinP >= 1) return { err: "ไม่สามารถหาค่า φ' ได้ (σ'₃ ต้องมากกว่า 0 เมื่อ c'=0)" };
    const outPhi = Math.asin(sinP) * RAD;
    const outN = (1 + sinP) / (1 - sinP);
    const p = (rS1 + rS3) / 2;
    const rad = (rS1 - rS3) / 2;
    return {
      label: "φ' (Effective Friction Angle เมื่อ c'=0)",
      value: `${outPhi.toFixed(2)}°`,
      nPhi: outN,
      thetaF: 45 + outPhi / 2,
      sn: p - rad * sinP,
      tf: rad * Math.cos(outPhi * DEG),
      s1: rS1,
      s3: rS3,
      phi: outPhi,
      c: 0
    };
  })();

  // ==================== TAB 2: LAB DATA PROCESSOR ====================
  const [labMode, setLabMode] = useState('direct'); // 'direct' | 'triaxial' | 'uct'
  const [dsInputType, setDsInputType] = useState('force'); // 'force' | 'stress'
  const [boxW, setBoxW] = useState('60'); // mm
  const [boxL, setBoxL] = useState('60'); // mm
  const [dsForceZeroC, setDsForceZeroC] = useState(false);
  const [dsPredictSig, setDsPredictSig] = useState('250');
  const [dsRows, setDsRows] = useState([
    { id: 'ds1', n: '360', tPeak: '252', tRes: '220', s: '100', tauPeak: '70', tauRes: '61' },
    { id: 'ds2', n: '720', tPeak: '504', tRes: '440', s: '200', tauPeak: '140', tauRes: '122' },
    { id: 'ds3', n: '1080', tPeak: '756', tRes: '660', s: '300', tauPeak: '210', tauRes: '183' }
  ]);
  const [showResidual, setShowResidual] = useState(false);

  // Triaxial Lab State
  const [triType, setTriType] = useState('CU'); // 'CD' | 'CU' | 'UU'
  const [triInputStyle, setTriInputStyle] = useState('qf'); // 'qf' (σ3, qf) | 's1' (σ3, σ1)
  const [triForceZeroC, setTriForceZeroC] = useState(false);
  const [triRows, setTriRows] = useState([
    { id: 'tr1', s3: '100', qf: '100', s1: '200', uf: '50' },
    { id: 'tr2', s3: '200', qf: '200', s1: '400', uf: '100' }
  ]);
  const [showAreaTool, setShowAreaTool] = useState(false);
  const [acD0, setAcD0] = useState('50'); // mm
  const [acH0, setAcH0] = useState('100'); // mm
  const [acDh, setAcDh] = useState('10'); // mm
  const [acDv, setAcDv] = useState('4'); // cm³ (mL)
  const [acF, setAcF] = useState('420'); // N

  // UCT State
  const [uctQu, setUctQu] = useState('120');

  const boxAreaM2 = ((parseFloat(boxW) || 60) * (parseFloat(boxL) || 60)) / 1e6;

  const dsParsed = dsRows
    .map((r) => {
      if (dsInputType === 'force') {
        const sig = boxAreaM2 > 0 ? (parseFloat(r.n) || 0) / boxAreaM2 / 1000 : 0; // kPa
        const tp = boxAreaM2 > 0 ? (parseFloat(r.tPeak) || 0) / boxAreaM2 / 1000 : 0;
        const tr = boxAreaM2 > 0 ? (parseFloat(r.tRes) || 0) / boxAreaM2 / 1000 : 0;
        return { id: r.id, s: sig, tp, tr };
      }
      return { id: r.id, s: parseFloat(r.s) || 0, tp: parseFloat(r.tauPeak) || 0, tr: parseFloat(r.tauRes) || 0 };
    })
    .filter((x) => !Number.isNaN(x.s) && !Number.isNaN(x.tp));

  const dsPeakReg = linReg(dsParsed.map((p) => ({ x: p.s, y: p.tp })), dsForceZeroC);
  const dsPeakPhi = Math.atan(dsPeakReg.m) * RAD;
  const dsPeakC = dsPeakReg.b;

  const dsResReg = linReg(dsParsed.map((p) => ({ x: p.s, y: p.tr })), dsForceZeroC);
  const dsResPhi = Math.atan(dsResReg.m) * RAD;
  const dsResC = dsResReg.b;

  const dsMinS = dsParsed.length ? Math.min(...dsParsed.map((p) => p.s)) : 0;
  const dsMaxS = dsParsed.length ? Math.max(...dsParsed.map((p) => p.s)) : 0;
  const predSigVal = parseFloat(dsPredictSig);
  const predTauVal = !Number.isNaN(predSigVal) ? dsPeakC + predSigVal * Math.tan(dsPeakPhi * DEG) : null;
  const isExtrapolating = !Number.isNaN(predSigVal) && dsParsed.length >= 2 && (predSigVal < dsMinS || predSigVal > dsMaxS);

  // Triaxial Analysis
  const triParsed = triRows.map((r) => {
    const sig3 = parseFloat(r.s3) || 0;
    const sig1 = triInputStyle === 'qf' ? sig3 + (parseFloat(r.qf) || 0) : (parseFloat(r.s1) || 0);
    const qfVal = sig1 - sig3;
    const ufVal = triType === 'CU' ? (parseFloat(r.uf) || 0) : 0;
    const s3e = sig3 - ufVal;
    const s1e = sig1 - ufVal;
    return {
      id: r.id,
      s3: sig3,
      s1: sig1,
      qf: qfVal,
      uf: ufVal,
      s3e,
      s1e,
      pTot: (sig1 + sig3) / 2,
      pEff: (s1e + s3e) / 2,
      R: qfVal / 2
    };
  });

  const solveTriEnvelope = (circles, forceZeroC) => {
    if (circles.length === 0) return { err: 'กรุณาเพิ่มข้อมูลอย่างน้อย 1 ตัวอย่าง' };
    if (circles.some((x) => x.R <= 0)) return { err: 'ค่า σ₁ ต้องมากกว่า σ₃ (หรือ qf > 0) ทุกตัวอย่าง' };
    if (circles.length === 1) {
      const { p, R: rVal } = circles[0];
      if (p <= rVal) return { err: 'ข้อมูลตัวอย่างเดียวไม่สอดคล้อง (R ≥ p)' };
      const phi = Math.asin(rVal / p) * RAD;
      return { c: 0, phi, r2: 1, note: "คำนวณจาก 1 ตัวอย่างโดยสมมติ c' = 0" };
    }
    const reg = linReg(circles.map((x) => ({ x: x.p, y: x.R })), forceZeroC);
    if (reg.m >= 1 || reg.m < -0.05) return { err: 'ข้อมูลไม่สอดคล้องทางกายภาพ (ความชัน sin φ อยู่นอกช่วง 0–1)' };
    const clampedM = Math.max(0, Math.min(0.9999, reg.m));
    const phi = Math.asin(clampedM) * RAD;
    const c = reg.b / Math.cos(phi * DEG);
    return { c, phi, r2: reg.r2 };
  };

  const triEffectiveRes = triType === 'UU'
    ? null
    : solveTriEnvelope(triParsed.map((x) => ({ p: x.pEff, R: x.R })), triForceZeroC);

  const triTotalRes = triType === 'UU'
    ? {
        c: triParsed.length ? triParsed.reduce((s, x) => s + x.R, 0) / triParsed.length : 0,
        phi: 0,
        r2: 1
      }
    : solveTriEnvelope(triParsed.map((x) => ({ p: x.pTot, R: x.R })), triForceZeroC);

  // Triaxial Area Correction Calculation (Slide 37)
  const areaCorr = (() => {
    const d0 = parseFloat(acD0) || 0;
    const h0 = parseFloat(acH0) || 0;
    const dh = parseFloat(acDh) || 0;
    const dvCm3 = parseFloat(acDv) || 0;
    const fN = parseFloat(acF) || 0;
    if (d0 <= 0 || h0 <= 0) return null;
    const a0Mm2 = (Math.PI * d0 * d0) / 4;
    const v0Cm3 = (a0Mm2 * h0) / 1000;
    const epsA = dh / h0;
    const epsV = dvCm3 / v0Cm3;
    if (1 - epsA <= 0) return null;
    const aCorrMm2 = a0Mm2 * ((1 - epsV) / (1 - epsA));
    const qKpa = aCorrMm2 > 0 ? (fN / (aCorrMm2 / 1e6)) / 1000 : 0;
    return { a0Mm2, v0Cm3, epsA, epsV, aCorrMm2, qKpa };
  })();

  // ==================== TAB 3: INTERACTIVE VISUAL LEARNING ====================
  const [sandDrained, setSandDrained] = useState(false);
  const [sandSv, setSandSv] = useState(20);
  const [sandSh, setSandSh] = useState(10);
  const [soilStateMode, setSoilStateMode] = useState('dense'); // 'dense' | 'loose'

  const sandIsIsotropic = Math.abs(sandSv - sandSh) < 0.01;
  const sandEffectiveMean = sandDrained ? (sandSv + sandSh) / 2 : (sandIsIsotropic ? 0 : null);
  const sandUw = sandDrained ? 0 : (sandIsIsotropic ? sandSv : null);

  // ==================== TAB 4: ENGINEERING PRACTICE ====================
  const [pracCu, setPracCu] = useState('60');
  const [pracC, setPracC] = useState('5');
  const [pracPhi, setPracPhi] = useState('25');
  const [pracSigN, setPracSigN] = useState('150');
  const [pracCase, setPracCase] = useState('loading'); // 'loading' | 'excavation'

  const [wizSoil, setWizSoil] = useState('clay'); // 'sand' | 'clay'
  const [wizWork, setWizWork] = useState('loading_fast'); // 'loading_fast' | 'excavation' | 'long_term'

  const shortTermTau = Math.max(0, parseFloat(pracCu) || 0);
  const longTermTau = Math.max(0, (parseFloat(pracC) || 0) + (parseFloat(pracSigN) || 0) * Math.tan((parseFloat(pracPhi) || 0) * DEG));
  const maxBarTau = Math.max(shortTermTau, longTermTau, 10);

  const wizAdvice = (() => {
    if (wizSoil === 'sand') {
      return {
        condition: 'Drained (ระบายน้ำได้ทันทีเพราะค่าความซึมน้ำสูง)',
        params: "Effective Stress: c' (= 0 สำหรับทรายหลวม/Ultimate) และ φ'",
        tests: 'Direct Shear Test (ทดสอบแห้งได้ รวดเร็ว) หรือ CD Triaxial Test',
        critical: 'วิเคราะห์ด้วย Effective Stress ตลอดอายุงาน (ระวังระดับน้ำใต้ดินสูงขึ้นทำให้ σ\' ลดลง)'
      };
    }
    if (wizWork === 'loading_fast') {
      return {
        condition: 'Short-term Undrained (ดินเหนียวระบายน้ำไม่ทัน แรงดันน้ำส่วนเกินพุ่งสูง)',
        params: 'Total Stress: cu และ φu = 0 (ควรเช็ก Long-term คู่กันด้วย)',
        tests: 'UU Triaxial Test, Unconfined Compression (UCT) หรือ Vane Shear ในสนาม',
        critical: 'วันแรกหลังถมดิน/ก่อสร้าง (Short-term) มักวิกฤตที่สุด เพราะน้ำรับน้ำหนักแทนเม็ดดิน ทำให้กำลังเฉือนต่ำสุด'
      };
    }
    if (wizWork === 'excavation') {
      return {
        condition: 'Long-term Drained (หลังขุดดิน แรงดันน้ำติดลบจะค่อยๆ คืนตัวจนดินอ่อนลง)',
        params: "Effective Stress: c' และ φ' (เช็ก Short-term ตอนขุดด้วย)",
        tests: 'CU Triaxial (พร้อมวัดแรงดันน้ำ u เพื่อได้ทั้ง Total & Effective) หรือ CD Triaxial',
        critical: 'ระยะยาว (Long-term) เป็นช่วงอันตรายที่สุดสำหรับงานขุดบ่อ/ตัดลาดดิน เพราะเมื่อแรงดันน้ำลบสลายตัว ค่า σ\' จะลดลงจนลาดอาจพังทลาย'
      };
    }
    return {
      condition: 'Long-term Drained (แรงดันน้ำส่วนเกินระบายออกหมดแล้ว Δu = 0)',
      params: "Effective Stress: c' และ φ'",
      tests: 'CU Triaxial + วัด u (นิยมสุดเพราะเร็วกว่า CD) หรือ CD Triaxial / Slow Direct Shear',
      critical: 'ใช้พารามิเตอร์ Effective Stress ควบคู่กับการประเมินระดับน้ำใต้ดินสูงสุดที่เป็นไปได้'
    };
  })();

  // ==================== SVG RENDERER FOR SOLVER MOHR'S CIRCLE ====================
  const renderSolverMohrSvg = () => {
    const W = 460;
    const H = 240;
    const ox = 48;
    const oy = 205;
    const plotW = W - ox - 20;
    const plotH = oy - 22;

    const maxX = Math.max(s1 * 1.18, s1Eff * 1.18, 100);
    const envAtMaxX = cEff + maxX * Math.tan(phiEff * DEG);
    const maxY = Math.max(R * 1.45, Math.min(envAtMaxX, maxX * 0.85), 60);
    const sc = Math.min(plotW / maxX, plotH / maxY);

    const toX = (val) => ox + val * sc;
    const toY = (val) => oy - val * sc;

    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((plotW / sc) * f));
    const yTicks = [0, 0.5, 1].map((f) => Math.round((plotH / sc) * f));

    const envEndX = plotW / sc;
    const envEndY = cEff + envEndX * Math.tan(phiEff * DEG);

    // Clipping line to plot area
    const effTopX = toX(s1Eff);
    const effBotX = toX(s3Eff);
    const totTopX = toX(s1);
    const totBotX = toX(s3);
    const rPx = Math.max(0, R * sc);

    return (
      <svg ref={solverSvgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        {/* Grid */}
        {xTicks.map((v, i) => (
          <g key={`xg-${i}`}>
            <line x1={toX(v)} y1={18} x2={toX(v)} y2={oy} stroke="#1E3A5F" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
            <text x={toX(v)} y={oy + 14} fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">{v}</text>
          </g>
        ))}
        {yTicks.map((v, i) => (
          <g key={`yg-${i}`}>
            <line x1={ox} y1={toY(v)} x2={W - 15} y2={toY(v)} stroke="#1E3A5F" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
            <text x={ox - 6} y={toY(v) + 3} fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="monospace">{v}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={ox} y1={oy} x2={W - 12} y2={oy} stroke="#64748B" strokeWidth="1.8" />
        <line x1={ox} y1={oy} x2={ox} y2={15} stroke="#64748B" strokeWidth="1.8" />
        <text x={W - 14} y={oy + 27} fill="#CBD5E1" fontSize="10" textAnchor="end" fontWeight="bold">Normal Stress, σ / σ&apos; (kPa)</text>
        <text x={ox + 6} y={24} fill="#CBD5E1" fontSize="10" fontWeight="bold">τ (kPa)</text>

        {/* Mohr-Coulomb Failure Envelope */}
        <line
          x1={toX(0)}
          y1={toY(cEff)}
          x2={toX(envEndX)}
          y2={toY(envEndY)}
          stroke="#F59E0B"
          strokeWidth="2.4"
        />

        {/* Total Stress Semicircle (when u != 0) */}
        {solverValid && Math.abs(u) > 0.01 && rPx > 0 && (
          <g>
            <path
              d={`M ${totBotX} ${oy} A ${rPx} ${rPx} 0 0 1 ${totTopX} ${oy}`}
              fill="rgba(148,163,184,0.08)"
              stroke="#94A3B8"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
            <circle cx={totBotX} cy={oy} r="3" fill="#94A3B8" />
            <circle cx={totTopX} cy={oy} r="3" fill="#94A3B8" />
            <text x={toX(pTot)} y={toY(R) - 6} fill="#94A3B8" fontSize="9" textAnchor="middle">Total</text>
            {/* Shift arrow u */}
            <line x1={toX(pTot)} y1={oy - 8} x2={toX(pEff)} y2={oy - 8} stroke="#2DD4BF" strokeWidth="1.5" />
            <text x={(toX(pTot) + toX(pEff)) / 2} y={oy - 12} fill="#2DD4BF" fontSize="9" textAnchor="middle" fontFamily="monospace">u={u}</text>
          </g>
        )}

        {/* Effective Stress Semicircle */}
        {solverValid && rPx > 0 && (
          <g>
            <path
              d={`M ${effBotX} ${oy} A ${rPx} ${rPx} 0 0 1 ${effTopX} ${oy}`}
              fill={circleStatus === 'fail' ? 'rgba(239,68,68,0.14)' : 'rgba(56,189,248,0.14)'}
              stroke={circleStatus === 'fail' ? '#F87171' : '#38BDF8'}
              strokeWidth="2.4"
            />
            <circle cx={effBotX} cy={oy} r="3.5" fill="#38BDF8" />
            <circle cx={effTopX} cy={oy} r="3.5" fill="#38BDF8" />
            <circle cx={toX(pEff)} cy={oy} r="2.8" fill="#F59E0B" />
            <text x={effBotX} y={oy - 6} fill="#7DD3FC" fontSize="9" textAnchor="middle" fontFamily="monospace">σ&apos;₃</text>
            <text x={effTopX} y={oy - 6} fill="#7DD3FC" fontSize="9" textAnchor="middle" fontFamily="monospace">σ&apos;₁</text>

            {/* Radius to chosen plane */}
            <line x1={toX(pEff)} y1={oy} x2={toX(sigmaPlaneEff)} y2={toY(tauPlane)} stroke="#EC4899" strokeWidth="1.6" strokeDasharray="3 2" />
            <circle cx={toX(sigmaPlaneEff)} cy={toY(tauPlane)} r="4.5" fill="#EC4899" stroke="#fff" strokeWidth="1.5" />
            <text x={toX(sigmaPlaneEff) + 6} y={toY(tauPlane) - 6} fill="#F472B6" fontSize="9" fontWeight="bold" fontFamily="monospace">
              ({sigmaPlaneEff.toFixed(1)}, {tauPlane.toFixed(1)})
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ==================== SVG RENDERER FOR LAB PLOTTER ====================
  const renderLabSvg = () => {
    const W = 460;
    const H = 240;
    const ox = 48;
    const oy = 205;
    const plotW = W - ox - 20;
    const plotH = oy - 22;

    let maxX = 100;
    let maxY = 60;

    if (labMode === 'direct') {
      maxX = Math.max(dsMaxS * 1.25, (!Number.isNaN(predSigVal) ? predSigVal * 1.15 : 0), 100);
      maxY = Math.max(
        ...dsParsed.map((p) => Math.max(p.tp, p.tr) * 1.25),
        dsPeakC + maxX * Math.tan(dsPeakPhi * DEG),
        60
      );
    } else if (labMode === 'triaxial') {
      maxX = Math.max(...triParsed.map((x) => Math.max(x.s1, x.s1e) * 1.15), 100);
      const envPhi = triEffectiveRes && !triEffectiveRes.err ? triEffectiveRes.phi : (triTotalRes?.phi || 0);
      const envC = triEffectiveRes && !triEffectiveRes.err ? triEffectiveRes.c : (triTotalRes?.c || 0);
      maxY = Math.max(...triParsed.map((x) => x.R * 1.4), envC + maxX * Math.tan(envPhi * DEG) * 0.7, 60);
    } else {
      const qv = Math.max(parseFloat(uctQu) || 0, 10);
      maxX = qv * 1.3;
      maxY = (qv / 2) * 1.6;
    }

    const sc = Math.min(plotW / maxX, plotH / maxY);
    const toX = (v) => ox + v * sc;
    const toY = (v) => oy - v * sc;
    const endX = plotW / sc;
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(endX * f));
    const yTicks = [0, 0.5, 1].map((f) => Math.round((plotH / sc) * f));

    return (
      <svg ref={labSvgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
        {xTicks.map((v, i) => (
          <g key={`lxg-${i}`}>
            <line x1={toX(v)} y1={18} x2={toX(v)} y2={oy} stroke="#1E3A5F" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
            <text x={toX(v)} y={oy + 14} fill="#94A3B8" fontSize="9" textAnchor="middle" fontFamily="monospace">{v}</text>
          </g>
        ))}
        {yTicks.map((v, i) => (
          <g key={`lyg-${i}`}>
            <line x1={ox} y1={toY(v)} x2={W - 15} y2={toY(v)} stroke="#1E3A5F" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
            <text x={ox - 6} y={toY(v) + 3} fill="#94A3B8" fontSize="9" textAnchor="end" fontFamily="monospace">{v}</text>
          </g>
        ))}

        <line x1={ox} y1={oy} x2={W - 12} y2={oy} stroke="#64748B" strokeWidth="1.8" />
        <line x1={ox} y1={oy} x2={ox} y2={15} stroke="#64748B" strokeWidth="1.8" />
        <text x={W - 14} y={oy + 27} fill="#CBD5E1" fontSize="10" textAnchor="end" fontWeight="bold">Normal Stress, σ (kPa)</text>
        <text x={ox + 6} y={24} fill="#CBD5E1" fontSize="10" fontWeight="bold">τ (kPa)</text>

        {/* Direct Shear Plot */}
        {labMode === 'direct' && (
          <>
            <line x1={toX(0)} y1={toY(dsPeakC)} x2={toX(endX)} y2={toY(dsPeakC + endX * Math.tan(dsPeakPhi * DEG))} stroke="#F59E0B" strokeWidth="2.3" />
            {showResidual && (
              <line x1={toX(0)} y1={toY(dsResC)} x2={toX(endX)} y2={toY(dsResC + endX * Math.tan(dsResPhi * DEG))} stroke="#34D399" strokeWidth="1.8" strokeDasharray="5 3" />
            )}
            {dsParsed.map((p) => (
              <g key={p.id}>
                <circle cx={toX(p.s)} cy={toY(p.tp)} r="4.5" fill="#38BDF8" stroke="#fff" strokeWidth="1.2" />
                {showResidual && <circle cx={toX(p.s)} cy={toY(p.tr)} r="3.5" fill="#34D399" />}
              </g>
            ))}
            {predTauVal !== null && predSigVal >= 0 && (
              <g>
                <rect x={toX(predSigVal) - 4} y={toY(predTauVal) - 4} width="8" height="8" fill="#10B981" stroke="#fff" strokeWidth="1.2" />
                <text x={toX(predSigVal)} y={toY(predTauVal) - 8} fill="#34D399" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  ({predSigVal}, {predTauVal.toFixed(1)})
                </text>
              </g>
            )}
          </>
        )}

        {/* Triaxial Plot */}
        {labMode === 'triaxial' && (
          <>
            {/* Total Stress Circles & Envelope */}
            {triParsed.map((x) => {
              const rPx = Math.max(0, x.R * sc);
              if (rPx <= 0) return null;
              return (
                <path
                  key={`tot-${x.id}`}
                  d={`M ${toX(x.s3)} ${oy} A ${rPx} ${rPx} 0 0 1 ${toX(x.s1)} ${oy}`}
                  fill={triType === 'UU' ? 'rgba(56,189,248,0.12)' : 'none'}
                  stroke={triType === 'CU' ? '#94A3B8' : '#38BDF8'}
                  strokeWidth={triType === 'CU' ? '1.6' : '2.2'}
                  strokeDasharray={triType === 'CU' ? '4 4' : 'none'}
                />
              );
            })}
            {/* Effective Stress Circles for CU */}
            {triType === 'CU' && triParsed.map((x) => {
              const rPx = Math.max(0, x.R * sc);
              if (rPx <= 0) return null;
              return (
                <path
                  key={`eff-${x.id}`}
                  d={`M ${toX(x.s3e)} ${oy} A ${rPx} ${rPx} 0 0 1 ${toX(x.s1e)} ${oy}`}
                  fill="rgba(56,189,248,0.14)"
                  stroke="#38BDF8"
                  strokeWidth="2.3"
                />
              );
            })}
            {/* Total Envelope */}
            {triTotalRes && !triTotalRes.err && (
              <line
                x1={toX(0)}
                y1={toY(triTotalRes.c)}
                x2={toX(endX)}
                y2={toY(triTotalRes.c + endX * Math.tan(triTotalRes.phi * DEG))}
                stroke={triType === 'CU' ? '#94A3B8' : '#F59E0B'}
                strokeWidth={triType === 'CU' ? '1.6' : '2.4'}
                strokeDasharray={triType === 'CU' ? '5 4' : 'none'}
              />
            )}
            {/* Effective Envelope */}
            {triType !== 'UU' && triEffectiveRes && !triEffectiveRes.err && (
              <line
                x1={toX(0)}
                y1={toY(triEffectiveRes.c)}
                x2={toX(endX)}
                y2={toY(triEffectiveRes.c + endX * Math.tan(triEffectiveRes.phi * DEG))}
                stroke="#F59E0B"
                strokeWidth="2.4"
              />
            )}
          </>
        )}

        {/* UCT Plot */}
        {labMode === 'uct' && (() => {
          const qv = Math.max(parseFloat(uctQu) || 0, 0);
          const cuVal = qv / 2;
          const rPx = cuVal * sc;
          return (
            <>
              {rPx > 0 && (
                <path
                  d={`M ${toX(0)} ${oy} A ${rPx} ${rPx} 0 0 1 ${toX(qv)} ${oy}`}
                  fill="rgba(56,189,248,0.14)"
                  stroke="#38BDF8"
                  strokeWidth="2.4"
                />
              )}
              <line x1={toX(0)} y1={toY(cuVal)} x2={toX(endX)} y2={toY(cuVal)} stroke="#F59E0B" strokeWidth="2.4" />
            </>
          );
        })()}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-3xl mx-auto text-xs">
      {/* แถบเลือก 4 โหมดหลัก */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0B1325] p-1.5 rounded-2xl border border-[#1E3A5F] font-bold">
        {[
          ['solver', '📐 โมร์ & เช็กโจทย์'],
          ['lab', '🧪 วิเคราะห์ผลแล็บ'],
          ['learn', '💧 คอนเซปต์ระบายน้ำ'],
          ['practice', '🏗️ งานออกแบบจริง']
        ].map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`py-2 px-2 rounded-xl transition-all ${
              mainTab === id ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-[#0F2547]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {copiedMsg && (
        <div className="text-center text-[11px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 py-1.5 rounded-xl">
          ✓ {copiedMsg}
        </div>
      )}

      {/* ==================== TAB 1: SOLVER ==================== */}
      {mainTab === 'solver' && (
        <div className="space-y-4">
          <div className="flex bg-[#0B1325] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold">
            <button
              type="button"
              onClick={() => setSolverSub('plane')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${solverSub === 'plane' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'}`}
            >
              วงกลมโมร์ &amp; เช็กระนาบวิบัติ (Total vs Effective)
            </button>
            <button
              type="button"
              onClick={() => setSolverSub('principal')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${solverSub === 'principal' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'}`}
            >
              แก้สมการ Principal Stress (σ&apos;₁, σ&apos;₃, Nφ)
            </button>
          </div>

          {solverSub === 'plane' && (
            <>
              <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] space-y-3 shadow-lg">
                {/* ตัวอย่างด่วนจาก Lecture 8 */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#1E3A5F]/70">
                  <span className="text-[10px] text-slate-400 font-bold">โจทย์ตัวอย่าง:</span>
                  <button
                    type="button"
                    onClick={() => { setS1In('300'); setS3In('100'); setUIn('0'); setCIn('0'); setPhiIn('30'); setAngleMode('theta'); setAngleIn('60'); }}
                    className="px-2.5 py-1 rounded-full bg-[#050811] border border-sky-500/40 text-sky-300 hover:bg-sky-600 hover:text-white text-[10px] font-bold"
                  >
                    CD Sand (สไลด์ 47)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setS1In('400'); setS3In('200'); setUIn('100'); setCIn('0'); setPhiIn('30'); setAngleMode('theta'); setAngleIn('60'); }}
                    className="px-2.5 py-1 rounded-full bg-[#050811] border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-[#050811] text-[10px] font-bold"
                  >
                    CU Clay + u (สไลด์ 56)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setS1In('200'); setS3In('75'); setUIn('0'); setCIn('0'); setPhiIn('30'); setAngleMode('theta'); setAngleIn('55'); }}
                    className="px-2.5 py-1 rounded-full bg-[#050811] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white text-[10px] font-bold"
                  >
                    Dry Sand θ=55° (Stable)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">σ₁ รวม (kPa)</label>
                    <input type="number" value={s1In} onChange={(e) => setS1In(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">σ₃ รวม (kPa)</label>
                    <input type="number" value={s3In} onChange={(e) => setS3In(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-teal-300 font-bold block mb-1">แรงดันน้ำ u (kPa)</label>
                    <input type="number" value={uIn} onChange={(e) => setUIn(e.target.value)} className="inp w-full font-mono text-center py-1.5 border-teal-500/50 bg-teal-950/20 text-teal-200" />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-300 font-bold block mb-1">c&apos; (kPa)</label>
                    <input type="number" min="0" value={cIn} onChange={(e) => setCIn(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] text-amber-300 font-bold block mb-1">φ&apos; (องศา)</label>
                    <input type="number" min="0" max="89" step="0.5" value={phiIn} onChange={(e) => setPhiIn(e.target.value)} className="inp w-full font-mono text-center py-1.5" />
                  </div>
                </div>

                {/* สไลเดอร์แรงดันน้ำ u + มุมระนาบ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1E3A5F]/60">
                  <div className="bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F]">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-teal-300 font-bold">ลองเลื่อนแรงดันน้ำ u (ดูวงกลมเลื่อนซ้าย)</span>
                      <span className="font-mono text-white font-bold">{u} kPa</span>
                    </div>
                    <input
                      type="range"
                      min={Math.min(-50, u)}
                      max={Math.max(s3, 150)}
                      step="1"
                      value={u}
                      onChange={(e) => setUIn(e.target.value)}
                      className="w-full accent-teal-400 cursor-pointer"
                    />
                  </div>

                  <div className="bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F] flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex bg-[#0B1325] rounded-lg border border-[#1E3A5F] p-0.5 text-[10px]">
                        <button type="button" onClick={() => setAngleMode('theta')} className={`px-2 py-0.5 rounded font-bold ${angleMode === 'theta' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}>θ (จากระนาบ σ₁)</button>
                        <button type="button" onClick={() => setAngleMode('alpha')} className={`px-2 py-0.5 rounded font-bold ${angleMode === 'alpha' ? 'bg-pink-600 text-white' : 'text-slate-400'}`}>α (จากระนาบ σ₃)</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAngleIn((angleMode === 'theta' ? thetaF : alphaF).toFixed(1))}
                        className="text-[10px] text-amber-300 hover:underline font-bold"
                      >
                        ตั้งมุมวิบัติ ({(angleMode === 'theta' ? thetaF : alphaF).toFixed(1)}°)
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="90" step="0.5" value={angVal} onChange={(e) => setAngleIn(e.target.value)} className="flex-1 accent-pink-500" />
                      <input type="number" step="0.5" value={angleIn} onChange={(e) => setAngleIn(e.target.value)} className="inp w-16 py-0.5 font-mono text-center text-pink-300" />
                    </div>
                  </div>
                </div>
              </div>

              {!solverValid ? (
                <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/60 text-red-300 text-center font-bold">
                  ⚠️ ค่า σ₁ ต้องมากกว่าหรือเท่ากับ σ₃
                </div>
              ) : (
                <div className="bg-[#050811] border border-[#1E3A5F] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                  {/* แถบสถานะวิบัติ + ปุ่ม Export */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      circleStatus === 'fail'
                        ? 'bg-red-950/60 border-red-500 text-red-300'
                        : circleStatus === 'tangent'
                          ? 'bg-amber-950/60 border-amber-400 text-amber-300'
                          : 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                    }`}>
                      {circleStatus === 'fail'
                        ? '✕ FAILURE — วงกลมเกินเส้น Mohr-Coulomb (ดินวิบัติ)'
                        : circleStatus === 'tangent'
                          ? '⚠️ AT FAILURE — วงกลมสัมผัสเส้นพอดี (เริ่มวิบัติ)'
                          : '✓ STABLE — วงกลมอยู่ใต้เส้นวิบัติ (ดินเสถียร)'}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const txt = [
                            `=== Soil Shear Strength Analysis ===`,
                            `Total: σ1=${s1}, σ3=${s3}, u=${u} kPa`,
                            `Effective: σ'1=${s1Eff.toFixed(2)}, σ'3=${s3Eff.toFixed(2)} kPa | p'=${pEff.toFixed(2)}, R=${R.toFixed(2)} kPa`,
                            `Envelope: c'=${cEff} kPa, φ'=${phiEff}° | Status: ${circleStatus.toUpperCase()}`,
                            `Plane (θ=${thetaDeg.toFixed(1)}°, α=${alphaDeg.toFixed(1)}°): σ'n=${sigmaPlaneEff.toFixed(2)} kPa, τ=${tauPlane.toFixed(2)} kPa, τf=${tauStrengthPlane.toFixed(2)} kPa, FS=${Number.isFinite(fsPlane) ? fsPlane.toFixed(2) : '∞'}`,
                            phiMobCircle !== null ? `φ_mob (circle) = ${phiMobCircle.toFixed(2)}°` : '',
                            ufCircle !== null ? `Failure pore pressure u_f (circle) = ${ufCircle.toFixed(2)} kPa` : ''
                          ].filter(Boolean).join('\n');
                          flashCopy(txt);
                        }}
                        className="btn-d py-1 px-2.5 text-[10px]"
                      >
                        📋 คัดลอกสรุป
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSvgChart(solverSvgRef.current, 'BMA_Mohr_Circle')}
                        className="btn-d py-1 px-2.5 text-[10px] text-sky-300"
                      >
                        📥 โหลดกราฟ (.svg)
                      </button>
                    </div>
                  </div>

                  {/* กราฟวงกลมโมร์ + รูปก้อนดินทรงกระบอก */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-9 bg-[#0a101f] border border-slate-700/80 rounded-xl p-2 overflow-x-auto">
                      {renderSolverMohrSvg()}
                      <div className="flex flex-wrap justify-between px-2 pt-1 text-[9px] text-slate-400">
                        <span>เส้นส้ม = Mohr-Coulomb • วงฟ้า = Effective • วงเทาประ = Total • จุดชมพู = ระนาบที่พิจารณา</span>
                        <span className="text-sky-400">Sign Convention: แรงอัด (+)</span>
                      </div>
                    </div>

                    {/* ก้อนดินแสดงระนาบเอียง */}
                    <div className="md:col-span-3 bg-[#0a101f] border border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center">
                      <div className="text-[10px] font-bold text-slate-300 mb-1">Soil Element</div>
                      <svg viewBox="0 0 110 135" className="w-24 h-28">
                        {/* σ1 arrows */}
                        <line x1="55" y1="4" x2="55" y2="20" stroke="#38BDF8" strokeWidth="2.5" />
                        <polygon points="55,23 51,16 59,16" fill="#38BDF8" />
                        <text x="55" y="11" fill="#7DD3FC" fontSize="9" textAnchor="middle" fontWeight="bold" dx="22">σ&apos;₁={s1Eff.toFixed(0)}</text>
                        {/* σ3 arrows */}
                        <line x1="6" y1="68" x2="22" y2="68" stroke="#2DD4BF" strokeWidth="2" />
                        <polygon points="25,68 18,64 18,72" fill="#2DD4BF" />
                        <line x1="104" y1="68" x2="88" y2="68" stroke="#2DD4BF" strokeWidth="2" />
                        <polygon points="85,68 92,64 92,72" fill="#2DD4BF" />
                        {/* Specimen */}
                        <rect x="27" y="25" width="56" height="86" rx="4" fill="#1E293B" stroke="#64748B" strokeWidth="1.8" />
                        {/* Critical failure plane θf */}
                        {(() => {
                          const cx = 55, cy = 68, len = 46;
                          const dx = len * Math.cos(thetaF * DEG);
                          const dy = len * Math.sin(thetaF * DEG);
                          return <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy} stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 2" />;
                        })()}
                        {/* Chosen plane θ */}
                        {(() => {
                          const cx = 55, cy = 68, len = 40;
                          const dx = len * Math.cos(thetaDeg * DEG);
                          const dy = len * Math.sin(thetaDeg * DEG);
                          return <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy} stroke="#EC4899" strokeWidth="2.2" />;
                        })()}
                        <text x="55" y="126" fill="#FCD34D" fontSize="9" textAnchor="middle" fontFamily="monospace">θf = {thetaF.toFixed(1)}°</text>
                      </svg>
                      <div className="text-[9px] text-center text-slate-400 leading-tight">
                        <span className="text-amber-300">ประส้ม</span> = ระนาบวิบัติ<br />
                        <span className="text-pink-400">เส้นชมพู</span> = θ={thetaDeg.toFixed(1)}°
                      </div>
                    </div>
                  </div>

                  {/* การ์ดผลลัพธ์หลัก */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                    <div className="bg-[#0B1325] p-2.5 rounded-xl border border-[#1E3A5F]">
                      <div className="text-[10px] text-slate-400 font-sans font-bold">Effective Principal</div>
                      <div className="text-sm font-bold text-sky-300 mt-0.5">{s1Eff.toFixed(1)} / {s3Eff.toFixed(1)}</div>
                      <div className="text-[9px] text-slate-500">p&apos;={pEff.toFixed(1)}, R={R.toFixed(1)}</div>
                    </div>
                    <div className="bg-[#0B1325] p-2.5 rounded-xl border border-pink-500/40">
                      <div className="text-[10px] text-pink-300 font-sans font-bold">บนระนาบ θ={thetaDeg.toFixed(1)}°</div>
                      <div className="text-sm font-bold text-white mt-0.5">σ&apos;n={sigmaPlaneEff.toFixed(1)}</div>
                      <div className="text-[10px] text-pink-300">τ={tauPlane.toFixed(2)} kPa</div>
                    </div>
                    <div className="bg-[#0B1325] p-2.5 rounded-xl border border-[#1E3A5F]">
                      <div className="text-[10px] text-amber-300 font-sans font-bold">กำลังเฉือน τf / FS</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">{tauStrengthPlane.toFixed(2)} kPa</div>
                      <div className={`text-[10px] font-bold ${fsPlane < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                        FS = {Number.isFinite(fsPlane) ? fsPlane.toFixed(2) : '∞'}
                      </div>
                    </div>
                    <div className="bg-[#0B1325] p-2.5 rounded-xl border border-[#1E3A5F]">
                      <div className="text-[10px] text-teal-300 font-sans font-bold">
                        {phiMobCircle !== null ? 'φ_mob (วงกลม)' : 'แรงดันน้ำวิบัติ u_f'}
                      </div>
                      <div className="text-sm font-bold text-teal-300 mt-0.5">
                        {phiMobCircle !== null ? `${phiMobCircle.toFixed(2)}°` : (ufCircle !== null ? `${ufCircle.toFixed(1)} kPa` : '-')}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {ufCircle !== null ? `u_f (วงกลม)=${ufCircle.toFixed(1)}` : 'φ\'=0 (Undrained)'}
                      </div>
                    </div>
                  </div>

                  {/* แสดงวิธีทำทีละขั้น (Show Steps) */}
                  <div className="border-t border-[#1E3A5F] pt-3">
                    <button
                      type="button"
                      onClick={() => setShowSolverSteps((v) => !v)}
                      className="text-sky-300 hover:text-sky-200 font-bold text-xs flex items-center gap-1.5"
                    >
                      <i className={`fas ${showSolverSteps ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                      <span>{showSolverSteps ? 'ซ่อนวิธีทำทีละขั้น (Hide Steps)' : '👁️ แสดงวิธีทำทีละขั้นสำหรับเช็กการบ้าน (Show Steps)'}</span>
                    </button>

                    {showSolverSteps && (
                      <div className="mt-2.5 p-3.5 rounded-xl bg-[#0B1325] border border-dashed border-sky-500/40 font-mono text-[11px] text-slate-300 space-y-2 leading-relaxed">
                        <div>
                          <span className="text-sky-400 font-bold">1. Effective Principal Stresses:</span>{' '}
                          σ&apos;₁ = {s1} − {u} = <b className="text-white">{s1Eff.toFixed(2)}</b> kPa,{' '}
                          σ&apos;₃ = {s3} − {u} = <b className="text-white">{s3Eff.toFixed(2)}</b> kPa
                        </div>
                        <div>
                          <span className="text-sky-400 font-bold">2. Mohr&apos;s Circle Center &amp; Radius:</span>{' '}
                          p&apos; = ({s1Eff.toFixed(1)} + {s3Eff.toFixed(1)}) / 2 = <b className="text-white">{pEff.toFixed(2)}</b> kPa,{' '}
                          R = τ_max = ({s1Eff.toFixed(1)} − {s3Eff.toFixed(1)}) / 2 = <b className="text-white">{R.toFixed(2)}</b> kPa
                        </div>
                        <div>
                          <span className="text-sky-400 font-bold">3. Stress on Plane (θ = {thetaDeg.toFixed(1)}° | α = {alphaDeg.toFixed(1)}°):</span><br />
                          σ&apos;n = {pEff.toFixed(2)} + {R.toFixed(2)} cos({(2 * thetaDeg).toFixed(1)}°) = <b className="text-pink-300">{sigmaPlaneEff.toFixed(2)} kPa</b><br />
                          τ = {R.toFixed(2)} sin({(2 * thetaDeg).toFixed(1)}°) = <b className="text-pink-300">{tauPlane.toFixed(2)} kPa</b>
                        </div>
                        <div>
                          <span className="text-sky-400 font-bold">4. Shear Strength &amp; Factor of Safety:</span><br />
                          τ_f = c&apos; + σ&apos;n tan(φ&apos;) = {cEff} + ({sigmaPlaneEff.toFixed(2)}) tan({phiEff}°) = <b className="text-amber-300">{tauStrengthPlane.toFixed(2)} kPa</b>{' '}
                          → FS = {tauStrengthPlane.toFixed(2)} / {tauPlane.toFixed(2)} = <b className="text-emerald-300">{Number.isFinite(fsPlane) ? fsPlane.toFixed(2) : '∞'}</b>
                        </div>
                        <div>
                          <span className="text-sky-400 font-bold">5. Failure Check &amp; Critical Pore Pressure:</span><br />
                          ระยะตั้งฉากจากจุดศูนย์กลางถึงเส้นวิบัติ d = p&apos;sin(φ&apos;) + c&apos;cos(φ&apos;) = <b className="text-white">{distToEnv.toFixed(2)} kPa</b> (เทียบกับ R = {R.toFixed(2)} kPa)<br />
                          ระนาบวิบัติ: θ_f = 45° + {phiEff}/2 = <b className="text-amber-300">{thetaF.toFixed(2)}°</b> (α_f = {alphaF.toFixed(2)}°) → จุดสัมผัส ({sigmaFailPlane.toFixed(2)}, {tauFailPlane.toFixed(2)}) kPa
                          {ufCircle !== null && (
                            <>
                              <br />แรงดันน้ำที่ทำให้วงกลมแตะเส้นวิบัติ: u_f = p − (R − c&apos;cosφ&apos;)/sinφ&apos; = <b className="text-teal-300">{ufCircle.toFixed(2)} kPa</b>
                              {' '}| บนระนาบนี้ (คง σ, τ): u_f,plane = <b className="text-teal-300">{ufPlane.toFixed(2)} kPa</b>
                            </>
                          )}
                          {phiMobCircle !== null && (
                            <>
                              <br />Mobilised Friction Angle (c&apos;=0): φ_mob(circle) = arcsin({R.toFixed(2)}/{pEff.toFixed(2)}) = <b className="text-teal-300">{phiMobCircle.toFixed(2)}°</b>
                              {phiMobPlane !== null && <> | φ_mob(plane) = {phiMobPlane.toFixed(2)}°</>}
                              {Math.abs(u) > 0.01 && phiTotalApparent !== null && (
                                <> | φ_total (หลอก) = <b className="text-slate-400">{phiTotalApparent.toFixed(2)}°</b></>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reverse Principal Stress Solver */}
          {solverSub === 'principal' && (
            <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
              <div className="text-sky-400 font-bold text-sm border-b border-[#1E3A5F] pb-2">
                สมการ Mohr-Coulomb ในรูป Principal Stresses: σ&apos;₁ = σ&apos;₃ Nφ + 2c&apos;√Nφ
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['s1', "หา σ'₁ (เมื่อทราบ σ'₃, c', φ')"],
                  ['s3', "หา σ'₃ (เมื่อทราบ σ'₁, c', φ')"],
                  ['phi', "หา φ' เมื่อ c'=0 (ทราบ σ'₁, σ'₃)"]
                ].map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRevTarget(id)}
                    className={`px-3 py-1.5 rounded-xl font-bold border text-[11px] transition-colors ${
                      revTarget === id ? 'bg-sky-600 text-white border-sky-400' : 'bg-[#050811] text-slate-300 border-[#1E3A5F]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {revTarget !== 's1' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">σ&apos;₁ (kPa)</label>
                    <input type="number" value={revS1} onChange={(e) => setRevS1(e.target.value)} className="inp w-full font-mono text-center py-2" />
                  </div>
                )}
                {revTarget !== 's3' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">σ&apos;₃ (kPa)</label>
                    <input type="number" value={revS3} onChange={(e) => setRevS3(e.target.value)} className="inp w-full font-mono text-center py-2" />
                  </div>
                )}
                {revTarget !== 'phi' && (
                  <>
                    <div>
                      <label className="text-[10px] text-amber-300 font-bold block mb-1">c&apos; (kPa)</label>
                      <input type="number" min="0" value={revC} onChange={(e) => setRevC(e.target.value)} className="inp w-full font-mono text-center py-2" />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-300 font-bold block mb-1">φ&apos; (องศา)</label>
                      <input type="number" min="0" max="89" value={revPhi} onChange={(e) => setRevPhi(e.target.value)} className="inp w-full font-mono text-center py-2" />
                    </div>
                  </>
                )}
              </div>

              {revCalc.err ? (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">{revCalc.err}</div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#050811] border border-sky-500/40 space-y-3">
                  <div className="text-center">
                    <div className="text-[11px] text-slate-400 font-bold">{revCalc.label}</div>
                    <div className="text-3xl font-mono font-bold text-amber-400 mt-1">{revCalc.value}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">
                      Nφ = tan²(45°+φ&apos;/2)<br /><b className="text-sky-300">{revCalc.nPhi.toFixed(4)}</b>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">
                      มุมระนาบวิบัติ θf<br /><b className="text-emerald-400">{revCalc.thetaF.toFixed(2)}°</b>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0B1325] border border-[#1E3A5F]">
                      จุดสัมผัส (σ&apos;n, τf)<br /><b className="text-pink-300">({revCalc.sn.toFixed(1)}, {revCalc.tf.toFixed(1)})</b>
                    </div>
                  </div>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setS1In(revCalc.s1.toFixed(2));
                        setS3In(revCalc.s3.toFixed(2));
                        setUIn('0');
                        setCIn(String(revCalc.c));
                        setPhiIn(revCalc.phi.toFixed(2));
                        setAngleMode('theta');
                        setAngleIn(revCalc.thetaF.toFixed(1));
                        setSolverSub('plane');
                      }}
                      className="px-4 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px]"
                    >
                      📐 ส่งค่านี้ไปวาดวงกลมโมร์
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: LAB DATA PROCESSOR ==================== */}
      {mainTab === 'lab' && (
        <div className="space-y-4">
          <div className="bg-[#0B1325] p-4 rounded-2xl border border-[#1E3A5F] space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-3">
              <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold">
                {[
                  ['direct', 'Direct Shear (กล่องเฉือน)'],
                  ['triaxial', 'Triaxial (CD / CU / UU)'],
                  ['uct', 'UCT (qu)']
                ].map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLabMode(id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors ${labMode === id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => downloadSvgChart(labSvgRef.current, `BMA_Lab_${labMode}`)}
                className="btn-d py-1 px-2.5 text-[10px] text-sky-300"
              >
                📥 โหลดกราฟ (.svg)
              </button>
            </div>

            {/* 2.1 DIRECT SHEAR */}
            {labMode === 'direct' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex bg-[#050811] p-0.5 rounded-lg border border-[#1E3A5F] text-[10px]">
                    <button type="button" onClick={() => setDsInputType('force')} className={`px-2.5 py-1 rounded font-bold ${dsInputType === 'force' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>กรอกแรง N, T (นิวตัน) + ขนาดกล่อง</button>
                    <button type="button" onClick={() => setDsInputType('stress')} className={`px-2.5 py-1 rounded font-bold ${dsInputType === 'stress' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>กรอก Stress (kPa) ตรงๆ</button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sky-300 font-bold">
                      <input type="checkbox" checked={dsForceZeroC} onChange={(e) => setDsForceZeroC(e.target.checked)} className="accent-sky-500" />
                      บังคับ c&apos; = 0
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300 font-bold">
                      <input type="checkbox" checked={showResidual} onChange={(e) => setShowResidual(e.target.checked)} className="accent-emerald-500" />
                      เทียบเส้น Residual
                    </label>
                  </div>
                </div>

                {dsInputType === 'force' && (
                  <div className="flex flex-wrap items-center gap-3 bg-[#050811] p-2.5 rounded-xl border border-[#1E3A5F]">
                    <span className="text-slate-400 font-bold">ขนาดกล่องเฉือน:</span>
                    <input type="number" value={boxW} onChange={(e) => setBoxW(e.target.value)} className="inp w-16 py-1 text-center font-mono" />
                    <span>×</span>
                    <input type="number" value={boxL} onChange={(e) => setBoxL(e.target.value)} className="inp w-16 py-1 text-center font-mono" />
                    <span className="text-slate-400">mm</span>
                    <span className="font-mono text-sky-300 ml-auto">A = {boxAreaM2.toExponential(2)} m²</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className={`grid ${showResidual ? 'grid-cols-12' : 'grid-cols-10'} gap-2 text-[10px] text-slate-400 font-bold text-center`}>
                    <div className="col-span-3">{dsInputType === 'force' ? 'แรงกด N (N)' : "σ'n (kPa)"}</div>
                    <div className="col-span-3">{dsInputType === 'force' ? 'แรงเฉือน Peak T (N)' : 'τ Peak (kPa)'}</div>
                    {showResidual && <div className="col-span-3 text-emerald-400">{dsInputType === 'force' ? 'T Residual (N)' : 'τ Res (kPa)'}</div>}
                    <div className="col-span-3">ค่าแปลง (σ&apos;n, τp)</div>
                    <div className="col-span-1"></div>
                  </div>
                  {dsRows.map((row, idx) => {
                    const parsed = dsParsed[idx];
                    return (
                      <div key={row.id} className={`grid ${showResidual ? 'grid-cols-12' : 'grid-cols-10'} gap-2 items-center`}>
                        <input
                          type="number"
                          value={dsInputType === 'force' ? row.n : row.s}
                          onChange={(e) => setDsRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [dsInputType === 'force' ? 'n' : 's']: e.target.value } : r)))}
                          className="col-span-3 inp py-1.5 text-center font-mono"
                        />
                        <input
                          type="number"
                          value={dsInputType === 'force' ? row.tPeak : row.tauPeak}
                          onChange={(e) => setDsRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [dsInputType === 'force' ? 'tPeak' : 'tauPeak']: e.target.value } : r)))}
                          className="col-span-3 inp py-1.5 text-center font-mono"
                        />
                        {showResidual && (
                          <input
                            type="number"
                            value={dsInputType === 'force' ? row.tRes : row.tauRes}
                            onChange={(e) => setDsRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [dsInputType === 'force' ? 'tRes' : 'tauRes']: e.target.value } : r)))}
                            className="col-span-3 inp py-1.5 text-center font-mono border-emerald-900/60"
                          />
                        )}
                        <div className="col-span-3 text-center font-mono text-[10px] text-sky-300 bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]">
                          {parsed ? `${parsed.s.toFixed(0)}, ${parsed.tp.toFixed(1)}` : '-'}
                        </div>
                        <button
                          type="button"
                          disabled={dsRows.length <= 2}
                          onClick={() => setDsRows((prev) => prev.filter((r) => r.id !== row.id))}
                          className="col-span-1 text-red-400 hover:text-red-300 font-bold disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap justify-between items-center pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setDsRows((prev) => [...prev, { id: `ds-${Date.now()}`, n: '1440', tPeak: '1008', tRes: '880', s: '400', tauPeak: '280', tauRes: '244' }])}
                      className="btn-b py-1 px-3 text-[10px]"
                    >
                      + เพิ่มตัวอย่าง
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">ทำนาย τf ที่ σ&apos;n =</span>
                      <input type="number" value={dsPredictSig} onChange={(e) => setDsPredictSig(e.target.value)} className="inp w-20 py-1 font-mono text-center text-emerald-300" />
                      <span className="text-[10px] text-slate-400">kPa →</span>
                      <span className="font-mono font-bold text-emerald-400">{predTauVal !== null ? `${predTauVal.toFixed(2)} kPa` : '-'}</span>
                    </div>
                  </div>
                  {isExtrapolating && (
                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-[10px]">
                      ⚠️ ค่า σ&apos;n = {predSigVal} kPa อยู่นอกช่วงข้อมูลทดสอบ ({dsMinS.toFixed(0)}–{dsMaxS.toFixed(0)} kPa) — เส้น Mohr-Coulomb เป็นเส้นตรงเฉพาะช่วงความเค้นที่ทดสอบ การทำนายนอกช่วงอาจคลาดเคลื่อน
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2.2 TRIAXIAL */}
            {labMode === 'triaxial' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex bg-[#050811] p-0.5 rounded-lg border border-[#1E3A5F] text-[10px] font-bold">
                    {['CD', 'CU', 'UU'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTriType(t);
                          if (t === 'UU') {
                            setTriRows([
                              { id: 'u1', s3: '100', qf: '120', s1: '220', uf: '0' },
                              { id: 'u2', s3: '300', qf: '120', s1: '420', uf: '0' }
                            ]);
                          } else if (t === 'CU') {
                            setTriRows([
                              { id: 'c1', s3: '100', qf: '100', s1: '200', uf: '50' },
                              { id: 'c2', s3: '200', qf: '200', s1: '400', uf: '100' }
                            ]);
                          } else {
                            setTriRows([
                              { id: 'd1', s3: '100', qf: '200', s1: '300', uf: '0' },
                              { id: 'd2', s3: '200', qf: '400', s1: '600', uf: '0' }
                            ]);
                          }
                        }}
                        className={`px-3 py-1 rounded ${triType === t ? 'bg-amber-400 text-[#050811]' : 'text-slate-400 hover:text-white'}`}
                      >
                        {t} Test
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTriInputStyle((v) => (v === 'qf' ? 's1' : 'qf'))}
                      className="px-2.5 py-1 rounded-lg bg-[#050811] border border-[#1E3A5F] text-sky-300 font-bold"
                    >
                      กรอกแบบ: {triInputStyle === 'qf' ? 'σ₃ + Deviator (qf)' : 'σ₃ + σ₁'}
                    </button>
                    {triType !== 'UU' && (
                      <label className="flex items-center gap-1 cursor-pointer text-amber-300 font-bold">
                        <input type="checkbox" checked={triForceZeroC} onChange={(e) => setTriForceZeroC(e.target.checked)} className="accent-amber-400" />
                        c&apos;=0
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 font-bold text-center">
                    <div className="col-span-3">Cell Pressure σ₃</div>
                    <div className="col-span-4">{triInputStyle === 'qf' ? 'Deviator qf = Δσf' : 'Major Stress σ₁'}</div>
                    <div className="col-span-4">{triType === 'CU' ? 'Pore Pressure uf' : 'σ₁ / σ₃ (kPa)'}</div>
                    <div className="col-span-1"></div>
                  </div>
                  {triRows.map((row, idx) => {
                    const p = triParsed[idx];
                    return (
                      <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="number"
                          value={row.s3}
                          onChange={(e) => setTriRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, s3: e.target.value } : r)))}
                          className="col-span-3 inp py-1.5 text-center font-mono"
                        />
                        <input
                          type="number"
                          value={triInputStyle === 'qf' ? row.qf : row.s1}
                          onChange={(e) => setTriRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [triInputStyle === 'qf' ? 'qf' : 's1']: e.target.value } : r)))}
                          className="col-span-4 inp py-1.5 text-center font-mono"
                        />
                        {triType === 'CU' ? (
                          <input
                            type="number"
                            value={row.uf}
                            onChange={(e) => setTriRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, uf: e.target.value } : r)))}
                            className="col-span-4 inp py-1.5 text-center font-mono border-teal-500/40 text-teal-200"
                          />
                        ) : (
                          <div className="col-span-4 text-center font-mono text-[10px] text-sky-300 bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]">
                            σ₁={p.s1.toFixed(0)} | R={p.R.toFixed(1)}
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={triRows.length <= 1}
                          onClick={() => setTriRows((prev) => prev.filter((r) => r.id !== row.id))}
                          className="col-span-1 text-red-400 hover:text-red-300 font-bold disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap justify-between items-center pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setTriRows((prev) => [...prev, { id: `tr-${Date.now()}`, s3: '300', qf: '300', s1: '600', uf: '150' }])}
                      className="btn-b py-1 px-3 text-[10px]"
                    >
                      + เพิ่มตัวอย่าง
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAreaTool((v) => !v)}
                      className="text-[11px] text-sky-300 hover:underline font-bold"
                    >
                      📏 {showAreaTool ? 'ซ่อนตัวช่วยแก้พื้นที่หน้าตัด A' : 'คำนวณพื้นที่หน้าตัดปรับแก้ A = A₀(1-εv)/(1-εa)'}
                    </button>
                  </div>
                </div>

                {/* Area Correction Helper (Slide 37) */}
                {showAreaTool && (
                  <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/40 space-y-2.5">
                    <div className="text-[11px] font-bold text-sky-300">Triaxial Area Correction: A = A₀ · (1 − εv) / (1 − εa)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div><label className="text-[9px] text-slate-400 block">d₀ (mm)</label><input type="number" value={acD0} onChange={(e) => setAcD0(e.target.value)} className="inp w-full py-1 font-mono text-center" /></div>
                      <div><label className="text-[9px] text-slate-400 block">h₀ (mm)</label><input type="number" value={acH0} onChange={(e) => setAcH0(e.target.value)} className="inp w-full py-1 font-mono text-center" /></div>
                      <div><label className="text-[9px] text-slate-400 block">Δh ยุบ (mm)</label><input type="number" value={acDh} onChange={(e) => setAcDh(e.target.value)} className="inp w-full py-1 font-mono text-center" /></div>
                      <div><label className="text-[9px] text-slate-400 block">ΔV ลด (cm³)</label><input type="number" value={acDv} onChange={(e) => setAcDv(e.target.value)} className="inp w-full py-1 font-mono text-center" /></div>
                      <div><label className="text-[9px] text-amber-300 block">แรงกด F (N)</label><input type="number" value={acF} onChange={(e) => setAcF(e.target.value)} className="inp w-full py-1 font-mono text-center" /></div>
                    </div>
                    {areaCorr && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[10px] pt-1">
                        <div className="p-1.5 rounded bg-[#0B1325] border border-[#1E3A5F]">εa = {(areaCorr.epsA * 100).toFixed(2)}%<br />εv = {(areaCorr.epsV * 100).toFixed(2)}%</div>
                        <div className="p-1.5 rounded bg-[#0B1325] border border-[#1E3A5F]">A₀ = {areaCorr.a0Mm2.toFixed(1)} mm²</div>
                        <div className="p-1.5 rounded bg-[#0B1325] border border-sky-500/40 text-sky-300 font-bold">A = {areaCorr.aCorrMm2.toFixed(1)} mm²</div>
                        <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 font-bold">q = F/A = {areaCorr.qKpa.toFixed(2)} kPa</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2.3 UCT */}
            {labMode === 'uct' && (
              <div className="flex flex-wrap items-center gap-3 bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
                <label className="text-slate-300 font-bold">Unconfined Compressive Strength (qu, kPa):</label>
                <input type="number" min="0" value={uctQu} onChange={(e) => setUctQu(e.target.value)} className="inp w-32 font-mono text-center text-base py-1.5" />
                <span className="text-[11px] text-slate-400">→ cu = qu / 2, φu = 0° (ดินเหนียวอิ่มตัว)</span>
              </div>
            )}
          </div>

          {/* ผลลัพธ์ + กราฟ Lab */}
          <div className="bg-[#050811] border border-[#1E3A5F] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            {labMode === 'direct' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                <div className="bg-[#0B1325] p-3 rounded-xl border border-amber-500/40">
                  <div className="text-[10px] text-amber-400 font-sans font-bold">Peak Cohesion (c&apos;)</div>
                  <div className="text-xl font-bold text-white mt-0.5">{dsPeakC.toFixed(2)} <span className="text-[10px]">kPa</span></div>
                </div>
                <div className="bg-[#0B1325] p-3 rounded-xl border border-sky-500/40">
                  <div className="text-[10px] text-sky-400 font-sans font-bold">Peak Friction (φ&apos;)</div>
                  <div className="text-xl font-bold text-white mt-0.5">{dsPeakPhi.toFixed(2)}°</div>
                </div>
                <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F]">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Linear Fit (R²)</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">{dsPeakReg.r2.toFixed(4)}</div>
                </div>
                <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F]">
                  <div className="text-[10px] text-emerald-300 font-sans font-bold">{showResidual ? 'Residual (c\'r, φ\'r)' : 'สมการเส้นวิบัติ'}</div>
                  <div className="text-xs font-bold text-slate-200 mt-1.5">
                    {showResidual
                      ? `${dsResC.toFixed(1)} kPa, ${dsResPhi.toFixed(1)}°`
                      : `τ = ${dsPeakC.toFixed(1)} + σ'tan(${dsPeakPhi.toFixed(1)}°)`}
                  </div>
                </div>
              </div>
            )}

            {labMode === 'triaxial' && (
              <div className="space-y-2.5">
                {triType !== 'UU' && triEffectiveRes?.err ? (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-center font-bold">{triEffectiveRes.err}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    {triType !== 'UU' && triEffectiveRes && (
                      <div className="bg-[#0B1325] p-3.5 rounded-xl border border-sky-500/50 text-center">
                        <div className="text-[10px] text-sky-400 font-sans font-bold uppercase mb-1">Effective Stress Parameters ({triType})</div>
                        <div className="text-lg font-bold text-white">
                          c&apos; = <span className="text-amber-400">{triEffectiveRes.c.toFixed(2)}</span> kPa • φ&apos; = <span className="text-sky-300">{triEffectiveRes.phi.toFixed(2)}°</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{triEffectiveRes.note || `R² = ${triEffectiveRes.r2.toFixed(4)}`}</div>
                      </div>
                    )}
                    {triTotalRes && !triTotalRes.err && (
                      <div className={`bg-[#0B1325] p-3.5 rounded-xl border text-center ${triType === 'UU' ? 'sm:col-span-2 border-amber-500/50' : 'border-slate-600/60'}`}>
                        <div className="text-[10px] text-slate-300 font-sans font-bold uppercase mb-1">
                          {triType === 'UU' ? 'Undrained Shear Strength (UU, φu = 0)' : 'Total Stress Parameters (หลอกเมื่อ u ≠ 0)'}
                        </div>
                        <div className="text-lg font-bold text-white">
                          {triType === 'UU' ? 'cu' : 'c'} = <span className="text-amber-300">{triTotalRes.c.toFixed(2)}</span> kPa •{' '}
                          {triType === 'UU' ? 'φu' : 'φ'} = <span className="text-slate-300">{triTotalRes.phi.toFixed(2)}°</span>
                        </div>
                        {triType === 'CU' && (
                          <div className="text-[10px] text-teal-300 mt-0.5">
                            cu เฉลี่ยแต่ละตัวอย่าง = {triParsed.map((x) => x.R.toFixed(1)).join(', ')} kPa
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {labMode === 'uct' && (
              <div className="grid grid-cols-2 gap-3 text-center font-mono">
                <div className="bg-[#0B1325] p-3 rounded-xl border border-amber-500/40">
                  <div className="text-[10px] text-amber-400 font-sans font-bold">Undrained Shear Strength (cu)</div>
                  <div className="text-2xl font-bold text-white mt-0.5">{((parseFloat(uctQu) || 0) / 2).toFixed(2)} kPa</div>
                </div>
                <div className="bg-[#0B1325] p-3 rounded-xl border border-sky-500/40">
                  <div className="text-[10px] text-sky-400 font-sans font-bold">Undrained Friction Angle (φu)</div>
                  <div className="text-2xl font-bold text-white mt-0.5">0.00°</div>
                </div>
              </div>
            )}

            <div className="bg-[#0a101f] border border-slate-700/80 rounded-xl p-2 overflow-x-auto">
              {renderLabSvg()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: VISUAL LEARNING ==================== */}
      {mainTab === 'learn' && (
        <div className="space-y-4">
          {/* 3.1 Drainage Sandbox */}
          <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-3">
              <div>
                <h3 className="font-bold text-sm text-sky-400">💧 Drainage &amp; Effective Stress Sandbox</h3>
                <p className="text-[11px] text-slate-400">ลองเปิด-ปิดวาล์วระบายน้ำ และปรับแรงกดแนวตั้ง (σv) กับแนวนอน (σh)</p>
              </div>
              <button
                type="button"
                onClick={() => setSandDrained((v) => !v)}
                className={`px-4 py-1.5 rounded-full font-bold text-xs border transition-all ${
                  sandDrained
                    ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                    : 'bg-red-950/70 border-red-500 text-red-200'
                }`}
              >
                {sandDrained ? '💧 วาล์วเปิด (DRAINED)' : '🚫 วาล์วปิด (UNDRAINED)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <div className="bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
                  <div className="flex justify-between mb-1"><span className="text-slate-300 font-bold">แรงกดแนวตั้ง (σv)</span><span className="font-mono text-sky-300 font-bold">{sandSv} kPa</span></div>
                  <input type="range" min="10" max="100" step="5" value={sandSv} onChange={(e) => setSandSv(parseInt(e.target.value, 10))} className="w-full accent-sky-400" />
                </div>
                <div className="bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
                  <div className="flex justify-between mb-1"><span className="text-slate-300 font-bold">แรงกดด้านข้าง (σh)</span><span className="font-mono text-amber-300 font-bold">{sandSh} kPa</span></div>
                  <input type="range" min="10" max="100" step="5" value={sandSh} onChange={(e) => setSandSh(parseInt(e.target.value, 10))} className="w-full accent-amber-400" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setSandSv(20); setSandSh(20); }} className="flex-1 btn-d py-1.5 text-[10px]">กดเท่ากันทุกด้าน (Isotropic)</button>
                  <button type="button" onClick={() => { setSandSv(40); setSandSh(10); }} className="flex-1 btn-d py-1.5 text-[10px]">กดไม่เท่ากัน (Shear Distortion)</button>
                </div>
              </div>

              <div className="bg-[#050811] p-4 rounded-2xl border border-[#1E3A5F] flex flex-col items-center gap-3">
                <div className="relative w-44 h-36 flex items-center justify-center">
                  {/* ก้อนดินจำลองที่เปลี่ยนรูปทรง/ปริมาตร */}
                  <div
                    className={`border-2 rounded-lg flex flex-col items-center justify-center font-mono text-xs transition-all duration-500 ${
                      sandDrained ? 'bg-amber-800/40 border-amber-400' : 'bg-blue-900/40 border-sky-400'
                    }`}
                    style={{
                      width: sandDrained ? `${Math.max(76, 112 - sandSh * 0.3)}px` : (!sandIsIsotropic && sandSv > sandSh ? '122px' : !sandIsIsotropic ? '86px' : '104px'),
                      height: sandDrained ? `${Math.max(64, 104 - sandSv * 0.3)}px` : (!sandIsIsotropic && sandSv > sandSh ? '84px' : !sandIsIsotropic ? '118px' : '98px')
                    }}
                  >
                    <div className="font-bold text-white">
                      σ&apos; = {sandDrained ? `${sandSv}/${sandSh}` : (sandIsIsotropic ? '0' : '≠ 0')}
                    </div>
                    <div className="text-[11px] text-teal-300">
                      u_w = {sandUw !== null ? `${sandUw} kPa` : 'ขึ้นกับ Δq'}
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-4 text-sm font-bold">
                    {sandDrained ? '💧' : '❌'}
                  </div>
                </div>
                <div className="text-center text-[11px] text-slate-300 leading-relaxed">
                  {sandDrained ? (
                    <span className="text-emerald-300">
                      <b>Drained:</b> น้ำระบายออกจน u_w = 0 เม็ดดินรับแรงเต็มๆ (σ&apos; = σ) <b>ปริมาตรดินลดลง</b> และกำลังรับแรงเฉือนเพิ่มขึ้น
                    </span>
                  ) : sandIsIsotropic ? (
                    <span className="text-sky-300">
                      <b>Undrained (Isotropic):</b> ปิดวาล์วแล้วเพิ่มแรงกดรอบทิศเท่ากัน น้ำรับแรงทั้งหมด (Δu = Δσ_r) ทำให้ σ&apos; = 0 <b>ปริมาตรและรูปทรงไม่เปลี่ยน</b> กำลังดินไม่เพิ่ม!
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      <b>Undrained (σv ≠ σh):</b> แม้ปริมาตรรวมจะคงที่ (ΔV = 0) แต่เกิดความเค้นเฉือนทำให้<b>ก้อนดินบิดเบี้ยว (Distorted)</b> และเกิด σ&apos; ≠ 0
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3.2 Peak vs Ultimate */}
          <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-2">
              <h3 className="font-bold text-sm text-amber-400">📊 พฤติกรรม Peak vs Ultimate (Dense/OC vs Loose/NC)</h3>
              <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 font-bold text-[11px]">
                <button type="button" onClick={() => setSoilStateMode('dense')} className={`px-3 py-1 rounded-lg ${soilStateMode === 'dense' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>Dense Sand / OC Clay</button>
                <button type="button" onClick={() => setSoilStateMode('loose')} className={`px-3 py-1 rounded-lg ${soilStateMode === 'loose' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}>Loose Sand / NC Clay</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
                <svg viewBox="0 0 300 170" className="w-full h-auto">
                  {/* Top chart: Shear stress vs displacement */}
                  <line x1="30" y1="80" x2="285" y2="80" stroke="#475569" strokeWidth="1.2" />
                  <line x1="30" y1="12" x2="30" y2="80" stroke="#475569" strokeWidth="1.2" />
                  <text x="34" y="18" fill="#94A3B8" fontSize="9">Shear Stress (τ)</text>
                  <line x1="30" y1="48" x2="280" y2="48" stroke="#64748B" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="280" y="45" fill="#94A3B8" fontSize="8" textAnchor="end">Ultimate / Residual (c&apos;=0)</text>
                  {/* Dense curve */}
                  <path d="M 30 80 Q 85 10 135 24 T 275 47" fill="none" stroke="#F59E0B" strokeWidth={soilStateMode === 'dense' ? '3' : '1.3'} opacity={soilStateMode === 'dense' ? '1' : '0.35'} />
                  {/* Loose curve */}
                  <path d="M 30 80 Q 110 52 275 49" fill="none" stroke="#38BDF8" strokeWidth={soilStateMode === 'loose' ? '3' : '1.3'} opacity={soilStateMode === 'loose' ? '1' : '0.35'} />

                  {/* Bottom chart: Volume change */}
                  <line x1="30" y1="130" x2="285" y2="130" stroke="#475569" strokeWidth="1.2" />
                  <line x1="30" y1="95" x2="30" y2="162" stroke="#475569" strokeWidth="1.2" />
                  <text x="34" y="103" fill="#34D399" fontSize="8">+ ขยายตัว (Dilation)</text>
                  <text x="34" y="160" fill="#F87171" fontSize="8">− หดตัว (Contraction)</text>
                  <path d="M 30 130 Q 65 138 110 124 T 275 102" fill="none" stroke="#F59E0B" strokeWidth={soilStateMode === 'dense' ? '2.8' : '1.2'} opacity={soilStateMode === 'dense' ? '1' : '0.35'} />
                  <path d="M 30 130 Q 110 152 275 156" fill="none" stroke="#38BDF8" strokeWidth={soilStateMode === 'loose' ? '2.8' : '1.2'} opacity={soilStateMode === 'loose' ? '1' : '0.35'} />
                </svg>
              </div>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                {soilStateMode === 'dense' ? (
                  <>
                    <div className="font-bold text-amber-300 text-sm">Dense Sand &amp; Overconsolidated Clay (OCR &gt; 1)</div>
                    <p>• เกิดจุดยอด <b>Peak Strength</b> ชัดเจน และอาจอ่านค่าได้ <b>c&apos; &gt; 0</b></p>
                    <p>• ในทรายแน่น ค่า c&apos; ไม่ใช่แรงยึดเหนี่ยว (กาว) แต่เกิดจากปรากฏการณ์ <b>Dilation</b> ที่เม็ดทรายต้องปีนข้ามกันขณะเฉือน</p>
                    <p>• เมื่อเฉือนต่อเนื่องไปเรื่อยๆ แรงเฉือนจะลดลงเข้าสู่ <b>Ultimate State (c&apos; = 0)</b></p>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-sky-300 text-sm">Loose Sand &amp; Normally Consolidated Clay (OCR = 1)</div>
                    <p>• ไม่มีจุดยอด Peak แยกต่างหาก กราฟค่อยๆ ไต่ระดับขึ้นสู่ค่าคงที่ (Ultimate)</p>
                    <p>• ระหว่างเฉือนเม็ดดินจัดเรียงตัวแน่นขึ้น ทำให้<b>ปริมาตรหดตัว (Contraction)</b></p>
                    <p>• เส้น Failure Envelope ผ่านจุดกำเนิดเสมอ: <b>c&apos; = 0</b> (Purely Frictional)</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ENGINEERING PRACTICE ==================== */}
      {mainTab === 'practice' && (
        <div className="space-y-4">
          {/* 4.1 Short-term vs Long-term Comparator (Slide 60) */}
          <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3A5F] pb-3">
              <div>
                <h3 className="font-bold text-sm text-sky-400">⚖️ เทียบกำลังดินระยะสั้น vs ระยะยาว (Short-Term vs Long-Term)</h3>
                <p className="text-[11px] text-slate-400">เปรียบเทียบ cu (Undrained) กับ c&apos; + σ&apos;n tan φ&apos; (Drained) เพื่อหาเคสวิกฤต</p>
              </div>
              <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1 text-[10px] font-bold">
                <button type="button" onClick={() => setPracCase('loading')} className={`px-2.5 py-1 rounded-lg ${pracCase === 'loading' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>งานถม/ฐานราก (Loading)</button>
                <button type="button" onClick={() => setPracCase('excavation')} className={`px-2.5 py-1 rounded-lg ${pracCase === 'excavation' ? 'bg-amber-400 text-[#050811]' : 'text-slate-400'}`}>งานขุด/ตัดลาด (Unloading)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="text-[10px] text-sky-300 font-bold block mb-1">cu ระยะสั้น (kPa)</label><input type="number" min="0" value={pracCu} onChange={(e) => setPracCu(e.target.value)} className="inp w-full font-mono text-center py-1.5" /></div>
              <div><label className="text-[10px] text-amber-300 font-bold block mb-1">c&apos; ระยะยาว (kPa)</label><input type="number" min="0" value={pracC} onChange={(e) => setPracC(e.target.value)} className="inp w-full font-mono text-center py-1.5" /></div>
              <div><label className="text-[10px] text-amber-300 font-bold block mb-1">φ&apos; ระยะยาว (°)</label><input type="number" min="0" max="89" value={pracPhi} onChange={(e) => setPracPhi(e.target.value)} className="inp w-full font-mono text-center py-1.5" /></div>
              <div><label className="text-[10px] text-slate-300 font-bold block mb-1">σ&apos;n บนระนาบ (kPa)</label><input type="number" min="0" value={pracSigN} onChange={(e) => setPracSigN(e.target.value)} className="inp w-full font-mono text-center py-1.5" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-[#050811] p-4 rounded-xl border border-[#1E3A5F]">
              <div className="flex items-end justify-center gap-8 h-36 pt-4">
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="font-mono text-xs font-bold text-sky-300">{shortTermTau.toFixed(1)} kPa</span>
                  <div className="w-16 rounded-t-lg bg-gradient-to-t from-sky-800 to-sky-500 transition-all duration-500" style={{ height: `${Math.max(12, (shortTermTau / maxBarTau) * 85)}px` }}></div>
                  <span className="text-[10px] text-slate-300 font-bold">Short-term (cu)</span>
                </div>
                <div className="flex flex-col items-center gap-1 w-24">
                  <span className="font-mono text-xs font-bold text-amber-300">{longTermTau.toFixed(1)} kPa</span>
                  <div className="w-16 rounded-t-lg bg-gradient-to-t from-amber-700 to-amber-400 transition-all duration-500" style={{ height: `${Math.max(12, (longTermTau / maxBarTau) * 85)}px` }}></div>
                  <span className="text-[10px] text-slate-300 font-bold">Long-term (Drained)</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className={`p-3 rounded-xl border font-bold ${shortTermTau < longTermTau ? 'bg-sky-950/40 border-sky-500/50 text-sky-200' : 'bg-amber-950/40 border-amber-500/50 text-amber-200'}`}>
                  ค่าต่ำสุด (Governing Strength): {Math.min(shortTermTau, longTermTau).toFixed(2)} kPa{' '}
                  ({shortTermTau <= longTermTau ? 'Short-term Undrained คุม' : 'Long-term Drained คุม'})
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {pracCase === 'loading'
                    ? '💡 งานถมดิน/ฐานรากบนดินเหนียว: วันแรก (Short-term) แรงดันน้ำส่วนเกินเป็นบวกสูงสุด ดินจะอ่อนที่สุด เมื่อเวลาผ่านไปน้ำระบายออกดินจะแข็งแรงขึ้น'
                    : '⚠️ งานขุดบ่อ/ตัดลาดดินเหนียว: ตอนขุดใหม่ๆ แรงดันน้ำติดลบช่วยดึงดินไว้ชั่วคราว แต่ระยะยาว (Long-term) เมื่อน้ำซึมเข้ามาชดเชย ดินจะอ่อนลงจนอาจพังทลายได้'}
                </p>
              </div>
            </div>
          </div>

          {/* 4.2 Drainage & Test Selector Wizard */}
          <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-emerald-400 border-b border-[#1E3A5F] pb-2">
              🧭 Drainage &amp; Lab Test Selector Wizard (เลือกวิธีทดสอบให้ถูกงาน)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">1. ประเภทดินหลักหน้างาน</label>
                <select value={wizSoil} onChange={(e) => setWizSoil(e.target.value)} className="inp w-full bg-[#050811] py-2 font-bold">
                  <option value="clay">ดินเหนียว / ดินตะกอนอิ่มตัว (Clay / Silt — ซึมน้ำช้า)</option>
                  <option value="sand">ดินทราย / กรวด (Sand / Gravel — ซึมน้ำเร็ว)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">2. ลักษณะงานและช่วงเวลาที่วิเคราะห์</label>
                <select value={wizWork} onChange={(e) => setWizWork(e.target.value)} className="inp w-full bg-[#050811] py-2 font-bold">
                  <option value="loading_fast">ก่อสร้างเร็ว / ถมคันดิน / ฐานรากระยะสั้น (Short-term)</option>
                  <option value="excavation">ขุดบ่อก่อสร้าง / ตัดลาดดิน (Excavation / Cut Slope)</option>
                  <option value="long_term">วิเคราะห์เสถียรภาพระยะยาว (Long-term Steady State)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050811] border border-emerald-500/40 space-y-2 text-xs leading-relaxed">
              <div><span className="text-sky-400 font-bold">สภาพการระบายน้ำ:</span> <span className="text-white">{wizAdvice.condition}</span></div>
              <div><span className="text-amber-400 font-bold">พารามิเตอร์ที่ต้องใช้:</span> <span className="text-amber-200 font-mono">{wizAdvice.params}</span></div>
              <div><span className="text-emerald-400 font-bold">การทดสอบในห้องแล็บที่แนะนำ:</span> <span className="text-white">{wizAdvice.tests}</span></div>
              <div className="pt-1.5 border-t border-[#1E3A5F] text-[11px] text-slate-300">📌 <b>ข้อควรระวังหน้างาน:</b> {wizAdvice.critical}</div>
            </div>
          </div>
        </div>
      )}
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