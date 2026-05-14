import { useTranslation } from 'react-i18next';
import React, { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FLOODSIGHT_ADMIN_PORTAL_URL } from '@/config/adminPortal';
import { isAdmin, isAuthenticated, isModerator, getCurrentUser } from '../../utils/auth';
import { isGuestBrowseMode, clearGuestExploreMode } from '../../utils/guestSession';
import { API_CONFIG } from '../../config/apiConfig';
import { logout } from '../../services/api';
import { useGuestExplore } from '../../hooks/useGuestExplore';
import { useSidebar } from '@/context/SidebarProvider';
import { cn } from '@/lib/cn';
import {
  FaHouse,
  FaClipboardList,
  FaPlus,
  FaCrown,
  FaUser,
  FaBars,
  FaXmark,
  FaRightFromBracket,
  FaBell,
  FaRoute,
  FaGauge,
  FaMap,
  FaArrowUpRightFromSquare,
} from 'react-icons/fa6';

const scrollbarAside =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50';

const MAIN_NAV_DEF = [
  { path: '/', labelKey: 'nav.home', icon: FaHouse, badge: null, public: true },
  { path: '/map', labelKey: 'nav.mapDetail', icon: FaMap, badge: null, public: true, mobileOnly: true },
  { path: '/routing', labelKey: 'nav.routing', icon: FaRoute, badge: null, public: true },
  { path: '/reports', labelKey: 'nav.reports', icon: FaClipboardList, badge: null, public: true },
  { path: '/report/new', labelKey: 'nav.newReport', icon: FaPlus, badge: null, requireAuth: true },
  { path: '/emergency-alerts', labelKey: 'nav.emergency', icon: FaBell, badge: null, requireAuth: true },
];

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleCollapse, mobileDrawerOpen, closeMobileDrawer } = useSidebar();
  const { openRequireLogin } = useGuestExplore();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  /** Đổi khi có user-updated để ép <img> tải lại avatar (tránh cache trình duyệt). */
  const [avatarNonce, setAvatarNonce] = useState(0);
  /** Khớp breakpoint `md` của Tailwind — chỉ dùng để tách menu mobile vs web. */
  const [isNarrowNav, setIsNarrowNav] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const authenticated = isAuthenticated();
  const guestBrowse = isGuestBrowseMode();
  const moderator = isModerator();
  const admin = isAdmin();
  /** Trên mobile drawer luôn hiển thị nhãn dù desktop đang thu sidebar. */
  const showExpandedSidebar = !collapsed || mobileDrawerOpen;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsNarrowNav(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const handleUserUpdated = () => {
      setCurrentUser(getCurrentUser());
      setAvatarNonce((n) => n + 1);
    };
    window.addEventListener('user-updated', handleUserUpdated);
    return () => window.removeEventListener('user-updated', handleUserUpdated);
  }, []);

  /** Sau bootstrap refresh có thể ghi user vào storage trước khi mount — đồng bộ lại khi đã đăng nhập. */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      if (authenticated) {
        setCurrentUser(getCurrentUser());
      } else if (!guestBrowse) {
        setCurrentUser(null);
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [authenticated, guestBrowse]);

  const sidebarAvatarUrl = currentUser?.avatar
    ? API_CONFIG.BASE_URL.replace(/\/$/, '') +
      (currentUser.avatar.startsWith('/') ? currentUser.avatar : `/profile-icons/${currentUser.avatar}`)
    : null;
  const sidebarAvatarSrc =
    sidebarAvatarUrl != null ? `${sidebarAvatarUrl}${sidebarAvatarUrl.includes('?') ? '&' : '?'}_av=${avatarNonce}` : null;

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

  const staffPortal = authenticated && (admin || moderator);
  const staffPortalLabel = t(admin ? 'nav.staffPortalAdmin' : 'nav.staffPortalMod');

  const itemNeedsAccount = (item) => Boolean(item.requireAuth);

  const visibleNavItems = MAIN_NAV_DEF.filter((item) => {
    if (item.mobileOnly && !isNarrowNav) return false;
    if (guestBrowse) return true;
    if (item.public) return true;
    if (item.requireAuth) return authenticated;
    return false;
  });

  const handleNavClick = (item) => {
    if (guestBrowse && itemNeedsAccount(item)) {
      openRequireLogin({ featureLabel: t(item.labelKey) });
      return;
    }
    closeMobileDrawer();
    navigate(item.path);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-[61px] z-[920] flex h-[calc(100vh-61px)] flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#1976d2] to-[#1565c0] text-white shadow-[2px_0_8px_rgba(0,0,0,0.1)] transition-[width,transform] duration-100 ease-linear will-change-[width]',
        scrollbarAside,
        'max-md:shadow-2xl max-md:duration-300 max-md:ease-out',
        mobileDrawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
        'md:translate-x-0',
        collapsed ? 'w-[70px] max-md:w-[min(280px,88vw)]' : 'w-[220px] max-md:w-[min(280px,88vw)] lg:w-[260px]'
      )}
    >
      <div
        className={cn(
          'flex min-h-[60px] items-center gap-3 border-b border-white/10 px-3 py-4',
          collapsed && !mobileDrawerOpen ? 'justify-center px-2' : 'justify-between'
        )}
      >
        {showExpandedSidebar && guestBrowse ? (
          <div className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1.5">
            <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
              {t('nav.guestMode')}
            </div>
          </div>
        ) : showExpandedSidebar && currentUser ? (
          <div
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/10"
            onClick={() => navigate('/profile')}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/20 text-sm font-bold text-white">
              {sidebarAvatarSrc ? (
                <img src={sidebarAvatarSrc} alt="" className="h-full w-full object-cover" />
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
                    <FaCrown className="mr-1 text-[10px]" /> {t('nav.admin')}
                  </>
                ) : currentUser.role === 'moderator' ? (
                  <>
                    <FaUser className="mr-1 text-[10px]" /> {t('nav.moderator')}
                  </>
                ) : (
                  <>
                    <FaUser className="mr-1 text-[10px]" /> {t('nav.user')}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : showExpandedSidebar ? (
          <div className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
            {t('nav.floodsightTitle')}
          </div>
        ) : null}
        {/* Web (≥md): chỉ nút thu gọn sidebar — không dùng icon X */}
        <button
          type="button"
          className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-none bg-transparent p-0 text-white transition-colors hover:bg-white/10 focus:outline-none md:flex [&_svg]:block [&_svg]:h-[18px] [&_svg]:w-[18px]"
          onClick={toggleCollapse}
          title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          <FaBars aria-hidden />
        </button>
        {/* Điện thoại / màn nhỏ: đóng drawer menu */}
        <button
          type="button"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-none bg-transparent p-0 text-white transition-colors hover:bg-white/10 focus:outline-none md:hidden [&_svg]:block [&_svg]:h-[18px] [&_svg]:w-[18px]"
          onClick={closeMobileDrawer}
          title={t('nav.closeMenu')}
        >
          <FaXmark aria-hidden />
        </button>
      </div>

      <div
        className={cn(
          'flex-1 overflow-y-auto py-5',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50',
          'px-0'
        )}
      >
        <nav className={cn('flex w-full flex-col gap-1', collapsed && !mobileDrawerOpen ? 'items-center' : '')}>
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={cn(
                'relative flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors focus:outline-none',
                collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
                'max-md:justify-start max-md:px-4',
                'hover:bg-white/10 hover:text-white',
                isActive(item.path) &&
                  "bg-white/20 font-semibold text-white before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-t-[6px] before:border-b-[6px] before:border-l-[8px] before:border-t-transparent before:border-b-transparent before:border-l-white before:content-['']"
              )}
              onClick={() => handleNavClick(item)}
            >
              <span className="w-6 text-center text-lg">
                <item.icon />
              </span>
              {!collapsed || mobileDrawerOpen ? (
                <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
              ) : null}
              {item.badge && (
                <span className="min-w-[20px] rounded-lg bg-white/30 px-2 py-0.5 text-center text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {staffPortal && (
        <div className="border-t border-white/10 py-1">
          <a
            href={FLOODSIGHT_ADMIN_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex w-full min-w-0 items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 no-underline transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
              'max-md:justify-start max-md:px-4'
            )}
            title={t('nav.staffPortalTitle', { label: staffPortalLabel })}
            onClick={() => closeMobileDrawer()}
          >
            <span className="w-6 text-center text-lg">
              <FaArrowUpRightFromSquare />
            </span>
            {!collapsed || mobileDrawerOpen ? (
              <span className="min-w-0 flex-1 truncate">{staffPortalLabel}</span>
            ) : null}
          </a>
          <Link
            to="/admin"
            className={cn(
              'flex w-full min-w-0 items-center gap-3 rounded-none border-none bg-transparent py-2.5 text-left text-xs font-medium text-white/75 no-underline transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
              'max-md:justify-start max-md:px-4'
            )}
            title={t('nav.quickSummaryTitle')}
            onClick={() => closeMobileDrawer()}
          >
            <span className="w-6 text-center text-base">
              <FaGauge />
            </span>
            {!collapsed || mobileDrawerOpen ? (
              <span className="min-w-0 flex-1 truncate">{t('nav.quickSummary')}</span>
            ) : null}
          </Link>
        </div>
      )}

      {authenticated && (
        <div className="border-t border-white/10 py-1">
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
              'max-md:justify-start max-md:px-4'
            )}
            onClick={() => {
              closeMobileDrawer();
              handleLogout();
            }}
            title={t('nav.logout')}
          >
            <span className="w-6 text-center text-lg">
              <FaRightFromBracket />
            </span>
            {!collapsed || mobileDrawerOpen ? (
              <span className="min-w-0 flex-1 truncate whitespace-nowrap">{t('nav.logout')}</span>
            ) : null}
          </button>
        </div>
      )}

      {guestBrowse && (
        <div className="border-t border-white/10 py-1">
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
              'max-md:justify-start max-md:px-4'
            )}
            title={t('nav.login')}
            onClick={() => {
              closeMobileDrawer();
              navigate('/login');
            }}
          >
            <span className="w-6 text-center text-lg">
              <FaUser />
            </span>
            {!collapsed || mobileDrawerOpen ? (
              <span className="min-w-0 flex-1 truncate whitespace-nowrap">{t('nav.login')}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={cn(
              'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-none border-none bg-transparent py-3 text-left text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:outline-none',
              collapsed && !mobileDrawerOpen ? 'justify-center px-0' : 'justify-start px-4',
              'max-md:justify-start max-md:px-4'
            )}
            onClick={() => {
              closeMobileDrawer();
              clearGuestExploreMode();
              navigate('/login');
            }}
            title={t('nav.exitGuest')}
          >
            <span className="w-6 text-center text-lg">
              <FaRightFromBracket />
            </span>
            {!collapsed || mobileDrawerOpen ? (
              <span className="min-w-0 flex-1 truncate whitespace-nowrap">{t('nav.exitGuest')}</span>
            ) : null}
          </button>
        </div>
      )}

      <div className="relative flex min-h-[60px] items-center justify-center border-t border-white/10 p-5">
        <Transition
          as={Fragment}
          show={collapsed && !mobileDrawerOpen}
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
          show={!collapsed || mobileDrawerOpen}
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
