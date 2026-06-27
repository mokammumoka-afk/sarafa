import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import EmptyState from '../../../components/shared/EmptyState';
import StatusBadge from '../../../components/shared/StatusBadge';
import { formatDate } from '../../../lib/utils';

const STATUS_LABELS_TICKET = { open: 'مفتوحة', in_progress: 'قيد المعالجة', waiting_user: 'بانتظار ردك', resolved: 'محلولة', closed: 'مغلقة' };

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('support_tickets').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => { setTickets(data || []); setLoading(false); });
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl">مركز الدعم</h1>
        <Link to="/support/new" className="flex items-center gap-1.5 bg-accent-400 text-primary-900 text-sm font-bold px-3.5 py-2 rounded-xl">
          <Plus size={16} /> تذكرة جديدة
        </Link>
      </div>

      <div className="space-y-2">
        {loading && <div className="h-16 skeleton rounded-xl" />}
        {!loading && tickets.length === 0 && <EmptyState title="لا توجد تذاكر دعم" subtitle="أنشئ تذكرة جديدة إذا كنت تحتاج مساعدة" />}
        {tickets.map((t) => (
          <Link key={t.id} to={`/support/${t.id}`} className="block bg-surface-800 rounded-xl px-4 py-3 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{t.subject}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">{STATUS_LABELS_TICKET[t.status]}</span>
            </div>
            <p className="text-xs text-zinc-500">{formatDate(t.updated_at)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
