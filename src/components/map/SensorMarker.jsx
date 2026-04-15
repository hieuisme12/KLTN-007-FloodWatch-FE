import React, { useState, useEffect } from 'react';
import { Marker, Popup } from 'react-map-gl/mapbox';
import { getSensorDisplayAddress, getSensorDisplayPosition } from '../../data/sensorOverrides';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { MdLocationOn } from 'react-icons/md';
/**
 * Marker cảm biến dùng chung: trang Map (home) và trang New Report (mini map).
 * - mode="map": click mở popup, onClick(item) cho parent.
 * - mode="report": click zoom to sensor (onZoomTo), hover hiển thị thông tin sensor.
 * - isOnline: true thì hiển thị hiệu ứng sóng tỏa từ viền marker (không còn nhấp nháy cảnh báo).
 */
const SensorMarker = ({
  item,
  color,
  isOnline = true,
  mode = 'map',
  onClick,
  isPopupOpen,
  onOpenPopup,
  onClosePopup,
  onZoomTo,
  hoveredSensorId,
  onHoverChange,
  reportHoverId
}) => {
  const { lat, lng } = getSensorDisplayPosition(item);
  const overrideAddress = getSensorDisplayAddress(item);
  const [geocodeAddress, setGeocodeAddress] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(false);
  const [hoveredPopup, setHoveredPopup] = useState(false);
  const leaveTimerRef = React.useRef(null);
  const sensorId = reportHoverId != null ? reportHoverId : (item.sensor_id || item.id);

  const address = overrideAddress ?? geocodeAddress;
  const isControlledReport = mode === 'report' && onHoverChange != null;
  const showPopup = mode === 'report'
    ? (hoveredMarker || hoveredPopup) && (hoveredSensorId == null || hoveredSensorId === sensorId)
    : isPopupOpen;

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const closeHoverPopup = () => {
    setHoveredMarker(false);
    setHoveredPopup(false);
    if (isControlledReport) onHoverChange(null);
  };

  const scheduleHide = (setter) => {
    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(() => {
      if (mode === 'report') closeHoverPopup();
      else setter(false);
    }, 150);
  };

  const handleShow = () => {
    clearLeaveTimer();
    setHoveredMarker(true);
    if (isControlledReport) onHoverChange(sensorId);
  };

  const handlePopupEnter = () => {
    clearLeaveTimer();
    setHoveredPopup(true);
  };

  useEffect(() => {
    if (overrideAddress) return;
    if (!showPopup || !lat || !lng) return;
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setGeocodeAddress(addr);
    });
    return () => { cancelled = true; };
  }, [showPopup, lat, lng, overrideAddress]);

  const handleMarkerClick = (e) => {
    e.originalEvent.stopPropagation();
    if (mode === 'report') {
      onZoomTo && onZoomTo(item);
    } else {
      onOpenPopup && onOpenPopup();
      onClick && onClick(item);
    }
  };

  React.useEffect(() => () => clearLeaveTimer(), []);

  // Khi parent báo đóng (vd: click map) thì tắt popup
  React.useEffect(() => {
    if (isControlledReport && hoveredSensorId === null) {
      setHoveredMarker(false);
      setHoveredPopup(false);
    }
  }, [isControlledReport, hoveredSensorId]);

  return (
    <>
      <Marker
        longitude={lng}
        latitude={lat}
        anchor="bottom"
        onClick={handleMarkerClick}
      >
        <div
          className="sensor-marker-wrapper"
          style={{ cursor: 'pointer', lineHeight: 1.2 }}
          onMouseEnter={() => mode === 'report' && handleShow()}
          onMouseLeave={() => mode === 'report' && scheduleHide(setHoveredMarker)}
        >
          <div className="sensor-marker-body">
            <div className="sensor-marker-circle-wrap">
              {isOnline && (
                <>
                  <div className="sensor-wave-ring" style={{ border: `2px solid ${color}` }} />
                  <div className="sensor-wave-ring" style={{ border: `2px solid ${color}` }} />
                  <div className="sensor-wave-ring" style={{ border: `2px solid ${color}` }} />
                </>
              )}
              <div
                className="sensor-marker-circle"
                style={{ border: `3px solid ${color}`, backgroundColor: color }}
              >
                <img src="/sensor.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `12px solid ${color}`,
              marginTop: '-2px'
            }} />
          </div>
        </div>
      </Marker>
      {showPopup && (
        <Popup
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          offset={[0, -40]}
          onClose={mode === 'map' ? () => onClosePopup && onClosePopup() : undefined}
          closeButton={mode === 'map'}
          closeOnClick={false}
          style={{ borderRadius: '12px', overflow: 'hidden' }}
        >
          <div
            style={{ textAlign: 'left', minWidth: '220px', padding: '14px 16px', boxSizing: 'border-box' }}
            onMouseEnter={() => mode === 'report' && handlePopupEnter()}
            onMouseLeave={() => mode === 'report' && scheduleHide(setHoveredPopup)}
          >
            <h3 style={{ margin: '0 0 8px 0', color, fontSize: '16px', fontWeight: 'bold' }}>
              {item.location_name}
            </h3>
            <div style={{ fontSize: '12px', color: '#333', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <MdLocationOn style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{address === null && !overrideAddress ? 'Đang tải địa chỉ...' : (address || item.location_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`)}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Nhiệt độ: {item.temperature != null ? `${item.temperature.toFixed(1)} °C` : '—'}
              {' · '}
              Độ ẩm: {item.humidity != null ? `${item.humidity.toFixed(0)} %` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Tọa độ: {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default SensorMarker;
