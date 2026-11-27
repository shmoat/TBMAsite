import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';

export const BPMTapper = () => {
  const [bpm, setBpm] = useState(120);
  const [taps, setTaps] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beats, setBeats] = useState(4);
  const [subdiv, setSubdiv] = useState(1);
  const [activeBeat, setActiveBeat] = useState(-1);

  const audioCtxRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentNoteRef = useRef(0);
  const timerIDRef = useRef(null);

  const handleTap = () => {
    const now = Date.now();
    const newTaps = [...taps, now].slice(-5);
    setTaps(newTaps);
    if (newTaps.length > 1) {
      const diffs = [];
      for (let i = 1; i < newTaps.length; i++) diffs.push(newTaps[i] - newTaps[i - 1]);
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calcBpm = Math.round(60000 / avg);
      if (calcBpm > 30 && calcBpm < 300) setBpm(calcBpm);
    }
  };

  const scheduleNote = (beatNumber, time) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);

    const isAccent = beatNumber === 0;
    const isMainBeat = beatNumber % subdiv === 0;

    if (isAccent) { osc.frequency.value = 1200; gain.gain.setValueAtTime(1, time); }
    else if (isMainBeat) { osc.frequency.value = 800; gain.gain.setValueAtTime(0.7, time); }
    else { osc.frequency.value = 400; gain.gain.setValueAtTime(0.2, time); }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);

    if (isMainBeat) {
      requestAnimationFrame(() => setActiveBeat(Math.floor(beatNumber / subdiv)));
    }
  };

  const scheduler = () => {
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(currentNoteRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += (60.0 / bpm) / subdiv;
      currentNoteRef.current = (currentNoteRef.current + 1) % (beats * subdiv);
    }
    timerIDRef.current = requestAnimationFrame(scheduler);
  };

  useEffect(() => {
    if (isPlaying) {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      currentNoteRef.current = 0;
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
      scheduler();
    } else {
      cancelAnimationFrame(timerIDRef.current);
      setActiveBeat(-1);
    }
    return () => cancelAnimationFrame(timerIDRef.current);
  }, [isPlaying, bpm, beats, subdiv]);

  return (
    <div className="flex flex-col items-center gap-6 py-2 w-full max-w-md mx-auto">
      <div className="flex justify-center gap-2 mb-2 w-full h-12">
        {Array(beats).fill(0).map((_, i) => (
          <div key={i} className={`flex-1 rounded-xl transition-all duration-75 border-2 ${activeBeat === i ? (i === 0 ? 'bg-red-500 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-emerald-400 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.8)]') : 'bg-[#0B1325] border-[#1E3A5F]'}`} />
        ))}
      </div>

      <div className="text-center bg-[#0B1325] w-full p-6 rounded-2xl border border-[#1E3A5F] shadow-inner relative">
        <div className="text-6xl font-bold font-mono text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
          {bpm} <span className="text-xl text-slate-400 font-sans">BPM</span>
        </div>
        <input type="range" min="30" max="250" value={bpm} onChange={(e) => { setBpm(parseInt(e.target.value, 10)); setTaps([]); }} className="w-full mt-4 accent-sky-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F]">
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">จังหวะ (Time Signature)</label>
          <select value={beats} onChange={(e) => setBeats(parseInt(e.target.value, 10))} className="w-full inp text-sm font-bold text-sky-200 text-center">
            <option value="2">2/4 (March)</option>
            <option value="3">3/4 (Waltz)</option>
            <option value="4">4/4 (Standard)</option>
            <option value="6">6/8 (Slow Rock)</option>
            <option value="7">7/8 (Odd Time)</option>
          </select>
        </div>
        <div className="bg-[#0B1325] p-3 rounded-xl border border-[#1E3A5F]">
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">การตีย่อย (Subdivision)</label>
          <select value={subdiv} onChange={(e) => setSubdiv(parseInt(e.target.value, 10))} className="w-full inp text-sm font-bold text-amber-200 text-center">
            <option value="1">♩ (Quarter)</option>
            <option value="2">♫ (Eighth)</option>
            <option value="3">3 (Triplet)</option>
            <option value="4">♬ (16th)</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 w-full mt-2">
        <button type="button" onClick={handleTap} className="flex-1 py-4 rounded-xl bg-[#0F2547] border-2 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-95 transition-transform text-lg font-bold text-sky-100 flex flex-col items-center justify-center leading-none">
          <span>👆 TAP</span>
          <span className="text-[10px] text-sky-300 font-normal mt-1">เคาะหาความเร็ว</span>
        </button>
        <button type="button" onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all shadow-lg ${isPlaying ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-emerald-600 border-emerald-400 text-white'}`}>
          {isPlaying ? '⏹ STOP' : '▶ PLAY'}
        </button>
      </div>
    </div>
  );
};

export const GuitarTuner = () => {
  const [instrument, setInstrument] = useState('guitar');
  const [isMicActive, setIsMicActive] = useState(false);
  const [pitchData, setPitchData] = useState({ freq: 0, note: '--', cents: 0 });
  const [activeNote, setActiveNote] = useState(null);

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);

  const TUNINGS = {
    guitar: [
      { note: 'E4', freq: 329.63, str: 'สาย 1 (e)' },
      { note: 'B3', freq: 246.94, str: 'สาย 2 (B)' },
      { note: 'G3', freq: 196.00, str: 'สาย 3 (G)' },
      { note: 'D3', freq: 146.83, str: 'สาย 4 (D)' },
      { note: 'A2', freq: 110.00, str: 'สาย 5 (A)' },
      { note: 'E2', freq: 82.41, str: 'สาย 6 (E)' }
    ],
    bass: [
      { note: 'G2', freq: 98.00, str: 'สาย 1 (G)' },
      { note: 'D2', freq: 73.42, str: 'สาย 2 (D)' },
      { note: 'A1', freq: 55.00, str: 'สาย 3 (A)' },
      { note: 'E1', freq: 41.20, str: 'สาย 4 (E)' }
    ]
  };

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const autoCorrelate = (buf, sampleRate) => {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;
    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  };

  const updatePitch = () => {
    if (!analyserRef.current) return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    const ac = autoCorrelate(buf, audioCtxRef.current.sampleRate);

    if (ac !== -1) {
      const noteNum = Math.round(12 * (Math.log(ac / 440) / Math.log(2))) + 69;
      const noteStr = NOTES[noteNum % 12];
      const expectedFreq = 440 * Math.pow(2, (noteNum - 69) / 12);
      const cents = Math.floor(1200 * Math.log(ac / expectedFreq) / Math.log(2));
      setPitchData({ freq: Math.round(ac), note: noteStr, cents });
    }
    rafIdRef.current = requestAnimationFrame(updatePitch);
  };

  const stopMic = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setIsMicActive(false);
    setPitchData({ freq: 0, note: '--', cents: 0 });
  };

  const stopTone = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
      oscRef.current = null;
    }
    setActiveNote(null);
  };

  const toggleMic = async () => {
    if (isMicActive) {
      stopMic();
    } else {
      stopTone();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        source.connect(analyserRef.current);
        setIsMicActive(true);
        updatePitch();
      } catch {
        alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตให้ใช้งานไมค์ก่อนครับ');
      }
    }
  };

  const playTone = (freq, note) => {
    stopMic();
    stopTone();
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    oscRef.current = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    oscRef.current.type = 'triangle';
    oscRef.current.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    oscRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, audioCtxRef.current.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 3);
    oscRef.current.start();
    setActiveNote(note);
    setTimeout(() => { setActiveNote((cur) => (cur === note ? null : cur)); }, 3000);
  };

  useEffect(() => () => { stopMic(); stopTone(); }, []);

  const { note, cents, freq } = pitchData;
  const isActive = freq > 0;
  const isPerfect = isActive && Math.abs(cents) < 5;
  const pointerRot = isActive ? cents * 0.9 : 0;

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full max-w-sm mx-auto">
      <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] w-full">
        <button type="button" onClick={() => { setInstrument('guitar'); stopMic(); stopTone(); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${instrument === 'guitar' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-[#0F2547]'}`}>🎸 กีตาร์</button>
        <button type="button" onClick={() => { setInstrument('bass'); stopMic(); stopTone(); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${instrument === 'bass' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-[#0F2547]'}`}>🎸 เบส</button>
      </div>

      <div className="flex flex-col items-center bg-[#0a101f] p-4 rounded-2xl border-2 border-[#1E3A5F] w-full mb-3 shadow-inner relative overflow-hidden">
        <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{isMicActive ? '🎤 Mic Tuner Active' : 'Tuner Offline'}</div>
        <div className="flex flex-col items-center justify-center relative w-full h-24 mt-2">
          <div className="absolute top-2 w-40 h-20 border-t-4 border-l-4 border-r-4 border-slate-700 rounded-t-full opacity-50"></div>
          <div className="absolute top-2 w-40 h-20 border-t-4 border-l-4 border-r-4 border-sky-400 rounded-t-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 15%, 0 15%)' }}></div>
          <div className="absolute top-0 w-1.5 h-5 bg-emerald-400 rounded-full z-10 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <div className={`absolute bottom-0 w-1.5 h-20 origin-bottom transition-all duration-150 ease-out z-20 rounded-t-full ${isPerfect ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]'}`} style={{ transform: `rotate(${Math.max(-45, Math.min(45, pointerRot))}deg)` }}></div>
          <div className="absolute bottom-[-6px] w-3 h-3 bg-slate-200 rounded-full z-30"></div>
        </div>
        <div className="mt-2 flex flex-col items-center">
          <div className={`text-5xl font-bold font-mono transition-colors ${isPerfect ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' : isActive ? 'text-white' : 'text-slate-600'}`}>{note}</div>
          <div className="text-xs text-slate-400 mt-1 font-mono h-4">
            {isActive ? (isPerfect ? <span className="text-emerald-400 font-bold">🎯 In Tune</span> : cents < 0 ? <span className="text-red-400">Flat ({cents} ¢) ◀</span> : <span className="text-amber-400">▶ Sharp (+{cents} ¢)</span>) : ''}
          </div>
        </div>
      </div>

      <button type="button" onClick={toggleMic} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isMicActive ? 'bg-red-950 text-red-400 border border-red-900 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/80 hover:bg-emerald-900 shadow-md'}`}>
        {isMicActive ? '⏹ ปิดไมค์จูนเสียง' : '🎤 เปิดไมค์จูนอัตโนมัติ'}
      </button>

      <div className="w-full border-t border-[#1E3A5F] my-1 relative">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B1325] px-2 text-[10px] text-slate-500 font-bold">หรือจูนด้วยเสียงมาตรฐาน</span>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TUNINGS[instrument].map((t) => (
          <button key={t.note} type="button" onClick={() => playTone(t.freq, t.note)} className={`p-2 rounded-xl border-2 flex flex-col items-center transition-all ${activeNote === t.note ? 'bg-amber-500 border-amber-300 text-[#050811] shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' : 'bg-[#0F2547] border-[#1E3A5F] text-slate-200 hover:border-amber-500/50'}`}>
            <span className="text-lg font-bold leading-none">{t.note}</span>
            <span className="text-[9px] mt-1 opacity-80 whitespace-nowrap">{t.str}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const ChordTransposer = () => {
  const [inputText, setInputText] = useState('C                  G\nWhen I find myself in times of trouble\nAm                 F\nMother Mary comes to me');
  const [step, setStep] = useState(0);

  const transpose = (chord, stp) => {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const transposeNote = (note, s) => {
      const n = FLAT_TO_SHARP[note] || note;
      const idx = NOTES.indexOf(n);
      if (idx === -1) return note;
      let newIdx = (idx + s) % 12;
      if (newIdx < 0) newIdx += 12;
      return NOTES[newIdx];
    };
    const match = chord.match(/^([CDEFGAB][#b]?)(.*)$/);
    if (!match) return chord;
    const root = match[1];
    const modifier = match[2] || '';
    if (modifier.includes('/')) {
      const parts = modifier.split('/');
      return transposeNote(root, stp) + parts[0] + '/' + transposeNote(parts[1], stp);
    }
    return transposeNote(root, stp) + modifier;
  };

  const getTransposedText = () => {
    if (step === 0) return inputText;
    const chordRegex = /\b([CDEFGAB][#b]?(?:m|M|maj|min|aug|dim|sus|add)?\d*(?:\/[CDEFGAB][#b]?)?)\b/g;
    return inputText.split('\n').map((line) => {
      const words = line.trim().split(/\s+/);
      const isChordLine = words.length > 0 && words.every((w) => chordRegex.test(w) || w === '');
      if (isChordLine) return line.replace(chordRegex, (match) => transpose(match, step));
      return line.replace(/(\[|\()([CDEFGAB][#b]?(?:m|M|maj|min|aug|dim|sus|add)?\d*(?:\/[CDEFGAB][#b]?)?)(\]|\))/g, (fm, p1, p2, p3) => p1 + transpose(p2, step) + p3);
    }).join('\n');
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
        <span className="text-sm font-bold text-sky-300">คีย์ (Key Step): {step > 0 ? '+' + step : step}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-d px-4 py-1.5 font-bold">-</button>
          <button type="button" onClick={() => setStep(0)} className="btn-d px-4 py-1.5 text-xs">Reset</button>
          <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-b px-4 py-1.5 font-bold">+</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-bold">เนื้อเพลงและคอร์ดต้นฉบับ</label>
          <textarea rows="10" value={inputText} onChange={(e) => setInputText(e.target.value)} className="inp font-mono text-sm leading-relaxed whitespace-pre" placeholder="วางเนื้อเพลงพร้อมคอร์ดที่นี่..."></textarea>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-bold">ผลลัพธ์การแปลงคีย์</label>
          <div className="inp font-mono text-sm leading-relaxed whitespace-pre min-h-[200px] overflow-y-auto bg-[#0B1325]">
            {getTransposedText()}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdvancedChordStudio = () => {
  const CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const [selIdx, setSelIdx] = useState(0);
  const [scaleMode, setScaleMode] = useState('major');
  const [mood, setMood] = useState('pop');
  const [activeChord, setActiveChord] = useState(null);

  const playChordSound = (chordName) => {
    if (!chordName) return;
    setActiveChord(chordName);
    setTimeout(() => setActiveChord(null), 250);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);

    const notesFreq = { C: 261.63, 'C#': 277.18, Db: 277.18, D: 293.66, 'D#': 311.13, Eb: 311.13, E: 329.63, F: 349.23, 'F#': 369.99, Gb: 369.99, G: 392.00, 'G#': 415.30, Ab: 415.30, A: 440.00, 'A#': 466.16, Bb: 466.16, B: 493.88 };
    const cleanChord = chordName.replace(/7|maj7|m7b5/g, '');
    const match = cleanChord.match(/^[A-G][#b]?/);
    if (!match) return;
    const baseFreq = notesFreq[match[0]];
    if (!baseFreq) return;

    let intervals = [0, 4, 7];
    if (chordName.includes('m') && !chordName.includes('maj')) intervals = [0, 3, 7];
    if (chordName.includes('dim') || chordName.includes('m7b5')) intervals = [0, 3, 6];
    if (chordName.includes('maj7')) intervals.push(11);
    else if (chordName.includes('7') || chordName.includes('m7b5')) intervals.push(10);

    intervals.forEach((interval) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * Math.pow(2, interval / 12);
      osc.connect(gainNode);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.8);
    });
  };

  const getDiatonic = (rootIdx, mode) => {
    const rootName = CIRCLE[rootIdx];
    const circleToChromatic = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, 'F#': 6, Db: 1, Ab: 8, Eb: 3, Bb: 10, F: 5 };
    const chromaIdx = circleToChromatic[rootName];
    const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db'].includes(rootName) || (mode === 'minor' && ['C', 'F', 'Bb', 'Eb', 'Ab', 'G', 'D'].includes(rootName));
    const noteNames = useFlats ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const getNote = (semitones) => noteNames[(chromaIdx + semitones) % 12];

    if (mode === 'major') {
      return { I: getNote(0), ii: getNote(2) + 'm', iii: getNote(4) + 'm', IV: getNote(5), V: getNote(7), vi: getNote(9) + 'm', vii: getNote(11) + 'dim', secDom3: getNote(4) + '7' };
    }
    return { i: getNote(0) + 'm', ii: getNote(2) + 'dim', III: getNote(3), iv: getNote(5) + 'm', v: getNote(7) + 'm', VI: getNote(8), VII: getNote(10), secDom3: getNote(7) + '7' };
  };

  const d = getDiatonic(selIdx, scaleMode);
  const MOODS = {
    pop: { name: 'Pop (สดใส/ติดหู)', prog: scaleMode === 'major' ? [d.I, d.V, d.vi, d.IV] : [d.i, d.VI, d.III, d.VII], desc: 'สูตรสำเร็จเพลงฮิตพันล้านวิว ฟังง่าย ร้องตามได้สบาย' },
    rb: { name: 'R&B / Lofi (ชิลๆ)', prog: scaleMode === 'major' ? [`${d.ii}7`, `${d.V}7`, `${d.I}maj7`, `${d.vi}7`] : [`${d.iv}7`, `${d.VII}7`, `${d.III}maj7`, `${d.VI}maj7`], desc: 'เพิ่มความ Jazzy และนุ่มนวลด้วยคอร์ดทบเจ็ด (7th chords)' },
    sad: { name: 'Melancholic (เศร้า)', prog: scaleMode === 'major' ? [d.vi, d.IV, d.I, d.V] : [d.i, d.iv, d.v, d.i], desc: 'ให้ความรู้สึกหม่นหมอง สิ้นหวัง เหมือนยืนกลางฝน' },
    epic: { name: 'Epic (ฮึกเหิม)', prog: scaleMode === 'major' ? [d.vi, d.V, d.IV, d.V] : [d.i, d.VII, d.VI, d.VII], desc: 'สร้างความรู้สึกทรงพลัง เหมาะกับเพลงร็อคหรือตอนสู้บอส' },
    jpop: { name: 'J-Pop (อนิเมะ)', prog: scaleMode === 'major' ? [d.IV, d.V, d.iii, d.vi] : [d.VI, d.VII, d.v, d.i], desc: 'Royal Road Progression (王道) คอร์ดฮิตฝั่งญี่ปุ่น ฟังแล้วมีกำลังใจ' },
    jazz: { name: 'Jazz (2-5-1)', prog: scaleMode === 'major' ? [`${d.ii}7`, `${d.V}7`, `${d.I}maj7`, `${d.I}maj7`] : [d.ii.replace('dim', 'm7b5'), d.secDom3, d.i.replace('m', 'm7'), d.i.replace('m', 'm7')], desc: 'ทางคอร์ดพื้นฐานสุดคลาสสิกของการเล่นแจ๊ส' },
    nostalgic: { name: 'Nostalgic (คิดถึง)', prog: scaleMode === 'major' ? [d.I, d.secDom3, d.vi, d.IV] : [d.i, d.secDom3, d.VI, d.iv], desc: 'ใช้คอร์ดนอกคีย์ (Secondary Dominant) ดึงอารมณ์ให้รู้สึกถวิลหาอดีต' }
  };
  const currentMood = MOODS[mood];

  const ChordBox = ({ label, chord, colorClass }) => (
    <button
      type="button"
      onClick={() => playChordSound(chord)}
      className={`relative p-2 rounded text-center border transition-all hover:scale-105 cursor-pointer shadow-md w-full ${colorClass} ${activeChord === chord ? 'ring-2 ring-white scale-110 brightness-125 z-10' : ''}`}
      title="คลิกเพื่อฟังเสียงคอร์ด"
    >
      <div className="text-[9px] text-slate-400 font-mono opacity-80 leading-none">{label}</div>
      <div className="text-lg font-bold mt-1 leading-none">{chord}</div>
      <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 text-[10px] text-slate-400"><i className="fas fa-volume-up"></i></div>
    </button>
  );

  return (
    <div className="flex flex-col gap-5 py-2 w-full max-w-3xl mx-auto text-xs">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-[#0B1325] rounded-xl border border-[#1E3A5F] p-4 shadow-lg relative">
          <div className="absolute top-3 left-3 bg-[#050811] p-1 rounded-lg border border-[#1E3A5F] flex text-[9px] font-bold z-30 shadow-md">
            <button type="button" onClick={() => setScaleMode('major')} className={`px-2 py-1 rounded transition-colors ${scaleMode === 'major' ? 'bg-amber-500 text-[#050811]' : 'text-slate-400 hover:text-white'}`}>Major</button>
            <button type="button" onClick={() => setScaleMode('minor')} className={`px-2 py-1 rounded transition-colors ${scaleMode === 'minor' ? 'bg-sky-500 text-[#050811]' : 'text-slate-400 hover:text-white'}`}>Minor</button>
          </div>
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4 ml-auto">Circle of Fifths</div>
          <div className="relative w-56 h-56 rounded-full border-4 border-[#1E3A5F] bg-[#050811] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 m-auto w-40 h-40 rounded-full border border-slate-700/50"></div>
            {CIRCLE.map((key, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const x = 50 + 40 * Math.cos(angle);
              const y = 50 + 40 * Math.sin(angle);
              const isSelected = selIdx === i;
              const isDiatonic = i === selIdx || i === (selIdx + 1) % 12 || i === (selIdx + 11) % 12;
              const selColor = scaleMode === 'major' ? 'bg-amber-400 text-amber-950 border-white' : 'bg-sky-400 text-sky-950 border-white';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelIdx(i)}
                  className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full flex flex-col items-center justify-center font-bold transition-all shadow-md ${isSelected ? `${selColor} scale-125 z-20 border-2` : isDiatonic ? 'bg-slate-700 text-white z-10' : 'bg-[#0F2547] text-slate-400 border border-[#1E3A5F] hover:bg-sky-900 hover:text-white'}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <span className="text-[11px] leading-none">{key}</span>
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-400 mt-6 text-center">💡 เลือกคีย์ที่ต้องการบนวงล้อ เพื่อดูคอร์ดในคีย์</div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col gap-3">
          <div className="bg-[#050811] rounded-xl border border-[#1E3A5F] p-4 shadow-lg h-full flex flex-col">
            <div className="text-xs font-bold text-amber-400 mb-3 border-b border-[#1E3A5F] pb-2 flex justify-between items-center">
              <span>คอร์ดในคีย์ (Diatonic)</span>
              <span className="text-white bg-slate-800 px-2 py-0.5 rounded text-[10px]">{CIRCLE[selIdx]} {scaleMode.charAt(0).toUpperCase() + scaleMode.slice(1)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 flex-1 content-start">
              {scaleMode === 'major' ? (
                <>
                  <ChordBox label="I (Tonic)" chord={d.I} colorClass="bg-sky-900/30 border-sky-700 text-sky-300" />
                  <ChordBox label="ii" chord={d.ii} colorClass="bg-[#0B1325] border-[#1E3A5F] text-slate-200" />
                  <ChordBox label="iii" chord={d.iii} colorClass="bg-[#0B1325] border-[#1E3A5F] text-slate-200" />
                  <ChordBox label="IV (Subdom)" chord={d.IV} colorClass="bg-emerald-900/30 border-emerald-700 text-emerald-300" />
                  <ChordBox label="V (Dominant)" chord={d.V} colorClass="bg-amber-900/30 border-amber-700 text-amber-300" />
                  <ChordBox label="vi (Rel. Minor)" chord={d.vi} colorClass="bg-fuchsia-900/30 border-fuchsia-700 text-fuchsia-300" />
                </>
              ) : (
                <>
                  <ChordBox label="i (Tonic)" chord={d.i} colorClass="bg-sky-900/30 border-sky-700 text-sky-300" />
                  <ChordBox label="ii°" chord={d.ii} colorClass="bg-[#0B1325] border-[#1E3A5F] text-slate-200" />
                  <ChordBox label="III (Rel. Major)" chord={d.III} colorClass="bg-fuchsia-900/30 border-fuchsia-700 text-fuchsia-300" />
                  <ChordBox label="iv (Subdom)" chord={d.iv} colorClass="bg-emerald-900/30 border-emerald-700 text-emerald-300" />
                  <ChordBox label="v (Dominant)" chord={d.v} colorClass="bg-amber-900/30 border-amber-700 text-amber-300" />
                  <ChordBox label="VI" chord={d.VI} colorClass="bg-[#0B1325] border-[#1E3A5F] text-slate-200" />
                </>
              )}
            </div>
            <div className="mt-3 bg-[#0a101f] border border-[#1E3A5F]/50 p-2 rounded-lg flex justify-between px-4 items-center shadow-inner">
              <div className="text-[9px] text-slate-400 font-mono w-1/2 text-left">{scaleMode === 'major' ? 'vii° (Diminished)' : 'VII (Subtonic)'}</div>
              <div className="w-1/2"><ChordBox label="" chord={scaleMode === 'major' ? d.vii : d.VII} colorClass="bg-red-950/30 border-red-900/50 text-red-300 w-full" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0B1325] to-[#050811] p-5 rounded-xl border border-[#1E3A5F] shadow-2xl mt-2">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="text-sm font-bold text-white flex items-center gap-2">✨ สร้างทางคอร์ดตามอารมณ์เพลง</div>
          <select value={mood} onChange={(e) => setMood(e.target.value)} className="inp py-1.5 bg-[#0F2547] text-[11px] font-bold text-sky-200 border-sky-900/50">
            {Object.entries(MOODS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>
        <div className="text-[11px] text-slate-400 mb-4 bg-[#0a101f] p-2 rounded-lg border border-[#1E3A5F]">{currentMood.desc}</div>
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {currentMood.prog.map((chord, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => playChordSound(chord)}
              className={`bg-[#0a101f] border-2 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner relative group transition-all hover:scale-105 active:scale-95 ${activeChord === chord ? 'border-sky-400 bg-sky-900/20' : 'border-slate-600 hover:border-amber-400'}`}
              title="กดเพื่อฟังเสียง"
            >
              <span className={`text-xl sm:text-3xl font-bold font-mono transition-colors ${activeChord === chord ? 'text-sky-300' : 'text-white group-hover:text-amber-300'}`}>{chord}</span>
              <span className="absolute top-1 right-2 text-[10px] opacity-0 group-hover:opacity-50"><i className="fas fa-volume-up"></i></span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <div className="text-[10px] text-slate-500 bg-[#070C18] p-2 rounded border border-[#1E3A5F] w-full text-center">ลองกดที่กล่องคอร์ดเพื่อฟังเสียง หรือนำชุดนี้ไปเกากีตาร์/กดเปียโนตามได้เลยครับ</div>
        </div>
      </div>
    </div>
  );
};

export const RhymeFinder = () => {
  const [word, setWord] = useState('');
  const [lang, setLang] = useState('th');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dbRhymes, setDbRhymes] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newVowel, setNewVowel] = useState('อา');
  const [isLiveSyllable, setIsLiveSyllable] = useState(true);
  const [addMsg, setAddMsg] = useState('');

  const THAI_VOWELS = ['อะ', 'อา', 'อิ', 'อี', 'อึ', 'อื', 'อุ', 'อู', 'เอะ', 'เอ', 'แอะ', 'แอ', 'โอะ', 'โอ', 'เอาะ', 'ออ', 'เออะ', 'เออ', 'เอียะ', 'เอีย', 'เอือะ', 'เอือ', 'อัวะ', 'อัว', 'อำ', 'ไอ', 'ใอ', 'เอา'];
  const THAI_RHYMES_BASE = {
    'ไอ_เป็น': ['ใจ', 'ไป', 'ใคร', 'ไกล', 'ให้', 'ไว้', 'ใหม่', 'ใหญ่', 'ไหน', 'ไฟ', 'วัย', 'ชัย', 'ไทย', 'ไร', 'ใกล้'],
    'อา_เป็น': ['ดาว', 'ขาว', 'ยาว', 'หนาว', 'คราว', 'สาว', 'ก้าว', 'ข้าว', 'พราว', 'ราว', 'กล่าว', 'ร้าว', 'งาน', 'นาน', 'ผ่าน', 'บ้าน', 'ร้าน', 'ล้าน', 'หวาน', 'พาน', 'จาน', 'หลาน', 'กาล', 'การ', 'มาร', 'ด้าน', 'ตาย', 'ชาย', 'หมาย', 'สาย', 'ปลาย', 'กาย', 'ขาย', 'คลาย', 'ลาย', 'อาย', 'ทราย', 'ซ้าย', 'ท้าย'],
    'อะ_ตาย': ['รัก', 'ทัก', 'พัก', 'หนัก', 'มัก', 'หัก', 'ศักดิ์', 'ผลัก', 'สลัก', 'หลัก', 'ภักดิ์', 'ถัก'],
    'โอ_เป็น': ['คน', 'จน', 'ทน', 'ชน', 'ฝน', 'หล่น', 'บ่น', 'ตน', 'วน', 'ถนน', 'ผล', 'ดล', 'มนตร์', 'ค้น', 'คง', 'ลง', 'ตรง', 'วง', 'งง', 'ผง', 'ส่ง', 'หลง', 'ทรง', 'ธง', 'ปลง', 'โค้ง', 'โล่ง'],
    'เออ_เป็น': ['เธอ', 'เจอ', 'เผลอ', 'เพ้อ', 'เสมอ', 'เบลอ', 'เก้อ', 'ละเมอ', 'อำเภอ', 'เลย', 'เคย', 'เผย', 'เฉย', 'เสย', 'เนย', 'เชย', 'เงย', 'เปรย', 'เย้ย', 'เอ่ย'],
    'อี_เป็น': ['ดี', 'มี', 'ปี', 'สี', 'หนี', 'ฟรี', 'ที', 'พี่', 'ชี้', 'หนี้', 'ผี', 'ชี', 'ตี', 'ที่', 'นี่'],
    'อี_ตาย': ['รีบ', 'บีบ', 'จีบ', 'ถีบ', 'หีบ', 'ตีบ', 'หลีก', 'ฉีก', 'ปีก', 'ซีก'],
    'อู_เป็น': ['ดู', 'รู้', 'อยู่', 'คู่', 'สู้', 'หมู', 'หู', 'งู', 'ประตู', 'ครู', 'ปู่', 'หนู', 'กู้'],
    'ออ_เป็น': ['รอ', 'ขอ', 'พอ', 'ต่อ', 'ท้อ', 'ล้อ', 'หมอ', 'คอ', 'หอ', 'จอ', 'ข้อ', 'พ้อ', 'ง้อ'],
    'อิ_เป็น': ['จริง', 'สิ่ง', 'ยิ่ง', 'หญิง', 'ทิ้ง', 'นิ่ง', 'วิ่ง', 'พิง', 'ชิง', 'ปิ้ง', 'ลิง', 'กลิ้ง']
  };

  useEffect(() => {
    const unsub = db.collection('bma_system').doc('rhyme_dict').onSnapshot((doc) => {
      if (doc.exists) setDbRhymes(doc.data().groups || {});
    }, () => {});
    return () => unsub();
  }, []);

  const mergedRhymes = { ...THAI_RHYMES_BASE };
  Object.keys(dbRhymes).forEach((groupKey) => {
    if (!mergedRhymes[groupKey]) mergedRhymes[groupKey] = [];
    mergedRhymes[groupKey] = [...new Set([...mergedRhymes[groupKey], ...dbRhymes[groupKey]])];
  });

  const findRhyme = async (overrideWord = null) => {
    const searchWord = (overrideWord ?? word).trim();
    if (!searchWord) return;
    setLoading(true);
    setError('');
    setResults([]);
    setShowAdd(false);

    if (lang === 'en') {
      try {
        const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(searchWord)}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('API Response not OK');
        const data = await res.json();
        if (data.length > 0) setResults(data.slice(0, 40).map((d) => d.word));
        else setError('❌ ไม่พบคำคล้องจองสำหรับคำนี้');
      } catch {
        setError('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      }
    } else {
      let foundGroup = null;
      for (const [group, words] of Object.entries(mergedRhymes)) {
        if (words.includes(searchWord)) { foundGroup = group; break; }
      }
      if (foundGroup) setResults(mergedRhymes[foundGroup].filter((w) => w !== searchWord));
      else {
        setError(`❌ ยังไม่มีคำว่า "${searchWord}" ในฐานข้อมูลของสมาคม`);
        setShowAdd(true);
        setNewWord(searchWord);
      }
    }
    setLoading(false);
  };

  const handleAddWordToDict = async () => {
    const clean = newWord.trim();
    if (!clean) return;
    const groupKey = `${newVowel}_${isLiveSyllable ? 'เป็น' : 'ตาย'}`;
    const currentGroupData = dbRhymes[groupKey] || THAI_RHYMES_BASE[groupKey] || [];
    if (currentGroupData.includes(clean)) return setAddMsg('⚠️ คำนี้มีอยู่ในหมวดนี้แล้วครับ');

    try {
      await db.collection('bma_system').doc('rhyme_dict').set({
        groups: { ...dbRhymes, [groupKey]: [...new Set([...(dbRhymes[groupKey] || []), clean])] }
      }, { merge: true });
      setAddMsg('✅ เพิ่มคำศัพท์สำเร็จ!');
      setTimeout(() => { setShowAdd(false); setAddMsg(''); setWord(clean); findRhyme(clean); }, 1200);
    } catch {
      setAddMsg('❌ เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0B1325] p-5 rounded-2xl border border-[#1E3A5F] shadow-xl h-fit">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm text-sky-400 font-bold uppercase tracking-widest"><i className="fas fa-pen-nib"></i> Rhyme Finder</label>
            <div className="flex bg-[#050811] rounded-lg border border-[#1E3A5F] overflow-hidden text-[10px] font-bold">
              <button type="button" onClick={() => { setLang('th'); setResults([]); setError(''); setShowAdd(false); }} className={`px-3 py-1.5 ${lang === 'th' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>ไทย</button>
              <button type="button" onClick={() => { setLang('en'); setResults([]); setError(''); setShowAdd(false); }} className={`px-3 py-1.5 ${lang === 'en' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" value={word} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') findRhyme(); }} placeholder={lang === 'th' ? 'พิมพ์คำที่ต้องการ (เช่น รัก, ใจ, ดาว)...' : 'Type a word (e.g. love, night)...'} className="flex-1 min-w-0 w-full inp font-bold text-sm" />
            <button type="button" onClick={() => findRhyme()} disabled={loading} className="btn-b text-xs px-4 font-bold shadow-lg shrink-0">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
            </button>
          </div>
          {lang === 'th' && (
            <div className="text-[9px] text-slate-400 mt-2 flex justify-between items-center">
              <span>💡 ฐานข้อมูลพจนานุกรมอัปเดตโดยสมาชิกสมาคม</span>
              <span className="text-emerald-400 font-bold">({Object.values(mergedRhymes).flat().length} คำศัพท์)</span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-b from-[#050811] to-[#0a101f] p-5 rounded-2xl border border-[#1E3A5F] shadow-lg min-h-[150px]">
          <div className="text-[10px] text-slate-400 font-bold mb-3 border-b border-[#1E3A5F] pb-2 flex justify-between items-center">
            <span>ผลลัพธ์คำคล้องจอง (Rhymes)</span>
            {results.length > 0 && lang === 'th' && <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-sky-300 hover:text-sky-200 underline">+ เพิ่มคำศัพท์เอง</button>}
          </div>

          {showAdd && lang === 'th' && (
            <div className="mb-4 bg-[#0F2547] p-4 rounded-xl border border-sky-500/50 shadow-inner text-xs animate-fade-in space-y-3">
              <div className="font-bold text-amber-300 mb-2"><i className="fas fa-plus-circle"></i> ช่วยกันเพิ่มคำศัพท์ใหม่ให้สมาคม!</div>
              <div className="flex gap-2">
                <input type="text" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="คำศัพท์ใหม่..." className="flex-1 inp py-1.5 px-2" />
                <button type="button" onClick={handleAddWordToDict} className="btn-b py-1.5 px-4 font-bold text-sky-200">บันทึก</button>
              </div>
              <div className="flex gap-2">
                <select value={newVowel} onChange={(e) => setNewVowel(e.target.value)} className="flex-1 inp py-1.5 px-2 bg-[#050811]">
                  {THAI_VOWELS.map((v) => <option key={v} value={v}>สระ: {v}</option>)}
                </select>
                <select value={isLiveSyllable ? 'live' : 'dead'} onChange={(e) => setIsLiveSyllable(e.target.value === 'live')} className="flex-1 inp py-1.5 px-2 bg-[#050811]">
                  <option value="live">🟢 คำเป็น</option>
                  <option value="dead">🔴 คำตาย</option>
                </select>
              </div>
              {addMsg && <div className={`font-bold text-[10px] text-center ${addMsg.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{addMsg}</div>}
            </div>
          )}

          {error && !showAdd ? (
            <div className="text-red-400 text-xs font-bold text-center py-4 bg-red-950/30 rounded-lg border border-red-900/50">{error}</div>
          ) : results.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {results.map((r, i) => (
                <span key={i} className="px-3 py-1.5 bg-[#0F2547] text-sky-200 text-sm font-bold rounded-lg border border-sky-900/50 hover:bg-sky-700 hover:text-white transition-colors cursor-pointer shadow-sm">{r}</span>
              ))}
            </div>
          ) : (
            !showAdd && <div className="text-slate-500 text-xs text-center py-8 opacity-50"><i className="fas fa-search block text-2xl mb-2"></i>พิมพ์คำเพื่อค้นหาคำคล้องจอง</div>
          )}
        </div>
      </div>

      {lang === 'th' && (
        <div className="bg-[#0B1325] border-l-4 border-amber-500 p-4 rounded-xl shadow-inner mt-2 text-xs">
          <div className="font-bold text-amber-400 mb-2 flex items-center gap-2"><i className="fas fa-book"></i> หลักการจำแนก คำเป็น - คำตาย</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
            <div className="bg-[#050811] p-3 rounded-lg border border-[#1E3A5F]">
              <div className="text-emerald-400 font-bold mb-1 border-b border-[#1E3A5F] pb-1">🟢 คำเป็น (Live Syllable)</div>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li>ประสมสระเสียงยาวในแม่ ก กา <span className="text-slate-500">(เช่น มา, ดู, เวลา)</span></li>
                <li>ตัวสะกดแม่ กง, กน, กม, เกย, เกอว (นมยวง) <span className="text-slate-500">(เช่น คน, สาว)</span></li>
                <li>ประสมด้วยสระ อำ, ไอ, ใอ, เอา</li>
              </ul>
            </div>
            <div className="bg-[#050811] p-3 rounded-lg border border-[#1E3A5F]">
              <div className="text-red-400 font-bold mb-1 border-b border-[#1E3A5F] pb-1">🔴 คำตาย (Dead Syllable)</div>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li>ประสมสระเสียงสั้นในแม่ ก กา <span className="text-slate-500">(เช่น จะ, ปะ, ทะลุ)</span></li>
                <li>ตัวสะกดในแม่ กก, กด, กบ (กบด) <span className="text-slate-500">(เช่น นก, ตัด, รับ)</span></li>
              </ul>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-3 text-center bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]/50">
            💡 การแต่งกลอนหรือเพลง มักจะจับคู่สัมผัสระหว่าง <b>"สระเดียวกัน + คำประเภทเดียวกัน"</b> (คำเป็นคู่คำเป็น คำตายคู่คำตาย)
          </div>
        </div>
      )}
    </div>
  );
};

export default function MusicTools({ toolId }) {
  if (toolId === 'bpm') return <BPMTapper />;
  if (toolId === 'chords') return <AdvancedChordStudio />;
  if (toolId === 'tuner') return <GuitarTuner />;
  if (toolId === 'transposer') return <ChordTransposer />;
  if (toolId === 'rhyme') return <RhymeFinder />;
  return null;
}