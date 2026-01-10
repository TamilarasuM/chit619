import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import MemberDashboard from './pages/member/MemberDashboard';
import ChitGroupsPage from './pages/admin/ChitGroupsPage';
import CreateChitGroupPage from './pages/admin/CreateChitGroupPage';
import ChitGroupDetailsPage from './pages/admin/ChitGroupDetailsPage';

// Auction Pages
import ScheduleAuctionPage from './pages/admin/ScheduleAuctionPage';
import AuctionControlPage from './pages/admin/AuctionControlPage';
import AuctionsListPage from './pages/admin/AuctionsListPage';
import AuctionPaymentTrackingPage from './pages/admin/AuctionPaymentTrackingPage';

// Payment Pages
import RecordPaymentPage from './pages/admin/RecordPaymentPage';
import PendingPaymentsPage from './pages/admin/PendingPaymentsPage';
import PaymentHistoryPage from './pages/admin/PaymentHistoryPage';

// Member Pages
import MemberAuctionsPage from './pages/member/MemberAuctionsPage';
import MemberPaymentsPage from './pages/member/MemberPaymentsPage';
import MemberStatementPage from './pages/member/MemberStatementPage';

// Report Pages
import ReportsPage from './pages/admin/ReportsPage';

// Member Rankings
import MemberRankingsPage from './pages/admin/MemberRankingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Chit Group Routes */}
          <Route
            path="/chitgroups"
            element={
              <ProtectedRoute requiredRole="admin">
                <ChitGroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chitgroups/create"
            element={
              <ProtectedRoute requiredRole="admin">
                <CreateChitGroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chitgroups/:id"
            element={
              <ProtectedRoute requiredRole="admin">
                <ChitGroupDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Auction Routes (Admin) */}
          <Route
            path="/auctions"
            element={
              <ProtectedRoute requiredRole="admin">
                <AuctionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/schedule/:chitGroupId"
            element={
              <ProtectedRoute requiredRole="admin">
                <ScheduleAuctionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/:auctionId/control"
            element={
              <ProtectedRoute requiredRole="admin">
                <AuctionControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/:auctionId/payments"
            element={
              <ProtectedRoute requiredRole="admin">
                <AuctionPaymentTrackingPage />
              </ProtectedRoute>
            }
          />

          {/* Payment Routes (Admin) */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute requiredRole="admin">
                <PaymentHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/pending"
            element={
              <ProtectedRoute requiredRole="admin">
                <PendingPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/record"
            element={
              <ProtectedRoute requiredRole="admin">
                <RecordPaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Reports Route (Admin) */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRole="admin">
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Member Rankings Route (Admin) */}
          <Route
            path="/rankings"
            element={
              <ProtectedRoute requiredRole="admin">
                <MemberRankingsPage />
              </ProtectedRoute>
            }
          />

          {/* Member Routes */}
          <Route
            path="/member/dashboard"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/auctions"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberAuctionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/payments"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/statement/:chitGroupId"
            element={
              <ProtectedRoute requiredRole="member">
                <MemberStatementPage />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 - Redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

