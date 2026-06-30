import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';

export default function P2PNewOrder() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const total = amount && price ? (Number(amount) * Number(price)).toFixed(2) : '0.00';

  async function submit(e) {
    e.preventDefault();
    const a = Number(amount), p = Number(price);
    if (!a || a <= 0) return toast.error('أدخل كمية صحيحة');
    if (!p || p <= 0) return toast.error('أدخل سعراً صحيحاً');
    if (a > Number(profile?.balance_usdt || 0)) return toast.error('رصيد USDT غير كافٍ');

    setBusy(true);
    const { error } = await supabase.rpc('create_p2p_order', {
      p_seller_id: user.id, p_amount_usdt: a, p_price_per_usdt: p
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes('P2P00') ? 'سوق P2P غير مفعّل حالياً' : error.message);
    toast.success('تم نشر عرض البيع');
    navigate('/p2p');
  }

  return (
    <div>
      <PageHeader title="عرض بيع جديد" to="/p2p" />
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm text-zinc-400 border border-white/5">
          رصيدك المتاح: <b className="text-white">{profile?.balance_usdt} USDT</b>
        </div>

        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">كمية USDT المعروضة للبيع</span>
          <input type="number" step="0.000001" min="0" max={profile?.balance_usdt} required value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">السعر لكل USDT (دينار ليبي)</span>
          <input type="number" step="0.0001" min="0" required value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
        </label>

        <div className="bg-accent-400/10 border border-accent-400/20 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-400">المبلغ الإجمالي الذي ستستلمه</p>
          <p className="font-heading font-bold text-2xl text-accent-400">{total} د.ل</p>
        </div>

        <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span className="text-zinc-400">طريقة الدفع</span>
          <span className="font-medium">GPAY</span>
        </div>

        <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
          {busy ? 'جارِ النشر...' : 'نشر عرض البيع'}
        </button>
        <p className="text-xs text-zinc-500 text-center">سيتم حجز الكمية من محفظتك حتى يكتمل البيع أو يُلغى العرض</p>
      </form>
    </div>
  );
}
