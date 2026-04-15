import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaYoutube, FaLinkedin, FaEnvelope, FaPhone } from 'react-icons/fa6';
import { MdLocationOn } from 'react-icons/md';
import { useSidebar } from '@/context/SidebarProvider';
import { cn } from '@/lib/cn';

const Footer = () => {
  const { collapsed } = useSidebar();

  return (
    <footer
      className={cn(
        'relative z-[1] mt-auto bg-gradient-to-b from-[#1565c0] to-[#0d47a1] p-0 text-white transition-[margin-left,width] duration-100 ease-linear',
        collapsed
          ? 'ml-0 w-full md:ml-[70px] md:w-[calc(100%-70px)]'
          : 'ml-0 w-full md:ml-[220px] md:w-[calc(100%-220px)] lg:ml-[260px] lg:w-[calc(100%-260px)]'
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 pb-5 pt-10 max-md:px-[15px] max-md:pb-[15px] max-md:pt-[30px]">
        <div className="mb-[30px] grid grid-cols-1 gap-10 max-md:gap-[30px] md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <div className="flex flex-col gap-4">
            <div className="mb-2 flex items-center gap-3">
              <img src="/logo_mini.png" alt="IUH Logo" className="h-6 w-6 flex-shrink-0 object-contain" />
              <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">
                FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH
              </h3>
            </div>
            <p className="m-0 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
              Hệ thống giám sát và cảnh báo ngập lụt thông minh cho Thành phố Hồ Chí Minh. Cung cấp thông tin thời
              gian thực về tình trạng ngập lụt và hỗ trợ người dân trong việc ứng phó với thiên tai.
            </p>
            <div className="mt-2 flex gap-3">
              <a
                href="https://www.facebook.com/trieuminh1003"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaFacebook />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaTwitter />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaYoutube />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaLinkedin />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">Liên kết nhanh</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li className="m-0">
                <Link
                  to="/"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Trang chủ
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/reports"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Báo cáo ngập lụt
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/report/new"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Báo cáo mới
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/profile"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Tài khoản
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">Thông tin</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li className="m-0">
                <Link
                  to="/about"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Về chúng tôi
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/privacy"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/terms"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Điều khoản sử dụng
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/faq"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/contact"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">Liên hệ</h3>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <MdLocationOn className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">Số 12 Nguyễn Văn Bảo, P. Hạnh Thông, Thành phố Hồ Chí Minh</span>
              </li>
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <FaPhone className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">Hotline: 0283.8940 390</span>
              </li>
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <FaEnvelope className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">Email: dhcn@iuh.edu.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 border-t border-white/20 pt-5">
          <div className="text-center text-[13px] leading-relaxed text-white/80">
            <p className="my-1">
              &copy; {new Date().getFullYear()} FLOODSIGHT THÀNH PHỐ HỒ CHÍ MINH. Tất cả quyền được bảo lưu.
            </p>
            <p className="mt-2 text-xs text-white/70">
              Được phát triển bởi{' '}
              <strong className="font-semibold text-white/90">Nhóm 007 - Trường Đại học Công nghiệp TP. Hồ Chí Minh (IUH)</strong>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
