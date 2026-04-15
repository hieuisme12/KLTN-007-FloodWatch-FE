import { useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa6';
import { cn } from '@/lib/cn';

const GuestLoginPrompt = ({ message, onClose }) => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-[9999] flex animate-guest-overlay items-center justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-guest-modal mx-auto w-[90%] max-w-[450px] rounded-2xl bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.3)] max-md:p-8 max-md:px-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-prompt-title"
      >
        <div className="animate-guest-bounce mb-5 text-[4rem]">
          <FaLock />
        </div>
        <h2 id="guest-prompt-title" className="mb-4 mt-0 text-3xl font-bold text-[#333] max-md:text-2xl">
          Yêu cầu đăng nhập
        </h2>
        <p className="mb-8 mt-0 text-lg leading-relaxed text-[#666] max-md:text-base">
          {message || 'Vui lòng đăng nhập để sử dụng tính năng này'}
        </p>
        <div className="mb-5 flex flex-wrap justify-center gap-3 max-md:flex-col">
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-lg border-2 border-[#e0e0e0] bg-[#f5f5f5] px-8 py-3 text-base font-semibold text-[#666] transition-all duration-300',
              'hover:bg-[#e0e0e0] focus:outline-none max-md:w-full'
            )}
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            type="button"
            className={cn(
              'cursor-pointer rounded-lg border-none bg-gradient-to-br from-[#1E3A8A] to-[#FFA500] px-8 py-3 text-base font-semibold text-white transition-all duration-300',
              'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(102,126,234,0.4)] focus:outline-none max-md:w-full'
            )}
            onClick={() => navigate('/login')}
          >
            Đăng nhập ngay
          </button>
        </div>
        <p className="m-0 text-sm text-[#666]">
          Chưa có tài khoản?{' '}
          <a
            href="/register"
            className="font-semibold text-[#1E3A8A] no-underline hover:underline"
            onClick={(e) => {
              e.preventDefault();
              navigate('/register');
            }}
          >
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
};

export default GuestLoginPrompt;
