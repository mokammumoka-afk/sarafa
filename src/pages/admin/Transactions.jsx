import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';
import { exportToCsv } from '../../lib/exportCsv';
import StatusBadge from '../../components/shared/StatusBadge';

const TABS = [
  { value: 'deposit_pending', label: 'شحن معلق', type: 'deposit', status: 'pending' },
  { value: 'sell_pending', label: 'بيع معلق', type: 'sell_usdt', status: 'pending' },
  { value: 'withdraw_pending', label: 'سحب معلق', type: 'withdraw', status: 'pending' },
  { value: 'completed', label: 'مكتمل', status: 'completed' },
  { value: 'cancelled', label: 'ملغي', status: 'cancelled' },
  { value: 'all', label: 'الكل' }
];

export default function AdminTransactions() {
  const { user } = useAuth();
  const [tab, setTab] = useState('deposit_pending');
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState({});

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    const cfg = TABS.find((t) => t.value === tab);
    let q = supabase.from('transactions').select('*, profiles(full_name, phone, gpay_wallet_id, gpay_number)')
      .order('created_at', { ascending: false }).limit(100);
    if (cfg.type) q = q.eq('type', cfg.type);
    if (cfg.status) q = q.eq('status', cfg.status);
    const { data } = await q;
    setTxns(data || []);
    setLoading(false);
  }

  async function confirmDeposit(t) {
    const { error } = await supabase.rpc('confirm_deposit', {
      p_transaction_id: t.id, p_user_id: t.user_id, p_amount_lyd: t.amount_lyd, p_admin_id: user.id
    });
    if (error) return toast.error(error.message);
    toast.success('تم تأكيد الشحن'); load();
  }

  async function confirmSell(t) {
    const { error } = await supabase.rpc('confirm_sell', { p_transaction_id: t.id, p_admin_id: user.id, p_admin_note: noteDraft[t.id] || null });
    if (error) return toast.error(error.message);
    toast.success('تم تأكيد البيع'); load();
  }

  async function rejectSell(t) {
    const reason = noteDraft[t.id];
    if (!reason) return toast.error('يجب إدخال سبب الرفض');
    const { error } = await supabase.rpc('reject_sell', { p_transaction_id: t.id, p_admin_id: user.id, p_reason: reason });
    if (error) return toast.error(error.message);
    toast.success('تم رفض الطلب'); load();
  }

  async function executeWithdraw(t) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ transaction_id: t.id, note: noteDraft[t.id] })
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    toast.success('تم تنفيذ التحويل'); load();
  }

  async function rejectWithdraw(t) {
    const reason = noteDraft[t.id];
    if (!reason) return toast.error('يجب إدخال سبب الرفض');
    const { error } = await supabase.rpc('reject_withdraw', { p_transaction_id: t.id, p_admin_id: user.id, p_reason: reason });
    if (error) return toast.error(error.message);
    toast.success('تم رفض الطلب'); load();
  }

  function exportCsv() {
    exportToCsv(`transactions-${tab}-${Date.now()}.csv`, txns.map((t) => ({
      id: t.id, user: t.profiles?.full_name || '', type: t.type, status: t.status,
      amount_lyd: t.amount_lyd, amount_usdt: t.amount_usdt, created_at: t.created_at, completed_at: t.completed_at
    })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">إدارة المعاملات</h1>
        <button onClick={exportCsv} disabled={!txns.length} className="flex items-center gap-1.5 text-sm bg-surface-800 border border-white/10 px-3 py-2 rounded-xl disabled:opacity-40">
          <Download size={15} /> تصدير CSV
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border ${tab === t.value ? 'bg-accent-400 text-primary-900 border-accent-400' : 'border-white/10 text-zinc-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <div className="h-16 skeleton rounded-xl" />}
        {!loading && txns.length === 0 && <p className="text-zinc-500 text-sm py-8 text-center">لا توجد معاملات</p>}

        {txns.map((t) => (
          <div key={t.id} className="bg-surface-900 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{t.profiles?.full_name || 'مستخدم'} · {TYPE_LABELS[t.type]}</p>
                <p className="text-xs text-zinc-500">{formatDate(t.created_at)}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm text-zinc-400 mb-3">
              {t.amount_lyd > 0 && <span>المبلغ: <b className="text-white">{formatLYD(t.amount_lyd)}</b></span>}
              {t.amount_usdt > 0 && <span>الكمية: <b className="text-white">{formatUSDT(t.amount_usdt)}</b></span>}
              {t.gpay_reference && <span>المرجع: <b className="text-white ltr">{t.gpay_reference}</b></span>}
            </div>

            {t.type === 'sell_usdt' && t.usdt_hash && (
              <div className="text-xs text-zinc-500 mb-2">هاش: <span className="ltr font-mono">{t.usdt_hash}</span></div>
            )}
            {t.receipt_image && (
              <a href={t.receipt_image} target="_blank" rel="noreferrer" className="text-xs text-accent-400 underline block mb-2">عرض صورة الإيصال</a>
            )}
            {t.type === 'withdraw' && (
              <p className="text-xs text-zinc-500 mb-2">رقم GPAY المستلم: <span className="ltr">{t.profiles?.gpay_number || '—'}</span></p>
            )}

            {t.status === 'pending' && (
              <div className="flex items-center gap-2 mt-2">
                <input placeholder="ملاحظة / سبب الرفض" value={noteDraft[t.id] || ''}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                  className="flex-1 bg-surface-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none" />

                {t.type === 'deposit' && (
                  <button onClick={() => confirmDeposit(t)} className="text-xs px-3 py-1.5 rounded-lg bg-success/20 text-success font-medium">تأكيد يدوي</button>
                )}
                {t.type === 'sell_usdt' && (
                  <>
                    <button onClick={() => confirmSell(t)} className="text-xs px-3 py-1.5 rounded-lg bg-success/20 text-success font-medium">تأكيد الاستلام</button>
                    <button onClick={() => rejectSell(t)} className="text-xs px-3 py-1.5 rounded-lg bg-danger/20 text-danger font-medium">رفض</button>
                  </>
                )}
                {t.type === 'withdraw' && (
                  <>
                    <button onClick={() => executeWithdraw(t)} className="text-xs px-3 py-1.5 rounded-lg bg-success/20 text-success font-medium">تنفيذ التحويل</button>
                    <button onClick={() => rejectWithdraw(t)} className="text-xs px-3 py-1.5 rounded-lg bg-danger/20 text-danger font-medium">رفض</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
