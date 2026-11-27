import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { activeMembers, isUsersLoaded, currentUser, signIn, signOut } = useAuth();
  const [idInput, setIdInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleTestLogin = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signIn({ identifier: idInput, password: passInput, remember: true });
      setIdInput('');
      setPassInput('');
    } catch (error) {
      setErr(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-white flex items-center justify-center p-4">
      <div className="card p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
          <div>
            <h1 className="text-base font-bold text-sky-300">TBMAsite v2 (Vite Core Test)</h1>
            <p className="text-[11px] text-slate-400">Phase 1 Verification</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            Vite Ready
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#050811] border border-[#1E3A5F] text-xs space-y-1.5 font-mono">
          <div>Firestore Users: <strong className="text-sky-300">{isUsersLoaded ? `${activeMembers.length} active` : 'Loading...'}</strong></div>
          <div>Auth Status: <strong className={currentUser ? 'text-emerald-400' : 'text-amber-300'}>{currentUser ? `${currentUser.displayName} (${currentUser.id} / ${currentUser.role})` : 'Guest (Anonymous)'}</strong></div>
        </div>

        {currentUser ? (
          <button onClick={signOut} className="w-full py-2 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold hover:bg-red-900 hover:text-white">
            ออกจากระบบ
          </button>
        ) : (
          <form onSubmit={handleTestLogin} className="space-y-2.5 text-xs">
            <input type="text" value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="รหัสสมาชิก หรือ Username" className="w-full inp" required />
            <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder="รหัสผ่าน" className="w-full inp" required />
            {err && <div className="p-2 rounded-lg bg-red-950 text-red-300">{err}</div>}
            <button type="submit" disabled={busy} className="w-full btn-w py-2">
              {busy ? 'กำลังเข้าสู่ระบบ...' : 'ทดสอบ Login ผ่าน /api/auth'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}