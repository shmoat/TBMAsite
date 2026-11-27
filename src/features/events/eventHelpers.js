import { getBkkNow, getTags } from '../../lib/utils';

export const checkIsHalloween = () => {
  const bkkDate = getBkkNow();
  const month = bkkDate.getMonth() + 1;
  const date = bkkDate.getDate();
  return month === 10 && date >= 19 && date <= 31;
};

export const checkIsLoyKrathong = () => {
  const bkkDate = getBkkNow();
  const year = bkkDate.getFullYear();
  const mmdd = `${String(bkkDate.getMonth() + 1).padStart(2, '0')}-${String(bkkDate.getDate()).padStart(2, '0')}`;

  const OFFICIAL_LOY_KRATHONG = {
    2026: '11-24', 2027: '11-13', 2028: '11-01', 2029: '11-20', 2030: '11-09',
    2031: '10-28', 2032: '11-17', 2033: '11-06', 2034: '11-25', 2035: '11-15',
    2036: '11-03', 2037: '11-22', 2038: '11-11', 2039: '10-31', 2040: '11-18'
  };
  if (OFFICIAL_LOY_KRATHONG[year]) return mmdd === OFFICIAL_LOY_KRATHONG[year];

  const m = bkkDate.getMonth() + 1;
  if (m !== 10 && m !== 11) return false;
  const synodicMonth = 29.530588853;
  const refFullMoon = Date.UTC(2026, 10, 24, 14, 53, 0);
  const diffDays = (bkkDate.getTime() - refFullMoon) / 86400000;
  const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  return (phase < 0.5 || phase > synodicMonth - 0.5) && (m === 11 || bkkDate.getDate() >= 25);
};

export const checkIsChristmas = () => {
  const bkkDate = getBkkNow();
  const month = bkkDate.getMonth() + 1;
  const date = bkkDate.getDate();
  return month === 12 && date >= 11 && date <= 26;
};

export const isXmasSeasonPassed = (year) => {
  const bkk = getBkkNow();
  const y = bkk.getFullYear();
  const m = bkk.getMonth() + 1;
  const d = bkk.getDate();
  return y > year || (y === year && m === 12 && d > 26);
};

export const isXmasMidnightUnlocked = (year) => {
  const bkk = getBkkNow();
  const y = bkk.getFullYear();
  const m = bkk.getMonth() + 1;
  const d = bkk.getDate();
  return y > year || (y === year && m === 12 && d >= 25);
};

export const doesOrnamentMentionUser = (orn, user) => {
  if (!orn || !user || !orn.mentions || !orn.mentions.length) return false;
  const myTags = getTags(user).map((t) => t.toLowerCase());
  return orn.mentions.some((m) => {
    const lw = String(m).toLowerCase();
    if (lw === '@everyone' || lw === '@here') return true;
    if (lw === '@' + String(user.id).toLowerCase()) return true;
    if (user.username && lw === '@' + user.username.toLowerCase()) return true;
    if (lw.startsWith('@[') && lw.endsWith(']')) {
      return myTags.includes(lw.slice(2, -1));
    }
    return myTags.some((t) => lw === '@' + t);
  });
};