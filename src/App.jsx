import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSettings } from './hooks/useSettings';
import SplashScreen from './components/shared/SplashScreen';

import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AuthCallback from './pages/auth/AuthCallback';

import Dashboard from './pages/user/Dashboard';
import Wallet from './pages/user/Wallet';
import P2P from './pages/user/P2P';
import P2PNewOrder from './pages/user/P2PNewOrder';
import Deposit from './pages/user/Deposit';
import BuyUsdt from './pages/user/BuyUsdt';
import SellUsdt from './pages/user/SellUsdt';
import Withdraw from './pages/user/Withdraw';
import Transactions from './pages/user/Transactions';
import TransactionDetail from './pages/user/TransactionDetail';
import Notifications from './pages/user/Notifications';
import Profile from './pages/user/Profile';
import ProfileEdit from './pages/user/ProfileEdit';
import Settings from './pages/user/Settings';
import Referral from './pages/user/Referral';
import Tickets from './pages/user/Support/Tickets';
import NewTicket from './pages/user/Support/NewTicket';
import TicketChat from './pages/user/Support/TicketChat';

import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import FAQ from './pages/public/FAQ';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminUserDetail from './pages/admin/UserDetail';
import AdminTransactions from './pages/admin/Transactions';
import AdminRates from './pages/admin/Rates';
import AdminBanners from './pages/admin/Banners';
import AdminP2P from './pages/admin/P2P';
import AdminSupport from './pages/admin/Support';
import AdminTicketDetail from './pages/admin/TicketDetail';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminSettings from './pages/admin/Settings';

export default function App() {
  const { splashSettings, loading: settingsLoading } = useSettings();
  const [splashDone, setSplashDone] = useState(false);
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  useEffect(() => {
    if (settingsLoading || isAdminRoute) return;
    if (!splashSettings.enabled || !splashSettings.image_url) { setSplashDone(true); return; }
    const t = setTimeout(() => setSplashDone(true), (splashSettings.duration_seconds || 5) * 1000);
    return () => clearTimeout(t);
  }, [settingsLoading, splashSettings, isAdminRoute]);

  // Shown once per cold load (this state resets only on a real page refresh,
  // not on client-side route changes) — admins skip it for faster access.
  if (!isAdminRoute && !settingsLoading && splashSettings.enabled && splashSettings.image_url && !splashDone) {
    return <SplashScreen imageUrl={splashSettings.image_url} />;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/faq" element={<FAQ />} />

      {/* User app */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/p2p" element={<P2P />} />
        <Route path="/p2p/new" element={<P2PNewOrder />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/buy-usdt" element={<BuyUsdt />} />
        <Route path="/sell-usdt" element={<SellUsdt />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transaction/:id" element={<TransactionDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/support" element={<Tickets />} />
        <Route path="/support/new" element={<NewTicket />} />
        <Route path="/support/:id" element={<TicketChat />} />
      </Route>

      {/* Admin app - fully independent path/layout */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="rates" element={<AdminRates />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="p2p" element={<AdminP2P />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="support/:id" element={<AdminTicketDetail />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
