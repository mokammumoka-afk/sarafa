import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, cn } from '../../lib/utils';

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useNotifications(user?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl">الإشعارات</h1>
        {notifications.length > 0 && <button onClick={markAllAsRead} className="text-xs text-accent-400">تحديد الكل كمقروء</button>}
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && <EmptyState title="لا توجد إشعارات" />}
        {notifications.map((n) => (
          <button key={n.id} onClick={() => markAsRead(n.id)}
            className={cn('w-full text-right rounded-xl px-4 py-3 border', n.is_read ? 'bg-surface-800 border-white/5' : 'bg-accent-400/5 border-accent-400/20')}>
            <p className="text-sm font-medium">{n.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{formatDate(n.created_at)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
