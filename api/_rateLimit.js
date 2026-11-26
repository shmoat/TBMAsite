const buckets = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// ตรวจว่าคำขอถูกส่งมาจากโดเมนเว็บเราเองเท่านั้น
function verifySameOrigin(req) {
  const host = (req.headers.host || '').toLowerCase();
  const origin = (req.headers.origin || req.headers.referer || '').toLowerCase();
  if (!origin) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return Boolean(host && origin.includes(host));
}

// จำกัดจำนวนคำขอต่อ IP ภายในช่วงเวลาที่กำหนด
function checkRateLimit(req, res, { keyPrefix = 'global', limit = 30, windowMs = 60000 } = {}) {
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `${keyPrefix}:${ip}`;

  if (buckets.size > 1000) {
    for (const [k, v] of buckets.entries()) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  let entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
  } else {
    entry.count += 1;
  }
  buckets.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (entry.count > limit) {
    res.setHeader('Retry-After', String(retryAfterSec));
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true, remaining };
}

module.exports = { verifySameOrigin, checkRateLimit, getClientIp };