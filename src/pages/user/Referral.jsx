import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Referral() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ count: 0, bonusLyd: 0 });
  const code = user ? `SRF${user.id.slice(0, 8).toUpperCase()}` : '';
  const link = `${import.meta.env.VITE_APP_URL || ''}/register?ref=${code}`;

  useEffect(() => {
    if (!user) return;
    supabase.from('referrals').select('bonus_lyd').eq('referrer_id', user.id).eq('status', 'completed')
      .then(({ data }) => setStats({ count: data?.length || 0, bonusLyd: (data || []).reduce((s, r) => s + Number(r.bonus_lyd), 0) }));
  }, [user]);

  function copy() {
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط الإحالة');
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-xl">برنامج الإحالة</h1>
      <div className="bg-gradient-to-br from-accent-500/20 to-accent-600/5 border border-accent-400/20 rounded-2xl p-5 text-center">
        <p className="text-sm text-zinc-400 mb-1">كود الإحالة الخاص بك</p>
        <p className="font-heading font-bold text-2xl text-accent-400 ltr">{code}</p>
      </div>
      <button onClick={copy} className="w-full flex items-center justify-center gap-2 bg-surface-800 border border-white/10 rounded-xl py-3.5 text-sm">
        <Copy size={16} /> نسخ رابط الإحالة
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-800 rounded-xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold">{stats.count}</p>
          <p className="text-xs text-zinc-500 mt-1">مستخدمين محالين</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-4 text-center border border-white/5">
          <p className="text-2xl font-bold text-accent-400">{stats.bonusLyd} د.ل</p>
          <p className="text-xs text-zinc-500 mt-1">مكافآت مستلمة</p>
        </div>
      </div>
    </div>
  );
}
