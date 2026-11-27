import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const cleanYoutubeTitleForLyrics = (raw = '') => {
  const s = String(raw || '')
    .replace(/[\(\[\{【「][^)\]\}】」]*(official|mv|music\s*video|lyric|audio|visualizer|live|ver\.?|version|hd|4k|prod\.?|feat\.?|ft\.?|เนื้อเพลง|ซับไทย|แปลไทย)[^)\]\}】」]*[\)\]\}】」]/gi, ' ')
    .replace(/\b(official\s*(music\s*)?video|official\s*mv|official\s*audio|lyric\s*video|lyrics|m\/v|full\s*song|4k|hd)\b/gi, ' ')
    .replace(/\|.*$/g, ' ')
    .replace(/[「」『』【】""'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length >= 2 ? s : String(raw || '').trim();
};

const parseLrcLines = (lrcText = '') => {
  const out = [];
  const lines = String(lrcText || '').split(/\r?\n/);
  const timeRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const rawLine of lines) {
    const stamps = [];
    let m;
    timeRe.lastIndex = 0;
    while ((m = timeRe.exec(rawLine)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      stamps.push(min * 60 + sec + frac);
    }
    const text = rawLine.replace(timeRe, '').trim();
    if (stamps.length > 0) {
      stamps.forEach((t) => out.push({ time: t, text: text || '♪' }));
    }
  }
  return out.sort((a, b) => a.time - b.time);
};

export function DiscJamLyricsPanel({ activeSong, playState, embedded = false }) {
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [syncOffset, setSyncOffset] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [nowSec, setNowSec] = useState(0);

  const listRef = useRef(null);
  const activeLineRef = useRef(null);
  const cacheRef = useRef({});

  const fetchLyrics = useCallback(async (qStr) => {
    const q = (qStr || '').trim();
    if (!q) { setResults([]); return; }
    if (cacheRef.current[q]) {
      setResults(cacheRef.current[q]);
      setSelectedIdx(0);
      setErrMsg(cacheRef.current[q].length ? '' : 'ไม่พบเนื้อเพลงในฐานข้อมูล LRCLIB');
      return;
    }
    setLoading(true);
    setErrMsg('');
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const sorted = (Array.isArray(data) ? data : [])
        .filter((item) => item.syncedLyrics || item.plainLyrics)
        .sort((a, b) => (b.syncedLyrics ? 1 : 0) - (a.syncedLyrics ? 1 : 0));
      cacheRef.current[q] = sorted;
      setResults(sorted);
      setSelectedIdx(0);
      if (!sorted.length) setErrMsg('ไม่พบเนื้อเพลง ลองตัดชื่อช่องหรือพิมพ์ "ชื่อเพลง ศิลปิน" เองด้านบน');
    } catch {
      setResults([]);
      setErrMsg('ไม่สามารถเชื่อมต่อ LRCLIB ได้ชั่วคราว');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSong?.title) {
      setResults([]);
      setQueryInput('');
      setErrMsg('');
      return;
    }
    const cleaned = cleanYoutubeTitleForLyrics(activeSong.title);
    setQueryInput(cleaned);
    setSyncOffset(0);
    fetchLyrics(cleaned);
  }, [activeSong?.id, activeSong?.title, fetchLyrics]);

  useEffect(() => {
    const calcTime = () => {
      if (!playState) return 0;
      if (playState.isPlaying && playState.startedAt) {
        return Math.max(0, (Date.now() - playState.startedAt) / 1000 + (playState.pausedPos || 0));
      }
      return Math.max(0, playState.pausedPos || 0);
    };
    setNowSec(calcTime());
    if (!playState?.isPlaying) return;
    const iv = setInterval(() => setNowSec(calcTime()), 250);
    return () => clearInterval(iv);
  }, [playState?.isPlaying, playState?.startedAt, playState?.pausedPos]);

  const currentTrack = results[selectedIdx] || null;
  const parsedLines = useMemo(
    () => (currentTrack?.syncedLyrics ? parseLrcLines(currentTrack.syncedLyrics) : []),
    [currentTrack?.syncedLyrics]
  );

  const effectiveSec = nowSec + syncOffset;
  const activeLineIdx = useMemo(() => {
    if (!parsedLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time <= effectiveSec) idx = i;
      else break;
    }
    return idx;
  }, [parsedLines, effectiveSec]);

  useEffect(() => {
    if (!autoScroll || activeLineIdx < 0 || !activeLineRef.current || !listRef.current) return;
    const box = listRef.current;
    const el = activeLineRef.current;
    const targetTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [activeLineIdx, autoScroll]);

  const fmtMmSs = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className={embedded ? 'h-full flex flex-col gap-2.5 min-h-0' : 'card p-4 bg-[#0B1325] border-[#1E3A5F] flex flex-col gap-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E3A5F]/70">
        <div className="flex items-center gap-2 min-w-0">
          <i className="fas fa-microphone-alt text-sky-400"></i>
          <span className="text-xs font-bold text-white truncate">เนื้อเพลง (LRCLIB Sync)</span>
          {currentTrack?.syncedLyrics && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">
              SYNC {fmtMmSs(effectiveSec)}
            </span>
          )}
        </div>

        {currentTrack?.syncedLyrics && (
          <div className="flex items-center gap-1 text-[10px]">
            <button type="button" onClick={() => setSyncOffset((o) => Number((o - 1).toFixed(1)))} className="px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-slate-300 hover:text-white" title="ถอยเวลาเนื้อเพลง 1 วิ">-1s</button>
            <button type="button" onClick={() => setSyncOffset((o) => Number((o - 0.5).toFixed(1)))} className="px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-slate-300 hover:text-white">-0.5</button>
            <button type="button" onClick={() => setSyncOffset(0)} className="px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] font-mono text-amber-300" title="รีเซ็ตชดเชยเวลา">
              {syncOffset >= 0 ? `+${syncOffset}s` : `${syncOffset}s`}
            </button>
            <button type="button" onClick={() => setSyncOffset((o) => Number((o + 0.5).toFixed(1)))} className="px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-slate-300 hover:text-white">+0.5</button>
            <button type="button" onClick={() => setSyncOffset((o) => Number((o + 1).toFixed(1)))} className="px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-slate-300 hover:text-white" title="เร่งเวลาเนื้อเพลง 1 วิ">+1s</button>
            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className={`ml-1 px-2 py-0.5 rounded border font-bold ${autoScroll ? 'bg-sky-600/30 border-sky-400 text-sky-200' : 'bg-[#050811] border-[#1E3A5F] text-slate-500'}`}
              title="เปิด/ปิดการเลื่อนตามอัตโนมัติ"
            >
              Auto
            </button>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchLyrics(queryInput); }} className="flex gap-1.5">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="พิมพ์ชื่อเพลง + ศิลปินเพื่อค้นหาเนื้อเพลง..."
          className="flex-1 inp py-1.5 text-xs"
        />
        <button type="submit" disabled={loading} className="btn-b px-3 py-1.5 text-xs shrink-0">
          <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
        </button>
      </form>

      {results.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {results.slice(0, 5).map((r, i) => (
            <button
              key={r.id || i}
              type="button"
              onClick={() => { setSelectedIdx(i); setSyncOffset(0); }}
              className={`px-2.5 py-1 rounded-lg border text-[10px] whitespace-nowrap transition-colors ${selectedIdx === i ? 'bg-sky-600 text-white border-sky-400 font-bold' : 'bg-[#050811] text-slate-400 border-[#1E3A5F] hover:text-white'}`}
            >
              {r.syncedLyrics ? '⏱ ' : '📄 '}{r.trackName} — {r.artistName}
            </button>
          ))}
        </div>
      )}

      <div
        ref={listRef}
        className={`relative ${embedded ? 'flex-1 min-h-0' : 'h-64 sm:h-72'} overflow-y-auto custom-scrollbar rounded-xl bg-[#050811] border border-[#1E3A5F] p-4`}
      >
        {!activeSong?.title && !results.length ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 text-center">
            <i className="fas fa-music text-2xl opacity-40"></i>
            <span>ยังไม่มีเพลงกำลังเล่นบน Deck — หรือพิมพ์ชื่อเพลงค้นหาด้านบนได้เลย</span>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-sky-400 text-xs font-bold animate-pulse">
            <i className="fas fa-spinner fa-spin mr-2"></i> กำลังค้นหาเนื้อเพลงจาก LRCLIB...
          </div>
        ) : errMsg ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 text-center px-4">
            <i className="fas fa-search-minus text-xl text-slate-600"></i>
            <span>{errMsg}</span>
          </div>
        ) : parsedLines.length > 0 ? (
          <div className="space-y-2.5 py-6 text-center">
            {parsedLines.map((line, i) => {
              const isCurr = i === activeLineIdx;
              const isPast = i < activeLineIdx;
              return (
                <div
                  key={`${i}-${line.time}`}
                  ref={isCurr ? activeLineRef : null}
                  className={`transition-all duration-300 leading-relaxed px-2 py-0.5 rounded-lg ${
                    isCurr
                      ? 'text-white font-bold text-sm sm:text-base scale-[1.03] bg-sky-500/15 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.18)]'
                      : isPast
                        ? 'text-slate-500 text-xs'
                        : 'text-slate-300/80 text-xs'
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : currentTrack?.plainLyrics ? (
          <div className="text-xs text-slate-200 whitespace-pre-line leading-7 text-center">
            {currentTrack.plainLyrics}
          </div>
        ) : null}
      </div>

      {currentTrack && (
        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span className="truncate">{currentTrack.trackName} — {currentTrack.artistName}</span>
          <span className="shrink-0 font-mono">Powered by LRCLIB</span>
        </div>
      )}
    </div>
  );
}

export default DiscJamLyricsPanel;