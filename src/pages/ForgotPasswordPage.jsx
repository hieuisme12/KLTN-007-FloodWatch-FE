import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaKey, FaLock } from 'react-icons/fa6';
import { forgotPassword, resetPassword, login } from '../services/api';
import { isAuthenticated } from '../utils/auth';
import { clearGuestExploreMode } from '../utils/guestSession';
import ErrorToast from '../components/common/ErrorToast';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';
import AuthSplitShell from '../components/auth/AuthSplitShell';

/**
 * Quên mật khẩu: POST /api/auth/forgot-password → OTP mail → POST /api/auth/reset-password → đăng nhập.
 */
const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const em = email.trim().toLowerCase();
    if (!em) {
      setError(t('auth.forgot.errEmail'));
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(em);
      if (result.success) {
        setInfo(
          result.message ||
            t('auth.forgot.infoOtpSent')
        );
        setPhase('reset');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || t('auth.forgot.errSendFail'));
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    const em = email.trim().toLowerCase();
    if (!em) return;
    setResendLoading(true);
    try {
      const result = await forgotPassword(em);
      if (result.success) {
        setOtp('');
        setInfo(result.message || t('auth.forgot.infoResent'));
      } else {
        setError(result.error || t('auth.forgot.errResendFail'));
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const em = email.trim().toLowerCase();
    const otpNorm = otp.replace(/\s+/g, '').trim();
    if (!em || !otpNorm) {
      setError(t('auth.forgot.errOtpEmail'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auth.forgot.errNewMin6'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword({
        email: em,
        otp_code: otpNorm,
        new_password: newPassword
      });
      if (!result.success) {
        setError(result.error || t('auth.forgot.errResetFail'));
        return;
      }

      setInfo('');
      const data = result.data || {};
      const loginId =
        data.user?.username ??
        data.username ??
        (typeof data.login === 'string' ? data.login : null) ??
        em;

      const loginResult = await login(loginId, newPassword, false);
      if (loginResult.success) {
        clearGuestExploreMode();
        window.dispatchEvent(new Event('user-updated'));
        navigate('/dashboard', { replace: true });
      } else {
        setError(
          loginResult.error ||
            t('auth.forgot.errLoginAfterReset')
        );
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {loading && <AuthLoadingScreen overlay />}
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {info && !error && (
        <div className="verify-otp-info" role="status">
          {info}
        </div>
      )}

      <AuthSplitShell panelInnerClassName="login-panel-inner--scroll">
        {phase === 'email' ? (
          <form className="login-split-form" onSubmit={handleSendOtp}>
            <div className="login-split-title-row">
              <img src="/iuh.png" alt="" className="login-split-brand-logo" width={56} height={56} />
              <h2 className="login-split-title">{t('auth.forgot.titleEmail')}</h2>
            </div>
            <p className="verify-otp-subtitle verify-otp-subtitle--light forgot-password-lead">
              {t('auth.forgot.lead')}
            </p>

            <div className="login-field">
              <label className="login-field-label" htmlFor="fp-email">
                {t('auth.forgot.email')}
              </label>
              <div className="login-input-shell login-input-shell--user">
                <FaEnvelope className="login-input-icon" aria-hidden />
                <input
                  type="email"
                  id="fp-email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.forgot.emailPlaceholder')}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="login-btn-primary login-btn-primary--spaced" disabled={loading}>
              {loading ? t('auth.forgot.sending') : t('auth.forgot.sendOtp')}
            </button>

            <div className="login-footer-split">
              <p>
                <Link to="/login">{t('auth.forgot.backLogin')}</Link>
              </p>
            </div>
          </form>
        ) : (
          <form className="login-split-form" onSubmit={handleReset}>
            <div className="login-split-title-row">
              <img src="/iuh.png" alt="" className="login-split-brand-logo" width={56} height={56} />
              <h2 className="login-split-title">{t('auth.forgot.titleReset')}</h2>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="fp-email-ro">
                {t('auth.forgot.email')}
              </label>
              <div className="login-input-shell login-input-shell--user">
                <FaEnvelope className="login-input-icon" aria-hidden />
                <input
                  type="email"
                  id="fp-email-ro"
                  className="login-input verify-email-readonly"
                  value={email}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="fp-otp">
                {t('auth.forgot.otp')}
              </label>
              <div className="login-input-shell login-input-shell--pass">
                <FaKey className="login-input-icon" aria-hidden />
                <input
                  type="text"
                  id="fp-otp"
                  className="login-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder={t('auth.forgot.otpPh')}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="fp-new">
                {t('auth.forgot.newPassword')}
              </label>
              <div className="login-input-shell login-input-shell--pass">
                <FaLock className="login-input-icon" aria-hidden />
                <input
                  type="password"
                  id="fp-new"
                  className="login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.register.passwordPh')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="fp-confirm">
                {t('auth.forgot.confirm')}
              </label>
              <div className="login-input-shell login-input-shell--pass">
                <FaLock className="login-input-icon" aria-hidden />
                <input
                  type="password"
                  id="fp-confirm"
                  className="login-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.forgot.confirmPh')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="login-btn-primary login-btn-primary--spaced" disabled={loading}>
              {loading ? t('auth.forgot.processing') : t('auth.forgot.reset')}
            </button>

            <button
              type="button"
              className="login-btn-verify-resend"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? t('auth.forgot.sending') : t('auth.forgot.resend')}
            </button>

            <div className="login-footer-split">
              <p>
                <button
                  type="button"
                  className="login-text-btn"
                  onClick={() => {
                    setPhase('email');
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setInfo('');
                    setError('');
                  }}
                >
                  {t('auth.forgot.changeEmail')}
                </button>
                {' · '}
                <Link to="/login">{t('auth.forgot.login')}</Link>
              </p>
            </div>
          </form>
        )}
      </AuthSplitShell>
    </div>
  );
};

export default ForgotPasswordPage;
