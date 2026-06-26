import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatLYD, formatUSDT } from '../../lib/utils';

export default function Profile() {
  const { profile } = useAuth();
  if (!profile) return <div className="h-40 skeleton rounded-xl" />;

  const Stat = ({ label, value }) => (
    <div className="bg-surface-800 rounded-xl p-3 text-center border border-white/5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl">الملف الشخصي</h1>
        <Link to="/profile/edit" className="flex items-center gap-1.5 text-sm text-accent-400"><Pencil size={15} /> تعديل</Link>
      </div>

      <div className="flex items-center gap-4 bg-surface-800 rounded-xl p-4 border border-white/5">
        <img src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`}
          alt="" className="w-16 h-16 rounded-full object-cover" />
        <div>
          <p className="font-medium">{profile.full_name}</p>
          <p className="text-sm text-zinc-500 ltr text-right">{profile.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5 col-span-2">
          <p className="text-zinc-500">رقم GPAY</p>
          <p className="font-medium ltr text-left">{profile.gpay_number || '—'}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
          <p className="text-zinc-500">تاريخ التسجيل</p>
          <p className="font-medium">{formatDate(profile.created_at)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
          <p className="text-zinc-500">حالة الحساب</p>
          <p className={`font-medium ${profile.is_active ? 'text-success' : 'text-danger'}`}>{profile.is_active ? 'نشط' : 'معطل'}</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-zinc-400 mb-2">📊 الإحصائيات</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="إجمالي الإيداعات" value={formatLYD(profile.total_deposited_lyd)} />
          <Stat label="إجمالي السحوبات" value={formatLYD(profile.total_withdrawn_lyd)} />
          <Stat label="مشتريات USDT" value={formatUSDT(profile.total_bought_usdt)} />
          <Stat label="مبيعات USDT" value={formatUSDT(profile.total_sold_usdt)} />
        </div>
      </div>
    </div>
  );
}
