import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const KEYS = ['company_info', 'deposit_limits', 'withdraw_limits', 'trade_limits', 'p2p_settings', 'referral_settings', 'splash_settings'];

function Toggle({ checked, onChange }) {
  return (
    <button onClick={onChange} className={`w-11 h-6 rounded-full relative transition-colors ${checked ? 'bg-accent-400' : 'bg-zinc-700'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

const Field = ({ label, value, onChange, type }) => (
  <label className="block text-sm">
    <span className="text-zinc-500 block mb-1">{label}</span>
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none ltr text-left" />
  </label>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block text-sm">
    <span className="text-zinc-500 block mb-1">{label}</span>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </label>
);

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [busy, setBusy] = useState(null);
  const [splashFile, setSplashFile] = useState(null);
  const [splashPreview, setSplashPreview] = useState(null);
  const [broadcast, setBroadcast] = useState({ title: '', body: '' });
  const [broadcasting, setBroadcasting] = useState(false);

  const onDropSplash = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setSplashFile(f);
    setSplashPreview(URL.createObjectURL(f));
  }, []);
  const { getRootProps: getSplashRootProps, getInputProps: getSplashInputProps } = useDropzone({ onDrop: onDropSplash, accept: { 'image/*': [] }, maxFiles: 1 });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('settings').select('*').in('key', KEYS);
    const map = {};
    (data || []).forEach((s) => { map[s.key] = s.value; });
    setSettings(map);
  }

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

  async function saveSplash() {
    setBusy('splash_settings');
    try {
      let imageUrl = settings.splash_settings?.image_url;
      if (splashFile) {
        const path = `splash/${Date.now()}.${splashFile.name.split('.').pop()}`;
        const { error: uploadErr } = await supabase.storage.from('banners').upload(path, splashFile);
        if (uploadErr) throw uploadErr;
        imageUrl = supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
      }
      const value = { ...settings.splash_settings, image_url: imageUrl };
      const { error } = await supabase.from('settings').update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq('key', 'splash_settings');
      if (error) throw error;
      setSettings((s) => ({ ...s, splash_settings: value }));
      toast.success('تم حفظ شاشة البداية');
      setSplashFile(null); setSplashPreview(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function sendBroadcast(e) {
    e.preventDefault();
    if (!broadcast.title.trim() || !broadcast.body.trim()) return toast.error('أدخل العنوان والمحتوى');
    setBroadcasting(true);
    const { data, error } = await supabase.rpc('broadcast_notification', {
      p_admin_id: user.id, p_title: broadcast.title, p_body: broadcast.body
    });
    setBroadcasting(false);
    if (error) return toast.error(error.message);
    toast.success(`تم إرسال الإشعار إلى ${data} مستخدم`);
    setBroadcast({ title: '', body: '' });
  }

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

        {/* P2P */}
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3 col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">سوق P2P</p>
            <Toggle checked={settings.p2p_settings?.enabled} onChange={() => update('p2p_settings', 'enabled', !settings.p2p_settings?.enabled)} />
          </div>
          <Field label="نسبة العمولة (%)" value={settings.p2p_settings?.commission_percent} onChange={(v) => update('p2p_settings', 'commission_percent', Number(v))} />
          <button disabled={busy === 'p2p_settings'} onClick={() => save('p2p_settings')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>

        {/* Referral */}
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3 col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">نظام الإحالات</p>
            <Toggle checked={settings.referral_settings?.enabled} onChange={() => update('referral_settings', 'enabled', !settings.referral_settings?.enabled)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="نوع المكافأة" value={settings.referral_settings?.reward_type}
              onChange={(v) => update('referral_settings', 'reward_type', v)}
              options={[{ value: 'lyd', label: 'دينار ليبي' }, { value: 'usdt', label: 'USDT' }]} />
            <Field label="قيمة المكافأة" value={settings.referral_settings?.reward_amount} onChange={(v) => update('referral_settings', 'reward_amount', Number(v))} />
            <Select label="شرط الاستحقاق" value={settings.referral_settings?.trigger}
              onChange={(v) => update('referral_settings', 'trigger', v)}
              options={[{ value: 'first_deposit', label: 'أول شحن' }, { value: 'first_buy', label: 'أول شراء' }]} />
          </div>
          <button disabled={busy === 'referral_settings'} onClick={() => save('referral_settings')} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>

        {/* Splash screen */}
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3 col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">شاشة البداية (Splash Screen)</p>
            <Toggle checked={settings.splash_settings?.enabled} onChange={() => update('splash_settings', 'enabled', !settings.splash_settings?.enabled)} />
          </div>
          <Field label="مدة العرض (ثوانٍ)" type="number" value={settings.splash_settings?.duration_seconds} onChange={(v) => update('splash_settings', 'duration_seconds', Number(v))} />
          <div {...getSplashRootProps()} className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer">
            <input {...getSplashInputProps()} />
            {splashPreview || settings.splash_settings?.image_url ? (
              <img src={splashPreview || settings.splash_settings?.image_url} alt="" className="max-h-32 mx-auto rounded-lg" />
            ) : (
              <div className="text-zinc-500 text-sm"><ImageIcon className="mx-auto mb-1" size={20} /> اختر صورة شاشة البداية</div>
            )}
          </div>
          <button disabled={busy === 'splash_settings'} onClick={saveSplash} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">حفظ</button>
        </div>

        {/* Broadcast notification */}
        <form onSubmit={sendBroadcast} className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3 col-span-2">
          <p className="font-medium">إرسال إشعار لجميع المستخدمين</p>
          <Field label="العنوان" value={broadcast.title} onChange={(v) => setBroadcast((b) => ({ ...b, title: v }))} />
          <label className="block text-sm">
            <span className="text-zinc-500 block mb-1">المحتوى</span>
            <textarea rows={3} value={broadcast.body} onChange={(e) => setBroadcast((b) => ({ ...b, body: e.target.value }))}
              className="w-full bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 outline-none resize-none" />
          </label>
          <button disabled={broadcasting} className="bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
            {broadcasting ? 'جارِ الإرسال...' : 'إرسال للجميع'}
          </button>
        </form>
      </div>
    </div>
  );
}
