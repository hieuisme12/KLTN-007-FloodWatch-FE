import React, { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/mapbox';
import { MdMyLocation } from 'react-icons/md';

/**
 * Marker vị trí người dùng — chấm xanh + vòng pulse (kiểu “bản đồ hệ thống”).
 * anchor="center": tâm trùng tọa độ GPS.
 */
export default function UserLocationMarker({
  latitude,
  longitude,
  accuracy = null,
  source = 'gps',
  mapTheme = 'dark'
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const isLight = mapTheme === 'light';
  const dotBg = isLight ? '#0d47a1' : '#1976d2';
  const pulseClass = isLight ? 'map-user-loc-pulse map-user-loc-pulse--light' : 'map-user-loc-pulse';

  const title =
    source === 'gps'
      ? 'Vị trí thiết bị này (GPS trình duyệt)'
      : 'Vị trí đã lưu trên tài khoản (máy chủ)';

  return (
    <>
      <Marker
        longitude={longitude}
        latitude={latitude}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setPopupOpen((v) => !v);
        }}
      >
        <div className="map-user-loc-wrap" title={title} role="presentation">
          <span className={pulseClass} aria-hidden />
          <span
            className="map-user-loc-dot"
            style={{
              background: dotBg,
              borderColor: isLight ? 'rgba(255,255,255,0.95)' : '#fff'
            }}
            aria-hidden
          />
        </div>
      </Marker>
      {popupOpen && (
        <Popup
          longitude={longitude}
          latitude={latitude}
          anchor="top"
          offset={18}
          onClose={() => setPopupOpen(false)}
          closeButton
          closeOnClick={false}
        >
          <div className="map-user-loc-popup">
            <div className="map-user-loc-popup-title">
              <MdMyLocation className="map-user-loc-popup-icon" />
              {title}
            </div>
            <div className="map-user-loc-popup-coords">
              {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </div>
            {accuracy != null && !Number.isNaN(Number(accuracy)) && (
              <div className="map-user-loc-popup-acc">Độ chính xác khoảng {Math.round(Number(accuracy))} m</div>
            )}
            <div className="map-user-loc-popup-hint">
              {source === 'gps'
                ? 'Geolocation của trình duyệt trên máy/điện thoại đang mở — không lấy từ máy người khác qua mạng.'
                : 'Lần gần nhất đồng bộ từ máy chủ (chưa có GPS trực tiếp trên trình duyệt này).'}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
