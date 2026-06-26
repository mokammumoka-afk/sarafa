import { Link } from 'react-router-dom';
import { Bell, LifeBuoy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

export default function Header() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-primary-900/95 backdrop-blur-md border-b border-white/5">
      <Link to="/dashboard" className="font-heading font-bold text-accent-400 text-lg">
        صرافة <span className="text-white">ليبيا</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/support" className="text-zinc-400 hover:text-accent-400 transition-colors">
          <LifeBuoy size={20} />
        </Link>
        <Link to="/notifications" className="relative text-zinc-400 hover:text-accent-400 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
