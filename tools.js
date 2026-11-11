// ==========================================
// tools.js - ระบบเครื่องมือเสริม (Guild Tools)
// ==========================================

const BPMTapper = () => {
    const [bpm, setBpm] = useState(120);
    const [taps, setTaps] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const timerIDRef = useRef(null);

    const handleTap = () => {
        const now = Date.now();
        const newTaps = [...taps, now].slice(-5);
        setTaps(newTaps);
        if (newTaps.length > 1) {
            const diffs = [];
            for (let i = 1; i < newTaps.length; i++) diffs.push(newTaps[i] - newTaps[i-1]);
            const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const calcBpm = Math.round(60000 / avg);
            if (calcBpm > 30 && calcBpm < 300) setBpm(calcBpm);
        }
    };

    const scheduleNote = () => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.connect(gain); gain.connect(audioCtxRef.current.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(1, nextNoteTimeRef.current);
        gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTimeRef.current + 0.05);
        osc.start(nextNoteTimeRef.current);
        osc.stop(nextNoteTimeRef.current + 0.05);
    };

    const scheduler = () => {
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            scheduleNote();
            nextNoteTimeRef.current += 60.0 / bpm;
        }
        timerIDRef.current = requestAnimationFrame(scheduler);
    };

    useEffect(() => {
        if (isPlaying) {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
            nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
            scheduler();
        } else cancelAnimationFrame(timerIDRef.current);
        return () => cancelAnimationFrame(timerIDRef.current);
    }, [isPlaying, bpm]);

    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="text-center">
            <div className="text-6xl font-bold text-sky-400">{bpm} <span className="text-xl text-slate-400">BPM</span></div>
            <p className="text-xs text-slate-500 mt-2">แตะที่ปุ่ม Tapper ตามจังหวะ หรือเลื่อนปรับเอง</p>
        </div>
        <input type="range" min="40" max="240" value={bpm} onChange={(e) => { setBpm(parseInt(e.target.value)); setTaps([]); }} className="w-full max-w-xs accent-sky-500" />
        <div className="flex gap-4 w-full max-w-xs">
            <button onClick={handleTap} className="flex-1 py-8 rounded-2xl bg-[#0F2547] border-2 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-95 transition-transform text-xl font-bold text-sky-100">👆 TAP</button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`flex-1 py-8 rounded-2xl border-2 font-bold text-xl transition-all ${isPlaying ? 'bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-emerald-600 border-emerald-400 text-white'}`}>{isPlaying ? '⏹ STOP' : '▶ PLAY'}</button>
        </div>
      </div>
    );
};

const GuitarTuner = () => {
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
            { note: 'E4', freq: 329.63, str: 'สาย 1 (e)' }, { note: 'B3', freq: 246.94, str: 'สาย 2 (B)' },
            { note: 'G3', freq: 196.00, str: 'สาย 3 (G)' }, { note: 'D3', freq: 146.83, str: 'สาย 4 (D)' },
            { note: 'A2', freq: 110.00, str: 'สาย 5 (A)' }, { note: 'E2', freq: 82.41, str: 'สาย 6 (E)' }
        ],
        bass: [
            { note: 'G2', freq: 98.00, str: 'สาย 1 (G)' }, { note: 'D2', freq: 73.42, str: 'สาย 2 (D)' },
            { note: 'A1', freq: 55.00, str: 'สาย 3 (A)' }, { note: 'E1', freq: 41.20, str: 'สาย 4 (E)' }
        ]
    };

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const autoCorrelate = (buf, sampleRate) => {
        let SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

        buf = buf.slice(r1, r2); SIZE = buf.length;
        let c = new Array(SIZE).fill(0);
        for (let i = 0; i < SIZE; i++)
            for (let j = 0; j < SIZE - i; j++)
                c[i] = c[i] + buf[j] * buf[j + i];

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
        }
        let T0 = maxpos;
        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
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
            setPitchData({ freq: Math.round(ac), note: noteStr, cents: cents });
        }
    
        rafIdRef.current = requestAnimationFrame(updatePitch);
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
            } catch (err) {
                alert("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตให้ใช้งานไมค์ก่อนครับ");
            }
        }
    };

    const stopMic = () => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setIsMicActive(false);
        setPitchData({ freq: 0, note: '--', cents: 0 });
    };

    const playTone = (freq, note) => {
        stopMic();
        stopTone();
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        oscRef.current = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        oscRef.current.type = 'triangle';
        oscRef.current.connect(gain); gain.connect(audioCtxRef.current.destination);
        oscRef.current.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gain.gain.linearRampToValueAtTime(0.8, audioCtxRef.current.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 3);
        oscRef.current.start();
        setActiveNote(note);
        setTimeout(() => { if(activeNote === note) setActiveNote(null); }, 3000);
    };

    const stopTone = () => {
        if(oscRef.current) { try { oscRef.current.stop(); } catch(e){} oscRef.current = null; }
        setActiveNote(null);
    };

    useEffect(() => {
        return () => { stopMic(); stopTone(); };
    }, []);

    const renderMeter = () => {
        const { note, cents, freq } = pitchData;
        const isActive = freq > 0;
        const isPerfect = isActive && Math.abs(cents) < 5;
        const pointerRot = isActive ? (cents * 0.9) : 0;
    
        return (
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
        );
    };

    return (
      <div className="flex flex-col items-center gap-3 py-2 w-full max-w-sm mx-auto">
        <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] w-full">
            <button onClick={() => { setInstrument('guitar'); stopMic(); stopTone(); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${instrument==='guitar' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-[#0F2547]'}`}>🎸 กีตาร์</button>
            <button onClick={() => { setInstrument('bass'); stopMic(); stopTone(); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${instrument==='bass' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-[#0F2547]'}`}>🎸 เบส</button>
        </div>
        {renderMeter()}
        <button onClick={toggleMic} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isMicActive ? 'bg-red-950 text-red-400 border border-red-900 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/80 hover:bg-emerald-900 shadow-md'}`}>
            {isMicActive ? '⏹ ปิดไมค์จูนเสียง' : '🎤 เปิดไมค์จูนอัตโนมัติ'}
        </button>
        <div className="w-full border-t border-[#1E3A5F] my-1 relative">
           <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B1325] px-2 text-[10px] text-slate-500 font-bold">หรือจูนด้วยเสียงมาตรฐาน</span>
        </div>
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TUNINGS[instrument].map((t) => (
                <button key={t.note} onClick={() => playTone(t.freq, t.note)} className={`p-2 rounded-xl border-2 flex flex-col items-center transition-all ${activeNote === t.note ? 'bg-amber-500 border-amber-300 text-[#050811] shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' : 'bg-[#0F2547] border-[#1E3A5F] text-slate-200 hover:border-amber-500/50'}`}>
                    <span className="text-lg font-bold leading-none">{t.note}</span>
                    <span className="text-[9px] mt-1 opacity-80 whitespace-nowrap">{t.str}</span>
                </button>
            ))}
        </div>
      </div>
    );
};

const ChordTransposer = () => {
    const [inputText, setInputText] = useState("C                  G\nWhen I find myself in times of trouble\nAm                 F\nMother Mary comes to me");
    const [step, setStep] = useState(0);

    const transpose = (chord, stp) => {
        const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const FLAT_TO_SHARP = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
        const transposeNote = (note, s) => {
            let n = FLAT_TO_SHARP[note] || note; let idx = NOTES.indexOf(n);
            if(idx === -1) return note;
            let newIdx = (idx + s) % 12; if (newIdx < 0) newIdx += 12;
            return NOTES[newIdx];
        };
        const match = chord.match(/^([CDEFGAB][#b]?)(.*)$/);
        if(!match) return chord;
        let root = match[1]; let modifier = match[2] || '';
        if (modifier.includes('/')) {
            const parts = modifier.split('/');
            return transposeNote(root, stp) + parts[0] + '/' + transposeNote(parts[1], stp);
        }
        return transposeNote(root, stp) + modifier;
    };

    const getTransposedText = () => {
        if(step === 0) return inputText;
        const chordRegex = /\b([CDEFGAB][#b]?(?:m|M|maj|min|aug|dim|sus|add)?\d*(?:\/[CDEFGAB][#b]?)?)\b/g;
        const lines = inputText.split('\n');
        const processedLines = lines.map(line => {
            const words = line.trim().split(/\s+/);
            const isChordLine = words.length > 0 && words.every(w => chordRegex.test(w) || w === '');
            if (isChordLine) return line.replace(chordRegex, (match) => transpose(match, step));
            else return line.replace(/(\[|\()([CDEFGAB][#b]?(?:m|M|maj|min|aug|dim|sus|add)?\d*(?:\/[CDEFGAB][#b]?)?)(\]|\))/g, (fm, p1, p2, p3) => p1 + transpose(p2, step) + p3);
        });
        return processedLines.join('\n');
    };

    return (
      <div className="flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center bg-[#050811] p-3 rounded-xl border border-[#1E3A5F]">
            <span className="text-sm font-bold text-sky-300">คีย์ (Key Step): {step > 0 ? '+'+step : step}</span>
            <div className="flex gap-2">
                <button onClick={() => setStep(s => s - 1)} className="btn-d px-4 py-1.5 font-bold">-</button>
                <button onClick={() => setStep(0)} className="btn-d px-4 py-1.5 text-xs">Reset</button>
                <button onClick={() => setStep(s => s + 1)} className="btn-b px-4 py-1.5 font-bold">+</button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-bold">เนื้อเพลงและคอร์ดต้นฉบับ</label>
                <textarea rows="10" value={inputText} onChange={e => setInputText(e.target.value)} className="inp font-mono text-sm leading-relaxed whitespace-pre" placeholder="วางเนื้อเพลงพร้อมคอร์ดที่นี่..."></textarea>
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

const AdvancedUnitConverter = () => {
    const CATEGORIES = {
      'Length (ความยาว)': { 'm': 1, 'cm': 100, 'mm': 1000, 'km': 0.001, 'in': 39.3701, 'ft': 3.28084, 'yd': 1.09361, 'mile': 0.000621371, 'วา (wa)': 0.5, 'ศอก (sok)': 2, 'คืบ (khuep)': 4, 'เส้น (sen)': 0.025, 'โยชน์ (yot)': 0.0000625 },
      'Area (พื้นที่)': { 'm²': 1, 'cm²': 10000, 'km²': 1e-6, 'hectare': 1e-4, 'acre': 0.000247105, 'sq ft': 10.7639, 'ตารางวา (sq wa)': 0.25, 'งาน (ngan)': 0.0025, 'ไร่ (rai)': 0.000625 },
      'Mass (น้ำหนัก)': { 'kg': 1, 'g': 1000, 'mg': 1e6, 'lb': 2.20462, 'oz': 35.274, 'ton': 0.001, 'ขีด (khit)': 10, 'บาท (ทอง)': 65.59958, 'สลึง (ทอง)': 262.3983, 'ตำลึง': 16.39989 },
      'Volume (ปริมาตร)': { 'L': 1, 'mL': 1000, 'm³': 0.001, 'cm³': 1000, 'gal (US)': 0.264172, 'qt (US)': 1.05669, 'fl oz (US)': 33.814, 'ถัง (thang)': 0.05, 'เกวียน (kwian)': 0.0005, 'ทะนาน (thanan)': 1 },
      'Force (แรง)': { 'N': 1, 'kN': 1e-3, 'kgf': 0.10197, 'lbf': 0.224809 },
      'Pressure (ความดัน)': { 'Pa': 1, 'kPa': 1e-3, 'MPa': 1e-6, 'bar': 1e-5, 'psi': 0.000145038, 'atm': 0.0000098692 },
      'Energy (พลังงาน)': { 'J': 1, 'kJ': 1e-3, 'cal': 0.239006, 'kcal': 0.000239006, 'Wh': 0.000277778, 'kWh': 2.77778e-7, 'eV': 6.242e18 },
      'Torque (แรงบิด)': { 'N·m': 1, 'lbf·ft': 0.737562, 'kgf·m': 0.101972, 'ozf·in': 141.6119 },
      'Power (กำลัง)': { 'W': 1, 'kW': 1e-3, 'HP': 0.00134102, 'BTU/hr': 3.41214 },
      'Velocity (ความเร็ว)': { 'm/s': 1, 'km/h': 3.6, 'mph': 2.23694, 'knot': 1.94384, 'ft/s': 3.28084 },
      'Data Storage (ข้อมูล)': { 'Byte': 1, 'KB': 1e-3, 'MB': 1e-6, 'GB': 1e-9, 'TB': 1e-12 },
      'Angle (มุม)': { 'Degree': 1, 'Radian': 0.0174533, 'Gradian': 1.11111 },
      'Temperature (อุณหภูมิ)': 'special',
      'Custom (พิมพ์หน่วยเอง)': 'compound'
    };

    const BASE_UNITS = {
        'kg': { type: 'mass', val: 1 }, 'g': { type: 'mass', val: 1000 }, 'lb': { type: 'mass', val: 2.20462 },
        'm': { type: 'length', val: 1 }, 'cm': { type: 'length', val: 100 }, 'mm': { type: 'length', val: 1000 }, 'km': { type: 'length', val: 0.001 }, 'in': { type: 'length', val: 39.3701 }, 'ft': { type: 'length', val: 3.28084 },
        's': { type: 'time', val: 1 }, 'min': { type: 'time', val: 1/60 }, 'h': { type: 'time', val: 1/3600 },
        'L': { type: 'volume', val: 1 }, 'mL': { type: 'volume', val: 1000 }
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

    useEffect(() => {
      if (category === 'Temperature (อุณหภูมิ)') { setFromUnit('C'); setToUnit('F'); }
      else if (category !== 'Custom (พิมพ์หน่วยเอง)') { 
          const units = Object.keys(CATEGORIES[category]); 
          setFromUnit(units[0]); setToUnit(units[1] || units[0]); 
      }
      setInputValue('');
    }, [category]);

    const parseCompoundUnit = (unitStr) => {
        if(!unitStr) return null;
        try {
            let str = unitStr.replace(/\s+/g, '');
            Object.keys(BASE_UNITS).sort((a,b) => b.length - a.length).forEach(u => {
                const regex = new RegExp(`(?<![a-zA-Z])${u}(?![a-zA-Z])`, 'g');
                str = str.replace(regex, BASE_UNITS[u].val);
            });
            str = str.replace(/\^/g, '**');
            if (/[a-zA-Z]/.test(str)) return null;
            const factor = new Function('return ' + str)();
            return factor;
        } catch (e) {
            return null;
        }
    };

    const calculateResult = () => {
      if (inputValue === '') return '';
      const val = parseFloat(inputValue); if (isNaN(val)) return 'Invalid Input';
      let resultNum = 0;
                
      if (category === 'Temperature (อุณหภูมิ)') {
        if (fromUnit === toUnit) resultNum = val;
        else if (fromUnit === 'C' && toUnit === 'F') resultNum = (val * 9/5) + 32;
        else if (fromUnit === 'C' && toUnit === 'K') resultNum = val + 273.15;
        else if (fromUnit === 'F' && toUnit === 'C') resultNum = (val - 32) * 5/9;
        else if (fromUnit === 'F' && toUnit === 'K') resultNum = (val - 32) * 5/9 + 273.15;
        else if (fromUnit === 'K' && toUnit === 'C') resultNum = val - 273.15;
        else if (fromUnit === 'K' && toUnit === 'F') resultNum = (val - 273.15) * 9/5 + 32;
      } else if (category === 'Custom (พิมพ์หน่วยเอง)') {
        const factorFrom = parseCompoundUnit(customFrom);
        const factorTo = parseCompoundUnit(customTo);
        if (!factorFrom || !factorTo) return 'Unit Error';
        resultNum = (val / factorFrom) * factorTo;
      } else {
        resultNum = (val / CATEGORIES[category][fromUnit]) * CATEGORIES[category][toUnit];
      }

      if (useSciNotation) return resultNum.toExponential(precision > 0 ? precision - 1 : 2);
                
      const absVal = Math.abs(resultNum);
      if (absVal > 0 && (absVal < 0.0001 || absVal > 1e7)) return resultNum.toExponential(precision > 0 ? precision - 1 : 2);
      if (Number.isInteger(resultNum)) return resultNum.toString();
                
      return parseFloat(resultNum.toPrecision(precision)).toString(); 
    };

    const handleSwap = () => {
      if (category === 'Custom (พิมพ์หน่วยเอง)') {
          const temp = customFrom; setCustomFrom(customTo); setCustomTo(temp);
      } else {
          const temp = fromUnit; setFromUnit(toUnit); setToUnit(temp);
      }
      const res = calculateResult();
      if(res && res !== 'Invalid Input' && res !== 'Unit Error') setInputValue(useSciNotation ? parseFloat(res).toExponential(precision-1) : parseFloat(res).toString());
    };

    const handleCopy = () => {
        const res = calculateResult();
        if (res && res !== 'Invalid Input' && res !== 'Unit Error') {
            navigator.clipboard.writeText(res); setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    const tempUnits = ['C', 'F', 'K'];

    return (
      <div className="flex flex-col gap-5 py-4 w-full max-w-lg mx-auto bg-[#0a101f] p-4 sm:p-6 rounded-2xl border border-[#1E3A5F] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

        <div className="flex justify-between items-center z-10 flex-wrap gap-2">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">ประเภทหน่วยวัด</label>
          <div className="flex items-center gap-2">
              <select value={precision} onChange={e => setPrecision(parseInt(e.target.value))} className="bg-[#050811] text-sky-300 text-[10px] px-2 py-1.5 rounded-lg border border-[#1E3A5F] outline-none cursor-pointer font-bold">
                  <option value="4">4 ตำแหน่ง</option>
                  <option value="6">6 ตำแหน่ง</option>
                  <option value="8">8 ตำแหน่ง</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-[10px] bg-[#050811] px-2.5 py-1.5 rounded-lg border border-[#1E3A5F]">
                  <input type="checkbox" checked={useSciNotation} onChange={e => setUseSciNotation(e.target.checked)} className="rounded bg-slate-800 accent-sky-500" />
                  <span className="text-sky-300 font-bold">1.2e-5</span>
              </label>
          </div>
        </div>
                  
        <select value={category} onChange={e => setCategory(e.target.value)} className="inp py-2.5 text-sm text-sky-300 font-bold z-10 bg-[#0B1325] shadow-inner cursor-pointer">
          {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex flex-col gap-4 z-10 mt-2">
          {/* FROM SECTION */}
          <div className="flex flex-col bg-[#050811] rounded-xl border border-[#1E3A5F] p-3 focus-within:border-sky-500 transition-colors">
            <span className="text-[10px] text-slate-500 font-bold mb-1">จาก (From)</span>
            <div className="flex items-center gap-2">
                <input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full bg-transparent text-2xl font-mono text-white outline-none" placeholder="0" />
                <div className="w-[1px] h-8 bg-[#1E3A5F] mx-1 shrink-0"></div>
                {category === 'Custom (พิมพ์หน่วยเอง)' ? (
                    <input type="text" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-32 bg-[#0B1325] border border-[#1E3A5F] rounded p-1 text-xs text-sky-200 font-mono text-center outline-none focus:border-sky-500 shrink-0" placeholder="kg*m/s^2" />
                ) : (
                    <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="bg-transparent text-sm font-bold text-sky-200 outline-none cursor-pointer w-28 sm:w-32 text-right shrink-0 truncate">
                      {(category === 'Temperature (อุณหภูมิ)' ? tempUnits : Object.keys(CATEGORIES[category])).map(u => <option key={u} value={u} className="bg-[#0B1325]">{u}</option>)}
                    </select>
                )}
            </div>
          </div>

          {/* SWAP BUTTON */}
          <div className="flex justify-center -my-6 z-20 relative">
             <button onClick={handleSwap} className="w-10 h-10 rounded-full bg-[#1E3A5F] border-4 border-[#0a101f] text-white flex items-center justify-center hover:bg-sky-500 hover:scale-110 transition-all shadow-lg group">
                <span className="group-hover:rotate-180 transition-transform duration-300 font-bold">⇅</span>
             </button>
          </div>

          {/* TO SECTION */}
          <div className="flex flex-col bg-[#11241a] rounded-xl border border-emerald-900/50 p-3 relative">
            <span className="text-[10px] text-emerald-600 font-bold mb-1">ผลลัพธ์ (To)</span>
            <div className="flex items-center gap-2">
                <div className="w-full bg-transparent text-xl sm:text-2xl font-mono text-emerald-400 min-h-[32px] overflow-hidden text-ellipsis whitespace-nowrap pt-1">
                   {calculateResult() || '0'}
                </div>
                <div className="w-[1px] h-8 bg-emerald-900 mx-1 shrink-0"></div>
                {category === 'Custom (พิมพ์หน่วยเอง)' ? (
                    <input type="text" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-32 bg-[#0B1325] border border-emerald-900/50 rounded p-1 text-xs text-emerald-200 font-mono text-center outline-none focus:border-emerald-500 shrink-0" placeholder="g*cm/s^2" />
                ) : (
                    <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="bg-transparent text-sm font-bold text-emerald-200 outline-none cursor-pointer w-28 sm:w-32 text-right shrink-0 truncate">
                      {(category === 'Temperature (อุณหภูมิ)' ? tempUnits : Object.keys(CATEGORIES[category])).map(u => <option key={u} value={u} className="bg-[#0B1325]">{u}</option>)}
                    </select>
                )}
            </div>
                      
            <button onClick={handleCopy} className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded border transition-colors ${copied ? 'bg-emerald-500 text-white border-emerald-400 font-bold' : 'bg-[#0B1325] text-slate-400 border-[#1E3A5F] hover:text-white'}`}>
                {copied ? '✓ คัดลอกแล้ว' : '📋 Copy'}
            </button>
          </div>
        </div>
                  
        {/* Formula Hint */}
        {category === 'Temperature (อุณหภูมิ)' && (
            <div className="text-[10px] text-slate-500 text-center font-mono bg-[#050811] py-1.5 rounded-lg border border-[#1E3A5F]/50 shadow-inner">
               สูตร: K = °C + 273.15 | °F = (°C × 9/5) + 32
            </div>
        )}
        {category === 'Custom (พิมพ์หน่วยเอง)' && (
            <div className="text-[10px] text-slate-400 text-center bg-amber-950/30 py-2 px-3 rounded-lg border border-amber-900/50 shadow-inner leading-relaxed">
               💡 พิมพ์หน่วยฐานที่ต้องการผสมลงในกล่อง<br/>(รองรับ: kg, g, lb, m, cm, mm, km, in, ft, s, min, h, L, mL) <br/>ตัวอย่าง: <span className="text-amber-300 font-mono">kg*m/s^2</span>
            </div>
        )}
      </div>
    );
};

const MatrixSolver = () => {
    const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState('');
    const [d, setD] = useState(''); const [e, setE] = useState(''); const [f, setF] = useState('');

    const solve = () => {
      const a1=parseFloat(a), b1=parseFloat(b), c1=parseFloat(c), a2=parseFloat(d), b2=parseFloat(e), c2=parseFloat(f);
      if([a1,b1,c1,a2,b2,c2].some(isNaN)) return "กรุณากรอกตัวเลขให้ครบ";
      const det = a1*b2 - a2*b1; if (det === 0) return "หาค่าไม่ได้ (Det = 0)";
      return `x = ${((c1*b2 - c2*b1) / det).toFixed(4)}\ny = ${((a1*c2 - a2*c1) / det).toFixed(4)}`;
    };

    return (
      <div className="flex flex-col gap-4 py-4 w-full max-w-sm mx-auto items-center">
        <div className="bg-[#050811] p-4 rounded-xl border border-[#1E3A5F] w-full">
            <h3 className="text-amber-400 font-bold mb-2 text-center text-sm">ระบบสมการ 2 ตัวแปร</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
                <input type="number" value={a} onChange={e=>setA(e.target.value)} className="inp w-16 text-center text-sm p-1" placeholder="a" /> <span>x +</span>
                <input type="number" value={b} onChange={e=>setB(e.target.value)} className="inp w-16 text-center text-sm p-1" placeholder="b" /> <span>y =</span>
                <input type="number" value={c} onChange={e=>setC(e.target.value)} className="inp w-20 text-center text-sm p-1" placeholder="c" />
            </div>
            <div className="flex items-center justify-center gap-2">
                <input type="number" value={d} onChange={e=>setD(e.target.value)} className="inp w-16 text-center text-sm p-1" placeholder="d" /> <span>x +</span>
                <input type="number" value={e} onChange={e=>setE(e.target.value)} className="inp w-16 text-center text-sm p-1" placeholder="e" /> <span>y =</span>
                <input type="number" value={f} onChange={e=>setF(e.target.value)} className="inp w-20 text-center text-sm p-1" placeholder="f" />
            </div>
        </div>
        <div className="flex gap-2 w-full">
            <button onClick={() => { setA(''); setB(''); setC(''); setD(''); setE(''); setF(''); }} className="btn-d text-xs w-1/3">ล้างข้อมูล</button>
            <div className="flex-1 bg-[#166534] border border-[#22c55e] text-[#22c55e] p-2 rounded-xl text-sm font-mono whitespace-pre flex items-center justify-center shadow-inner">{solve()}</div>
        </div>
      </div>
    );
};

const ResistorCalcReal = () => {
    const colors = [
      { n: 'Black', v: 0, m: 1, c: '#000', t: '#fff' }, { n: 'Brown', v: 1, m: 10, c: '#8B4513', t: '#fff' },
      { n: 'Red', v: 2, m: 100, c: '#FF0000', t: '#fff' }, { n: 'Orange', v: 3, m: 1000, c: '#FFA500', t: '#000' },
      { n: 'Yellow', v: 4, m: 10000, c: '#FFFF00', t: '#000' }, { n: 'Green', v: 5, m: 100000, c: '#008000', t: '#fff' },
      { n: 'Blue', v: 6, m: 1000000, c: '#0000FF', t: '#fff' }, { n: 'Violet', v: 7, m: 10000000, c: '#EE82EE', t: '#000' },
      { n: 'Gray', v: 8, m: 100000000, c: '#808080', t: '#fff' }, { n: 'White', v: 9, m: 1000000000, c: '#FFFFFF', t: '#000' }
    ];
    const tolColors = [{ n: 'Gold', tol: '5%', c: '#FFD700', t: '#000' }, { n: 'Silver', tol: '10%', c: '#C0C0C0', t: '#000' }];
    const [b1, setB1] = useState(colors[1]); const [b2, setB2] = useState(colors[0]); const [mult, setMult] = useState(colors[2]); const [tol, setTol] = useState(tolColors[0]);

    const formatVal = (v) => {
      if(v >= 1000000) return (v/1000000) + ' MΩ';
      if(v >= 1000) return (v/1000) + ' kΩ';
      return v + ' Ω';
    };
    const val = ((b1.v * 10) + b2.v) * mult.m;

    return (
      <div className="flex flex-col items-center gap-6 py-4 w-full max-w-xl mx-auto">
        <div className="text-3xl font-bold text-amber-400 bg-[#0F2547] p-6 rounded-xl border border-[#1E3A5F] w-full text-center font-mono shadow-inner">{formatVal(val)} ± {tol.tol}</div>
        <div className="relative w-64 h-16 sm:w-80 sm:h-20 flex items-center justify-center my-2">
            <div className="absolute w-full h-2 bg-slate-400 z-0"></div>
            <div className="relative w-40 sm:w-48 h-full bg-[#f4a460] rounded-[30px] border border-amber-800 z-10 flex items-center justify-between px-4 shadow-inner">
                <div className="w-3 h-full" style={{ backgroundColor: b1.c }}></div><div className="w-3 h-full" style={{ backgroundColor: b2.c }}></div>
                <div className="w-3 h-full" style={{ backgroundColor: mult.c }}></div><div className="w-1.5 h-full bg-transparent border-l border-amber-800/30 mx-1"></div>
                <div className="w-3 h-full" style={{ backgroundColor: tol.c }}></div>
            </div>
        </div>
        <div className="flex gap-2 sm:gap-4 w-full overflow-x-auto pb-2">
          <div className="flex flex-col gap-1 flex-1 min-w-[70px]">
            <span className="text-[10px] text-center text-slate-400 font-bold">หลักที่ 1</span>
            {colors.map(c => <button key={'b1'+c.n} onClick={()=>setB1(c)} style={{background: c.c, color: c.t}} className={`py-1 text-[10px] font-bold border rounded-md shadow-sm ${b1.n===c.n?'border-white scale-110 z-10 ring-2 ring-sky-400':'border-transparent'}`}>{c.n}</button>)}
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[70px]">
            <span className="text-[10px] text-center text-slate-400 font-bold">หลักที่ 2</span>
            {colors.map(c => <button key={'b2'+c.n} onClick={()=>setB2(c)} style={{background: c.c, color: c.t}} className={`py-1 text-[10px] font-bold border rounded-md shadow-sm ${b2.n===c.n?'border-white scale-110 z-10 ring-2 ring-sky-400':'border-transparent'}`}>{c.n}</button>)}
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[70px]">
            <span className="text-[10px] text-center text-slate-400 font-bold">ตัวคูณ</span>
            {colors.map(c => <button key={'m'+c.n} onClick={()=>setMult(c)} style={{background: c.c, color: c.t}} className={`py-1 text-[10px] font-bold border rounded-md shadow-sm ${mult.n===c.n?'border-white scale-110 z-10 ring-2 ring-sky-400':'border-transparent'}`}>{c.n}</button>)}
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[70px]">
            <span className="text-[10px] text-center text-slate-400 font-bold">คลาดเคลื่อน</span>
            {tolColors.map(c => <button key={'t'+c.n} onClick={()=>setTol(c)} style={{background: c.c, color: c.t}} className={`py-1 text-[10px] font-bold border rounded-md shadow-sm ${tol.n===c.n?'border-white scale-110 z-10 ring-2 ring-sky-400':'border-transparent'}`}>{c.n}</button>)}
          </div>
        </div>
      </div>
    );
};

const LunarSplitter = () => {
    const [subtotal, setSubtotal] = useState(''); const [vat, setVat] = useState(7); const [sc, setSc] = useState(10); const [people, setPeople] = useState(1);
    const st = parseFloat(subtotal) || 0; const serv = st * (sc/100); const v = (st + serv) * (vat/100); const total = st + serv + v; const perPerson = total / Math.max(1, people);
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div><label className="text-xs text-slate-400">ค่าอาหารรวม (ก่อน VAT/Service)</label><input type="number" value={subtotal} onChange={e=>setSubtotal(e.target.value)} className="inp text-xl" placeholder="0.00" /></div>
        <div className="flex gap-4">
          <div className="flex-1"><label className="text-xs text-slate-400">Service Charge (%)</label><input type="number" value={sc} onChange={e=>setSc(e.target.value)} className="inp" /></div>
          <div className="flex-1"><label className="text-xs text-slate-400">VAT (%)</label><input type="number" value={vat} onChange={e=>setVat(e.target.value)} className="inp" /></div>
        </div>
        <div><label className="text-xs text-slate-400">จำนวนคนหาร</label><input type="number" value={people} onChange={e=>setPeople(e.target.value)} className="inp" min="1" /></div>
        <div className="bg-[#0F2547] p-4 rounded-xl border border-[#1E3A5F] space-y-2 mt-4">
          <div className="flex justify-between text-sm"><span>ยอดรวมทั้งหมด:</span> <span className="font-bold">{total.toFixed(2)} บาท</span></div>
          <div className="flex justify-between text-lg text-emerald-400"><span>หารคนละ:</span> <span className="font-bold">{perPerson.toFixed(2)} บาท</span></div>
        </div>
      </div>
    );
};

const Randomizer = () => {
    const [names, setNames] = useState("สมาชิก A\nสมาชิก B\nสมาชิก C\nสมาชิก D"); const [result, setResult] = useState(null); const [spinning, setSpinning] = useState(false);
    const handleSpin = () => {
      const list = names.split('\n').map(n=>n.trim()).filter(Boolean); if(list.length === 0) return;
      setSpinning(true); setResult(null); let count = 0;
      const interval = setInterval(() => { setResult(list[Math.floor(Math.random() * list.length)]); count++; if(count > 15) { clearInterval(interval); setSpinning(false); setResult(list[Math.floor(Math.random() * list.length)]); } }, 100);
    };
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div><label className="text-xs text-slate-400">ใส่รายชื่อ (1 ชื่อต่อ 1 บรรทัด)</label><textarea rows="5" value={names} onChange={e=>setNames(e.target.value)} className="inp resize-none"></textarea></div>
        <button onClick={handleSpin} disabled={spinning} className="w-full btn-b py-3 text-lg bg-sky-600 hover:bg-sky-500 border-sky-400">🎲 สุ่มผู้โชคดี</button>
        {result && (
           <div className={`mt-6 p-6 text-center rounded-xl border border-amber-500 ${spinning ? 'bg-[#0F2547]' : 'bg-amber-500/20 animate-bounce'}`}>
             <div className="text-xs text-slate-300 mb-2">ผู้ที่ถูกเลือกคือ:</div><div className="text-3xl font-bold text-amber-400">{result}</div>
           </div>
        )}
      </div>
    );
};

// ==========================================
// 📅 ASSOCIATION CALENDAR COMPONENT 📅
// ==========================================
const AssociationCalendar = ({ isOpen, onClose, events, currentUser, db, users }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const ASTRONOMICAL_EVENTS = {
        '2026-03-03': { type: 'Eclipse', label: '🔴 จันทรุปราคาเต็มดวง (Blood Moon)' },
        '2026-05-31': { type: 'Blue Moon', label: '🔵 Blue Moon (จันทร์เต็มดวงครั้งที่ 2 ของเดือน)' },
        '2026-11-24': { type: 'Full Moon', label: '🌕 วันลอยกระทง (Full Moon)' },
        '2026-12-24': { type: 'Supermoon', label: '🌕 ซูเปอร์มูน (ดวงจันทร์ใกล้โลกที่สุด)' },
        '2027-02-20': { type: 'Eclipse', label: '🔴 จันทรุปราคาเต็มดวง' }
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const getDayEvents = (dateStr) => events.filter(e => e.date === dateStr);
    const getAuthor = (id) => users.find(u => u.id === id) || { displayName: id };

    const EVENT_TYPES = {
        official: { color: 'bg-red-500', icon: '🔴', label: 'Official' },
        gathering: { color: 'bg-emerald-500', icon: '🟢', label: 'Gathering' },
        music: { color: 'bg-sky-500', icon: '🔵', label: 'Music Jam' }
    };

    const exportToICS = (event) => {
        const d = event.date.replace(/-/g, '');
        const t = event.time.replace(/:/g, '') + '00';
        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${event.title}\nDTSTART:${d}T${t}\nDESCRIPTION:สร้างโดย: ${getAuthor(event.createdBy).displayName}\nจำนวนคนที่รับ: ${event.max}\n\nเข้าร่วมผ่าน The Blue Moon Association\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${event.title}.ics`; a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = fd.get('title'), date = fd.get('date'), time = fd.get('time');
        const type = fd.get('type'), max = parseInt(fd.get('max')), isPromo = fd.get('promo') === 'on';
    
        const id = 'evt-' + Date.now();
        await db.collection('bma_events').doc(id).set({
            id, title, date, time, type, max, createdBy: currentUser.id,
            going: [currentUser.id], maybe: [], timestamp: Date.now()
        });

        if (isPromo) {
            const postId = 'post-' + Date.now();
            await db.collection('bma_posts').doc(postId).set({
                id: postId, authorId: currentUser.id, title: `🗓️ เชิญร่วมกิจกรรม: ${title}`,
                content: `ขอเชิญสมาชิกเข้าร่วมกิจกรรม\n\n**วันที่:** ${date}\n**เวลา:** ${time} น.\n**รายละเอียด:** สามารถดูจำนวนคนและกดเข้าร่วมได้ที่ 📅 ปฏิทินสมาคมครับ!`,
                isGuestAllowed: false, attachments: [], tags: ['Event'], mutedBy: [],
                createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now(), serverCreatedAt: firebase.firestore.FieldValue.serverTimestamp(), likes: [], bookmarks: [], comments: []
            });
        }
        setShowCreateForm(false);
    };

    const handleRSVP = async (event, status) => {
        const isGoing = status === 'going';
        let newGoing = event.going || []; let newMaybe = event.maybe || [];
        newGoing = newGoing.filter(id => id !== currentUser.id);
        newMaybe = newMaybe.filter(id => id !== currentUser.id);
        if (isGoing) newGoing.push(currentUser.id);
        else newMaybe.push(currentUser.id);
    
        await db.collection('bma_events').doc(event.id).update({ going: newGoing, maybe: newMaybe });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-white">
            <div className="bg-[#0B1325] border border-[#1E3A5F] w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
            
                <div className="flex justify-between items-center p-4 border-b border-[#1E3A5F] bg-[#070C18]">
                    <h2 className="text-xl font-bold text-sky-400">📅 Association Calendar</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                    <div className="w-full md:w-2/3 flex flex-col p-4 border-r border-[#1E3A5F] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-xl hover:text-sky-400">◀</button>
                            <h3 className="text-lg font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-xl hover:text-sky-400">▶</button>
                        </div>
                    
                        <div className="grid grid-cols-7 gap-1 flex-1">
                            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 mb-2">{d}</div>)}
                            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="p-2 border border-transparent"></div>)}

                            {Array(daysInMonth).fill(null).map((_, i) => {
                                const dateNum = i + 1;
                                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const astro = ASTRONOMICAL_EVENTS[dateStr];
                                const dayEvents = getDayEvents(dateStr);

                                return (
                                    <div key={dateNum} onClick={() => setSelectedDate(dateStr)} className={`min-h-[80px] border rounded-lg p-1.5 cursor-pointer transition-colors relative flex flex-col items-start ${isSelected ? 'border-sky-400 bg-sky-900/20' : 'border-[#1E3A5F] hover:bg-[#0F2547]'}`}>
                                        <span className={`text-sm font-bold ${astro?.type === 'Blue Moon' ? 'text-sky-300 drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]' : astro?.type === 'Eclipse' ? 'text-red-400' : ''}`}>{dateNum}</span>
                                        {astro && <span className="absolute top-1 right-1 text-xs" title={astro.label}>{astro.type === 'Blue Moon' ? '🔵' : astro.type === 'Eclipse' ? '🔴' : '🌕'}</span>}
                                        <div className="mt-auto flex flex-wrap gap-1 w-full justify-start">
                                            {dayEvents.map(e => <div key={e.id} className={`w-2 h-2 rounded-full ${EVENT_TYPES[e.type].color}`} title={e.title}></div>)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-full md:w-1/3 bg-[#070C18] p-4 flex flex-col min-h-0 overflow-y-auto">
                        {!showCreateForm ? (
                            <>
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#1E3A5F]">
                                    <h3 className="font-bold text-amber-300">{selectedDate ? `กิจกรรม: ${selectedDate}` : 'เลือกวันที่'}</h3>
                                    {selectedDate && currentUser && <button onClick={() => setShowCreateForm(true)} className="bg-sky-600 text-white text-[10px] font-bold px-2 py-1 rounded">สร้างกิจกรรม</button>}
                                </div>
                                {selectedDate && ASTRONOMICAL_EVENTS[selectedDate] && (
                                    <div className="bg-[#050811] border border-amber-500/50 p-3 rounded-xl mb-4 text-xs shadow-lg">
                                        <div className="font-bold text-amber-300 mb-1">✨ ปรากฏการณ์ดาราศาสตร์</div>
                                        <div className="text-slate-200">{ASTRONOMICAL_EVENTS[selectedDate].label}</div>
                                    </div>
                                )}
                                {selectedDate ? (
                                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                        {getDayEvents(selectedDate).length === 0 ? <div className="text-slate-500 text-xs text-center py-10">ไม่มีกิจกรรม</div> : (
                                            getDayEvents(selectedDate).map(e => (
                                                <div key={e.id} className="bg-[#0B1325] border border-[#1E3A5F] p-3 rounded-xl hover:border-slate-500 transition-colors">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs">{EVENT_TYPES[e.type].icon}</span>
                                                            <span className="font-bold text-sm text-white">{e.title}</span>
                                                        </div>
                                                        <button onClick={() => exportToICS(e)} className="text-[10px] bg-[#050811] px-1.5 py-1 rounded border border-[#1E3A5F] hover:text-sky-300" title="เพิ่มลงปฏิทิน">🗓️ ICS</button>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mb-2">🕒 {e.time} • 👥 เข้าร่วม {(e.going || []).length}/{e.max}</div>
                                                    <div className="text-[9px] text-slate-500 mb-2 truncate">โฮสต์: {getAuthor(e.createdBy).displayName}</div>
                                                
                                                    {currentUser ? (
                                                        <div className="flex gap-2 mt-3">
                                                            <button onClick={() => handleRSVP(e, 'going')} className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-colors ${(e.going||[]).includes(currentUser.id) ? 'bg-emerald-600 text-white' : 'bg-emerald-950 border border-emerald-900 text-emerald-400'}`}>✓ ไป</button>
                                                            <button onClick={() => handleRSVP(e, 'maybe')} className={`flex-1 text-[10px] py-1.5 rounded-lg transition-colors ${(e.maybe||[]).includes(currentUser.id) ? 'bg-amber-600 text-white' : 'bg-[#050811] border border-[#1E3A5F] text-slate-400'}`}>อาจจะ</button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-slate-500 text-center mt-2">ล็อกอินเพื่อตอบรับเข้าร่วม</div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : <div className="text-slate-500 text-xs text-center py-10">คลิกปฏิทินเพื่อเรียกดู</div>}
                            </>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4 border-b border-[#1E3A5F] pb-2">
                                    <h3 className="font-bold text-sky-300">สร้างกิจกรรมใหม่</h3>
                                    <button onClick={() => setShowCreateForm(false)} className="text-slate-400 text-xs hover:text-white">ยกเลิก</button>
                                </div>
                                <form onSubmit={handleCreateEvent} className="space-y-4 flex-1 overflow-y-auto pr-1">
                                    <input name="title" type="text" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded p-2 text-xs outline-none" placeholder="ชื่อกิจกรรม..." />
                                    <div className="flex gap-2">
                                        <input name="date" type="date" defaultValue={selectedDate} required className="w-full bg-[#050811] border border-[#1E3A5F] rounded p-2 text-xs outline-none" />
                                        <input name="time" type="time" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded p-2 text-xs outline-none" />
                                    </div>
                                    <select name="type" className="w-full bg-[#050811] border border-[#1E3A5F] rounded p-2 text-xs outline-none">
                                        <option value="official">🔴 Official Event</option>
                                        <option value="gathering">🟢 Member Gathering</option>
                                        <option value="music">🔵 Music Jam</option>
                                    </select>
                                    <input name="max" type="number" min="2" defaultValue="10" placeholder="จำนวนคนสูงสุด" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded p-2 text-xs outline-none" />
                                    <label className="flex items-center gap-2 cursor-pointer text-xs mt-2 p-2 bg-sky-950/30 rounded border border-sky-900/50">
                                        <input type="checkbox" name="promo" defaultChecked className="accent-sky-500" />
                                        <span className="text-sky-300 font-bold">สร้างโพสต์โปรโมตลง Board อัตโนมัติ</span>
                                    </label>
                                    <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg text-sm mt-4">สร้างกิจกรรม</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};