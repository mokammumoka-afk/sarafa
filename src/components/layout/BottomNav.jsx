import { NavLink } from 'react-router-dom';
import { Home, ArrowDownToLine, ArrowUpFromLine, History, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const items = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/deposit', label: 'شحن', icon: ArrowDownToLine },
  { to: '/withdraw', label: 'سحب', icon: ArrowUpFromLine },
  { to: '/transactions', label: 'السجل', icon: History },
  { to: '/profile', label: 'حسابي', icon: User }
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-surface-900/95 backdrop-blur-md">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent-400' : 'text-zinc-500')
            }
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
