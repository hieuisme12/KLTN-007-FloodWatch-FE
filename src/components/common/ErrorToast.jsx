import { FaXmark } from 'react-icons/fa6';

/**
 * Toast góc phải trên — lỗi (đỏ) hoặc thành công (xanh lá). Chữ và nút đóng màu trắng.
 * @param {{ message: string, onClose: () => void, variant?: 'error' | 'success' }} props
 */
const ErrorToast = ({ message, onClose, variant = 'error' }) => {
  if (!message) return null;

  const isSuccess = variant === 'success';
  const boxClass = isSuccess
    ? 'border-emerald-400/80 bg-emerald-600'
    : 'border-red-300/80 bg-red-600';

  return (
    <div
      className={`fixed right-4 z-[1100] flex max-w-sm items-start gap-2 rounded-lg border px-4 py-3 shadow-lg ${boxClass}`}
      style={{ top: '70px' }}
      role="status"
      aria-live="polite"
    >
      <p className="flex-1 text-sm font-medium text-white">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="toast-close-btn flex shrink-0 cursor-pointer items-center justify-center rounded !border-0 !bg-transparent !p-1.5 !text-white transition-colors hover:!border-0 hover:!bg-white/20 focus-visible:!outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="Đóng"
      >
        <FaXmark className="h-4 w-4 !text-white" aria-hidden />
      </button>
    </div>
  );
};

export default ErrorToast;
