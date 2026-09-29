import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Marketplace from './pages/Marketplace.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import ListingForm from './pages/ListingForm.jsx';
import Favourites from './pages/Favourites.jsx';
import Wallet from './pages/Wallet.jsx';
import Transactions from './pages/Transactions.jsx';
import Contracts from './pages/Contracts.jsx';
import ContractDetail from './pages/ContractDetail.jsx';
import CreateContract from './pages/CreateContract.jsx';
import Messages from './pages/Messages.jsx';
import Reports from './pages/Reports.jsx';
import Disputes from './pages/Disputes.jsx';
import DisputeDetail from './pages/DisputeDetail.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import Profile from './pages/Profile.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import PaymentHistory from './pages/PaymentHistory.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

const Protected = (children) => <ProtectedRoute>{children}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      <Route
        path="/dashboard"
        element={Protected(
          <AppLayout>
            <Dashboard />
          </AppLayout>
        )}
      />
      <Route
        path="/marketplace"
        element={Protected(
          <AppLayout>
            <Marketplace />
          </AppLayout>
        )}
      />
      <Route
        path="/favourites"
        element={Protected(
          <AppLayout>
            <Favourites />
          </AppLayout>
        )}
      />
      <Route
        path="/wallet"
        element={Protected(
          <AppLayout>
            <Wallet />
          </AppLayout>
        )}
      />
      <Route
        path="/transactions"
        element={Protected(
          <AppLayout>
            <Transactions />
          </AppLayout>
        )}
      />
      <Route
        path="/payment-history"
        element={Protected(
          <AppLayout>
            <PaymentHistory />
          </AppLayout>
        )}
      />
      <Route
        path="/marketplace/new"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <AppLayout>
              <ListingForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <AppLayout>
              <ListingForm />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace/:id"
        element={Protected(
          <AppLayout>
            <ListingDetail />
          </AppLayout>
        )}
      />
      <Route
        path="/contracts"
        element={Protected(
          <AppLayout>
            <Contracts />
          </AppLayout>
        )}
      />
      <Route
        path="/contracts/new"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <AppLayout>
              <CreateContract />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:id"
        element={Protected(
          <AppLayout>
            <ContractDetail />
          </AppLayout>
        )}
      />
      <Route
        path="/messages"
        element={Protected(
          <AppLayout>
            <Messages />
          </AppLayout>
        )}
      />
      <Route
        path="/messages/:threadId"
        element={Protected(
          <AppLayout>
            <Messages />
          </AppLayout>
        )}
      />
      <Route
        path="/reports"
        element={Protected(
          <AppLayout>
            <Reports />
          </AppLayout>
        )}
      />
      <Route
        path="/disputes"
        element={Protected(
          <AppLayout>
            <Disputes />
          </AppLayout>
        )}
      />
      <Route
        path="/disputes/:id"
        element={Protected(
          <AppLayout>
            <DisputeDetail />
          </AppLayout>
        )}
      />
      <Route
        path="/help"
        element={Protected(
          <AppLayout>
            <HelpCenter />
          </AppLayout>
        )}
      />
      <Route
        path="/profile"
        element={Protected(
          <AppLayout>
            <Profile />
          </AppLayout>
        )}
      />
      <Route
        path="/users/:id"
        element={Protected(
          <AppLayout>
            <PublicProfile />
          </AppLayout>
        )}
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
