import { useLayoutEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useGuestExplore } from '../../hooks/useGuestExplore';

/**
 * Khách truy cập URL cần đăng nhập: chuyển về dashboard và mở popup gợi ý đăng nhập.
 */
export default function GuestAuthWall({ message }) {
  const { openRequireLogin } = useGuestExplore();
  useLayoutEffect(() => {
    openRequireLogin(
      message ||
        'Tính năng này chỉ dùng được sau khi đăng nhập. Bạn có thể đăng nhập hoặc đóng hộp thoại để tiếp tục xem với tư cách khách.'
    );
  }, [message, openRequireLogin]);
  return <Navigate to="/dashboard" replace />;
}
