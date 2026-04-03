import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { FaLock, FaPenToSquare } from 'react-icons/fa6';
import { getOnlineUsersCount, getMonthlyVisitsCount } from '../../services/api';
import { cn } from '@/lib/cn';

const Header = () => {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const [onlineRes, monthlyRes] = await Promise.all([
        getOnlineUsersCount(),
        getMonthlyVisitsCount(),
      ]);
      setTotalVisits(onlineRes.success ? onlineRes.count : 0);
      setMonthlyVisits(monthlyRes.success ? monthlyRes.count : 0);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName}, ngày ${day} tháng ${month}, năm ${year}`;
  };

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[1000] h-[61px] w-full bg-[url('/banner.jpg')] bg-cover bg-center bg-no-repeat shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
    >
      <div className="relative mx-auto flex h-[61px] max-w-full items-center p-0">
        <div
          className="absolute left-0 z-[1001] flex h-[61px] cursor-pointer items-center gap-3 pl-5 transition-opacity hover:opacity-80 lg:pl-5 max-lg:pl-4"
          onClick={() => navigate('/')}
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <img src="/iuh.png" alt="IUH Logo" className="h-full w-full object-contain p-1" />
          </div>
          <span className="hidden text-lg font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] lg:inline">
            FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH
          </span>
        </div>

        <div className="absolute right-5 z-[1001] flex h-[61px] items-center gap-6 max-lg:right-4 max-lg:gap-4 max-md:gap-2">
          <div className="flex items-center gap-8 max-lg:gap-5 max-md:gap-3">
            <div className="hidden flex-col gap-0.5 md:flex">
              <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px]">
                {formatDate(currentTime)}
              </div>
              <div className="font-[Arial] text-lg font-bold leading-tight text-[#d32f2f] max-lg:text-base">
                {formatTime(currentTime)}
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px] max-md:text-[10px]">
                Lượt truy cập
              </div>
              <div className="font-[Arial] text-lg font-bold leading-tight text-[#1976d2] max-lg:text-base max-md:text-sm">
                {formatNumber(totalVisits)}
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px] max-md:text-[10px]">
                Lượt truy cập tháng
              </div>
              <div className="font-[Arial] text-lg font-bold leading-tight text-[#1976d2] max-lg:text-base max-md:text-sm">
                {formatNumber(monthlyVisits)}
              </div>
            </div>
          </div>

          {!authenticated && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#1976d2] bg-white px-4 py-2 text-sm font-medium text-[#1976d2] shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all',
                  'hover:-translate-y-px hover:bg-[#1976d2] hover:text-white hover:shadow-[0_2px_6px_rgba(25,118,210,0.4)]',
                  'focus:outline-none'
                )}
                onClick={() => navigate('/login')}
              >
                <FaLock /> Đăng nhập
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#1976d2] bg-[#1976d2] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-all',
                  'hover:-translate-y-px hover:border-[#1565c0] hover:bg-[#1565c0] hover:shadow-[0_2px_6px_rgba(25,118,210,0.4)]',
                  'focus:outline-none'
                )}
                onClick={() => navigate('/register')}
              >
                <FaPenToSquare /> Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
