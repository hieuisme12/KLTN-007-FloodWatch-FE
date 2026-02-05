import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isModerator} from '../utils/auth';
import { FaHouse, FaClipboardList, FaPlus, FaMagnifyingGlass, FaUser, FaLock, FaPenToSquare, FaWater } from 'react-icons/fa6';
import UserDropdown from './UserDropdown';
import './Navigation.css';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = isAuthenticated();
  const moderator = isModerator();

  // Danh sách menu items
  const menuItems = [
    {
      path: '/',
      label: ' Trang chủ',
      icon: FaHouse,
      public: true
    },
    {
      path: '/reports',
      label: 'Báo cáo',
      icon: FaClipboardList,
      public: true
    },
    {
      path: '/report/new',
      label: 'Báo cáo mới',
      icon: FaPlus,
      requireAuth: true
    },
    {
      path: '/moderation',
      label: 'Kiểm duyệt',
      icon: FaMagnifyingGlass,
      requireModerator: true
    },
    {
      path: '/profile',
      label: 'Tài khoản',
      icon: FaUser,
      requireAuth: true
    }
  ];

  // Filter menu items dựa trên quyền
  const visibleMenuItems = menuItems.filter(item => {
    if (item.public) return true;
    if (item.requireModerator) return moderator;
    if (item.requireAuth) return authenticated;
    return false;
  });

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        {/* Logo/Brand */}
        <div className="nav-brand" onClick={() => navigate('/')}>
          <FaWater className="brand-icon" />
          <span className="brand-text">FloodWatch</span>
        </div>

        {/* Menu Items */}
        <div className="nav-menu">
          {visibleMenuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">
                <item.icon />
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* User Actions */}
        <div className="nav-actions">
          {!authenticated ? (
            <>
              <button
                className="nav-auth-btn"
                onClick={() => navigate('/login')}
              >
                <FaLock /> Đăng nhập
              </button>
              <button
                className="nav-auth-btn nav-register-btn"
                onClick={() => navigate('/register')}
              >
                <FaPenToSquare /> Đăng ký
              </button>
            </>
          ) : (
            <UserDropdown />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

