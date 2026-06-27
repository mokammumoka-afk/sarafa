import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

const STATUS_LABELS = { open: 'مفتوحة', in_progress: 'قيد المعالجة', waiting_user: 'بانتظار المستخدم', resolved: 'محلولة', closed: 'مغلقة' };
const PRIORITY_LABELS = { low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' };
const PRIORITY_COLORS = { low: 'text-zinc-400', normal: 'text-accent-400', high: 'text-warning', urgent: 'text-danger' };

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [status]);

  async function load() {
    setLoading(true);
    let q = supabase.from('support_tickets').select('*, profiles(full_name, phone, email)').order('updated_at', { ascending: false }).limit(100);
    if (status !== 'all') q = q.eq('status', status);
    const { data } = await q;
    setTickets(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">إدارة الدعم الفني</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border ${status === s ? 'bg-accent-400 text-primary-900 border-accent-400' : 'border-white/10 text-zinc-400'}`}>
            {s === 'all' ? 'الكل' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-400 text-xs">
            <tr>
              <th className="px-4 py-3 text-right">المستخدم</th>
              <th className="px-4 py-3 text-right">الموضوع</th>
              <th className="px-4 py-3 text-right">الأولوية</th>
              <th className="px-4 py-3 text-right">آخر رد</th>
              <th className="px-4 py-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">جارِ التحميل...</td></tr>}
            {!loading && tickets.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">لا توجد تذاكر</td></tr>}
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="px-4 py-3"><Link to={`/admin/support/${t.id}`} className="hover:text-accent-400">{t.profiles?.full_name || 'مستخدم'}</Link></td>
                <td className="px-4 py-3">{t.subject}</td>
                <td className={`px-4 py-3 ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{t.last_reply_at ? formatDate(t.last_reply_at) : '—'}</td>
                <td className="px-4 py-3 text-zinc-300">{STATUS_LABELS[t.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
