import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaUser } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { login } from '../services/api';
import { getGoogleOAuthStartUrl } from '../config/authConfig';
import { isAuthenticated } from '../utils/auth';
import { persistAuthTokens } from '../utils/authSession';
import { setGuestExploreMode, clearGuestExploreMode } from '../utils/guestSession';
import ErrorToast from '../components/common/ErrorToast';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';
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

  /** BE redirect sau Google: /login?auth=google&access_token=...&refresh_token=...&session_token=... */
  useEffect(() => {
    const q = new URLSearchParams(location.search || '');
    let access = q.get('access_token') || q.get('token');
    let params = q;
    if (!access && typeof window !== 'undefined') {
      const hash = window.location.hash?.replace(/^#\??/, '') || '';
      if (hash.includes('access_token') || hash.includes('token=')) {
        params = new URLSearchParams(hash);
        access = params.get('access_token') || params.get('token');
      }
    }
    if (!access) return;

    const data = { access_token: access };
    const rt = params.get('refresh_token');
    const sess = params.get('session_token');
    if (rt) data.refresh_token = rt;
    if (sess) data.session_token = sess;
    const exp = params.get('expires_in') ?? params.get('expiresIn');
    if (exp != null && String(exp).length > 0) data.expires_in = exp;
    const userRaw = params.get('user');
    if (userRaw) {
      try {
        data.user = JSON.parse(decodeURIComponent(userRaw));
      } catch {
        try {
          data.user = JSON.parse(userRaw);
        } catch {
          /* bỏ qua */
        }
      }
    }
    const remember = params.get('remember') !== '0' && params.get('remember') !== 'false';
    persistAuthTokens(data, remember);
    clearGuestExploreMode();
    window.dispatchEvent(new Event('user-updated'));
    navigate('/dashboard', { replace: true });
  }, [location.search, location.hash, navigate]);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

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
      const result = await login(username, password, rememberMe);

      if (result.success) {
        clearGuestExploreMode();
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

  return (
    <div className="login-page">
      {loading && <AuthLoadingScreen overlay />}
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
            <Link to="#" className="forgot-password">
              Quên mật khẩu
            </Link>
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
            className="btn-google-login"
            onClick={() => {
              window.location.href = getGoogleOAuthStartUrl();
            }}
          >
            <FcGoogle aria-hidden className="btn-google-login-icon" />
            Đăng nhập Google
          </button>

          <button
            type="button"
            className="btn-guest"
            onClick={() => {
              setGuestExploreMode();
              navigate('/dashboard', { state: { guestWelcome: true } });
            }}
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
