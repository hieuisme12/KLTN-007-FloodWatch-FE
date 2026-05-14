import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaEnvelope, FaKey } from 'react-icons/fa6';
import { verifyOtp, resendOtp } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';
import AuthSplitShell from '../components/auth/AuthSplitShell';

const VerifyRegisterOtpPage = () => {
  const { t } = useTranslation();
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
      setError(t('auth.verify.errEmail'));
      return;
    }
    if (!otp.trim()) {
      setError(t('auth.verify.errOtp'));
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
              t('auth.verify.postVerify'),
            username: usernameHint
          }
        });
        return;
      }
      if (result.success && !result.data?.registration_completed) {
        setError(t('auth.verify.errIncomplete'));
        return;
      }
      setError(result.error || t('auth.verify.errOtpBad'));
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
    if (!em) {
      setError(t('auth.verify.errResendEmail'));
      return;
    }
    setResendLoading(true);
    try {
      const result = await resendOtp(em);
      if (result.success) {
        setInfo(result.message || t('auth.verify.infoResent'));
      } else {
        setError(result.error || t('auth.forgot.errResendFail'));
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setResendLoading(false);
    }
  };

  if (!initialEmail && !fromLogin) {
    return null;
  }

  return (
    <div className="auth-page">
      {loading && <AuthLoadingScreen overlay />}
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {info && (
        <div className="verify-otp-info" role="status">
          {info}
        </div>
      )}

      <AuthSplitShell panelInnerClassName="login-panel-inner--scroll">
        <form className="login-split-form" onSubmit={handleVerify}>
          <div className="login-split-title-row">
            <img src="/iuh.png" alt="" className="login-split-brand-logo" width={56} height={56} />
            <h2 className="login-split-title">{t('auth.verify.title')}</h2>
          </div>

          <p className="verify-otp-subtitle verify-otp-subtitle--light">
            {t('auth.verify.subtitle')}
          </p>

          <div className="login-field">
            <label className="login-field-label" htmlFor="verify-email">
              {t('auth.verify.email')}
            </label>
            <div className="login-input-shell login-input-shell--user">
              <FaEnvelope className="login-input-icon" aria-hidden />
              <input
                type="email"
                id="verify-email"
                className={`login-input ${emailLocked ? 'verify-email-readonly' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.register.emailPlaceholder')}
                required
                readOnly={emailLocked}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="otp">
              {t('auth.verify.otp')}
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaKey className="login-input-icon" aria-hidden />
              <input
                type="text"
                id="otp"
                className="login-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t('auth.verify.otpPh')}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </div>
          </div>

          <button type="submit" className="login-btn-primary login-btn-primary--spaced" disabled={loading}>
            {loading ? t('auth.verify.submitting') : t('auth.verify.submit')}
          </button>

          <button
            type="button"
            className="login-btn-verify-resend"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? t('auth.forgot.sending') : t('auth.verify.resend')}
          </button>

          <div className="login-footer-split">
            <p>
              <Link to="/login">{t('auth.verify.login')}</Link>
              {' · '}
              <Link to="/register">{t('auth.verify.registerAgain')}</Link>
            </p>
          </div>
        </form>
      </AuthSplitShell>
    </div>
  );
};

export default VerifyRegisterOtpPage;
