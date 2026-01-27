import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createCustomIcon, getStatusLabel, getVelocityLabel } from '../utils/markerUtils';
import { statusColors, DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tạo icon cho crowd report
const createCrowdReportIcon = (status, verified) => {
  let color = '#6c757d';
  let emoji = '📱';
  
  if (verified || status === 'cross_verified') {
    color = '#28a745';
    emoji = '✅';
  } else if (status === 'pending') {
    color = '#ffc107';
    emoji = '⏳';
  } else if (status === 'rejected') {
    color = '#dc3545';
    emoji = '❌';
  }

  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    ">${emoji}</div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'crowd-report-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const MapView = ({ floodData, crowdReports = [] }) => {
  return (
    <MapContainer 
      center={DEFAULT_CENTER} 
      zoom={DEFAULT_ZOOM} 
      style={{ flex: 1, width: '100%', height: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {floodData.map((item, index) => {
        const status = item.status || 'normal';
        const color = statusColors[status] || statusColors.normal;
        const isBlinking = status === 'danger';
        const icon = createCustomIcon(color, isBlinking);

        return (
          <Marker key={item.sensor_id || index} position={[item.lat, item.lng]} icon={icon}>
            <Popup>
              <div style={{ textAlign: 'left', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: color, fontSize: '16px', fontWeight: 'bold' }}>
                  {item.location_name}
                </h3>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Sensor ID:</strong> {item.sensor_id}<br />
                  <strong>Model:</strong> {item.model}<br />
                </div>
                <div style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '18px', color: color }}>
                    Mực nước: {item.water_level.toFixed(1)} cm
                  </strong><br />
                  <strong>Trạng thái: </strong>{getStatusLabel(status)}<br />
                  <strong>Vận tốc: </strong>{getVelocityLabel(item.velocity)}<br />
                </div>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                  <strong>Ngưỡng cảnh báo:</strong> {item.warning_threshold} cm<br />
                  <strong>Ngưỡng nguy hiểm:</strong> {item.danger_threshold} cm<br />
                </div>
                <div style={{ fontSize: '11px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                  <strong>Cập nhật:</strong> {new Date(item.last_data_time || item.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Crowd Reports Markers */}
      {crowdReports.map((report) => {
        const statusInfo = {
          color: report.verified_by_sensor || report.validation_status === 'cross_verified' 
            ? '#28a745' 
            : report.validation_status === 'pending' 
            ? '#ffc107' 
            : report.validation_status === 'rejected' 
            ? '#dc3545' 
            : '#6c757d'
        };
        const icon = createCrowdReportIcon(report.validation_status, report.verified_by_sensor);

        const getFloodLevelDesc = (level) => {
          const levels = {
            'Nhẹ': 'Đến mắt cá (~10cm)',
            'Trung bình': 'Đến đầu gối (~30cm)',
            'Nặng': 'Ngập nửa xe (~50cm)'
          };
          return levels[level] || level;
        };

        const getStatusText = (status, verified) => {
          if (verified || status === 'cross_verified') return '✅ Đã xác minh';
          if (status === 'pending') return '⏳ Chờ xem xét';
          if (status === 'verified') return '✅ Đã xác minh';
          if (status === 'rejected') return '❌ Đã từ chối';
          return '❓ Không xác định';
        };

        return (
          <Marker 
            key={`crowd-${report.id}`} 
            position={[report.lat, report.lng]} 
            icon={icon}
          >
            <Popup>
              <div style={{ textAlign: 'left', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: statusInfo.color, fontSize: '16px', fontWeight: 'bold' }}>
                  📱 {report.reporter_name || 'Ẩn danh'}
                </h3>
                <div style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '16px', color: statusInfo.color }}>
                    Mức độ: {report.flood_level}
                  </strong><br />
                  <small>{getFloodLevelDesc(report.flood_level)}</small><br />
                  <strong>Trạng thái: </strong>{getStatusText(report.validation_status, report.verified_by_sensor)}
                </div>
                {report.verified_by_sensor && (
                  <div style={{
                    marginBottom: '8px',
                    padding: '6px',
                    background: '#f0fff4',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#28a745'
                  }}>
                    ✅ Đã xác minh bởi hệ thống cảm biến
                  </div>
                )}
                {report.reliability_score >= 61 && (
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                    <strong>Độ tin cậy:</strong> ⭐ {report.reliability_score}/100
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                  <strong>Thời gian:</strong> {new Date(report.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapView;
