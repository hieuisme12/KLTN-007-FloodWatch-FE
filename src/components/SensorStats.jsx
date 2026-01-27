import React from 'react';

const SensorStats = ({ floodData, loading }) => {
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
      textAlign: 'center',
      boxSizing: 'border-box',
      overflow: 'visible',
      whiteSpace: 'normal',
      flexShrink: 0
    }}>
      <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
        Hệ Thống Cảnh Báo Ngập Lụt TP.HCM - Real-time Dashboard
      </h2>
      {loading ? (
        <p style={{ margin: '0', fontSize: '0.9rem' }}>Đang tải dữ liệu...</p>
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
