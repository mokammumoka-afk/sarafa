import { useAuth } from '../../contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20.5H24v7h11.3C33.7 31.9 29.3 35 24 35c-6.1 0-11.3-3.9-13.2-9.3l-7.4 5.7C7.1 38 14.9 43 24 43c10.5 0 19.5-7.6 19.5-19 0-1.2-.1-2.4-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l7.4 5.7C15.6 16.5 19.4 14 24 14c3 0 5.7 1.1 7.8 2.9l6.5-6.5C34.4 6.9 29.5 5 24 5c-7.7 0-14.3 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 43c5.4 0 10.3-1.9 14-5l-6.6-5.4c-2 1.4-4.5 2.4-7.4 2.4-5.3 0-9.7-3.1-11.5-7.5l-7.3 5.7C6.7 38.8 14.6 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.3-2.3 4.3-4.1 5.6.7-.6 6.6 5.4 6.6 5.4 3.9-3.6 6.2-8.9 6.2-14.5 0-1.2-.1-2.4-.3-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-primary-900" dir="rtl">
      <div className="max-w-sm w-full mx-auto text-center">
        <h1 className="font-heading font-bold text-3xl text-accent-400 mb-1 ltr">Sarafa Libya</h1>
        <p className="text-zinc-400 mb-10">محفظتك الرقمية لتداول USDT بأمان</p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-bold py-3.5 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <GoogleIcon />
          تسجيل الدخول عبر Google
        </button>

        <p className="text-xs text-zinc-500 mt-6">
          بتسجيل الدخول أنت توافق على{' '}
          <a href="/terms" className="text-accent-400">شروط الخدمة</a> و{' '}
          <a href="/privacy" className="text-accent-400">سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
}
