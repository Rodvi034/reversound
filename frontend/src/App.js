import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/i18nContext';
import { CartProvider } from '@/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import ProtectedRoute from '@/components/ProtectedRoute';

import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
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
import PaymentPage from '@/pages/PaymentPage';
import StudioFeed from '@/pages/StudioFeed';
import PlaylistPage from '@/pages/PlaylistPage';
import SupportCenter from '@/pages/SupportCenter';
import LiveRoom from '@/pages/LiveRoom';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import PackDetail from '@/pages/PackDetail';
import PublicProfile from '@/pages/PublicProfile';
import FavoritesPage from '@/pages/FavoritesPage';
import JobBoard from '@/pages/JobBoard';
import JobRequestDetail from '@/pages/JobRequestDetail';
import BlogPage from '@/pages/BlogPage';
import BlogPostDetail from '@/pages/BlogPostDetail';
import CreateBlogPost from '@/pages/CreateBlogPost';
import ReverStudio from '@/pages/ReverStudio';
import ReverStudioTools from '@/pages/ReverStudioTools';
import MyRoadmap from '@/pages/MyRoadmap';
import CheckoutPage from '@/pages/CheckoutPage';
import GearMarketplace from '@/pages/GearMarketplace';
import SellGear from '@/pages/SellGear';
import StudioMarketplace from '@/pages/StudioMarketplace';
import StudioDetail from '@/pages/StudioDetail';
import GearDetail from '@/pages/GearDetail';
import ProfileSettings from '@/pages/ProfileSettings';
import AddStudio from '@/pages/AddStudio';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <I18nProvider>
            <CartProvider>
              <AuthProvider>
                <FavoritesProvider>
                  <PlayerProvider>
                    <Routes>
                      {/* Public */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/beats" element={<BeatMarketplace />} />
                      <Route path="/gigs" element={<GigMarketplace />} />
                      <Route path="/gigs/:id" element={<GigDetail />} />
                      <Route path="/subscriptions" element={<SubscriptionPage />} />
                      <Route path="/feed" element={<StudioFeed />} />
                      <Route path="/playlists" element={<PlaylistPage />} />
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:id" element={<BlogPostDetail />} />
                      <Route path="/studio" element={<ReverStudio />} />
                      <Route path="/studio/tools" element={<ReverStudioTools />} />
                      <Route path="/packs/:id" element={<PackDetail />} />
                      <Route path="/u/:username" element={<PublicProfile />} />
                      <Route path="/jobs" element={<JobBoard />} />
                      <Route path="/jobs/:id" element={<JobRequestDetail />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/payment" element={<PaymentPage />} />
                      <Route path="/payment/callback" element={<PaymentPage />} />
                      <Route path="/gear" element={<GearMarketplace />} />
                      <Route path="/gear/:id" element={<GearDetail />} />
                      <Route path="/studios" element={<StudioMarketplace />} />
                      <Route path="/studios/:id" element={<StudioDetail />} />

                      {/* Protected */}
                      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/roadmap" element={<ProtectedRoute><MyRoadmap /></ProtectedRoute>} />
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
                      <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                      <Route path="/blog/create" element={<ProtectedRoute><CreateBlogPost /></ProtectedRoute>} />
                      <Route path="/gear/sell" element={<ProtectedRoute><SellGear /></ProtectedRoute>} />
                      <Route path="/studios/list" element={<ProtectedRoute><AddStudio /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />

                      {/* Admin only */}
                      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPortal /></ProtectedRoute>} />

                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </PlayerProvider>
                </FavoritesProvider>
              </AuthProvider>
            </CartProvider>
          </I18nProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
