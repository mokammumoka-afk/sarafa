import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../hooks/useExchangeRate';

export default function BuyUsdt() {
  const { user, profile } = useAuth();
  const { rate } = useExchangeRate();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const usdtReceived = rate && amount ? (Number(amount) / rate.sell_rate).toFixed(6) : '0.000000';

  async function confirmBuy() {
    setBusy(true);
    const { data, error } = await supabase.rpc('buy_usdt_atomic', {
      p_user_id: user.id, p_amount_lyd: Number(amount), p_sell_rate: rate.sell_rate
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes('BAL01') ? 'رصيد غير كافٍ' : error.message);
    toast.success('تم شراء USDT بنجاح');
    navigate(`/transaction/${data}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-xl">شراء USDT</h1>
      <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm text-zinc-400 border border-white/5">
        سعر البيع الحالي: <b className="text-success">{rate?.sell_rate ?? '—'}</b> د.ل لكل USDT
      </div>

      <label className="block">
        <span className="text-sm text-zinc-400 mb-1.5 block">المبلغ بالدينار</span>
        <input type="number" min="1" max={profile?.balance_lyd} value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-4 text-2xl font-heading outline-none ltr text-left" />
        <span className="text-xs text-zinc-500 mt-1 block">الرصيد المتاح: {profile?.balance_lyd} د.ل</span>
      </label>

      <div className="bg-accent-400/10 border border-accent-400/20 rounded-xl p-4 text-center">
        <p className="text-xs text-zinc-400">ستحصل على</p>
        <p className="font-heading font-bold text-2xl text-accent-400">{usdtReceived} USDT</p>
      </div>

      {!confirming ? (
        <button disabled={!amount || !rate} onClick={() => setConfirming(true)}
          className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
          تأكيد الشراء
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-surface-800 rounded-xl p-4 text-sm space-y-1">
            <p>المبلغ: <b>{amount} د.ل</b></p>
            <p>الكمية: <b>{usdtReceived} USDT</b></p>
            <p>السعر: <b>{rate.sell_rate}</b></p>
          </div>
          <button disabled={busy} onClick={confirmBuy} className="w-full bg-success text-white font-bold py-3.5 rounded-xl disabled:opacity-50">
            {busy ? 'جارِ التنفيذ...' : 'تأكيد نهائي'}
          </button>
          <button onClick={() => setConfirming(false)} className="w-full text-sm text-zinc-500 py-2">تعديل</button>
        </div>
      )}
    </div>
  );
}
