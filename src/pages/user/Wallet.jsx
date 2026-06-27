import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useTransactions } from '../../hooks/useTransactions';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';

export default function Wallet() {
  const { user, profile, refreshProfile } = useAuth();
  const { rate } = useExchangeRate();
  const { transactions, loading } = useTransactions(user?.id, { limit: 5 });

  const usdtInLyd = rate ? (profile?.balance_usdt || 0) * rate.buy_rate : 0;
  const totalLyd = (profile?.balance_lyd || 0) + usdtInLyd;
  const totalUsd = rate ? totalLyd / rate.sell_rate : 0;

  const Action = ({ to, icon: Icon, label, color }) => (
    <Link to={to} className="flex flex-col items-center gap-1.5 flex-1">
      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </span>
      <span className="text-xs font-medium text-zinc-300">{label}</span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl">محفظتي</h1>
        <button onClick={refreshProfile} className="text-zinc-500 hover:text-accent-400 transition-colors">
          <RefreshCcw size={16} />
        </button>
      </div>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-accent-600/10 border border-accent-400/20 p-5">
        <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-accent-400/10 blur-2xl" />
        <p className="text-xs text-zinc-400 mb-1">إجمالي قيمة المحفظة</p>
        <p className="font-heading font-bold text-3xl text-white mb-1">{formatLYD(totalLyd)}</p>
        <p className="text-xs text-zinc-500 mb-4">≈ {totalUsd.toFixed(2)} USD</p>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
          <div>
            <p className="text-[11px] text-zinc-500 mb-0.5">💰 رصيد الدينار</p>
            <p className="font-bold text-sm">{formatLYD(profile?.balance_lyd)}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 mb-0.5">💎 رصيد USDT</p>
            <p className="font-bold text-sm">{formatUSDT(profile?.balance_usdt)}</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-3">
          آخر تحديث: {profile?.updated_at ? formatDate(profile.updated_at) : '—'}
        </p>
      </div>

      {rate && (
        <div className="flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3 text-sm border border-white/5">
          <span className="text-zinc-400">📊 سعر السوق</span>
          <span>شراء: <b className="text-success">{rate.sell_rate}</b> · بيع: <b className="text-danger">{rate.buy_rate}</b> د.ل</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-stretch justify-between bg-surface-800 rounded-2xl border border-white/5 p-4">
        <Action to="/deposit" icon={ArrowDownToLine} label="شحن" color="bg-accent-400/15 text-accent-400" />
        <Action to="/buy-usdt" icon={TrendingUp} label="شراء" color="bg-success/15 text-success" />
        <Action to="/sell-usdt" icon={TrendingDown} label="بيع" color="bg-danger/15 text-danger" />
        <Action to="/withdraw" icon={ArrowUpFromLine} label="سحب" color="bg-warning/15 text-warning" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-zinc-300">آخر النشاط</h2>
          <Link to="/transactions" className="text-xs text-accent-400">عرض الكل ←</Link>
        </div>
        <div className="space-y-2">
          {loading && <div className="h-14 skeleton rounded-xl" />}
          {!loading && transactions.length === 0 && <EmptyState title="لا توجد معاملات بعد" />}
          {transactions.map((t) => (
            <Link key={t.id} to={`/transaction/${t.id}`} className="flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3 border border-white/5">
              <div>
                <p className="text-sm font-medium">{TYPE_LABELS[t.type]}</p>
                <p className="text-xs text-zinc-500">{formatDate(t.created_at)}</p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
