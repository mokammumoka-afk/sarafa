import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Deposit() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { transaction, gpay }

  async function createRequest(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount_lyd: Number(amount) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPending(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Poll our own DB every 5s for the realtime confirmation (the cron edge function does the GPAY check)
  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('transactions').select('status').eq('id', pending.transaction.id).single();
      if (data?.status === 'completed') {
        toast.success('تم تأكيد الشحن بنجاح!');
        navigate(`/transaction/${pending.transaction.id}`);
      }
      if (data?.status === 'cancelled') {
        toast.error('انتهت صلاحية طلب الدفع');
        setPending(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pending]);

  if (pending) {
    return (
      <div className="space-y-5 text-center">
        <h1 className="font-heading font-bold text-xl">إتمام الدفع</h1>
        <div className="bg-white rounded-2xl p-6 inline-block">
          <QRCode value={pending.gpay.qr_code || pending.transaction.gpay_reference} size={180} />
        </div>
        <p className="text-zinc-400 text-sm">رقم الطلب المرجعي: <span className="ltr font-mono">{pending.transaction.gpay_reference}</span></p>
        <div className="bg-surface-800 rounded-xl p-4 text-sm text-zinc-300">
          افتح تطبيق GPAY وادفع <b className="text-accent-400">{amount} د.ل</b> لإكمال الشحن. سيتم تحديث رصيدك تلقائياً عند التأكيد.
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" /> جارِ فحص حالة الدفع كل 30 ثانية...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-xl">شحن المحفظة</h1>
      <form onSubmit={createRequest} className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">المبلغ (دينار ليبي)</span>
          <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-4 text-2xl font-heading outline-none ltr text-left" />
        </label>
        <button disabled={busy || !amount} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl hover:bg-accent-500 disabled:opacity-50 transition-colors">
          {busy ? 'جارِ إنشاء الطلب...' : 'إنشاء طلب دفع'}
        </button>
      </form>
    </div>
  );
}
