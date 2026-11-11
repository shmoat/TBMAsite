// ==========================================
// games.js - มินิเกมประจำวัน (Daily Games)
// ==========================================

// 1. Sudoku Game
function SudokuGame({ dateSeed, onEnd }) {
  const [board, setBoard] = useStickyState(null, `bma_sudoku_v2_${dateSeed}`);
  const [selectedCell, setSelectedCell] = useState(null);
  const [noteMode, setNoteMode] = useState(false);

  useEffect(() => {
    if (board) return; 
    const rng = new PRNG(dateSeed + '_sudoku_v2'); 
    let base = [
      [1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],
      [2,3,4,5,6,7,8,9,1],[5,6,7,8,9,1,2,3,4],[8,9,1,2,3,4,5,6,7],
      [3,4,5,6,7,8,9,1,2],[6,7,8,9,1,2,3,4,5],[9,1,2,3,4,5,6,7,8]
    ].map(r => [...r]);

    for(let block=0; block<3; block++) {
      for(let i=0; i<3; i++) {
        const r1 = block*3+i, r2 = block*3+rng.nextInt(0,2);
        const temp = [...base[r1]]; base[r1] = [...base[r2]]; base[r2] = temp;
      }
    }
    const mapVals = rng.shuffle([1,2,3,4,5,6,7,8,9]);
    const fullGrid = base.map(row => row.map(val => mapVals[val-1]));
    const puzzle = fullGrid.map(r => [...r]);

    const isValid = (b, r, c, val) => {
        for(let i=0; i<9; i++) {
            if(b[r][i] === val) return false;
            if(b[i][c] === val) return false;
            if(b[Math.floor(r/3)*3 + Math.floor(i/3)][Math.floor(c/3)*3 + i%3] === val) return false;
        }
        return true;
    };

    const hasUniqueSolution = (b) => {
        let count = 0;
        let tempB = b.map(r => [...r]);
        const solve = () => {
            for(let r=0; r<9; r++) {
                for(let c=0; c<9; c++) {
                    if(tempB[r][c] === '') {
                        for(let num=1; num<=9; num++) {
                            if(isValid(tempB, r, c, num)) {
                                tempB[r][c] = num;
                                solve();
                                tempB[r][c] = '';
                                if(count > 1) return;
                            }
                        }
                        return;
                    }
                }
            }
            count++;
        };
        solve();
        return count === 1;
    };

    let positions = [];
    for(let i=0; i<81; i++) positions.push(i);
    positions = rng.shuffle(positions);

    let removed = 0;
    const targetRemove = rng.nextInt(45, 55); 

    for(let pos of positions) {
        if(removed >= targetRemove) break;
        const r = Math.floor(pos / 9);
        const c = pos % 9;
        const temp = puzzle[r][c];
        
        puzzle[r][c] = '';
        if(!hasUniqueSolution(puzzle)) {
            puzzle[r][c] = temp; 
        } else {
            removed++; 
        }
    }

    setBoard(puzzle.map(r => r.map(val => ({ val, fixed: val !== '', notes: [] }))));
  }, [dateSeed, board, setBoard]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if(!selectedCell || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const k = e.key;
      if(/^[1-9]$/.test(k)) handleNumpad(parseInt(k));
      else if(k === 'Backspace' || k === 'Delete') handleNumpad('DEL');
      else if(k === 'ArrowUp') setSelectedCell(p => p ? [Math.max(0, p[0]-1), p[1]] : [8,0]);
      else if(k === 'ArrowDown') setSelectedCell(p => p ? [Math.min(8, p[0]+1), p[1]] : [0,0]);
      else if(k === 'ArrowLeft') setSelectedCell(p => p ? [p[0], Math.max(0, p[1]-1)] : [0,8]);
      else if(k === 'ArrowRight') setSelectedCell(p => p ? [p[0], Math.min(8, p[1]+1)] : [0,0]);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board, noteMode]);

  const checkWin = (b) => {
    for(let r=0; r<9; r++) {
      const rSet = new Set(), cSet = new Set(), bSet = new Set();
      for(let i=0; i<9; i++) {
        if(!b[r][i].val) return false; rSet.add(b[r][i].val);
        if(!b[i][r].val) return false; cSet.add(b[i][r].val);
        const br = Math.floor(r/3)*3 + Math.floor(i/3);
        const bc = (r%3)*3 + (i%3);
        if(!b[br][bc].val) return false; bSet.add(b[br][bc].val);
      }
      if(rSet.size !== 9 || cSet.size !== 9 || bSet.size !== 9) return false;
    }
    onEnd('won');
  };

  const cleanNotes = (b, r, c, num) => {
    for(let i=0; i<9; i++) {
      b[r][i].notes = b[r][i].notes.filter(n => n !== num);
      b[i][c].notes = b[i][c].notes.filter(n => n !== num);
    }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for(let i=0; i<3; i++) for(let j=0; j<3; j++) b[br+i][bc+j].notes = b[br+i][bc+j].notes.filter(n => n !== num);
  };

  const handleNumpad = (num) => {
    if(!selectedCell) return;
    const [r, c] = selectedCell;
    if(board[r][c].fixed) return;

    const newB = board.map(row => row.map(cell => ({...cell, notes: [...cell.notes]})));
    
    if(num === 'DEL') {
      newB[r][c].val = ''; newB[r][c].notes = [];
    } else if(noteMode) {
      const nSet = new Set(newB[r][c].notes);
      if(nSet.has(num)) nSet.delete(num); else nSet.add(num);
      newB[r][c].notes = Array.from(nSet).sort();
      newB[r][c].val = '';
    } else {
      newB[r][c].val = num; newB[r][c].notes = [];
      cleanNotes(newB, r, c, num);
    }
    setBoard(newB);
    if(num !== 'DEL' && !noteMode) checkWin(newB);
  };

  if(!board) return <div className="py-10 animate-pulse text-sky-400 font-mono">Loading...</div>;
  const selVal = selectedCell ? board[selectedCell[0]][selectedCell[1]].val : null;

  return (
    <div className="flex flex-col items-center space-y-3 w-full h-full justify-center px-1">
      <div className="bg-[#1E3A5F] p-[2px] rounded border-2 border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.3)] w-full max-w-[min(100%,310px)] sm:max-w-[360px] aspect-square grid grid-rows-9 shrink-0">
        {board.map((row, r) => (
          <div key={r} className="grid grid-cols-9 w-full h-full">
            {row.map((cell, c) => {
              const isSel = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
              const isHi = !isSel && selVal && cell.val === selVal;
              const brR = c%3===2 && c!==8 ? '2px solid #3B82F6' : '1px solid #1E3A5F';
              const brB = r%3===2 && r!==8 ? '2px solid #3B82F6' : '1px solid #1E3A5F';
              let bg = cell.fixed ? '#0B1325' : '#050811';
              let txt = cell.fixed ? '#60A5FA' : '#ffffff';
              if(isSel) bg = 'rgba(59,130,246,0.6)'; else if(isHi) bg = 'rgba(59,130,246,0.2)';
              
              return (
                <div key={c} onClick={() => setSelectedCell([r, c])} style={{ backgroundColor:bg, color:txt, borderRight:brR, borderBottom:brB }} className="w-full h-full flex items-center justify-center text-base sm:text-lg font-bold cursor-pointer overflow-hidden select-none">
                  {cell.val ? cell.val : <div className="notes-grid">{[1,2,3,4,5,6,7,8,9].map(n => <div key={n} className="note-item">{cell.notes.includes(n)?n:''}</div>)}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="w-full max-w-[340px] space-y-2 mt-2">
        <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1">
          <button onClick={() => setNoteMode(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${!noteMode ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>✒️ กรอกเลข</button>
          <button onClick={() => setNoteMode(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${noteMode ? 'bg-amber-500 text-[#050811]' : 'text-slate-400'}`}>📝 ทดเลข</button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => handleNumpad(n)} className="bg-[#0F2547] active:bg-white active:text-[#050811] border border-[#1E3A5F] rounded-lg h-10 sm:h-12 text-lg font-bold">{n}</button>)}
          <button onClick={() => handleNumpad('DEL')} className="bg-red-950/60 active:bg-red-500 text-red-300 border border-red-900/50 rounded-lg h-10 sm:h-12 text-xs font-bold">DEL</button>
          <button onClick={() => { if(confirm('ต้องการล้างกระดานทั้งหมดใช่หรือไม่?')) setBoard(board.map(r => r.map(c => c.fixed ? c : { ...c, val: '', notes: [] }))); }} className="col-span-5 mt-1 bg-red-900/30 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-lg h-10 text-xs font-bold transition-colors">🗑️ เคลียร์กระดาน (Clear All)</button>
        </div>
      </div>
    </div>
  );
}

// 2. Minesweeper Game
function MinesweeperGame({ dateSeed, onEnd, onFirstMove }) {
  const COLS = 9, ROWS = 9;
  const [numMines, setNumMines] = useStickyState(10, `bma_ms_mines_${dateSeed}`);
  const [grid, setGrid] = useStickyState(null, `bma_ms_grid_${dateSeed}`);
  const [revealed, setRevealed] = useStickyState(null, `bma_ms_rev_${dateSeed}`);
  const [flagged, setFlagged] = useStickyState(null, `bma_ms_flag_${dateSeed}`);
  const [mode, setMode] = useState('dig'); 

  useEffect(() => {
    if (grid) return;
    
    const rng = new PRNG(dateSeed + '_msBoard_v2');
    const m = rng.nextInt(10, 16);
    setNumMines(m);
    
    let g = Array(ROWS).fill().map(()=>Array(COLS).fill(0));
    let placed = 0;
    while(placed < m) {
        let rr = rng.nextInt(0, ROWS-1), cc = rng.nextInt(0, COLS-1);
        if(g[rr][cc] !== 'M') { g[rr][cc] = 'M'; placed++; }
    }
    
    for(let i=0; i<ROWS; i++) {
        for(let j=0; j<COLS; j++) {
          if(g[i][j] === 'M') continue;
          let cnt = 0;
          for(let di=-1; di<=1; di++) for(let dj=-1; dj<=1; dj++) {
            if(i+di>=0 && i+di<ROWS && j+dj>=0 && j+dj<COLS && g[i+di][j+dj] === 'M') cnt++;
          }
          g[i][j] = cnt;
        }
    }
    
    let startR = -1, startC = -1;
    for(let i=0; i<ROWS; i++) {
        for(let j=0; j<COLS; j++) {
            if(g[i][j] === 0) { startR = i; startC = j; break; }
        }
        if(startR !== -1) break;
    }
    if(startR === -1) {
        for(let i=0; i<ROWS; i++) {
            for(let j=0; j<COLS; j++) {
                if(g[i][j] !== 'M') { startR = i; startC = j; break; }
            }
            if(startR !== -1) break;
        }
    }
    
    let newR = Array(ROWS).fill().map(()=>Array(COLS).fill(false));
    const flood = (rr, cc) => {
      if(rr<0 || rr>=ROWS || cc<0 || cc>=COLS || newR[rr][cc]) return;
      newR[rr][cc] = true;
      if(g[rr][cc] === 0) {
        for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) flood(rr+dr, cc+dc);
      }
    };
    
    if (startR !== -1) flood(startR, startC);
    
    setGrid(g);
    setRevealed(newR);
    setFlagged(Array(ROWS).fill().map(()=>Array(COLS).fill(false)));
  }, [dateSeed, grid, setNumMines, setGrid, setRevealed, setFlagged]);

  const handleAction = (r, c, act) => {
    if(onFirstMove) onFirstMove();
    
    if(!revealed || revealed[r][c]) return;
    if(act === 'flag') {
      const newF = [...flagged.map(row=>[...row])];
      newF[r][c] = !newF[r][c];
      setFlagged(newF); return;
    }
    if(flagged[r][c]) return; 

    if(grid[r][c] === 'M') {
      const newR = [...revealed.map(row=>[...row])];
      for(let i=0;i<ROWS;i++) for(let j=0;j<COLS;j++) if(grid[i][j]==='M') newR[i][j] = true;
      setRevealed(newR);
      setTimeout(() => onEnd('bomb'), 800);
      return;
    }

    const newR = [...revealed.map(row=>[...row])];
    const flood = (rr, cc) => {
      if(rr<0 || rr>=ROWS || cc<0 || cc>=COLS || newR[rr][cc]) return;
      newR[rr][cc] = true;
      if(grid[rr][cc] === 0) {
        for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++) flood(rr+dr, cc+dc);
      }
    };
    flood(r, c); setRevealed(newR);
    
    let revCount = 0; newR.forEach(row => row.forEach(v => { if(v) revCount++; }));
    if(revCount === ROWS*COLS - numMines) onEnd('won');
  };

  if(!grid) return <div className="py-10 animate-pulse text-sky-400 font-mono">Loading...</div>;
  
  const colors = ['','text-blue-400','text-green-400','text-red-400','text-purple-400','text-amber-400','text-cyan-400','text-pink-400','text-gray-400'];
  const fCount = flagged ? flagged.flat().filter(Boolean).length : 0;
  const minesLeft = numMines - fCount;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full h-full select-none">
      <div className="font-bold text-amber-300 text-lg bg-[#0F2547] px-4 py-1.5 rounded-full border border-[#1E3A5F]">💣 ระเบิด: {minesLeft}</div>
      <div className="flex gap-2 w-full max-w-[260px]">
        <button onClick={() => setMode('dig')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'dig' ? 'bg-sky-500 text-white' : 'bg-[#0F2547] text-slate-400 border border-[#1E3A5F]'}`}>⛏️ ขุด</button>
        <button onClick={() => setMode('flag')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'flag' ? 'bg-red-500 text-white' : 'bg-[#0F2547] text-slate-400 border border-[#1E3A5F]'}`}>🚩 ปักธง</button>
      </div>
      <div className="bg-slate-700 p-[2px] w-max mx-auto rounded-lg shadow-xl shadow-sky-900/10" onContextMenu={(e)=>e.preventDefault()}>
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((val, c) => {
              const isRev = revealed[r][c], isFlg = flagged[r][c];
              let bg = isRev ? (val==='M' ? '#7F1D1D' : '#050811') : '#0F2547';
              let content = isFlg ? '🚩' : (isRev ? (val==='M' ? '💥' : (val===0?'':val)) : '');
              return (
                <div key={c} onClick={() => handleAction(r, c, mode)} onContextMenu={(e) => { e.preventDefault(); handleAction(r, c, 'flag'); }} className={`w-9 h-9 sm:w-10 sm:h-10 border-[0.5px] border-[#1E3A5F]/40 flex items-center justify-center font-bold text-sm sm:text-base cursor-pointer ${isRev && val !== 'M' ? colors[val] : ''}`} style={{ backgroundColor: bg }}>
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 px-4 text-center">💡 มือถือ: กดปุ่มเลือกโหมดด้านบน | PC: คลิกซ้ายขุด คลิกขวาปักธง</div>
    </div>
  );
}

// 3. Flag Guesser Game
function FlagGuesserGame({ dateSeed, onEnd }) {
  const ALL_FLAGS = [
    {c:'th',n:'Thailand'},{c:'jp',n:'Japan'},{c:'kr',n:'South Korea'},{c:'us',n:'USA'},
    {c:'gb',n:'UK'},{c:'cn',n:'China'},{c:'fr',n:'France'},{c:'de',n:'Germany'},
    {c:'it',n:'Italy'},{c:'br',n:'Brazil'},{c:'ar',n:'Argentina'},{c:'au',n:'Australia'},
    {c:'ca',n:'Canada'},{c:'vn',n:'Vietnam'},{c:'sg',n:'Singapore'},{c:'ru',n:'Russia'},
    {c:'in',n:'India'},{c:'za',n:'South Africa'},{c:'mx',n:'Mexico'},{c:'es',n:'Spain'},
    {c:'fi',n:'Finland'},{c:'se',n:'Sweden'},{c:'no',n:'Norway'},{c:'ch',n:'Switzerland'},
    {c:'nl',n:'Netherlands'},{c:'be',n:'Belgium'},{c:'gr',n:'Greece'},{c:'tr',n:'Turkey'},
    {c:'eg',n:'Egypt'},{c:'nz',n:'New Zealand'},{c:'ph',n:'Philippines'},{c:'id',n:'Indonesia'},
    {c:'my',n:'Malaysia'},{c:'pt',n:'Portugal'},{c:'ie',n:'Ireland'},{c:'dk',n:'Denmark'},
    {c:'pl',n:'Poland'},{c:'il',n:'Israel'},{c:'ua',n:'Ukraine'},{c:'tw',n:'Taiwan'},
    {c:'bd',n:'Bangladesh'},{c:'pk',n:'Pakistan'},{c:'lk',n:'Sri Lanka'},{c:'np',n:'Nepal'},
    {c:'ir',n:'Iran'},{c:'iq',n:'Iraq'},{c:'sy',n:'Syria'},{c:'lb',n:'Lebanon'},
    {c:'qa',n:'Qatar'},{c:'kw',n:'Kuwait'},{c:'om',n:'Oman'},{c:'ye',n:'Yemen'},
    {c:'kz',n:'Kazakhstan'},{c:'dz',n:'Algeria'},{c:'ma',n:'Morocco'},{c:'ng',n:'Nigeria'},
    {c:'ke',n:'Kenya'},{c:'cl',n:'Chile'},{c:'co',n:'Colombia'},{c:'pe',n:'Peru'},
    {c:'ve',n:'Venezuela'},{c:'cu',n:'Cuba'},{c:'jm',n:'Jamaica'},{c:'ro',n:'Romania'},
    {c:'hr',n:'Croatia'},{c:'hu',n:'Hungary'},{c:'cz',n:'Czechia'},{c:'at',n:'Austria'}
  ];
  
  const [rounds, setRounds] = useStickyState([], `bma_fg_rds_${dateSeed}`);
  const [currentRound, setCurrentRound] = useStickyState(0, `bma_fg_curr_${dateSeed}`);
  const [wrongGuess, setWrongGuess] = useStickyState(null, `bma_fg_wrong_${dateSeed}`);

  useEffect(() => {
    if (rounds.length > 0) return;
    const rng = new PRNG(dateSeed + '_flag5');
    const shuffled = rng.shuffle([...ALL_FLAGS]);
    const rds = [];
    for(let i=0; i<3; i++) {
      const target = shuffled[i];
      let others = rng.shuffle(ALL_FLAGS.filter(f => f.c !== target.c));
      let options = rng.shuffle([target, others[0], others[1], others[2]]);
      rds.push({ target, options });
    }
    setRounds(rds);
  }, [dateSeed, rounds, setRounds]);

  if(!rounds.length) return null;
  const rd = rounds[currentRound];

  const handleGuess = (code) => {
    if(wrongGuess) return;
    if(code === rd.target.c) {
      if(currentRound === 2) onEnd('won', { score: 3 }); 
      else setCurrentRound(c => c+1);
    } else {
      setWrongGuess(code);
      setTimeout(() => onEnd('lost', { score: currentRound }), 2500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full h-full">
      <div className="font-bold text-amber-300 text-lg bg-[#0F2547] px-4 py-1.5 rounded-full border border-[#1E3A5F]">ด่านที่ {currentRound + 1} / 3</div>
      <img src={`https://flagcdn.com/w320/${rd.target.c}.png`} alt="flag" className="h-32 sm:h-44 border-4 border-white/10 rounded-lg shadow-2xl object-cover" />
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-4">
        {rd.options.map(opt => {
          let bg = "bg-white text-[#050811]";
          if (wrongGuess) {
            if (opt.c === rd.target.c) bg = "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]";
            else if (opt.c === wrongGuess) bg = "bg-red-500 text-white";
            else bg = "bg-white/10 text-white/50";
          }
          return <button key={opt.c} onClick={() => handleGuess(opt.c)} className={`font-bold rounded-xl text-sm py-3 transition-all shadow-lg ${bg}`}>{opt.n}</button>;
        })}
      </div>
      {wrongGuess && <div className="text-red-400 font-bold animate-pulse">❌ ผิดครับ! เกมจบลงทันที</div>}
    </div>
  );
}

// 4. Solitaire Game
function SolitaireGame({ dateSeed, onEnd }) {
  const [st, setSt] = useStickyState(null, `bma_sol_${dateSeed}`);
  const [history, setHistory] = useStickyState([], `bma_sol_hist_${dateSeed}`);
  const [initialSt, setInitialSt] = useStickyState(null, `bma_sol_init_${dateSeed}`);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    if(st) return;
    const rng = new PRNG(dateSeed + '_solitaire_v3');
    let deck = [];
    const suits = ['♠','♥','♣','♦']; const colors = ['B','R','B','R'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    for(let s=0; s<4; s++) for(let r=0; r<13; r++) deck.push({ s: suits[s], r: r+1, rs: ranks[r], c: colors[s], id: `${s}-${r}`, up: false });
    deck = rng.shuffle(deck);
    
    let tab = [[],[],[],[],[],[],[]];
    for(let i=0; i<7; i++) {
      for(let j=i; j<7; j++) {
        let card = deck.pop(); if(i===j) card.up = true;
        tab[j].push(card);
      }
    }
    const newSt = { stock: deck, waste: [], fnd: [[],[],[],[]], tab };
    setSt(newSt);
    setInitialSt(JSON.parse(JSON.stringify(newSt)));
    setHistory([]);
  }, [dateSeed, st, setSt, setInitialSt, setHistory]);

  const saveHistory = (currentSt) => {
    const snap = JSON.parse(JSON.stringify(currentSt));
    setHistory(prev => [...prev, snap]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
        const prev = history[history.length - 1];
        setSt(prev);
        setHistory(history.slice(0, -1));
    }
  };

  const handleReset = () => {
    if (initialSt) {
        setSt(JSON.parse(JSON.stringify(initialSt)));
        setHistory([]);
    }
  };

  const checkWin = (ns) => { if(ns.fnd.every(f => f.length === 13)) onEnd('won'); };

  const handleStock = () => {
    saveHistory(st);
    let ns = {...st, stock: [...st.stock], waste: [...st.waste]};
    if(ns.stock.length) { let c = ns.stock.pop(); c.up = true; ns.waste.push(c); } 
    else { ns.stock = ns.waste.reverse().map(c => ({...c, up: false})); ns.waste = []; }
    setSt(ns);
  };

  const tryMove = (ns, stack, srcArea, srcCol, tgtArea, tgtCol) => {
    let c = stack[0];
    if (tgtArea === 'fnd' && stack.length === 1) {
        let f = ns.fnd[tgtCol];
        if ((f.length === 0 && c.r === 1 && tgtCol === ['♠','♥','♣','♦'].indexOf(c.s)) || 
            (f.length > 0 && f[f.length-1].s === c.s && f[f.length-1].r === c.r - 1)) {
            f.push(c); return true;
        }
    } else if (tgtArea === 'tab') {
        let t = ns.tab[tgtCol];
        if (t.length === 0) { if (c.r === 13) { t.push(...stack); return true; } } 
        else {
            let top = t[t.length-1];
            if (top.c !== c.c && top.r === c.r + 1) { t.push(...stack); return true; }
        }
    }
    return false;
  };

  const handleAutoMove = (area, colIdx, cardIdx) => {
    let ns = { stock: [...st.stock], waste: [...st.waste], fnd: st.fnd.map(f=>[...f]), tab: st.tab.map(t=>[...t]) };
    let stack = [];
    if(area === 'waste') { if(!ns.waste.length) return; stack = [ns.waste.pop()]; }
    else if(area === 'fnd') { if(!ns.fnd[colIdx].length) return; stack = [ns.fnd[colIdx].pop()]; }
    else if(area === 'tab') { if(cardIdx < 0 || !ns.tab[colIdx][cardIdx].up) return; stack = ns.tab[colIdx].splice(cardIdx); } 
    else return;

    let moved = false;
    if(area !== 'fnd' && stack.length === 1) {
      let fIdx = ['♠','♥','♣','♦'].indexOf(stack[0].s);
      moved = tryMove(ns, stack, area, colIdx, 'fnd', fIdx);
    }
    if(!moved) {
      for(let i=0; i<7; i++) {
        if(area === 'tab' && i === colIdx) continue;
        moved = tryMove(ns, stack, area, colIdx, 'tab', i);
        if(moved) break;
      }
    }
    
    if(moved) {
      saveHistory(st);
      if(area === 'tab' && ns.tab[colIdx].length) ns.tab[colIdx][ns.tab[colIdx].length-1].up = true;
      setSt(ns); checkWin(ns);
    } else {
      setSt({...st}); 
    }
  };

  useEffect(() => {
    const handleMove = e => { 
        if(drag) {
            let clientX = e.clientX; let clientY = e.clientY;
            if(e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
            setDrag(p => ({...p, dx: clientX - p.startX, dy: clientY - p.startY})); 
        }
    };
    const handleUp = e => {
       if(drag) {
          let clientX = e.clientX; let clientY = e.clientY;
          if(e.changedTouches) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
          
          let dropTarget = null;
          try { dropTarget = document.elementFromPoint(clientX, clientY)?.closest('[data-drop]'); } catch(e){}
          const isTap = Math.abs(clientX - drag.startX) < 10 && Math.abs(clientY - drag.startY) < 10;
          
          if (isTap) {
             handleAutoMove(drag.area, drag.colIdx, drag.cardIdx);
          } else if (dropTarget) {
             const tArea = dropTarget.getAttribute('data-drop');
             const tIdx = parseInt(dropTarget.getAttribute('data-idx') || '0', 10);
             
             let ns = { stock: [...st.stock], waste: [...st.waste], fnd: st.fnd.map(f=>[...f]), tab: st.tab.map(t=>[...t]) };
             let stack = [];
             if (drag.area === 'waste') stack = [ns.waste.pop()];
             else if (drag.area === 'fnd') stack = [ns.fnd[drag.colIdx].pop()];
             else stack = ns.tab[drag.colIdx].splice(drag.cardIdx);
             
             if(tryMove(ns, stack, drag.area, drag.colIdx, tArea, tIdx)) {
                saveHistory(st);
                if(drag.area === 'tab' && ns.tab[drag.colIdx].length) ns.tab[drag.colIdx][ns.tab[drag.colIdx].length-1].up = true;
                setSt(ns); checkWin(ns);
             } else { setSt({...st}); } 
          }
          setDrag(null);
       }
    };
    if(drag) { 
      window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp); 
      window.addEventListener('touchmove', handleMove, {passive:false}); window.addEventListener('touchend', handleUp); 
    }
    return () => { 
      window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); 
      window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleUp); 
    }
  }, [drag, st, setSt]);

  if(!st) return <div className="py-10 animate-pulse text-sky-400 font-mono">Shuffling...</div>;

  const renderCard = (c, area, col, idx) => {
    if(!c) return <div className="w-10 h-14 sm:w-12 sm:h-16 border border-[#1E3A5F] rounded bg-[#050811] opacity-50 shrink-0" />;
    if(!c.up) return <div className="w-10 h-14 sm:w-12 sm:h-16 card-ui face-down shrink-0" />;
    
    let isDragging = drag && drag.area === area && drag.colIdx === col && idx >= drag.cardIdx;
    
    return (
      <div 
        onPointerDown={(e) => {
          if (e.button && e.button !== 0) return;
          e.stopPropagation(); e.preventDefault();
          let stack = area === 'waste' ? [c] : (area === 'fnd' ? [c] : st.tab[col].slice(idx));
          const rect = e.currentTarget.getBoundingClientRect();
          setDrag({ area, colIdx: col, cardIdx: idx, cards: stack, startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, dx: 0, dy: 0 });
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          let stack = area === 'waste' ? [c] : (area === 'fnd' ? [c] : st.tab[col].slice(idx));
          const rect = e.currentTarget.getBoundingClientRect();
          setDrag({ area, colIdx: col, cardIdx: idx, cards: stack, startX: e.touches[0].clientX, startY: e.touches[0].clientY, baseX: rect.left, baseY: rect.top, dx: 0, dy: 0 });
        }}
        className={`w-10 h-14 sm:w-12 sm:h-16 card-ui shrink-0 ${c.c === 'R' ? 'text-red' : 'text-black'} ${isDragging ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="text-[10px] sm:text-xs font-bold leading-none">{c.rs}</div>
        <div className="text-sm sm:text-base text-center leading-none flex-1 flex items-center justify-center">{c.s}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full p-2 bg-[#0B1325]/50 rounded-xl max-w-sm mx-auto justify-center relative touch-none">
      {drag && (
        <div className="fixed inset-0 z-50 pointer-events-none">
           <div style={{ position: 'fixed', left: drag.baseX + drag.dx, top: drag.baseY + drag.dy }}>
              {drag.cards.map((c, i) => (
                <div key={c.id} style={{ marginTop: i > 0 ? '-2.5rem' : '0', zIndex: 100+i }} className="relative">
                  {renderCard(c, null, null, null)}
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <button onClick={handleUndo} disabled={history.length === 0} className="px-3 py-1 bg-[#0F2547] text-white rounded text-[10px] border border-[#1E3A5F] disabled:opacity-50 font-bold shadow-md hover:bg-sky-900 transition-colors">↩️ Undo</button>
          <button onClick={handleReset} disabled={!initialSt} className="px-3 py-1 bg-red-900/50 text-red-200 rounded text-[10px] border border-red-900/50 disabled:opacity-50 font-bold shadow-md hover:bg-red-900 transition-colors">🔄 Reset</button>
        </div>
      </div>
      <div className="flex justify-between mb-6">
        <div className="flex gap-2">
          <div onClick={handleStock} className="cursor-pointer">{st.stock.length > 0 ? <div className="w-10 h-14 sm:w-12 sm:h-16 card-ui face-down shrink-0 flex items-center justify-center text-[10px] text-white/50">{st.stock.length}</div> : <div className="w-10 h-14 sm:w-12 sm:h-16 border border-[#1E3A5F] rounded bg-black flex items-center justify-center text-[10px] text-slate-500">↺</div>}</div>
          <div data-drop="waste" data-idx="0">{renderCard(st.waste[st.waste.length-1], 'waste', 0, st.waste.length-1)}</div>
        </div>
        <div className="flex gap-1.5">
          {st.fnd.map((f, i) => <div key={i} data-drop="fnd" data-idx={i}>{renderCard(f[f.length-1], 'fnd', i, f.length-1)}</div>)}
        </div>
      </div>
      
      <div className="flex justify-between flex-1 relative min-h-[220px]">
        {st.tab.map((col, i) => (
          <div key={i} data-drop="tab" data-idx={i} className="flex flex-col w-10 sm:w-12 min-h-[4rem] relative z-0">
            {col.length === 0 ? renderCard(null) : col.map((c, j) => (
              <div key={c.id} style={{ marginTop: j > 0 ? '-2.5rem' : '0' }} className="relative">
                {renderCard(c, 'tab', i, j)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 text-center mt-6">💡 ลากไพ่ไปวาง หรือ แตะที่ไพ่เพื่อย้ายอัตโนมัติ</div>
    </div>
  );
}
// 5. Wordle Game
function WordleGame({ dateSeed, onEnd }) {
  const WORDS = ["APPLE","BRAIN","CRANE","DREAM","EAGLE","FLAME","GHOST","HEART","IMAGE","JUICE","KNIFE","LEMON","MOUSE","NIGHT","OCEAN","PLANT","QUEEN","RIVER","SNAKE","TRAIN","UNION","VOICE","WATER","YOUTH","ZEBRA","ALIEN","BREAD","CHAIR","DANCE","EARTH","FRUIT","GRAPE","HOUSE","JUMBO","KINGS","LIGHT","MONEY","NURSE","ONION","PAPER","QUIET","RIGHT","SUGAR","TABLE","UNCLE","VIDEO","WATCH","YACHT","STORM","WORLD"];
  
  const [target, setTarget] = useState("");
  const [guesses, setGuesses] = useStickyState([], `bma_wdl_g_${dateSeed}`);
  const [curr, setCurr] = useStickyState("", `bma_wdl_c_${dateSeed}`);
  const [isChecking, setIsChecking] = useState(false);
  const [wordErr, setWordErr] = useState('');
  const [validDict, setValidDict] = useState(new Set(WORDS));

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/charlesreid1/five-letter-words/master/sgb-words.txt')
      .then(res => res.text())
      .then(text => {
        const wordList = text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
        setValidDict(new Set([...WORDS, ...wordList]));
      })
      .catch(e => console.warn("ไม่สามารถโหลดพจนานุกรมสำรองได้ ใช้ฐานข้อมูลหลักแทน"));
  }, []);

  useEffect(() => {
    const rng = new PRNG(dateSeed + '_wordle2');
    setTarget(WORDS[rng.nextInt(0, WORDS.length-1)]);
  }, [dateSeed]);

  const onKey = async (k) => {
    if(isChecking) return;
    if(k === 'ENTER') {
      if(curr.length !== 5) return;
      setIsChecking(true);
      
      const isValid = validDict.has(curr);
      
      setIsChecking(false);
      if(!isValid) {
         setWordErr('คำนี้ไม่มีอยู่ในพจนานุกรม');
         setTimeout(() => setWordErr(''), 2000);
         return;
      }
      
      const newG = [...guesses, curr];
      setGuesses(newG);
      setCurr("");
      if(curr === target) onEnd('won', { score: newG.length, answer: target });
      else if(newG.length >= 6) onEnd('lost', { score: 6, answer: target });
    } else if(k === 'DEL') {
      setCurr(curr.slice(0, -1));
    } else if(curr.length < 5) {
      setCurr(curr + k);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if(e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toUpperCase();
      if(key === 'ENTER') onKey('ENTER');
      else if(key === 'BACKSPACE' || key === 'DELETE') onKey('DEL');
      else if(/^[A-Z]$/.test(key)) onKey(key);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [curr, guesses, target, onEnd, isChecking, validDict]);

  if(!target) return <div className="py-10 animate-pulse text-sky-400 font-mono">Loading...</div>;

  const getStatuses = (guessStr) => {
    const statuses = Array(5).fill('bg-slate-700 text-slate-300 border-slate-700 opacity-60');
    const targetChars = target.split('');
    
    for(let i = 0; i < 5; i++) {
      if(guessStr[i] === targetChars[i]) {
        statuses[i] = 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
        targetChars[i] = null; 
      }
    }
    
    for(let i = 0; i < 5; i++) {
      if(statuses[i].includes('bg-emerald-500')) continue;
      
      const targetIndex = targetChars.indexOf(guessStr[i]);
      if(targetIndex !== -1) {
         statuses[i] = 'bg-amber-500 text-white border-amber-500';
         targetChars[targetIndex] = null; 
      }
    }
    return statuses;
  };

  const rows = [];
  for(let i=0; i<6; i++) {
    if(i < guesses.length) {
      const statuses = getStatuses(guesses[i]);
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {guesses[i].split('').map((char, j) => (
            <div key={j} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded border-2 transition-all duration-700 ease-in-out transform ${statuses[j]}`} style={{ animation: `flipIn 0.6s ease forwards ${j * 0.15}s` }}>{char}</div>
          ))}
        </div>
      );
    } else if(i === guesses.length) {
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {[0,1,2,3,4].map(j => (
            <div key={j} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded border-2 transition-all duration-100 ${curr[j] ? 'border-sky-400 scale-105 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'border-[#1E3A5F]'} bg-[#050811]`}>{curr[j] || ''}</div>
          ))}
        </div>
      );
    } else {
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {[0,1,2,3,4].map(j => <div key={j} className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-[#1E3A5F]/40 bg-[#050811]/50"></div>)}
        </div>
      );
    }
  }

  const keyColor = (char) => {
    let stat = 'bg-[#0F2547] text-white border border-[#1E3A5F]';
    for(let g of guesses) {
      const statuses = getStatuses(g);
      for(let i=0; i<5; i++) {
        if(g[i] === char) {
          if(statuses[i].includes('bg-emerald-500')) return 'bg-emerald-500 text-white border border-emerald-400';
          if(statuses[i].includes('bg-amber-500')) stat = 'bg-amber-500 text-white border border-amber-400';
          else if(stat !== 'bg-amber-500 text-white border border-amber-400') stat = 'bg-slate-800 text-slate-500 border border-slate-700';
        }
      }
    }
    return stat;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full h-full relative">
      {wordErr && <div className="absolute top-0 bg-red-500 text-white font-bold px-4 py-2 rounded-lg z-50 shadow-xl">{wordErr}</div>}
      <div className="space-y-1.5">{rows}</div>
      <div className="w-full max-w-[360px] space-y-1.5 mt-4">
        {[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','DEL']].map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map(k => (
              <button key={k} onClick={()=>onKey(k)} className={`h-11 sm:h-12 rounded font-bold text-xs flex items-center justify-center transition-colors active:scale-95 ${k.length>1?'px-2':'flex-1'} ${keyColor(k)}`}>{k}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. Snake Game
function SnakeGame({ dateSeed, isPlaying, isPaused, onEnd }) {
  const ROWS = 15;
  const COLS = 15;
  const [snake, setSnake] = useStickyState([{ r: 7, c: 7 }], `bma_snake_s_${dateSeed}`);
  const [food, setFood] = useStickyState({ r: 3, c: 3 }, `bma_snake_f_${dateSeed}`);
  const [dir, setDir] = useStickyState({ r: 0, c: 1 }, `bma_snake_d_${dateSeed}`);
  const [nextDir, setNextDir] = useStickyState({ r: 0, c: 1 }, `bma_snake_nd_${dateSeed}`);
  const [isGameOver, setIsGameOver] = useStickyState(false, `bma_snake_go_${dateSeed}`);
  const [score, setScore] = useStickyState(0, `bma_snake_sc_${dateSeed}`);

  const spawnFood = (currSnake) => {
    let r, c, isSafe;
    do {
      r = Math.floor(Math.random() * ROWS);
      c = Math.floor(Math.random() * COLS);
      isSafe = !currSnake.some(s => s.r === r && s.c === c);
    } while(!isSafe);
    return { r, c };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) e.preventDefault();
      if (['ArrowUp', 'w', 'W'].includes(key) && dir.r !== 1) setNextDir({ r: -1, c: 0 });
      if (['ArrowDown', 's', 'S'].includes(key) && dir.r !== -1) setNextDir({ r: 1, c: 0 });
      if (['ArrowLeft', 'a', 'A'].includes(key) && dir.c !== 1) setNextDir({ r: 0, c: -1 });
      if (['ArrowRight', 'd', 'D'].includes(key) && dir.c !== -1) setNextDir({ r: 0, c: 1 });
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dir]);

  useEffect(() => {
    if (isGameOver || !isPlaying || isPaused) return;
    
    const interval = setInterval(() => {
        const head = snake[0];
        const d = nextDir;
        let newR = (head.r + d.r + ROWS) % ROWS;
        let newC = (head.c + d.c + COLS) % COLS;
        
        const newHead = { r: newR, c: newC };
        
        if (snake.some((s, idx) => idx !== snake.length - 1 && s.r === newR && s.c === newC)) {
          setIsGameOver(true);
          onEnd('ended', { score: score });
          return;
        }
        
        const newSnake = [newHead, ...snake];
        if (newR === food.r && newC === food.c) {
          setScore(score + 1);
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }
        
        setSnake(newSnake);
        setDir(d);
    }, 150);
    return () => clearInterval(interval);
  }, [snake, nextDir, food, isGameOver, score, isPlaying, isPaused, onEnd]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full h-full select-none touch-none">
      <div className="font-bold text-emerald-400 text-lg bg-[#0F2547] px-6 py-1.5 rounded-full border border-[#1E3A5F]">
        คะแนน: {score} 🍎
      </div>
      <div className="bg-slate-800 border-4 border-[#1E3A5F] rounded-lg p-1 relative w-full max-w-[320px] aspect-square mx-auto">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex" style={{ height: `${100/ROWS}%` }}>
            {Array.from({ length: COLS }).map((_, c) => {
              const isSnake = snake.some(s => s.r === r && s.c === c);
              const isHead = snake[0].r === r && snake[0].c === c;
              const isFood = food.r === r && food.c === c;
              
              return (
                <div key={c} className="flex-1 border-[0.5px] border-slate-700/30" style={{
                  backgroundColor: isHead ? '#34D399' : isSnake ? '#10B981' : 'transparent',
                  borderRadius: isHead ? '20%' : isSnake ? '10%' : '0'
                }}>
                  {isFood && <div className="w-full h-full bg-red-500 rounded-full scale-[0.6] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 w-48 mt-4">
        <div></div>
        <button onClick={(e) => { e.preventDefault(); if (dir.r !== 1) setNextDir({ r: -1, c: 0 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬆️</button>
        <div></div>
        <button onClick={(e) => { e.preventDefault(); if (dir.c !== 1) setNextDir({ r: 0, c: -1 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬅️</button>
        <button onClick={(e) => { e.preventDefault(); if (dir.r !== -1) setNextDir({ r: 1, c: 0 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬇️</button>
        <button onClick={(e) => { e.preventDefault(); if (dir.c !== -1) setNextDir({ r: 0, c: 1 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">➡️</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-2 text-center">💡 ใช้ลูกศรหรือ W A S D บนคีย์บอร์ด หรือปุ่มบนหน้าจอ<br/>งูสามารถเดินทะลุขอบได้</div>
    </div>
  );
}

// 7. Game 2048
function Game2048({ dateSeed, onEnd }) {
  const [board, setBoard] = useStickyState(Array(4).fill().map(()=>Array(4).fill(0)), `bma_2048_b_${dateSeed}`);
  const [score, setScore] = useStickyState(0, `bma_2048_s_${dateSeed}`);
  const [moves, setMoves] = useStickyState(100, `bma_2048_m_${dateSeed}`);
  const [maxTile, setMaxTile] = useStickyState(0, `bma_2048_max_${dateSeed}`);
  const [isFirst, setIsFirst] = useStickyState(true, `bma_2048_f_${dateSeed}`);
  const [rngState, setRngState] = useStickyState(0, `bma_2048_r_${dateSeed}`);
  
  const rng = useRef(new PRNG(dateSeed + '_2048'));
  
  useEffect(() => {
     for(let i=0; i<rngState; i++) rng.current.next();
  }, []);

  const addRandomTile = (b) => {
    let empty = [];
    for(let r=0; r<4; r++) for(let c=0; c<4; c++) if(b[r][c] === 0) empty.push({r, c});
    if(empty.length === 0) return b;
    
    let spot = empty[rng.current.nextInt(0, empty.length - 1)];
    let val = rng.current.nextFloat() < 0.9 ? 2 : 4;
    setRngState(p => p + 2);
    b[spot.r][spot.c] = val;
    return b;
  };

  useEffect(() => {
    if (isFirst) {
      let b = Array(4).fill().map(()=>Array(4).fill(0));
      b = addRandomTile(b);
      b = addRandomTile(b);
      setBoard(b);
      setIsFirst(false);
      let mT = 0;
      for(let r=0; r<4; r++) for(let c=0; c<4; c++) if(b[r][c] > mT) mT = b[r][c];
      setMaxTile(mT);
    }
  }, [isFirst]);

  const handleMove = (dir) => {
     if (moves <= 0) return;
     let b = board.map(row => [...row]);
     let moved = false;
     let gainedScore = 0;

     const rotateLeft = (matrix) => {
        const result = [];
        for(let c=3; c>=0; c--) {
           const newRow = [];
           for(let r=0; r<4; r++) newRow.push(matrix[r][c]);
           result.push(newRow);
        }
        return result;
     };
     
     const rotateRight = (matrix) => {
        const result = [];
        for(let c=0; c<4; c++) {
           const newRow = [];
           for(let r=3; r>=0; r--) newRow.push(matrix[r][c]);
           result.push(newRow);
        }
        return result;
     };

     let workBoard = b;
     if (dir === 'Right') { workBoard = rotateRight(rotateRight(b)); }
     else if (dir === 'Up') { workBoard = rotateLeft(b); }
     else if (dir === 'Down') { workBoard = rotateRight(b); }

     for(let r=0; r<4; r++) {
        let row = workBoard[r].filter(val => val !== 0);
        for(let i=0; i<row.length-1; i++) {
           if(row[i] !== 0 && row[i] === row[i+1]) {
              row[i] *= 2;
              gainedScore += row[i];
              row[i+1] = 0;
              moved = true;
           }
        }
        let newRow = row.filter(val => val !== 0);
        while(newRow.length < 4) newRow.push(0);
        for(let c=0; c<4; c++) {
           if (workBoard[r][c] !== newRow[c]) moved = true;
           workBoard[r][c] = newRow[c];
        }
     }

     if (dir === 'Right') { workBoard = rotateRight(rotateRight(workBoard)); }
     else if (dir === 'Up') { workBoard = rotateRight(workBoard); }
     else if (dir === 'Down') { workBoard = rotateLeft(workBoard); }

     if (moved) {
        let finalB = addRandomTile(workBoard);
        setBoard(finalB);
        setScore(p => p + gainedScore);
        setMoves(m => m - 1);
        
        let maxT = maxTile;
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) if(finalB[r][c] > maxT) maxT = finalB[r][c];
        setMaxTile(maxT);
        
        if (moves - 1 <= 0) {
           onEnd('ended', { score: score + gainedScore, maxTile: maxT });
        } else {
           let canMove = false;
           for(let r=0; r<4; r++) for(let c=0; c<4; c++) {
              if(finalB[r][c] === 0) canMove = true;
              if(r<3 && finalB[r][c] === finalB[r+1][c]) canMove = true;
              if(c<3 && finalB[r][c] === finalB[r][c+1]) canMove = true;
           }
           if(!canMove) onEnd('ended', { score: score + gainedScore, maxTile: maxT });
        }
     }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
       if(['ArrowUp','w','W'].includes(e.key)) handleMove('Up');
       if(['ArrowDown','s','S'].includes(e.key)) handleMove('Down');
       if(['ArrowLeft','a','A'].includes(e.key)) handleMove('Left');
       if(['ArrowRight','d','D'].includes(e.key)) handleMove('Right');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [board, moves]);
  
  let startX, startY;
  const onTouchStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
     if(!startX || !startY) return;
     let dx = e.changedTouches[0].clientX - startX;
     let dy = e.changedTouches[0].clientY - startY;
     if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) handleMove(dx > 0 ? 'Right' : 'Left');
     else if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) handleMove(dy > 0 ? 'Down' : 'Up');
  };

  const colors = {
    0: 'bg-[#0B1325]', 2: 'bg-slate-200 text-[#050811]', 4: 'bg-amber-100 text-[#050811]', 8: 'bg-amber-400 text-amber-950', 16: 'bg-orange-400 text-white', 32: 'bg-orange-600 text-white',
    64: 'bg-red-500 text-white', 128: 'bg-yellow-300 text-amber-900 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]', 256: 'bg-yellow-400 text-amber-900 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]',
    512: 'bg-yellow-500 text-amber-950 drop-shadow-[0_0_16px_rgba(234,179,8,1)]', 1024: 'bg-emerald-400 text-emerald-950', 2048: 'bg-sky-400 text-sky-950'
  };

  return (
     <div className="flex flex-col items-center justify-center space-y-4 w-full h-full select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex gap-4 w-full max-w-[300px] justify-between text-center font-bold">
           <div className="bg-[#0F2547] border border-[#1E3A5F] rounded-xl px-4 py-2 flex-1"><div className="text-[10px] text-sky-300">คะแนน</div><div className="text-xl">{score}</div></div>
           <div className="bg-[#0F2547] border border-[#1E3A5F] rounded-xl px-4 py-2 flex-1"><div className="text-[10px] text-emerald-300">สูงสุด</div><div className="text-xl text-emerald-400">{maxTile}</div></div>
           <div className="bg-[#0F2547] border border-[#1E3A5F] rounded-xl px-4 py-2 flex-1"><div className="text-[10px] text-amber-300">ขยับได้อีก</div><div className="text-xl text-amber-400">{moves}</div></div>
        </div>
        
        <div className="bg-[#1E3A5F] p-2 rounded-xl border-[4px] border-[#0F2547] shadow-xl w-full max-w-[300px] aspect-square grid grid-cols-4 grid-rows-4 gap-2">
           {board.flat().map((val, i) => (
              <div key={i} className={`flex items-center justify-center rounded-lg font-bold text-2xl transition-all duration-150 ${colors[val] || 'bg-fuchsia-500 text-white drop-shadow-[0_0_20px_rgba(217,70,239,1)]'}`}>
                 {val !== 0 ? val : ''}
              </div>
           ))}
        </div>
        <div className="text-[10px] text-slate-400 text-center">💡 ปัดหน้าจอ หรือใช้ลูกศรบนคีย์บอร์ดเพื่อเลื่อน<br/>เมื่อขยับครบ 100 ครั้ง เกมจะสิ้นสุดลงเพื่อวัดผลประจำวัน</div>
     </div>
  );
}

// 8. 24 Game
function Game24({ dateSeed, onEnd }) {
  const [nums, setNums] = useStickyState([], `bma_24_n_${dateSeed}`);
  const [expr, setExpr] = useState('');
  const [msg, setMsg] = useState('');

  const check24 = (arr) => {
    if(arr.length === 1) return Math.abs(arr[0] - 24) < 0.001;
    for(let i=0; i<arr.length; i++) {
      for(let j=0; j<arr.length; j++) {
        if(i===j) continue;
        let rem = arr.filter((_, idx) => idx!==i && idx!==j);
        let a=arr[i], b=arr[j];
        let next = [a+b, a-b, b-a, a*b];
        if(b!==0) next.push(a/b);
        if(a!==0) next.push(b/a);
        for(let val of next) {
          if(check24([...rem, val])) return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if(nums.length > 0) return;
    const rng = new PRNG(dateSeed + '_24game');
    let valid = false;
    let generated = [];
    while(!valid) {
      generated = [rng.nextInt(1,9), rng.nextInt(1,9), rng.nextInt(1,9), rng.nextInt(1,9)];
      valid = check24(generated);
    }
    setNums(generated);
  }, [dateSeed]);

  const handleSubmit = () => {
    const sanitized = expr.replace(/\s/g, '');
    if(!/^[1-9+\-*/()]+$/.test(sanitized)) return setMsg('❌ ใช้ได้เฉพาะตัวเลขและเครื่องหมาย +, -, *, /, (, )');
    
    const usedNums = sanitized.replace(/[^1-9]/g, '').split('').map(Number).sort();
    const requiredNums = [...nums].sort();
    if(usedNums.join(',') !== requiredNums.join(',')) {
      return setMsg('❌ ต้องใช้ตัวเลขที่กำหนดให้ครบ 4 ตัว (และใช้ตัวละ 1 ครั้งเท่านั้น)');
    }

    try {
      const res = new Function('return ' + sanitized)();
      if(Math.abs(res - 24) < 0.001) {
         onEnd('won', { score: 24, answer: sanitized });
      } else {
         setMsg(`❌ ได้ผลลัพธ์เป็น ${res} (ไม่ใช่ 24)`);
      }
    } catch(e) {
      setMsg('❌ รูปแบบสมการไม่ถูกต้อง');
    }
  };

  if(!nums.length) return <div className="py-10 animate-pulse text-sky-400 font-mono">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full h-full p-4">
      <div className="font-bold text-amber-300 text-lg bg-[#0F2547] px-6 py-2 rounded-full border border-[#1E3A5F]">เลขที่สุ่มได้วันนี้</div>
      <div className="flex gap-4">
        {nums.map((n,i) => <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-[#1E3A5F] border-2 border-sky-400 rounded-xl text-3xl font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)]">{n}</div>)}
      </div>
      <div className="w-full max-w-[320px] space-y-3">
         <input type="text" value={expr} onChange={e=>setExpr(e.target.value)} placeholder="เช่น (8-4)*6*1" className="w-full inp text-center text-xl font-mono py-3" />
         {msg && <div className="text-red-400 text-sm text-center font-bold">{msg}</div>}
         <button onClick={handleSubmit} className="w-full btn-b text-lg py-3 hover:bg-sky-600 transition-colors">ตรวจสอบคำตอบ</button>
         <button onClick={()=>onEnd('lost', {score: 0})} className="w-full btn-d mt-2 hover:bg-red-950 hover:text-red-300 border-red-900/50">ยอมแพ้</button>
      </div>
    </div>
  );
}

// 9. Resistor Code Game
function ResistorGame({ dateSeed, onEnd }) {
  const [targetVal, setTargetVal] = useStickyState(null, `bma_res_t_${dateSeed}`);
  const [targetTol, setTargetTol] = useStickyState(null, `bma_res_tol_${dateSeed}`);
  const [colors, setColors] = useStickyState([], `bma_res_c_${dateSeed}`);
  const [expected, setExpected] = useStickyState([], `bma_res_exp_${dateSeed}`);
  const [lives, setLives] = useStickyState(3, `bma_res_l_${dateSeed}`);
  const [isExploding, setIsExploding] = useState(false);
  const [errAnim, setErrAnim] = useState(false);

  const COLORS = ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Gray', 'White', 'Gold', 'Silver'];
  const COL_HEX = ['#000000', '#8B4513', '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#EE82EE', '#808080', '#FFFFFF', '#FFD700', '#C0C0C0'];
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

  useEffect(() => {
    if(targetVal) return;
    const rng = new PRNG(dateSeed + '_resistor');
    const base = E12[rng.nextInt(0, E12.length-1)];
    const multIdx = rng.nextInt(0, 6); 
    const val = base * Math.pow(10, multIdx);
    const tol = rng.nextInt(0,1) === 0 ? 'Gold' : 'Silver';
    
    const b1 = Math.floor(base/10);
    const b2 = base%10;
    const exp = [COLORS[b1], COLORS[b2], COLORS[multIdx], tol];
    
    setTargetVal(val); setTargetTol(tol==='Gold'?'5%':'10%'); setExpected(exp); setLives(3);
  }, [dateSeed]);

  const formatVal = (v) => {
    if(v >= 1000000) return (v/1000000) + ' MΩ';
    if(v >= 1000) return (v/1000) + ' kΩ';
    return v + ' Ω';
  };

  const handlePick = (c) => {
    if(colors.length >= 4 || lives <= 0 || isExploding) return;
    const nC = [...colors, c];
    setColors(nC);
    if(nC.length === 4) {
       if(nC.join(',') === expected.join(',')) {
          setTimeout(()=>onEnd('won', {score: lives * 100}), 800);
       } else {
          if (lives > 1) {
              setErrAnim(true);
              setTimeout(() => {
                  setLives(l => l - 1);
                  setColors([]);
                  setErrAnim(false);
              }, 800);
          } else {
              setLives(0);
              setIsExploding(true);
              setTimeout(()=>onEnd('lost', {score: 0}), 1500);
          }
       }
    }
  };

  if(!targetVal) return <div className="py-10 animate-pulse text-sky-400 font-mono">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full h-full p-4 select-none">
       <div className="text-center bg-[#0F2547] p-4 rounded-xl border border-[#1E3A5F]">
          <div className="text-sm text-slate-300">ค่าความต้านทานเป้าหมาย</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-300 tracking-wider font-mono">{formatVal(targetVal)} ± {targetTol}</div>
          <div className="mt-2 text-xs font-bold text-red-400">โอกาสตอบ: {lives} / 3 ครั้ง</div>
       </div>
       
       <div className={`relative w-64 h-24 sm:w-80 sm:h-28 flex items-center justify-center my-4 ${errAnim ? 'animate-shake' : ''}`}>
          <div className="absolute w-full h-2 bg-slate-400 z-0"></div>
          <div className={`relative w-40 sm:w-48 h-16 sm:h-20 bg-[#f4a460] rounded-[30px] border border-amber-800 z-10 flex items-center justify-between px-3 shadow-inner transition-all ${isExploding ? 'brightness-50 grayscale' : ''}`}>
             <div className="w-4 h-full" style={{ backgroundColor: colors[0] ? COL_HEX[COLORS.indexOf(colors[0])] : 'transparent' }}></div>
             <div className="w-4 h-full" style={{ backgroundColor: colors[1] ? COL_HEX[COLORS.indexOf(colors[1])] : 'transparent' }}></div>
             <div className="w-4 h-full" style={{ backgroundColor: colors[2] ? COL_HEX[COLORS.indexOf(colors[2])] : 'transparent' }}></div>
             <div className="w-1.5 h-full bg-transparent border-l border-amber-800/30 mx-1"></div>
             <div className="w-4 h-full" style={{ backgroundColor: colors[3] ? COL_HEX[COLORS.indexOf(colors[3])] : 'transparent' }}></div>
             {isExploding && <div className="absolute inset-0 flex items-center justify-center text-5xl z-20 animate-ping">💥</div>}
          </div>
       </div>

       <div className="text-xs text-slate-400">เรียงลำดับ: หลักที่ 1 → หลักที่ 2 → ตัวคูณ → เปอร์เซ็นต์ความคลาดเคลื่อน</div>
       <div className="flex gap-2">
         <button onClick={()=>setColors([])} className="btn-d py-1.5 px-4 text-xs font-bold text-red-300 border-red-900/50 hover:bg-red-950">ล้างสีทั้งหมด (Clear)</button>
       </div>
       <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 w-full max-w-[340px]">
          {COLORS.map(c => (
             <button key={c} onClick={()=>handlePick(c)} style={{backgroundColor: COL_HEX[COLORS.indexOf(c)], color: ['Black','Blue','Brown','Green','Red'].includes(c)?'#fff':'#000'}} className="h-10 rounded shadow-md border border-white/20 text-[10px] font-bold active:scale-95 transition-transform">{c}</button>
          ))}
       </div>
    </div>
  );
}