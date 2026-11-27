import { db } from './firebase';

export const safeUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^data:(image\/(png|jpeg|jpg|gif|webp)|audio\/(webm|mpeg|mp4|ogg));base64,/i.test(trimmed)) {
    return trimmed;
  }
  const noCtrl = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (/^(javascript|vbscript|data|file):/i.test(noCtrl)) return '';
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : (trimmed.startsWith('/') ? trimmed : 'https://' + trimmed);
  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {}
  return '';
};

export const promptSafeUrl = (message = 'วางลิงก์ (ต้องขึ้นต้นด้วย https://)') => {
  const input = window.prompt(message);
  if (!input) return null;
  const clean = safeUrl(input);
  if (!clean || !/^https?:\/\//i.test(clean)) {
    alert('ลิงก์ไม่ถูกต้องหรือไม่ได้ขึ้นต้นด้วย https:// (ระบบบล็อกเพื่อความปลอดภัย)');
    return null;
  }
  return clean;
};

export const installLinkGuard = () => {
  if (window.__tbmaLinkGuardInstalled) return;
  window.__tbmaLinkGuardInstalled = true;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const rawHref = (a.getAttribute('href') || '').trim();
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('/')) return;

    if (/^(javascript:|vbscript:|data:\s*text\/html|data:\s*image\/svg\+xml)/i.test(rawHref)) {
      e.preventDefault();
      e.stopPropagation();
      alert('ระบบบล็อกลิงก์นี้เนื่องจากอาจไม่ปลอดภัย');
      return;
    }

    if (a.getAttribute('target') === '_blank') {
      const curRel = (a.getAttribute('rel') || '').toLowerCase();
      if (!curRel.includes('noopener') || !curRel.includes('noreferrer')) {
        a.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }, true);
};

export const logAdminAudit = async ({ action, target = '-', detail = '', actor = null }) => {
  try {
    if (!action) return;
    const now = new Date();
    const payload = {
      action: String(action).slice(0, 80),
      target: String(target || '-').slice(0, 120),
      detail: String(detail || '').slice(0, 400),
      actorId: String(actor?.id || 'SYSTEM').slice(0, 60),
      actorName: String(actor?.displayName || actor?.username || actor?.name || 'System').slice(0, 80),
      actorRole: String(actor?.role || 'Unknown').slice(0, 30),
      createdAt: now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      ts: Date.now()
    };
    await db.collection('bma_audit_logs').add(payload);
  } catch (err) {
    console.warn('Audit log skipped:', err);
  }
};