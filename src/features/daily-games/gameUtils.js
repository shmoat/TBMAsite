export const GAME_RULES = {
  sudoku: [
    'เติมตัวเลข 1–9 ลงในช่องว่าง โดยห้ามซ้ำกันในแถวแนวนอน แนวตั้ง และตารางย่อย 3×3',
    'มีไฮไลต์แถว/หลัก/บล็อก, ปุ่มย้อนกลับ (Undo / Ctrl+Z) และตัวเลขบอกจำนวนที่ยังเหลือบนแป้นกด',
    'PC: ใช้แป้นพิมพ์เลข 1–9, ปุ่มลูกศร และ Backspace เพื่อเล่นได้เร็วขึ้น'
  ],
  minesweeper: [
    'เปิดช่องที่ปลอดภัยทั้งหมดบนกระดาน 9×9 (มีระเบิดสุ่ม 10–16 ลูกต่อวัน)',
    'Chording: เมื่อปักธงรอบช่องตัวเลขครบตามจำนวนแล้ว แตะซ้ำที่ตัวเลขเพื่อเปิดช่องรอบข้างทันที',
    'มือถือ: แตะค้างที่ช่องเพื่อปักธงได้ทันที • PC: คลิกซ้ายขุด / คลิกขวาปักธง'
  ],
  flag: [
    'ทายชื่อประเทศจากภาพธงชาติให้ถูกต้องต่อเนื่องครบ 3 ด่าน (ตอบผิดครั้งเดียวจบ)',
    'มีตัวช่วย 50/50 ตัดตัวเลือกผิดออก 2 ข้อ ใช้ได้ 1 ครั้งต่อวัน โดยแลกกับเวลาเพิ่ม +15 วินาที',
    'จัดอันดับจากจำนวนด่านที่ตอบถูก หากเท่ากันวัดกันที่เวลาเร็วที่สุด'
  ],
  solitaire: [
    'เรียงไพ่จาก A → K แยกตามดอกทั้ง 4 ช่องด้านบนให้ครบสำรับ',
    'ลากไพ่ไปวาง หรือแตะที่ไพ่ 1 ครั้งเพื่อให้ระบบย้ายให้อัตโนมัติ',
    'เมื่อเปิดไพ่คว่ำหมดและกองจั่วว่าง ปุ่ม "เก็บไพ่อัตโนมัติ" จะปรากฏขึ้นให้กดจบเกมได้ทันที'
  ],
  wordle: [
    'ทายคำศัพท์ภาษาอังกฤษ 5 ตัวอักษรให้ถูกต้องภายใน 6 ครั้ง (คลังคำศัพท์ 340+ คำ)',
    'สีเขียว = ถูกตัวและถูกตำแหน่ง • สีเหลือง = มีตัวนี้ในคำแต่ผิดตำแหน่ง • สีเทา = ไม่มีในคำ',
    'แชร์ผลลง Board หรือ Chat จะแนบตารางสี 🟩🟨⬛ ให้เพื่อนลุ้นโดยไม่สปอยล์คำเฉลย'
  ],
  snake: [
    'บังคับงูเก็บแอปเปิลแดง (+1) และแอปเปิลทองคำจับเวลา (+3) บนแผนที่กำแพงประจำวัน',
    'งูสามารถเดินทะลุขอบกระดานไปโผล่อีกฝั่งได้ แต่ห้ามชนลำตัวงูเองหรือกำแพงสีเทา',
    'มือถือ: ปัดนิ้วบนกระดานหรือกดปุ่มลูกศร • PC: ใช้ปุ่มลูกศร หรือ W A S D'
  ],
  '2048': [
    'เลื่อนกระดานเพื่อรวมบล็อกตัวเลขเดียวกันให้ค่าเพิ่มขึ้นเรื่อยๆ',
    'มีโควตาการขยับทั้งหมด 100 ครั้งต่อวัน (มีสัญญาณเตือนเมื่อเข้าสู่ 10 ตาสุดท้าย)',
    'ปัดหน้าจอบนมือถือ หรือใช้ปุ่มลูกศร / W A S D บนคีย์บอร์ด'
  ],
  '24game': [
    'แตะการ์ดใบแรก → แตะเครื่องหมาย (+ − × ÷) → แตะการ์ดใบที่สอง เพื่อรวมเลขทั้ง 4 ใบให้ได้ 24 พอดี',
    'มีปุ่มย้อนกลับ (Undo) และเริ่มใหม่ (Reset) สามารถกดยอมแพ้เพื่อดูเฉลยตัวอย่างได้',
    'ทุกโจทย์ประจำวันผ่านการตรวจสอบแล้วว่ามีคำตอบที่ทำได้ 24 แน่นอน'
  ],
  resistor: [
    'เลือกแถบสี 4 แถบ (หลักที่ 1 → หลักที่ 2 → ตัวคูณ → ความคลาดเคลื่อน) แล้วกดทดสอบวงจร',
    'แตะที่แถบสีบนตัวต้านทานหรือป้ายด้านล่างเพื่อแก้เฉพาะแถบที่ต้องการได้ทันที',
    'มีโอกาสทดสอบ 3 ครั้ง หากพลาดครบ 3 ครั้งวงจรจะระเบิดพร้อมเฉลยแถบสีที่ถูกต้อง'
  ]
};

export const getPrevDateStr = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

export const getUserActiveStreak = (user, todayStr) => {
  const ds = user?.dailyStreak;
  if (!ds || !ds.lastDate || !ds.count) return 0;
  if (ds.lastDate === todayStr || ds.lastDate === getPrevDateStr(todayStr)) return ds.count;
  return 0;
};

export const sortScores = (list, gIdx) => {
  return [...list].sort((a, b) => {
    if (gIdx === 2) return (b.score || 0) - (a.score || 0) || a.timeMs - b.timeMs;
    if (gIdx === 4) return (a.score || 99) - (b.score || 99) || a.timeMs - b.timeMs;
    if (gIdx === 5) return (b.score || 0) - (a.score || 0) || a.timeMs - b.timeMs;
    if (gIdx === 6) return (b.score || 0) - (a.score || 0) || a.timeMs - b.timeMs;
    if (gIdx === 8) return (b.score || 0) - (a.score || 0) || a.timeMs - b.timeMs;
    return a.timeMs - b.timeMs;
  });
};

export const F1_RANK_PTS = [10, 8, 6, 5, 4, 3, 2, 1];

export const computeOverallStandings = (scoresList, sortScoresFn = sortScores) => {
  const byDate = {};
  scoresList.forEach((s) => {
    if (!s || !s.date || !s.userId) return;
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });

  const totals = {};
  Object.entries(byDate).forEach(([dateKey, dayList]) => {
    for (let gIdx = 0; gIdx < 9; gIdx++) {
      const gScores = dayList.filter((s) => s.gameIndex === gIdx);
      const valid = gScores.filter((s) => !(s.status === 'lost_bomb' || s.timeMs === Infinity || (s.status === 'lost' && !(gIdx === 2 && (s.score || 0) > 0))));
      const ranked = sortScoresFn([...valid], gIdx);
      ranked.forEach((rec, rIdx) => {
        if (!totals[rec.userId]) {
          totals[rec.userId] = { userId: rec.userId, points: 0, clears: 0, firsts: 0, daysSet: new Set() };
        }
        const rankPt = F1_RANK_PTS[rIdx] ?? 1;
        totals[rec.userId].points += rankPt + 2;
        totals[rec.userId].clears += 1;
        if (rIdx === 0) totals[rec.userId].firsts += 1;
        totals[rec.userId].daysSet.add(dateKey);
      });
    }
  });

  return Object.values(totals)
    .map((t) => ({ ...t, daysPlayed: t.daysSet.size }))
    .sort((a, b) => b.points - a.points || b.clears - a.clears || b.firsts - a.firsts);
};