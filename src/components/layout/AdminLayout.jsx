import { NavLink, Navigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Repeat, TrendingUp, LifeBuoy, ScrollText, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const items = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'المستخدمون', icon: Users },
  { to: '/admin/transactions', label: 'المعاملات', icon: Repeat },
  { to: '/admin/rates', label: 'الأسعار', icon: TrendingUp },
  { to: '/admin/support', label: 'الدعم الفني', icon: LifeBuoy },
  { to: '/admin/audit-log', label: 'سجل التدقيق', icon: ScrollText },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings }
];

export default function AdminLayout() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">جارِ التحميل...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (profile && !profile.is_admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen flex bg-[#05070D] text-zinc-100 font-body" dir="rtl">
      <aside className="w-60 shrink-0 border-l border-white/5 bg-surface-900 flex flex-col">
        <div className="px-5 py-5 font-heading font-bold text-accent-400">لوحة الإدارة</div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive ? 'bg-accent-400/10 text-accent-400' : 'text-zinc-400 hover:bg-white/5')
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
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
