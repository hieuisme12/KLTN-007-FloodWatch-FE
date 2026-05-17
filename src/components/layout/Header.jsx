import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAuthenticated } from '../../utils/auth';
import { isGuestBrowseMode } from '../../utils/guestSession';
import { FaLock, FaPenToSquare, FaBars } from 'react-icons/fa6';
import { getOnlineUsersCount, getMonthlyVisitsCount } from '../../services/api';
import { Button, PrimaryButton } from '../common/Button';
import { useSidebar } from '@/context/SidebarProvider';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openMobileDrawer } = useSidebar();
  const authenticated = isAuthenticated();
  const guestBrowse = isGuestBrowseMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalVisits, setTotalVisits] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (guestBrowse) {
      return undefined;
    }
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
  }, [guestBrowse]);

  const formatDate = (date) => {
    const loc = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';
    return new Intl.DateTimeFormat(loc, {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
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
        <div className="absolute left-0 z-[1001] flex h-[61px] cursor-pointer items-center gap-2 pl-2 transition-opacity hover:opacity-80 sm:gap-3 sm:pl-4 md:pl-5 lg:pl-5">
          <button
            type="button"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/20 md:hidden"
            onClick={(e) => {
              e.stopPropagation();
              openMobileDrawer();
            }}
            aria-label={t('header.openMenu')}
          >
            <FaBars className="h-5 w-5" />
          </button>
          <div
            className="flex items-center gap-2 sm:gap-3"
            onClick={() => navigate('/')}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] sm:h-10 sm:w-10">
              <img src="/iuh.png" alt="IUH Logo" className="h-full w-full object-contain p-1" />
            </div>
            <span className="hidden text-base font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] lg:inline xl:text-lg">
              {t('app.brand')}
            </span>
          </div>
        </div>

        <div className="absolute right-2 z-[1001] flex h-[61px] max-w-[calc(100%-8rem)] items-center gap-2 sm:right-4 sm:max-w-none sm:gap-3 md:right-5 md:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4 md:gap-6">
            <div className="hidden flex-col gap-0.5 md:flex">
              <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px]">
                {formatDate(currentTime)}
              </div>
              <div className="font-[Arial] text-lg font-bold leading-tight text-[#d32f2f] max-lg:text-base">
                {formatTime(currentTime)}
              </div>
            </div>

            {!guestBrowse && (
              <div className="hidden items-center gap-4 lg:flex xl:gap-6">
                <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px]">
                    {t('header.visits')}
                  </div>
                  <div className="font-[Arial] text-lg font-bold leading-tight text-[#1976d2] max-lg:text-base">
                    {formatNumber(totalVisits)}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="text-xs font-normal leading-tight text-[#666] max-lg:text-[11px]">
                    {t('header.monthlyVisits')}
                  </div>
                  <div className="font-[Arial] text-lg font-bold leading-tight text-[#1976d2] max-lg:text-base">
                    {formatNumber(monthlyVisits)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <LanguageSwitcher className="inline-flex" />

          {!authenticated && (
            <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
              <Button
                type="button"
                color="secondary-destructive"
                size="sm"
                className="gap-1 whitespace-nowrap sm:gap-2 sm:px-4"
                onClick={() => navigate('/login')}
              >
                <FaLock /> <span className="max-[380px]:hidden sm:inline">{t('header.login')}</span>
              </Button>
              <PrimaryButton
                type="button"
                size="sm"
                className="gap-1 whitespace-nowrap sm:gap-2 sm:px-4"
                onClick={() => navigate('/register')}
              >
                <FaPenToSquare /> <span className="max-[380px]:hidden sm:inline">{t('header.register')}</span>
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
