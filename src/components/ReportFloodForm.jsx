import React, { useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker } from 'react-leaflet';
import { submitFloodReport } from '../services/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../utils/constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icon cho vị trí đã chọn
const createLocationIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #007bff;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    className: 'location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component để lắng nghe click trên map
const MapClickHandler = ({ onLocationSelect  }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
};

const ReportFloodForm = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    reporter_id: null, // Có thể lấy từ user context sau
    level: '',
    lng: null,
    lat: null
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validation
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Tên phải có ít nhất 2 ký tự');
      return;
    }

    if (!['Nhẹ', 'Trung bình', 'Nặng'].includes(formData.level)) {
      setError('Vui lòng chọn mức độ ngập hợp lệ');
      return;
    }

    if (!formData.lng || !formData.lat) {
      setError('Vui lòng chọn vị trí trên bản đồ (click vào bản đồ)');
      return;
    }

    setLoading(true);
    try {
      const response = await submitFloodReport(formData);
      
      if (response.success) {
        setResult(response);
        // Reset form
        setFormData({
          name: '',
          level: '',
          lng: null,
          lat: null
        });
        
        // Callback success (chỉ gọi nếu có data)
        if (onSuccess && response.data) {
          onSuccess(response.data);
        }
      } else {
        setError(response.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lng, lat) => {
    setFormData({ ...formData, lng, lat });
    setError(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        background: '#007bff',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>📝 Báo cáo ngập lụt</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 10px'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        {/* Tên */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Tên của bạn <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nhập tên hoặc để ẩn danh"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          />
        </div>

        {/* Mức độ ngập */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Mức độ ngập <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          >
            <option value="">-- Chọn mức độ ngập --</option>
            <option value="Nhẹ">Nhẹ - Đến mắt cá (~10cm)</option>
            <option value="Trung bình">Trung bình - Đến đầu gối (~30cm)</option>
            <option value="Nặng">Nặng - Ngập nửa xe (~50cm)</option>
          </select>
        </div>

        {/* Bản đồ chọn vị trí */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Vị trí ngập <span style={{ color: 'red' }}>*</span>
          </label>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Click vào bản đồ để chọn vị trí ngập
          </p>
          <div style={{ height: '300px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <MapContainer
              center={formData.lat && formData.lng ? [formData.lat, formData.lng] : DEFAULT_CENTER}
              zoom={formData.lat && formData.lng ? 15 : DEFAULT_ZOOM}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler 
                onLocationSelect={handleLocationSelect}
                selectedLocation={formData.lat && formData.lng ? [formData.lat, formData.lng] : null}
              />
              {formData.lat && formData.lng && (
                <Marker position={[formData.lat, formData.lng]} icon={createLocationIcon()} />
              )}
            </MapContainer>
          </div>
          {formData.lat && formData.lng && (
            <p style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>
              ✅ Đã chọn: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '10px',
            background: '#fff5f5',
            border: '1px solid #dc3545',
            borderRadius: '6px',
            color: '#dc3545',
            marginBottom: '15px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Success message */}
        {result && result.success && result.data && (
          <div style={{
            padding: '10px',
            background: result.data.verified_by_sensor ? '#f0fff4' : '#fffbf0',
            border: `1px solid ${result.data.verified_by_sensor ? '#28a745' : '#ffc107'}`,
            borderRadius: '6px',
            color: result.data.verified_by_sensor ? '#28a745' : '#856404',
            marginBottom: '15px'
          }}>
            {result.data.verified_by_sensor ? (
              <>
                ✅ <strong>Đã xác minh!</strong> {result.message || 'Báo cáo của bạn đã được xác minh bởi hệ thống cảm biến. Cảm ơn!'}
              </>
            ) : (
              <>
                ⏳ <strong>Đang xem xét</strong> {result.message || 'Báo cáo của bạn đang được xem xét. Cảm ơn!'}
              </>
            )}
          </div>
        )}
        
        {/* Success message khi không có data */}
        {result && result.success && !result.data && result.message && (
          <div style={{
            padding: '10px',
            background: '#fffbf0',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            color: '#856404',
            marginBottom: '15px'
          }}>
            ⏳ {result.message}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? '⏳ Đang gửi...' : '📤 Gửi báo cáo'}
        </button>
      </form>
    </div>
  );
};

export default ReportFloodForm;
