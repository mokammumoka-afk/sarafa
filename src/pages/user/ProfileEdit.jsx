import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';

export default function ProfileEdit() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '', phone: profile?.phone || '', gpay_number: profile?.gpay_number || ''
  });
  const [busy, setBusy] = useState(false);

  async function uploadAvatar(file) {
    const path = `avatars/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) return toast.error(error.message);
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    toast.success('تم تحديث الصورة');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('تم حفظ التغييرات');
    navigate('/profile');
  }

  return (
    <div>
      <PageHeader title="تعديل الملف الشخصي" to="/profile" />
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.full_name || 'S L')}&backgroundColor=1A1F2E&textColor=D4AF37`}
            alt="" className="w-16 h-16 rounded-full object-cover border-2 border-accent-400/30" />
          <label className="text-sm text-accent-400 cursor-pointer">
            تغيير الصورة
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])} className="hidden" />
          </label>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">الاسم الكامل</span>
            <input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">البريد الإلكتروني (من حساب Google)</span>
            <input type="email" value={profile?.email || ''} disabled
              className="w-full bg-surface-800/50 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left text-zinc-500 cursor-not-allowed" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">رقم الهاتف (اختياري)</span>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+218XXXXXXXXX"
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">رقم GPAY</span>
            <input required value={form.gpay_number} onChange={(e) => setForm((f) => ({ ...f, gpay_number: e.target.value }))}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none ltr text-left" />
          </label>
          <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
            {busy ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>
      </div>
    </div>
  );
}
