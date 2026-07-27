import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';

import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import AdminLogin from './pages/public/AdminLogin.jsx';

import { CustomerLayout } from './layouts/CustomerLayout.jsx';
import CustomerHome from './pages/customer/Home.jsx';
import CustomerBookings from './pages/customer/Bookings.jsx';
import CustomerWallet from './pages/customer/Wallet.jsx';
import CustomerProfile from './pages/customer/Profile.jsx';

import { WorkerLayout } from './layouts/WorkerLayout.jsx';
import WorkerDashboard from './pages/worker/Dashboard.jsx';
import WorkerJobs from './pages/worker/Jobs.jsx';
import WorkerEarnings from './pages/worker/Earnings.jsx';
import WorkerProfile from './pages/worker/Profile.jsx';
import WorkerServices from './pages/worker/Services.jsx';
import WorkerAreas from './pages/worker/Areas.jsx';
import WorkerReviews from './pages/worker/Reviews.jsx';

import { AdminLayout } from './layouts/AdminLayout.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminBookings from './pages/admin/Bookings.jsx';
import AdminCustomers from './pages/admin/Customers.jsx';
import AdminWorkers from './pages/admin/Workers.jsx';
import AdminTransactions from './pages/admin/Transactions.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/:role" element={<Login />} />
      <Route path="/register/:role" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/customer"
        element={
          <ProtectedRoute role="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerHome />} />
        <Route path="bookings" element={<CustomerBookings />} />
        <Route path="wallet" element={<CustomerWallet />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      <Route
        path="/worker"
        element={
          <ProtectedRoute role="worker">
            <WorkerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<WorkerDashboard />} />
        <Route path="jobs" element={<WorkerJobs />} />
        <Route path="earnings" element={<WorkerEarnings />} />
        <Route path="profile" element={<WorkerProfile />} />
        <Route path="services" element={<WorkerServices />} />
        <Route path="areas" element={<WorkerAreas />} />
        <Route path="reviews" element={<WorkerReviews />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="workers" element={<AdminWorkers />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
