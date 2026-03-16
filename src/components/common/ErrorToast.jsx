import { FaXmark } from 'react-icons/fa6';

/**
 * Toast lỗi cố định góc phải trên - đồng bộ với giao diện Admin.
 * Hiển thị khi có message, có nút đóng để xóa.
 */
const ErrorToast = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed right-4 z-[1100] flex max-w-sm items-start gap-2 rounded-lg border border-red-300 bg-red-500 px-4 py-3 shadow-lg" style={{ top: '70px' }}>
      <p className="flex-1 text-sm font-medium text-black">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded p-0.5 text-black/80 hover:bg-red-600 hover:text-black"
        aria-label="Đóng"
      >
        <FaXmark className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ErrorToast;
