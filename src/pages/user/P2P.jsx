import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowUpDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import PageHeader from '../../components/shared/PageHeader';
import EmptyState from '../../components/shared/EmptyState';
import { formatLYD, formatUSDT, formatDate } from '../../lib/utils';

const STATUS_LABELS = { open: 'متاح', in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي' };
const STATUS_COLORS = { open: 'text-success bg-success/10', in_progress: 'text-warning bg-warning/10', completed: 'text-zinc-400 bg-zinc-400/10', cancelled: 'text-danger bg-danger/10' };

export default function P2P() {
  const { user } = useAuth();
  const { p2pSettings } = useSettings();
  const navigate = useNavigate();
  const [tab, setTab] = useState('market');
  const [orders, setOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: open }, { data: mine }] = await Promise.all([
      supabase.from('p2p_orders').select('*').eq('status', 'open').order('price_per_usdt', { ascending: sortAsc }),
      supabase.from('p2p_orders')
        .select('*, seller:profiles!seller_id(full_name, gpay_number), buyer:profiles!buyer_id(full_name, gpay_number)')
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
    ]);
    setOrders(open || []);
    setMyOrders(mine || []);
    setLoading(false);
  }, [user, sortAsc]);

  useEffect(() => { if (user) load(); }, [load, user]);

  async function buy(orderId) {
    setBusy(orderId);
    const { error } = await supabase.rpc('take_p2p_order', { p_order_id: orderId, p_buyer_id: user.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('تم حجز العرض — راجع "عروضي" لإتمام الدفع');
    setTab('mine');
    load();
  }

  async function cancel(orderId) {
    setBusy(orderId);
    const { error } = await supabase.rpc('cancel_p2p_order', { p_order_id: orderId, p_user_id: user.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('تم إلغاء العرض');
    load();
  }

  async function complete(orderId) {
    setBusy(orderId);
    const { error } = await supabase.rpc('complete_p2p_order', { p_order_id: orderId, p_seller_id: user.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('تم إكمال الصفقة');
    load();
  }

  function copyGpay(number) {
    navigator.clipboard.writeText(number || '');
    toast.success('تم نسخ رقم GPAY');
  }

  if (!p2pSettings.enabled) {
    return (
      <div>
        <PageHeader title="سوق P2P" />
        <EmptyState title="سوق P2P غير مفعّل حالياً" subtitle="سيتم تفعيله من لوحة التحكم قريباً" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="سوق P2P"
        action={<button onClick={() => navigate('/p2p/new')} className="flex items-center gap-1 bg-accent-400 text-primary-900 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"><Plus size={14} /> عرض جديد</button>}
      />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('market')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === 'market' ? 'bg-accent-400 text-primary-900' : 'bg-surface-800 text-zinc-400'}`}>السوق</button>
        <button onClick={() => setTab('mine')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === 'mine' ? 'bg-accent-400 text-primary-900' : 'bg-surface-800 text-zinc-400'}`}>عروضي</button>
      </div>

      {tab === 'market' && (
        <div className="space-y-3">
          <button onClick={() => setSortAsc((s) => !s)} className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
            <ArrowUpDown size={13} /> ترتيب حسب السعر ({sortAsc ? 'الأقل أولاً' : 'الأعلى أولاً'})
          </button>
          {loading && <div className="h-20 skeleton rounded-xl" />}
          {!loading && orders.length === 0 && <EmptyState title="لا توجد عروض بيع متاحة الآن" />}
          {orders.map((o) => (
            <div key={o.id} className="bg-surface-800 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">{formatUSDT(o.amount_usdt)}</p>
                <span className="text-xs text-zinc-500">{formatDate(o.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-3">
                <span>السعر: <b className="text-accent-400">{o.price_per_usdt}</b> د.ل</span>
                <span>الإجمالي: <b className="text-white">{formatLYD(o.total_lyd)}</b></span>
              </div>
              <button
                disabled={busy === o.id || o.seller_id === user.id}
                onClick={() => buy(o.id)}
                className="w-full bg-accent-400 text-primary-900 font-bold py-2.5 rounded-xl text-sm disabled:opacity-40"
              >
                {o.seller_id === user.id ? 'عرضك الخاص' : busy === o.id ? '...' : 'شراء'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'mine' && (
        <div className="space-y-3">
          {loading && <div className="h-20 skeleton rounded-xl" />}
          {!loading && myOrders.length === 0 && <EmptyState title="لا توجد لديك عروض" />}
          {myOrders.map((o) => {
            const isSeller = o.seller_id === user.id;
            const counterpart = isSeller ? o.buyer : o.seller;
            return (
              <div key={o.id} className="bg-surface-800 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">{formatUSDT(o.amount_usdt)} <span className="text-xs text-zinc-500">{isSeller ? '(بيع)' : '(شراء)'}</span></p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </div>
                <p className="text-sm text-zinc-400 mb-2">السعر: {o.price_per_usdt} د.ل — الإجمالي: {formatLYD(o.total_lyd)}</p>

                {o.status === 'in_progress' && counterpart && (
                  <div className="bg-surface-900 rounded-lg p-3 text-sm mb-3">
                    <p className="text-xs text-zinc-500 mb-1">{isSeller ? 'المشتري' : 'البائع'}: {counterpart.full_name || '—'}</p>
                    {!isSeller && (
                      <div className="flex items-center justify-between">
                        <span className="ltr text-accent-400">{counterpart.gpay_number || '—'}</span>
                        <button onClick={() => copyGpay(counterpart.gpay_number)} className="text-zinc-400"><Copy size={14} /></button>
                      </div>
                    )}
                    {!isSeller && <p className="text-xs text-zinc-500 mt-2">حوّل المبلغ عبر GPAY ثم انتظر تأكيد البائع</p>}
                  </div>
                )}

                <div className="flex gap-2">
                  {isSeller && o.status === 'open' && (
                    <button disabled={busy === o.id} onClick={() => cancel(o.id)} className="flex-1 bg-danger/15 text-danger text-sm font-medium py-2 rounded-lg">إلغاء</button>
                  )}
                  {isSeller && o.status === 'in_progress' && (
                    <>
                      <button disabled={busy === o.id} onClick={() => complete(o.id)} className="flex-1 bg-success/15 text-success text-sm font-medium py-2 rounded-lg">تأكيد استلام الدفع</button>
                      <button disabled={busy === o.id} onClick={() => cancel(o.id)} className="flex-1 bg-danger/15 text-danger text-sm font-medium py-2 rounded-lg">إلغاء</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
