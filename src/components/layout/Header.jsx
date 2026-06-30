import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import Avatar from '../shared/Avatar';

export default function Header() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-primary-900/95 backdrop-blur-md border-b border-white/5">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center font-heading font-bold text-primary-900 text-sm">
          SL
        </div>
        <span className="font-heading font-bold text-white text-base ltr">Sarafa <span className="text-accent-400">Libya</span></span>
      </Link>

      <div className="flex items-center gap-3">
        <Link to="/notifications" className="relative text-zinc-400 hover:text-accent-400 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/profile">
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size={32} className="border border-white/10" />
        </Link>
      </div>
    </header>
  );
}
