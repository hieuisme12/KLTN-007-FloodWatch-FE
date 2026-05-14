import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import {
  FaBars,
  FaBell,
  FaChevronLeft,
  FaChevronRight,
  FaGauge,
  FaRightFromBracket,
  FaUser,
  FaXmark,
  FaScrewdriverWrench
} from 'react-icons/fa6';
import { getCurrentUser, isAdmin, isModerator } from '@/utils/auth';
import { logout } from '@/services/api';
import { FLOODSIGHT_ADMIN_PORTAL_URL } from '@/config/adminPortal';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

import type { IconType } from 'react-icons';

type AdminNavItem =
  | { kind: 'link'; to: string; labelKey: string; icon: IconType; end?: boolean }
  | { kind: 'external'; href: string; labelKey: string; icon: IconType };

const ADMIN_NAV: AdminNavItem[] = [
  { kind: 'link', to: '/admin', labelKey: 'adminLayout.navOverview', icon: FaGauge, end: true },
  {
    kind: 'external',
    href: FLOODSIGHT_ADMIN_PORTAL_URL,
    labelKey: 'adminLayout.navOpsWeb',
    icon: FaScrewdriverWrench
  }
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const fn = () => setUser(getCurrentUser());
    window.addEventListener('user-updated', fn);
    return () => window.removeEventListener('user-updated', fn);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMobileOpen(false));
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname]);

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to || location.pathname === `${to}/`;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const crumbs = [{ labelKey: 'adminLayout.crumbAdmin', to: '/admin' }];

  const staffLabel = isAdmin()
    ? t('adminLayout.roleAdmin')
    : isModerator()
      ? t('adminLayout.roleModerator')
      : '';

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          aria-label={t('adminLayout.closeMenu')}
          className="fixed inset-0 z-[930] bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-[940] flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-[width,transform] duration-200',
          'w-[min(88vw,280px)]',
          collapsed ? 'md:w-[72px]' : 'md:w-[260px]',
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          'md:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-white/10 px-3">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm font-bold tracking-tight',
              collapsed && 'md:sr-only'
            )}
          >
            {t('adminLayout.brand')}
          </span>
          <button
            type="button"
            title={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <FaXmark />
          </button>
          <button
            type="button"
            title={collapsed ? t('adminLayout.expandSidebar') : t('adminLayout.collapseSidebar')}
            className="ml-auto hidden h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 md:flex"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {ADMIN_NAV.map((item) => {
            const label = t(item.labelKey);
            if (item.kind === 'external') {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 no-underline transition-colors hover:bg-white/10 hover:text-white',
                    collapsed && 'md:justify-center md:px-0'
                  )}
                  title={collapsed ? label : t('adminLayout.externalPortalFullTitle')}
                >
                  <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                  <span className={cn(collapsed && 'md:sr-only')}>{label}</span>
                </a>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors',
                  isActive(item.to, item.end) ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  collapsed && 'md:justify-center md:px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0 opacity-90" />
                <span className={cn(collapsed && 'md:sr-only')}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-[padding] duration-200',
          'max-md:pl-0',
          collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'
        )}
      >
        <header className="sticky top-0 z-[920] flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t('header.openMenu')}
            >
              <FaBars />
            </button>
            <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-slate-600 sm:flex">
            <span className="hidden lg:inline">{t('adminLayout.breadcrumb')}</span>
            <ol className="flex min-w-0 flex-wrap items-center gap-1">
              {crumbs.map((c, i) => (
                <li key={c.to} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-400">/</span>}
                  <Link to={c.to} className="truncate font-medium text-slate-900 hover:underline">
                    {t(c.labelKey)}
                  </Link>
                </li>
              ))}
            </ol>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="onLight" />
            <button
              type="button"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 sm:flex"
              title={t('adminLayout.notifications')}
            >
              <FaBell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                  <FaUser className="h-4 w-4" />
                </span>
                <span className="hidden max-w-[140px] truncate text-left text-xs font-medium text-slate-800 lg:inline">
                  {user?.full_name || user?.username || t('adminLayout.accountFallback')}
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 text-sm shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="truncate font-semibold text-slate-900">{user?.full_name || user?.username}</div>
                  <div className="text-xs text-slate-500">{staffLabel}</div>
                </div>
                <Link to="/dashboard" className="block px-3 py-2 text-slate-700 hover:bg-slate-50">
                  {t('adminLayout.backToApp')}
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                >
                  <FaRightFromBracket /> {t('adminLayout.logout')}
                </button>
              </div>
            </details>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-slate-50/80 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
