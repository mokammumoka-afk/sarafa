import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useExchangeRate() {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('exchange_rates').select('*').order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { setRate(data); setLoading(false); });

    const channel = supabase
      .channel('exchange_rates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exchange_rates' }, (payload) => setRate(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { rate, loading };
}
