import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile } from '../../services/api';
import UserDropdown from '../../components/UserDropdown';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });

  const loadProfile = async () => {
    setLoading(true);
    const result = await getProfile();
    if (result.success) {
      setUser(result.data);
      setFormData({
        full_name: result.data.full_name || '',
        email: result.data.email || '',
        phone: result.data.phone || ''
      });
    } else {
      setError(result.error || 'Không thể tải thông tin người dùng');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const result = await updateProfile(formData);
    
    if (result.success) {
      setUser(result.data);
      setSuccess('Cập nhật thông tin thành công!');
      setIsEditing(false);
    } else {
      setError(result.error || 'Cập nhật thất bại');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-header-bar">
          <button onClick={() => navigate('/')} className="back-button">
            ← Quay lại Dashboard
          </button>
          <UserDropdown />
        </div>
        <div className="profile-page">
          <div className="profile-container">
            <div className="loading">Đang tải thông tin...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-header-bar">
          <button onClick={() => navigate('/')} className="back-button">
            ← Quay lại Dashboard
          </button>
          <UserDropdown />
        </div>
        <div className="profile-page">
          <div className="profile-container">
            <div className="error-message">{error || 'Không thể tải thông tin người dùng'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-header-bar">
        <button onClick={() => navigate('/')} className="back-button">
          ← Quay lại Dashboard
        </button>
        <UserDropdown />
      </div>
      <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <span>{user.username?.charAt(0).toUpperCase()}</span>
          </div>
          <h1>{user.full_name || user.username}</h1>
          <p className="profile-role">{user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
        </div>

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Thông tin cá nhân</h2>

            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Họ và tên</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Thông tin tài khoản</h2>
            
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Vai trò:</span>
                <span className="info-value">{user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Ngày tạo:</span>
                <span className="info-value">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              </div>
              {user.last_login && (
                <div className="info-item">
                  <span className="info-label">Đăng nhập lần cuối:</span>
                  <span className="info-value">
                    {new Date(user.last_login).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            {!isEditing ? (
              <button 
                type="button" 
                className="btn-edit"
                onClick={() => setIsEditing(true)}
              >
                Chỉnh sửa thông tin
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
    </div>
  );
};

export default ProfilePage;
