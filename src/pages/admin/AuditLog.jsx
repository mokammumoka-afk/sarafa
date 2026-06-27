import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_log').select('*, admin:admin_id(full_name)').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">سجل التدقيق</h1>
      <p className="text-sm text-zinc-500">سجل غير قابل للحذف أو التعديل لكل إجراءات المسؤولين</p>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-400 text-xs">
            <tr>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">المسؤول</th>
              <th className="px-4 py-3 text-right">الإجراء</th>
              <th className="px-4 py-3 text-right">الهدف</th>
              <th className="px-4 py-3 text-right">السبب</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">جارِ التحميل...</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">لا توجد سجلات</td></tr>}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-white/5">
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{formatDate(l.created_at)}</td>
                <td className="px-4 py-2.5">{l.admin?.full_name || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-2.5 text-zinc-400 text-xs ltr text-right">{l.target_type} · {l.target_id?.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-zinc-400">{l.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
