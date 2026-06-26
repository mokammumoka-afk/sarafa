import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, cn } from '../../lib/utils';

const STATUSES = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
const STATUS_LABELS = { open: 'مفتوحة', in_progress: 'قيد المعالجة', waiting_user: 'بانتظار المستخدم', resolved: 'محلولة', closed: 'مغلقة' };

export default function AdminTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    load();
    const channel = supabase.channel(`admin-ticket-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function load() {
    const { data: t } = await supabase.from('support_tickets').select('*, profiles(full_name, phone)').eq('id', id).single();
    setTicket(t);
    const { data: m } = await supabase.from('support_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    setMessages(m || []);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setText('');
    await supabase.from('support_messages').insert({ ticket_id: id, sender_id: user.id, sender_type: 'admin', message: text.trim() });
    await supabase.from('support_tickets').update({ last_reply_by: user.id, last_reply_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
  }

  async function changeStatus(newStatus) {
    await supabase.from('support_tickets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    toast.success('تم تحديث الحالة');
    load();
  }

  if (!ticket) return <div className="h-64 skeleton rounded-xl" />;

  return (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      <div className="col-span-2 flex flex-col bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <p className="font-medium">{ticket.subject}</p>
          <p className="text-xs text-zinc-500">{ticket.profiles?.full_name} · {ticket.profiles?.phone}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
              m.sender_type === 'admin' ? 'bg-accent-400 text-primary-900 mr-auto' : 'bg-surface-800 ml-auto')}>
              <p>{m.message}</p>
              <p className="text-[10px] opacity-60 mt-1">{formatDate(m.created_at)}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-white/5">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رداً..."
            className="flex-1 bg-surface-800 rounded-xl border border-white/10 px-4 py-2.5 outline-none text-sm" />
          <button className="bg-accent-400 text-primary-900 rounded-xl p-2.5"><Send size={16} /></button>
        </form>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl p-4 h-fit space-y-3">
        <p className="font-medium text-sm mb-2">تغيير الحالة</p>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => changeStatus(s)}
            className={cn('w-full text-right text-sm px-3 py-2 rounded-lg mb-1', ticket.status === s ? 'bg-accent-400/20 text-accent-400' : 'bg-white/5 text-zinc-400')}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
