// ==========================================
// chat_games.js - เกมสำหรับเล่นในห้องแชต (Chat Games)
// ==========================================

const CHAT_GAMES_LIST = { chess: 'หมากรุกสากล', checkers: 'หมากฮอสสากล', snl: 'บันไดงู', connect4: 'Connect 4', domino: 'โดมิโน', sttt: 'Super Tic-Tac-Toe' };

// 1. Chess Game
function ChessInner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, currentUser }) {
    const game = useRef(new window.Chess());
    const [selected, setSelected] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [board, setBoard] = useState([]);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if(window.Chess && gameData.gameState?.fen) {
            game.current.load(gameData.gameState.fen);
        }
        setBoard(game.current.board());
    }, [gameData.gameState?.fen]);

    useEffect(() => {
        if(gameData.status !== 'playing' || !gameData.timerSetting) return;
        const intv = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - (gameData.gameState.lastMoveAt || now)) / 1000);
            setElapsed(diff);
            const isWhiteTurn = game.current.turn() === 'w';
            const timeLeft = isWhiteTurn ? (gameData.gameState.wTime - diff) : (gameData.gameState.bTime - diff);
            
            if(timeLeft <= 0 && !isSpectator) {
                db.collection('bma_chat_games').doc(gameId).update({
                    status: 'ended', winner: isWhiteTurn ? gameData.players[1] : gameData.players[0]
                });
            }
        }, 1000);
        return () => clearInterval(intv);
    }, [gameData.status, gameData.gameState?.lastMoveAt, gameData.timerSetting, isSpectator, gameId, db, gameData.players]);

    const myTurn = (isPlayer1 && game.current.turn()==='w') || (isPlayer2 && game.current.turn()==='b');

    const onSquareClick = async (sq) => {
        if(gameData.status !== 'playing' || isSpectator || !myTurn) return;
        if(!selected) {
            const p = game.current.get(sq);
            if(p && p.color === game.current.turn()) {
                setSelected(sq);
                setValidMoves(game.current.moves({square: sq, verbose: true}).map(m=>m.to));
            }
        } else {
            if(sq === selected) { setSelected(null); setValidMoves([]); return; }
            const moves = game.current.moves({verbose: true});
            const move = moves.find(m => m.from === selected && m.to === sq);
            if(move) {
                game.current.move({from: selected, to: sq, promotion: 'q'});
                let st = 'playing'; let w = null;
                if(game.current.game_over()) {
                    st = 'ended';
                    w = game.current.in_draw() ? 'draw' : currentUser.id;
                }
                const upd = { 'gameState.fen': game.current.fen(), 'gameState.turn': game.current.turn(), status: st, winner: w };
                
                if(gameData.timerSetting) {
                    const diff = Math.floor((Date.now() - (gameData.gameState.lastMoveAt || Date.now())) / 1000);
                    if(game.current.turn() === 'b') upd['gameState.wTime'] = gameData.gameState.wTime - diff;
                    else upd['gameState.bTime'] = gameData.gameState.bTime - diff;
                    upd['gameState.lastMoveAt'] = Date.now();
                }
                await db.collection('bma_chat_games').doc(gameId).update(upd);
            }
            setSelected(null); setValidMoves([]);
        }
    };

    const ranks = isPlayer2 ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const files = isPlayer2 ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
    const pieceSymbols = { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚' };

    const fmtT = (s) => s <= 0 ? "0:00" : `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    
    const wT = gameData.gameState?.wTime || 0;
    const bT = gameData.gameState?.bTime || 0;
    const isWT = game.current.turn() === 'w';

    return (
        <div className="flex flex-col items-center w-full">
            {gameData.timerSetting && (
                <div className="flex justify-between w-full mb-2 font-mono font-bold bg-[#050811] p-2 rounded border border-[#1E3A5F]">
                    <span className={isPlayer2 ? (isWT?'text-amber-300':'') : (!isWT?'text-amber-300':'')}>{isPlayer2 ? 'White: ' + fmtT(isWT?wT-elapsed:wT) : 'Black: ' + fmtT(!isWT?bT-elapsed:bT)}</span>
                    <span>Timer</span>
                    <span className={isPlayer1 ? (isWT?'text-amber-300':'') : (!isWT?'text-amber-300':'')}>{isPlayer1 ? 'White: ' + fmtT(isWT?wT-elapsed:wT) : 'Black: ' + fmtT(!isWT?bT-elapsed:bT)}</span>
                </div>
            )}
            <div className="border-4 border-slate-700 bg-slate-800 p-1 rounded-lg">
                <div className="grid grid-cols-8 grid-rows-8 w-64 h-64 sm:w-80 sm:h-80">
                    {ranks.map((r, ri) => files.map((f, fi) => {
                        const sq = f + r;
                        const isDark = (ri+fi)%2 !== 0;
                        let bg = isDark ? '#1E3A5F' : '#60A5FA';
                        if(selected === sq) bg = '#F59E0B';
                        const p = game.current.get(sq);
                        const isV = validMoves.includes(sq);

                        return (
                            <div key={sq} onClick={() => onSquareClick(sq)} style={{backgroundColor: bg}} className="relative flex items-center justify-center cursor-pointer text-xl sm:text-3xl">
                                {p && <span style={{color: p.color==='w' ? '#fff' : '#050811', textShadow: p.color==='b' ? '0 0 2px #fff' : '0 0 2px #000'}}>{pieceSymbols[p.type]}</span>}
                                {isV && <div className="absolute w-3 h-3 bg-black/40 rounded-full" />}
                            </div>
                        );
                    }))}
                </div>
            </div>
        </div>
    );
}

// 2. Checkers Game
function CheckersInner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, currentUser }) {
    const [selected, setSelected] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const flatBoard = gameData.gameState?.board || Array(64).fill(null);
    const board = [];
    for(let i=0; i<8; i++) board.push([...flatBoard.slice(i*8, i*8+8)]);
    const turn = gameData.gameState?.turn || 1;
    const myP = isPlayer1 ? 1 : 2;

    const getMoves = (r, c, p, k) => {
        const dirs = k ? [[-1,-1],[-1,1],[1,-1],[1,1]] : p===1 ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
        const moves = [];
        dirs.forEach(([dr,dc]) => {
            let nr=r+dr, nc=c+dc;
            if(nr>=0&&nr<8&&nc>=0&&nc<8) {
                if(!board[nr][nc]) moves.push({r:nr, c:nc, cap:null});
                else if(board[nr][nc].p !== p) {
                    let nnr=nr+dr, nnc=nc+dc;
                    if(nnr>=0&&nnr<8&&nnc>=0&&nnc<8 && !board[nnr][nnc]) {
                        moves.push({r:nnr, c:nnc, cap:{r:nr, c:nc}});
                    }
                }
            }
        });
        return moves;
    };

    const onClick = async (r, c) => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP) return;
        
        const actualR = isPlayer2 ? 7-r : r;
        const actualC = isPlayer2 ? 7-c : c;

        if(!selected) {
            const piece = board[actualR][actualC];
            if(piece && piece.p === myP) {
                setSelected({r: actualR, c: actualC});
                setValidMoves(getMoves(actualR, actualC, piece.p, piece.k));
            }
        } else {
            if(actualR===selected.r && actualC===selected.c) { setSelected(null); setValidMoves([]); return; }
            const move = validMoves.find(m => m.r===actualR && m.c===actualC);
            if(move) {
                let newB = board.map(row=>[...row]);
                const piece = newB[selected.r][selected.c];
                newB[selected.r][selected.c] = null;
                if((myP===1 && actualR===0) || (myP===2 && actualR===7)) piece.k = true;
                newB[actualR][actualC] = piece;
                if(move.cap) newB[move.cap.r][move.cap.c] = null;
                
                let eCnt = 0; newB.forEach(row=>row.forEach(cell=>{if(cell&&cell.p!==myP)eCnt++;}));
                let st = eCnt===0 ? 'ended' : 'playing';
                
                await db.collection('bma_chat_games').doc(gameId).update({
                    'gameState.board': newB.reduce((a,b)=>a.concat(b), []), 'gameState.turn': myP===1?2:1, status: st, winner: st==='ended' ? currentUser.id : null
                });
            }
            setSelected(null); setValidMoves([]);
        }
    };

    return (
        <div className="border-4 border-[#0F2547] p-1 bg-[#050811] rounded-lg w-full flex justify-center">
            <div className="grid grid-cols-8 grid-rows-8 w-64 h-64 sm:w-80 sm:h-80">
                {board.map((row, visualR) => row.map((cell, visualC) => {
                    const r = isPlayer2 ? 7-visualR : visualR;
                    const c = isPlayer2 ? 7-visualC : visualC;
                    const isDark = (r+c)%2===1;
                    let bg = isDark ? '#8B4513' : '#DEB887';
                    const isSel = selected?.r===r && selected?.c===c;
                    const isMove = validMoves.some(m=>m.r===r&&m.c===c);
                    if(isSel) bg = '#F59E0B'; else if(isMove) bg = '#34D399';
                    
                    const renderCell = board[r][c];

                    return (
                        <div key={`${r}-${c}`} onClick={()=>onClick(visualR,visualC)} style={{backgroundColor: bg}} className="flex items-center justify-center">
                            {renderCell && <div className={`w-[80%] h-[80%] rounded-full shadow-md flex items-center justify-center ${renderCell.p===1?'bg-red-600':'bg-slate-800 border-2 border-slate-600'}`}>{renderCell.k && <span className="text-white text-xs">♚</span>}</div>}
                        </div>
                    );
                }))}
            </div>
        </div>
    );
}

// 3. Snakes and Ladders
function SnlInner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, getAuthor, currentUser }) {
    const pNum = gameData.players.length;
    const p1 = gameData.gameState?.p1 || 1;
    const p2 = gameData.gameState?.p2 || 1;
    const p3 = gameData.gameState?.p3 || 1;
    const p4 = gameData.gameState?.p4 || 1;
    const positions = [p1, p2, p3, p4];
    const turn = gameData.gameState?.turn || 1;
    const myPIdx = gameData.players.indexOf(currentUser?.id);
    const myP = myPIdx !== -1 ? myPIdx + 1 : turn;

    const snakes = { 16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78 };
    const ladders = { 1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:100 };

    const playDiceSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            for(let i=0; i<3; i++) {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(400 + Math.random()*200, ctx.currentTime);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.start(); osc.stop(ctx.currentTime + 0.05);
                }, i*80);
            }
        } catch(e) {}
    };

    const rollDice = async () => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP) return;
        playDiceSound();
        const roll = Math.floor(Math.random() * 6) + 1;
        let nPos = positions[myP-1] + roll;
        if(nPos > 100) nPos = 100 - (nPos - 100);
        if(snakes[nPos]) nPos = snakes[nPos];
        if(ladders[nPos]) nPos = ladders[nPos];

        let nextTurn = turn + 1;
        if(nextTurn > pNum) nextTurn = 1;

        const upd = { [`gameState.p${myP}`]: nPos, 'gameState.lastRoll': roll, 'gameState.turn': nextTurn };
        if(nPos === 100) { upd.status = 'ended'; upd.winner = gameData.players[myP-1]; }
        await db.collection('bma_chat_games').doc(gameId).update(upd);
    };

    const getPos = (num) => {
        const r = 9 - Math.floor((num-1)/10);
        const c = Math.floor((num-1)/10) % 2 === 0 ? (num-1)%10 : 9 - ((num-1)%10);
        return { x: c*10+5, y: r*10+5 };
    };

    const renderCells = () => {
        let cells = [];
        const bgColors = ['bg-blue-600', 'bg-red-600', 'bg-yellow-500', 'bg-purple-600'];
        for(let r=9; r>=0; r--) {
            for(let c=0; c<10; c++) {
                let num = r%2===0 ? r*10+c+1 : r*10+(9-c)+1;
                cells.push(
                    <div key={num} className={`relative flex items-center justify-center text-[10px] font-bold border border-black/20 ${ladders[num]?'bg-sky-200 text-sky-900':snakes[num]?'bg-red-200 text-red-900':num%2===0?'bg-emerald-100 text-emerald-900':'bg-emerald-50 text-emerald-800'}`}>
                        {num}
                        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-[1px] pointer-events-none z-20 p-0.5">
                            {gameData.players.map((pid, idx) => {
                                if(positions[idx] !== num) return null;
                                const u = getAuthor(pid);
                                if (u && u.avatarUrl) {
                                    return <img key={idx} src={u.avatarUrl} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white shadow-lg object-cover z-20`} alt="" />;
                                }
                                return <div key={idx} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ${bgColors[idx]} border border-white shadow-lg z-20 flex items-center justify-center text-[6px] text-white`}>{idx+1}</div>;
                            })}
                        </div>
                    </div>
                );
            }
        }
        return cells;
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 border-4 border-[#0F2547] rounded-lg bg-emerald-50 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 drop-shadow-md">
                    {Object.entries(ladders).map(([start, end]) => {
                        const s = getPos(Number(start)), e = getPos(end);
                        return <line key={`l-${start}`} x1={`${s.x}%`} y1={`${s.y}%`} x2={`${e.x}%`} y2={`${e.y}%`} stroke="#059669" strokeWidth="6" strokeDasharray="6 4" opacity="0.8" />;
                    })}
                    {Object.entries(snakes).map(([start, end]) => {
                        const s = getPos(Number(start)), e = getPos(end);
                        return <line key={`s-${start}`} x1={`${s.x}%`} y1={`${s.y}%`} x2={`${e.x}%`} y2={`${e.y}%`} stroke="#DC2626" strokeWidth="4" opacity="0.9" />;
                    })}
                </svg>
                <div className="grid grid-cols-10 grid-rows-10 w-full h-full absolute inset-0 z-0">
                    {renderCells()}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-xl w-8">🎲 {gameData.gameState?.lastRoll || '-'}</div>
                <button onClick={rollDice} disabled={gameData.status!=='playing' || isSpectator || turn!==myP} className="btn-w text-sm py-2 px-6 shadow-xl disabled:opacity-50">
                    {turn===myP ? 'ทอยลูกเต๋า' : 'รอคู่แข่ง...'}
                </button>
            </div>
            <div className="text-[10px] text-slate-400 flex flex-wrap justify-center gap-2">
               {gameData.players.map((pid, i) => (
                  <span key={pid}>ผู้เล่น {i+1} ({getAuthor(pid).displayName})</span>
               ))}
            </div>
        </div>
    );
}

// 4. Connect 4
function Connect4Inner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, currentUser }) {
    const rawB = gameData.gameState?.board; 
    const board = rawB ? (rawB[0]?.cols ? rawB.map(r => r.cols) : rawB) : Array(6).fill(null).map(()=>Array(7).fill(0));
    const turn = gameData.gameState?.turn || 1;
    const myP = isPlayer1 ? 1 : 2;

    const checkWin = (b, p) => {
        for(let r=0; r<6; r++) {
            for(let c=0; c<7; c++) {
                if(b[r][c] !== p) continue;
                if(c+3 < 7 && b[r][c+1]===p && b[r][c+2]===p && b[r][c+3]===p) return true;
                if(r+3 < 6 && b[r+1][c]===p && b[r+2][c]===p && b[r+3][c]===p) return true;
                if(c+3 < 7 && r+3 < 6 && b[r+1][c+1]===p && b[r+2][c+2]===p && b[r+3][c+3]===p) return true;
                if(c-3 >= 0 && r+3 < 6 && b[r+1][c-1]===p && b[r+2][c-2]===p && b[r+3][c-3]===p) return true;
            }
        }
        return false;
    };

    const dropPiece = async (col) => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP) return;
        let newB = board.map(row => [...row]);
        let placedRow = -1;
        for(let r=5; r>=0; r--) {
            if(newB[r][col] === 0) {
                newB[r][col] = myP;
                placedRow = r;
                break;
            }
        }
        if(placedRow === -1) return;

        let st = 'playing'; let w = null;
        if(checkWin(newB, myP)) {
            st = 'ended'; w = currentUser.id;
        } else if(newB[0].every(c => c !== 0)) {
            st = 'ended'; w = 'draw';
        }

        await db.collection('bma_chat_games').doc(gameId).update({
            'gameState.board': newB.map(row => ({cols: row})), 'gameState.turn': myP===1?2:1, status: st, winner: w
        });
    };

    return (
        <div className="bg-blue-700 p-2 sm:p-3 rounded-xl flex gap-1 sm:gap-2 cursor-pointer w-full max-w-[360px] mx-auto shadow-2xl border-4 border-blue-900">
            {Array(7).fill(0).map((_, c) => (
                <div key={c} className="flex flex-col gap-1 sm:gap-2 flex-1 hover:bg-white/10 rounded-full transition-colors pb-1" onClick={() => dropPiece(c)}>
                    {board.map((row, r) => (
                        <div key={r} className="aspect-square rounded-full bg-[#050811] flex items-center justify-center border-[3px] border-blue-800 shadow-inner">
                            {row[c] === 1 && <div className="w-[85%] h-[85%] rounded-full bg-red-500 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.4)]"></div>}
                            {row[c] === 2 && <div className="w-[85%] h-[85%] rounded-full bg-yellow-400 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.4)]"></div>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

// 5. Domino Game
function DominoInner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, currentUser }) {
    const gs = gameData.gameState || {};
    const turn = gs.turn || 1;
    const myP = isPlayer1 ? 1 : 2;
    const myHand = myP === 1 ? (gs.p1Hand||[]) : (gs.p2Hand||[]);
    const oppHandLen = myP === 1 ? (gs.p2Hand||[]).length : (gs.p1Hand||[]).length;
    const boardPieces = gs.boardPieces || [];
    const deck = gs.deck || [];
    const hasDrawn = gs.hasDrawn || false;

    const [selIdx, setSelIdx] = useState(null);
    const boardRef = useRef(null);

    const leftEnd = boardPieces.length > 0 ? boardPieces[0].l : null;
    const rightEnd = boardPieces.length > 0 ? boardPieces[boardPieces.length-1].r : null;

    const canPlayLeft = (d) => d.l === leftEnd || d.r === leftEnd;
    const canPlayRight = (d) => d.l === rightEnd || d.r === rightEnd;
    const hasAnyMove = myHand.some(d => canPlayLeft(d) || canPlayRight(d));

    useEffect(() => {
        if (boardRef.current) {
            boardRef.current.scrollTo({ left: boardRef.current.scrollWidth, behavior: 'smooth' });
        }
    }, [boardPieces.length]);

    const playDomino = async (idx, side) => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP) return;
        const d = myHand[idx];
        let newBoard = [...boardPieces];
        let newHand = [...myHand];
        newHand.splice(idx, 1);

        if(side === 'left') {
            if(d.r === leftEnd) newBoard.unshift({l: d.l, r: d.r});
            else newBoard.unshift({l: d.r, r: d.l});
        } else {
            if(d.l === rightEnd) newBoard.push({l: d.l, r: d.r});
            else newBoard.push({l: d.r, r: d.l});
        }

        let st = 'playing'; let w = null;
        if(newHand.length === 0) {
            st = 'ended'; w = currentUser.id;
        }

        const upd = { 
            [`gameState.p${myP}Hand`]: newHand, 
            'gameState.boardPieces': newBoard, 
            'gameState.turn': myP===1?2:1, 
            'gameState.hasDrawn': false,
            'gameState.passCount': 0,
            status: st, 
            winner: w 
        };
        await db.collection('bma_chat_games').doc(gameId).update(upd);
        setSelIdx(null);
        
        setTimeout(() => {
            if (boardRef.current) {
                if (side === 'left') boardRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                else boardRef.current.scrollTo({ left: boardRef.current.scrollWidth, behavior: 'smooth' });
            }
        }, 100);
    };

    const drawDomino = async () => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP || hasAnyMove || deck.length === 0) return;
        const newDeck = [...deck];
        const newPiece = newDeck.pop();
        const newHand = [...myHand, newPiece];
        await db.collection('bma_chat_games').doc(gameId).update({
            [`gameState.p${myP}Hand`]: newHand,
            'gameState.deck': newDeck
        });
    };

    const passTurn = async () => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP || hasAnyMove || deck.length > 0) return;

        const newPassCount = (gs.passCount || 0) + 1;
        let st = 'playing'; let w = null;
        if(newPassCount >= 2) {
            st = 'ended'; w = 'draw';
        }

        await db.collection('bma_chat_games').doc(gameId).update({
            'gameState.turn': myP===1?2:1,
            'gameState.passCount': newPassCount,
            status: st, winner: w
        });
    };

    const DmTile = ({d, isH, onClick, sel}) => {
        const Pip = () => <div className="w-[6px] h-[6px] sm:w-[7px] sm:h-[7px] bg-slate-800 rounded-full drop-shadow-sm" />;
        const renderPips = (num) => {
            const pips = Array(9).fill(null);
            if(num === 1) pips[4] = <Pip/>;
            if(num === 2) { pips[0] = <Pip/>; pips[8] = <Pip/>; }
            if(num === 3) { pips[0] = <Pip/>; pips[4] = <Pip/>; pips[8] = <Pip/>; }
            if(num === 4) { pips[0] = <Pip/>; pips[2] = <Pip/>; pips[6] = <Pip/>; pips[8] = <Pip/>; }
            if(num === 5) { pips[0] = <Pip/>; pips[2] = <Pip/>; pips[4] = <Pip/>; pips[6] = <Pip/>; pips[8] = <Pip/>; }
            if(num === 6) { pips[0] = <Pip/>; pips[2] = <Pip/>; pips[3] = <Pip/>; pips[5] = <Pip/>; pips[6] = <Pip/>; pips[8] = <Pip/>; }
            
            return (
                <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[3px] place-items-center gap-[1px]">
                    {pips.map((p, i) => <div key={i} className="flex items-center justify-center w-full h-full">{p}</div>)}
                </div>
            );
        };

        return (
            <div onClick={onClick} className={`flex ${isH?'flex-row w-[56px] h-[28px] sm:w-[72px] sm:h-[36px]':'flex-col w-[28px] h-[56px] sm:w-[36px] sm:h-[72px]'} bg-white rounded shadow-[0_2px_4px_rgba(0,0,0,0.4)] cursor-pointer border-[1px] border-slate-300 items-center justify-center shrink-0 ${sel?'ring-4 ring-amber-400 scale-110 -translate-y-2':''} transition-all overflow-hidden`}>
                <div className="flex-1 w-full h-full relative">{renderPips(isH ? d.l : d.l)}</div>
                <div className={`${isH?'w-[1.5px] h-full':'w-full h-[1.5px]'} bg-slate-300 shadow-sm z-10`} />
                <div className="flex-1 w-full h-full relative">{renderPips(isH ? d.r : d.r)}</div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center w-full space-y-4">
            <div className="text-xs text-slate-400 font-bold px-4 py-1.5 bg-[#0F2547] rounded-full border border-[#1E3A5F] shadow-sm">ไพ่คู่แข่ง: {oppHandLen} ใบ | กองจั่ว: {deck.length} ใบ</div>
            
            <div ref={boardRef} className="w-full h-44 sm:h-56 bg-[#166534] rounded-xl border-[6px] border-amber-950 overflow-auto shadow-[inset_0_10px_20px_rgba(0,0,0,0.6)] relative custom-scrollbar">
                <div className="flex flex-wrap content-start items-center gap-[1px] p-6 min-w-max h-full">
                    {boardPieces.length === 0 ? (
                        <div className="text-emerald-900/60 font-bold text-2xl w-full text-center tracking-wider pt-10">🀱 กระดานว่างเปล่า</div>
                    ) : (
                        boardPieces.map((p, i) => <DmTile key={i} d={p} isH={true} />)
                    )}
                </div>
            </div>

            {selIdx !== null && turn === myP && !isSpectator && (
                <div className="flex gap-2">
                    {canPlayLeft(myHand[selIdx]) && <button onClick={()=>playDomino(selIdx, 'left')} className="btn-b py-2 px-4 text-xs bg-sky-600 border-sky-400 shadow-lg hover:scale-105 transition-transform">👈 ต่อฝั่งซ้าย</button>}
                    {canPlayRight(myHand[selIdx]) && <button onClick={()=>playDomino(selIdx, 'right')} className="btn-b py-2 px-4 text-xs bg-emerald-600 border-emerald-400 shadow-lg hover:scale-105 transition-transform">ต่อฝั่งขวา 👉</button>}
                    {!canPlayLeft(myHand[selIdx]) && !canPlayRight(myHand[selIdx]) && <div className="text-red-400 text-xs py-2 px-2 font-bold animate-pulse">ต่อไม่ได้!</div>}
                    <button onClick={()=>setSelIdx(null)} className="btn-d py-2 px-4 text-xs border-red-900/50 hover:bg-red-950 transition-colors">ยกเลิก</button>
                </div>
            )}

            {turn === myP && !isSpectator && (
                <div className="flex gap-2 items-center bg-[#0F2547] p-2 rounded-xl border border-[#1E3A5F] justify-center mt-2 shadow-lg">
                    {!hasAnyMove && <div className="text-amber-400 text-xs font-bold px-2">ไม่มีไพ่ลงได้!</div>}
                    {(!hasAnyMove && deck.length > 0) && (
                        <button onClick={drawDomino} className="btn-w py-1.5 px-4 text-xs border-amber-500 shadow hover:scale-105 transition-transform">🃏 จั่วไพ่</button>
                    )}
                    {(!hasAnyMove && deck.length === 0) && (
                        <button onClick={passTurn} className="btn-b py-1.5 px-4 text-xs text-red-300 border-red-500/50 hover:bg-red-950 transition-colors">⏭️ ข้ามตา</button>
                    )}
                </div>
            )}

            <div className="w-full pt-2">
                <div className="text-xs font-bold mb-3 text-center text-sky-300 tracking-widest uppercase">ไพ่ในมือของคุณ</div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-3 border border-dashed border-[#1E3A5F] rounded-xl bg-[#0B1325]/50 shadow-inner">
                    {!isSpectator ? (myHand.length > 0 ? myHand.map((d, i) => (
                        <DmTile key={i} d={d} isH={false} onClick={()=>setSelIdx(i)} sel={selIdx===i} />
                    )) : <div className="text-emerald-400 py-4 font-bold animate-pulse">🎉 ไพ่หมดมือแล้ว!</div>) : <div className="text-xs text-slate-500 py-4 font-bold">👀 คุณเป็นผู้ชม</div>}
                </div>
            </div>
        </div>
    );
}

// 6. Super Tic-Tac-Toe
function StttInner({ gameData, isPlayer1, isPlayer2, isSpectator, gameId, db, currentUser }) {
    const gs = gameData.gameState || {};
    const board = gs.board || Array(9).fill().map(()=>Array(9).fill(0));
    const wonBoards = gs.wonBoards || Array(9).fill(0);
    const activeBoard = gs.activeBoard ?? -1;
    const turn = gs.turn || 1;
    const myP = isPlayer1 ? 1 : 2;

    const checkWin3x3 = (b, p) => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for(let l of lines) if(b[l[0]]===p && b[l[1]]===p && b[l[2]]===p) return true;
        return false;
    };

    const onClick = async (bIdx, cIdx) => {
        if(gameData.status !== 'playing' || isSpectator || turn !== myP) return;
        if(activeBoard !== bIdx && activeBoard !== -1) return;
        if(wonBoards[bIdx] !== 0 || board[bIdx][cIdx] !== 0) return;

        let newB = board.map(r => [...r]);
        newB[bIdx][cIdx] = myP;

        let newW = [...wonBoards];
        if(checkWin3x3(newB[bIdx], myP)) newW[bIdx] = myP;
        else if(newB[bIdx].every(c => c !== 0)) newW[bIdx] = 3;

        let st = 'playing'; let w = null;
        if(checkWin3x3(newW, myP)) { st = 'ended'; w = currentUser.id; }
        else if(newW.every(b => b !== 0)) { st = 'ended'; w = 'draw'; }

        let nextActive = -1;
        if (st === 'playing') {
            const available = [];
            for(let i=0; i<9; i++) if(newW[i] === 0) available.push(i);
            if(available.length > 0) nextActive = available[Math.floor(Math.random() * available.length)];
        }

        await db.collection('bma_chat_games').doc(gameId).update({
            'gameState.board': newB, 'gameState.wonBoards': newW, 'gameState.activeBoard': nextActive,
            'gameState.turn': myP===1?2:1, status: st, winner: w
        });
    };

    return (
        <div className="flex flex-col items-center space-y-4 w-full text-center">
            <div className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#0F2547] border border-[#1E3A5F]">
               {activeBoard !== -1 ? <span className="text-amber-300">กระดานที่สุ่มได้: บล็อกที่ {activeBoard+1}</span> : <span className="text-emerald-300">เลือกวางบล็อกไหนก็ได้</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-600 p-1.5 sm:p-2 rounded-lg shadow-xl w-64 h-64 sm:w-80 sm:h-80 mx-auto border-4 border-slate-700">
                {board.map((sub, bIdx) => {
                    const isAct = activeBoard === bIdx || activeBoard === -1;
                    const isWon = wonBoards[bIdx];
                    return (
                        <div key={bIdx} className={`grid grid-cols-3 gap-0.5 p-0.5 rounded ${isAct && isWon === 0 ? 'bg-amber-400 ring-2 ring-amber-400' : 'bg-slate-800'} relative`}>
                            {isWon !== 0 && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/70 rounded backdrop-blur-[1px]">
                                    {isWon === 1 && <span className="text-4xl text-blue-500 font-bold drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">O</span>}
                                    {isWon === 2 && <span className="text-4xl text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">X</span>}
                                    {isWon === 3 && <span className="text-4xl text-slate-400 font-bold">-</span>}
                                </div>
                            )}
                            {sub.map((cell, cIdx) => (
                                <div key={cIdx} onClick={()=>onClick(bIdx, cIdx)} className="bg-[#050811] flex items-center justify-center cursor-pointer text-sm sm:text-lg font-bold">
                                    {cell === 1 && <span className="text-blue-500">O</span>}
                                    {cell === 2 && <span className="text-red-500">X</span>}
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 text-center px-4">
              ผู้เล่น 1 (สีน้ำเงิน O), ผู้เล่น 2 (สีแดง X)
            </div>
        </div>
    )
}

// 7. Chat Game Modal (ระบบจัดการและรวบรวมห้องแชตเกม)
function ChatGameModal({ gameId, currentUser, onClose, getAuthor, db, activeRoom, roomKey }) {
    const [gameData, setGameData] = useState(null);
    const [rematchTimer, setRematchTimer] = useState(15);

    useEffect(() => {
        const unsub = db.collection('bma_chat_games').doc(gameId).onSnapshot(s => {
            if(s.exists) {
                const data = s.data();
                if(data.status === 'waiting' && !data.players.includes(currentUser.id)) {
                    const isSnl = data.type === 'snl';
                    const maxP = isSnl ? 4 : 2;
                    if(data.players.length < maxP) {
                        const newPlayers = [...data.players, currentUser.id];
                        if(!isSnl && newPlayers.length === 2) {
                            db.collection('bma_chat_games').doc(gameId).update({
                                players: newPlayers, status: 'playing', gameState: getInitState(data.type, data.timerSetting)
                            });
                        } else {
                            db.collection('bma_chat_games').doc(gameId).update({ players: newPlayers });
                        }
                    }
                }
                setGameData(data);
            }
        });
        return () => unsub();
    }, [gameId, currentUser.id, db]);

    useEffect(() => {
        if(gameData?.status === 'ended') {
            const interval = setInterval(() => {
                setRematchTimer(t => t > 0 ? t - 1 : 0);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setRematchTimer(15);
        }
    }, [gameData?.status]);

    const getInitState = (type, timerSetting) => {
        if(type === 'chess') return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', wTime: timerSetting, bTime: timerSetting, lastMoveAt: Date.now() };
        if(type === 'checkers') {
            let board = Array(64).fill(null);
            for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
                if((r+c)%2!==0) {
                    if(r<3) board[r*8+c] = {p:2, k:false};
                    if(r>4) board[r*8+c] = {p:1, k:false};
                }
            }
            return { board, turn: 1 };
        }
        if(type === 'snl') return { p1: 1, p2: 1, p3: 1, p4: 1, turn: 1, lastRoll: null };
        if(type === 'connect4') return { board: Array(6).fill(null).map(()=>({cols: Array(7).fill(0)})), turn: 1 };
        if(type === 'domino') {
            const all = [];
            for(let i=0; i<=6; i++) for(let j=i; j<=6; j++) all.push({l: i, r: j});
            for(let i=all.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [all[i], all[j]] = [all[j], all[i]]; }
            return { p1Hand: all.slice(0,7), p2Hand: all.slice(7,14), boardPieces: [all[14]], deck: all.slice(15), turn: 1, hasDrawn: false, passCount: 0 };
        }
        if(type === 'sttt') return { board: Array(9).fill(null).map(()=>Array(9).fill(0)), wonBoards: Array(9).fill(0), activeBoard: -1, turn: 1 };
        return {};
    };

    if(!gameData) return <Modal title="Loading..." onClose={onClose}><div className="animate-pulse">Loading Game...</div></Modal>;

    const isPlayer1 = gameData.players[0] === currentUser.id;
    const isPlayer2 = gameData.players[1] === currentUser.id;
    const isSpectator = !isPlayer1 && !isPlayer2;

    const handleRematch = async () => {
        const rm = [...(gameData.rematch||[])];
        if(!rm.includes(currentUser.id)) {
            rm.push(currentUser.id);
            if(rm.length === 2) {
                await db.collection('bma_chat_games').doc(gameId).update({ status: 'playing', gameState: getInitState(gameData.type, gameData.timerSetting), rematch: [], winner: null });
            } else {
                await db.collection('bma_chat_games').doc(gameId).update({ rematch: rm });
            }
        }
    };

    const handleShare = async () => {
        const mid = 'msg-' + Date.now() + Math.floor(Math.random()*1000);
        await db.collection('bma_messages').doc(mid).set({
            id: mid, roomKey, senderId: currentUser.id, receiverId: activeRoom.type==='dm'?activeRoom.id:null,
            text: '🏆 แชร์ผลการแข่งขัน: ' + (gameData.name || CHAT_GAMES_LIST[gameData.type]),
            isGameResult: true, gameId, gameType: gameData.type, gameName: gameData.name || CHAT_GAMES_LIST[gameData.type],
            gameResultData: { winner: gameData.winner },
            readBy: [currentUser.id], isDeleted: false, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), timestamp: Date.now(), serverCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        onClose();
    };

    return (
        <Modal title={"🎮 " + (gameData.name || CHAT_GAMES_LIST[gameData.type])} onClose={onClose} maxW="max-w-3xl">
            <div className="flex flex-col gap-2 bg-[#0B1325] p-3 rounded-lg border border-[#1E3A5F] mb-4">
                <div className="flex flex-wrap justify-center items-center gap-4">
                    {Array.from({length: gameData.type === 'snl' ? 4 : 2}).map((_, i) => {
                        const pId = gameData.players[i];
                        const isTurn = gameData.status === 'playing' && (gameData.gameState?.turn === i+1 || (i===0 && gameData.gameState?.turn==='w') || (i===1 && gameData.gameState?.turn==='b'));
                        if(!pId && gameData.type !== 'snl') return <div key={i} className="text-slate-500">รอผู้เล่น...</div>;
                        if(!pId) return null;
                        return (
                            <div key={i} className="flex items-center gap-2 bg-[#050811] px-3 py-1.5 rounded-full border border-white/10">
                                <Avatar size="sm" user={getAuthor(pId)} />
                                <span className={isTurn ? 'font-bold text-amber-300 text-xs' : 'text-slate-300 text-xs'}>{getAuthor(pId).displayName}</span>
                            </div>
                        );
                    })}
                </div>
                {gameData.status === 'waiting' && gameData.type === 'snl' && isPlayer1 && gameData.players.length >= 2 && (
                    <button onClick={() => db.collection('bma_chat_games').doc(gameId).update({ status: 'playing', gameState: getInitState('snl', null) })} className="btn-w text-xs py-1.5 px-6 self-center animate-pulse mt-2">▶ เริ่มเลย ({gameData.players.length}/4 คน)</button>
                )}
            </div>

            {gameData.status === 'ended' && (
                <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-lg text-center mb-4">
                    <h2 className="text-xl font-bold text-amber-400 mb-2">เกมจบแล้ว!</h2>
                    <p className="mb-4 text-sm font-bold">ผู้ชนะ: {gameData.winner === 'draw' ? 'เสมอ' : getAuthor(gameData.winner)?.displayName}</p>
                    <div className="flex gap-2 justify-center">
                        {!isSpectator && rematchTimer > 0 && (
                            <button onClick={handleRematch} disabled={(gameData.rematch||[]).includes(currentUser.id)} className="btn-w text-xs px-3">
                                {(gameData.rematch||[]).includes(currentUser.id) ? 'รอคู่แข่งยืนยัน...' : `เล่นอีกครั้ง (${rematchTimer}s)`}
                            </button>
                        )}
                        <button onClick={handleShare} className="btn-b text-sky-300 border-sky-400/50 text-xs">📤 แชร์ผลลัพธ์ลงแชต</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 bg-[#0B1325] p-4 rounded-xl border border-[#1E3A5F] text-xs h-fit max-h-48 md:max-h-full overflow-y-auto">
                    <h3 className="font-bold text-amber-300 mb-3 text-sm">📜 กติกาและวิธีเล่น</h3>
                    {gameData.type === 'chess' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>ผลัดกันเดินหมากตามกฎมาตรฐานสากล</li><li>คลิกที่หมากของตนเอง ระบบจะไฮไลต์ช่องที่เดินได้</li><li>หากเปิดโหมดจับเวลา เวลาจะเริ่มเดินอัตโนมัติ และสลับฝั่งเมื่อวางหมากสำเร็จ</li><li>ฝ่ายใดรุกฆาต (Checkmate) หรือคู่แข่งเวลาหมด จะเป็นผู้ชนะ</li></ul>}
                    {gameData.type === 'checkers' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>เดินเฉียงไปข้างหน้าทีละ 1 ช่อง</li><li>เข้าฮอส (ไปถึงขอบสุดฝั่งตรงข้าม) จะสามารถเดินหน้า-หลังได้ทีละ 1 ช่อง</li><li>ต้องกระโดดกินหมากฝ่ายตรงข้ามหากมีโอกาส</li><li>ฝ่ายไหนถูกกินจนหมด หรือไม่มีตาเดิน จะเป็นผู้แพ้</li></ul>}
                    {gameData.type === 'snl' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>ผลัดกันกดปุ่มทอยลูกเต๋า</li><li>หากตกที่โคนบันได จะได้เลื่อนขึ้นไปจุดสูงสุดของบันได</li><li>หากตกที่หัวงู จะต้องลื่นลงมาที่หางงู</li><li>ใครเดินทางไปถึงช่อง 100 ได้ก่อน จะเป็นผู้ชนะ</li></ul>}
                    {gameData.type === 'connect4' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>ผลัดกันหยอดเหรียญลงในช่อง</li><li>ใครเรียงสีตัวเองให้ติดกันครบ 4 อัน (แนวตั้ง แนวนอน หรือแนวทแยง) ก่อน จะเป็นผู้ชนะ</li></ul>}
                    {gameData.type === 'domino' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>ผลัดกันต่อโดมิโนให้แต้มตรงกับปลายด้านใดด้านหนึ่ง</li><li>หากไม่มีไพ่ให้ลง ต้องจั่วไพ่ 1 ครั้ง</li><li>ถ้าจั่วแล้วยังลงไม่ได้ (หรือไพ่กองกลางหมด) ให้กดข้ามตา</li><li>ใครไพ่หมดมือคนแรกชนะ! (ถ้าข้ามตาทั้งคู่เกมจะจบลงแบบเสมอ)</li></ul>}
                    {gameData.type === 'sttt' && <ul className="space-y-2 text-slate-300 list-disc pl-4"><li>ระบบจะสุ่มกระดานย่อยให้คุณเล่นในแต่ละตา</li><li>กระดานไหนที่มีคนชนะแล้วจะถูกล็อกไว้</li><li>ใครชนะกระดานย่อยเรียงติดกัน 3 แนว (เหมือน XO ปกติ) จะเป็นผู้ชนะ!</li></ul>}
                </div>

                <div className="w-full md:w-2/3 flex justify-center items-center flex-col relative select-none touch-none bg-[#050811] rounded-xl p-2 py-4 border border-[#1E3A5F]">
                    {gameData.type === 'chess' && <ChessInner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} currentUser={currentUser} />}
                    {gameData.type === 'checkers' && <CheckersInner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} currentUser={currentUser} />}
                    {gameData.type === 'snl' && <SnlInner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} getAuthor={getAuthor} currentUser={currentUser} />}
                    {gameData.type === 'connect4' && <Connect4Inner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} currentUser={currentUser} />}
                    {gameData.type === 'domino' && <DominoInner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} currentUser={currentUser} />}
                    {gameData.type === 'sttt' && <StttInner gameData={gameData} isPlayer1={isPlayer1} isPlayer2={isPlayer2} isSpectator={isSpectator} gameId={gameId} db={db} currentUser={currentUser} />}
                </div>
            </div>
        </Modal>
    );
}