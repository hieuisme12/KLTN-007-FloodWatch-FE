import React from 'react';
import { FaTriangleExclamation } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { statusColors, statusLabels } from '../../utils/constants';

const AlertPanel = ({ floodData }) => {
  // Lọc các cảnh báo (warning và danger), sắp xếp theo mức độ nguy hiểm
  const alerts = floodData
    .filter(item => item.status === 'warning' || item.status === 'danger')
    .sort((a, b) => {
      // Sắp xếp: danger trước, sau đó warning, sau đó theo water_level giảm dần
      if (a.status === 'danger' && b.status !== 'danger') return -1;
      if (a.status !== 'danger' && b.status === 'danger') return 1;
      return b.water_level - a.water_level;
    })
    .slice(0, 10); // Chỉ hiển thị 10 cảnh báo mới nhất

  if (alerts.length === 0) {
    return (
      <div style={{
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <p style={{ margin: 0 }}>Không có cảnh báo nào</p>
        <small>Tất cả các trạm đang hoạt động bình thường</small>
      </div>
    );
  }

  return (
    <div style={{
      padding: '15px',
      background: '#fff',
      borderRadius: '8px',
      maxHeight: '400px',
      overflowY: 'auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaTriangleExclamation /> Cảnh báo mới nhất ({alerts.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.map((alert, index) => {
          const color = statusColors[alert.status];
          return (
            <div
              key={alert.sensor_id || index}
              style={{
                padding: '12px',
                background: alert.status === 'danger' ? '#fff5f5' : '#fffbf0',
                borderLeft: `4px solid ${color}`,
                borderRadius: '4px',
                border: `1px solid ${color}20`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '5px' }}>
                <strong style={{ color: color, fontSize: '14px' }}>
                  {alert.location_name}
                </strong>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  background: `${color}20`,
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {statusLabels[alert.status]}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <WiFlood /> Mực nước: <strong style={{ color: color }}>{alert.water_level.toFixed(1)} cm</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  {new Date(alert.last_data_time || alert.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertPanel;
