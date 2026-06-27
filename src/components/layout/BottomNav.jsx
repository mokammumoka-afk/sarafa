import { NavLink } from 'react-router-dom';
import { Home, Wallet, Repeat, LifeBuoy, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const items = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/wallet', label: 'المحفظة', icon: Wallet },
  { to: '/transactions', label: 'المعاملات', icon: Repeat },
  { to: '/support', label: 'الدعم', icon: LifeBuoy },
  { to: '/profile', label: 'الحساب', icon: User }
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/5 bg-surface-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent-400' : 'text-zinc-500 hover:text-zinc-300')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-400" />}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
