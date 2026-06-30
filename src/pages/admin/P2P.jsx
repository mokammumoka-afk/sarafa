import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatLYD, formatUSDT, formatDate } from '../../lib/utils';

const STATUS_LABELS = { open: 'متاح', in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي' };
const STATUS_COLORS = { open: 'text-success bg-success/10', in_progress: 'text-warning bg-warning/10', completed: 'text-zinc-400 bg-zinc-400/10', cancelled: 'text-danger bg-danger/10' };

export default function AdminP2P() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [status]);

  async function load() {
    setLoading(true);
    let q = supabase.from('p2p_orders')
      .select('*, seller:profiles!seller_id(full_name, email), buyer:profiles!buyer_id(full_name, email)')
      .order('created_at', { ascending: false }).limit(100);
    if (status !== 'all') q = q.eq('status', status);
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  }

  async function forceCancel(id) {
    if (!confirm('إلغاء هذا العرض وإرجاع USDT للبائع؟')) return;
    const { error } = await supabase.rpc('cancel_p2p_order', { p_order_id: id, p_user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success('تم الإلغاء');
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">سوق P2P — مراقبة العروض</h1>
      <p className="text-sm text-zinc-500">تفعيل/تعطيل السوق ونسبة العمولة من صفحة الإعدادات. هنا يمكنك مراقبة العروض وإلغاء أي عرض متعثر عند الحاجة.</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((s) => (
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
              <th className="px-4 py-3 text-right">البائع</th>
              <th className="px-4 py-3 text-right">المشتري</th>
              <th className="px-4 py-3 text-right">الكمية</th>
              <th className="px-4 py-3 text-right">السعر</th>
              <th className="px-4 py-3 text-right">الإجمالي</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">جارِ التحميل...</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">لا توجد عروض</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-white/5">
                <td className="px-4 py-2.5">{o.seller?.full_name || '—'}</td>
                <td className="px-4 py-2.5">{o.buyer?.full_name || '—'}</td>
                <td className="px-4 py-2.5">{formatUSDT(o.amount_usdt)}</td>
                <td className="px-4 py-2.5">{o.price_per_usdt}</td>
                <td className="px-4 py-2.5">{formatLYD(o.total_lyd)}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{formatDate(o.created_at)}</td>
                <td className="px-4 py-2.5">
                  {(o.status === 'open' || o.status === 'in_progress') && (
                    <button onClick={() => forceCancel(o.id)} className="text-xs px-3 py-1.5 rounded-lg bg-danger/15 text-danger font-medium">إلغاء</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
