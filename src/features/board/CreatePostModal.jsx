import React, { useRef } from 'react';
import { promptSafeUrl } from '../../lib/security';
import { uploadChunked } from '../../lib/utils';
import { Modal } from '../../components/BasicUI';

export default function CreatePostModal({
  isOpen, onClose, editPostData, currentUser,
  pTitle, setPTitle, pCont, setPCont,
  pGuest, setPGuest, pPinned, setPPinned,
  pAtts, setPAtts, pTags, setPTags, tagInput, setTagInput, allPostTags,
  hasPoll, setHasPoll, pollQ, setPollQ, pollOpts, setPollOpts, pollAnon, setPollAnon, pollClose, setPollClose,
  isQA, setIsQA, isSpoiler, setIsSpoiler,
  saveDraft, handleCreatePost
}) {
  const pFileRef = useRef(null);
  if (!isOpen) return null;

  return (
    <Modal title={editPostData ? '📝 แก้ไขโพสต์' : '✨ สร้างโพสต์ใหม่'} maxW="max-w-2xl" onClose={onClose}>
      <form onSubmit={handleCreatePost} className="flex flex-col h-full space-y-4 animate-fade-in">
        <input
          type="text"
          value={pTitle}
          onChange={(e) => setPTitle(e.target.value)}
          placeholder="หัวข้อโพสต์ (Title)..."
          className="w-full bg-transparent border-none text-xl sm:text-2xl font-bold text-white outline-none placeholder-slate-500 px-1 focus:ring-0"
        />

        <textarea
          rows="6"
          value={pCont}
          onChange={(e) => setPCont(e.target.value)}
          placeholder="เขียนสิ่งที่คุณคิด รองรับ Markdown เช่น **ตัวหนา**, > โควทข้อความ, - ลิสต์จุด..."
          className="w-full bg-[#050811] rounded-xl p-4 text-sm outline-none resize-none border border-[#1E3A5F] focus:border-sky-500 transition-colors custom-scrollbar"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1325] p-2 rounded-xl border border-[#1E3A5F]">
          <div className="flex gap-1">
            <input
              type="file"
              multiple
              ref={pFileRef}
              onChange={async (e) => {
                const fl = Array.from(e.target.files || []);
                e.target.value = '';
                for (const f of fl) {
                  try { const a = await uploadChunked(f); setPAtts((p) => [...p, a]); } catch (err) { alert(err.message); }
                }
              }}
              className="hidden"
            />
            <button type="button" onClick={() => pFileRef.current?.click()} className="p-2 rounded-lg text-slate-400 hover:bg-[#0F2547] hover:text-sky-300 transition-colors" title="อัปโหลดไฟล์รูปภาพ/วิดีโอ">
              <i className="fas fa-image text-lg"></i>
            </button>
            <button
              type="button"
              onClick={() => {
                const u = promptSafeUrl('ใส่ลิงก์รูปภาพ, วิดีโอ หรือ YouTube (https://...)');
                if (u) setPAtts([...pAtts, { id: 'att-' + Date.now(), name: 'Link', type: 'image', url: u, size: 'URL' }]);
              }}
              className="p-2 rounded-lg text-slate-400 hover:bg-[#0F2547] hover:text-sky-300 transition-colors"
              title="แนบลิงก์ URL"
            >
              <i className="fas fa-link text-lg"></i>
            </button>
            <button type="button" onClick={() => setHasPoll(!hasPoll)} className={`p-2 rounded-lg transition-colors ${hasPoll ? 'bg-sky-900/50 text-sky-400' : 'text-slate-400 hover:bg-[#0F2547] hover:text-sky-300'}`} title="สร้างโพลล์สำรวจ">
              <i className="fas fa-poll text-lg"></i>
            </button>
          </div>

          {!editPostData && (
            <button type="button" onClick={saveDraft} className="text-[10px] text-slate-400 font-bold px-3 py-1.5 rounded-full border border-slate-600 hover:bg-slate-700 hover:text-white transition-colors">
              💾 บันทึกฉบับร่าง
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-bold">
          <button type="button" onClick={() => setIsQA(!isQA)} className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${isQA ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50 shadow-md' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:bg-[#0F2547]'}`}>
            <i className="fas fa-question-circle"></i> โหมดคำถาม Q&amp;A
          </button>
          <button type="button" onClick={() => setIsSpoiler(!isSpoiler)} className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${isSpoiler ? 'bg-red-950/80 text-red-400 border-red-500/50 shadow-md' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:bg-[#0F2547]'}`}>
            <i className="fas fa-eye-slash"></i> ซ่อนสปอยล์
          </button>
          <button type="button" onClick={() => setPGuest(!pGuest)} className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${pGuest ? 'bg-sky-950/80 text-sky-400 border-sky-500/50 shadow-md' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:bg-[#0F2547]'}`}>
            <i className="fas fa-globe"></i> ให้ Guest อ่านได้
          </button>
          {currentUser?.role !== 'member' && (
            <button type="button" onClick={() => setPPinned(!pPinned)} className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${pPinned ? 'bg-amber-950/80 text-amber-400 border-amber-500/50 shadow-md' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:bg-[#0F2547]'}`}>
              <i className="fas fa-thumbtack"></i> ปักหมุด
            </button>
          )}
        </div>

        {hasPoll && (
          <div className="bg-[#050811] p-4 rounded-xl border border-sky-500/30 shadow-inner space-y-3 animate-fade-in mt-2">
            <input type="text" value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="คำถามของโพลล์..." className="w-full inp text-sm font-bold text-sky-200 border-sky-900/50" />
            {pollOpts.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                  placeholder={'ตัวเลือกที่ ' + (i + 1)}
                  className="flex-1 inp text-xs"
                />
                {pollOpts.length > 2 && <button type="button" onClick={() => setPollOpts(pollOpts.filter((_, idx) => idx !== i))} className="btn-d text-red-400 border-red-900/50">✕</button>}
              </div>
            ))}
            <button type="button" onClick={() => setPollOpts([...pollOpts, ''])} className="btn-b text-[10px] w-full border-dashed">+ เพิ่มตัวเลือก</button>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs bg-[#0B1325] px-3 py-1.5 rounded-lg flex-1 border border-[#1E3A5F]">
                <input type="checkbox" checked={pollAnon} onChange={(e) => setPollAnon(e.target.checked)} className="accent-sky-500" /> โหวตแบบไม่ระบุชื่อ (Anonymous)
              </label>
              <input type="datetime-local" value={pollClose} onChange={(e) => setPollClose(e.target.value)} className="inp text-xs flex-1" title="เวลาปิดโหวต (ไม่บังคับ)" />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[#1E3A5F]">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim() && !pTags.includes(tagInput.trim())) setPTags([...pTags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              placeholder="ใส่ Tag (กด Enter)..."
              className="w-48 inp text-xs"
            />
            <button type="button" onClick={() => { if (tagInput.trim() && !pTags.includes(tagInput.trim())) setPTags([...pTags, tagInput.trim()]); setTagInput(''); }} className="btn-b text-xs px-4">เพิ่ม</button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {allPostTags.slice(0, 8).map((t) => (
              <button key={'sug' + t} type="button" onClick={() => !pTags.includes(t) && setPTags([...pTags, t])} className="text-[9px] text-slate-400 hover:text-sky-300 hover:underline">#{t}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pTags.map((t) => (
              <span key={t} className="px-2.5 py-1 bg-sky-900/30 text-sky-200 rounded-full text-[10px] border border-sky-800 shadow-sm flex items-center gap-1.5">
                #{t} <button type="button" onClick={() => setPTags(pTags.filter((x) => x !== t))} className="text-sky-400 hover:text-red-400 font-bold">✕</button>
              </span>
            ))}
          </div>
        </div>

        {pAtts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {pAtts.map((a) => (
              <span key={a.id} className="px-2 py-1 bg-slate-800 text-xs rounded border border-slate-600 flex items-center gap-2">
                {a.name} <button type="button" onClick={() => setPAtts(pAtts.filter((x) => x.id !== a.id))} className="text-red-400">✕</button>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 mt-auto">
          <button type="submit" className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 px-8 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.4)] hover:scale-105 transition-all text-sm flex items-center gap-2">
            <i className="fas fa-paper-plane"></i> {editPostData ? 'อัปเดตโพสต์' : 'โพสต์ลงกระดาน'}
          </button>
        </div>
      </form>
    </Modal>
  );
}