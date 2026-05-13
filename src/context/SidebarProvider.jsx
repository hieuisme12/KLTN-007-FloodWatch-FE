import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MAP_LAYOUT_EVENT } from '../hooks/useMapboxGlResize';

const SidebarContext = createContext(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return ctx;
}

export function SidebarProvider({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  /** Drawer điều hướng trên màn hình < md (sidebar ẩn, mở bằng nút menu header). */
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const toggleMobileDrawer = useCallback(() => setMobileDrawerOpen((o) => !o), []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.classList.remove('sidebar-collapsed');
  }, []);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setMobileDrawerOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  /** Báo cho bản đồ Mapbox gọi resize sau khi margin sidebar (transition ~100ms) ổn định */
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(MAP_LAYOUT_EVENT));
    }, 130);
    return () => window.clearTimeout(t);
  }, [collapsed, mobileDrawerOpen]);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapse,
      mobileDrawerOpen,
      openMobileDrawer,
      closeMobileDrawer,
      toggleMobileDrawer,
    }),
    [collapsed, toggleCollapse, mobileDrawerOpen, openMobileDrawer, closeMobileDrawer, toggleMobileDrawer]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
