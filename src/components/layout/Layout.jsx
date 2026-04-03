import React from 'react';
import { cn } from '@/lib/cn';
import { SidebarProvider } from '@/context/SidebarProvider';
import { useSidebar } from '@/context/SidebarProvider';
import { useSyncAuthLocation } from '@/hooks/useSyncAuthLocation';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

function MainContent({ children }) {
  const { collapsed } = useSidebar();
  return (
    <main
      className={cn(
        'min-h-[calc(100vh-61px)] overflow-x-hidden bg-[#f5f5f5] transition-[margin-left] duration-100 ease-linear will-change-[margin-left]',
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
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f5f5f5] pt-[61px]">
      <Header />
      <Sidebar />
      <MainContent>{children}</MainContent>
      <Footer />
    </div>
  );
}

const Layout = ({ children }) => (
  <SidebarProvider>
    <LayoutShell>{children}</LayoutShell>
  </SidebarProvider>
);

export default Layout;
