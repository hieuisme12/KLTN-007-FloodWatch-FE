import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Popup } from 'react-map-gl/mapbox';
import { getSensorDisplayAddress, getSensorDisplayPosition, getSensorDisplayName } from '../../data/sensorOverrides';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { MdLocationOn } from 'react-icons/md';
/**
 * Marker cảm biến dùng chung: trang Map (home) và trang New Report (mini map).
 * - mode="map" + sensorPopupTrigger="click": click mở popup, onClick(item) cho parent.
 * - mode="map" + sensorPopupTrigger="hover": hover mở popup; click chỉ gọi onClick(item).
 * - mode="report": click zoom to sensor (onZoomTo), hover hiển thị thông tin sensor.
 * - isOnline: true thì hiển thị hiệu ứng sóng tỏa từ viền marker (không còn nhấp nháy cảnh báo).
 */
const SensorMarker = ({
  item,
  color,
  isOnline = true,
  mode = 'map',
  /** Chỉ khi mode="map": "click" | "hover" */
  sensorPopupTrigger = 'click',
  onClick,
  isPopupOpen,
  onOpenPopup,
  onClosePopup,
  onZoomTo,
  hoveredSensorId,
  onHoverChange,
  reportHoverId
}) => {
  const { t } = useTranslation();
  const { lat, lng } = getSensorDisplayPosition(item);
  const overrideAddress = getSensorDisplayAddress(item);
  const displayName = getSensorDisplayName(item);
  const [geocodeAddress, setGeocodeAddress] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(false);
  const [hoveredPopup, setHoveredPopup] = useState(false);
  const leaveTimerRef = React.useRef(null);
  const sensorId = reportHoverId != null ? reportHoverId : (item.sensor_id || item.id);

  const address = overrideAddress ?? geocodeAddress;
  const isControlledReport = mode === 'report' && onHoverChange != null;
  const isHoverTrigger =
    mode === 'report' || (mode === 'map' && sensorPopupTrigger === 'hover');
  const showPopup = isHoverTrigger
    ? (hoveredMarker || hoveredPopup) &&
      (mode !== 'report' || hoveredSensorId == null || hoveredSensorId === sensorId)
    : isPopupOpen;

  const isClickMapPopup = mode === 'map' && !isHoverTrigger;

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
      else if (isHoverTrigger) {
        setHoveredMarker(false);
        setHoveredPopup(false);
      } else setter(false);
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
    } else if (isHoverTrigger) {
      onClick && onClick(item);
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
          onMouseEnter={() => isHoverTrigger && handleShow()}
          onMouseLeave={() => isHoverTrigger && scheduleHide(setHoveredMarker)}
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
          onClose={isClickMapPopup ? () => onClosePopup && onClosePopup() : undefined}
          closeButton={isClickMapPopup}
          closeOnClick={false}
          style={{ borderRadius: '12px', overflow: 'hidden' }}
        >
          <div
            style={{ textAlign: 'left', minWidth: '220px', padding: '14px 16px', boxSizing: 'border-box' }}
            onMouseEnter={() => isHoverTrigger && handlePopupEnter()}
            onMouseLeave={() => isHoverTrigger && scheduleHide(setHoveredPopup)}
          >
            <h3 style={{ margin: '0 0 8px 0', color, fontSize: '16px', fontWeight: 'bold' }}>
              {displayName}
            </h3>
            <div style={{ fontSize: '12px', color: '#333', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <MdLocationOn style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                {address === null && !overrideAddress
                  ? t('reportUi.addressLoading')
                  : (address || displayName || t('reportUi.coordLabel', { lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              {t('reportUi.popupTemperature')}: {item.temperature != null ? `${item.temperature.toFixed(1)} °C` : '—'}
              {' · '}
              {t('reportUi.popupHumidity')}: {item.humidity != null ? `${item.humidity.toFixed(0)} %` : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {t('reportUi.coordLabel', { lat: lat.toFixed(6), lng: lng.toFixed(6) })}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default SensorMarker;
