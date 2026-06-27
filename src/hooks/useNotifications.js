import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    supabase.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => !n.is_read).length);
      });

    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
          toast(payload.new.title, { description: payload.new.body });
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setUnreadCount((p) => Math.max(0, p - 1));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
