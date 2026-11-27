export const GAMES = [
  { id: 'sudoku', name: 'Sudoku (9x9)', icon: '🔢', faIcon: 'fas fa-th', desc: 'เติมตัวเลข 1-9 ให้ครบทุกแถว คอลัมน์ และตารางย่อย', iconCls: 'bg-sky-500/15 text-sky-400 border-sky-500/40', hoverCls: 'hover:border-sky-400/70 hover:shadow-[0_0_20px_rgba(56,189,248,0.18)]', barCls: 'bg-sky-400' },
  { id: 'minesweeper', name: 'Minesweeper', icon: '💣', faIcon: 'fas fa-bomb', desc: 'กู้ระเบิดบนกระดาน 9x9 ให้ครบทุกช่องโดยไม่พลาด', iconCls: 'bg-red-500/15 text-red-400 border-red-500/40', hoverCls: 'hover:border-red-400/70 hover:shadow-[0_0_20px_rgba(248,113,113,0.18)]', barCls: 'bg-red-400' },
  { id: 'flag', name: 'Flag Guesser', icon: '🏳️', faIcon: 'fas fa-flag', desc: 'ทายธงชาติให้ถูกต่อเนื่อง 3 ประเทศ ผิดครั้งเดียวจบ', iconCls: 'bg-amber-500/15 text-amber-400 border-amber-500/40', hoverCls: 'hover:border-amber-400/70 hover:shadow-[0_0_20px_rgba(251,191,36,0.18)]', barCls: 'bg-amber-400' },
  { id: 'solitaire', name: 'Solitaire', icon: '🃏', faIcon: 'fas fa-clone', desc: 'เรียงไพ่ทั้ง 4 ดอกให้ครบสำรับในเวลาที่เร็วที่สุด', iconCls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40', hoverCls: 'hover:border-indigo-400/70 hover:shadow-[0_0_20px_rgba(129,140,248,0.18)]', barCls: 'bg-indigo-400' },
  { id: 'wordle', name: 'Wordle', icon: '🔤', faIcon: 'fas fa-spell-check', desc: 'ทายคำศัพท์ภาษาอังกฤษ 5 ตัวอักษรภายใน 6 ครั้ง', iconCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', hoverCls: 'hover:border-emerald-400/70 hover:shadow-[0_0_20px_rgba(52,211,153,0.18)]', barCls: 'bg-emerald-400' },
  { id: 'snake', name: 'Snake', icon: '🐍', faIcon: 'fas fa-dragon', desc: 'บังคับงูเก็บแต้มให้ได้มากที่สุด ห้ามชนหางตัวเอง', iconCls: 'bg-lime-500/15 text-lime-400 border-lime-500/40', hoverCls: 'hover:border-lime-400/70 hover:shadow-[0_0_20px_rgba(163,230,53,0.18)]', barCls: 'bg-lime-400' },
  { id: '2048', name: '2048 (100 Moves)', icon: '🟨', faIcon: 'fas fa-cubes', desc: 'รวมตัวเลขทำคะแนนสูงสุดภายในโควตา 100 ครั้ง', iconCls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40', hoverCls: 'hover:border-yellow-400/70 hover:shadow-[0_0_20px_rgba(250,204,21,0.18)]', barCls: 'bg-yellow-400' },
  { id: '24game', name: 'Daily 24', icon: '➗', faIcon: 'fas fa-calculator', desc: 'นำเลขโดด 4 ตัวมาบวก ลบ คูณ หาร ให้ได้ 24 พอดี', iconCls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40', hoverCls: 'hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(34,211,238,0.18)]', barCls: 'bg-cyan-400' },
  { id: 'resistor', name: 'Resistor Code', icon: '🔌', faIcon: 'fas fa-microchip', desc: 'เลือกแถบสีตัวต้านทาน 4 แถบให้ตรงค่า (โอกาส 3 ครั้ง)', iconCls: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/40', hoverCls: 'hover:border-fuchsia-400/70 hover:shadow-[0_0_20px_rgba(232,121,249,0.18)]', barCls: 'bg-fuchsia-400' }
];

export const CHAT_GAMES_LIST = {
  chess: 'หมากรุกสากล',
  checkers: 'หมากฮอสสากล',
  snl: 'บันไดงู',
  connect4: 'Connect 4',
  domino: 'โดมิโน',
  sttt: 'Super Tic-Tac-Toe'
};