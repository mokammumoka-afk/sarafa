import { Navigate, Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export default function MainLayout() {
  const { user, loading, needsOnboarding } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">جارِ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/register" replace />;

  return (
    <div className="min-h-screen bg-primary-900 text-zinc-100 font-body" dir="rtl">
      <Header />
      <main className="max-w-md mx-auto px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
