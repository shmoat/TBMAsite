import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/core.css';
import './styles/themes.css';
import { auth } from './lib/firebase';
import { installLinkGuard } from './lib/security';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import App from './App';

installLinkGuard();

function AuthGate({ children }) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const unsub = auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        if (active) setAuthReady(false);
        try {
          await auth.signInAnonymously();
        } catch (err) {
          console.error('Anonymous sign-in failed:', err);
          if (active) setAuthReady(true);
        }
      } else {
        if (active) setAuthReady(true);
      }
    });
    return () => { active = false; unsub(); };
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050811] text-sky-300 gap-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono tracking-wider">กำลังเชื่อมต่อระบบ...</p>
      </div>
    );
  }
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthGate>
    <AuthProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AuthProvider>
  </AuthGate>
);