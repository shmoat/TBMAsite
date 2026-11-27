import React, { useState, lazy, Suspense } from 'react';
import { useUI } from '../../contexts/UIContext';
import { longPressProps } from '../../components/ContextMenu';

const MusicTools = lazy(() => import('./MusicTools'));
const CivilTools = lazy(() => import('./CivilTools'));
const AcademicTools = lazy(() => import('./AcademicTools'));
const CommunityTools = lazy(() => import('./CommunityTools'));

const CATEGORY_STYLES = {
  ALL: { icon: '🌟', textClass: 'text-slate-100', borderClass: 'border-slate-500', hoverBorder: 'hover:border-slate-500' },
  'Music & Audio': { icon: '🎵', textClass: 'text-fuchsia-400', borderClass: 'border-fuchsia-500/50', hoverBorder: 'hover:border-fuchsia-500/50' },
  'Civil Engineering': { icon: '🏗️', textClass: 'text-amber-400', borderClass: 'border-amber-500/50', hoverBorder: 'hover:border-amber-500/50' },
  'Calculate & Academic': { icon: '🧮', textClass: 'text-sky-400', borderClass: 'border-sky-500/50', hoverBorder: 'hover:border-sky-500/50' },
  'Community Utilities': { icon: '👥', textClass: 'text-purple-400', borderClass: 'border-purple-500/50', hoverBorder: 'hover:border-purple-500/50' }
};

export const TOOLS = [
  { id: 'bpm', category: 'Music & Audio', name: 'Advanced Metronome', icon: '⏱️', desc: 'เคาะความเร็ว ปรับ Time Signature และ Rhythm Subdivision' },
  { id: 'chords', category: 'Music & Audio', name: 'Chord Studio', icon: '🎹', desc: 'วงล้อ Circle of 5ths และสุ่มคอร์ดตามอารมณ์ (Mood Progression)' },
  { id: 'tuner', category: 'Music & Audio', name: 'Guitar Tuner', icon: '🎸', desc: 'เทียบเสียงสายกีตาร์และเบส ด้วยการจับคลื่นเสียงไมโครโฟน' },
  { id: 'transposer', category: 'Music & Audio', name: 'Chord Transposer', icon: '🎼', desc: 'เครื่องมือทดคีย์เพลง แปลงคอร์ดยกแผง' },
  { id: 'rhyme', category: 'Music & Audio', name: 'Rhyme Finder', icon: '✍️', desc: 'ตัวช่วยนักแต่งเพลง หาคำคล้องจองสระ-ตัวสะกด ทั้งไทยและอังกฤษ' },
  { id: 'beam', category: 'Civil Engineering', name: 'Beam Calculator', icon: '🏗️', desc: 'คำนวณโมเมนต์และแรงเฉือนสูงสุดของคานแบบง่าย' },
  { id: 'rc_design', category: 'Civil Engineering', name: 'RC Beam Design', icon: '📏', desc: 'ออกแบบและคำนวณปริมาณเหล็กเสริมคาน (USD)' },
  { id: 'steel_table', category: 'Civil Engineering', name: 'Steel Table', icon: '🏭', desc: 'ตารางคุณสมบัติเหล็กรูปพรรณ (H-Beam)' },
  { id: 'concrete', category: 'Civil Engineering', name: 'Concrete Mix', icon: '🧱', desc: 'คำนวณปริมาตรคอนกรีตเผื่อ SF และประเมินวัสดุ' },
  { id: 'soil_phase', category: 'Civil Engineering', name: '3-Phase Diagram', icon: '🌍', desc: 'คำนวณความสัมพันธ์มวลดิน (Void ratio, Saturation)' },
  { id: 'mohr_circle', category: 'Civil Engineering', name: 'Soil Strength', icon: '📉', desc: 'วิเคราะห์หากำลังรับแรงเฉือนดิน (c, φ) และ Mohr Circle' },
  { id: 'converter', category: 'Calculate & Academic', name: 'Unit Converter', icon: '⚖️', desc: 'แปลงหน่วยทางวิศวกรรม (แรง, ความดัน, อุณหภูมิ)' },
  { id: 'solver', category: 'Calculate & Academic', name: 'Equation Solver', icon: '🧮', desc: 'เครื่องมือแก้ระบบสมการ 2 ตัวแปร' },
  { id: 'resistor', category: 'Calculate & Academic', name: 'Resistor Calc', icon: '🔌', desc: 'คำนวณค่าความต้านทานจาก 4 แถบสี' },
  { id: 'grade_crisis', category: 'Calculate & Academic', name: 'Grade Crisis Manager', icon: '🚨', desc: 'วางแผนกู้ชีพเกรด คำนวณคะแนนไฟนอลที่ต้องทำพร้อมมาตรวัดความตื่นตระหนก' },
  { id: 'gacha', category: 'Calculate & Academic', name: 'Gacha Drop Reality', icon: '🎰', desc: 'คำนวณโอกาสเกลือ (Binomial) พร้อมอนิเมชันจำลองตู้กาชาปอง' },
  { id: 'projectile', category: 'Calculate & Academic', name: 'Projectile Motion', icon: '🚀', desc: 'แอนิเมชันจำลองการเคลื่อนที่แบบวิถีโค้ง พร้อมคำนวณระยะและจุดสูงสุด' },
  { id: 'finance', category: 'Calculate & Academic', name: 'Financial Reality', icon: '💸', desc: 'กราฟภาพคำนวณผ่อนบ้านลดต้นลดดอก และพลังของดอกเบี้ยทบต้น' },
  { id: 'math_latex', category: 'Calculate & Academic', name: 'Math / LaTeX Builder', icon: '∛', desc: 'พิมพ์และต่อบล็อกสมการยากๆ พร้อมเรนเดอร์เป็นรูปภาพเอาไปแปะรายงานได้เลย' },
  { id: 'splitter', category: 'Community Utilities', name: 'Group Bill Splitter', icon: '💸', desc: 'คำนวณเคลียร์หนี้ทริปกลุ่มที่ซับซ้อน สรุปใครต้องโอนให้ใครแบบเข้าใจง่าย' },
  { id: 'smartdate', category: 'Community Utilities', name: 'Smart Date Calculator', icon: '🗓️', desc: 'หาระยะห่างของวัน และคำนวณวันหน้า/ย้อนหลังแบบข้ามวันหยุดสุดสัปดาห์ได้' },
  { id: 'cipher', category: 'Community Utilities', name: 'Secret Cipher', icon: '🕵️', desc: 'เข้ารหัสข้อความลับ (Base64, Caesar, ฯลฯ) เอาไว้ส่งความลับให้เพื่อนในแชต' },
  { id: 'qrcode', category: 'Community Utilities', name: 'QR Generator', icon: '🔲', desc: 'สร้าง QR Code ปรับสี ใส่โลโก้ และตั้งค่าวันหมดอายุหรือจำกัดสแกนได้' },
  { id: 'randomizer', category: 'Community Utilities', name: 'Spin the Wheel', icon: '🎡', desc: 'สุ่มรายชื่อสมาชิกหรือหัวข้อสนทนาแบบข้อความ และวงล้อหมุนอนิเมชั่น' },
  { id: 'currency', category: 'Community Utilities', name: 'แปลงค่าเงิน (Currency Converter)', icon: '💱', desc: 'แปลงสกุลเงินเรียลไทม์พร้อมกราฟแนวโน้ม 30 วัน อ้างอิงอัตราจากธนาคารกลาง (Frankfurter)' }
];

export default function ToolsPage({ activeTool, onOpenTool }) {
  const { openAppMenu } = useUI();
  const [toolSearchQ, setToolSearchQ] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [toolLinkCopied, setToolLinkCopied] = useState(false);

  const toolCategories = ['ALL', ...Array.from(new Set(TOOLS.map((t) => t.category)))];
  const filteredTools = TOOLS.filter((t) => {
    const q = toolSearchQ.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    const matchCategory = activeCategory === 'ALL' || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const activeMeta = TOOLS.find((t) => t.id === activeTool);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-5 flex-1 overflow-y-auto">
      {!activeTool ? (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-sky-400">🛠️ Association Tools</h2>
            <p className="text-xs text-slate-400 mt-1">เครื่องมือและสาธารณูปโภคสำหรับสมาชิก</p>
          </div>

          <div className="max-w-md mx-auto relative mt-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาเครื่องมือ..."
              value={toolSearchQ}
              onChange={(e) => setToolSearchQ(e.target.value)}
              className="w-full bg-[#0B1325] border border-[#1E3A5F] rounded-full py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mt-4 px-1">
            {toolCategories.map((cat) => {
              const style = CATEGORY_STYLES[cat] || { icon: '🔧', textClass: 'text-sky-300', borderClass: 'border-sky-500/50' };
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm border ${isSelected ? `bg-[#0B1325] ${style.borderClass} ${style.textClass} scale-105 shadow-[0_0_10px_rgba(255,255,255,0.1)]` : 'bg-[#050811] border-[#1E3A5F] text-slate-400 hover:bg-[#0F2547] hover:border-slate-500'}`}
                >
                  <span className="text-sm">{style.icon}</span>
                  {cat === 'ALL' ? 'ทั้งหมด (All)' : cat}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10 mt-2">
            {filteredTools.map((tool) => {
              const catStyle = CATEGORY_STYLES[tool.category] || { textClass: 'text-sky-400', hoverBorder: 'hover:border-sky-500/50' };
              const handleToolCtx = (e) => {
                const toolUrl = `${window.location.origin}${window.location.pathname}?tool=${tool.id}`;
                openAppMenu(e, {
                  header: { icon: 'fas fa-tools', title: tool.name, sub: tool.category },
                  items: [
                    { icon: 'fas fa-play', label: 'เปิดใช้งานเครื่องมือนี้', accent: true, onClick: () => { setToolLinkCopied(false); onOpenTool(tool.id); } },
                    { icon: 'fas fa-link', label: 'คัดลอกลิงก์เครื่องมือ', sub: `?tool=${tool.id}`, onClick: () => navigator.clipboard.writeText(toolUrl) },
                    { icon: 'fas fa-external-link-alt', label: 'เปิดในแท็บใหม่', onClick: () => window.open(toolUrl, '_blank', 'noopener,noreferrer') }
                  ]
                });
              };

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => { setToolLinkCopied(false); onOpenTool(tool.id); }}
                  onContextMenu={handleToolCtx}
                  {...longPressProps(handleToolCtx)}
                  className={`card p-4 flex flex-col items-start text-left hover:bg-[#0F2547] border border-[#1E3A5F] ${catStyle.hoverBorder} transition-all group`}
                >
                  <div className="flex items-center gap-3 mb-2 w-full">
                    <div className="text-3xl bg-[#050811] p-2 rounded-lg border border-[#1E3A5F] group-hover:scale-110 transition-transform">{tool.icon}</div>
                    <div>
                      <div className={`text-[10px] ${catStyle.textClass} font-bold uppercase tracking-wider`}>{tool.category}</div>
                      <h3 className="font-bold text-white text-base">{tool.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{tool.desc}</p>
                </button>
              );
            })}
            {filteredTools.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-500 text-sm font-bold bg-[#0B1325] border border-dashed border-[#1E3A5F] rounded-xl">
                ❌ ไม่พบเครื่องมือที่ค้นหา
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between gap-3 shrink-0 bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F] shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => { setToolLinkCopied(false); onOpenTool(null); }} className="btn-d px-3 sm:px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-white hover:text-[#050811] transition-colors shrink-0">
                ◀ <span className="hidden sm:inline">กลับหน้าเมนู</span>
              </button>
              <h2 className="text-sm sm:text-lg font-bold text-sky-300 flex items-center gap-2 border-l border-[#1E3A5F] pl-3 truncate">
                <span>{activeMeta?.icon}</span>
                <span className="truncate">{activeMeta?.name || activeTool}</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                const toolUrl = `${window.location.origin}${window.location.pathname}?tool=${activeTool}`;
                navigator.clipboard.writeText(toolUrl);
                setToolLinkCopied(true);
                setTimeout(() => setToolLinkCopied(false), 2000);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${toolLinkCopied ? 'bg-emerald-500 text-[#050811] border-emerald-400' : 'bg-[#050811] text-sky-300 border-[#1E3A5F] hover:border-sky-400 hover:text-white'}`}
              title="คัดลอกลิงก์ตรงไปยังเครื่องมือนี้"
            >
              <i className={`fas ${toolLinkCopied ? 'fa-check' : 'fa-link'}`}></i>
              <span className="hidden sm:inline">{toolLinkCopied ? 'คัดลอกลิงก์แล้ว' : 'แชร์ลิงก์เครื่องมือ'}</span>
            </button>
          </div>

          <div className="flex-1 w-full card p-4 sm:p-6 overflow-y-auto bg-[#050811]/50 shadow-inner">
            <Suspense fallback={<div className="py-16 text-center text-sky-400 text-xs font-bold animate-pulse"><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลดเครื่องมือ...</div>}>
              {activeMeta?.category === 'Music & Audio' && <MusicTools toolId={activeTool} />}
              {activeMeta?.category === 'Civil Engineering' && <CivilTools toolId={activeTool} />}
              {activeMeta?.category === 'Calculate & Academic' && <AcademicTools toolId={activeTool} />}
              {activeMeta?.category === 'Community Utilities' && <CommunityTools toolId={activeTool} />}
              {!activeMeta && <div className="py-12 text-center text-slate-400 text-xs">ไม่พบเครื่องมือที่ระบุ</div>}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}