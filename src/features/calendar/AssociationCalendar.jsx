import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, svrTs } from '../../lib/firebase';
import { getTags, useStickyState } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { Avatar } from '../../components/BasicUI';
import { longPressProps } from '../../components/ContextMenu';

const WEATHER_PRESETS = [
  { id: 'bkk', label: 'กรุงเทพฯ / ปริมณฑล', lat: 13.7563, lon: 100.5018 },
  { id: 'cnx', label: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 },
  { id: 'chon', label: 'ชลบุรี', lat: 13.3611, lon: 100.9847 },
  { id: 'kkc', label: 'ขอนแก่น', lat: 16.4322, lon: 102.8236 },
  { id: 'hkt', label: 'ภูเก็ต', lat: 7.8804, lon: 98.3923 }
];

const decodeWmoWeather = (code) => {
  if (code === 0) return { label: 'ท้องฟ้าแจ่มใส', icon: 'fas fa-sun', cls: 'text-amber-300' };
  if (code === 1 || code === 2) return { label: 'มีเมฆบางส่วน', icon: 'fas fa-cloud-sun', cls: 'text-sky-300' };
  if (code === 3) return { label: 'มีเมฆมาก', icon: 'fas fa-cloud', cls: 'text-slate-300' };
  if (code === 45 || code === 48) return { label: 'มีหมอก / ฟ้าหลัว', icon: 'fas fa-smog', cls: 'text-slate-300' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'ฝนปรอยๆ', icon: 'fas fa-cloud-rain', cls: 'text-sky-400' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'มีฝนตก', icon: 'fas fa-cloud-showers-heavy', cls: 'text-blue-400' };
  if ([95, 96, 99].includes(code)) return { label: 'พายุฝนฟ้าคะนอง', icon: 'fas fa-bolt', cls: 'text-amber-400' };
  return { label: 'สภาพอากาศทั่วไป', icon: 'fas fa-cloud', cls: 'text-slate-300' };
};

const getPm25Badge = (pm) => {
  if (pm == null || Number.isNaN(pm)) return { label: 'ไม่มีข้อมูล', cls: 'text-slate-400 bg-slate-900 border-slate-700' };
  if (pm <= 15) return { label: 'ดีมาก', cls: 'text-sky-300 bg-sky-950/60 border-sky-500/40' };
  if (pm <= 25) return { label: 'ดี', cls: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40' };
  if (pm <= 37.5) return { label: 'ปานกลาง', cls: 'text-amber-300 bg-amber-950/60 border-amber-500/40' };
  if (pm <= 75) return { label: 'เริ่มมีผลกระทบ', cls: 'text-orange-300 bg-orange-950/60 border-orange-500/50' };
  return { label: 'อันตรายต่อสุขภาพ', cls: 'text-red-300 bg-red-950/70 border-red-500/60' };
};

const _omCache = {};

function CalendarSkyWeatherWidget({ selectedDate }) {
  const [loc, setLoc] = useStickyState(WEATHER_PRESETS[0], 'tbma_cal_weather_loc');
  const [weather, setWeather] = useState(null);
  const [air, setAir] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadWeather = useCallback(async (targetLoc, force = false) => {
    const key = `${Number(targetLoc.lat).toFixed(2)},${Number(targetLoc.lon).toFixed(2)}`;
    const hit = _omCache[key];
    if (!force && hit && Date.now() - hit.fetchedAt < 20 * 60 * 1000) {
      setWeather(hit.weather);
      setAir(hit.air);
      setLoading(false);
      setErr('');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLoc.lat}&longitude=${targetLoc.lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,weather_code&hourly=cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FBangkok&forecast_days=7`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${targetLoc.lat}&longitude=${targetLoc.lon}&current=pm2_5,us_aqi&hourly=pm2_5&timezone=Asia%2FBangkok&forecast_days=5`;
      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      if (!wRes.ok) throw new Error('Weather API error');
      const wData = await wRes.json();
      const aData = aRes.ok ? await aRes.json() : null;
      _omCache[key] = { weather: wData, air: aData, fetchedAt: Date.now() };
      setWeather(wData);
      setAir(aData);
    } catch {
      setErr('โหลดข้อมูลสภาพอากาศไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loc?.lat && loc?.lon) loadWeather(loc);
  }, [loc?.lat, loc?.lon, loadWeather]);

  const handleUseGps = () => {
    if (!navigator.geolocation) return alert('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง GPS');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          id: 'gps',
          label: `ตำแหน่งฉัน (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`,
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4))
        });
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        alert('ไม่สามารถเข้าถึงตำแหน่ง GPS ได้ กรุณาเลือกพื้นที่จากรายการแทน');
      },
      { timeout: 8000 }
    );
  };

  const viewData = useMemo(() => {
    if (!weather?.daily?.time?.length) return null;
    const idxInForecast = selectedDate ? weather.daily.time.indexOf(selectedDate) : 0;
    const isExactDate = idxInForecast !== -1;
    const dayIdx = isExactDate ? idxInForecast : 0;
    const targetDate = weather.daily.time[dayIdx];
    const isToday = dayIdx === 0;

    let nightCloudSum = 0;
    let nightCloudCnt = 0;
    if (weather.hourly?.time && weather.hourly?.cloud_cover) {
      weather.hourly.time.forEach((tStr, i) => {
        if (!tStr.startsWith(targetDate + 'T')) return;
        const hr = parseInt(tStr.slice(11, 13), 10);
        if (hr >= 19 && hr <= 23 && typeof weather.hourly.cloud_cover[i] === 'number') {
          nightCloudSum += weather.hourly.cloud_cover[i];
          nightCloudCnt++;
        }
      });
    }
    const nightCloud = nightCloudCnt > 0
      ? Math.round(nightCloudSum / nightCloudCnt)
      : Math.round(weather.current?.cloud_cover ?? 50);
    const moonClarity = Math.max(0, Math.min(100, 100 - nightCloud));

    let pm25 = null;
    if (isToday && typeof air?.current?.pm2_5 === 'number') {
      pm25 = air.current.pm2_5;
    } else if (air?.hourly?.time && air?.hourly?.pm2_5) {
      const dayPms = [];
      air.hourly.time.forEach((tStr, i) => {
        if (tStr.startsWith(targetDate + 'T') && typeof air.hourly.pm2_5[i] === 'number') {
          dayPms.push(air.hourly.pm2_5[i]);
        }
      });
      if (dayPms.length > 0) pm25 = dayPms.reduce((a, b) => a + b, 0) / dayPms.length;
    }

    return {
      isExactDate,
      isToday,
      targetDate,
      wmo: decodeWmoWeather(isToday ? weather.current?.weather_code : weather.daily.weather_code[dayIdx]),
      currTemp: weather.current?.temperature_2m,
      tMin: weather.daily.temperature_2m_min[dayIdx],
      tMax: weather.daily.temperature_2m_max[dayIdx],
      rainProb: weather.daily.precipitation_probability_max[dayIdx],
      sunset: (weather.daily.sunset?.[dayIdx] || '').slice(11, 16),
      moonClarity,
      nightCloud,
      pm25
    };
  }, [weather, air, selectedDate]);

  const pmInfo = getPm25Badge(viewData?.pm25);
  const moonTip = !viewData ? '' :
    viewData.moonClarity >= 75 ? 'ฟ้าเปิดมาก เหมาะส่องดวงจันทร์' :
    viewData.moonClarity >= 45 ? 'เมฆประปราย พอเห็นดวงจันทร์' : 'เมฆหนา อาจบังดวงจันทร์';

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0B1325] to-[#050811] border border-[#1E3A5F] space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-sky-300">
          <i className="fas fa-moon text-amber-300"></i>
          <span>สภาพฟ้าดูดวงจันทร์ &amp; อากาศ</span>
          {viewData && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#050811] border border-[#1E3A5F] text-slate-300">
              {viewData.isExactDate ? (viewData.isToday ? 'วันนี้' : viewData.targetDate) : 'วันนี้ (เกินระยะพยากรณ์ 7 วัน)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={WEATHER_PRESETS.some((p) => p.id === loc?.id) ? loc.id : 'gps'}
            onChange={(e) => {
              const found = WEATHER_PRESETS.find((p) => p.id === e.target.value);
              if (found) setLoc(found);
            }}
            className="bg-[#050811] border border-[#1E3A5F] rounded-lg px-2 py-1 text-[10px] text-slate-200 outline-none"
          >
            {WEATHER_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            {loc?.id === 'gps' && <option value="gps">{loc.label}</option>}
          </select>
          <button type="button" onClick={handleUseGps} disabled={gpsLoading} className="px-2 py-1 rounded-lg bg-[#0F2547] hover:bg-sky-600 border border-[#1E3A5F] text-[10px] text-white transition-colors" title="ใช้ตำแหน่ง GPS ปัจจุบัน">
            <i className={`fas ${gpsLoading ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
          </button>
          <button type="button" onClick={() => loadWeather(loc, true)} disabled={loading} className="px-2 py-1 rounded-lg bg-[#050811] hover:bg-[#0F2547] border border-[#1E3A5F] text-[10px] text-slate-300" title="รีเฟรชข้อมูลอากาศ">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-3 text-center text-[11px] text-sky-400 animate-pulse">
          <i className="fas fa-spinner fa-spin mr-1.5"></i> กำลังดึงข้อมูลท้องฟ้าและ PM2.5 จาก Open-Meteo...
        </div>
      ) : err || !viewData ? (
        <div className="py-2 text-center text-[11px] text-slate-500">{err || 'ไม่พบข้อมูลสภาพอากาศ'}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl bg-[#0B1325] border border-[#1E3A5F] flex items-center justify-center text-base shrink-0 ${viewData.wmo.cls}`}>
              <i className={viewData.wmo.icon}></i>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white truncate">{viewData.wmo.label}</div>
              <div className="text-[10px] font-mono text-slate-300">
                {viewData.isToday && typeof viewData.currTemp === 'number' ? `${Math.round(viewData.currTemp)}°C • ` : ''}
                {Math.round(viewData.tMin)}°–{Math.round(viewData.tMax)}°C
              </div>
              <div className="text-[9px] text-slate-400">
                โอกาสฝน {viewData.rainProb ?? 0}% {viewData.sunset ? `• อาทิตย์ตก ${viewData.sunset}` : ''}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold">ฟ้าเปิดดูจันทร์ (19–23 น.)</span>
              <span className={`font-mono font-bold text-sm ${viewData.moonClarity >= 75 ? 'text-emerald-300' : viewData.moonClarity >= 45 ? 'text-amber-300' : 'text-slate-400'}`}>
                {viewData.moonClarity}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0B1325] overflow-hidden border border-[#1E3A5F]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${viewData.moonClarity >= 75 ? 'bg-emerald-400' : viewData.moonClarity >= 45 ? 'bg-amber-400' : 'bg-slate-500'}`}
                style={{ width: `${viewData.moonClarity}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-400 truncate">{moonTip} (เมฆ {viewData.nightCloud}%)</div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#050811] border border-[#1E3A5F] flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-slate-400 font-bold">ฝุ่น PM2.5</div>
              <div className="font-mono font-bold text-base text-white leading-tight mt-0.5">
                {viewData.pm25 != null ? viewData.pm25.toFixed(1) : '-'}
                <span className="text-[9px] text-slate-400 font-normal ml-1">µg/m³</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 ${pmInfo.cls}`}>
              {pmInfo.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const EVENT_TYPES = {
  official: { color: 'bg-red-500', icon: '🔴', label: 'Official' },
  gathering: { color: 'bg-emerald-500', icon: '🟢', label: 'Gathering' },
  music: { color: 'bg-sky-500', icon: '🔵', label: 'Music Jam' }
};

const getAstroInfo = (year, month, day) => {
  let y = year;
  let m = month + 1;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;

  const synodic = 29.530588;
  const getPhaseAge = (d) => {
    const diff = (d - 2451550.1) % synodic;
    return diff < 0 ? diff + synodic : diff;
  };

  const phaseAge = getPhaseAge(jd);
  const phaseAgePrev = getPhaseAge(jd - 1);
  const phaseAgeNext = getPhaseAge(jd + 1);
  const isPeak = (target) => {
    const d0 = Math.abs(phaseAgePrev - target);
    const d1 = Math.abs(phaseAge - target);
    const d2 = Math.abs(phaseAgeNext - target);
    return d1 < d0 && d1 <= d2;
  };

  const isFullMoon = isPeak(synodic / 2);
  const isNewMoon = isPeak(0) || isPeak(synodic);
  const isFirstQ = isPeak(synodic / 4);
  const isLastQ = isPeak(synodic * 0.75);

  const anomalistic = 27.55455;
  const periDiff = (jd - 2451541.16) % anomalistic;
  const periAge = periDiff < 0 ? periDiff + anomalistic : periDiff;

  const draconic = 27.21222;
  const nodeDiff = (jd - 2451563.8) % draconic;
  const nodeAge = nodeDiff < 0 ? nodeDiff + draconic : nodeDiff;

  let phaseIdx = Math.round((phaseAge / synodic) * 8) % 8;
  if (isFullMoon) phaseIdx = 4;
  else if (isNewMoon) phaseIdx = 0;

  let event = null;
  if (isFullMoon) {
    const distToPeri = Math.min(periAge, anomalistic - periAge);
    const isSupermoon = distToPeri < 1.5;
    const distToNode = Math.min(nodeAge, draconic - nodeAge, Math.abs(nodeAge - draconic / 2));
    const isEclipse = distToNode < 1.2;

    if (isEclipse) event = { type: 'Eclipse', label: '🔴 จันทรุปราคาเต็มดวง (Lunar Eclipse)', style: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] scale-110', emoji: '🔴' };
    else if (isSupermoon) event = { type: 'Supermoon', label: '🌕 ซูเปอร์มูน (Supermoon)', style: 'drop-shadow-[0_0_12px_rgba(253,230,138,1)] scale-125', emoji: '🌕' };
    else if (day >= 30) event = { type: 'Blue Moon', label: '🔵 บลูมูน (Blue Moon)', style: 'drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] scale-110', emoji: '🔵' };
    else event = { type: 'Full Moon', label: '🌕 จันทร์เต็มดวง (Full Moon)', style: 'drop-shadow-[0_0_5px_rgba(254,240,138,0.4)]', emoji: '🌕' };
  }

  const phases = [
    { idx: 0, emoji: '🌑', label: 'จันทร์ดับ (New Moon)' },
    { idx: 1, emoji: '🌒', label: 'จันทร์เสี้ยว (Waxing Crescent)' },
    { idx: 2, emoji: '🌓', label: 'จันทร์ครึ่งดวง (First Qtr)' },
    { idx: 3, emoji: '🌔', label: 'จันทร์ค่อนดวง (Waxing Gibbous)' },
    { idx: 4, emoji: '🌕', label: 'จันทร์เต็มดวง (Full Moon)' },
    { idx: 5, emoji: '🌖', label: 'จันทร์แรม (Waning Gibbous)' },
    { idx: 6, emoji: '🌗', label: 'จันทร์ครึ่งดวง (Last Qtr)' },
    { idx: 7, emoji: '🌘', label: 'จันทร์เสี้ยว (Waning Crescent)' }
  ];

  return { phase: phases[phaseIdx], event, isMainPhase: isFullMoon || isNewMoon || isFirstQ || isLastQ };
};

export default function AssociationCalendar({ isOpen, onClose, events = [] }) {
  const { users, currentUser, getAuthor } = useAuth();
  const { openAppMenu } = useUI();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [invitees, setInvitees] = useState([]);
  const [inviteSearch, setInviteSearch] = useState('');

  if (!isOpen) return null;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const getDayEvents = (dateStr) => events.filter((e) => e.date === dateStr);

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const exportToICS = (event) => {
    const d = event.date.replace(/-/g, '');
    const t = event.time.replace(/:/g, '') + '00';
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${event.title}\nDTSTART:${d}T${t}\nDESCRIPTION:สร้างโดย: ${getAuthor(event.createdBy).displayName}\\nจำนวนคนที่รับ: ${event.max}\\n\\nเข้าร่วมผ่าน The Blue Moon Association\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(e.target);
    const title = fd.get('title');
    const date = fd.get('date');
    const time = fd.get('time');
    const type = fd.get('type');
    const max = parseInt(fd.get('max'), 10);
    const isPromo = fd.get('promo') === 'on';
    const id = 'evt-' + Date.now();

    await db.collection('bma_events').doc(id).set({
      id, title, date, time, type, max, createdBy: currentUser.id,
      going: [currentUser.id], maybe: [], timestamp: Date.now()
    });

    for (const invId of invitees) {
      const dmRm = 'dm_' + [currentUser.id, invId].sort().join('_');
      const mId = 'msg-' + Date.now() + Math.random().toString(36).slice(2, 7);
      await db.collection('bma_messages').doc(mId).set({
        id: mId,
        roomKey: dmRm,
        senderId: currentUser.id,
        receiverId: invId,
        text: '📅 ขอเชิญเข้าร่วมกิจกรรม: ' + title,
        isEventInvite: true,
        eventId: id,
        eventName: title,
        eventDate: date,
        eventTime: time,
        readBy: [currentUser.id],
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        serverCreatedAt: svrTs()
      });
    }

    if (isPromo) {
      const postId = 'post-' + Date.now();
      await db.collection('bma_posts').doc(postId).set({
        id: postId,
        authorId: currentUser.id,
        title: `🗓️ เชิญร่วมกิจกรรม: ${title}`,
        content: `ขอเชิญสมาชิกเข้าร่วมกิจกรรม\n\n**วันที่:** ${date}\n**เวลา:** ${time} น.\n**รายละเอียด:** สามารถดูจำนวนคนและกดเข้าร่วมได้ที่ 📅 ปฏิทินสมาคมครับ!`,
        isGuestAllowed: false,
        attachments: [],
        tags: ['Event'],
        mutedBy: [],
        createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        serverCreatedAt: svrTs(),
        likes: [],
        bookmarks: [],
        comments: []
      });
    }

    setShowCreateForm(false);
    setInvitees([]);
    setInviteSearch('');
  };

  const handleRSVP = async (event, status) => {
    if (!currentUser) return;
    const newGoing = (event.going || []).filter((id) => id !== currentUser.id);
    const newMaybe = (event.maybe || []).filter((id) => id !== currentUser.id);
    if (status === 'going') newGoing.push(currentUser.id);
    else newMaybe.push(currentUser.id);
    await db.collection('bma_events').doc(event.id).update({ going: newGoing, maybe: newMaybe });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-white">
      <div className="bg-[#0B1325] border border-[#1E3A5F] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-[#1E3A5F] bg-[#070C18] gap-3 relative">
          <div className="flex items-center gap-3 pr-8 w-full sm:w-auto">
            <h2 className="text-lg sm:text-xl font-bold text-sky-400 flex items-center gap-1.5 sm:gap-2">
              📅 <span className="hidden sm:inline">Association Calendar</span><span className="sm:hidden">Calendar</span>
            </h2>
            <button type="button" onClick={goToToday} className="btn-d text-[10px] py-1 px-2 border-sky-500/50 hover:bg-sky-900/30 text-sky-300 shrink-0 ml-auto sm:ml-0">
              กลับไปวันนี้
            </button>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-[#050811] p-1 rounded-lg border border-[#1E3A5F] flex gap-1 w-full sm:w-auto">
              <button type="button" onClick={() => setViewMode('month')} className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded text-xs font-bold transition-colors ${viewMode === 'month' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>ตารางเดือน</button>
              <button type="button" onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>แบบรายการ</button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="absolute top-3 right-4 text-slate-400 hover:text-white font-bold text-2xl leading-none p-1">✕</button>
        </div>

        <div className="px-4 pt-3 pb-1 bg-[#070C18] border-b border-[#1E3A5F]/60 shrink-0">
          <CalendarSkyWeatherWidget selectedDate={selectedDate} />
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          <div className="w-full md:w-2/3 flex flex-col p-4 border-r border-[#1E3A5F] overflow-y-auto bg-gradient-to-b from-[#070C18] to-[#050811] custom-scrollbar">
            <div className="flex justify-between items-center mb-4 bg-[#0B1325] p-2 rounded-xl border border-[#1E3A5F]">
              <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-xl hover:text-sky-400 px-4">◀</button>
              <h3 className="text-lg font-bold text-sky-200">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-xl hover:text-sky-400 px-4">▶</button>
            </div>

            {viewMode === 'month' ? (
              <div className="grid grid-cols-7 gap-1 flex-1">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => <div key={d} className="text-center text-xs font-bold text-slate-400 mb-2">{d}</div>)}
                {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} className="p-2 border border-transparent"></div>)}

                {Array(daysInMonth).fill(null).map((_, i) => {
                  const dateNum = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const { phase, event, isMainPhase } = getAstroInfo(currentDate.getFullYear(), currentDate.getMonth(), dateNum);
                  const dayEvents = getDayEvents(dateStr);

                  const handleDateCtx = (e) => {
                    const items = [{ icon: 'fas fa-search', label: 'ดูรายละเอียดวันนี้', onClick: () => setSelectedDate(dateStr) }];
                    if (currentUser) {
                      items.unshift({
                        icon: 'fas fa-plus-circle',
                        label: 'สร้างกิจกรรมในวันนี้ทันที',
                        accent: true,
                        onClick: () => { setSelectedDate(dateStr); setShowCreateForm(true); }
                      });
                    }
                    if (dayEvents.length > 0) {
                      items.push({ type: 'divider' });
                      items.push({ icon: 'fas fa-calendar-plus', label: `ดาวน์โหลด .ICS (${dayEvents[0].title})`, onClick: () => exportToICS(dayEvents[0]) });
                    }
                    openAppMenu(e, {
                      header: { icon: 'fas fa-calendar-day', title: `วันที่ ${dateNum} ${MONTH_NAMES[currentDate.getMonth()]}`, sub: `${dayEvents.length} กิจกรรม` },
                      items
                    });
                  };

                  return (
                    <div
                      key={dateNum}
                      onClick={() => setSelectedDate(dateStr)}
                      onContextMenu={handleDateCtx}
                      {...longPressProps(handleDateCtx)}
                      className={`min-h-[85px] border rounded-xl p-1.5 cursor-pointer transition-all relative flex flex-col items-start ${isSelected ? 'border-sky-400 bg-sky-900/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'border-[#1E3A5F] hover:bg-[#0F2547]'}`}
                    >
                      <span className={`text-sm font-bold ${event ? 'text-sky-200' : 'text-slate-300'}`}>{dateNum}</span>
                      {event ? (
                        <span className={`absolute top-1 right-1 text-xs transition-all ${event.style}`} title={event.label}>{event.emoji}</span>
                      ) : isMainPhase && (
                        <span className="absolute top-1 right-1 text-xs opacity-70" title={phase.label}>{phase.emoji}</span>
                      )}

                      <div className="mt-auto flex flex-wrap gap-1.5 w-full justify-start relative">
                        {dayEvents.map((ev) => (
                          <div key={ev.id} className="relative group flex items-center justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${EVENT_TYPES[ev.type]?.color || 'bg-sky-500'} shadow-sm`}></div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-[100] w-max max-w-[160px] bg-[#0B1325] border border-[#1E3A5F] p-2 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] pointer-events-none">
                              <div className="flex items-center gap-1.5 mb-1 w-full">
                                <Avatar user={getAuthor(ev.createdBy)} size="xs" />
                                <span className="text-[10px] font-bold text-sky-300 truncate w-full">{ev.title}</span>
                              </div>
                              <div className="text-[9px] text-slate-300 font-mono bg-[#050811] px-1.5 py-0.5 rounded w-full text-center">🕒 {ev.time} น.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const dateNum = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
                  const dayEvents = getDayEvents(dateStr);
                  const { phase, event, isMainPhase } = getAstroInfo(currentDate.getFullYear(), currentDate.getMonth(), dateNum);
                  if (dayEvents.length === 0 && !isMainPhase && !event) return null;

                  return (
                    <div key={dateNum} onClick={() => setSelectedDate(dateStr)} className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-colors ${selectedDate === dateStr ? 'border-sky-400 bg-sky-900/20' : 'border-[#1E3A5F] bg-[#0B1325] hover:border-slate-500'}`}>
                      <div className="flex flex-col items-center justify-center w-14 shrink-0 bg-[#050811] rounded-lg border border-[#1E3A5F] py-2">
                        <span className="text-2xl font-bold text-white leading-none mb-1">{dateNum}</span>
                        <span className="text-[9px] text-slate-400">{MONTH_NAMES[currentDate.getMonth()].slice(0, 3)}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        {(event || isMainPhase) && (
                          <div className={`text-[10px] font-bold border-b border-[#1E3A5F] pb-1 inline-block ${event ? 'text-amber-300' : 'text-slate-400'}`}>
                            {event ? event.label : `${phase.emoji} ${phase.label}`}
                          </div>
                        )}
                        {dayEvents.map((ev) => (
                          <div key={ev.id} className="flex flex-col bg-[#050811] p-2.5 rounded-lg border border-[#1E3A5F]">
                            <div className="font-bold text-xs text-sky-200 mb-1 flex items-center gap-1.5">
                              <span className="text-[10px]">{EVENT_TYPES[ev.type]?.icon || '🔵'}</span> {ev.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar user={getAuthor(ev.createdBy)} size="xs" />
                              <span className="text-[10px] text-slate-400">🕒 {ev.time} • โฮสต์: {getAuthor(ev.createdBy).displayName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-full md:w-1/3 bg-[#0B1325] p-4 flex flex-col min-h-0 overflow-y-auto">
            {!showCreateForm ? (
              <>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#1E3A5F]">
                  <h3 className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                    {selectedDate ? <>📍 {selectedDate}</> : '🔍 เลือกวันที่เพื่อดูรายละเอียด'}
                  </h3>
                  {selectedDate && currentUser && (
                    <button type="button" onClick={() => setShowCreateForm(true)} className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md transition-colors">
                      + สร้างกิจกรรม
                    </button>
                  )}
                </div>

                {selectedDate && (() => {
                  const [dYear, dMonthRaw, dNum] = selectedDate.split('-').map(Number);
                  const { phase, event } = getAstroInfo(dYear, dMonthRaw - 1, dNum);
                  return (
                    <div className="bg-gradient-to-br from-[#050811] to-[#0F2547] border border-amber-500/50 p-3 rounded-xl mb-4 text-xs shadow-lg">
                      <div className="font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">✨ ข้อมูลดาราศาสตร์</div>
                      <div className="text-slate-200">{event ? `${event.emoji} ${event.label}` : `${phase.emoji} ${phase.label}`}</div>
                    </div>
                  );
                })()}

                {selectedDate ? (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {getDayEvents(selectedDate).length === 0 ? (
                      <div className="text-slate-500 text-xs text-center py-10 border border-dashed border-[#1E3A5F] rounded-xl">ยังไม่มีกิจกรรมในวันนี้</div>
                    ) : (
                      getDayEvents(selectedDate).map((ev) => (
                        <div key={ev.id} className="bg-[#050811] border border-[#1E3A5F] p-3.5 rounded-xl hover:border-sky-500/50 transition-colors shadow-md">
                          <div className="flex items-start justify-between mb-3 border-b border-[#1E3A5F] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm bg-[#0B1325] p-1.5 rounded-lg border border-[#1E3A5F]">{EVENT_TYPES[ev.type]?.icon || '🔵'}</span>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-sky-100">{ev.title}</span>
                                <span className="text-[9px] text-sky-400 font-mono uppercase tracking-wider">{EVENT_TYPES[ev.type]?.label || ev.type}</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => exportToICS(ev)} className="text-[10px] bg-sky-900/50 text-sky-300 px-2 py-1 rounded border border-sky-700/50 hover:bg-sky-600 hover:text-white transition-colors" title="เพิ่มลงปฏิทินในเครื่อง">🗓️ ICS</button>
                          </div>

                          <div className="flex items-center gap-2 mb-3 bg-[#0B1325] p-2 rounded-lg border border-[#1E3A5F]">
                            <Avatar user={getAuthor(ev.createdBy)} size="xs" />
                            <div className="flex flex-col">
                              <div className="text-[10px] text-slate-400">🕒 เวลา: <span className="text-white font-bold">{ev.time} น.</span></div>
                              <div className="text-[9px] text-slate-500">สร้างโดย: {getAuthor(ev.createdBy).displayName}</div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 mb-2 font-bold flex justify-between px-1">
                            <span>👥 สถานะผู้เข้าร่วม</span>
                            <span className="text-emerald-400">{(ev.going || []).length} / {ev.max} คน</span>
                          </div>

                          {currentUser ? (
                            <div className="flex gap-2 mt-2">
                              <button type="button" onClick={() => handleRSVP(ev, 'going')} className={`flex-1 text-[10px] py-2 rounded-lg font-bold transition-colors ${(ev.going || []).includes(currentUser.id) ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.4)]' : 'bg-emerald-950 border border-emerald-900 text-emerald-400 hover:bg-emerald-900'}`}>✓ ยืนยันเข้าร่วม</button>
                              <button type="button" onClick={() => handleRSVP(ev, 'maybe')} className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold ${(ev.maybe || []).includes(currentUser.id) ? 'bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]' : 'bg-[#050811] border border-[#1E3A5F] text-slate-400 hover:text-amber-300'}`}>🤷 อาจจะไป</button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 text-center mt-3 bg-red-950/30 p-2 rounded border border-red-900/30">กรุณาล็อกอินเพื่อตอบรับเข้าร่วมกิจกรรม</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs text-center py-10 flex flex-col items-center gap-2 opacity-50">
                    <span className="text-4xl">👆</span>คลิกเลือกวันที่บนปฏิทิน
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 border-b border-[#1E3A5F] pb-2">
                  <h3 className="font-bold text-sky-300 text-sm flex items-center gap-1.5">📝 สร้างกิจกรรมใหม่</h3>
                  <button type="button" onClick={() => { setShowCreateForm(false); setInvitees([]); setInviteSearch(''); }} className="text-slate-400 text-xs hover:text-white bg-[#050811] px-2 py-1 rounded border border-[#1E3A5F]">ยกเลิก</button>
                </div>
                <form onSubmit={handleCreateEvent} className="space-y-3.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">ชื่อกิจกรรม <span className="text-red-400">*</span></label>
                    <input name="title" type="text" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg p-2 text-xs outline-none focus:border-sky-500" placeholder="ระบุชื่อกิจกรรม..." />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">วันที่ <span className="text-red-400">*</span></label>
                      <input name="date" type="date" defaultValue={selectedDate} required className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg p-2 text-xs outline-none focus:border-sky-500 text-slate-200" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">เวลา <span className="text-red-400">*</span></label>
                      <input name="time" type="time" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg p-2 text-xs outline-none focus:border-sky-500 text-slate-200" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-[2]">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">ประเภทกิจกรรม <span className="text-red-400">*</span></label>
                      <select name="type" className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg p-2 text-xs outline-none focus:border-sky-500 text-slate-200">
                        <option value="official">🔴 Official Event</option>
                        <option value="gathering">🟢 Member Gathering</option>
                        <option value="music">🔵 Music Jam</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">รับกี่คน <span className="text-red-400">*</span></label>
                      <input name="max" type="number" min="2" defaultValue="10" required className="w-full bg-[#050811] border border-[#1E3A5F] rounded-lg p-2 text-xs outline-none focus:border-sky-500 text-slate-200" />
                    </div>
                  </div>

                  <div className="p-3 bg-[#050811] border border-[#1E3A5F] rounded-xl space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-amber-300">✉️ ส่งคำเชิญ (Direct Message)</label>
                      <span className="text-[9px] text-slate-400 bg-[#0B1325] px-1.5 py-0.5 rounded">เลือกได้หลายคน</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">🔍</span>
                      <input type="text" value={inviteSearch} onChange={(e) => setInviteSearch(e.target.value)} placeholder="ค้นหาชื่อ, ID, หมวดหมู่ (Tag)..." className="w-full bg-[#0B1325] border border-[#1E3A5F] rounded-lg py-1.5 pl-7 pr-2 text-[10px] text-white outline-none focus:border-amber-500" />
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1 border border-white/5 rounded-md p-1 bg-[#070C18]">
                      {users
                        .filter((u) => u.isActivated && u.id !== currentUser?.id && (
                          u.displayName.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                          u.id.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                          getTags(u).some((t) => t.toLowerCase().includes(inviteSearch.toLowerCase()))
                        ))
                        .map((u) => (
                          <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-[#0F2547] rounded-lg cursor-pointer border border-transparent hover:border-[#1E3A5F]">
                            <input
                              type="checkbox"
                              checked={invitees.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) setInvitees([...invitees, u.id]);
                                else setInvitees(invitees.filter((id) => id !== u.id));
                              }}
                              className="accent-amber-500 w-3 h-3"
                            />
                            <Avatar user={u} size="xs" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-bold text-slate-200 truncate">{u.displayName}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{u.id}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                    {invitees.length > 0 && <div className="text-[10px] font-bold text-amber-400 text-right mt-1">เลือกผู้รับคำเชิญแล้ว {invitees.length} คน</div>}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] mt-2 p-2.5 bg-sky-950/30 rounded-xl border border-sky-900/50 hover:bg-sky-900/50">
                    <input type="checkbox" name="promo" defaultChecked className="accent-sky-500 w-4 h-4" />
                    <span className="text-sky-200 font-bold">ประกาศโปรโมตลง Board อัตโนมัติ</span>
                  </label>

                  <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl text-sm mt-4 shadow-lg">✅ ยืนยันสร้างกิจกรรม</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}