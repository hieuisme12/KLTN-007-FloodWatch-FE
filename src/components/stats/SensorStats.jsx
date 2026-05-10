import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa6';
import UserDropdown from '../common/UserDropdown';
import { getCurrentUser } from '../../services/api';
import Skeleton from 'react-loading-skeleton';

const SensorStats = ({ floodData, loading }) => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const stats = {
    total: floodData.length,
    normal: floodData.filter(item => item.status === 'normal').length,
    warning: floodData.filter(item => item.status === 'warning').length,
    danger: floodData.filter(item => item.status === 'danger').length,
    offline: floodData.filter(item => item.status === 'offline').length,
  };

  return (
    <div style={{ 
      padding: '10px 20px', 
      background: '#2c3e50', 
      color: 'white',
      boxSizing: 'border-box',
      overflow: 'visible',
      whiteSpace: 'normal',
      flexShrink: 0
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        position: 'relative'
      }}>
        <div style={{ flex: 1 }}></div>
        <h2 style={{ 
          margin: '0', 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          textAlign: 'center',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          Hệ Thống Cảnh Báo Ngập Lụt TP.HCM - Real-time Dashboard
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
          {!currentUser && (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
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
              <FaLock /> Đăng nhập
            </button>
          )}
          {currentUser && <UserDropdown />}
        </div>
      </div>
      {loading ? (
        <div style={{ margin: '0 auto', maxWidth: 520, padding: '4px 0 8px' }}>
          <Skeleton
            height={18}
            baseColor="rgba(255,255,255,0.15)"
            highlightColor="rgba(255,255,255,0.28)"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '5px' }}>
          <span style={{ fontSize: '0.9rem' }}>
            Đang theo dõi <strong>{stats.total}</strong> trạm cảm biến
          </span>
          <span style={{ fontSize: '0.9rem', color: '#28a745' }}>
            Bình thường: <strong>{stats.normal}</strong>
          </span>
          <span style={{ fontSize: '0.9rem', color: '#ffc107' }}>
            Cảnh báo: <strong>{stats.warning}</strong>
          </span>
          <span style={{ fontSize: '0.9rem', color: '#dc3545' }}>
            Nguy hiểm: <strong>{stats.danger}</strong>
          </span>
          <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
            Offline: <strong>{stats.offline}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default SensorStats;
