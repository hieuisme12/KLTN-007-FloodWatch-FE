import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaUser, FaLock, FaEnvelope, FaPhone } from 'react-icons/fa6';
import { register } from '../services/api';
import ErrorToast from '../components/common/ErrorToast';
import AuthLoadingScreen from '../components/common/AuthLoadingScreen';
import AuthSplitShell from '../components/auth/AuthSplitShell';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, ...registerData } = formData;
      const result = await register(registerData);

      if (result.success) {
        const user = result.data?.user;
        const email =
          user?.email ||
          (typeof registerData.email === 'string'
            ? registerData.email.trim().toLowerCase()
            : '');
        navigate('/register/verify', {
          replace: true,
          state: {
            email,
            username: user?.username || registerData.username
          }
        });
      } else {
        setError(result.error || 'Đăng ký thất bại');
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
      {error && (
        <ErrorToast message={error} onClose={() => setError('')} />
      )}

      <AuthSplitShell panelInnerClassName="login-panel-inner--scroll">
        <form className="login-split-form" onSubmit={handleSubmit}>
          <div className="login-split-title-row">
            <img src="/iuh.png" alt="" className="login-split-brand-logo" width={56} height={56} />
            <h2 className="login-split-title">Đăng ký</h2>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-username">
              Tên đăng nhập <span className="login-field-req">*</span>
            </label>
            <div className="login-input-shell login-input-shell--user">
              <FaUser className="login-input-icon" aria-hidden />
              <input
                type="text"
                id="reg-username"
                name="username"
                className="login-input"
                value={formData.username}
                onChange={handleChange}
                placeholder="Tên đăng nhập"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-email">
              Email <span className="login-field-req">*</span>
            </label>
            <div className="login-input-shell login-input-shell--user">
              <FaEnvelope className="login-input-icon" aria-hidden />
              <input
                type="email"
                id="reg-email"
                name="email"
                className="login-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-full_name">
              Họ và tên
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaUser className="login-input-icon" aria-hidden />
              <input
                type="text"
                id="reg-full_name"
                name="full_name"
                className="login-input"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-phone">
              Số điện thoại
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaPhone className="login-input-icon" aria-hidden />
              <input
                type="tel"
                id="reg-phone"
                name="phone"
                className="login-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0xxx xxx xxx"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-password">
              Mật khẩu <span className="login-field-req">*</span>
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaLock className="login-input-icon" aria-hidden />
              <input
                type="password"
                id="reg-password"
                name="password"
                className="login-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Tối thiểu 6 ký tự"
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label" htmlFor="reg-confirmPassword">
              Xác nhận mật khẩu <span className="login-field-req">*</span>
            </label>
            <div className="login-input-shell login-input-shell--pass">
              <FaLock className="login-input-icon" aria-hidden />
              <input
                type="password"
                id="reg-confirmPassword"
                name="confirmPassword"
                className="login-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn-primary login-btn-primary--spaced"
            disabled={loading}
          >
            {loading ? 'Đang đăng ký…' : 'Đăng ký'}
          </button>

          <div className="login-footer-split">
            <p>
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </p>
          </div>
        </form>
      </AuthSplitShell>
    </div>
  );
};

export default RegisterPage;
