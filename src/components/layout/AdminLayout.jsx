import { NavLink, Navigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Repeat, TrendingUp, LifeBuoy, ScrollText, Settings, LogOut, Image, Users2, Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminAlerts } from '../../hooks/useAdminAlerts';
import { cn } from '../../lib/utils';

function Badge({ count }) {
  if (!count) return null;
  return <span className="ms-auto bg-danger text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{count > 99 ? '99+' : count}</span>;
}

export default function AdminLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const { pendingTransactions, openTickets, total } = useAdminAlerts();

  const groups = [
    { label: null, items: [{ to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, end: true }] },
    {
      label: 'المالية',
      items: [
        { to: '/admin/users', label: 'المستخدمون', icon: Users },
        { to: '/admin/transactions', label: 'المعاملات', icon: Repeat, badge: pendingTransactions },
        { to: '/admin/rates', label: 'الأسعار', icon: TrendingUp },
        { to: '/admin/p2p', label: 'سوق P2P', icon: Users2 }
      ]
    },
    { label: 'المحتوى', items: [{ to: '/admin/banners', label: 'إعلانات الرئيسية', icon: Image }] },
    {
      label: 'الدعم والنظام',
      items: [
        { to: '/admin/support', label: 'الدعم الفني', icon: LifeBuoy, badge: openTickets },
        { to: '/admin/audit-log', label: 'سجل التدقيق', icon: ScrollText },
        { to: '/admin/settings', label: 'الإعدادات', icon: Settings }
      ]
    }
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">جارِ التحميل...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (profile && !profile.is_admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen flex bg-[#05070D] text-zinc-100 font-body" dir="rtl">
      <aside className="w-64 shrink-0 border-l border-white/5 bg-surface-900 flex flex-col">
        <div className="px-5 py-5 font-heading font-bold text-accent-400 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-primary-900 text-sm">SL</div>
          لوحة الإدارة
        </div>
        <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="px-3 mb-1 text-[11px] font-medium text-zinc-600 uppercase">{group.label}</p>}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive ? 'bg-accent-400/10 text-accent-400' : 'text-zinc-400 hover:bg-white/5')
                    }
                  >
                    <Icon size={18} /> {label} <Badge count={badge} />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-5 py-3 flex items-center gap-2 text-xs text-zinc-500 border-t border-white/5">
          <Bell size={14} className={total > 0 ? 'text-accent-400' : ''} />
          {total > 0 ? `${total} عنصر يحتاج مراجعة` : 'لا توجد طلبات معلّقة'}
        </div>
        <button onClick={signOut} className="flex items-center gap-3 px-5 py-4 text-sm text-zinc-500 hover:text-danger border-t border-white/5">
          <LogOut size={18} /> تسجيل الخروج
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
