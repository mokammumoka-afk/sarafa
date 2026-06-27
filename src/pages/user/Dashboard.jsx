import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, ChevronLeft, Users2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useTransactions } from '../../hooks/useTransactions';
import { useBanners } from '../../hooks/useBanners';
import BannerSlider from '../../components/home/BannerSlider';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { rate } = useExchangeRate();
  const { transactions, loading } = useTransactions(user?.id, { limit: 5 });
  const { banners } = useBanners();

  const usdtInLyd = rate ? (profile?.balance_usdt || 0) * rate.buy_rate : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-xl">👋 أهلاً، {profile?.full_name?.split(' ')[0] || 'بك'}</h1>
        {profile?.last_login && <p className="text-xs text-zinc-500 mt-0.5">آخر دخول: {formatDate(profile.last_login)}</p>}
      </div>

      <BannerSlider banners={banners} />

      {/* Compact wallet preview -> full detail lives on the Wallet tab */}
      <Link to="/wallet" className="block rounded-2xl bg-gradient-to-br from-surface-800 to-accent-600/10 border border-accent-400/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-400">محفظتي</span>
          <ChevronLeft size={16} className="text-zinc-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-zinc-500 mb-0.5">💰 دينار</p>
            <p className="font-heading font-bold text-lg">{formatLYD(profile?.balance_lyd)}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 mb-0.5">💎 USDT</p>
            <p className="font-heading font-bold text-lg">{formatUSDT(profile?.balance_usdt)}</p>
            <p className="text-[10px] text-zinc-600">≈ {formatLYD(usdtInLyd)}</p>
          </div>
        </div>
      </Link>

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

      <Link to="/p2p" className="flex items-center gap-3 bg-surface-800 border border-dashed border-white/10 rounded-xl px-4 py-3.5">
        <span className="w-9 h-9 rounded-full bg-accent-400/10 text-accent-400 flex items-center justify-center"><Users2 size={17} /></span>
        <div className="flex-1">
          <p className="text-sm font-medium">سوق P2P</p>
          <p className="text-xs text-zinc-500">تداول مباشر بين المستخدمين — قريباً</p>
        </div>
        <ChevronLeft size={16} className="text-zinc-600" />
      </Link>

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
