import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { SidebarProvider } from '@/context/SidebarProvider';
import { useSidebar } from '@/context/SidebarProvider';
import { useSyncAuthLocation } from '@/hooks/useSyncAuthLocation';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

function MainContent({ children }) {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const isMapPage = location.pathname.startsWith('/map');
  return (
    <main
      className={cn(
        'min-h-0 flex-1 overflow-x-hidden bg-[#f5f5f5] transition-[margin-left] duration-100 ease-linear will-change-[margin-left]',
        isMapPage && 'flex min-h-0 flex-col',
        collapsed
          ? 'ml-0 md:ml-[70px]'
          : 'ml-0 md:ml-[220px] lg:ml-[260px]'
      )}
    >
      {children}
    </main>
  );
}

function LayoutShell({ children }) {
  useSyncAuthLocation();
  const location = useLocation();
  const { setCollapsed, mobileDrawerOpen, closeMobileDrawer } = useSidebar();
  const isRoutingPage = location.pathname.startsWith('/routing');
  const isMapPage = location.pathname.startsWith('/map');

  useEffect(() => {
    if (isRoutingPage) {
      setCollapsed(true);
    }
  }, [isRoutingPage, setCollapsed]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f5f5f5] pt-[61px]">
      {mobileDrawerOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-x-0 bottom-0 top-[61px] z-[910] cursor-default border-none bg-black/45 p-0 md:hidden"
          onClick={closeMobileDrawer}
        />
      )}
      <Header />
      <Sidebar />
      <MainContent>{children}</MainContent>
      {!isRoutingPage && !isMapPage && <Footer />}
    </div>
  );
}

const Layout = ({ children }) => (
  <SidebarProvider>
    <LayoutShell>{children}</LayoutShell>
  </SidebarProvider>
);

export default Layout;
