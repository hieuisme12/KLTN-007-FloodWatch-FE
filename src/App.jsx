import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { bootstrapAuth } from './utils/authSession';
import { ReporterRankingProvider } from './context/ReporterRankingProvider';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import NewReportPage from './pages/NewReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyRegisterOtpPage from './pages/VerifyRegisterOtpPage';
import ProfilePage from './pages/ProfilePage';
import NewsDetailPage from './pages/NewsDetailPage';
import MapPage from './pages/MapPage';
import AboutPage from './pages/InfoPages/AboutPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import TermsPage from './pages/InfoPages/TermsPage';
import FaqPage from './pages/InfoPages/FaqPage';
import ContactPage from './pages/InfoPages/ContactPage';
import Layout from './components/layout/Layout';
import { isAuthenticated } from './utils/auth';
import { isGuestBrowseMode } from './utils/guestSession';
import EmergencyAlertsPage from './pages/EmergencyAlertsPage';
import RoutingPage from './pages/RoutingPage';
import AuthLoadingScreen from './components/common/AuthLoadingScreen';
import { SkeletonTheme } from 'react-loading-skeleton';
import { GuestExploreProvider } from './context/GuestExploreProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

/** Mở site: đã đăng nhập hoặc chế độ khách → dashboard; còn lại → login. */
function RootRedirect() {
  if (isAuthenticated() || isGuestBrowseMode()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

/** Chạy refresh khi mở app (trong refresh_expires_at) trước khi kiểm tra route. */
function AuthBootstrap({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    bootstrapAuth().finally(() => setReady(true));
  }, []);
  if (!ready) {
    return <AuthLoadingScreen />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AuthBootstrap>
      <GuestExploreProvider>
      <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f8fafc">
      <ReporterRankingProvider>
      <Routes>
        {/* Login và Register không có Navigation */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/verify" element={<VerifyRegisterOtpPage />} />

        <Route path="/moderation" element={<Navigate to="/dashboard" replace />} />
        <Route path="/research" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/operations" element={<Navigate to="/dashboard" replace />} />

        <Route path="/" element={<RootRedirect />} />

        {/* Các trang khác có Navigation — cốt lõi yêu cầu đăng nhập */}
        <Route
          path="/dashboard"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />
        <Route
          path="/reports"
          element={
            <Layout>
              <ReportsPage />
            </Layout>
          }
        />
        <Route 
          path="/report/new" 
          element={
            <Layout>
              <ProtectedRoute>
                <NewReportPage />
              </ProtectedRoute>
            </Layout>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <Layout>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </Layout>
          } 
        />
        <Route
          path="/emergency-alerts"
          element={
            <Layout>
              <ProtectedRoute>
                <EmergencyAlertsPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route
          path="/routing"
          element={
            <Layout>
              <RoutingPage />
            </Layout>
          }
        />
        <Route
          path="/news/:id"
          element={
            <Layout>
              <ProtectedRoute>
                <NewsDetailPage />
              </ProtectedRoute>
            </Layout>
          }
        />
        <Route 
          path="/map" 
          element={<MapPage />} 
        />
        <Route
          path="/about"
          element={
            <Layout>
              <AboutPage />
            </Layout>
          }
        />
        <Route
          path="/privacy"
          element={
            <Layout>
              <PrivacyPage />
            </Layout>
          }
        />
        <Route
          path="/terms"
          element={
            <Layout>
              <TermsPage />
            </Layout>
          }
        />
        <Route
          path="/faq"
          element={
            <Layout>
              <FaqPage />
            </Layout>
          }
        />
        <Route
          path="/contact"
          element={
            <Layout>
              <ContactPage />
            </Layout>
          }
        />
      </Routes>
      </ReporterRankingProvider>
      </SkeletonTheme>
      </GuestExploreProvider>
      </AuthBootstrap>
    </Router>
  );
}

export default App;
