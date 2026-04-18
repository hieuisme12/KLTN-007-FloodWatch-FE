import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa6';
import { login } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
import { isAuthenticated } from '../utils/auth';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [verifyHint, setVerifyHint] = useState('');
  const [needsEmailVerifyCta, setNeedsEmailVerifyCta] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const st = location.state;
    if (st?.postVerifyMessage) {
      setVerifyHint(st.postVerifyMessage);
      if (st.username) setUsername(st.username);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setNeedsEmailVerifyCta(false);

    try {
      const result = await login(username, password);

      if (result.success) {
        window.dispatchEvent(new CustomEvent('user-updated'));
        navigate('/dashboard');
      } else {
        setNeedsEmailVerifyCta(Boolean(result.needsEmailVerification));
        setError(result.error || 'Đăng nhập thất bại');
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="login-page">
      {verifyHint && (
        <div className="login-success-hint" role="status">
          {verifyHint}
          <button
            type="button"
            className="login-success-hint-close"
            onClick={() => setVerifyHint('')}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <ErrorToast message={error} onClose={() => setError('')} />
      )}
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">Đăng nhập</h2>

          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=""
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
              placeholder=""
              required
            />
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link to="#" className="forgot-password">Quên mật khẩu</Link>
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          {needsEmailVerifyCta && (
            <p className="login-verify-cta">
              <Link
                to="/register/verify"
                state={{ fromLogin: true, username }}
              >
                Xác minh email / nhập mã OTP
              </Link>
            </p>
          )}

          <div className="divider">
            <span>HOẶC</span>
          </div>

          <button 
            type="button"
            className="btn-guest"
            onClick={() => navigate('/dashboard')}
          >
            <FaUser /> Vào với tư cách khách
          </button>

          <p className="guest-note">Khách có thể xem thông tin nhưng không thể báo cáo ngập lụt</p>

          <div className="login-footer">
            <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
