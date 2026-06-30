import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminAlerts() {
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  async function load() {
    const [{ count: txns }, { count: tickets }] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress'])
    ]);
    setPendingTransactions(txns || 0);
    setOpenTickets(tickets || 0);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  return { pendingTransactions, openTickets, total: pendingTransactions + openTickets };
}
