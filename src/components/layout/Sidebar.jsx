import React, { useState, useEffect, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, isModerator, getCurrentUser } from '../../utils/auth';
import { API_CONFIG } from '../../config/apiConfig';
import { logout } from '../../services/api';
import { 
  FaHouse, 
  FaClipboardList, 
  FaPlus, 
  FaClipboardCheck,
  FaCrown, 
  FaUser, 
  FaBars,
  FaRightFromBracket
} from 'react-icons/fa6';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const authenticated = isAuthenticated();
  const moderator = isModerator();

  useEffect(() => {
    const handleUserUpdated = () => setCurrentUser(getCurrentUser());
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  const sidebarAvatarUrl = currentUser?.avatar
    ? (API_CONFIG.BASE_URL.replace(/\/$/, '') + (currentUser.avatar.startsWith('/') ? currentUser.avatar : `/profile-icons/${currentUser.avatar}`))
    : null;

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
    // Update body class for Layout to adjust margin
    if (newCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  // Initialize body class on mount
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Main navigation items (RBAC: Admin ≠ Moderator; Kiểm duyệt chỉ moderator)
  const mainNavItems = [
    {
      path: '/',
      label: 'Trang chủ',
      icon: FaHouse,
      badge: null,
      public: true
    },
    {
      path: '/reports',
      label: 'Báo cáo',
      icon: FaClipboardList,
      badge: null,
      public: true
    },
    {
      path: '/report/new',
      label: 'Báo cáo mới',
      icon: FaPlus,
      badge: null,
      requireAuth: true
    },
    {
      path: '/moderation',
      label: 'Kiểm duyệt',
      icon: FaClipboardCheck,
      badge: null,
      requireModerator: true
    }
  ];

  // Filter items based on permissions
  const visibleNavItems = mainNavItems.filter(item => {
    if (item.public) return true;
    if (item.requireModerator) return moderator;
    if (item.requireAuth) return authenticated;
    return false;
  });

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header with User Info and Toggle Button */}
      <div className="sidebar-header">
        {!collapsed && currentUser ? (
          <div 
            className="sidebar-user-info"
            onClick={() => navigate('/profile')}
          >
            <div className="sidebar-user-avatar">
              {sidebarAvatarUrl ? (
                <img src={sidebarAvatarUrl} alt="" className="sidebar-user-avatar-img" />
              ) : (
                currentUser.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="sidebar-user-details">
              <div className="sidebar-user-name">{currentUser.full_name || currentUser.username}</div>
              <div className="sidebar-user-role">
                {currentUser.role === 'admin' ? (
                  <><FaCrown style={{ fontSize: '10px', marginRight: '4px' }} /> Quản trị viên</>
                ) : currentUser.role === 'moderator' ? (
                  <><FaUser style={{ fontSize: '10px', marginRight: '4px' }} /> Điều hành viên</>
                ) : (
                  <><FaUser style={{ fontSize: '10px', marginRight: '4px' }} /> Người dùng</>
                )}
              </div>
            </div>
          </div>
        ) : !collapsed ? (
          <div className="sidebar-title">FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH</div>
        ) : null}
        <button 
          className="sidebar-toggle-btn"
          onClick={toggleCollapse}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <FaBars />
        </button>
      </div>
      
      <div className="sidebar-content">
        {/* Main Navigation */}
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar-nav-icon">
                <item.icon />
              </span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
              {item.badge && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      {authenticated && (
        <div className="sidebar-logout-section">
          <button 
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <span className="sidebar-logout-icon">
              <FaRightFromBracket />
            </span>
            {!collapsed && <span className="sidebar-logout-label">Đăng xuất</span>}
          </button>
        </div>
      )}

      {/* Bottom Logo */}
      <div className="sidebar-footer">
        <Transition
          as={Fragment}
          show={collapsed}
          enter="transform transition duration-[400ms]"
          enterFrom="opacity-0 rotate-[-120deg] scale-50"
          enterTo="opacity-100 rotate-0 scale-100"
          leave="transform duration-200 transition ease-in-out"
          leaveFrom="opacity-100 rotate-0 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <img src="/logo_mini.png" alt="IUH Logo Mini" className="sidebar-footer-logo-mini" />
        </Transition>
        <Transition
          as={Fragment}
          show={!collapsed}
          enter="transform transition duration-[400ms]"
          enterFrom="opacity-0 rotate-[-120deg] scale-50"
          enterTo="opacity-100 rotate-0 scale-100"
          leave="transform duration-200 transition ease-in-out"
          leaveFrom="opacity-100 rotate-0 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <img src="/logo_full.png" alt="IUH Logo Full" className="sidebar-footer-logo-full" />
        </Transition>
      </div>
    </aside>
  );
};

export default Sidebar;

