import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-accent-400' : 'bg-zinc-700'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(profile?.notification_push ?? true);
  const [emailEnabled, setEmailEnabled] = useState(profile?.notification_email ?? false);

  async function updateNotif(key, value) {
    await supabase.from('profiles').update({ [key]: value }).eq('id', user.id);
    toast.success('تم الحفظ');
  }

  const Row = ({ label, control }) => (
    <div className="flex items-center justify-between bg-surface-800 rounded-xl px-4 py-3.5 border border-white/5">
      <span className="text-sm">{label}</span>
      {control}
    </div>
  );

  return (
    <div>
      <PageHeader title="الإعدادات" to="/profile" />
      <div className="space-y-5">
        <div>
          <p className="text-sm text-zinc-400 mb-2">الإشعارات</p>
          <div className="space-y-2">
            <Row label="إشعارات Push" control={<Toggle checked={pushEnabled} onChange={(v) => { setPushEnabled(v); updateNotif('notification_push', v); }} />} />
            <Row label="إشعارات البريد الإلكتروني" control={<Toggle checked={emailEnabled} onChange={(v) => { setEmailEnabled(v); updateNotif('notification_email', v); }} />} />
          </div>
        </div>

        <div>
          <p className="text-sm text-zinc-400 mb-2">الحساب</p>
          <div className="space-y-2">
            <button onClick={signOut} className="w-full text-right bg-surface-800 rounded-xl px-4 py-3.5 border border-white/5 text-sm">
              تسجيل الخروج
            </button>
            <button className="w-full text-right bg-surface-800 rounded-xl px-4 py-3.5 border border-danger/20 text-sm text-danger">
              حذف الحساب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
