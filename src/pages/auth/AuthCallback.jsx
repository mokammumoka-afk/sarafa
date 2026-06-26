import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthCallback() {
  const { user, loading, needsOnboarding } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-primary-900 text-zinc-400" dir="rtl">
        <span className="w-6 h-6 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
        جارِ تسجيل الدخول...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/register" replace />;
  return <Navigate to="/dashboard" replace />;
}
