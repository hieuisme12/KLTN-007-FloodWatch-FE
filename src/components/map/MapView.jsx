import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { statusColors, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { getSensorDisplayPosition } from '../../data/sensorOverrides';
import { FaMobileScreen, FaCheck, FaXmark, FaClock, FaStar, FaCircle, FaLayerGroup } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { getOnlineUsersCount } from '../../services/api';
import { API_CONFIG } from '../../config/apiConfig';
import { useReporterRanking } from '../../context/ReporterRankingContext';
import { getCurrentUser } from '../../utils/auth';
import SensorMarker from './SensorMarker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Mapbox dùng [lng, lat]; DEFAULT_CENTER là [lat, lng]
const defaultLng = DEFAULT_CENTER[1];
const defaultLat = DEFAULT_CENTER[0];

// Kiểu bản đồ cơ bản (nhẹ)
const MAP_STYLES = {
  streets: { id: 'streets', label: 'Bản đồ', url: 'mapbox://styles/mapbox/streets-v12' },
  satellite: { id: 'satellite', label: 'Vệ tinh', url: 'mapbox://styles/mapbox/satellite-v9' },
  satelliteStreets: { id: 'satelliteStreets', label: 'Vệ tinh + đường', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  outdoors: { id: 'outdoors', label: 'Địa hình', url: 'mapbox://styles/mapbox/outdoors-v12' }
};

// Crowd report marker: màu theo status/level
const getCrowdMarkerColor = (report) => {
  const moderationStatus = report.moderation_status;
  if (moderationStatus === 'approved') {
    const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
    return report.flood_level && levelColors[report.flood_level] ? levelColors[report.flood_level] : '#28a745';
  }
  if (moderationStatus === 'rejected') return '#dc3545';
  const validationStatus = report.validation_status;
  const displayStatus = moderationStatus === 'pending' || !moderationStatus ? validationStatus : moderationStatus;
  if (displayStatus === 'pending') return '#ffc107';
  if (report.verified_by_sensor || displayStatus === 'cross_verified') return '#28a745';
  if (displayStatus === 'verified') return '#17a2b8';
  return '#6c757d';
};

const getReporterAvatarUrl = (avatarFileName) => {
  if (!avatarFileName || typeof avatarFileName !== 'string') return null;
  const trimmed = avatarFileName.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/profile-icons/${trimmed}`;
  return base + path;
};

const getReportReporterAvatar = (report) => {
  const fromReport = report.reporter_avatar ?? report.avatar ?? report.reporter?.avatar ?? null;
  if (fromReport) return fromReport;
  const currentUser = getCurrentUser();
  if (currentUser && report.reporter_id != null && String(report.reporter_id) === String(currentUser.id)) {
    return currentUser.avatar ?? null;
  }
  return null;
};

// Nhóm báo cáo theo cùng vị trí (tọa độ làm tròn 5 số thập phân ~1.1m)
const POSITION_PRECISION = 5;
const getPositionKey = (lat, lng) =>
  `${Number(lat).toFixed(POSITION_PRECISION)}_${Number(lng).toFixed(POSITION_PRECISION)}`;

const groupCrowdReportsByPosition = (reports) => {
  const groups = {};
  reports.forEach((r) => {
    const key = getPositionKey(r.lat, r.lng);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return Object.entries(groups).map(([key, list]) => ({
    key,
    reports: list,
    lat: list[0].lat,
    lng: list[0].lng
  }));
};

// Stack: lệch pixel nhẹ (lớp chồng). Fan: xoay quanh mũi nhọn, góc nhỏ để marker gần nhau.
const STACK_OFFSET_PX = 4;
const FAN_ANGLE_SPAN = 24; // tổng góc quạt (độ) – khoảng cách xòe ngắn
const STACK_HIT_RADIUS = 90; // bán kính vùng hover chung (px) – dùng cho lớp phát hiện theo vị trí chuột

const getStackOffsetPx = (index) => ({ x: index * STACK_OFFSET_PX, y: index * STACK_OFFSET_PX });

const getFanAngle = (index, count) => {
  if (count <= 1) return 0;
  return -FAN_ANGLE_SPAN / 2 + (index / (count - 1)) * FAN_ANGLE_SPAN;
};

// Chỉ phần nội dung marker (tên, pill, avatar, pin) – dùng trong Marker đơn và trong stack.
// showLabel: khi false (trong stack, không phải layer đang hover) thì ẩn tên + pill.
// labelScale: phóng to nhẹ tên + pill khi hover (ví dụ 1.05–1.08).
// markerTheme: 'dark' = chữ/viền đen (bản đồ, địa hình), 'light' = chữ/viền trắng (vệ tinh).
const CrowdReportMarkerBody = ({
  report,
  getReporterReliability,
  offsetPx,
  fanAngle,
  markerScale,
  showLabel = true,
  labelScale = 1,
  markerTheme = 'dark'
}) => {
  const isLight = markerTheme === 'light';
  const textColor = isLight ? '#fff' : '#000';
  const borderColor = isLight ? '#fff' : '#000';
  const pillBg = isLight ? '#fff' : '#000';
  const pillColor = isLight ? '#000' : '#fff';
  const color = getCrowdMarkerColor(report);
  const reporterAvatarFileName = getReportReporterAvatar(report);
  const reporterAvatarUrl = reporterAvatarFileName ? getReporterAvatarUrl(reporterAvatarFileName) : null;
  const reliabilityScore = getReporterReliability ? getReporterReliability(report.reporter_id) : (report.reporter_reliability ?? null);
  const reliabilityPercent = reliabilityScore != null ? Math.round(Number(reliabilityScore)) : null;
  const displayName = report.reporter_name || report.reporter_username || 'Ẩn danh';
  const initials = displayName.trim() ? (displayName.split(/\s+/).length >= 2
    ? (displayName.split(/\s+/)[0].charAt(0) + displayName.split(/\s+/).pop().charAt(0)).toUpperCase()
    : displayName.charAt(0).toUpperCase()) : '?';
  return (
    <>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            transformOrigin: 'bottom center',
            transform: `scale(${labelScale})`
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', color: textColor, marginBottom: '4px', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </div>
          {reliabilityPercent != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: pillBg, color: pillColor, padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
              <FaStar style={{ fontSize: '10px', color: '#ffc107' }} />
              {reliabilityPercent}%
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'transform 0.3s ease',
          transformOrigin: 'bottom center',
          transform: `translate(${offsetPx.x}px, ${offsetPx.y}px) rotate(${fanAngle}deg) scale(${markerScale})`
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `3px solid ${borderColor}`,
            overflow: 'hidden',
            background: reporterAvatarUrl ? undefined : color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {reporterAvatarUrl ? (
              <img src={reporterAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>{initials}</span>
            )}
          </div>
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `14px solid ${borderColor}`,
            marginTop: '-2px'
          }} />
        </div>
      </div>
    </>
  );
};

// Nội dung popup chi tiết báo cáo – dùng trong Marker đơn và trong stack.
const CrowdReportPopupContent = ({ report, lat, lng, getReporterReliability, onClose }) => {
  const [address, setAddress] = useState(report.location_description || null);
  const moderationStatus = report.moderation_status;
  let statusInfo = { color: '#6c757d', text: 'Không xác định' };
  if (moderationStatus === 'approved') {
    const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
    statusInfo = { color: report.flood_level && levelColors[report.flood_level] ? levelColors[report.flood_level] : '#28a745', text: 'Đã duyệt' };
  } else if (moderationStatus === 'rejected') {
    statusInfo = { color: '#dc3545', text: 'Đã từ chối' };
  } else {
    const displayStatus = moderationStatus === 'pending' || !moderationStatus ? report.validation_status : moderationStatus;
    const statusConfig = {
      pending: { color: '#ffc107', text: 'Chờ xét duyệt' },
      verified: { color: '#17a2b8', text: 'Đã xác minh' },
      cross_verified: { color: '#28a745', text: 'Đã xác minh chéo' }
    };
    statusInfo = report.verified_by_sensor ? statusConfig.cross_verified : (statusConfig[displayStatus] || statusInfo);
  }
  const getFloodLevelDesc = (level) => {
    const levels = { 'Nhẹ': 'Đến mắt cá (~10cm)', 'Trung bình': 'Đến đầu gối (~30cm)', 'Nặng': 'Ngập nửa xe (~50cm)' };
    return levels[level] || level;
  };
  useEffect(() => {
    if (!lat || !lng || report.location_description) {
      if (report.location_description) setAddress(report.location_description);
      return;
    }
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setAddress(addr);
    });
    return () => { cancelled = true; };
  }, [lat, lng, report.location_description]);
  return (
    <div style={{ textAlign: 'left', maxHeight: '70vh', overflow: 'auto', padding: '14px 16px', boxSizing: 'border-box' }}>
      <h3 style={{ margin: '0 0 8px 0', color: statusInfo.color, fontSize: '16px', fontWeight: 'bold', paddingLeft: 0 }}>
        <FaMobileScreen style={{ marginRight: '6px', flexShrink: 0 }} /> {report.reporter_name || 'Ẩn danh'}
      </h3>
      <div style={{ fontSize: '12px', color: '#333', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
        <MdLocationOn style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{address === null && !report.location_description ? 'Đang tải địa chỉ...' : (address || report.location_description || `Tọa độ: ${lat?.toFixed(6)}, ${lng?.toFixed(6)}`)}</span>
      </div>
      <div style={{ marginBottom: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
        <strong style={{ fontSize: '16px', color: statusInfo.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WiFlood /> Mức độ: {report.flood_level}
        </strong><br />
        <small>{getFloodLevelDesc(report.flood_level)}</small><br />
        <strong>Trạng thái: </strong>{statusInfo.text}
      </div>
      {report.verified_by_sensor && (
        <div style={{ marginBottom: '8px', padding: '6px', background: '#f0fff4', borderRadius: '4px', fontSize: '12px', color: '#28a745' }}>
          <FaCheck style={{ marginRight: '4px' }} /> Đã xác minh bởi hệ thống cảm biến
        </div>
      )}
      {getReporterReliability && (() => {
        const rel = getReporterReliability(report.reporter_id) ?? report.reporter_reliability;
        return rel != null ? (
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '6px' }}>
            <strong style={{ flexShrink: 0 }}>Độ tin cậy người báo cáo:</strong>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <FaStar style={{ color: '#ffc107' }} />
              <span>{typeof rel === 'number' ? rel.toFixed(1) : rel}/100</span>
            </span>
          </div>
        ) : null;
      })()}
      <div style={{ fontSize: '11px', color: '#999', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <strong>Thời gian:</strong> {new Date(report.created_at).toLocaleString('vi-VN')}
      </div>
    </div>
  );
};

const CrowdReportMarker = ({
  report,
  onSelect,
  getReporterReliability,
  isPopupOpen,
  onOpenPopup,
  onClosePopup,
  position,
  markerScale: markerScaleProp,
  onMarkerMouseEnter,
  onMarkerMouseLeave,
  offsetPx = { x: 0, y: 0 },
  fanAngle = 0,
  markerStyle,
  inStack,
  markerTheme = 'dark'
}) => {
  const [localHovered, setLocalHovered] = useState(false);
  const lat = position?.lat ?? report.lat;
  const lng = position?.lng ?? report.lng;
  const markerScale = markerScaleProp ?? (localHovered ? 1.05 : 1);

  const handleClick = (e) => {
    e.originalEvent.stopPropagation();
    onOpenPopup && onOpenPopup();
    onSelect && onSelect(report);
  };

  const handleMouseEnter = (e) => {
    setLocalHovered(true);
    onMarkerMouseEnter && onMarkerMouseEnter();
  };
  const handleMouseLeave = (e) => {
    setLocalHovered(false);
    onMarkerMouseLeave && onMarkerMouseLeave();
  };

  return (
    <>
      <Marker
        longitude={lng}
        latitude={lat}
        anchor="bottom"
        onClick={handleClick}
        style={markerStyle}
      >
        <div
          style={{
            padding: inStack ? 0 : '20px',
            margin: inStack ? 0 : '-20px',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            lineHeight: 1.2,
            position: 'relative',
            pointerEvents: inStack ? 'none' : undefined
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Vùng nhận hover: khi inStack chỉ phần nội dung, để marker dưới cũng nhận được */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: inStack ? 'auto' : undefined
            }}
          >
            <CrowdReportMarkerBody
              report={report}
              getReporterReliability={getReporterReliability}
              offsetPx={offsetPx}
              fanAngle={fanAngle}
              markerScale={markerScale}
              labelScale={localHovered ? 1.08 : 1}
              markerTheme={markerTheme}
            />
          </div>
        </div>
      </Marker>
      {isPopupOpen && (
        <Popup
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          offset={[0, -40]}
          onClose={() => onClosePopup && onClosePopup()}
          closeButton
          closeOnClick={false}
          maxWidth="380px"
          style={{ minWidth: '340px', borderRadius: '12px', overflow: 'hidden' }}
        >
          <CrowdReportPopupContent report={report} lat={lat} lng={lng} getReporterReliability={getReporterReliability} onClose={onClosePopup} />
        </Popup>
      )}
    </>
  );
};

// Khoảng cách từ mũi pin đến tâm avatar (px) – dùng để tính vị trí marker khi phát hiện hover.
const STACK_AVATAR_OFFSET = 50;

const CrowdReportStack = ({
  reports,
  isSpread,
  onSpreadEnter,
  onSpreadLeave,
  hoveredIndex,
  onMarkerHover,
  onMarkerLeave,
  onSelect,
  getReporterReliability,
  openPopupId,
  onOpenPopup,
  onClosePopup,
  markerTheme = 'dark'
}) => {
  const containerRef = useRef(null);
  const centerLat = reports[0].lat;
  const centerLng = reports[0].lng;
  const n = reports.length;

  const getMarkerCenter = (i) => {
    const anchorX = STACK_HIT_RADIUS;
    const anchorY = STACK_HIT_RADIUS * 2;
    if (isSpread) {
      const angleRad = (getFanAngle(i, n) * Math.PI) / 180;
      return {
        x: anchorX + STACK_AVATAR_OFFSET * Math.sin(angleRad),
        y: anchorY - STACK_AVATAR_OFFSET * Math.cos(angleRad)
      };
    }
    const offset = getStackOffsetPx(i);
    return { x: anchorX + offset.x, y: anchorY - STACK_AVATAR_OFFSET + offset.y };
  };

  const handleHitLayerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const c = getMarkerCenter(i);
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    onSpreadEnter();
    onMarkerHover(best);
  };

  const handleHitLayerLeave = () => {
    onMarkerLeave();
    onSpreadLeave();
  };

  const handleHitLayerClick = (e) => {
    e.stopPropagation();
    const i = hoveredIndex != null ? hoveredIndex : 0;
    if (reports[i]) {
      const report = reports[i];
      onOpenPopup(`crowd-${report.id}`);
      onSelect && onSelect(report);
    }
  };

  // Một Marker duy nhất: các marker con là div position absolute, z-index đưa marker đang hover lên trên.
  const renderOrder =
    hoveredIndex != null
      ? [...Array(n).keys()].filter((i) => i !== hoveredIndex).concat([hoveredIndex])
      : [...Array(n).keys()];

  const size = STACK_HIT_RADIUS * 2;

  return (
    <>
      <Marker longitude={centerLng} latitude={centerLat} anchor="bottom">
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: size,
            height: size
          }}
        >
          {renderOrder.map((i) => {
            const report = reports[i];
            const offsetPx = isSpread ? { x: 0, y: 0 } : getStackOffsetPx(i);
            const fanAngle = isSpread ? getFanAngle(i, n) : 0;
            const scale = hoveredIndex === i ? 1.08 : 1;
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={`crowd-${report.id}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 0,
                  transform: `translate(-50%, 0) translate(${offsetPx.x}px, ${offsetPx.y}px)`,
                  transformOrigin: 'bottom center',
                  transition: 'transform 0.3s ease',
                  zIndex: isHovered ? 10 : 0,
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}
              >
                <CrowdReportMarkerBody
                  report={report}
                  getReporterReliability={getReporterReliability}
                  offsetPx={{ x: 0, y: 0 }}
                  fanAngle={fanAngle}
                  markerScale={scale}
                  showLabel={hoveredIndex == null || hoveredIndex === i}
                  labelScale={hoveredIndex === i ? 1.08 : 1}
                  markerTheme={markerTheme}
                />
              </div>
            );
          })}
          <div
            role="button"
            tabIndex={0}
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
            onMouseMove={handleHitLayerMove}
            onMouseLeave={handleHitLayerLeave}
            onMouseEnter={onSpreadEnter}
            onClick={handleHitLayerClick}
          />
        </div>
      </Marker>
      {reports.map((report) =>
        openPopupId === `crowd-${report.id}` ? (
          <Popup
            key={`popup-${report.id}`}
            longitude={centerLng}
            latitude={centerLat}
            anchor="bottom"
            offset={[0, -40]}
            onClose={() => onClosePopup && onClosePopup()}
            closeButton
            closeOnClick={false}
            maxWidth="380px"
            style={{ minWidth: '340px', borderRadius: '12px', overflow: 'hidden' }}
          >
            <CrowdReportPopupContent report={report} lat={centerLat} lng={centerLng} getReporterReliability={getReporterReliability} onClose={onClosePopup} />
          </Popup>
        ) : null
      )}
    </>
  );
};

const MapView = ({ floodData, crowdReports = [], onSensorSelect, onCrowdReportSelect }) => {
  const { getReporterReliability } = useReporterRanking();
  const [onlineCount, setOnlineCount] = useState(0);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.streets.url);
  const [mapStyleOpen, setMapStyleOpen] = useState(false);
  const [openPopupId, setOpenPopupId] = useState(null);
  const [hoveredStackId, setHoveredStackId] = useState(null);
  const [hoveredStackIndex, setHoveredStackIndex] = useState(null);
  const stackLeaveTimeoutRef = useRef(null);
  const mapRef = useRef(null);
  const hasFittedSensorBounds = useRef(false);

  const handleStackSpreadEnter = (key) => {
    if (stackLeaveTimeoutRef.current) {
      clearTimeout(stackLeaveTimeoutRef.current);
      stackLeaveTimeoutRef.current = null;
    }
    setHoveredStackId(key);
  };
  const handleStackSpreadLeave = () => {
    stackLeaveTimeoutRef.current = setTimeout(() => {
      setHoveredStackId(null);
      setHoveredStackIndex(null);
      stackLeaveTimeoutRef.current = null;
    }, 280);
  };

  useEffect(() => () => {
    if (stackLeaveTimeoutRef.current) clearTimeout(stackLeaveTimeoutRef.current);
  }, []);

  // Tự động zoom đến vùng có sensor khi load trang (lần đầu có floodData)
  useEffect(() => {
    if (hasFittedSensorBounds.current || !floodData?.length) return;
    const points = floodData
      .map((s) => getSensorDisplayPosition(s))
      .filter((p) => p.lat != null && p.lng != null);
    if (points.length === 0) return;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const pad = 0.003;
    const bounds = [
      [Math.min(...lngs) - pad, Math.min(...lats) - pad],
      [Math.max(...lngs) + pad, Math.max(...lats) + pad]
    ];
    const tryFit = () => {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      if (map?.fitBounds) {
        hasFittedSensorBounds.current = true;
        map.fitBounds(bounds, { padding: 50, duration: 800, maxZoom: 15 });
        return true;
      }
      return false;
    };
    if (!tryFit()) {
      const t = setTimeout(tryFit, 400);
      return () => clearTimeout(t);
    }
  }, [floodData]);

  useEffect(() => {
    const fetchOnlineCount = async () => {
      const result = await getOnlineUsersCount();
      setOnlineCount(result.success ? result.count : 0);
    };
    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#666' }}>
        <p>Chưa cấu hình Mapbox token (VITE_MAPBOX_TOKEN trong file .env)</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: defaultLng,
          latitude: defaultLat,
          zoom: DEFAULT_ZOOM
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onClick={() => setOpenPopupId(null)}
      >
        {floodData.map((item, index) => {
          const status = item.status || 'normal';
          const color = statusColors[status] || statusColors.normal;
          const sensorId = item.sensor_id || `sensor-${index}`;
          const isOnline = status !== 'offline';
          return (
            <SensorMarker
              key={sensorId}
              item={item}
              color={color}
              isOnline={isOnline}
              onClick={onSensorSelect}
              isPopupOpen={openPopupId === `sensor-${sensorId}`}
              onOpenPopup={() => setOpenPopupId(`sensor-${sensorId}`)}
              onClosePopup={() => setOpenPopupId(null)}
            />
          );
        })}
        {groupCrowdReportsByPosition(crowdReports).map(({ key: posKey, reports: groupReports }) =>
          groupReports.length === 1 ? (
            <CrowdReportMarker
              key={`crowd-${groupReports[0].id}`}
              report={groupReports[0]}
              onSelect={onCrowdReportSelect}
              getReporterReliability={getReporterReliability}
              isPopupOpen={openPopupId === `crowd-${groupReports[0].id}`}
              onOpenPopup={() => setOpenPopupId(`crowd-${groupReports[0].id}`)}
              onClosePopup={() => setOpenPopupId(null)}
              markerTheme={mapStyle === MAP_STYLES.satellite.url || mapStyle === MAP_STYLES.satelliteStreets.url ? 'light' : 'dark'}
            />
          ) : (
            <CrowdReportStack
              key={`stack-${posKey}`}
              reports={groupReports}
              isSpread={hoveredStackId === posKey}
              onSpreadEnter={() => handleStackSpreadEnter(posKey)}
              onSpreadLeave={handleStackSpreadLeave}
              hoveredIndex={hoveredStackId === posKey ? hoveredStackIndex : null}
              onMarkerHover={(i) => setHoveredStackIndex(i)}
              onMarkerLeave={() => setHoveredStackIndex(null)}
              onSelect={onCrowdReportSelect}
              getReporterReliability={getReporterReliability}
              openPopupId={openPopupId}
              onOpenPopup={(id) => setOpenPopupId(id)}
              onClosePopup={() => setOpenPopupId(null)}
              markerTheme={mapStyle === MAP_STYLES.satellite.url || mapStyle === MAP_STYLES.satelliteStreets.url ? 'light' : 'dark'}
            />
          )
        )}
      </Map>

      {/* Chế độ xem bản đồ – nút tròn + dropdown gọn */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
        <button
          type="button"
          onClick={() => setMapStyleOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: mapStyleOpen
              ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            color: mapStyleOpen ? '#fff' : '#2563eb',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            transition: 'box-shadow 0.2s, transform 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Chế độ xem bản đồ"
        >
          <FaLayerGroup style={{ fontSize: '24px', flexShrink: 0 }} />
        </button>
        {mapStyleOpen && (
          <div style={{
            position: 'absolute',
            top: '56px',
            left: '0',
            display: 'flex',
            flexDirection: 'column',
            width: 'max-content',
            padding: '6px 0',
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            {Object.values(MAP_STYLES).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setMapStyle(s.url);
                  setMapStyleOpen(false);
                }}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  background: mapStyle === s.url ? 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)' : 'transparent',
                  color: mapStyle === s.url ? '#fff' : '#334155',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (mapStyle !== s.url) e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (mapStyle !== s.url) e.currentTarget.style.background = 'transparent';
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
          <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px', fontWeight: '500' }}>Lượt truy cập</div>
          <div style={{ height: '1px', background: '#e0e0e0', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745', marginBottom: '8px', lineHeight: '1' }}>{onlineCount}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Đang online</div>
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
          <img src="/iuh.png" alt="IUH Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
    </div>
  );
};

export default MapView;
