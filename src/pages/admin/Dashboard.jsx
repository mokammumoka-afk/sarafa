import { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Wallet, Gem, Clock, UserPlus, BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatLYD, formatUSDT, formatDate, TYPE_LABELS } from '../../lib/utils';

const PIE_COLORS = ['#D4AF37', '#10B981', '#EF4444', '#F59E0B', '#60A5FA'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: userCount }, { data: balances }, { count: pendingCount },
      { count: newUsersToday }, { data: recentTxns }, { data: rateRow }, { data: monthTxns }
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('balance_lyd, balance_usdt'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('transactions').select('id, type, status, amount_lyd, amount_usdt, created_at, user_id, profiles(full_name)')
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('exchange_rates').select('buy_rate').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('transactions').select('type, amount_lyd, amount_usdt, fee_lyd, fee_usdt, status, created_at').gte('created_at', since30)
    ]);

    const totalLyd = (balances || []).reduce((s, p) => s + Number(p.balance_lyd), 0);
    const totalUsdt = (balances || []).reduce((s, p) => s + Number(p.balance_usdt), 0);

    const today = new Date().toISOString().slice(0, 10);
    const completedToday = (monthTxns || []).filter((t) => t.status === 'completed' && t.created_at.startsWith(today));
    const dailyVolume = completedToday.reduce((s, t) => s + Number(t.amount_lyd || 0), 0);
    const buyRate = rateRow?.buy_rate || 0;
    const profitToday = completedToday.reduce((s, t) => s + Number(t.fee_lyd || 0) + Number(t.fee_usdt || 0) * buyRate, 0);

    setStats({
      userCount: userCount || 0, totalLyd, totalUsdt, pendingCount: pendingCount || 0,
      newUsersToday: newUsersToday || 0, dailyVolume, profitToday
    });
    setRecent(recentTxns || []);

    const byDay = {};
    (monthTxns || []).forEach((t) => {
      const day = t.created_at.slice(5, 10);
      byDay[day] = byDay[day] || { day, deposit: 0, buy_usdt: 0, sell_usdt: 0, withdraw: 0 };
      if (byDay[day][t.type] !== undefined) byDay[day][t.type] += Number(t.amount_lyd || 0);
    });
    setChartData(Object.values(byDay));

    const counts = {};
    completedToday.forEach((t) => { counts[t.type] = (counts[t.type] || 0) + 1; });
    setPieData(Object.entries(counts).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value })));

    // User growth: cumulative signups over the last 30 days
    const { data: newProfiles } = await supabase.from('profiles').select('created_at').gte('created_at', since30).order('created_at', { ascending: true });
    const { count: baseCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).lt('created_at', since30);
    let running = baseCount || 0;
    const growthByDay = {};
    (newProfiles || []).forEach((p) => {
      const day = p.created_at.slice(5, 10);
      running += 1;
      growthByDay[day] = running;
    });
    setGrowthData(Object.entries(growthByDay).map(([day, total]) => ({ day, total })));

    setLoading(false);
  }

  if (loading || !stats) return <div className="h-64 skeleton rounded-xl" />;

  const Card = ({ icon: Icon, label, value, accent }) => (
    <div className="bg-surface-900 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent || 'bg-accent-400/10 text-accent-400'}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="font-heading font-bold text-lg truncate">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl">لوحة التحكم الإدارية</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card icon={Users} label="إجمالي المستخدمين" value={stats.userCount} />
        <Card icon={UserPlus} label="مستخدمون جدد اليوم" value={stats.newUsersToday} accent="bg-success/10 text-success" />
        <Card icon={Clock} label="معاملات معلّقة" value={stats.pendingCount} accent="bg-warning/10 text-warning" />
        <Card icon={Wallet} label="إجمالي أرصدة الدينار" value={formatLYD(stats.totalLyd)} />
        <Card icon={Gem} label="إجمالي أرصدة USDT" value={formatUSDT(stats.totalUsdt)} />
        <Card icon={BarChart3} label="حجم التداول اليوم" value={formatLYD(stats.dailyVolume)} accent="bg-blue-400/10 text-blue-400" />
      </div>

      <div className="bg-surface-900 border border-accent-400/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-400/10 text-accent-400 flex items-center justify-center"><TrendingUp size={18} /></div>
        <div>
          <p className="font-heading font-bold text-lg">{formatLYD(stats.profitToday)}</p>
          <p className="text-xs text-zinc-500">الأرباح التقديرية اليوم (من الرسوم المسجّلة)</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-surface-900 border border-white/5 rounded-2xl p-4">
          <p className="text-sm text-zinc-400 mb-3">رسم بياني للمعاملات (آخر 30 يوم)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="day" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1A1F2E', border: 'none', borderRadius: 8 }} />
              <Area type="monotone" dataKey="deposit" stackId="1" stroke="#D4AF37" fill="#D4AF3733" name="شحن" />
              <Area type="monotone" dataKey="buy_usdt" stackId="1" stroke="#10B981" fill="#10B98133" name="شراء" />
              <Area type="monotone" dataKey="sell_usdt" stackId="1" stroke="#EF4444" fill="#EF444433" name="بيع" />
              <Area type="monotone" dataKey="withdraw" stackId="1" stroke="#F59E0B" fill="#F59E0B33" name="سحب" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-900 border border-white/5 rounded-2xl p-4">
          <p className="text-sm text-zinc-400 mb-3">توزيع المعاملات اليوم</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={75}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A1F2E', border: 'none', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl p-4">
        <p className="text-sm text-zinc-400 mb-3">نمو المستخدمين (آخر 30 يوم)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="day" stroke="#555" fontSize={11} />
            <YAxis stroke="#555" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1A1F2E', border: 'none', borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl p-4">
        <p className="text-sm text-zinc-400 mb-3">📋 آخر العمليات</p>
        <div className="space-y-2">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <span>{t.profiles?.full_name || 'مستخدم'} — {TYPE_LABELS[t.type]}</span>
              <span className="text-zinc-500 text-xs">{formatDate(t.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
