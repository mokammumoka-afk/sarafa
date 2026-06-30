import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const { user, profile, loading, patchProfileLocal } = useAuth();
  const navigate = useNavigate();
  // Prefill the name from the Google account if Supabase already captured it on signup.
  const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const [form, setForm] = useState({
    full_name: profile?.full_name || googleName,
    gpay_number: profile?.gpay_number || ''
  });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) return toast.error('يجب الموافقة على شروط الخدمة');
    setBusy(true);

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      gpay_number: form.gpay_number,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);

    if (error) { setBusy(false); return toast.error(error.message); }

    // Apply the change locally right away — needsOnboarding depends on
    // `profile`, and waiting for the realtime UPDATE event before navigating
    // is what used to make this screen feel stuck after pressing confirm.
    patchProfileLocal({ full_name: form.full_name, gpay_number: form.gpay_number });

    // If this user arrived through a referral link, Login.jsx stashed the
    // code in localStorage before the Google redirect. Register it now that
    // the profile (and referral_code) definitely exist. Best-effort: a
    // failure here should never block the user from reaching the app.
    const pendingRefCode = localStorage.getItem('sarafa_ref_code');
    if (pendingRefCode) {
      await supabase.rpc('register_referral', { p_referred_id: user.id, p_code: pendingRefCode }).catch(() => {});
      localStorage.removeItem('sarafa_ref_code');
    }

    setBusy(false);
    toast.success('تم إكمال التسجيل بنجاح');
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-primary-900" dir="rtl">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="font-heading font-bold text-2xl mb-1">إكمال البيانات</h1>
        <p className="text-zinc-400 mb-1 text-sm">خطوة أخيرة قبل البدء</p>
        {user?.email && <p className="text-xs text-zinc-500 mb-6 ltr text-left">{user.email}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">الاسم الكامل</span>
            <input required value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">رقم GPAY للسحب</span>
            <input required value={form.gpay_number}
              onChange={(e) => setForm((f) => ({ ...f, gpay_number: e.target.value }))}
              placeholder="091XXXXXXX"
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
          </label>
          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>أوافق على <a href="/terms" className="text-accent-400">شروط الخدمة</a> و<a href="/privacy" className="text-accent-400">سياسة الخصوصية</a></span>
          </label>
          <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl hover:bg-accent-500 disabled:opacity-50 transition-colors">
            {busy ? 'جارِ الحفظ...' : 'إنشاء الحساب'}
          </button>
        </form>
      </div>
    </div>
  );
}
