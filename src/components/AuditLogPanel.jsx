import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';

export function AuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const snap = await db.collection('bma_audit_logs').orderBy('ts', 'desc').limit(50).get();
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Load audit logs failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="p-4 rounded-2xl bg-[#0A162C]/90 border border-amber-500/35 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
        <div className="font-bold text-amber-300 text-sm">🛡️ ประวัติการจัดการระบบ (Audit Log ล่าสุด 50 รายการ)</div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="px-3 py-1 rounded-xl bg-[#040914] hover:bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-bold transition-colors"
        >
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1.5 text-xs pr-1">
        {logs.length === 0 ? (
          <div className="text-center text-slate-400 py-6">ยังไม่มีประวัติการบันทึก</div>
        ) : (
          logs.map((item) => (
            <div key={item.id} className="p-2.5 rounded-xl bg-[#040914] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] mr-1.5">{item.action}</span>
                <span className="text-white font-bold">{item.target}</span>
                {item.detail && <span className="text-slate-300 ml-1.5">— {item.detail}</span>}
              </div>
              <div className="text-[10px] text-slate-400 font-mono shrink-0">
                โดย {item.actorName} ({item.actorId}) · {item.createdAt}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}