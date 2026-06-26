import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const KEYS = ['company_info', 'deposit_limits', 'withdraw_limits', 'trade_limits'];

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    supabase.from('settings').select('*').in('key', KEYS).then(({ data }) => {
      const map = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    });
  }, []);

  function update(key, field, value) {
    setSettings((s) => ({ ...s, [key]: { ...s[key], [field]: value } }));
  }

  async function save(key) {
    setBusy(key);
    const { error } = await supabase.from('settings').update({ value: settings[key], updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', key);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success('تم الحفظ');
  }

  const Field = ({ label, value, onChange }) => (
    <label className="block text-sm">
      <span className="text-zinc-500 block mb-1">{label}</span>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none ltr text-left" />
    </label>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">الإعدادات العامة</h1>

      <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3">
        <p className="font-medium">معلومات الشركة</p>
        <Field label="اسم التطبيق" value={settings.company_info?.name} onChange={(v) => update('company_info', 'name', v)} />
        <Field label="عنوان USDT (يظهر للمستخدمين عند البيع)" value={settings.company_info?.usdt_wallet} onChange={(v) => update('company_info', 'usdt_wallet', v)} />
        <Field label="رقم GPAY (للإيداعات)" value={settings.company_info?.gpay_number} onChange={(v) => update('company_info', 'gpay_number', v)} />
        <button disabled={busy === 'company_info'} onClick={() => save('company_info')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3">
          <p className="font-medium">حدود الشحن</p>
          <Field label="الحد الأدنى" value={settings.deposit_limits?.min} onChange={(v) => update('deposit_limits', 'min', Number(v))} />
          <Field label="الحد الأقصى" value={settings.deposit_limits?.max} onChange={(v) => update('deposit_limits', 'max', Number(v))} />
          <button disabled={busy === 'deposit_limits'} onClick={() => save('deposit_limits')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>

        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3">
          <p className="font-medium">حدود السحب</p>
          <Field label="الحد الأدنى" value={settings.withdraw_limits?.min} onChange={(v) => update('withdraw_limits', 'min', Number(v))} />
          <Field label="الحد الأقصى اليومي" value={settings.withdraw_limits?.max_daily} onChange={(v) => update('withdraw_limits', 'max_daily', Number(v))} />
          <button disabled={busy === 'withdraw_limits'} onClick={() => save('withdraw_limits')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>

        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3 col-span-2">
          <p className="font-medium">حدود التداول</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحد الأدنى لشراء USDT" value={settings.trade_limits?.min_buy_usdt} onChange={(v) => update('trade_limits', 'min_buy_usdt', Number(v))} />
            <Field label="الحد الأدنى لبيع USDT" value={settings.trade_limits?.min_sell_usdt} onChange={(v) => update('trade_limits', 'min_sell_usdt', Number(v))} />
          </div>
          <button disabled={busy === 'trade_limits'} onClick={() => save('trade_limits')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}
