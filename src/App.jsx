import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { bootstrapAuth } from './utils/authSession';
import { ReporterRankingProvider } from './context/ReporterRankingProvider';
import DashboardPage from './pages/user/DashboardPage';
import ReportsPage from './pages/user/ReportsPage';
import NewReportPage from './pages/user/NewReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyRegisterOtpPage from './pages/VerifyRegisterOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/user/ProfilePage';
import NewsDetailPage from './pages/user/NewsDetailPage';
import MapPage from './pages/user/MapPage';
import AboutPage from './pages/user/InfoPages/AboutPage';
import PrivacyPage from './pages/user/InfoPages/PrivacyPage';
import TermsPage from './pages/user/InfoPages/TermsPage';
import FaqPage from './pages/user/InfoPages/FaqPage';
import ContactPage from './pages/user/InfoPages/ContactPage';
import Layout from './components/layout/Layout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import { isAuthenticated } from './utils/auth';
import { isGuestBrowseMode } from './utils/guestSession';
import EmergencyAlertsPage from './pages/user/EmergencyAlertsPage';
import RoutingPage from './pages/user/RoutingPage';
import AuthLoadingScreen from './components/common/AuthLoadingScreen';
import { SkeletonTheme } from 'react-loading-skeleton';
import { GuestExploreProvider } from './context/GuestExploreProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import ExternalAdminPortalRedirect from './components/auth/ExternalAdminPortalRedirect';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/verify" element={<VerifyRegisterOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/moderation"
          element={
            <AdminRoute>
              <ExternalAdminPortalRedirect />
            </AdminRoute>
          }
        />
        <Route
          path="/research"
          element={
            <AdminRoute>
              <ExternalAdminPortalRedirect />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/operations"
          element={
            <AdminRoute>
              <ExternalAdminPortalRedirect />
            </AdminRoute>
          }
        />

        <Route path="/" element={<RootRedirect />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            <UserLayout>
              <Layout>
                <DashboardPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <UserLayout>
              <Layout>
                <ReportsPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/report/new"
          element={
            <UserLayout>
              <Layout>
                <ProtectedRoute>
                  <NewReportPage />
                </ProtectedRoute>
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <UserLayout>
              <Layout>
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/emergency-alerts"
          element={
            <UserLayout>
              <Layout>
                <ProtectedRoute>
                  <EmergencyAlertsPage />
                </ProtectedRoute>
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/routing"
          element={
            <UserLayout>
              <Layout>
                <RoutingPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/news/:id"
          element={
            <UserLayout>
              <Layout>
                <ProtectedRoute>
                  <NewsDetailPage />
                </ProtectedRoute>
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/map"
          element={
            <UserLayout>
              <Layout>
                <MapPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/about"
          element={
            <UserLayout>
              <Layout>
                <AboutPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <UserLayout>
              <Layout>
                <PrivacyPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <UserLayout>
              <Layout>
                <TermsPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/faq"
          element={
            <UserLayout>
              <Layout>
                <FaqPage />
              </Layout>
            </UserLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <UserLayout>
              <Layout>
                <ContactPage />
              </Layout>
            </UserLayout>
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
