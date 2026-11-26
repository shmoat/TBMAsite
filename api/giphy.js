const rateMap = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ป้องกันเว็บอื่นแอบยิงมาใช้โควตาจาก Endpoint ของเรา
  const host = req.headers.host || '';
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !origin.includes(host) && !origin.includes('localhost')) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  // Rate Limit พื้นฐาน: สูงสุด 40 ครั้ง/นาที ต่อ IP
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  if (rateMap.size > 500) rateMap.clear();
  const rec = rateMap.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > rec.resetAt) {
    rec.count = 1;
    rec.resetAt = now + 60000;
  } else {
    rec.count += 1;
  }
  rateMap.set(ip, rec);
  if (rec.count > 40) {
    return res.status(429).json({ error: 'Too many requests', data: [] });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GIPHY_API_KEY is not configured', data: [] });
  }

  const rawType = String(req.query.type || 'trending').toLowerCase();
  const rawKind = String(req.query.kind || 'gifs').toLowerCase();
  const kind = rawKind === 'stickers' ? 'stickers' : 'gifs';
  const q = String(req.query.q || '').trim().slice(0, 100);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = Math.min(200, Math.max(0, parseInt(req.query.offset, 10) || 0));
  const rating = ['g', 'pg', 'pg-13'].includes(String(req.query.rating || 'pg-13').toLowerCase())
    ? String(req.query.rating || 'pg-13').toLowerCase()
    : 'pg-13';

  const endpoint = (rawType === 'search' && q) ? 'search' : 'trending';
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    offset: String(offset),
    rating
  });
  if (endpoint === 'search') {
    params.set('q', q);
    params.set('lang', 'th');
  }

  try {
    const giphyRes = await fetch(`https://api.giphy.com/v1/${kind}/${endpoint}?${params.toString()}`);
    const data = await giphyRes.json();

    if (!giphyRes.ok) {
      return res.status(giphyRes.status).json({ error: 'Giphy API error', data: [] });
    }

    // แคชไว้ 60 วินาทีบน Edge เพื่อลดการยิง Giphy ซ้ำและโหลดไวขึ้น
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Giphy', data: [] });
  }
};