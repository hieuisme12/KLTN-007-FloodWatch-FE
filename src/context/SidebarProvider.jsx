import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

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

  /** Báo cho bản đồ Mapbox gọi resize sau khi margin sidebar (transition ~100ms) ổn định */
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(MAP_LAYOUT_EVENT));
    }, 130);
    return () => window.clearTimeout(t);
  }, [collapsed]);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapse }),
    [collapsed, toggleCollapse]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
