import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUp, ArrowDown, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminBanners() {
  const { user } = useAuth();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', link_url: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    setBanners(data || []);
    setLoading(false);
  }

  async function addBanner(e) {
    e.preventDefault();
    if (!file) return toast.error('يرجى اختيار صورة');
    setBusy(true);
    try {
      const path = `${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadErr } = await supabase.storage.from('banners').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(path);

      const maxOrder = banners.reduce((m, b) => Math.max(m, b.sort_order), 0);
      const { error } = await supabase.from('banners').insert({
        image_url: publicUrl, title: form.title || null, link_url: form.link_url || null,
        sort_order: maxOrder + 1, created_by: user.id
      });
      if (error) throw error;
      toast.success('تمت إضافة الصورة');
      setForm({ title: '', link_url: '' }); setFile(null); setPreview(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(b) {
    await supabase.from('banners').update({ is_active: !b.is_active, updated_at: new Date().toISOString() }).eq('id', b.id);
    load();
  }

  async function remove(b) {
    if (!confirm('حذف هذه الصورة؟')) return;
    await supabase.from('banners').delete().eq('id', b.id);
    load();
  }

  async function move(b, direction) {
    const idx = banners.findIndex((x) => x.id === b.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const other = banners[swapIdx];
    await Promise.all([
      supabase.from('banners').update({ sort_order: other.sort_order }).eq('id', b.id),
      supabase.from('banners').update({ sort_order: b.sort_order }).eq('id', other.id)
    ]);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">إعلانات الصفحة الرئيسية (Slider)</h1>

      <form onSubmit={addBanner} className="bg-surface-900 border border-white/5 rounded-2xl p-5 space-y-3">
        <p className="font-medium">إضافة صورة جديدة</p>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="عنوان (اختياري)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none" />
          <input placeholder="رابط عند الضغط (اختياري)" value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
            className="bg-surface-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none ltr text-left" />
        </div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-accent-400' : 'border-white/10'}`}>
          <input {...getInputProps()} />
          {preview ? <img src={preview} alt="" className="max-h-32 mx-auto rounded-lg" /> : (
            <div className="text-zinc-500 text-sm"><ImageIcon className="mx-auto mb-2" size={24} /> اسحب صورة هنا أو اضغط للاختيار (مقاس مستحسن 1200×500)</div>
          )}
        </div>
        <button disabled={busy} className="bg-accent-400 text-primary-900 font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
          {busy ? 'جارِ الرفع...' : 'إضافة الصورة'}
        </button>
      </form>

      <div className="space-y-3">
        {loading && <div className="h-20 skeleton rounded-xl" />}
        {!loading && banners.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">لا توجد صور</p>}
        {banners.map((b, i) => (
          <div key={b.id} className="flex items-center gap-4 bg-surface-900 border border-white/5 rounded-2xl p-4">
            <img src={b.image_url} alt="" className="w-28 h-16 object-cover rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{b.title || 'بدون عنوان'}</p>
              <p className="text-xs text-zinc-500 truncate ltr text-right">{b.link_url || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => move(b, 'up')} disabled={i === 0} className="p-2 rounded-lg bg-white/5 text-zinc-400 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => move(b, 'down')} disabled={i === banners.length - 1} className="p-2 rounded-lg bg-white/5 text-zinc-400 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => toggleActive(b)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${b.is_active ? 'bg-success/15 text-success' : 'bg-zinc-700/40 text-zinc-400'}`}>
                {b.is_active ? 'مفعّل' : 'معطّل'}
              </button>
              <button onClick={() => remove(b)} className="p-2 rounded-lg bg-danger/15 text-danger"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
