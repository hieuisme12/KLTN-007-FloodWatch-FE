import { Link } from 'react-router-dom';
import { isGuestBrowseMode } from '../../utils/guestSession';
import { useGuestExplore } from '../../hooks/useGuestExplore';
import { cn } from '@/lib/cn';

/**
 * Link: nếu đang chế độ khách và `requiresAuth` thì mở popup đăng nhập thay vì điều hướng.
 * Dùng `<button>` nhưng reset style vì `style.css` global (`button { background: #fff; color: ... }`) làm mất chữ trên nền footer.
 */
export default function GuestAwareLink({ to, requiresAuth, children, className, ...rest }) {
  const { openRequireLogin } = useGuestExplore();
  const guest = isGuestBrowseMode();

  if (requiresAuth && guest) {
    return (
      <button
        type="button"
        className={cn(
          'inline-block !border-0 !bg-transparent !p-0 text-left font-normal shadow-none outline-none',
          'hover:!border-transparent hover:!bg-transparent',
          'focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0',
          className
        )}
        onClick={() =>
          openRequireLogin('Bạn cần đăng nhập để mở liên kết này. Đăng nhập để tiếp tục.')
        }
      >
        {children}
      </button>
    );
  }

  return (
    <Link to={to} className={className} {...rest}>
      {children}
    </Link>
  );
}
