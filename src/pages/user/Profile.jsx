import { Link } from 'react-router-dom';
import {
  Pencil, ChevronLeft, Settings as SettingsIcon, Gift, LifeBuoy, FileText, LogOut, RefreshCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatLYD, formatUSDT } from '../../lib/utils';

export default function Profile() {
  const { profile, loading, profileError, refreshProfile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 skeleton rounded-2xl" />
        <div className="h-32 skeleton rounded-2xl" />
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
        <p className="text-zinc-400">{profileError || 'تعذّر تحميل بيانات الحساب'}</p>
        <button onClick={refreshProfile} className="flex items-center gap-2 bg-accent-400 text-primary-900 font-bold px-4 py-2 rounded-xl text-sm">
          <RefreshCcw size={15} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const Stat = ({ label, value }) => (
    <div className="bg-surface-800 rounded-xl p-3 text-center border border-white/5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );

  const MenuItem = ({ to, icon: Icon, label, danger, onClick }) => {
    const content = (
      <div className={`flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3.5 border border-white/5 ${danger ? 'text-danger' : ''}`}>
        <div className="flex items-center gap-3">
          <Icon size={18} className={danger ? 'text-danger' : 'text-zinc-400'} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {!danger && <ChevronLeft size={16} className="text-zinc-600" />}
      </div>
    );
    return to ? <Link to={to}>{content}</Link> : <button onClick={onClick} className="w-full text-right">{content}</button>;
  };

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-xl">الحساب</h1>

      <div className="flex items-center gap-4 bg-gradient-to-br from-surface-800 to-surface-900 rounded-2xl p-4 border border-white/5">
        <img src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.full_name || 'S L')}&backgroundColor=1A1F2E&textColor=D4AF37`}
          alt="" className="w-16 h-16 rounded-full object-cover border-2 border-accent-400/30" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate">{profile.full_name || 'مستخدم'}</p>
          <p className="text-sm text-zinc-500 ltr text-right truncate">{profile.email || '—'}</p>
        </div>
        <Link to="/profile/edit" className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-accent-400">
          <Pencil size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5 col-span-2">
          <p className="text-zinc-500 text-xs mb-1">رقم GPAY المسجل للسحب</p>
          <p className="font-medium ltr text-left">{profile.gpay_number || 'لم يُسجَّل بعد'}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
          <p className="text-zinc-500 text-xs mb-1">تاريخ التسجيل</p>
          <p className="font-medium text-xs">{formatDate(profile.created_at)}</p>
        </div>
        <div className="bg-surface-800 rounded-xl p-4 border border-white/5">
          <p className="text-zinc-500 text-xs mb-1">حالة الحساب</p>
          <p className={`font-medium ${profile.is_active ? 'text-success' : 'text-danger'}`}>{profile.is_active ? '● نشط' : '● معطل'}</p>
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

      <div className="space-y-2">
        <MenuItem to="/settings" icon={SettingsIcon} label="الإعدادات" />
        <MenuItem to="/referral" icon={Gift} label="برنامج الإحالة" />
        <MenuItem to="/support" icon={LifeBuoy} label="الدعم الفني" />
        <MenuItem to="/terms" icon={FileText} label="شروط الخدمة وسياسة الخصوصية" />
        <MenuItem icon={LogOut} label="تسجيل الخروج" danger onClick={signOut} />
      </div>
    </div>
  );
}
