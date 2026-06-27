import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions } from '../../hooks/useTransactions';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatLYD, formatUSDT, TYPE_LABELS } from '../../lib/utils';

const TYPE_TABS = [
  { value: 'all', label: 'الكل' }, { value: 'deposit', label: 'شحن' },
  { value: 'buy_usdt', label: 'شراء' }, { value: 'sell_usdt', label: 'بيع' },
  { value: 'withdraw', label: 'سحب' }
];

export default function Transactions() {
  const { user } = useAuth();
  const [type, setType] = useState('all');
  const { transactions, loading } = useTransactions(user?.id, { type, limit: 100 });

  return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-xl">سجل المعاملات</h1>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TYPE_TABS.map((t) => (
          <button key={t.value} onClick={() => setType(t.value)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border ${type === t.value ? 'bg-accent-400 text-primary-900 border-accent-400' : 'border-white/10 text-zinc-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        {!loading && transactions.length === 0 && <EmptyState title="لا توجد معاملات" />}
        {transactions.map((t) => (
          <Link key={t.id} to={`/transaction/${t.id}`} className="flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3 border border-white/5">
            <div>
              <p className="text-sm font-medium">{TYPE_LABELS[t.type]}</p>
              <p className="text-xs text-zinc-500">{formatDate(t.created_at)}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-mono">{t.amount_lyd ? formatLYD(t.amount_lyd) : formatUSDT(t.amount_usdt)}</p>
              <StatusBadge status={t.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
