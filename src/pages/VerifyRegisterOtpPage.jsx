import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
const VerifyRegisterOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const initialEmail = state.email ? String(state.email).trim().toLowerCase() : '';
  const fromLogin = Boolean(state.fromLogin);
  const usernameHint = state.username || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const emailLocked = Boolean(initialEmail) && !fromLogin;

  useEffect(() => {
    if (!initialEmail && !fromLogin) {
      navigate('/register', { replace: true });
    }
  }, [initialEmail, fromLogin, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const em = email.trim().toLowerCase();
    if (!em) {
      setError('Vui lòng nhập email đã đăng ký.');
      return;
    }
    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(em, otp);
      if (result.success && result.data?.registration_completed) {
        navigate('/login', {
          replace: true,
          state: {
            postVerifyMessage:
              result.message ||
              'Đã xác minh email. Bạn có thể đăng nhập.',
            username: usernameHint
          }
        });
        return;
      }
      if (result.success && !result.data?.registration_completed) {
        setError('Xác minh chưa hoàn tất. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
        return;
      }
      setError(result.error || 'Mã OTP không đúng hoặc đã hết hạn.');
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    const em = email.trim().toLowerCase();
    if (!em) {
      setError('Nhập email đã đăng ký trước khi gửi lại mã.');
      return;
    }
    setResendLoading(true);
    try {
      const result = await resendOtp(em);
      if (result.success) {
        setInfo(result.message || 'Đã gửi mã OTP mới qua email.');
      } else {
        setError(result.error || 'Không gửi lại được mã.');
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!initialEmail && !fromLogin) {
    return null;
  }

  return (
    <div className="register-page">
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {info && (
        <div className="verify-otp-info" role="status">
          {info}
        </div>
      )}
      <div className="register-container">
        <form className="register-form verify-otp-form" onSubmit={handleVerify}>
          <h2 className="register-title">Xác minh email</h2>
          <p className="verify-otp-subtitle">
            Nhập mã OTP đã gửi tới email của bạn. Sau khi xác minh, hãy đăng nhập
            bằng tên đăng nhập và mật khẩu.
          </p>

          <div className="form-group">
            <label htmlFor="verify-email">Email</label>
            <input
              type="email"
              id="verify-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              readOnly={emailLocked}
              className={emailLocked ? 'verify-email-readonly' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="otp">Mã OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã trong email"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
            />
          </div>

          <button type="submit" className="btn-register" disabled={loading}>
            {loading ? 'Đang xác minh...' : 'Xác minh'}
          </button>

          <button
            type="button"
            className="btn-verify-resend"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? 'Đang gửi...' : 'Gửi lại mã OTP'}
          </button>

          <div className="register-footer">
            <p>
              <Link to="/login">Đăng nhập</Link>
              {' · '}
              <Link to="/register">Đăng ký lại</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyRegisterOtpPage;
