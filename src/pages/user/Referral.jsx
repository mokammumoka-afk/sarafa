import { useEffect, useState } from 'react';
import { Copy, Gift, Clock, Wallet as WalletIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../hooks/useSettings';
import PageHeader from '../../components/shared/PageHeader';

const TRIGGER_LABELS = {
  first_deposit: 'إكمال أول عملية شحن',
  first_buy: 'إكمال أول عملية شراء USDT'
};

export default function Referral() {
  const { user, profile } = useAuth();
  const { referralSettings } = useSettings();
  const [stats, setStats] = useState({ count: 0, pending: 0, bonusLyd: 0, bonusUsdt: 0 });

  const code = profile?.referral_code || '';
  const link = `${import.meta.env.VITE_APP_URL || window.location.origin}/login?ref=${code}`;

  useEffect(() => {
    if (!user) return;
    supabase.from('referrals').select('status, bonus_lyd, bonus_usdt').eq('referrer_id', user.id)
      .then(({ data }) => {
        const rows = data || [];
        setStats({
          count: rows.filter((r) => r.status === 'completed').length,
          pending: rows.filter((r) => r.status === 'pending').length,
          bonusLyd: rows.reduce((s, r) => s + Number(r.bonus_lyd || 0), 0),
          bonusUsdt: rows.reduce((s, r) => s + Number(r.bonus_usdt || 0), 0)
        });
      });
  }, [user]);

  function copy() {
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط الإحالة');
  }

  const rewardText = referralSettings.reward_type === 'usdt'
    ? `${referralSettings.reward_amount} USDT`
    : `${referralSettings.reward_amount} د.ل`;

  return (
    <div>
      <PageHeader title="برنامج الإحالة" to="/profile" />

      {!referralSettings.enabled ? (
        <div className="text-center py-16 text-zinc-500">
          <Gift size={32} className="mx-auto mb-3 opacity-50" />
          برنامج الإحالة غير مفعّل حالياً
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-accent-500/20 to-accent-600/5 border border-accent-400/20 rounded-2xl p-5 text-center">
            <p className="text-sm text-zinc-400 mb-1">كود الإحالة الخاص بك</p>
            <p className="font-heading font-bold text-2xl text-accent-400 ltr">{code || '—'}</p>
          </div>

          <button onClick={copy} disabled={!code} className="w-full flex items-center justify-center gap-2 bg-surface-800 border border-white/10 rounded-xl py-3.5 text-sm disabled:opacity-50">
            <Copy size={16} /> نسخ رابط الإحالة
          </button>

          {/* How it works */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 bg-surface-800 rounded-xl p-4 border border-white/5">
              <span className="w-8 h-8 rounded-lg bg-accent-400/10 text-accent-400 flex items-center justify-center shrink-0"><Gift size={16} /></span>
              <div>
                <p className="text-sm font-medium">كم تربح؟</p>
                <p className="text-xs text-zinc-500 mt-0.5">تحصل على {rewardText} عن كل صديق يسجّل برابطك</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-surface-800 rounded-xl p-4 border border-white/5">
              <span className="w-8 h-8 rounded-lg bg-accent-400/10 text-accent-400 flex items-center justify-center shrink-0"><Clock size={16} /></span>
              <div>
                <p className="text-sm font-medium">متى تربح؟</p>
                <p className="text-xs text-zinc-500 mt-0.5">بعد أن يقوم صديقك بـ {TRIGGER_LABELS[referralSettings.trigger] || TRIGGER_LABELS.first_deposit}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-surface-800 rounded-xl p-4 border border-white/5">
              <span className="w-8 h-8 rounded-lg bg-accent-400/10 text-accent-400 flex items-center justify-center shrink-0"><WalletIcon size={16} /></span>
              <div>
                <p className="text-sm font-medium">كيف تستلم المكافأة؟</p>
                <p className="text-xs text-zinc-500 mt-0.5">تُضاف تلقائياً إلى محفظتك فور استحقاقها — بدون أي إجراء إضافي</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-800 rounded-xl p-4 text-center border border-white/5">
              <p className="text-2xl font-bold text-success">{stats.count}</p>
              <p className="text-xs text-zinc-500 mt-1">إحالات ناجحة</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-4 text-center border border-white/5">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs text-zinc-500 mt-1">قيد الانتظار</p>
            </div>
          </div>

          <div className="bg-accent-400/10 border border-accent-400/20 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">إجمالي ما ربحته حتى الآن</p>
            <p className="font-heading font-bold text-xl text-accent-400">
              {stats.bonusLyd > 0 && `${stats.bonusLyd} د.ل`}
              {stats.bonusLyd > 0 && stats.bonusUsdt > 0 && ' + '}
              {stats.bonusUsdt > 0 && `${stats.bonusUsdt} USDT`}
              {stats.bonusLyd === 0 && stats.bonusUsdt === 0 && '0'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
