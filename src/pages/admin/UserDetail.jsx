import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';
import StatusBadge from '../../components/shared/StatusBadge';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { user: adminUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [adjustLyd, setAdjustLyd] = useState('');
  const [adjustUsdt, setAdjustUsdt] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(p);
    const { data: t } = await supabase.from('transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(30);
    setTransactions(t || []);
  }

  async function submitAdjustment(e) {
    e.preventDefault();
    if (!reason.trim()) return toast.error('السبب إجباري');
    setBusy(true);
    const { error } = await supabase.rpc('adjust_balance', {
      p_admin_id: adminUser.id, p_user_id: id,
      p_amount_lyd: Number(adjustLyd) || 0, p_amount_usdt: Number(adjustUsdt) || 0, p_reason: reason
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('تم تعديل الرصيد');
    setAdjustLyd(''); setAdjustUsdt(''); setReason('');
    load();
  }

  async function toggleAdmin() {
    await supabase.from('profiles').update({ is_admin: !profile.is_admin }).eq('id', id);
    toast.success('تم تحديث الصلاحيات');
    load();
  }

  if (!profile) return <div className="h-64 skeleton rounded-xl" />;

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">{profile.full_name || 'مستخدم'}</h1>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="bg-surface-900 border border-white/5 rounded-xl p-4"><p className="text-zinc-500 mb-1">الهاتف</p><p className="ltr text-right">{profile.phone}</p></div>
        <div className="bg-surface-900 border border-white/5 rounded-xl p-4"><p className="text-zinc-500 mb-1">رصيد LYD</p><p>{formatLYD(profile.balance_lyd)}</p></div>
        <div className="bg-surface-900 border border-white/5 rounded-xl p-4"><p className="text-zinc-500 mb-1">رصيد USDT</p><p>{formatUSDT(profile.balance_usdt)}</p></div>
        <div className="bg-surface-900 border border-white/5 rounded-xl p-4"><p className="text-zinc-500 mb-1">رقم GPAY</p><p className="ltr text-right">{profile.gpay_number || '—'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5">
          <p className="font-medium mb-3">تعديل الرصيد يدوياً</p>
          <form onSubmit={submitAdjustment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="تغيير LYD (+/-)" value={adjustLyd} onChange={(e) => setAdjustLyd(e.target.value)}
                className="bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none ltr text-left" />
              <input type="number" step="0.000001" placeholder="تغيير USDT (+/-)" value={adjustUsdt} onChange={(e) => setAdjustUsdt(e.target.value)}
                className="bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none ltr text-left" />
            </div>
            <input required placeholder="السبب (إجباري)" value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none" />
            <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {busy ? 'جارِ التنفيذ...' : 'تنفيذ التعديل'}
            </button>
          </form>
        </div>

        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5">
          <p className="font-medium mb-3">إجراءات الحساب</p>
          <div className="flex flex-col gap-2 text-sm">
            <button onClick={() => supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', id).then(load)}
              className="text-right bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5">
              {profile.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
            </button>
            <button onClick={toggleAdmin} className="text-right bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5">
              {profile.is_admin ? 'إزالة صلاحيات المسؤول' : 'تعيين كمسؤول'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <p className="font-medium p-4 border-b border-white/5">سجل المعاملات</p>
        <table className="w-full text-sm">
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="px-4 py-2.5">{TYPE_LABELS[t.type]}</td>
                <td className="px-4 py-2.5">{t.amount_lyd ? formatLYD(t.amount_lyd) : formatUSDT(t.amount_usdt)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{formatDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
