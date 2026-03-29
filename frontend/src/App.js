import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import ProtectedRoute from '@/components/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import BeatMarketplace from '@/pages/BeatMarketplace';
import GigMarketplace from '@/pages/GigMarketplace';
import GigDetail from '@/pages/GigDetail';
import OrderManagement from '@/pages/OrderManagement';
import Messaging from '@/pages/Messaging';
import AICareerCoach from '@/pages/AICareerCoach';
import Dashboard from '@/pages/Dashboard';
import UploadBeat from '@/pages/UploadBeat';
import CreateGig from '@/pages/CreateGig';
import AdminPortal from '@/pages/AdminPortal';
import SubscriptionPage from '@/pages/SubscriptionPage';
import WalletPage from '@/pages/WalletPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <PlayerProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/beats" element={<BeatMarketplace />} />
              <Route path="/gigs" element={<GigMarketplace />} />
              <Route path="/gigs/:id" element={<GigDetail />} />
              <Route path="/subscriptions" element={<SubscriptionPage />} />

              {/* Protected */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
              <Route path="/messages/:id" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
              <Route path="/coach" element={<ProtectedRoute><AICareerCoach /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/beats/upload" element={<ProtectedRoute><UploadBeat /></ProtectedRoute>} />
              <Route path="/gigs/create" element={<ProtectedRoute><CreateGig /></ProtectedRoute>} />

              {/* Admin only */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPortal /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
