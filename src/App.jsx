import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

/**
 * Global auth: có JWT mới vào shell app + Layout (theo tài liệu BE).
 * Login, đăng ký, verify OTP vẫn mở không cần token.
 */
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

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

const AdminRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <ReporterRankingProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/verify" element={<VerifyRegisterOtpPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReportsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <NewReportPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderation"
            element={
              <ProtectedRoute>
                <Layout>
                  <ModeratorRoute>
                    <ModerationPage />
                  </ModeratorRoute>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/research"
            element={
              <ProtectedRoute>
                <Layout>
                  <ResearchRoute>
                    <ResearchAnalyticsPage />
                  </ResearchRoute>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency-alerts"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmergencyAlertsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/operations"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminRoute>
                    <AdminOperationsPage />
                  </AdminRoute>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/routing"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoutingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/news/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <NewsDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <Layout>
                  <AboutPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <Layout>
                  <PrivacyPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/terms"
            element={
              <ProtectedRoute>
                <Layout>
                  <TermsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faq"
            element={
              <ProtectedRoute>
                <Layout>
                  <FaqPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContactPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </ReporterRankingProvider>
    </Router>
  );
}

export default App;
