import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import Dashboard from './pages/user/Dashboard';
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
import AdminSupport from './pages/admin/Support';
import AdminTicketDetail from './pages/admin/TicketDetail';
import AdminAuditLog from './pages/admin/AuditLog';
import AdminSettings from './pages/admin/Settings';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/faq" element={<FAQ />} />

      {/* User app */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
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
