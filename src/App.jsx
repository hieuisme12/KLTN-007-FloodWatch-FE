import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import NewReportPage from './pages/NewReportPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import { isAuthenticated } from './services/api';
import './App.css';

// Protected Route Component - chỉ cho các trang yêu cầu đăng nhập bắt buộc
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Dashboard cho phép guest xem */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Reports cho phép guest xem */}
        <Route path="/reports" element={<ReportsPage />} />
        {/* Tạo báo cáo mới yêu cầu đăng nhập */}
        <Route path="/report/new" element={<ProtectedRoute><NewReportPage /></ProtectedRoute>} />
        {/* Profile yêu cầu đăng nhập */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
