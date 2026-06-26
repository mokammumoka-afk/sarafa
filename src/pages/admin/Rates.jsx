import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';

export default function AdminRates() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ buy_rate: '', sell_rate: '', market_rate: '', notes: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('exchange_rates').select('*').order('created_at', { ascending: false }).limit(20);
    setCurrent(data?.[0] || null);
    setHistory(data || []);
    if (data?.[0]) setForm({ buy_rate: data[0].buy_rate, sell_rate: data[0].sell_rate, market_rate: data[0].market_rate || '', notes: '' });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('exchange_rates').insert({
      buy_rate: Number(form.buy_rate), sell_rate: Number(form.sell_rate),
      market_rate: form.market_rate ? Number(form.market_rate) : null,
      notes: form.notes, updated_by: user.id
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('تم تحديث الأسعار');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">إدارة الأسعار</h1>

      <div className="grid grid-cols-2 gap-6">
        <form onSubmit={submit} className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3">
          <p className="font-medium mb-1">تحديث الأسعار</p>
          <label className="block text-sm">
            <span className="text-zinc-500 block mb-1">سعر الشراء (التطبيق يشتري USDT من المستخدم)</span>
            <input type="number" step="0.0001" required value={form.buy_rate} onChange={(e) => setForm((f) => ({ ...f, buy_rate: e.target.value }))}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none ltr text-left" />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500 block mb-1">سعر البيع (التطبيق يبيع USDT للمستخدم)</span>
            <input type="number" step="0.0001" required value={form.sell_rate} onChange={(e) => setForm((f) => ({ ...f, sell_rate: e.target.value }))}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none ltr text-left" />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500 block mb-1">سعر السوق (مرجعي)</span>
            <input type="number" step="0.0001" value={form.market_rate} onChange={(e) => setForm((f) => ({ ...f, market_rate: e.target.value }))}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none ltr text-left" />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500 block mb-1">ملاحظات</span>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none" />
          </label>
          <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-2.5 rounded-xl disabled:opacity-50">
            {busy ? 'جارِ التحديث...' : 'تحديث'}
          </button>
        </form>

        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5">
          <p className="font-medium mb-3">السعر الحالي</p>
          {current ? (
            <div className="text-sm space-y-2 text-zinc-300">
              <p>شراء: <b className="text-success">{current.buy_rate}</b> د.ل</p>
              <p>بيع: <b className="text-danger">{current.sell_rate}</b> د.ل</p>
              <p className="text-zinc-500 text-xs">آخر تحديث: {formatDate(current.created_at)}</p>
            </div>
          ) : <p className="text-zinc-500 text-sm">لا توجد بيانات</p>}
        </div>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <p className="font-medium p-4 border-b border-white/5">سجل تغييرات الأسعار</p>
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-400 text-xs">
            <tr><th className="px-4 py-2 text-right">التاريخ</th><th className="px-4 py-2 text-right">شراء</th><th className="px-4 py-2 text-right">بيع</th><th className="px-4 py-2 text-right">ملاحظات</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t border-white/5">
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{formatDate(h.created_at)}</td>
                <td className="px-4 py-2.5">{h.buy_rate}</td>
                <td className="px-4 py-2.5">{h.sell_rate}</td>
                <td className="px-4 py-2.5 text-zinc-400">{h.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
