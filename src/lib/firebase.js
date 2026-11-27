import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyD80Ml5mk7IGFOx0qx4HRL-D_3TEy9h0YI",
  authDomain: "tbmasite.firebaseapp.com",
  projectId: "tbmasite",
  storageBucket: "tbmasite.firebasestorage.app",
  messagingSenderId: "616851307256",
  appId: "1:616851307256:web:15b49dfec2de521af6990d",
  measurementId: "G-JDW0E0S138"
};

export const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// เปิดใช้งาน Firebase App Check (reCAPTCHA Enterprise)
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6Lc6STMuAAAAAEoaBemOcdQOXtbXHlwTUDjxOAZ9';
if (firebase.appCheck && RECAPTCHA_ENTERPRISE_SITE_KEY && !window.__tbmaAppCheckActivated) {
  window.__tbmaAppCheckActivated = true;
  try {
    const loadRecaptchaEnterprise = () => new Promise((resolve, reject) => {
      if (window.grecaptcha && window.grecaptcha.enterprise) return resolve(window.grecaptcha.enterprise);
      const existing = document.querySelector('script[src*="recaptcha/enterprise.js"]');
      const waitReady = () => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.enterprise) {
            clearInterval(timer);
            resolve(window.grecaptcha.enterprise);
          } else if (Date.now() - started > 10000) {
            clearInterval(timer);
            reject(new Error('reCAPTCHA Enterprise load timeout'));
          }
        }, 100);
      };
      if (existing) return waitReady();
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(RECAPTCHA_ENTERPRISE_SITE_KEY)}`;
      s.async = true;
      s.onload = waitReady;
      s.onerror = () => reject(new Error('Failed to load reCAPTCHA Enterprise script'));
      document.head.appendChild(s);
    });

    firebase.appCheck(app).activate({
      getToken: async () => {
        const enterprise = await loadRecaptchaEnterprise();
        const rcToken = await new Promise((resolve, reject) => {
          enterprise.ready(() => {
            enterprise.execute(RECAPTCHA_ENTERPRISE_SITE_KEY, { action: 'fire_app_check' })
              .then(resolve)
              .catch(reject);
          });
        });
        const res = await fetch(
          `https://content-firebaseappcheck.googleapis.com/v1/projects/${firebaseConfig.projectId}/apps/${firebaseConfig.appId}:exchangeRecaptchaEnterpriseToken?key=${firebaseConfig.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recaptcha_enterprise_token: rcToken })
          }
        );
        const data = await res.json();
        if (!res.ok || !data.token) {
          throw new Error(data?.error?.message || 'App Check exchange failed');
        }
        const ttlSec = parseFloat(String(data.ttl || '3600s').replace('s', '')) || 3600;
        return { token: data.token, expireTimeMillis: Date.now() + ttlSec * 1000 };
      }
    }, true);
  } catch (e) {
    console.warn('App Check init skipped:', e);
  }
}

export const db = firebase.firestore(app);
export const auth = firebase.auth(app);
export const svrTs = () => firebase.firestore.FieldValue.serverTimestamp();
export const FieldValue = firebase.firestore.FieldValue;

export const tbmaAuthRequest = async (payload) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
  if (data.customToken) {
    await auth.signInWithCustomToken(data.customToken);
  }
  return data;
};

// เผื่อเรียกทดสอบใน DevTools Console
if (typeof window !== 'undefined') {
  window.firebase = firebase;
  window.tbmaAuthRequest = tbmaAuthRequest;
}

export default firebase;