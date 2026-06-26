import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const CATEGORIES = [
  { value: 'account', label: 'حساب' }, { value: 'deposit', label: 'شحن' },
  { value: 'withdrawal', label: 'سحب' }, { value: 'trade', label: 'تداول' },
  { value: 'technical', label: 'تقني' }, { value: 'other', label: 'أخرى' }
];
const PRIORITIES = [
  { value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' },
  { value: 'high', label: 'عالية' }, { value: 'urgent', label: 'عاجلة' }
];

export default function NewTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', category: 'account', priority: 'normal', message: '' });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { data: ticket, error } = await supabase.from('support_tickets').insert({
      user_id: user.id, subject: form.subject, category: form.category, priority: form.priority
    }).select().single();
    if (error) { setBusy(false); return toast.error(error.message); }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id, sender_id: user.id, sender_type: 'user', message: form.message
    });
    setBusy(false);
    toast.success('تم إنشاء التذكرة');
    navigate(`/support/${ticket.id}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-xl">تذكرة دعم جديدة</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">العنوان</span>
          <input required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">القسم</span>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-zinc-400 mb-1.5 block">الأولوية</span>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-zinc-400 mb-1.5 block">وصف المشكلة</span>
          <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none resize-none" />
        </label>
        <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl disabled:opacity-50">
          {busy ? 'جارِ الإرسال...' : 'إرسال'}
        </button>
      </form>
    </div>
  );
}
