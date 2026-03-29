import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/i18nContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import BeatMarketplace from '@/pages/BeatMarketplace';
import GigMarketplace from '@/pages/GigMarketplace';
import GigDetail from '@/pages/GigDetail';
import OrderManagement from '@/pages/OrderManagement';
import OrderDetail from '@/pages/OrderDetail';
import Messaging from '@/pages/Messaging';
import AICareerCoach from '@/pages/AICareerCoach';
import Dashboard from '@/pages/Dashboard';
import UploadBeat from '@/pages/UploadBeat';
import CreateGig from '@/pages/CreateGig';
import AdminPortal from '@/pages/AdminPortal';
import SubscriptionPage from '@/pages/SubscriptionPage';
import WalletPage from '@/pages/WalletPage';
import StudioFeed from '@/pages/StudioFeed';
import PlaylistPage from '@/pages/PlaylistPage';
import SupportCenter from '@/pages/SupportCenter';
import LiveRoom from '@/pages/LiveRoom';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import PackDetail from '@/pages/PackDetail';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <I18nProvider>
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
                  <Route path="/feed" element={<StudioFeed />} />
                  <Route path="/playlists" element={<PlaylistPage />} />

                  {/* Protected */}
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
                  <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
                  <Route path="/messages/:id" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
                  <Route path="/coach" element={<ProtectedRoute><AICareerCoach /></ProtectedRoute>} />
                  <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
                  <Route path="/beats/upload" element={<ProtectedRoute><UploadBeat /></ProtectedRoute>} />
                  <Route path="/gigs/create" element={<ProtectedRoute><CreateGig /></ProtectedRoute>} />
                  <Route path="/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
                  <Route path="/liveroom" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />
                  <Route path="/liveroom/:roomId" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
                  <Route path="/packs/:id" element={<PackDetail />} />

                  {/* Admin only */}
                  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPortal /></ProtectedRoute>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PlayerProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
