import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createCustomIcon, getStatusLabel, getVelocityLabel } from '../../utils/markerUtils';
import { statusColors, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import { FaMobileScreen, FaCheck, FaXmark, FaClock, FaStar, FaCircle } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import axios from 'axios';
import { API_CONFIG } from '../../config/apiConfig';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tạo icon cho crowd report - ưu tiên moderation_status theo logic đúng
const createCrowdReportIcon = (report) => {
  // Logic: Nếu moderation_status đã được xử lý (approved/rejected), hiển thị nó
  // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
  const moderationStatus = report.moderation_status;
  const validationStatus = report.validation_status;
  
  let color = '#6c757d';
  // SVG icons cho marker (vì Leaflet dùng HTML string, không thể dùng React component trực tiếp)
  let iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>';
  
  // Nếu đã được moderator xử lý (approved hoặc rejected)
  if (moderationStatus === 'approved') {
    const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
    color = report.flood_level && levelColors[report.flood_level] ? levelColors[report.flood_level] : '#28a745';
    iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
  } else if (moderationStatus === 'rejected') {
    color = '#dc3545';
    iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  } 
  // Nếu moderation_status = 'pending' hoặc null, dùng validation_status
  else {
    const displayStatus = moderationStatus === 'pending' || !moderationStatus 
      ? validationStatus 
      : moderationStatus;
    
    if (displayStatus === 'pending') {
      color = '#ffc107';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>';
    } else if (report.verified_by_sensor || displayStatus === 'cross_verified') {
      color = '#28a745';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    } else if (displayStatus === 'verified') {
      color = '#17a2b8';
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    }
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
    ">${iconSvg}</div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'crowd-report-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const MapView = ({ floodData, crowdReports = [], onSensorSelect }) => {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        // Thử gọi API để lấy số lượng online (nếu có)
        const response = await axios.get(`${API_CONFIG.BASE_URL}/api/stats/online-users`, {
          timeout: 3000,
          validateStatus: () => true // Không throw error cho bất kỳ status code nào
        }).catch(() => null);
        
        if (response && response.status === 200 && response.data && response.data.success) {
          setOnlineCount(response.data.data.onlineCount || 0);
        } else {
          // Nếu API chưa có, hiển thị 0
          setOnlineCount(0);
        }
      } catch (error) {
        // Nếu có lỗi, hiển thị 0
        setOnlineCount(0);
      }
    };

    fetchOnlineCount();
    // Update mỗi 10 giây
    const interval = setInterval(fetchOnlineCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={DEFAULT_ZOOM} 
        style={{ flex: 1, width: '100%', height: '100%', zIndex: 1 }}
      >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {floodData.map((item, index) => {
        const status = item.status || 'normal';
        const color = statusColors[status] || statusColors.normal;
        const isBlinking = status === 'danger';
        const icon = createCustomIcon(color, isBlinking);

        return (
          <Marker 
            key={item.sensor_id || index} 
            position={[item.lat, item.lng]} 
            icon={icon}
            eventHandlers={{
              click: () => {
                if (onSensorSelect) {
                  onSensorSelect(item);
                }
              }
            }}
          >
            <Popup>
              <div style={{ textAlign: 'left', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: color, fontSize: '16px', fontWeight: 'bold' }}>
                  {item.location_name}
                </h3>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MdLocationOn /> {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Crowd Reports Markers */}
      {crowdReports.map((report) => {
        // Logic: Nếu moderation_status đã được xử lý (approved/rejected), hiển thị nó
        // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
        const moderationStatus = report.moderation_status;
        const validationStatus = report.validation_status;
        
        let statusInfo = { color: '#6c757d', text: 'Không xác định' };
        
        // Nếu đã được moderator xử lý (approved hoặc rejected)
        if (moderationStatus === 'approved') {
          const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
          const c = report.flood_level && levelColors[report.flood_level] ? levelColors[report.flood_level] : '#28a745';
          statusInfo = { color: c, text: 'Đã duyệt' };
        } else if (moderationStatus === 'rejected') {
          statusInfo = { color: '#dc3545', text: 'Đã từ chối' };
        } 
        // Nếu moderation_status = 'pending' hoặc null, dùng validation_status
        else {
          const displayStatus = moderationStatus === 'pending' || !moderationStatus 
            ? validationStatus 
            : moderationStatus;
          
          const statusConfig = {
            pending: { color: '#ffc107', text: 'Chờ xét duyệt' },
            verified: { color: '#17a2b8', text: 'Đã xác minh' },
            cross_verified: { color: '#28a745', text: 'Đã xác minh chéo' }
          };
          
          if (report.verified_by_sensor) {
            statusInfo = statusConfig.cross_verified;
          } else {
            statusInfo = statusConfig[displayStatus] || statusInfo;
          }
        }
        
        const icon = createCrowdReportIcon(report);

        const getFloodLevelDesc = (level) => {
          const levels = {
            'Nhẹ': 'Đến mắt cá (~10cm)',
            'Trung bình': 'Đến đầu gối (~30cm)',
            'Nặng': 'Ngập nửa xe (~50cm)'
          };
          return levels[level] || level;
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
                  <FaMobileScreen style={{ marginRight: '6px' }} /> {report.reporter_name || 'Ẩn danh'}
                </h3>
                <div style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '16px', color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WiFlood /> Mức độ: {report.flood_level}
                  </strong><br />
                  <small>{getFloodLevelDesc(report.flood_level)}</small><br />
                  <strong>Trạng thái: </strong>{statusInfo.text}
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
                    <FaCheck style={{ marginRight: '4px' }} /> Đã xác minh bởi hệ thống cảm biến
                  </div>
                )}
                {report.reliability_score >= 61 && (
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                    <strong>Độ tin cậy:</strong> <FaStar style={{ marginLeft: '4px', marginRight: '4px' }} /> {report.reliability_score}/100
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
      
      {/* Online Users Widget - Top Right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          minWidth: '140px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#333',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Lượt truy cập
          </div>
          <div style={{
            height: '1px',
            background: '#e0e0e0',
            marginBottom: '12px'
          }}></div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#28a745',
            marginBottom: '8px',
            lineHeight: '1'
          }}>
            {onlineCount}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666',
            fontWeight: '500'
          }}>
            Đang online
          </div>
        </div>
      </div>

      {/* IUH Logo - Bottom Left */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          padding: '8px'
        }}>
          <img 
            src="/iuh.png" 
            alt="IUH Logo" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MapView;
