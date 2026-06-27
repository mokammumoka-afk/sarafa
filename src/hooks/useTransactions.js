import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useTransactions(userId, { type, status, limit = 20 } = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    let query = supabase.from('transactions').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(limit);
    if (type && type !== 'all') query = query.eq('type', type);
    if (status && status !== 'all') query = query.eq('status', status);

    query.then(({ data }) => { setTransactions(data || []); setLoading(false); });
  }, [userId, type, status, limit]);

  return { transactions, loading };
}
