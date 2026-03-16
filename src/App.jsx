import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReporterRankingProvider } from './context/ReporterRankingContext';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import NewReportPage from './pages/NewReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import NewsDetailPage from './pages/NewsDetailPage';
import MapPage from './pages/MapPage';
import ModerationPage from './pages/ModerationPage';
import Layout from './components/layout/Layout';
import { isAuthenticated, isModerator } from './utils/auth';
import './App.css';

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

function App() {
  return (
    <Router>
      <ReporterRankingProvider>
      <Routes>
        {/* Login và Register không có Navigation */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
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
      </Routes>
      </ReporterRankingProvider>
    </Router>
  );
}

export default App;
