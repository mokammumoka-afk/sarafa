import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const KEYS = ['deposit_limits', 'withdraw_limits', 'trade_limits', 'company_info', 'p2p_settings', 'referral_settings', 'splash_settings'];

// Centralizes all admin-configurable limits/info so every page reads the same
// source of truth instead of hardcoding numbers or relying only on build-time
// VITE_* env vars (which can't be changed without a redeploy).
export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('*').in('key', KEYS).then(({ data }) => {
      const map = {};
      (data || []).forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    });

    const channel = supabase
      .channel('settings-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        const row = payload.new || payload.old;
        if (row && KEYS.includes(row.key)) {
          setSettings((s) => ({ ...s, [row.key]: payload.new ? payload.new.value : s[row.key] }));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return {
    loading,
    depositLimits: settings.deposit_limits || { min: 50, max: 10000 },
    withdrawLimits: settings.withdraw_limits || { min: 100, max_daily: 5000 },
    tradeLimits: settings.trade_limits || { min_buy_usdt: 10, min_sell_usdt: 10 },
    companyInfo: settings.company_info || { name: 'Sarafa Libya', usdt_wallet: '', gpay_number: '' },
    p2pSettings: settings.p2p_settings || { enabled: false, commission_percent: 1 },
    referralSettings: settings.referral_settings || { enabled: true, reward_type: 'lyd', reward_amount: 5, trigger: 'first_deposit' },
    splashSettings: settings.splash_settings || { enabled: false, image_url: '', duration_seconds: 5 }
  };
}
