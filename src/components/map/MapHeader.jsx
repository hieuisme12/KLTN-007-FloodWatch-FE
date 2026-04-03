import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

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
    <header className="fixed left-0 right-0 top-0 z-[1000] h-[61px] w-full bg-[url('/banner.jpg')] bg-cover bg-center bg-no-repeat shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="relative mx-auto flex h-[61px] max-w-full items-center p-0">
        <div
          className="absolute left-0 z-[1001] flex h-[61px] cursor-pointer items-center gap-3 pl-5 transition-opacity hover:opacity-80 max-lg:pl-4"
          onClick={() => navigate('/')}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <img src="/iuh.png" alt="IUH Logo" className="h-full w-full object-contain p-1" />
          </div>
          <span className="hidden text-lg font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] lg:inline">
            FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH
          </span>
        </div>

        <div className="absolute right-5 z-[1001] flex h-[61px] items-center gap-6 max-lg:right-4">
          <div className="flex items-center gap-2 max-lg:gap-1">
            <button
              type="button"
              className={cn(
                'relative flex h-full items-center border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-[#333] transition-colors hover:border-[#1976d2] hover:bg-transparent hover:text-[#1976d2] max-lg:px-3',
                'focus:outline-none active:bg-transparent',
                isActive('/') &&
                  "border-[#1976d2] font-semibold text-[#1976d2] before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-t-[6px] before:border-b-[6px] before:border-l-[8px] before:border-t-transparent before:border-b-transparent before:border-l-[#1976d2] before:content-['']"
              )}
              onClick={() => navigate('/')}
            >
              <span className="whitespace-nowrap max-md:hidden">Trang chủ</span>
            </button>
            <button
              type="button"
              className={cn(
                'relative flex h-full items-center border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-[#333] transition-colors hover:border-[#1976d2] hover:bg-transparent hover:text-[#1976d2] max-lg:px-3',
                'focus:outline-none active:bg-transparent',
                isActive('/reports') &&
                  "border-[#1976d2] font-semibold text-[#1976d2] before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-t-[6px] before:border-b-[6px] before:border-l-[8px] before:border-t-transparent before:border-b-transparent before:border-l-[#1976d2] before:content-['']"
              )}
              onClick={() => navigate('/reports')}
            >
              <span className="whitespace-nowrap max-md:hidden">Báo cáo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MapHeader;
