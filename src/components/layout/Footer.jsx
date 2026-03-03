import React from 'react';
import { FaFacebook, FaTwitter, FaYoutube, FaLinkedin, FaEnvelope, FaPhone } from 'react-icons/fa6';
import { MdLocationOn } from 'react-icons/md';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* About Section */}
          <div className="footer-section">
            <div className="footer-section-header">
              <img src="/logo_mini.png" alt="IUH Logo" className="footer-icon" />
              <h3 className="footer-title">FLOODSIGHT TP HỒ CHÍ MINH</h3>
            </div>
            <p className="footer-description">
              Hệ thống giám sát và cảnh báo ngập lụt thông minh cho Thành phố Hồ Chí Minh. 
              Cung cấp thông tin thời gian thực về tình trạng ngập lụt và hỗ trợ người dân 
              trong việc ứng phó với thiên tai.
            </p>
            <div className="footer-social">
              <a href="https://www.facebook.com/trieuminh1003" target="_blank" rel="noopener noreferrer" className="social-link">
                <FaFacebook />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <FaTwitter />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <FaYoutube />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <FaLinkedin />
              </a>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="footer-section">
            <h3 className="footer-title">Liên kết nhanh</h3>
            <ul className="footer-links">
              <li>
                <a href="/">Trang chủ</a>
              </li>
              <li>
                <a href="/reports">Báo cáo ngập lụt</a>
              </li>
              <li>
                <a href="/new-report">Báo cáo mới</a>
              </li>
              <li>
                <a href="/moderation">Kiểm duyệt</a>
              </li>
              <li>
                <a href="/profile">Tài khoản</a>
              </li>
            </ul>
          </div>

          {/* Information Section */}
          <div className="footer-section">
            <h3 className="footer-title">Thông tin</h3>
            <ul className="footer-links">
              <li>
                <a href="/about">Về chúng tôi</a>
              </li>
              <li>
                <a href="/privacy">Chính sách bảo mật</a>
              </li>
              <li>
                <a href="/terms">Điều khoản sử dụng</a>
              </li>
              <li>
                <a href="/faq">Câu hỏi thường gặp</a>
              </li>
              <li>
                <a href="/contact">Liên hệ</a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="footer-section">
            <h3 className="footer-title">Liên hệ</h3>
            <ul className="footer-contact">
              <li>
                <MdLocationOn className="contact-icon" />
                <span>Số 12 Nguyễn Văn Bảo, P. Hạnh Thông, Thành phố Hồ Chí Minh</span>
              </li>
              <li>
                <FaPhone className="contact-icon" />
                <span>Hotline: 0283.8940 390</span>
              </li>
              <li>
                <FaEnvelope className="contact-icon" />
                <span>Email: dhcn@iuh.edu.vn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} FLOODSIGHT TP HỒ CHÍ MINH. Tất cả quyền được bảo lưu.</p>
            <p className="footer-partner">
              Được phát triển bởi <strong>Nhóm 007 - Trường Đại học Công nghiệp TP. Hồ Chí Minh (IUH)</strong>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

