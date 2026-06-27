import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import PageHeader from '../../components/shared/PageHeader';

export default function Withdraw() {
  const { user, profile } = useAuth();
  const { withdrawLimits } = useSettings();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [gpayNumber, setGpayNumber] = useState(profile?.gpay_number || '');
  const [busy, setBusy] = useState(false);

  function validate() {
    const n = Number(amount);
    if (!n || n <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return false; }
    if (n > Number(profile?.balance_lyd || 0)) { toast.error('رصيد غير كافٍ'); return false; }
    if (n < withdrawLimits.min) { toast.error(`الحد الأدنى للسحب هو ${withdrawLimits.min} د.ل`); return false; }
    if (!gpayNumber.trim()) { toast.error('يرجى إدخال رقم GPAY'); return false; }
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('request_withdraw', {
      p_user_id: user.id, p_amount_lyd: Number(amount), p_gpay_number: gpayNumber
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes('BAL01') ? 'رصيد غير كافٍ' : error.message);
    toast.success('تم تقديم طلب السحب');
    navigate(`/transaction/${data}`);
  }

  return (
    <div>
      <PageHeader title="سحب الرصيد" to="/wallet" />
      <div className="space-y-5">
        <div className="bg-surface-800 rounded-xl px-4 py-3 text-sm text-zinc-400 border border-white/5">
          الرصيد المتاح: <b className="text-white">{profile?.balance_lyd} د.ل</b>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">رقم GPAY المسجل</span>
            <input required value={gpayNumber} onChange={(e) => setGpayNumber(e.target.value)}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">المبلغ المراد سحبه</span>
            <input type="number" min={withdrawLimits.min} max={profile?.balance_lyd} required value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
            <span className="text-xs text-zinc-500 mt-1 block">
              الحد الأدنى للسحب: {withdrawLimits.min} د.ل — الحد الأقصى اليومي: {withdrawLimits.max_daily} د.ل
            </span>
          </label>
          <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
            {busy ? 'جارِ الإرسال...' : 'تقديم طلب السحب'}
          </button>
          <p className="text-xs text-zinc-500 text-center">سيتم تحويل المبلغ خلال 24 ساعة</p>
        </form>
      </div>
    </div>
  );
}
