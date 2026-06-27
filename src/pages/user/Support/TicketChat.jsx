import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSupportChat } from '../../../hooks/useSupportChat';
import PageHeader from '../../../components/shared/PageHeader';
import { formatDate, cn } from '../../../lib/utils';

export default function TicketChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const { messages, sendMessage } = useSupportChat(id);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setText('');
    await sendMessage(text.trim());
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <PageHeader title="محادثة التذكرة" to="/support" />
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.map((m) => (
          <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
            m.sender_id === user.id ? 'bg-accent-400 text-primary-900 mr-auto' : 'bg-surface-800 ml-auto')}>
            <p>{m.message}</p>
            <p className="text-[10px] opacity-60 mt-1">{formatDate(m.created_at)}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-white/5">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك..."
          className="flex-1 bg-surface-800 rounded-xl border border-white/10 px-4 py-3 outline-none text-sm" />
        <button className="bg-accent-400 text-primary-900 rounded-xl p-3"><Send size={18} /></button>
      </form>
    </div>
  );
}
