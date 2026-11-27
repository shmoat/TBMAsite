import React, { useState, useEffect, useRef } from 'react';
import { PRNG, useStickyState, playGameSfx } from '../../../lib/utils';

// 1. Sudoku (Crosshair + Undo + Remaining Count)
export function SudokuGame({ dateSeed, onEnd }) {
  const [board, setBoard] = useStickyState(null, `bma_sudoku_v2_${dateSeed}`);
  const [history, setHistory] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [noteMode, setNoteMode] = useState(false);

  useEffect(() => {
    if (board) return;
    const rng = new PRNG(dateSeed + '_sudoku_v2');
    const base = [
      [1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],
      [2,3,4,5,6,7,8,9,1],[5,6,7,8,9,1,2,3,4],[8,9,1,2,3,4,5,6,7],
      [3,4,5,6,7,8,9,1,2],[6,7,8,9,1,2,3,4,5],[9,1,2,3,4,5,6,7,8]
    ].map((r) => [...r]);

    for (let block = 0; block < 3; block++) {
      for (let i = 0; i < 3; i++) {
        const r1 = block * 3 + i;
        const r2 = block * 3 + rng.nextInt(0, 2);
        const temp = [...base[r1]];
        base[r1] = [...base[r2]];
        base[r2] = temp;
      }
    }

    const mapVals = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const fullGrid = base.map((row) => row.map((val) => mapVals[val - 1]));
    const puzzle = fullGrid.map((r) => [...r]);

    const isValid = (b, r, c, val) => {
      for (let i = 0; i < 9; i++) {
        if (b[r][i] === val) return false;
        if (b[i][c] === val) return false;
        if (b[Math.floor(r / 3) * 3 + Math.floor(i / 3)][Math.floor(c / 3) * 3 + (i % 3)] === val) return false;
      }
      return true;
    };

    const hasUniqueSolution = (b) => {
      let count = 0;
      const tempB = b.map((r) => [...r]);
      const solve = () => {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (tempB[r][c] === '') {
              for (let num = 1; num <= 9; num++) {
                if (isValid(tempB, r, c, num)) {
                  tempB[r][c] = num;
                  solve();
                  tempB[r][c] = '';
                  if (count > 1) return;
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
    for (let i = 0; i < 81; i++) positions.push(i);
    positions = rng.shuffle(positions);

    let removed = 0;
    const targetRemove = rng.nextInt(45, 55);
    for (const pos of positions) {
      if (removed >= targetRemove) break;
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      const temp = puzzle[r][c];
      puzzle[r][c] = '';
      if (!hasUniqueSolution(puzzle)) puzzle[r][c] = temp;
      else removed++;
    }

    setBoard(puzzle.map((r) => r.map((val) => ({ val, fixed: val !== '', notes: [] }))));
  }, [dateSeed]);

  const cloneBoard = (b) => b.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));

  const handleUndo = () => {
    if (history.length === 0) return;
    playGameSfx('undo');
    setBoard(history[history.length - 1]);
    setHistory((prev) => prev.slice(0, -1));
  };

  const checkWin = (b) => {
    for (let r = 0; r < 9; r++) {
      const rSet = new Set();
      const cSet = new Set();
      const bSet = new Set();
      for (let i = 0; i < 9; i++) {
        if (!b[r][i].val) return false;
        rSet.add(b[r][i].val);
        if (!b[i][r].val) return false;
        cSet.add(b[i][r].val);
        const br = Math.floor(r / 3) * 3 + Math.floor(i / 3);
        const bc = (r % 3) * 3 + (i % 3);
        if (!b[br][bc].val) return false;
        bSet.add(b[br][bc].val);
      }
      if (rSet.size !== 9 || cSet.size !== 9 || bSet.size !== 9) return false;
    }
    playGameSfx('win');
    onEnd('won');
    return true;
  };

  const cleanNotes = (b, r, c, num) => {
    for (let i = 0; i < 9; i++) {
      b[r][i].notes = b[r][i].notes.filter((n) => n !== num);
      b[i][c].notes = b[i][c].notes.filter((n) => n !== num);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[br + i][bc + j].notes = b[br + i][bc + j].notes.filter((n) => n !== num);
  };

  const handleNumpad = (num) => {
    if (!selectedCell || !board) return;
    const [r, c] = selectedCell;
    if (board[r][c].fixed) return;

    setHistory((prev) => [...prev.slice(-39), cloneBoard(board)]);
    const newB = cloneBoard(board);
    if (num === 'DEL') {
      playGameSfx('undo');
      newB[r][c].val = '';
      newB[r][c].notes = [];
    } else if (noteMode) {
      playGameSfx('tap');
      const nSet = new Set(newB[r][c].notes);
      if (nSet.has(num)) nSet.delete(num);
      else nSet.add(num);
      newB[r][c].notes = Array.from(nSet).sort();
      newB[r][c].val = '';
    } else {
      playGameSfx('tap');
      newB[r][c].val = num;
      newB[r][c].notes = [];
      cleanNotes(newB, r, c, num);
    }
    setBoard(newB);
    if (num !== 'DEL' && !noteMode) checkWin(newB);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (!selectedCell) return;
      const k = e.key;
      if (/^[1-9]$/.test(k)) handleNumpad(parseInt(k, 10));
      else if (k === 'Backspace' || k === 'Delete') handleNumpad('DEL');
      else if (k === 'ArrowUp') { e.preventDefault(); setSelectedCell((p) => (p ? [Math.max(0, p[0] - 1), p[1]] : [8, 0])); }
      else if (k === 'ArrowDown') { e.preventDefault(); setSelectedCell((p) => (p ? [Math.min(8, p[0] + 1), p[1]] : [0, 0])); }
      else if (k === 'ArrowLeft') { e.preventDefault(); setSelectedCell((p) => (p ? [p[0], Math.max(0, p[1] - 1)] : [0, 8])); }
      else if (k === 'ArrowRight') { e.preventDefault(); setSelectedCell((p) => (p ? [p[0], Math.min(8, p[1] + 1)] : [0, 0])); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, board, noteMode, history]);

  if (!board) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Loading...</div>;
  const selVal = selectedCell ? board[selectedCell[0]][selectedCell[1]].val : null;
  const digitCounts = {};
  for (let n = 1; n <= 9; n++) digitCounts[n] = 0;
  board.forEach((row) => row.forEach((cell) => { if (cell.val >= 1 && cell.val <= 9) digitCounts[cell.val]++; }));

  return (
    <div className="flex flex-col items-center space-y-3 w-full h-full justify-center px-1">
      <div className="bg-[#1E3A5F] p-[2px] rounded border-2 border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.3)] w-full max-w-[min(100%,310px)] sm:max-w-[360px] aspect-square grid grid-rows-9 shrink-0">
        {board.map((row, r) => (
          <div key={r} className="grid grid-cols-9 w-full h-full">
            {row.map((cell, c) => {
              const isSel = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
              const isHi = !isSel && selVal && cell.val === selVal;
              const isCross = !isSel && selectedCell && (
                selectedCell[0] === r ||
                selectedCell[1] === c ||
                (Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) && Math.floor(selectedCell[1] / 3) === Math.floor(c / 3))
              );
              const brR = c % 3 === 2 && c !== 8 ? '2px solid #3B82F6' : '1px solid #1E3A5F';
              const brB = r % 3 === 2 && r !== 8 ? '2px solid #3B82F6' : '1px solid #1E3A5F';
              let bg = cell.fixed ? '#0B1325' : '#050811';
              const txt = cell.fixed ? '#60A5FA' : '#ffffff';
              if (isSel) bg = 'rgba(59,130,246,0.65)';
              else if (isHi) bg = 'rgba(56,189,248,0.3)';
              else if (isCross) bg = 'rgba(59,130,246,0.13)';

              return (
                <div key={c} onClick={() => setSelectedCell([r, c])} style={{ backgroundColor: bg, color: txt, borderRight: brR, borderBottom: brB }} className="w-full h-full flex items-center justify-center text-base sm:text-lg font-bold cursor-pointer overflow-hidden select-none transition-colors duration-75">
                  {cell.val ? cell.val : <div className="notes-grid">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <div key={n} className="note-item">{cell.notes.includes(n) ? n : ''}</div>)}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="w-full max-w-[340px] space-y-2 mt-2">
        <div className="flex bg-[#050811] p-1 rounded-xl border border-[#1E3A5F] gap-1">
          <button type="button" onClick={() => setNoteMode(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${!noteMode ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>✒️ กรอกเลข</button>
          <button type="button" onClick={() => setNoteMode(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${noteMode ? 'bg-amber-500 text-[#050811]' : 'text-slate-400'}`}>📝 ทดเลข</button>
          <button type="button" onClick={handleUndo} disabled={history.length === 0} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0F2547] text-sky-200 border border-[#1E3A5F] disabled:opacity-40 hover:bg-sky-900 transition-colors" title="ย้อนกลับ (Ctrl+Z)">↩️</button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const rem = Math.max(0, 9 - (digitCounts[n] || 0));
            const isDone = rem === 0;
            return (
              <button key={n} type="button" onClick={() => handleNumpad(n)} className={`bg-[#0F2547] active:bg-white active:text-[#050811] border border-[#1E3A5F] rounded-lg h-11 sm:h-12 flex flex-col items-center justify-center leading-none transition-opacity ${isDone ? 'opacity-40' : ''}`}>
                <span className="text-base sm:text-lg font-bold">{n}</span>
                <span className={`text-[9px] font-mono mt-0.5 ${isDone ? 'text-emerald-400' : 'text-slate-400'}`}>{isDone ? '✓' : rem}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => handleNumpad('DEL')} className="bg-red-950/60 active:bg-red-500 text-red-300 border border-red-900/50 rounded-lg h-11 sm:h-12 text-xs font-bold">DEL</button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('ต้องการล้างกระดานทั้งหมดใช่หรือไม่?')) {
                setHistory((prev) => [...prev.slice(-39), cloneBoard(board)]);
                playGameSfx('undo');
                setBoard(board.map((r) => r.map((c) => (c.fixed ? c : { ...c, val: '', notes: [] }))));
              }
            }}
            className="col-span-5 mt-1 bg-red-900/30 hover:bg-red-900/60 text-red-300 border border-red-900/50 rounded-lg h-9 text-xs font-bold transition-colors"
          >
            🗑️ เคลียร์กระดาน (Clear All)
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Minesweeper (Chording + Touch Long-Press Flag)
export function MinesweeperGame({ dateSeed, onEnd, onFirstMove }) {
  const COLS = 9;
  const ROWS = 9;
  const [numMines, setNumMines] = useStickyState(10, `bma_ms_mines_${dateSeed}`);
  const [grid, setGrid] = useStickyState(null, `bma_ms_grid_${dateSeed}`);
  const [revealed, setRevealed] = useStickyState(null, `bma_ms_rev_${dateSeed}`);
  const [flagged, setFlagged] = useStickyState(null, `bma_ms_flag_${dateSeed}`);
  const [mode, setMode] = useState('dig');

  const endedRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  useEffect(() => {
    if (grid) return;
    const rng = new PRNG(dateSeed + '_msBoard_v2');
    const m = rng.nextInt(10, 16);
    setNumMines(m);

    const g = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let placed = 0;
    while (placed < m) {
      const rr = rng.nextInt(0, ROWS - 1);
      const cc = rng.nextInt(0, COLS - 1);
      if (g[rr][cc] !== 'M') { g[rr][cc] = 'M'; placed++; }
    }

    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (g[i][j] === 'M') continue;
        let cnt = 0;
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          if (i + di >= 0 && i + di < ROWS && j + dj >= 0 && j + dj < COLS && g[i + di][j + dj] === 'M') cnt++;
        }
        g[i][j] = cnt;
      }
    }

    let startR = -1;
    let startC = -1;
    for (let i = 0; i < ROWS && startR === -1; i++) {
      for (let j = 0; j < COLS; j++) if (g[i][j] === 0) { startR = i; startC = j; break; }
    }
    if (startR === -1) {
      for (let i = 0; i < ROWS && startR === -1; i++) {
        for (let j = 0; j < COLS; j++) if (g[i][j] !== 'M') { startR = i; startC = j; break; }
      }
    }

    const newR = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    const flood = (rr, cc) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || newR[rr][cc]) return;
      newR[rr][cc] = true;
      if (g[rr][cc] === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(rr + dr, cc + dc);
      }
    };
    if (startR !== -1) flood(startR, startC);

    setGrid(g);
    setRevealed(newR);
    setFlagged(Array(ROWS).fill().map(() => Array(COLS).fill(false)));
  }, [dateSeed]);

  useEffect(() => () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);

  const triggerBombEnd = (baseRev) => {
    endedRef.current = true;
    playGameSfx('bomb');
    const newR = baseRev.map((row) => [...row]);
    for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) if (grid[i][j] === 'M') newR[i][j] = true;
    setRevealed(newR);
    setTimeout(() => onEnd('bomb'), 800);
  };

  const checkWinBoard = (revBoard) => {
    let revCount = 0;
    revBoard.forEach((row) => row.forEach((v) => { if (v) revCount++; }));
    if (revCount === ROWS * COLS - numMines) {
      endedRef.current = true;
      playGameSfx('win');
      onEnd('won');
    }
  };

  const handleAction = (r, c, act) => {
    if (endedRef.current || !revealed || !grid) return;
    if (onFirstMove) onFirstMove();

    if (revealed[r][c]) {
      if (act === 'flag') return;
      const num = grid[r][c];
      if (typeof num !== 'number' || num <= 0) return;

      let adjFlags = 0;
      const hiddenNeighbors = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (flagged[nr][nc]) adjFlags++;
            else if (!revealed[nr][nc]) hiddenNeighbors.push([nr, nc]);
          }
        }
      }
      if (adjFlags !== num || hiddenNeighbors.length === 0) return;
      if (hiddenNeighbors.some(([nr, nc]) => grid[nr][nc] === 'M')) return triggerBombEnd(revealed);

      const newR = revealed.map((row) => [...row]);
      const flood = (rr, cc) => {
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || newR[rr][cc] || flagged[rr][cc]) return;
        newR[rr][cc] = true;
        if (grid[rr][cc] === 0) {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(rr + dr, cc + dc);
        }
      };
      hiddenNeighbors.forEach(([nr, nc]) => flood(nr, nc));
      playGameSfx('merge');
      setRevealed(newR);
      checkWinBoard(newR);
      return;
    }

    if (act === 'flag') {
      const newF = flagged.map((row) => [...row]);
      newF[r][c] = !newF[r][c];
      playGameSfx('flag');
      setFlagged(newF);
      return;
    }

    if (flagged[r][c]) return;
    if (grid[r][c] === 'M') return triggerBombEnd(revealed);

    const newR = revealed.map((row) => [...row]);
    const flood = (rr, cc) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || newR[rr][cc] || flagged[rr][cc]) return;
      newR[rr][cc] = true;
      if (grid[rr][cc] === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(rr + dr, cc + dc);
      }
    };
    flood(r, c);
    playGameSfx('tap');
    setRevealed(newR);
    checkWinBoard(newR);
  };

  const startTouchFlag = (r, c) => {
    if (endedRef.current || !revealed || revealed[r][c]) return;
    longPressFiredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      if (navigator.vibrate) { try { navigator.vibrate(25); } catch {} }
      handleAction(r, c, 'flag');
    }, 380);
  };

  const cancelTouchFlag = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (!grid) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Loading...</div>;

  const colors = ['', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-amber-400', 'text-cyan-400', 'text-pink-400', 'text-gray-400'];
  const fCount = flagged ? flagged.flat().filter(Boolean).length : 0;
  const minesLeft = numMines - fCount;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full h-full select-none">
      <div className="font-bold text-amber-300 text-lg bg-[#0F2547] px-4 py-1.5 rounded-full border border-[#1E3A5F]">💣 ระเบิด: {minesLeft}</div>
      <div className="flex gap-2 w-full max-w-[260px]">
        <button type="button" onClick={() => setMode('dig')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'dig' ? 'bg-sky-500 text-white' : 'bg-[#0F2547] text-slate-400 border border-[#1E3A5F]'}`}>⛏️ ขุด</button>
        <button type="button" onClick={() => setMode('flag')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${mode === 'flag' ? 'bg-red-500 text-white' : 'bg-[#0F2547] text-slate-400 border border-[#1E3A5F]'}`}>🚩 ปักธง</button>
      </div>
      <div className="bg-slate-700 p-[2px] w-max mx-auto rounded-lg shadow-xl shadow-sky-900/10" onContextMenu={(e) => e.preventDefault()}>
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((val, c) => {
              const isRev = revealed[r][c];
              const isFlg = flagged[r][c];
              const bg = isRev ? (val === 'M' ? '#7F1D1D' : '#050811') : '#0F2547';
              const content = isFlg ? '🚩' : (isRev ? (val === 'M' ? '💥' : (val === 0 ? '' : val)) : '');
              return (
                <div
                  key={c}
                  onTouchStart={() => startTouchFlag(r, c)}
                  onTouchEnd={cancelTouchFlag}
                  onTouchMove={cancelTouchFlag}
                  onTouchCancel={cancelTouchFlag}
                  onClick={() => {
                    if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                    handleAction(r, c, isRev ? 'dig' : mode);
                  }}
                  onContextMenu={(e) => { e.preventDefault(); handleAction(r, c, 'flag'); }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 border-[0.5px] border-[#1E3A5F]/40 flex items-center justify-center font-bold text-sm sm:text-base cursor-pointer active:brightness-125 ${isRev && val !== 'M' ? colors[val] : ''}`}
                  style={{ backgroundColor: bg }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 px-4 text-center leading-relaxed">
        💡 มือถือ: แตะค้างเพื่อปักธงได้ทันที • ปักธงครบตามเลขแล้วแตะซ้ำที่ตัวเลขเพื่อเปิดรอบข้าง (Chording)
      </div>
    </div>
  );
}

// 3. Flag Guesser (with 50/50 Lifeline +15s)
const ALL_FLAGS = [
  { c: 'th', n: 'Thailand' }, { c: 'jp', n: 'Japan' }, { c: 'kr', n: 'South Korea' }, { c: 'us', n: 'USA' },
  { c: 'gb', n: 'UK' }, { c: 'cn', n: 'China' }, { c: 'fr', n: 'France' }, { c: 'de', n: 'Germany' },
  { c: 'it', n: 'Italy' }, { c: 'br', n: 'Brazil' }, { c: 'ar', n: 'Argentina' }, { c: 'au', n: 'Australia' },
  { c: 'ca', n: 'Canada' }, { c: 'vn', n: 'Vietnam' }, { c: 'sg', n: 'Singapore' }, { c: 'ru', n: 'Russia' },
  { c: 'in', n: 'India' }, { c: 'za', n: 'South Africa' }, { c: 'mx', n: 'Mexico' }, { c: 'es', n: 'Spain' },
  { c: 'fi', n: 'Finland' }, { c: 'se', n: 'Sweden' }, { c: 'no', n: 'Norway' }, { c: 'ch', n: 'Switzerland' },
  { c: 'nl', n: 'Netherlands' }, { c: 'be', n: 'Belgium' }, { c: 'gr', n: 'Greece' }, { c: 'tr', n: 'Turkey' },
  { c: 'eg', n: 'Egypt' }, { c: 'nz', n: 'New Zealand' }, { c: 'ph', n: 'Philippines' }, { c: 'id', n: 'Indonesia' },
  { c: 'my', n: 'Malaysia' }, { c: 'pt', n: 'Portugal' }, { c: 'ie', n: 'Ireland' }, { c: 'dk', n: 'Denmark' },
  { c: 'pl', n: 'Poland' }, { c: 'il', n: 'Israel' }, { c: 'ua', n: 'Ukraine' }, { c: 'tw', n: 'Taiwan' },
  { c: 'bd', n: 'Bangladesh' }, { c: 'pk', n: 'Pakistan' }, { c: 'lk', n: 'Sri Lanka' }, { c: 'np', n: 'Nepal' },
  { c: 'ir', n: 'Iran' }, { c: 'iq', n: 'Iraq' }, { c: 'sy', n: 'Syria' }, { c: 'lb', n: 'Lebanon' },
  { c: 'qa', n: 'Qatar' }, { c: 'kw', n: 'Kuwait' }, { c: 'om', n: 'Oman' }, { c: 'ye', n: 'Yemen' },
  { c: 'kz', n: 'Kazakhstan' }, { c: 'dz', n: 'Algeria' }, { c: 'ma', n: 'Morocco' }, { c: 'ng', n: 'Nigeria' },
  { c: 'ke', n: 'Kenya' }, { c: 'cl', n: 'Chile' }, { c: 'co', n: 'Colombia' }, { c: 'pe', n: 'Peru' },
  { c: 've', n: 'Venezuela' }, { c: 'cu', n: 'Cuba' }, { c: 'jm', n: 'Jamaica' }, { c: 'ro', n: 'Romania' },
  { c: 'hr', n: 'Croatia' }, { c: 'hu', n: 'Hungary' }, { c: 'cz', n: 'Czechia' }, { c: 'at', n: 'Austria' }
];

export function FlagGuesserGame({ dateSeed, onEnd, onAddPenalty }) {
  const [rounds, setRounds] = useStickyState([], `bma_fg_rds_${dateSeed}`);
  const [currentRound, setCurrentRound] = useStickyState(0, `bma_fg_curr_${dateSeed}`);
  const [wrongGuess, setWrongGuess] = useStickyState(null, `bma_fg_wrong_${dateSeed}`);
  const [used5050, setUsed5050] = useStickyState(false, `bma_fg_5050_${dateSeed}`);
  const [elimCodes, setElimCodes] = useStickyState([], `bma_fg_elim_${dateSeed}`);
  const [penaltyFlash, setPenaltyFlash] = useState(false);

  useEffect(() => {
    if (rounds.length > 0) return;
    const rng = new PRNG(dateSeed + '_flag5');
    const shuffled = rng.shuffle([...ALL_FLAGS]);
    const rds = [];
    for (let i = 0; i < 3; i++) {
      const target = shuffled[i];
      const others = rng.shuffle(ALL_FLAGS.filter((f) => f.c !== target.c));
      const options = rng.shuffle([target, others[0], others[1], others[2]]);
      rds.push({ target, options });
    }
    setRounds(rds);
  }, [dateSeed]);

  if (!rounds.length) return null;
  const rd = rounds[currentRound];

  const handleUse5050 = () => {
    if (used5050 || wrongGuess) return;
    const wrongOpts = rd.options.filter((o) => o.c !== rd.target.c);
    const rng = new PRNG(`${dateSeed}_5050_${currentRound}`);
    setElimCodes(rng.shuffle(wrongOpts).slice(0, 2).map((o) => o.c));
    setUsed5050(true);
    playGameSfx('bonus');
    onAddPenalty?.(15);
    setPenaltyFlash(true);
    setTimeout(() => setPenaltyFlash(false), 1800);
  };

  const handleGuess = (code) => {
    if (wrongGuess || elimCodes.includes(code)) return;
    if (code === rd.target.c) {
      if (currentRound === 2) {
        playGameSfx('win');
        onEnd('won', { score: 3 });
      } else {
        playGameSfx('merge');
        setElimCodes([]);
        setCurrentRound((c) => c + 1);
      }
    } else {
      playGameSfx('lose');
      setWrongGuess(code);
      setTimeout(() => onEnd('lost', { score: currentRound }), 2500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-5 w-full h-full relative">
      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        <div className="font-bold text-amber-300 text-base bg-[#0F2547] px-4 py-1.5 rounded-full border border-[#1E3A5F]">
          ด่านที่ {currentRound + 1} / 3
        </div>
        <button
          type="button"
          onClick={handleUse5050}
          disabled={used5050 || Boolean(wrongGuess)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${used5050 ? 'bg-[#050811] text-slate-500 border-[#1E3A5F] cursor-not-allowed line-through opacity-60' : 'bg-amber-500/20 text-amber-300 border-amber-400/60 hover:bg-amber-400 hover:text-[#050811] shadow'}`}
          title="ตัดตัวเลือกผิดออก 2 ข้อ (ใช้ได้ 1 ครั้งต่อวัน แลกเวลาเพิ่ม +15 วินาที)"
        >
          <i className="fas fa-cut"></i>
          <span>ตัวช่วย 50/50 (+15 วิ)</span>
        </button>
      </div>

      {penaltyFlash && (
        <div className="text-xs font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-400/60 px-3 py-1 rounded-full animate-bounce">
          ✂️ ตัดตัวเลือกผิดออก 2 ข้อแล้ว (+15 วินาที)
        </div>
      )}

      <img src={`https://flagcdn.com/w320/${rd.target.c}.png`} alt="flag" className="h-32 sm:h-44 border-4 border-white/10 rounded-lg shadow-2xl object-cover" />
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2">
        {rd.options.map((opt) => {
          const isElim = elimCodes.includes(opt.c);
          let bg = 'bg-white text-[#050811] hover:scale-[1.02]';
          if (wrongGuess) {
            if (opt.c === rd.target.c) bg = 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]';
            else if (opt.c === wrongGuess) bg = 'bg-red-500 text-white';
            else bg = 'bg-white/10 text-white/50';
          } else if (isElim) {
            bg = 'bg-[#0B1325] text-slate-600 border border-[#1E3A5F] line-through opacity-35 cursor-not-allowed';
          }
          return (
            <button key={opt.c} type="button" disabled={isElim || Boolean(wrongGuess)} onClick={() => handleGuess(opt.c)} className={`font-bold rounded-xl text-sm py-3 transition-all shadow-lg ${bg}`}>
              {opt.n}
            </button>
          );
        })}
      </div>
      {wrongGuess && <div className="text-red-400 font-bold animate-pulse">❌ ผิดครับ! เกมจบลงทันที</div>}
    </div>
  );
}

// 4. Solitaire (with Auto-Complete)
export function SolitaireGame({ dateSeed, onEnd }) {
  const [st, setSt] = useStickyState(null, `bma_sol_${dateSeed}`);
  const [history, setHistory] = useState([]);
  const [initialSt, setInitialSt] = useStickyState(null, `bma_sol_init_${dateSeed}`);
  const [drag, setDrag] = useState(null);
  const [autoCompleting, setAutoCompleting] = useState(false);

  useEffect(() => {
    if (st) return;
    const rng = new PRNG(dateSeed + '_solitaire_v3');
    let deck = [];
    const suits = ['♠', '♥', '♣', '♦'];
    const colors = ['B', 'R', 'B', 'R'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < 13; r++) deck.push({ s: suits[s], r: r + 1, rs: ranks[r], c: colors[s], id: `${s}-${r}`, up: false });
    }
    deck = rng.shuffle(deck);

    const tab = [[], [], [], [], [], [], []];
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck.pop();
        if (i === j) card.up = true;
        tab[j].push(card);
      }
    }
    const newSt = { stock: deck, waste: [], fnd: [[], [], [], []], tab };
    setSt(newSt);
    setInitialSt(JSON.parse(JSON.stringify(newSt)));
    setHistory([]);
  }, [dateSeed]);

  const saveHistory = (currentSt) => setHistory((prev) => [...prev, JSON.parse(JSON.stringify(currentSt))]);

  const handleUndo = () => {
    if (history.length > 0 && !autoCompleting) {
      playGameSfx('undo');
      setSt(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    }
  };

  const handleReset = () => {
    if (initialSt && !autoCompleting) {
      playGameSfx('undo');
      setSt(JSON.parse(JSON.stringify(initialSt)));
      setHistory([]);
    }
  };

  const checkWin = (ns) => {
    if (ns.fnd.every((f) => f.length === 13)) {
      setAutoCompleting(false);
      playGameSfx('win');
      onEnd('won');
    }
  };

  const handleStock = () => {
    if (autoCompleting) return;
    saveHistory(st);
    playGameSfx('tap');
    const ns = { ...st, stock: [...st.stock], waste: [...st.waste] };
    if (ns.stock.length) {
      const c = { ...ns.stock.pop(), up: true };
      ns.waste.push(c);
    } else {
      ns.stock = ns.waste.reverse().map((c) => ({ ...c, up: false }));
      ns.waste = [];
    }
    setSt(ns);
  };

  const tryMove = (ns, stack, tgtArea, tgtCol) => {
    const c = stack[0];
    if (tgtArea === 'fnd' && stack.length === 1) {
      const f = ns.fnd[tgtCol];
      if ((f.length === 0 && c.r === 1 && tgtCol === ['♠', '♥', '♣', '♦'].indexOf(c.s)) ||
          (f.length > 0 && f[f.length - 1].s === c.s && f[f.length - 1].r === c.r - 1)) {
        f.push(c);
        return true;
      }
    } else if (tgtArea === 'tab') {
      const t = ns.tab[tgtCol];
      if (t.length === 0) {
        if (c.r === 13) { t.push(...stack); return true; }
      } else {
        const top = t[t.length - 1];
        if (top.c !== c.c && top.r === c.r + 1) { t.push(...stack); return true; }
      }
    }
    return false;
  };

  const handleAutoMove = (area, colIdx, cardIdx) => {
    if (autoCompleting) return;
    const ns = { stock: [...st.stock], waste: [...st.waste], fnd: st.fnd.map((f) => [...f]), tab: st.tab.map((t) => [...t]) };
    let stack = [];
    if (area === 'waste') { if (!ns.waste.length) return; stack = [ns.waste.pop()]; }
    else if (area === 'fnd') { if (!ns.fnd[colIdx].length) return; stack = [ns.fnd[colIdx].pop()]; }
    else if (area === 'tab') { if (cardIdx < 0 || !ns.tab[colIdx][cardIdx].up) return; stack = ns.tab[colIdx].splice(cardIdx); }
    else return;

    let moved = false;
    if (area !== 'fnd' && stack.length === 1) {
      const fIdx = ['♠', '♥', '♣', '♦'].indexOf(stack[0].s);
      moved = tryMove(ns, stack, 'fnd', fIdx);
    }
    if (!moved) {
      for (let i = 0; i < 7; i++) {
        if (area === 'tab' && i === colIdx) continue;
        moved = tryMove(ns, stack, 'tab', i);
        if (moved) break;
      }
    }

    if (moved) {
      saveHistory(st);
      playGameSfx('card');
      if (area === 'tab' && ns.tab[colIdx].length) ns.tab[colIdx][ns.tab[colIdx].length - 1].up = true;
      setSt(ns);
      checkWin(ns);
    } else {
      setSt({ ...st });
    }
  };

  const canAutoComplete = st && !autoCompleting &&
    st.stock.length === 0 && st.waste.length <= 1 &&
    st.tab.every((col) => col.every((c) => c.up)) &&
    !st.fnd.every((f) => f.length === 13);

  useEffect(() => {
    if (!autoCompleting || !st) return;
    const timer = setTimeout(() => {
      const suits = ['♠', '♥', '♣', '♦'];
      const ns = { stock: [...st.stock], waste: [...st.waste], fnd: st.fnd.map((f) => [...f]), tab: st.tab.map((t) => [...t]) };
      let moved = false;

      if (ns.waste.length > 0) {
        const topW = ns.waste[ns.waste.length - 1];
        const fIdx = suits.indexOf(topW.s);
        if ((ns.fnd[fIdx].length === 0 && topW.r === 1) || (ns.fnd[fIdx].length > 0 && ns.fnd[fIdx][ns.fnd[fIdx].length - 1].r === topW.r - 1)) {
          ns.fnd[fIdx].push(ns.waste.pop());
          moved = true;
        }
      }

      if (!moved) {
        let bestCol = -1;
        let bestRank = 99;
        for (let i = 0; i < 7; i++) {
          const col = ns.tab[i];
          if (!col.length) continue;
          const c = col[col.length - 1];
          const fIdx = suits.indexOf(c.s);
          const f = ns.fnd[fIdx];
          const ok = (f.length === 0 && c.r === 1) || (f.length > 0 && f[f.length - 1].r === c.r - 1);
          if (ok && c.r < bestRank) { bestRank = c.r; bestCol = i; }
        }
        if (bestCol !== -1) {
          const card = ns.tab[bestCol].pop();
          ns.fnd[suits.indexOf(card.s)].push(card);
          moved = true;
        }
      }

      if (moved) {
        playGameSfx('card');
        setSt(ns);
        checkWin(ns);
      } else {
        setAutoCompleting(false);
      }
    }, 85);
    return () => clearTimeout(timer);
  }, [autoCompleting, st]);

  useEffect(() => {
    const handleMove = (e) => {
      if (drag) {
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
        setDrag((p) => ({ ...p, dx: clientX - p.startX, dy: clientY - p.startY }));
      }
    };
    const handleUp = (e) => {
      if (drag) {
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.changedTouches) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }

        let dropTarget = null;
        try { dropTarget = document.elementFromPoint(clientX, clientY)?.closest('[data-drop]'); } catch {}
        const isTap = Math.abs(clientX - drag.startX) < 10 && Math.abs(clientY - drag.startY) < 10;

        if (isTap) {
          handleAutoMove(drag.area, drag.colIdx, drag.cardIdx);
        } else if (dropTarget) {
          const tArea = dropTarget.getAttribute('data-drop');
          const tIdx = parseInt(dropTarget.getAttribute('data-idx') || '0', 10);
          const ns = { stock: [...st.stock], waste: [...st.waste], fnd: st.fnd.map((f) => [...f]), tab: st.tab.map((t) => [...t]) };
          let stack = [];
          if (drag.area === 'waste') stack = [ns.waste.pop()];
          else if (drag.area === 'fnd') stack = [ns.fnd[drag.colIdx].pop()];
          else stack = ns.tab[drag.colIdx].splice(drag.cardIdx);

          if (tryMove(ns, stack, tArea, tIdx)) {
            saveHistory(st);
            playGameSfx('card');
            if (drag.area === 'tab' && ns.tab[drag.colIdx].length) ns.tab[drag.colIdx][ns.tab[drag.colIdx].length - 1].up = true;
            setSt(ns);
            checkWin(ns);
          } else {
            setSt({ ...st });
          }
        }
        setDrag(null);
      }
    };
    if (drag) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [drag, st]);

  if (!st) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Shuffling...</div>;

  const renderCard = (c, area, col, idx) => {
    if (!c) return <div className="w-10 h-14 sm:w-12 sm:h-16 border border-[#1E3A5F] rounded bg-[#050811] opacity-50 shrink-0" />;
    if (!c.up) return <div className="w-10 h-14 sm:w-12 sm:h-16 card-ui face-down shrink-0" />;

    const isDragging = drag && drag.area === area && drag.colIdx === col && idx >= drag.cardIdx;
    return (
      <div
        onPointerDown={(e) => {
          if (autoCompleting || (e.button && e.button !== 0)) return;
          e.stopPropagation();
          e.preventDefault();
          const stack = area === 'waste' ? [c] : (area === 'fnd' ? [c] : st.tab[col].slice(idx));
          const rect = e.currentTarget.getBoundingClientRect();
          setDrag({ area, colIdx: col, cardIdx: idx, cards: stack, startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, dx: 0, dy: 0 });
        }}
        onTouchStart={(e) => {
          if (autoCompleting) return;
          e.stopPropagation();
          const stack = area === 'waste' ? [c] : (area === 'fnd' ? [c] : st.tab[col].slice(idx));
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
              <div key={c.id} style={{ marginTop: i > 0 ? '-2.5rem' : '0', zIndex: 100 + i }} className="relative">
                {renderCard(c, null, null, null)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-2">
          <button type="button" onClick={handleUndo} disabled={history.length === 0 || autoCompleting} className="px-3 py-1 bg-[#0F2547] text-white rounded text-[10px] border border-[#1E3A5F] disabled:opacity-50 font-bold shadow-md hover:bg-sky-900 transition-colors">↩️ Undo</button>
          <button type="button" onClick={handleReset} disabled={!initialSt || autoCompleting} className="px-3 py-1 bg-red-900/50 text-red-200 rounded text-[10px] border border-red-900/50 disabled:opacity-50 font-bold shadow-md hover:bg-red-900 transition-colors">🔄 Reset</button>
        </div>
        {canAutoComplete && (
          <button type="button" onClick={() => { playGameSfx('bonus'); setAutoCompleting(true); }} className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#050811] text-[10px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse transition-transform active:scale-95">
            ✨ เก็บไพ่อัตโนมัติ
          </button>
        )}
      </div>

      <div className="flex justify-between mb-6">
        <div className="flex gap-2">
          <div onClick={handleStock} className="cursor-pointer">
            {st.stock.length > 0 ? (
              <div className="w-10 h-14 sm:w-12 sm:h-16 card-ui face-down shrink-0 flex items-center justify-center text-[10px] text-white/50">{st.stock.length}</div>
            ) : (
              <div className="w-10 h-14 sm:w-12 sm:h-16 border border-[#1E3A5F] rounded bg-black flex items-center justify-center text-[10px] text-slate-500">↺</div>
            )}
          </div>
          <div data-drop="waste" data-idx="0">{renderCard(st.waste[st.waste.length - 1], 'waste', 0, st.waste.length - 1)}</div>
        </div>
        <div className="flex gap-1.5">
          {st.fnd.map((f, i) => <div key={i} data-drop="fnd" data-idx={i}>{renderCard(f[f.length - 1], 'fnd', i, f.length - 1)}</div>)}
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
      <div className="text-[10px] text-slate-400 text-center mt-6">💡 ลากไพ่ไปวาง หรือแตะที่ไพ่เพื่อย้ายอัตโนมัติ • เปิดไพ่คว่ำหมดแล้วกดเก็บอัตโนมัติได้</div>
    </div>
  );
}