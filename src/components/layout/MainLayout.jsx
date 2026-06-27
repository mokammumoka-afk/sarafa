import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import PageTransition from '../shared/PageTransition';
import { useAuth } from '../../contexts/AuthContext';

export default function MainLayout() {
  const { user, loading, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-primary-900 text-zinc-500">
        <span className="w-6 h-6 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
        جارِ التحميل...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/register" replace />;

  return (
    <div className="min-h-screen bg-primary-900 text-zinc-100 font-body" dir="rtl">
      <Header />
      <main className="max-w-md mx-auto px-4 pb-24 pt-4">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
