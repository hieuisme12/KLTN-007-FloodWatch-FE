import React, { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAdmin, isAuthenticated, isModerator, getCurrentUser } from '../../utils/auth';
import { API_CONFIG } from '../../config/apiConfig';
import { logout } from '../../services/api';
import { useSidebar } from '@/context/SidebarProvider';
import { cn } from '@/lib/cn';
import {
  FaHouse,
  FaClipboardList,
  FaPlus,
  FaClipboardCheck,
  FaCrown,
  FaUser,
  FaBars,
  FaRightFromBracket,
  FaBell,
  FaServer,
  FaRoute,
} from 'react-icons/fa6';

const scrollbarAside =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleCollapse } = useSidebar();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const authenticated = isAuthenticated();
  const moderator = isModerator();
  const admin = isAdmin();

  useEffect(() => {
    const handleUserUpdated = () => setCurrentUser(getCurrentUser());
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  const sidebarAvatarUrl = currentUser?.avatar
    ? API_CONFIG.BASE_URL.replace(/\/$/, '') +
      (currentUser.avatar.startsWith('/') ? currentUser.avatar : `/profile-icons/${currentUser.avatar}`)
    : null;

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

  const mainNavItems = [
    { path: '/', label: 'Trang chủ', icon: FaHouse, badge: null, public: true },
    { path: '/routing', label: 'Tìm đường', icon: FaRoute, badge: null, public: true },
    { path: '/reports', label: 'Báo cáo', icon: FaClipboardList, badge: null, public: true },
    { path: '/report/new', label: 'Báo cáo mới', icon: FaPlus, badge: null, requireAuth: true },
    { path: '/emergency-alerts', label: 'Cảnh báo khẩn', icon: FaBell, badge: null, requireAuth: true },
    { path: '/moderation', label: 'Kiểm duyệt', icon: FaClipboardCheck, badge: null, requireModerator: true },
    { path: '/research', label: 'Research', icon: FaClipboardList, badge: null, requireResearch: true },
    { path: '/admin/operations', label: 'Vận hành', icon: FaServer, badge: null, requireAdmin: true },
  ];

  const visibleNavItems = mainNavItems.filter((item) => {
    if (item.public) return true;
    if (item.requireModerator) return moderator;
    if (item.requireResearch) return moderator || admin;
    if (item.requireAdmin) return admin;
    if (item.requireAuth) return authenticated;
    return false;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-[61px] z-[900] flex h-[calc(100vh-61px)] flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#1976d2] to-[#1565c0] text-white shadow-[2px_0_8px_rgba(0,0,0,0.1)] transition-[width] duration-100 ease-linear will-change-[width]',
        scrollbarAside,
        'max-md:-translate-x-full max-md:transition-transform max-md:duration-300',
        collapsed ? 'w-[70px]' : 'w-[220px] lg:w-[260px]'
      )}
    >
      <div
        className={cn(
          'flex min-h-[60px] items-center gap-3 border-b border-white/10 px-3 py-4',
          collapsed ? 'justify-center px-2' : 'justify-between'
        )}
      >
        {!collapsed && currentUser ? (
          <div
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/10"
            onClick={() => navigate('/profile')}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold text-white">
              {sidebarAvatarUrl ? (
                <img src={sidebarAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                currentUser.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 truncate text-[13px] font-semibold text-white">
                {currentUser.full_name || currentUser.username}
              </div>
              <div className="flex items-center truncate text-[11px] text-white/80">
                {currentUser.role === 'admin' ? (
                  <>
                    <FaCrown className="mr-1 text-[10px]" /> Quản trị viên
                  </>
                ) : currentUser.role === 'moderator' ? (
                  <>
                    <FaUser className="mr-1 text-[10px]" /> Điều hành viên
                  </>
                ) : (
                  <>
                    <FaUser className="mr-1 text-[10px]" /> Người dùng
                  </>
                )}
              </div>
            </div>
          </div>
        ) : !collapsed ? (
          <div className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH
          </div>
        ) : null}
        <button
          type="button"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-none bg-transparent p-0 text-white transition-colors hover:bg-white/10 focus:outline-none [&_svg]:block [&_svg]:h-[18px] [&_svg]:w-[18px]"
          onClick={toggleCollapse}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <FaBars />
        </button>
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto py-5',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50',
          'px-0'
        )}
      >
        <nav className={cn('flex w-full flex-col gap-1', collapsed ? 'items-center' : '')}>
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={cn(
                'relative flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors focus:outline-none',
                collapsed ? 'justify-center px-0' : 'justify-start px-4',
                'hover:bg-white/10 hover:text-white',
                isActive(item.path) &&
                  "bg-white/20 font-semibold text-white before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-t-[6px] before:border-b-[6px] before:border-l-[8px] before:border-t-transparent before:border-b-transparent before:border-l-white before:content-['']"
              )}
              onClick={() => navigate(item.path)}
            >
              <span className="w-6 text-center text-lg">
                <item.icon />
              </span>
              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
              {item.badge && (
                <span className="min-w-[20px] rounded-lg bg-white/30 px-2 py-0.5 text-center text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {authenticated && (
        <div className="border-t border-white/10 py-1">
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed ? 'justify-center px-0' : 'justify-start px-4'
            )}
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <span className="w-6 text-center text-lg">
              <FaRightFromBracket />
            </span>
            {!collapsed && <span className="min-w-0 flex-1 truncate whitespace-nowrap">Đăng xuất</span>}
          </button>
        </div>
      )}

      <div className="relative flex min-h-[60px] items-center justify-center border-t border-white/10 p-5">
        <Transition
          as={Fragment}
          show={collapsed}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150 ease-in-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <img
            src="/logo_mini.png"
            alt="IUH Logo Mini"
            className="absolute left-1/2 top-1/2 max-h-[50px] max-w-[50px] -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </Transition>
        <Transition
          as={Fragment}
          show={!collapsed}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150 ease-in-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <img
            src="/logo_full.png"
            alt="IUH Logo Full"
            className="absolute left-1/2 top-1/2 max-h-20 max-w-[200px] -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </Transition>
      </div>
    </aside>
  );
};

export default Sidebar;
