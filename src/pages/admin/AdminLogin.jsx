import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return toast.error('بيانات الدخول غير صحيحة'); }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
    setBusy(false);
    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      return toast.error('هذا الحساب لا يملك صلاحيات إدارية');
    }
    navigate('/admin');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070D] px-6" dir="rtl">
      <form onSubmit={submit} className="max-w-sm w-full space-y-4">
        <h1 className="font-heading font-bold text-2xl text-accent-400 mb-1">لوحة الإدارة</h1>
        <p className="text-zinc-500 text-sm mb-6">الوصول مخصص للمسؤولين فقط</p>
        <input type="email" required placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
        <input type="password" required placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
        <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
          {busy ? 'جارِ الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
