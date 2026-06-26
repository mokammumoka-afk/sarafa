import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useTransactions } from '../../hooks/useTransactions';
import BalanceCard from '../../components/wallet/BalanceCard';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { rate } = useExchangeRate();
  const { transactions, loading } = useTransactions(user?.id, { limit: 5 });

  const usdtInLyd = rate ? (profile?.balance_usdt || 0) * rate.buy_rate : 0;
  const lydInUsd = rate ? (profile?.balance_lyd || 0) / rate.sell_rate : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl">👋 أهلاً، {profile?.full_name?.split(' ')[0] || 'بك'}</h1>
        {profile?.last_login && <p className="text-xs text-zinc-500 mt-0.5">آخر دخول: {formatDate(profile.last_login)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BalanceCard icon="💰" label="رصيد الدينار" value={formatLYD(profile?.balance_lyd)} sub={`≈ ${lydInUsd.toFixed(2)} USDT`} accent />
        <BalanceCard icon="💎" label="رصيد USDT" value={formatUSDT(profile?.balance_usdt)} sub={`≈ ${formatLYD(usdtInLyd)}`} />
      </div>

      {rate && (
        <div className="flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3 text-sm border border-white/5">
          <span className="text-zinc-400">📊 السوق اليوم</span>
          <span>شراء: <b className="text-success">{rate.sell_rate}</b> · بيع: <b className="text-danger">{rate.buy_rate}</b> د.ل</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/deposit" className="flex items-center justify-center gap-2 bg-surface-800 border border-white/5 rounded-xl py-4 font-medium hover:border-accent-400/30 transition-colors">
          <ArrowDownToLine size={18} className="text-accent-400" /> شحن
        </Link>
        <Link to="/buy-usdt" className="flex items-center justify-center gap-2 bg-surface-800 border border-white/5 rounded-xl py-4 font-medium hover:border-accent-400/30 transition-colors">
          <TrendingUp size={18} className="text-success" /> شراء USDT
        </Link>
        <Link to="/sell-usdt" className="flex items-center justify-center gap-2 bg-surface-800 border border-white/5 rounded-xl py-4 font-medium hover:border-accent-400/30 transition-colors">
          <TrendingDown size={18} className="text-danger" /> بيع USDT
        </Link>
        <Link to="/withdraw" className="flex items-center justify-center gap-2 bg-surface-800 border border-white/5 rounded-xl py-4 font-medium hover:border-accent-400/30 transition-colors">
          <ArrowUpFromLine size={18} className="text-warning" /> سحب
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-zinc-300">📋 آخر المعاملات</h2>
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
