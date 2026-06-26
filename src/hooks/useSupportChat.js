import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useSupportChat(ticketId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!ticketId) return;
    supabase.from('support_messages').select('*').eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [ticketId]);

  const sendMessage = async (message, attachments = []) => {
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: ticketId, sender_id: user.id, sender_type: 'user', message, attachments
    });
    if (!error) {
      await supabase.from('support_tickets')
        .update({ last_reply_by: user.id, last_reply_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    }
    return { error };
  };

  return { messages, sendMessage };
}
