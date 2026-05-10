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
import ModerationPage from './pages/ModerationPage';
import ResearchAnalyticsPage from './pages/ResearchAnalyticsPage';
import AboutPage from './pages/InfoPages/AboutPage';
import PrivacyPage from './pages/InfoPages/PrivacyPage';
import TermsPage from './pages/InfoPages/TermsPage';
import FaqPage from './pages/InfoPages/FaqPage';
import ContactPage from './pages/InfoPages/ContactPage';
import Layout from './components/layout/Layout';
import { isAuthenticated, hasRole, isModerator, isAdmin } from './utils/auth';
import EmergencyAlertsPage from './pages/EmergencyAlertsPage';
import AdminOperationsPage from './pages/AdminOperationsPage';
import RoutingPage from './pages/RoutingPage';
import AuthLoadingScreen from './components/common/AuthLoadingScreen';
import { SkeletonTheme } from 'react-loading-skeleton';

// Protected Route – chỉ cần đăng nhập (bất kỳ role)
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// Moderator Route – CHỈ role moderator (Admin không được vào trang kiểm duyệt)
const ModeratorRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isModerator()) return <Navigate to="/" replace />;
  return children;
};

const ResearchRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!hasRole(['admin', 'moderator'])) return <Navigate to="/" replace />;
  return children;
};

/** Chỉ admin — B1/C1 vận hành, không gộp moderator */
const AdminRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

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
      <SkeletonTheme baseColor="#e2e8f0" highlightColor="#f8fafc">
      <ReporterRankingProvider>
      <Routes>
        {/* Login và Register không có Navigation */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/verify" element={<VerifyRegisterOtpPage />} />
        
        {/* Các trang khác có Navigation */}
        <Route 
          path="/" 
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          } 
        />
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
          path="/moderation"
          element={
            <Layout>
              <ModeratorRoute>
                <ModerationPage />
              </ModeratorRoute>
            </Layout>
          }
        />
        <Route
          path="/research"
          element={
            <Layout>
              <ResearchRoute>
                <ResearchAnalyticsPage />
              </ResearchRoute>
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
          path="/admin/operations"
          element={
            <Layout>
              <AdminRoute>
                <AdminOperationsPage />
              </AdminRoute>
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
              <NewsDetailPage />
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
      </AuthBootstrap>
    </Router>
  );
}

export default App;
