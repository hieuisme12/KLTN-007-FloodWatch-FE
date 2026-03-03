import React from 'react';
import { FaCircle } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { getStatusLabel, getVelocityLabel } from '../../utils/markerUtils';
import { statusColors } from '../../utils/constants';
import './SensorDetailPanel.css';

const SensorDetailPanel = ({ sensor }) => {
  if (!sensor) {
    return (
      <div className="sensor-detail-panel">
        <div className="sensor-detail-header">
          <h3 className="sensor-detail-title">TÌNH TRẠNG NGẬP LỤT</h3>
        </div>
        <div className="sensor-detail-content">
          <div className="sensor-detail-empty">
            Chưa có dữ liệu sensor
          </div>
        </div>
      </div>
    );
  }

  const status = sensor.status || 'normal';
  const color = statusColors[status] || statusColors.normal;
  const isOnline = status !== 'offline';

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="sensor-detail-panel">
      <div className="sensor-detail-header">
        <h3 className="sensor-detail-title">TÌNH TRẠNG NGẬP LỤT</h3>
      </div>
      
      <div className="sensor-detail-content">
        {/* Live/Offline Status */}
        <div className="sensor-detail-status-badge">
          {isOnline ? (
            <span className="sensor-live-badge">
              <FaCircle style={{ color: '#dc3545', fontSize: '12px' }} /> LIVE
            </span>
          ) : (
            <span className="sensor-offline-badge">
              <FaCircle style={{ color: '#6c757d', fontSize: '12px' }} /> Off live
            </span>
          )}
        </div>

        {/* Update Date */}
        <div className="sensor-detail-update-date">
          Ngày cập nhật: {formatDate(sensor.last_data_time || sensor.created_at)}
        </div>
        
        <div className="sensor-detail-update-message">
          Dữ liệu hiện đang được cập nhật!
        </div>

        {/* Sensor ID */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Sensor ID:</span>
          <span className="sensor-detail-value">{sensor.sensor_id}</span>
        </div>

        {/* Model */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Model:</span>
          <span className="sensor-detail-value">{sensor.model}</span>
        </div>

        {/* Water Level */}
        <div className="sensor-detail-item sensor-detail-water-level">
          <span className="sensor-detail-label">
            <WiFlood style={{ marginRight: '6px', fontSize: '18px' }} />
            Mực nước:
          </span>
          <span className="sensor-detail-value" style={{ color: color, fontSize: '18px', fontWeight: 'bold' }}>
            {sensor.water_level?.toFixed(1) || '0.0'} cm
          </span>
        </div>

        {/* Status */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Trạng thái:</span>
          <span className="sensor-detail-value" style={{ color: color }}>
            {getStatusLabel(status)}
          </span>
        </div>

        {/* Velocity */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Vận tốc:</span>
          <span className="sensor-detail-value">{getVelocityLabel(sensor.velocity)}</span>
        </div>

        {/* Warning Threshold */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Ngưỡng cảnh báo:</span>
          <span className="sensor-detail-value">{sensor.warning_threshold} cm</span>
        </div>

        {/* Danger Threshold */}
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Ngưỡng nguy hiểm:</span>
          <span className="sensor-detail-value">{sensor.danger_threshold} cm</span>
        </div>

        {/* Sensor Location Name */}
        <div className="sensor-detail-item sensor-detail-location">
          <span className="sensor-detail-label">Trạm:</span>
          <span className="sensor-detail-value">{sensor.location_name}</span>
        </div>
      </div>
    </div>
  );
};

export default SensorDetailPanel;

