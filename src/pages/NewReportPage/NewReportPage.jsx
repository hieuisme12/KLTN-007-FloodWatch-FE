import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMapEvents, Marker } from 'react-leaflet';
import { submitFloodReport } from '../../services/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './NewReportPage.css';

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
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
};

const NewReportPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    reporter_id: null,
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
        // Chuyển về trang reports sau 2 giây
        setTimeout(() => {
          navigate('/reports');
        }, 2000);
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
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        background: '#2c3e50',
        color: 'white',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            ← Quay lại
          </button>
          <h1 style={{ margin: '10px 0 5px 0', fontSize: '1.5rem' }}>
            📝 Báo cáo ngập lụt
          </h1>
          <p style={{ margin: '0', opacity: 0.9, fontSize: '14px' }}>
            Giúp cộng đồng cập nhật tình trạng ngập lụt
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Form */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  fontSize: '14px'
                }}>
                  Tên người báo cáo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  fontSize: '14px'
                }}>
                  Mức độ ngập *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Chọn mức độ --</option>
                  <option value="Nhẹ">💧 Nhẹ (đến mắt cá ~10cm)</option>
                  <option value="Trung bình">⚠️ Trung bình (đến đầu gối ~30cm)</option>
                  <option value="Nặng">🚨 Nặng (ngập nửa xe ~50cm)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#2c3e50',
                  fontSize: '14px'
                }}>
                  Vị trí *
                </label>
                <div style={{
                  padding: '10px',
                  background: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {formData.lat && formData.lng ? (
                    <>
                      <div style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '5px' }}>
                        ✅ Đã chọn vị trí
                      </div>
                      <div>📍 Lat: {formData.lat.toFixed(6)}, Lng: {formData.lng.toFixed(6)}</div>
                    </>
                  ) : (
                    <div>
                      👆 Click vào bản đồ bên phải để chọn vị trí ngập
                    </div>
                  )}
                </div>
              </div>

              {/* Success Message */}
              {result && result.success && (
                <div style={{
                  padding: '15px',
                  marginBottom: '20px',
                  background: '#d4edda',
                  color: '#155724',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong>✅ Báo cáo thành công!</strong>
                  <div style={{ marginTop: '8px' }}>
                    {result.message || 'Cảm ơn bạn đã đóng góp thông tin!'}
                  </div>
                  {result.data?.verified_by_sensor && (
                    <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                      🎯 Báo cáo đã được xác minh bởi cảm biến gần đó
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '15px',
                  marginBottom: '20px',
                  background: '#f8d7da',
                  color: '#721c24',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <strong>❌ Lỗi:</strong> {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || result?.success}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: loading || result?.success ? '#6c757d' : '#007bff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || result?.success ? 'not-allowed' : 'pointer',
                  transition: 'background 0.3s'
                }}
              >
                {loading ? '⏳ Đang gửi...' : result?.success ? '✅ Đã gửi' : '📤 Gửi báo cáo'}
              </button>
            </form>
          </div>

          {/* Map */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: '20px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              fontSize: '16px',
              color: '#2c3e50'
            }}>
              🗺️ Chọn vị trí ngập
            </h3>
            <div style={{
              height: '500px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid #ddd'
            }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapClickHandler onLocationSelect={handleLocationSelect} />
                {formData.lat && formData.lng && (
                  <Marker
                    position={[formData.lat, formData.lng]}
                    icon={createLocationIcon()}
                  />
                )}
              </MapContainer>
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center'
            }}>
              💡 Click vào bản đồ để đánh dấu vị trí ngập lụt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewReportPage;
