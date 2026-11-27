import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { getBkkNow, getGameDateStr, useStickyState, isGameSfxMuted, playGameSfx } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar, Modal } from '../../components/BasicUI';
import { KrathongSVG, KRATHONG_BASES, KRATHONG_FLOWERS, KRATHONG_TOPPERS } from '../../components/KrathongSVG';

const SIEMSI_FORTUNES = [
  { num: 1, tier: 'มหาโชค', title: 'จันทร์เพ็ญส่องฟ้า วาสนามาเยือน', main: 'ดวงชะตาสว่างไสวดั่งพระจันทร์เต็มดวง สิ่งที่ลงแรงไว้กำลังจะออกดอกออกผลอย่างงดงาม', work: 'โปรเจกต์และการเรียนราบรื่น มีผู้ใหญ่คอยหนุนหลัง', love: 'คนโสดมีเกณฑ์พบรักจากการเดินทาง คนมีคู่เข้าใจกันดี', luckyNum: '09, 15, 89' },
  { num: 2, tier: 'โชคดี', title: 'สายน้ำพัดพา โอกาสใหม่ไหลมา', main: 'เรื่องหนักใจกำลังจะลอยไปกับสายน้ำ เปิดทางให้โอกาสใหม่ๆ เข้ามาในชีวิต', work: 'เหมาะกับการเริ่มต้นสิ่งใหม่หรือสมัครงาน/ฝึกงาน', love: 'มิตรภาพอบอุ่น มีคนแอบชื่นชมอยู่ห่างๆ', luckyNum: '12, 24, 64' },
  { num: 3, tier: 'ปานกลาง', title: 'เรือแล่นทวนน้ำ ต้องอาศัยความเพียร', main: 'อาจมีอุปสรรคเล็กน้อยให้ต้องใจเย็น หากไม่เร่งรีบจะผ่านไปได้ด้วยดี', work: 'รอบคอบเรื่องเอกสารและเดดไลน์ อย่าผัดวันประกันพรุ่ง', love: 'สื่อสารกันตรงๆ จะลดความเข้าใจผิดได้มาก', luckyNum: '03, 35, 71' },
  { num: 4, tier: 'มหาโชค', title: 'บัวพ้นน้ำ งดงามเหนือใคร', main: 'ความพยายามที่ผ่านมาไม่สูญเปล่า เตรียมรับข่าวดีที่รอคอยมานาน', work: 'ผลสอบและผลงานโดดเด่นกว่าที่คาดไว้', love: 'เสน่ห์แรงเป็นพิเศษ มีคนเข้าหาด้วยความจริงใจ', luckyNum: '14, 48, 94' },
  { num: 5, tier: 'โชคดี', title: 'โคมลอยสูงสู่ดาว ฝันใกล้เป็นจริง', main: 'จินตนาการและไอเดียของคุณจะกลายเป็นจุดขายสำคัญในช่วงนี้', work: 'งานสร้างสรรค์หรืองานกลุ่มจะปังเป็นพิเศษ', love: 'มีโมเมนต์น่ารักๆ จากคนใกล้ตัวให้ยิ้มไม่หุบ', luckyNum: '05, 52, 75' },
  { num: 6, tier: 'เตือนสติ', title: 'คลื่นลมยามค่ำ อย่าประมาท', main: 'ช่วงนี้ควรพักผ่อนให้เพียงพอและระวังการตัดสินใจแบบใจร้อน', work: 'เช็กงานซ้ำสองรอบก่อนส่ง จะช่วยรอดพ้นจุดพลาดได้', love: 'ให้พื้นที่ส่วนตัวกันบ้างแล้วความสัมพันธ์จะดีขึ้น', luckyNum: '06, 16, 60' },
  { num: 7, tier: 'โชคดี', title: 'แสงเทียนนำทาง มิตรแท้เคียงข้าง', main: 'ไม่ว่าจะเจอเรื่องอะไร จะมีเพื่อนและคนรอบข้างคอยยื่นมือช่วยเสมอ', work: 'ลองปรึกษาเพื่อนร่วมทีม จะได้ทางออกที่คาดไม่ถึง', love: 'ความสัมพันธ์ค่อยเป็นค่อยไปแต่มั่นคง', luckyNum: '07, 27, 79' },
  { num: 8, tier: 'มหาโชค', title: 'ทรัพย์ไหลมา ดุจธาราไม่ขาดสาย', main: 'ดวงการเงินและโชคลาภเปิดกว้าง มีเกณฑ์ได้รับของขวัญหรือรายได้เสริม', work: 'งานเสริมหรือโปรเจกต์พิเศษสร้างผลตอบแทนดีเยี่ยม', love: 'พากันไปกินของอร่อยจะยิ่งเสริมดวงความรัก', luckyNum: '08, 28, 88' },
  { num: 9, tier: 'มหาโชค', title: 'เก้ามงคล ก้าวหน้าไร้ขีดจำกัด', main: 'เป็นใบเซียมซีแห่งความก้าวหน้า ทำสิ่งใดก็มีแรงส่งให้สำเร็จอย่างรวดเร็ว', work: 'โอกาสเลื่อนขั้น สอบผ่าน หรือชนะการแข่งขันสูงมาก', love: 'คนคุยมีแนวโน้มพัฒนาสถานะอย่างชัดเจน', luckyNum: '09, 19, 99' },
  { num: 10, tier: 'โชคดี', title: 'ฟ้าหลังฝน อากาศสดใส', main: 'ปัญหาค้างคาใจที่รบกวนมานานกำลังจะคลี่คลายในเร็ววัน', work: 'ภาระงานที่หนักกำลังจะเบาลงและเข้าที่เข้าทาง', love: 'ปรับความเข้าใจกันได้ลงตัว หวานชื่นกว่าเดิม', luckyNum: '10, 40, 81' },
  { num: 11, tier: 'ปานกลาง', title: 'ทางแยกสองแพร่ง ใช้ใจนำทาง', main: 'กำลังมีตัวเลือกเข้ามาให้ตัดสินใจ จงเลือกทางที่สอดคล้องกับเป้าหมายระยะยาว', work: 'จัดลำดับความสำคัญให้ดี อย่าแบกรับทุกอย่างไว้คนเดียว', love: 'อย่ามัวลังเล หากรู้สึกดีให้แสดงออกอย่างชัดเจน', luckyNum: '11, 21, 51' },
  { num: 12, tier: 'โชคดี', title: 'เพ็ญเดือนสิบสอง สมหวังดังปอง', main: 'คำอธิษฐานที่ตั้งใจไว้มีเกณฑ์สมปรารถนา โดยเฉพาะเรื่องที่เกี่ยวกับความสามารถของตัวเอง', work: 'ได้แสดงฝีมือเต็มที่และได้รับคำชมเชย', love: 'มีเกณฑ์ได้ไปเที่ยวหรือทำกิจกรรมร่วมกับคนพิเศษ', luckyNum: '12, 32, 92' },
  { num: 13, tier: 'เตือนสติ', title: 'ระวังคำพูด และการใช้จ่าย', main: 'ช่วงนี้รายจ่ายจุกจิกอาจเข้ามาเยอะ ควรวางแผนงบประมาณไว้ล่วงหน้า', work: 'หลีกเลี่ยงการถกเถียงที่ไร้ประโยชน์ โฟกัสที่ผลลัพธ์', love: 'ฟังให้มากกว่าพูด จะรักษาบรรยากาศดีๆ ไว้ได้', luckyNum: '13, 31, 63' },
  { num: 14, tier: 'โชคดี', title: 'ลมพัดเย็นใจ ข่าวดีจากแดนไกล', main: 'มีเกณฑ์ได้รับการติดต่อจากเพื่อนเก่า หรือข่าวดีเกี่ยวกับการเดินทาง', work: 'การประสานงานกับคนนอกองค์กรหรือต่างสถาบันราบรื่น', love: 'รักทางไกลหรือคนต่างถิ่นจะนำความสุขมาให้', luckyNum: '14, 44, 74' },
  { num: 15, tier: 'มหาโชค', title: 'จันทร์กระจ่างฟ้า สมดุลทุกด้าน', main: 'ทั้งสุขภาพ การงาน และจิตใจอยู่ในจังหวะที่ลงตัวที่สุดช่วงหนึ่งของปี', work: 'ทำอะไรก็จับจังหวะถูก เวลาเป๊ะ งานเสร็จไว', love: 'อบอุ่น สบายใจ เป็นเซฟโซนของกันและกัน', luckyNum: '15, 55, 95' },
  { num: 16, tier: 'ปานกลาง', title: 'ค่อยๆ เติมไฟ อย่าหักโหม', main: 'ไฟในการทำงานยังดีอยู่ แต่อย่าลืมให้รางวัลตัวเองและพักสายตาบ้าง', work: 'วางแผนอ่านหนังสือหรือทำงานเป็นรอบสั้นๆ จะได้ผลดีกว่า', love: 'เรื่อยๆ สบายๆ ไม่หวือหวาแต่ไม่เหนื่อยใจ', luckyNum: '16, 26, 68' },
  { num: 17, tier: 'โชคดี', title: 'ดาวนำโชค ศิลปะและดนตรีหนุนดวง', main: 'อารมณ์สุนทรีย์และงานอดิเรกจะนำพาเพื่อนใหม่และแรงบันดาลใจดีๆ มาให้', work: 'ไอเดียใหม่ๆ ผุดขึ้นตอนกำลังผ่อนคลาย อย่าลืมจดไว้', love: 'คุยถูกคอเรื่องเพลง หนัง หรือความชอบคล้ายกัน', luckyNum: '17, 37, 77' },
  { num: 18, tier: 'เตือนสติ', title: 'อย่าเพิ่งเชื่อลมปาก ตรวจสอบให้ชัด', main: 'ก่อนรับปากหรือลงทุนลงแรงเรื่องใหญ่ ควรเช็กข้อมูลให้รอบด้านก่อนเสมอ', work: 'สำรองไฟล์งานสำคัญไว้เสมอ ป้องกันเหตุฉุกเฉิน', love: 'ดูกันไปยาวๆ อย่ารีบด่วนสรุปจากเรื่องเล็กน้อย', luckyNum: '18, 48, 80' },
  { num: 19, tier: 'โชคดี', title: 'แสงทองสาดส่อง พลังบวกล้นเหลือ', main: 'รอยยิ้มและทัศนคติที่ดีของคุณจะดึงดูดเรื่องดีๆ และคนดีๆ เข้ามา', work: 'การทำงานเป็นทีมเข้าขากันมาก ปิดจ๊อบได้สวยงาม', love: 'บรรยากาศสดใส มีโอกาสได้ของถูกใจจากคนใกล้ชิด', luckyNum: '19, 29, 90' },
  { num: 20, tier: 'ปานกลาง', title: 'น้ำนิ่งไหลลึก เก็บเกี่ยวประสบการณ์', main: 'แม้ภายนอกจะดูเงียบๆ แต่คุณกำลังสะสมทักษะสำคัญที่จะใช้ได้จริงในอนาคต', work: 'เหมาะกับการทบทวนความรู้และเก็บรายละเอียดงาน', love: 'ความสัมพันธ์แบบเพื่อนที่รู้ใจค่อยๆ แน่นแฟ้นขึ้น', luckyNum: '20, 42, 62' },
  { num: 21, tier: 'มหาโชค', title: 'มงกุฎแห่งความสำเร็จ คว้าชัยเกินคาด', main: 'สิ่งที่ลุ้นอยู่มีโอกาสสำเร็จสูงมาก ความมั่นใจคืออาวุธลับของคุณ', work: 'การสอบ พรีเซนต์ หรือยื่นข้อเสนอผ่านฉลุย', love: 'ความรักลงตัว มีข่าวดีให้ฉลองร่วมกัน', luckyNum: '21, 51, 91' },
  { num: 22, tier: 'โชคดี', title: 'คู่บุญหนุนนำ ทำสิ่งใดก็ลงตัว', main: 'การร่วมมือกับคนอื่นจะสร้างผลลัพธ์ดีกว่าทำคนเดียวหลายเท่า', work: 'พาร์ทเนอร์หรือเพื่อนในกลุ่มช่วยแบ่งเบาภาระได้เยอะ', love: 'คนโสดมีลุ้นเจอคนศีลเสมอกัน คนมีคู่หวานชื่น', luckyNum: '22, 44, 82' },
  { num: 23, tier: 'เตือนสติ', title: 'ปลดปล่อยความกังวล ปล่อยวางเรื่องเก่า', main: 'อย่าเก็บเรื่องที่ผ่านไปแล้วมาบั่นทอนใจ ลอยความทุกข์ไปกับสายน้ำคืนนี้', work: 'หากติดขัดลองเปลี่ยนมุมมองหรือพักสักครู่แล้วค่อยลุยใหม่', love: 'เปิดใจรับสิ่งใหม่ๆ อย่าขังตัวเองไว้กับอดีต', luckyNum: '23, 39, 73' },
  { num: 24, tier: 'มหาโชค', title: 'พระจันทร์สีน้ำเงิน อวยพรให้สมหวัง', main: 'ใบเซียมซีพิเศษประจำสมาคม! พลังแห่งจันทราจะคุ้มครองให้ปีหน้าเป็นปีทองของคุณ', work: 'ทุกเส้นทางที่เลือกเดินจะเปิดกว้างและมั่นคง', love: 'รายล้อมด้วยกัลยาณมิตรและความรักที่อบอุ่น', luckyNum: '24, 59, 98' }
];

const playLoySfx = (type = 'shake') => {
  if (isGameSfxMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const blip = (f1, f2, dur, wave = 'triangle', vol = 0.08, delay = 0) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(f1, now + delay);
      if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(f2, now + delay + dur);
      g.gain.setValueAtTime(0.001, now + delay);
      g.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };
    if (type === 'shake') {
      for (let i = 0; i < 6; i++) blip(280 + (i % 3) * 90, 190, 0.05, 'triangle', 0.07, i * 0.14);
    } else if (type === 'stick') {
      blip(520, 780, 0.12, 'sine', 0.09, 0);
      blip(780, 1046, 0.22, 'triangle', 0.09, 0.1);
    } else if (type === 'float') {
      blip(360, 540, 0.18, 'sine', 0.07, 0);
      blip(540, 720, 0.25, 'sine', 0.06, 0.12);
    } else if (type === 'bless') {
      blip(660, 880, 0.14, 'sine', 0.07, 0);
    } else if (type === 'powerup') {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, f * 1.05, 0.1, 'triangle', 0.09, i * 0.05));
    }
  } catch {}
};

const drawKrathongOnCanvas = (ctx, cx, cy, scale, design = {}) => {
  const base = KRATHONG_BASES.find((b) => b.id === design?.base) || KRATHONG_BASES[0];
  const flower = KRATHONG_FLOWERS.find((f) => f.id === design?.flower) || KRATHONG_FLOWERS[0];
  const topper = design?.topper || 'candle';

  ctx.save();
  ctx.translate(cx - 60 * scale, cy - 53 * scale);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.beginPath();
  ctx.ellipse(60, 92, 48, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (topper === 'candle') {
    ctx.strokeStyle = '#A16207';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(51, 30); ctx.lineTo(49, 54);
    ctx.moveTo(69, 30); ctx.lineTo(71, 54);
    ctx.stroke();
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(51, 29, 2.5, 0, Math.PI * 2);
    ctx.arc(69, 29, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE68A';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.4;
    ctx.fillRect(56.5, 34, 7, 24);
    ctx.strokeRect(56.5, 34, 7, 24);
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(60, 14); ctx.quadraticCurveTo(66, 24, 60, 33); ctx.quadraticCurveTo(54, 24, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.moveTo(60, 20); ctx.quadraticCurveTo(63, 26, 60, 32); ctx.quadraticCurveTo(57, 26, 60, 20);
    ctx.fill();
  } else if (topper === 'sparkler') {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(60, 26); ctx.lineTo(60, 56);
    ctx.stroke();
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(60, 10); ctx.lineTo(60, 38);
    ctx.moveTo(46, 24); ctx.lineTo(74, 24);
    ctx.moveTo(50, 14); ctx.lineTo(70, 34);
    ctx.moveTo(70, 14); ctx.lineTo(50, 34);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(60, 24, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(60, 36); ctx.lineTo(60, 56);
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(58, 26, 13, 0.35 * Math.PI, 1.65 * Math.PI, false);
    ctx.quadraticCurveTo(54, 26, 63, 37);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  [28, 44, 60, 76, 92].forEach((fx, i) => {
    const fy = i % 2 === 0 ? 58 : 54;
    ctx.fillStyle = flower.main;
    ctx.strokeStyle = flower.light;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(fx, fy, i === 2 ? 10 : 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = base.light;
  ctx.beginPath();
  ctx.moveTo(16, 62); ctx.lineTo(24, 50); ctx.lineTo(36, 62); ctx.lineTo(48, 49);
  ctx.lineTo(60, 62); ctx.lineTo(72, 49); ctx.lineTo(84, 62); ctx.lineTo(96, 50); ctx.lineTo(104, 62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = base.main;
  ctx.strokeStyle = base.light;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 62); ctx.quadraticCurveTo(60, 72, 104, 62);
  ctx.lineTo(95, 84); ctx.quadraticCurveTo(60, 94, 25, 84);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (base.id === 'bluemoon') {
    ctx.fillStyle = '#050811';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(60.5, 68); ctx.lineTo(53, 81); ctx.lineTo(67, 81); ctx.quadraticCurveTo(60, 76.5, 60.5, 68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

const generateSiemsiStoryDataUrl = (fortune, krathongDesign, ownerName, year, wishSnippet = '') => {
  return new Promise((resolve) => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const rRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };

    const wrapText = (text, x, y, maxW, lineH) => {
      const chars = Array.from(String(text || ''));
      let line = '';
      let curY = y;
      for (let i = 0; i < chars.length; i++) {
        const test = line + chars[i];
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, curY);
          line = chars[i];
          curY += lineH;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, curY);
      return curY + lineH;
    };

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#040914');
    bg.addColorStop(0.5, '#0A162C');
    bg.addColorStop(0.76, '#13284C');
    bg.addColorStop(1, '#040914');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const moonGlow = ctx.createRadialGradient(W / 2, 270, 30, W / 2, 270, 260);
    moonGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    moonGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.45)');
    moonGlow.addColorStop(1, 'rgba(4, 9, 20, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(W / 2, 270, 260, 0, Math.PI * 2);
    ctx.fill();

    const moonCore = ctx.createRadialGradient(W / 2 - 22, 248, 10, W / 2, 270, 96);
    moonCore.addColorStop(0, '#FEF9C3');
    moonCore.addColorStop(0.65, '#F59E0B');
    moonCore.addColorStop(1, '#B45309');
    ctx.fillStyle = moonCore;
    ctx.beginPath();
    ctx.arc(W / 2, 270, 96, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 42; i++) {
      const sx = ((i * 211) % 1000) + 40;
      const sy = ((i * 293) % 1300) + 60;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(254, 240, 138, 0.7)' : 'rgba(251, 191, 36, 0.35)';
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 4) + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 3;
    rRect(38, 38, W - 76, H - 76, 44);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 26px "Inter", "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`THE BLUE MOON ASSOCIATION • LOY KRATHONG ${year}`, W / 2, 115);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText(`คำทำนายเซียมซี & กระทงของ ${ownerName}`, W / 2, 435, W - 120);

    const cX = 86;
    const cY = 485;
    const cW = W - 172;
    const cH = 730;
    rRect(cX, cY, cW, cH, 36);
    ctx.fillStyle = 'rgba(10, 22, 44, 0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    rRect(W / 2 - 220, cY + 38, 440, 62, 31);
    ctx.fillStyle = '#D97706';
    ctx.fill();
    ctx.fillStyle = '#040914';
    ctx.font = 'bold 30px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText(`เซียมซีใบที่ ${fortune.num}  •  ${fortune.tier}`, W / 2, cY + 80);

    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 42px "Noto Sans Thai", "Inter", sans-serif';
    ctx.fillText(`"${fortune.title}"`, W / 2, cY + 178, cW - 80);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '500 31px "Noto Sans Thai", "Inter", sans-serif';
    const nextY = wrapText(fortune.main, W / 2, cY + 255, cW - 110, 48);

    const boxY = Math.max(nextY + 28, cY + 415);
    rRect(cX + 44, boxY, cW - 88, 185, 22);
    ctx.fillStyle = 'rgba(4, 9, 20, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 26px "Noto Sans Thai", sans-serif';
    ctx.fillText('การเรียน / การงาน:', cX + 74, boxY + 52);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 26px "Noto Sans Thai", sans-serif';
    ctx.fillText(fortune.work, cX + 74, boxY + 90, cW - 148);

    ctx.fillStyle = '#FBCFE8';
    ctx.font = 'bold 26px "Noto Sans Thai", sans-serif';
    ctx.fillText('ความรัก / มิตรภาพ:', cX + 74, boxY + 138);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 26px "Noto Sans Thai", sans-serif';
    ctx.fillText(fortune.love, cX + 74, boxY + 172, cW - 148);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 28px "JetBrains Mono", "Noto Sans Thai", monospace';
    ctx.fillText(`เลขมงคลประจำใบนี้: ${fortune.luckyNum}`, W / 2, cY + cH - 36);

    const riverGrad = ctx.createLinearGradient(0, 1340, 0, H);
    riverGrad.addColorStop(0, 'rgba(19, 40, 76, 0.4)');
    riverGrad.addColorStop(1, 'rgba(4, 9, 20, 0.98)');
    ctx.fillStyle = riverGrad;
    ctx.fillRect(42, 1360, W - 84, 518);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 4;
    for (let r = 0; r < 6; r++) {
      const rw = 260 + r * 90;
      ctx.beginPath();
      ctx.moveTo(W / 2 - rw / 2, 1620 + r * 32);
      ctx.lineTo(W / 2 + rw / 2, 1620 + r * 32);
      ctx.stroke();
    }

    drawKrathongOnCanvas(ctx, W / 2, 1495, 2.75, krathongDesign);

    const baseMeta = KRATHONG_BASES.find((b) => b.id === krathongDesign?.base) || KRATHONG_BASES[0];
    const flMeta = KRATHONG_FLOWERS.find((f) => f.id === krathongDesign?.flower) || KRATHONG_FLOWERS[0];
    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 28px "Noto Sans Thai", sans-serif';
    ctx.fillText(`กระทง DIY: ฐาน${baseMeta.label} • ดอก${flMeta.label}`, W / 2, 1710);

    if (wishSnippet) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'italic 26px "Noto Sans Thai", sans-serif';
      ctx.fillText(`"${wishSnippet.slice(0, 56)}"`, W / 2, 1765, W - 160);
    }

    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(window.location.host || 'The Blue Moon Association', W / 2, 1845);

    resolve(canvas.toDataURL('image/png'));
  });
};

function LoySiemsiShareModal({
  isOpen, onClose, fortune, krathongDesign, wishText, guestName,
  channels = [], myGroups = [], onShareToBoard, onShareToChat
}) {
  const { currentUser } = useAuth();
  const { openGuestPrompt } = useUI();

  const [view, setView] = useState('menu');
  const [storyImg, setStoryImg] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [boardNote, setBoardNote] = useState('');
  const [chatRoomId, setChatRoomId] = useState('global-lobby');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView('menu');
      setStoryImg('');
      setBoardNote('');
    }
  }, [isOpen]);

  if (!isOpen || !fortune) return null;

  const year = getBkkNow().getFullYear();
  const ownerName = currentUser ? currentUser.displayName : (guestName?.trim() || 'Guest');
  const shareableRooms = [
    ...channels.filter((c) => !c.isSystemReadOnly).map((c) => ({ id: c.id, label: `# ${c.name}` })),
    ...myGroups.filter((g) => !g.isArchived).map((g) => ({ id: g.id, label: `[กลุ่ม] ${g.name}` }))
  ];

  const openStory = async () => {
    setView('story');
    setStoryLoading(true);
    const url = await generateSiemsiStoryDataUrl(fortune, krathongDesign, ownerName, year, wishText);
    setStoryImg(url);
    setStoryLoading(false);
  };

  const downloadStory = () => {
    if (!storyImg) return;
    const a = document.createElement('a');
    a.href = storyImg;
    a.download = `loykrathong-siemsi-${fortune.num}-${year}.png`;
    a.click();
  };

  const nativeShareStory = async () => {
    if (!storyImg) return;
    try {
      const res = await fetch(storyImg);
      const blob = await res.blob();
      const file = new File([blob], `loykrathong-siemsi-${fortune.num}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `เซียมซีใบที่ ${fortune.num} • The Blue Moon`,
          text: `ได้เซียมซีใบที่ ${fortune.num} (${fortune.tier}) "${fortune.title}" พร้อมกระทง DIY ของฉัน!`
        });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    downloadStory();
  };

  return (
    <Modal
      title={
        view === 'story' ? 'ภาพสตอรี่เซียมซี & กระทง DIY (9:16)'
        : view === 'board' ? 'แชร์ผลเซียมซีลงกระดานโพสต์'
        : view === 'chat' ? 'ส่งผลเซียมซีเข้าห้องแชต'
        : 'แชร์ผลเซียมซีพร้อมกระทงของฉัน'
      }
      onClose={onClose}
      maxW="max-w-md"
    >
      <div className="space-y-3.5 text-xs">
        {view === 'menu' && (
          <>
            <div className="p-3 rounded-xl bg-[#040914] border border-amber-500/45 flex items-center gap-3">
              <div className="shrink-0 bg-[#0A162C] p-1.5 rounded-xl border border-amber-500/30">
                <KrathongSVG design={krathongDesign} size={58} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-amber-300">เซียมซีใบที่ {fortune.num} • {fortune.tier}</div>
                <div className="text-white font-bold truncate">"{fortune.title}"</div>
                <div className="text-[10px] text-slate-400 mt-0.5">จะแนบกระทง DIY ที่คุณออกแบบไปด้วยอัตโนมัติ</div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={openStory}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-700/80 via-amber-600/70 to-orange-700/80 hover:brightness-110 border border-amber-300/60 text-left flex items-center justify-between gap-3 transition-all shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/20 text-amber-200 flex items-center justify-center text-lg shrink-0">
                    <i className="fab fa-instagram"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm">บันทึกภาพสตอรี่ 9:16 (IG / FB)</div>
                    <div className="text-[10px] text-amber-100/85">สร้างภาพรวมใบเซียมซี + กระทง DIY ของคุณ (Guest ใช้ได้ฟรี)</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-amber-200 shrink-0"></i>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อแชร์ผลเซียมซีและกระทงลงกระดานโพสต์');
                  setView('board');
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${currentUser ? 'bg-[#050811] border-[#1E3A5F] hover:border-amber-400' : 'bg-[#050811]/60 border-[#1E3A5F]/50 opacity-75'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center justify-center text-base shrink-0">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>แชร์ลงกระดานโพสต์ (Board)</span>
                      {!currentUser && <i className="fas fa-lock text-[10px] text-amber-400"></i>}
                    </div>
                    <div className="text-[10px] text-slate-400">โพสต์การ์ดคำทำนายพร้อมโชว์กระทง DIY ของคุณ</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-slate-400 shrink-0"></i>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) return openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อส่งผลเซียมซีและกระทงเข้าห้องแชต');
                  setView('chat');
                }}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${currentUser ? 'bg-[#050811] border-[#1E3A5F] hover:border-emerald-400' : 'bg-[#050811]/60 border-[#1E3A5F]/50 opacity-75'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-base shrink-0">
                    <i className="fas fa-comments"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>ส่งเข้าห้องแชต (Chat)</span>
                      {!currentUser && <i className="fas fa-lock text-[10px] text-amber-400"></i>}
                    </div>
                    <div className="text-[10px] text-slate-400">อวดผลเซียมซีพร้อมกระทง DIY ในแชตรวมหรือกลุ่ม</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-slate-400 shrink-0"></i>
              </button>
            </div>
          </>
        )}

        {view === 'story' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white font-bold flex items-center gap-1.5">
              <i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น
            </button>
            <div className="bg-[#040914] border border-amber-500/35 rounded-2xl p-3 flex items-center justify-center min-h-[340px]">
              {storyLoading ? (
                <div className="text-amber-300 font-bold py-14 animate-pulse flex flex-col items-center gap-2">
                  <i className="fas fa-spinner fa-spin text-2xl"></i>
                  <span>กำลังสร้างภาพเซียมซีพร้อมกระทงของคุณ...</span>
                </div>
              ) : (
                <img src={storyImg} alt="Siemsi Story" className="max-h-[390px] w-auto rounded-xl border border-amber-400/40 shadow-2xl object-contain" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={storyLoading} onClick={nativeShareStory} className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#040914] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                <i className="fas fa-share-square"></i> แชร์สตอรี่
              </button>
              <button type="button" disabled={storyLoading} onClick={downloadStory} className="btn-w py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                <i className="fas fa-download"></i> บันทึก PNG
              </button>
            </div>
          </div>
        )}

        {view === 'board' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white font-bold flex items-center gap-1.5">
              <i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น
            </button>
            <textarea rows="3" maxLength={250} value={boardNote} onChange={(e) => setBoardNote(e.target.value)} placeholder={`ได้เซียมซีใบที่ ${fortune.num} (${fortune.tier}) คืนวันลอยกระทง!`} className="w-full inp text-xs resize-none" />
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onShareToBoard(fortune, krathongDesign, boardNote.trim());
                setBusy(false);
                onClose();
              }}
              className="w-full btn-w py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-clipboard-list'}`}></i>
              {busy ? 'กำลังโพสต์...' : 'ยืนยันแชร์ลง Board'}
            </button>
          </div>
        )}

        {view === 'chat' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setView('menu')} className="text-slate-400 hover:text-white font-bold flex items-center gap-1.5">
              <i className="fas fa-arrow-left"></i> กลับไปเลือกช่องทางอื่น
            </button>
            <select value={chatRoomId} onChange={(e) => setChatRoomId(e.target.value)} className="w-full inp py-2 text-xs bg-[#050811]">
              {shareableRooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onShareToChat(fortune, krathongDesign, chatRoomId);
                setBusy(false);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#040914] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
              {busy ? 'กำลังส่ง...' : 'ส่งการ์ดเซียมซี + กระทงเข้าแชต'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function LoyKrathongPage({
  sendNotif,
  todayStr = getGameDateStr(),
  onBackHome,
  channels = [],
  myGroups = [],
  onShareSiemsiToBoard,
  onShareSiemsiToChat
}) {
  const { currentUser, users, getAuthor } = useAuth();
  const { openGuestPrompt, openMemberProfile } = useUI();

  const currentYear = getBkkNow().getFullYear();
  const [activeTab, setActiveTab] = useState('river');

  const guestDevId = useMemo(() => {
    try {
      let id = localStorage.getItem('tbma_guest_device_id');
      if (!id) {
        id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        localStorage.setItem('tbma_guest_device_id', id);
      }
      return id;
    } catch {
      return 'guest-temp';
    }
  }, []);

  const [myKrathong, setMyKrathong] = useStickyState(
    { base: 'banana_leaf', flower: 'marigold', topper: 'candle' },
    'tbma_my_krathong_design'
  );
  const [guestName, setGuestName] = useStickyState('', 'tbma_loy_guest_name');
  const [wishInput, setWishInput] = useState('');
  const [lastFloatedWish, setLastFloatedWish] = useStickyState('', 'tbma_loy_last_wish');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [floatingBusy, setFloatingBusy] = useState(false);

  const [riverKrathongs, setRiverKrathongs] = useState([]);
  const [selectedKrathong, setSelectedKrathong] = useState(null);

  useEffect(() => {
    const unsub = db.collection('bma_loy_krathongs')
      .where('year', '==', currentYear)
      .onSnapshot((s) => {
        const list = s.docs.map((d) => d.data()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setRiverKrathongs(list);
      }, () => {});
    return () => unsub();
  }, [currentYear]);

  const activeSelectedK = selectedKrathong
    ? (riverKrathongs.find((k) => k.id === selectedKrathong.id) || selectedKrathong)
    : null;

  const handleFloatKrathong = async (e) => {
    e.preventDefault();
    const wish = wishInput.trim();
    if (!wish) return alert('กรุณาพิมพ์คำอธิษฐานก่อนลอยกระทงครับ');
    if (!currentUser && !guestName.trim()) return alert('กรุณาใส่ชื่อเล่นของคุณก่อนลอยกระทงครับ');

    if (!currentUser) {
      const lastAt = parseInt(localStorage.getItem('tbma_guest_last_krathong') || '0', 10);
      if (Date.now() - lastAt < 15000) return alert('กรุณารอสักครู่ (15 วินาที) ก่อนลอยกระทงใบถัดไปครับ');
    }

    setFloatingBusy(true);
    try {
      const id = 'kr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const partnerUser = currentUser && partnerId ? users.find((u) => u.id === partnerId) : null;
      const payload = {
        id,
        year: currentYear,
        design: myKrathong,
        wish,
        senderId: currentUser ? currentUser.id : 'GUEST',
        senderName: currentUser ? (isAnonymous ? 'ผู้ส่งนิรนาม' : currentUser.displayName) : guestName.trim(),
        senderAvatar: currentUser && !isAnonymous ? (currentUser.avatarUrl || '') : '',
        isAnonymous: currentUser ? isAnonymous : false,
        isGuest: !currentUser,
        partnerId: partnerUser ? partnerUser.id : null,
        partnerName: partnerUser ? partnerUser.displayName : null,
        partnerAvatar: partnerUser ? (partnerUser.avatarUrl || '') : '',
        blessedBy: [],
        lanePct: 30 + Math.floor(Math.random() * 44),
        speedSec: 18 + Math.floor(Math.random() * 14),
        createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        serverCreatedAt: svrTs()
      };

      await db.collection('bma_loy_krathongs').doc(id).set(payload);
      playLoySfx('float');
      if (!currentUser) {
        try { localStorage.setItem('tbma_guest_last_krathong', String(Date.now())); } catch {}
      }
      if (partnerUser && sendNotif && currentUser) {
        await sendNotif({
          recipientId: partnerUser.id,
          actorId: currentUser.id,
          category: 'posts',
          subType: 'loy_coop',
          title: `🪷 ${currentUser.displayName} ชวนคุณลอยกระทงคู่!`,
          body: `"${wish.slice(0, 70)}" — คลิกเพื่อดูในแม่น้ำสมาคม`,
          targetView: 'loy_krathong'
        });
      }
      setLastFloatedWish(wish);
      setWishInput('');
      setPartnerId('');
      setSelectedKrathong(payload);
    } catch {
      alert('ไม่สามารถลอยกระทงได้ กรุณาตรวจสอบ Firestore Rules หรือลองใหม่อีกครั้ง');
    }
    setFloatingBusy(false);
  };

  const handleBlessKrathong = async (k) => {
    const actorKey = currentUser ? currentUser.id : guestDevId;
    const arr = Array.isArray(k.blessedBy) ? k.blessedBy : [];
    const has = arr.includes(actorKey);
    const next = has ? arr.filter((x) => x !== actorKey) : [...arr, actorKey];
    if (!has) playLoySfx('bless');
    await db.collection('bma_loy_krathongs').doc(k.id).update({ blessedBy: next }).catch(() => {});
  };

  // TAB 2: SIEMSI
  const [todayFortune, setTodayFortune] = useStickyState(null, `tbma_siemsi_v2_${todayStr}`);
  const [isShaking, setIsShaking] = useState(false);
  const [siemsiShareOpen, setSiemsiShareOpen] = useState(false);

  const handleShakeSiemsi = () => {
    if (isShaking) return;
    setIsShaking(true);
    playLoySfx('shake');
    setTimeout(() => {
      const picked = SIEMSI_FORTUNES[Math.floor(Math.random() * SIEMSI_FORTUNES.length)];
      setTodayFortune(picked);
      setIsShaking(false);
      playLoySfx('stick');
    }, 1200);
  };

  const tierStyle = (tier) => {
    if (tier === 'มหาโชค') return 'bg-amber-400 text-[#040914] border-amber-200';
    if (tier === 'โชคดี') return 'bg-emerald-500 text-[#040914] border-emerald-300';
    if (tier === 'เตือนสติ') return 'bg-red-500/85 text-white border-red-300';
    return 'bg-sky-500 text-[#040914] border-sky-300';
  };

  // TAB 3: ECO RIVER GAME + LEADERBOARD
  const [gameActive, setGameActive] = useState(false);
  const [gameTime, setGameTime] = useState(25);
  const [gameScore, setGameScore] = useState(0);
  const [gameCombo, setGameCombo] = useState(0);
  const [gameItems, setGameItems] = useState([]);
  const [gamePopups, setGamePopups] = useState([]);
  const [eventScores, setEventScores] = useState([]);
  const [guestBest, setGuestBest] = useStickyState(0, `tbma_loy_guest_best_${currentYear}`);
  const [gameEnded, setGameEnded] = useState(false);

  const gameTimerRef = useRef(null);
  const gameSpawnRef = useRef(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  useEffect(() => {
    const unsub = db.collection('bma_loy_scores')
      .where('year', '==', currentYear)
      .onSnapshot((s) => {
        setEventScores(s.docs.map((d) => d.data()).sort((a, b) => (b.score || 0) - (a.score || 0)));
      }, () => {});
    return () => unsub();
  }, [currentYear]);

  const stopEcoGame = useCallback((finalScore) => {
    clearInterval(gameTimerRef.current);
    clearInterval(gameSpawnRef.current);
    setGameActive(false);
    setGameEnded(true);
    setGameItems([]);
    if (finalScore > 0) {
      if (currentUser) {
        const docId = `${currentYear}_${currentUser.id}`;
        const prev = eventScores.find((x) => x.userId === currentUser.id);
        if (!prev || finalScore > (prev.score || 0)) {
          db.collection('bma_loy_scores').doc(docId).set({
            userId: currentUser.id,
            displayName: currentUser.displayName,
            year: currentYear,
            score: finalScore,
            updatedAt: Date.now()
          }).catch(() => {});
        }
      } else {
        setGuestBest((prev) => Math.max(prev || 0, finalScore));
      }
    }
  }, [currentUser, currentYear, eventScores, setGuestBest]);

  useEffect(() => () => {
    clearInterval(gameTimerRef.current);
    clearInterval(gameSpawnRef.current);
  }, []);

  const pushPopup = (text, leftPct, topPct, cls = 'text-emerald-300') => {
    const pid = Date.now() + Math.random();
    setGamePopups((prev) => [...prev.slice(-8), { id: pid, text, left: leftPct, top: topPct, cls }]);
    setTimeout(() => setGamePopups((prev) => prev.filter((p) => p.id !== pid)), 850);
  };

  const startEcoGame = () => {
    clearInterval(gameTimerRef.current);
    clearInterval(gameSpawnRef.current);
    scoreRef.current = 0;
    comboRef.current = 0;
    setGameScore(0);
    setGameCombo(0);
    setGameTime(25);
    setGameItems([]);
    setGamePopups([]);
    setGameEnded(false);
    setGameActive(true);
    playGameSfx('tap');

    gameTimerRef.current = setInterval(() => {
      setGameTime((prev) => {
        if (prev <= 1) {
          stopEcoGame(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    gameSpawnRef.current = setInterval(() => {
      const r = Math.random();
      let kind = 'trash';
      let icon = ['🥤', '🛍️', '📦', '🥫'][Math.floor(Math.random() * 4)];
      let dur = 3.4 + Math.random() * 1.4;
      if (r < 0.06) { kind = 'net'; icon = '🥅'; dur = 3.0; }
      else if (r < 0.12) { kind = 'clock'; icon = '⏳'; dur = 3.2; }
      else if (r < 0.34) { kind = 'foam'; icon = '🍱'; dur = 2.4 + Math.random() * 0.9; }
      else if (r > 0.72) { kind = 'krathong'; icon = '🪷'; dur = 3.8 + Math.random() * 1.2; }

      const item = { id: Date.now() + Math.random(), kind, icon, top: 10 + Math.random() * 72, dur, clicked: false };
      setGameItems((prev) => [...prev, item]);
      setTimeout(() => setGameItems((cur) => cur.filter((i) => i.id !== item.id)), dur * 1000 + 200);
    }, 480);
  };

  const handleTapGameItem = (item, e) => {
    if (!gameActive || item.clicked) return;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    const lx = rect ? Math.min(88, Math.max(12, ((e.clientX - rect.left) / rect.width) * 100)) : 50;

    if (item.kind === 'net') {
      playLoySfx('powerup');
      let swept = 0;
      setGameItems((prev) => prev.map((i) => {
        if (!i.clicked && (i.kind === 'trash' || i.kind === 'foam')) {
          swept++;
          return { ...i, clicked: true };
        }
        return i.id === item.id ? { ...i, clicked: true } : i;
      }));
      const bonus = Math.max(20, swept * 15);
      scoreRef.current += bonus;
      setGameScore(scoreRef.current);
      pushPopup(`🧹 กวาดเรียบ +${bonus}!`, lx, item.top, 'text-amber-300');
      return;
    }

    if (item.kind === 'clock') {
      playLoySfx('powerup');
      setGameItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, clicked: true } : i)));
      setGameTime((t) => t + 5);
      pushPopup('⏳ +5 วินาที!', lx, item.top, 'text-sky-300');
      return;
    }

    setGameItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, clicked: true } : i)));

    if (item.kind === 'krathong') {
      playGameSfx('error');
      comboRef.current = 0;
      setGameCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setGameScore(scoreRef.current);
      pushPopup('-5 กระทงธรรมชาติ!', lx, item.top, 'text-red-400');
    } else {
      playGameSfx('merge');
      comboRef.current += 1;
      setGameCombo(comboRef.current);
      const mult = comboRef.current >= 15 ? 3 : comboRef.current >= 10 ? 2 : comboRef.current >= 5 ? 1.5 : 1;
      const basePts = item.kind === 'foam' ? 15 : 10;
      const gained = Math.round(basePts * mult);
      scoreRef.current += gained;
      setGameScore(scoreRef.current);
      pushPopup(`+${gained}${mult > 1 ? ` (x${mult})` : ''}`, lx, item.top, item.kind === 'foam' ? 'text-amber-300' : 'text-emerald-300');
    }
  };

  // สุ่มหมุนเวียนกระทงบนผิวน้ำ + Modal ดูทั้งหมด
  const [riverBatchIds, setRiverBatchIds] = useState([]);
  const [showAllKrathongs, setShowAllKrathongs] = useState(false);
  const [krathongSearch, setKrathongSearch] = useState('');
  const [krathongSort, setKrathongSort] = useState('latest');

  const shuffleRiverBatch = useCallback((list) => {
    if (!list || list.length <= 18) return (list || []).map((k) => k.id);
    const pinned = list.slice(0, 3);
    const pool = list.slice(3);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return [...pinned, ...pool.slice(0, 15)].map((k) => k.id);
  }, []);

  const riverListRef = useRef(riverKrathongs);
  useEffect(() => { riverListRef.current = riverKrathongs; }, [riverKrathongs]);

  const hasExtraKrathongs = riverKrathongs.length > 18;
  const newestKrathongId = riverKrathongs[0]?.id;

  useEffect(() => {
    if (!hasExtraKrathongs) {
      setRiverBatchIds(riverKrathongs.map((k) => k.id));
    } else {
      setRiverBatchIds((prev) => {
        const validPrev = prev.filter((id) => riverKrathongs.some((k) => k.id === id));
        if (validPrev.length < 18) return shuffleRiverBatch(riverKrathongs);
        if (newestKrathongId && !validPrev.includes(newestKrathongId)) {
          return [newestKrathongId, ...validPrev.slice(0, 17)];
        }
        return validPrev;
      });
    }
  }, [riverKrathongs.length, newestKrathongId, hasExtraKrathongs, shuffleRiverBatch]);

  useEffect(() => {
    if (!hasExtraKrathongs) return;
    const iv = setInterval(() => setRiverBatchIds(shuffleRiverBatch(riverListRef.current)), 30000);
    return () => clearInterval(iv);
  }, [hasExtraKrathongs, shuffleRiverBatch]);

  const visibleRiverKrathongs = useMemo(() => {
    if (!hasExtraKrathongs) return riverKrathongs;
    const map = new Map(riverKrathongs.map((k) => [k.id, k]));
    const picked = riverBatchIds.map((id) => map.get(id)).filter(Boolean);
    return picked.length > 0 ? picked : riverKrathongs.slice(0, 18);
  }, [riverKrathongs, riverBatchIds, hasExtraKrathongs]);

  const filteredAllKrathongs = useMemo(() => {
    const q = krathongSearch.trim().toLowerCase();
    let list = riverKrathongs;
    if (q) {
      list = list.filter((k) =>
        (k.senderName || '').toLowerCase().includes(q) ||
        (k.partnerName || '').toLowerCase().includes(q) ||
        (k.wish || '').toLowerCase().includes(q)
      );
    }
    if (krathongSort === 'blessed') {
      return [...list].sort((a, b) => (b.blessedBy?.length || 0) - (a.blessedBy?.length || 0));
    }
    return list;
  }, [riverKrathongs, krathongSearch, krathongSort]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5 pb-24 lg:pb-12">
        {/* Header Bar */}
        <div className="card p-4 sm:p-5 bg-gradient-to-br from-[#0A162C] to-[#040914] border-amber-500/50 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBackHome} className="btn-d py-2 px-3 text-xs font-bold shrink-0 hover:bg-amber-400 hover:text-[#040914] transition-colors" title="กลับหน้า Home">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                <span>🌕</span> Loy Krathong Festival • {currentYear}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Full Moon River &amp; Siemsi</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                แต่งกระทง DIY ลอยในแม่น้ำสมาคม เสี่ยงเซียมซีพร้อมแชร์กระทง และเล่นเกมรักษ์สายน้ำ (Guest เล่นได้ครบทุกโหมด)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:flex bg-[#040914] p-1 rounded-xl border border-amber-500/45 gap-1 text-xs font-bold shrink-0">
            <button type="button" onClick={() => setActiveTab('river')} className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'river' ? 'bg-amber-400 text-[#040914] shadow' : 'text-amber-100/70 hover:text-white'}`}>
              <span>🪷</span><span className="truncate">ลอยกระทง</span>
            </button>
            <button type="button" onClick={() => setActiveTab('siemsi')} className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'siemsi' ? 'bg-amber-400 text-[#040914] shadow' : 'text-amber-100/70 hover:text-white'}`}>
              <span>🎋</span><span className="truncate">เซียมซี</span>
            </button>
            <button type="button" onClick={() => setActiveTab('game')} className={`px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'game' ? 'bg-amber-400 text-[#040914] shadow' : 'text-amber-100/70 hover:text-white'}`}>
              <span>🎮</span><span className="truncate">รักษ์สายน้ำ</span>
            </button>
          </div>
        </div>

        {/* TAB 1: REAL-TIME RIVER + DIY KRATHONG */}
        {activeTab === 'river' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="card p-4 bg-[#0A162C] border-amber-500/45 space-y-3 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/25">
                  <div className="font-bold text-amber-300 text-sm">🌊 แม่น้ำแห่งความปรารถนา ({currentYear})</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasExtraKrathongs && (
                      <button type="button" onClick={() => setRiverBatchIds(shuffleRiverBatch(riverKrathongs))} className="text-[10px] font-bold text-sky-200 bg-[#040914] hover:bg-sky-900/50 px-2.5 py-1 rounded-full border border-sky-500/40 transition-colors" title="สุ่มหมุนเวียนกระทงชุดใหม่มาลอยบนผิวน้ำ">
                        🔀 สุ่มชุดใหม่
                      </button>
                    )}
                    <button type="button" onClick={() => setShowAllKrathongs(true)} className="text-[11px] font-mono font-bold text-amber-200 bg-[#040914] hover:bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/45 transition-colors flex items-center gap-1">
                      <span>📜 ดูทั้งหมด ({riverKrathongs.length})</span>
                    </button>
                  </div>
                </div>

                <div className="relative h-72 sm:h-80 w-full rounded-2xl border border-amber-500/40 overflow-hidden bg-gradient-to-b from-[#040914] via-[#091933] to-[#040914] select-none">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 35% 35%, #FEF9C3, #F59E0B 60%, #B45309 100%)', boxShadow: '0 0 55px rgba(245,158,11,0.75)' }} />
                  <div className="absolute top-[28%] inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />
                  <div className="absolute top-[28%] inset-x-0 bottom-0 overflow-hidden pointer-events-none">
                    <div className="river-reflection opacity-80"></div>
                  </div>

                  {visibleRiverKrathongs.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-200/70 text-xs pt-14 px-4 text-center">
                      <span>ยังไม่มีกระทงในแม่น้ำปีนี้ — แต่งกระทงใบแรกทางขวาแล้วกดลอยเลย!</span>
                    </div>
                  ) : (
                    visibleRiverKrathongs.map((k, idx) => {
                      const isSel = activeSelectedK?.id === k.id;
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => setSelectedKrathong(k)}
                          className={`loy-river-item cursor-pointer flex flex-col items-center group ${isSel ? 'z-30' : 'z-10'}`}
                          style={{
                            top: `${Math.min(72, Math.max(30, k.lanePct || (34 + (idx * 9) % 38)))}%`,
                            '--rdur': `${k.speedSec || (18 + (idx % 5) * 3)}s`,
                            '--rdel': `${-(idx * 2.3)}s`
                          }}
                          title={`กระทงของ ${k.senderName}${k.partnerName ? ' & ' + k.partnerName : ''} — คลิกเพื่ออ่านคำอธิษฐาน`}
                        >
                          <div className={`loy-bob flex items-center -space-x-3 transition-transform group-hover:scale-110 ${isSel ? 'scale-110 drop-shadow-[0_0_14px_rgba(253,230,138,0.9)]' : ''}`}>
                            <KrathongSVG design={k.design} size={58} />
                            {k.partnerId && <KrathongSVG design={k.design} size={48} />}
                          </div>
                          <span className="px-2 py-0.5 -mt-1 rounded-full bg-[#040914]/85 border border-amber-500/40 text-[9px] font-bold text-amber-200 whitespace-nowrap max-w-[115px] truncate shadow">
                            {k.senderName}{k.partnerName ? ` ♥ ${k.partnerName}` : ''}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#040914] border border-amber-500/35 text-xs">
                  {!activeSelectedK ? (
                    <div className="text-center text-slate-400 py-1.5">
                      <i className="fas fa-hand-pointer text-amber-400 mr-1.5"></i>
                      คลิกที่กระทงบนผิวน้ำ หรือเลือกจากรายการด้านล่างเพื่ออ่านคำอธิษฐานและกดส่งกำลังใจ
                    </div>
                  ) : (() => {
                    const actorKey = currentUser ? currentUser.id : guestDevId;
                    const blessList = Array.isArray(activeSelectedK.blessedBy) ? activeSelectedK.blessedBy : [];
                    const hasBlessed = blessList.includes(actorKey);
                    return (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="shrink-0 bg-[#0A162C] p-1.5 rounded-xl border border-amber-500/30">
                            <KrathongSVG design={activeSelectedK.design} size={54} />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-amber-300">{activeSelectedK.senderName}</span>
                              {activeSelectedK.partnerName && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950/70 border border-pink-500/40 text-pink-200 font-bold">
                                  คู่กับ {activeSelectedK.partnerName}
                                </span>
                              )}
                              {activeSelectedK.isGuest && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">Guest</span>}
                              <span className="text-[10px] text-slate-500 font-mono">{activeSelectedK.createdAt}</span>
                            </div>
                            <p className="text-slate-100 leading-relaxed break-words">"{activeSelectedK.wish}"</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBlessKrathong(activeSelectedK)}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${hasBlessed ? 'bg-amber-400 text-[#040914] border-amber-200 shadow' : 'bg-[#0A162C] text-amber-200 border-amber-500/45 hover:bg-amber-500/20'}`}
                        >
                          <span>🙏 สาธุ</span><span className="font-mono">{blessList.length}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {riverKrathongs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">กระทงล่าสุดในแม่น้ำ</div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {riverKrathongs.slice(0, 20).map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => setSelectedKrathong(k)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center gap-1.5 shrink-0 transition-colors ${activeSelectedK?.id === k.id ? 'bg-amber-500/25 border-amber-400 text-white font-bold' : 'bg-[#040914] border-amber-900/40 text-slate-300 hover:border-amber-500/60'}`}
                        >
                          <KrathongSVG design={k.design} size={22} />
                          <span className="max-w-[90px] truncate">{k.senderName}</span>
                          {(k.blessedBy?.length || 0) > 0 && <span className="text-[9px] text-amber-300 font-mono">🙏{k.blessedBy.length}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <form onSubmit={handleFloatKrathong} className="card p-4 sm:p-5 bg-[#0A162C] border-amber-500/45 space-y-4 shadow-2xl text-xs">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-500/25">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white">✨ ออกแบบกระทง DIY ของคุณ</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">กระทงนี้จะถูกบันทึกไว้ใช้แชร์คู่กับผลเซียมซีด้วย</p>
                  </div>
                  <div className="bg-[#040914] border border-amber-500/40 rounded-2xl p-2 shrink-0">
                    <KrathongSVG design={myKrathong} size={68} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-1.5">1. เลือกฐานกระทง</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {KRATHONG_BASES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setMyKrathong((p) => ({ ...p, base: b.id }))}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${myKrathong.base === b.id ? 'bg-amber-400/20 border-amber-300 text-white shadow' : 'bg-[#040914] border-[#1E3A5F] text-slate-400 hover:text-white'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40" style={{ backgroundColor: b.main }}></span>
                        <span className="truncate">{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-1.5">2. เลือกดอกไม้ประดับ</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {KRATHONG_FLOWERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMyKrathong((p) => ({ ...p, flower: f.id }))}
                        className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${myKrathong.flower === f.id ? 'bg-amber-400/20 border-amber-300 text-white shadow' : 'bg-[#040914] border-[#1E3A5F] text-slate-400 hover:text-white'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40" style={{ backgroundColor: f.main }}></span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200 font-bold mb-1.5">3. ของตกแต่งยอดกระทง</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {KRATHONG_TOPPERS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMyKrathong((p) => ({ ...p, topper: t.id }))}
                        className={`py-1.5 rounded-xl border text-[10px] font-bold transition-all ${myKrathong.topper === t.id ? 'bg-amber-400 text-[#040914] border-amber-200 shadow' : 'bg-[#040914] border-[#1E3A5F] text-slate-300 hover:text-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {currentUser ? (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-amber-500/30 flex items-center justify-between gap-2">
                      <span className="text-slate-200 font-bold truncate">ผู้ลอย: <span className="text-amber-300">{isAnonymous ? 'ผู้ส่งนิรนาม' : currentUser.displayName}</span></span>
                      <button
                        type="button"
                        onClick={() => setIsAnonymous((v) => !v)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${isAnonymous ? 'bg-amber-400 text-[#040914] border-amber-300' : 'bg-[#0A162C] text-slate-300 border-[#1E3A5F]'}`}
                      >
                        {isAnonymous ? 'นิรนาม: เปิด' : 'นิรนาม: ปิด'}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-amber-500/30 space-y-1.5">
                      <label className="block text-[10px] font-bold text-pink-300">💞 ชวนเพื่อนลอยกระทงคู่ (ไม่บังคับ — จะแจ้งเตือนให้เพื่อนรู้)</label>
                      <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="w-full inp py-1.5 text-xs bg-[#0A162C]">
                        <option value="">-- ลอยเดี่ยว --</option>
                        {users.filter((u) => u.isActivated && u.id !== currentUser.id).map((u) => (
                          <option key={u.id} value={u.id}>{u.displayName} ({u.id})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] text-amber-200 font-bold mb-1">ชื่อเล่นของคุณ (Guest) <span className="text-red-400">*</span></label>
                    <input type="text" maxLength={35} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="ใส่ชื่อเล่นที่จะแสดงบนกระทง..." className="w-full inp text-xs" required />
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-amber-200 font-bold">คำอธิษฐาน <span className="text-red-400">*</span></label>
                    <span className="text-[10px] font-mono text-slate-400">{wishInput.length}/200</span>
                  </div>
                  <textarea rows="3" maxLength={200} value={wishInput} onChange={(e) => setWishInput(e.target.value)} placeholder="พิมพ์คำอธิษฐานขอพรหรือลอยความทุกข์ไปกับสายน้ำ..." className="w-full inp text-xs resize-none" required />
                </div>

                <button type="submit" disabled={floatingBusy} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-[#040914] font-bold text-xs shadow-[0_0_18px_rgba(245,158,11,0.4)] transition-all disabled:opacity-50">
                  {floatingBusy ? '⏳ กำลังปล่อยกระทงลงแม่น้ำ...' : (partnerId ? '💞 ลอยกระทงคู่ลงแม่น้ำสมาคม' : '🪷 ลอยกระทงลงแม่น้ำสมาคม')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: DIGITAL SIEMSI */}
        {activeTab === 'siemsi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 card p-5 bg-[#0A162C] border-amber-500/45 flex flex-col items-center text-center space-y-4 shadow-2xl">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-300">🎋 เสี่ยงเซียมซีคืนวันเพ็ญ</h3>
                <p className="text-xs text-slate-300">ตั้งจิตอธิษฐานแล้วกดเขย่ากระบอกเซียมซี (คลังคำทำนาย 24 ใบ)</p>
              </div>
              <div className={`text-7xl my-2 select-none transition-transform origin-bottom ${isShaking ? 'animate-shake' : ''}`}>🎋</div>
              <button type="button" onClick={handleShakeSiemsi} disabled={isShaking} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-[#040914] font-bold text-sm shadow-lg transition-all disabled:opacity-50">
                {isShaking ? 'กำลังเขย่ากระบอกติ้ว...' : (todayFortune ? '🔄 เขย่าเสี่ยงทายอีกครั้ง' : '✨ อธิษฐานแล้วเขย่าเลย!')}
              </button>

              <div className="w-full p-3.5 rounded-xl bg-[#040914] border border-amber-500/35 flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <KrathongSVG design={myKrathong} size={56} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-amber-300 uppercase">กระทงที่จะแนบตอนแชร์</div>
                    <div className="text-xs font-bold text-white truncate">
                      ฐาน{(KRATHONG_BASES.find((b) => b.id === myKrathong.base) || KRATHONG_BASES[0]).label} • {(KRATHONG_FLOWERS.find((f) => f.id === myKrathong.flower) || KRATHONG_FLOWERS[0]).label}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveTab('river')} className="btn-d py-1.5 px-2.5 text-[10px] text-amber-200 border-amber-500/40 shrink-0">แต่งกระทง</button>
              </div>
            </div>

            <div className="lg:col-span-7 card p-5 sm:p-6 bg-gradient-to-br from-[#0A162C] via-[#13284C]/60 to-[#040914] border-amber-500/50 shadow-2xl min-h-[360px] flex flex-col justify-center">
              {!todayFortune ? (
                <div className="text-center text-slate-400 py-14 space-y-2 text-xs">
                  <div className="text-4xl opacity-40">📜</div>
                  <div>ยังไม่ได้เสี่ยงเซียมซีวันนี้ — กดปุ่มเขย่าเพื่อเปิดคำทำนายของคุณ</div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-bold text-white">ใบที่ {todayFortune.num}</span>
                      <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${tierStyle(todayFortune.tier)}`}>{todayFortune.tier}</span>
                    </div>
                    <span className="font-mono text-xs text-amber-300 bg-[#040914] px-3 py-1 rounded-full border border-amber-500/40 font-bold">เลขมงคล: {todayFortune.luckyNum}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 bg-[#040914]/85 border border-amber-500/40 rounded-2xl p-3 flex flex-col items-center">
                      <KrathongSVG design={myKrathong} size={86} />
                      <span className="text-[10px] text-amber-200 font-bold mt-1">กระทงของฉัน</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                      <h4 className="text-lg sm:text-xl font-bold text-amber-200">"{todayFortune.title}"</h4>
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{todayFortune.main}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#040914]/85 border border-amber-500/30 space-y-1">
                      <div className="font-bold text-amber-300">📚 การเรียน / การงาน</div>
                      <p className="text-slate-200 leading-relaxed">{todayFortune.work}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#040914]/85 border border-amber-500/30 space-y-1">
                      <div className="font-bold text-pink-300">💖 ความรัก / มิตรภาพ</div>
                      <p className="text-slate-200 leading-relaxed">{todayFortune.love}</p>
                    </div>
                  </div>

                  <button type="button" onClick={() => setSiemsiShareOpen(true)} className="w-full py-3 rounded-xl bg-white hover:bg-amber-200 text-[#040914] font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2">
                    <i className="fas fa-share-alt"></i>
                    <span>แชร์ผลเซียมซีพร้อมกระทง DIY (สตอรี่ 9:16 / Board / Chat)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ECO RIVER CLEANUP MINI-GAME + LEADERBOARD */}
        {activeTab === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 card p-4 sm:p-5 bg-[#0A162C] border-amber-500/45 space-y-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-500/25">
                <div>
                  <h3 className="text-base font-bold text-amber-300">🎮 มินิเกม: ตักตวงบุญ รักษ์สายน้ำ</h3>
                  <p className="text-[11px] text-slate-300">แตะเก็บขยะ (+10) &amp; โฟม (+15) • หลบกระทงธรรมชาติ (-5) • เก็บ 🥅 กวาดเรียบ / ⏳ +5 วิ</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold">
                  <span className="px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300">แต้ม: {gameScore}</span>
                  {gameCombo >= 3 && <span className="px-2.5 py-1 rounded-full bg-amber-500 text-[#040914] animate-pulse">🔥 {gameCombo} Combo</span>}
                  <span className={`px-3 py-1 rounded-full border ${gameTime <= 5 && gameActive ? 'bg-red-950 border-red-500 text-red-300 animate-pulse' : 'bg-[#040914] border-amber-500/40 text-amber-300'}`}>
                    ⏱ {gameTime}s
                  </span>
                </div>
              </div>

              <div className="relative h-72 sm:h-80 w-full rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-[#061124] via-[#0A1B38] to-[#040914] overflow-hidden cursor-crosshair select-none touch-manipulation">
                <div className="river-reflection opacity-50 pointer-events-none"></div>

                {!gameActive && !gameEnded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 p-4 text-center">
                    <div className="text-4xl">🌊🧹🪷</div>
                    <div className="text-sm font-bold text-white">พร้อมช่วยกันเก็บขยะออกจากแม่น้ำคืนวันเพ็ญหรือยัง?</div>
                    <button type="button" onClick={startEcoGame} className="px-7 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#040914] font-bold text-sm shadow-lg transition-transform hover:scale-105">
                      ▶ เริ่มเกม (25 วินาที)
                    </button>
                  </div>
                )}

                {gameEnded && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 p-4 text-center animate-fade-in">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-300">หมดเวลา!</div>
                    <div className="text-4xl font-mono font-bold text-white">{gameScore} <span className="text-base text-amber-300">แต้ม</span></div>
                    <div className="text-xs text-slate-300">
                      {currentUser ? 'บันทึกสถิติสูงสุดขึ้นตารางอันดับเรียบร้อยแล้ว!' : `สถิติสูงสุดในเครื่องนี้ (Guest): ${guestBest} แต้ม`}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                      <button type="button" onClick={startEcoGame} className="px-6 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-[#040914] font-bold text-xs shadow">🔄 เล่นอีกครั้ง</button>
                      {!currentUser && (
                        <button type="button" onClick={() => openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อบันทึกคะแนนขึ้นตารางอันดับสมาคม')} className="btn-b py-2 px-4 rounded-full text-xs">เข้าสู่ระบบเก็บอันดับ</button>
                      )}
                    </div>
                  </div>
                )}

                {gameActive && gameItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(e) => handleTapGameItem(item, e)}
                    className="absolute text-3xl sm:text-4xl select-none p-1 active:scale-125 transition-transform"
                    style={{
                      top: `${item.top}%`,
                      animation: `floatGameItem ${item.dur}s linear forwards`,
                      opacity: item.clicked ? 0 : 1,
                      pointerEvents: item.clicked ? 'none' : 'auto'
                    }}
                  >
                    {item.kind === 'foam' ? (
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 border-2 border-red-400 text-lg shadow-lg" title="กระทงโฟม +15">🍱</span>
                    ) : item.icon}
                  </button>
                ))}

                {gamePopups.map((p) => (
                  <div key={p.id} className={`absolute pointer-events-none font-mono font-bold text-sm drop-shadow-lg animate-bounce z-20 ${p.cls}`} style={{ left: `${p.left}%`, top: `${p.top}%` }}>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 card p-4 sm:p-5 bg-[#0A162C] border-amber-500/45 space-y-3 shadow-2xl text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/25">
                <span className="font-bold text-amber-300 text-sm">🏆 Top 5 นักรักษ์สายน้ำ {currentYear}</span>
                <span className="text-[10px] text-slate-400 font-mono">{eventScores.length} คน</span>
              </div>

              {eventScores.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-amber-900/40 rounded-xl">
                  ยังไม่มีผู้บันทึกคะแนนปีนี้ — เป็นคนแรกเลย!
                </div>
              ) : (
                <div className="space-y-2">
                  {eventScores.slice(0, 5).map((sc, i) => {
                    const u = getAuthor(sc.userId);
                    const isMe = currentUser && sc.userId === currentUser.id;
                    return (
                      <div
                        key={sc.userId}
                        onClick={() => openMemberProfile(u)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${isMe ? 'bg-amber-500/20 border-amber-400' : 'bg-[#040914] border-amber-900/40 hover:border-amber-500/60'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-6 h-6 rounded-lg font-mono font-bold text-[11px] flex items-center justify-center shrink-0 ${i === 0 ? 'bg-amber-400 text-[#040914]' : i === 1 ? 'bg-slate-200 text-[#040914]' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-[#13284C] text-amber-200'}`}>
                            {i + 1}
                          </span>
                          <Avatar user={u} size="xs" />
                          <span className="font-bold text-white truncate">{u.displayName}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-300 shrink-0">{sc.score} pt</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {!currentUser && (
                <div className="p-2.5 rounded-xl bg-[#040914] border border-amber-500/30 text-center space-y-1.5">
                  <div className="text-[11px] text-amber-200">สถิติส่วนตัวของคุณ (Guest): <strong className="font-mono text-white">{guestBest} pt</strong></div>
                  <div className="text-[10px] text-slate-400">เข้าสู่ระบบสมาชิกเพื่อบันทึกขึ้นตาราง Top 5</div>
                </div>
              )}
            </div>
          </div>
        )}

        <LoySiemsiShareModal
          isOpen={siemsiShareOpen}
          onClose={() => setSiemsiShareOpen(false)}
          fortune={todayFortune}
          krathongDesign={myKrathong}
          wishText={lastFloatedWish}
          guestName={guestName}
          channels={channels}
          myGroups={myGroups}
          onShareToBoard={onShareSiemsiToBoard}
          onShareToChat={onShareSiemsiToChat}
        />

        {showAllKrathongs && (
          <Modal title={`🪷 กระทงทั้งหมดในแม่น้ำ ${currentYear} (${riverKrathongs.length} ใบ)`} onClose={() => setShowAllKrathongs(false)} maxW="max-w-2xl">
            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={krathongSearch} onChange={(e) => setKrathongSearch(e.target.value)} placeholder="ค้นหาชื่อผู้ลอย หรือคำอธิษฐาน..." className="flex-1 min-w-0 inp py-1.5 text-xs" />
                <div className="grid grid-cols-2 bg-[#040914] p-1 rounded-xl border border-amber-500/35 gap-1 shrink-0 font-bold text-[11px]">
                  <button type="button" onClick={() => setKrathongSort('latest')} className={`px-3 py-1 rounded-lg transition-colors ${krathongSort === 'latest' ? 'bg-amber-400 text-[#040914]' : 'text-slate-400 hover:text-white'}`}>🕒 ล่าสุด</button>
                  <button type="button" onClick={() => setKrathongSort('blessed')} className={`px-3 py-1 rounded-lg transition-colors ${krathongSort === 'blessed' ? 'bg-amber-400 text-[#040914]' : 'text-slate-400 hover:text-white'}`}>🙏 สาธุสูงสุด</button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {filteredAllKrathongs.length === 0 ? (
                  <div className="text-center text-slate-400 py-10">ไม่พบกระทงที่ตรงกับคำค้นหา</div>
                ) : (
                  filteredAllKrathongs.map((k) => {
                    const actorKey = currentUser ? currentUser.id : guestDevId;
                    const blessList = Array.isArray(k.blessedBy) ? k.blessedBy : [];
                    const hasBlessed = blessList.includes(actorKey);
                    return (
                      <div
                        key={k.id}
                        onClick={() => { setSelectedKrathong(k); setShowAllKrathongs(false); }}
                        className="p-3 rounded-xl bg-[#040914] border border-amber-500/30 hover:border-amber-400 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="shrink-0 bg-[#0A162C] p-1 rounded-xl border border-amber-500/25">
                            <KrathongSVG design={k.design} size={46} />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-amber-300">{k.senderName}</span>
                              {k.partnerName && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-950/70 border border-pink-500/40 text-pink-200 font-bold">♥ {k.partnerName}</span>
                              )}
                              {k.isGuest && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30">Guest</span>}
                              <span className="text-[10px] text-slate-500 font-mono">{k.createdAt}</span>
                            </div>
                            <p className="text-slate-100 leading-relaxed break-words">"{k.wish}"</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleBlessKrathong(k); }}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all ${hasBlessed ? 'bg-amber-400 text-[#040914] border-amber-200' : 'bg-[#0A162C] text-amber-200 border-amber-500/40 hover:bg-amber-500/20'}`}
                        >
                          <span>🙏</span><span className="font-mono">{blessList.length}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}