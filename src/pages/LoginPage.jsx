import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { login } from '../services/api';
import { getGoogleOAuthStartUrl } from '../config/authConfig';
import { isAuthenticated } from '../utils/auth';
import { persistAuthTokens } from '../utils/authSession';
import { setGuestExploreMode, clearGuestExploreMode } from '../utils/guestSession';
import ErrorToast from '../components/common/ErrorToast';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';
import AuthSplitShell from '../components/auth/AuthSplitShell';

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
    <div className="auth-page">
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

      <AuthSplitShell>
        <form className="login-split-form" onSubmit={handleSubmit}>
          <div className="login-split-title-row">
            <img src="/iuh.png" alt="" className="login-split-brand-logo" width={56} height={56} />
            <h2 className="login-split-title">Đăng nhập</h2>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="username">
              Tên đăng nhập / Email
            </label>
            <div className="login-input-shell login-input-shell--user">
              <FaUser className="login-input-icon" aria-hidden />
              <input
                type="text"
                id="username"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tài khoản"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="password">
              Mật khẩu
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaLock className="login-input-icon" aria-hidden />
              <input
                type="password"
                id="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button
            type="submit"
            className="login-btn-primary"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <div className="login-forgot-wrap">
            <Link to="/forgot-password" className="login-forgot-link">
              Quên mật khẩu?
            </Link>
          </div>

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

          <div className="login-divider">
            <span>HOẶC</span>
          </div>

          <div className="login-alt-actions">
            <button
              type="button"
              className="login-btn-google"
              onClick={() => {
                window.location.href = getGoogleOAuthStartUrl();
              }}
            >
              <FcGoogle aria-hidden className="login-btn-google-icon" />
              Đăng nhập Google
            </button>

            <button
              type="button"
              className="login-btn-guest"
              onClick={() => {
                setGuestExploreMode();
                navigate('/dashboard', { state: { guestWelcome: true } });
              }}
            >
              <FaUser aria-hidden /> Vào với tư cách khách
            </button>
          </div>

          <p className="login-guest-note">
            Khách có thể xem thông tin nhưng không thể báo cáo ngập lụt
          </p>

          <div className="login-footer-split">
            <p>
              Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
            </p>
          </div>
        </form>
      </AuthSplitShell>
    </div>
  );
};

export default LoginPage;
