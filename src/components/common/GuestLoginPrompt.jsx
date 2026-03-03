import { useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa6';
import '../styles/components/GuestLoginPrompt.css';

const GuestLoginPrompt = ({ message, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="guest-prompt-overlay" onClick={onClose}>
      <div className="guest-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guest-prompt-icon"><FaLock /></div>
        <h2 className="guest-prompt-title">Yêu cầu đăng nhập</h2>
        <p className="guest-prompt-message">
          {message || 'Vui lòng đăng nhập để sử dụng tính năng này'}
        </p>
        <div className="guest-prompt-actions">
          <button 
            className="guest-prompt-btn guest-prompt-btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          <button 
            className="guest-prompt-btn guest-prompt-btn-primary"
            onClick={() => navigate('/login')}
          >
            Đăng nhập ngay
          </button>
        </div>
        <p className="guest-prompt-footer">
          Chưa có tài khoản? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Đăng ký ngay</a>
        </p>
      </div>
    </div>
  );
};

export default GuestLoginPrompt;
