import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const fullPhone = () => (phone.startsWith('218') ? `+${phone}` : `+218${phone.replace(/^0/, '')}`);

  async function handleSendOtp(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await sendOtp(fullPhone());
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('تم إرسال رمز التحقق');
    setStep('otp');
  }

  async function handleVerify(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await verifyOtp(fullPhone(), otp);
    setBusy(false);
    if (error) return toast.error('رمز غير صحيح، حاول مجدداً');
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-primary-900" dir="rtl">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="font-heading font-bold text-3xl text-accent-400 mb-1">صرافة ليبيا</h1>
        <p className="text-zinc-400 mb-8">محفظتك الرقمية لتداول USDT بأمان</p>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block">
              <span className="text-sm text-zinc-400 mb-1.5 block">رقم الهاتف</span>
              <div className="flex items-center bg-surface-800 rounded-xl border border-white/10 px-4">
                <span className="text-zinc-500 ltr">+218</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="91XXXXXXX"
                  className="flex-1 bg-transparent py-3.5 px-2 outline-none ltr text-left"
                />
              </div>
            </label>
            <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl hover:bg-accent-500 disabled:opacity-50 transition-colors">
              {busy ? 'جارِ الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block">
              <span className="text-sm text-zinc-400 mb-1.5 block">رمز التحقق (OTP)</span>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="------"
                className="w-full bg-surface-800 rounded-xl border border-white/10 px-4 py-3.5 outline-none text-center text-2xl tracking-widest ltr"
              />
            </label>
            <button disabled={busy} className="w-full bg-accent-400 text-primary-900 font-bold py-3.5 rounded-xl hover:bg-accent-500 disabled:opacity-50 transition-colors">
              {busy ? 'جارِ التحقق...' : 'تأكيد'}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-zinc-500 py-2">
              تغيير رقم الهاتف
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
