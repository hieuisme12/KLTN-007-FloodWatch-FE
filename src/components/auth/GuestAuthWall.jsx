import { useLayoutEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGuestExplore } from '../../hooks/useGuestExplore';

/**
 * Khách truy cập URL cần đăng nhập: chuyển về dashboard và mở popup gợi ý đăng nhập.
 */
export default function GuestAuthWall({ message }) {
  const { t } = useTranslation();
  const { openRequireLogin } = useGuestExplore();
  useLayoutEffect(() => {
    openRequireLogin(message || t('guest.wallDefault'));
  }, [message, openRequireLogin, t]);
  return <Navigate to="/dashboard" replace />;
}
