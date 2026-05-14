import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getProfileIcons, updateProfile } from '../../services/api';
import { API_CONFIG } from '../../config/apiConfig';
import ErrorToast from '../../components/common/ErrorToast';
import Skeleton from 'react-loading-skeleton';
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
  const [profileIcons, setProfileIcons] = useState([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

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

  const loadProfileIcons = async () => {
    const result = await getProfileIcons();
    if (result.success && result.data) setProfileIcons(result.data);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      void loadProfileIcons();
    }, 0);
    return () => clearTimeout(t);
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /** Chỉ gọi khi user bấm nút Lưu (không dùng submit form để tránh lưu nhầm khi bấm Chỉnh sửa / Enter). */
  const saveProfile = async () => {
    if (!isEditing || saving) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setUser(result.data);
        setFormData({
          full_name: result.data.full_name || '',
          email: result.data.email || '',
          phone: result.data.phone || ''
        });
        setSuccess('Cập nhật thông tin thành công!');
        setIsEditing(false);
      } else {
        setError(result.error || 'Cập nhật thất bại');
      }
    } finally {
      setSaving(false);
    }
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

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return user.full_name.charAt(0).toUpperCase();
    }
    return user?.username?.charAt(0).toUpperCase() || 'U';
  };

  const getAvatarUrl = (avatarFileName) => {
    if (!avatarFileName) return null;
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const path = avatarFileName.startsWith('/') ? avatarFileName : `/profile-icons/${avatarFileName}`;
    return base + path;
  };

  const currentAvatarUrl = user?.avatar ? getAvatarUrl(user.avatar) : null;

  const handleSelectAvatar = async (icon) => {
    setSavingAvatar(true);
    setError('');
    setSuccess('');
    const result = await updateProfile({ avatar: icon.name });
    if (result.success) {
      setUser(result.data);
      setSuccess('Đã đổi ảnh đại diện.');
      setShowAvatarPicker(false);
    } else {
      setError(result.error || 'Đổi ảnh thất bại');
    }
    setSavingAvatar(false);
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Skeleton circle width={96} height={96} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <Skeleton height={30} width="50%" style={{ marginBottom: 18 }} />
              <Skeleton count={5} height={16} style={{ marginBottom: 12 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        {error && (
          <ErrorToast message={error || 'Không thể tải thông tin người dùng'} onClose={() => setError('')} />
        )}
        <div className="profile-container">
          <p className="error-message">{error || 'Không thể tải thông tin người dùng'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">Chỉnh sửa hồ sơ của bạn</h1>

        {success && (
          <ErrorToast variant="success" message={success} onClose={() => setSuccess('')} />
        )}
        {error && <ErrorToast message={error} onClose={() => setError('')} />}

        <div className="profile-form">
          <div className="profile-form-layout">
            {/* Left Side - Photo (chọn từ icon có sẵn) */}
            <div className="profile-photo-section">
              <label className="photo-label">Ảnh đại diện:</label>
              <div className="profile-avatar-container">
                <div className="profile-avatar">
                  {currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Avatar" className="profile-avatar-img" />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-change-photo"
                onClick={() => setShowAvatarPicker(true)}
              >
                ĐỔI ẢNH
              </button>
            </div>

            {/* Right Side - Form Fields */}
            <div className="profile-form-fields">
              <div className="form-group">
                <label htmlFor="username">Tên đăng nhập</label>
                <input
                  type="text"
                  id="username"
                  value={user.username}
                  disabled
                  className="input-disabled"
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
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Nhập email"
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
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="form-group">
                <label>Vai trò</label>
                <input
                  type="text"
                  value={user.role === 'admin' ? 'Quản trị viên' : user.role === 'moderator' ? 'Điều hành viên' : 'Người dùng'}
                  disabled
                  className="input-disabled"
                />
              </div>

              {user.created_at && (
                <div className="form-group">
                  <label>Ngày tạo</label>
                  <input
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString('vi-VN')}
                    disabled
                    className="input-disabled"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => {
                if (isEditing) {
                  handleCancel();
                } else {
                  navigate(-1);
                }
              }}
              disabled={saving}
            >
              Hủy
            </button>
            {isEditing ? (
              <button
                type="button"
                className="btn-save"
                disabled={saving}
                onClick={() => {
                  void saveProfile();
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-edit"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setIsEditing(true);
                }}
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        </div>

        {/* Modal chọn ảnh đại diện từ danh sách icon có sẵn */}
        {showAvatarPicker && (
          <div className="profile-avatar-modal-overlay" onClick={() => !savingAvatar && setShowAvatarPicker(false)}>
            <div className="profile-avatar-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-avatar-modal-header">
                <h3>Chọn ảnh đại diện</h3>
                <button type="button" className="profile-avatar-modal-close" onClick={() => !savingAvatar && setShowAvatarPicker(false)} aria-label="Đóng">×</button>
              </div>
              <p className="profile-avatar-modal-hint">Chọn một icon bên dưới (không tải ảnh từ máy).</p>
              {profileIcons.length === 0 ? (
                <div
                  className="profile-avatar-modal-loading"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                    gap: 12,
                    padding: '8px 0'
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} circle width={56} height={56} />
                  ))}
                </div>
              ) : (
                <div className="profile-avatar-grid">
                  {profileIcons.map((icon) => {
                    const iconUrl = icon.url.startsWith('http') ? icon.url : (API_CONFIG.BASE_URL.replace(/\/$/, '') + (icon.url.startsWith('/') ? icon.url : '/' + icon.url));
                    const isSelected = user?.avatar === icon.name;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        className={`profile-avatar-grid-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectAvatar(icon)}
                        disabled={savingAvatar}
                        title={icon.name}
                      >
                        <img src={iconUrl} alt={icon.name} />
                      </button>
                    );
                  })}
                </div>
              )}
              {savingAvatar && <div className="profile-avatar-modal-saving">Đang lưu...</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
