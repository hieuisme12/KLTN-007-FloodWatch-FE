import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        // Redirect to dashboard after successful login
        navigate('/dashboard');
      } else {
        setError(result.error || 'Đăng nhập thất bại');
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-container">
            <img src="/iuh.png" alt="IUH Logo" className="iuh-logo" />
            <h1>FloodWatch</h1>
          </div>
          <p>Hệ thống giám sát ngập lụt thông minh</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Đăng nhập</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="divider">
            <span>HOẶC</span>
          </div>

          <button 
            type="button"
            className="btn-guest"
            onClick={() => navigate('/dashboard')}
          >
            👤 Vào với tư cách khách
          </button>

          <p className="guest-note">
            💡 Khách có thể xem thông tin nhưng không thể báo cáo ngập lụt
          </p>

          <div className="login-footer">
            <p>Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
