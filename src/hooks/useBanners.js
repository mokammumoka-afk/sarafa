import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      .then(({ data }) => { setBanners(data || []); setLoading(false); });
  }, []);

  return { banners, loading };
}
