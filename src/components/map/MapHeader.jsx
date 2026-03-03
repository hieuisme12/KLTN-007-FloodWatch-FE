import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MapHeader.css';

const MapHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <header className="map-header">
      <div className="map-header-container">
        {/* Logo/Brand - nằm ở phần màu xanh của banner (bên trái) */}
        <div className="map-header-brand" onClick={() => navigate('/')}>
          <div className="map-brand-icon-circle">
            <img src="/iuh.png" alt="IUH Logo" className="map-brand-icon-img" />
          </div>
          <span className="map-brand-text">FLOODSIGHT TP HỒ CHÍ MINH</span>
        </div>

        {/* Navigation Section - nằm ở phần màu trắng của banner (bên phải) */}
        <div className="map-header-right-section">
          <div className="map-header-navigation">
            <button
              className={`map-nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <span className="map-nav-label">Trang chủ</span>
            </button>
            <button
              className={`map-nav-item ${isActive('/reports') ? 'active' : ''}`}
              onClick={() => navigate('/reports')}
            >
              <span className="map-nav-label">Báo cáo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MapHeader;

