import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/api';

const UserDropdown = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  if (!currentUser) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.2)';
        }}
      >
        <span style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'white',
          color: '#1E3A8A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '0.9rem'
        }}>
          {currentUser.username?.charAt(0).toUpperCase()}
        </span>
        {currentUser.full_name || currentUser.username}
        <span style={{ fontSize: '0.7rem' }}>▼</span>
      </button>

      {dropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '220px',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #eee',
            background: '#f9f9f9'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: '#333',
              marginBottom: '4px'
            }}>
              {currentUser.full_name || currentUser.username}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#666'
            }}>
              {currentUser.email}
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#999',
              marginTop: '4px',
              textTransform: 'uppercase',
              fontWeight: '500'
            }}>
              {currentUser.role === 'admin' ? '👑 Quản trị viên' : '👤 Người dùng'}
            </div>
          </div>

          <button
            onClick={handleProfileClick}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'white',
              color: '#333',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
            }}
          >
            <span>👤</span>
            Thông tin cá nhân
          </button>

          <div style={{ height: '1px', background: '#eee' }}></div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'white',
              color: '#dc3545',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fff5f5';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
            }}
          >
            <span>🚪</span>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
