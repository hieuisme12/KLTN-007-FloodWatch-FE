import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { statusColors, DEFAULT_CENTER, DEFAULT_ZOOM } from '../../utils/constants';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { getSensorDisplayPosition } from '../../data/sensorOverrides';
import { FaMobileScreen, FaCheck, FaXmark, FaClock, FaStar, FaCircle, FaLayerGroup } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { getOnlineUsersCount, fetchFusionPoints, fetchCombinedHeatmap, getProfile } from '../../services/api';
import { API_CONFIG } from '../../config/apiConfig';
import {
  fusionCmToColor,
  fusionCmToMarkerRadius,
  getFusionCoverageLabel,
  getConfidenceRingColor
} from '../../utils/scoringDisplay';
import ConfidenceBadge from '../common/ConfidenceBadge';
import { useReporterRanking } from '../../context/ReporterRankingProvider';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import SensorMarker from './SensorMarker';
import UserLocationMarker from './UserLocationMarker';

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

/** C2: chuẩn hóa điểm heatmap → GeoJSON cho Mapbox heatmap layer */
const buildHeatmapGeoJSON = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }
  const features = [];
  rows.forEach((row, i) => {
    const lat = row?.lat ?? row?.latitude;
    const lng = row?.lng ?? row?.longitude;
    if (lat == null || lng == null) return;
    const rawW =
      row.weight ?? row.intensity ?? row.value ?? row.count ?? row.density ?? row.score ?? 1;
    const w = Math.min(20, Math.max(0.15, Number(rawW) || 1));
    features.push({
      type: 'Feature',
      id: `h-${i}`,
      properties: { w },
      geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] }
    });
  });
  return { type: 'FeatureCollection', features };
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
  const confRing =
    report.moderation_status === 'approved' && report.confidence != null
      ? getConfidenceRingColor(report.confidence)
      : null;
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
            flexShrink: 0,
            boxShadow: confRing ? `0 0 0 3px ${confRing}` : undefined
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
const CrowdReportPopupContent = ({ report, lat, lng, getReporterReliability }) => {
  const desc = report.location_description || null;
  const [fetchedAddress, setFetchedAddress] = useState(null);
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
    if (!lat || !lng || desc) {
      return;
    }
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setFetchedAddress(addr);
    });
    return () => { cancelled = true; };
  }, [lat, lng, desc]);
  return (
    <div style={{ textAlign: 'left', maxHeight: '70vh', overflow: 'auto', padding: '14px 16px', boxSizing: 'border-box' }}>
      <h3 style={{ margin: '0 0 8px 0', color: statusInfo.color, fontSize: '16px', fontWeight: 'bold', paddingLeft: 0 }}>
        <FaMobileScreen style={{ marginRight: '6px', flexShrink: 0 }} /> {report.reporter_name || 'Ẩn danh'}
      </h3>
      <div style={{ fontSize: '12px', color: '#333', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
        <MdLocationOn style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          {!desc && fetchedAddress === null && lat && lng
            ? 'Đang tải địa chỉ...'
            : desc || fetchedAddress || (lat != null && lng != null ? `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}` : '—')}
        </span>
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
      {report.confidence != null && (
        <div style={{ marginBottom: '8px' }}>
          <ConfidenceBadge
            confidence={report.confidence}
            breakdown={report.confidence_breakdown}
            showBreakdownToggle
          />
        </div>
      )}
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

  const handleMouseEnter = () => {
    setLocalHovered(true);
    onMarkerMouseEnter && onMarkerMouseEnter();
  };
  const handleMouseLeave = () => {
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
          <CrowdReportPopupContent
            key={`popup-${report.id}-${lat}-${lng}`}
            report={report}
            lat={lat}
            lng={lng}
            getReporterReliability={getReporterReliability}
          />
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
            <CrowdReportPopupContent
              key={`stack-popup-${report.id}-${centerLat}-${centerLng}`}
              report={report}
              lat={centerLat}
              lng={centerLng}
              getReporterReliability={getReporterReliability}
            />
          </Popup>
        ) : null
      )}
    </>
  );
};

const FusionCrowdMarker = ({ point, mode, popupKey, openPopupId, setOpenPopupId, markerTheme }) => {
  const cm = mode === 'fused' ? point.fused_cm : point.crowd_only_cm;
  const color = fusionCmToColor(cm);
  const r = fusionCmToMarkerRadius(cm);
  const isLight = markerTheme === 'light';
  const border = isLight ? '#fff' : '#1e293b';
  const isOpen = openPopupId === popupKey;
  return (
    <>
      <Marker
        longitude={point.lng}
        latitude={point.lat}
        anchor="center"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setOpenPopupId(isOpen ? null : popupKey);
        }}
      >
        <div
          style={{
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: color,
            border: `2px solid ${border}`,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
          }}
          title={mode === 'fused' ? 'Kết hợp với cảm biến' : 'Chỉ theo báo cáo người dân'}
        />
      </Marker>
      {isOpen && (
        <Popup
          longitude={point.lng}
          latitude={point.lat}
          anchor="bottom"
          offset={[0, -r]}
          onClose={() => setOpenPopupId(null)}
          closeButton
          closeOnClick={false}
          maxWidth="320px"
        >
          <div style={{ padding: '10px 12px', fontSize: '12px', color: '#333' }}>
            <strong style={{ display: 'block', marginBottom: '8px' }}>Điểm ước tính ngập</strong>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Theo báo cáo: </span>
              <strong>{point.crowd_only_cm != null ? `${Number(point.crowd_only_cm).toFixed(1)} cm` : '—'}</strong>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Sau khi kết hợp cảm biến: </span>
              <strong>{point.fused_cm != null ? `${Number(point.fused_cm).toFixed(1)} cm` : '—'}</strong>
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Phủ sóng: </span>
              {getFusionCoverageLabel(point.coverage)}
            </div>
            {point.nearest_sensor && (
              <div style={{ marginBottom: '6px', fontSize: '11px' }}>
                Cảm biến gần nhất: <strong>{typeof point.nearest_sensor === 'object' ? point.nearest_sensor.sensor_id || JSON.stringify(point.nearest_sensor) : point.nearest_sensor}</strong>
              </div>
            )}
            {point.weights && typeof point.weights === 'object' && (
              <details style={{ fontSize: '11px', marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer' }}>Chi tiết đóng góp nguồn dữ liệu</summary>
                <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(point.weights, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </Popup>
      )}
    </>
  );
};

const MapView = ({
  floodData,
  crowdReports = [],
  onSensorSelect,
  onCrowdReportSelect,
  fusionEnabled: fusionEnabledProp,
  onFusionEnabledChange,
  /** Trang chủ (dashboard): false — ẩn lớp trộn. Trang /map: true (mặc định) */
  showFusionLayer = true,
  /** C2: lớp nhiệt kết hợp sensor + crowd (public API) */
  heatmapEnabled = false
}) => {
  const { getReporterReliability } = useReporterRanking();
  const [fusionInternal, setFusionInternal] = useState(false);
  const fusionEnabled = fusionEnabledProp !== undefined ? fusionEnabledProp : fusionInternal;
  const effectiveFusionEnabled = showFusionLayer && fusionEnabled;
  const setFusionEnabled = (v) => {
    if (onFusionEnabledChange) onFusionEnabledChange(v);
    else setFusionInternal(v);
  };
  const [fusionWaterMode, setFusionWaterMode] = useState('fused');
  const [fusionCrowd, setFusionCrowd] = useState([]);
  const [fusionPanelOpen, setFusionPanelOpen] = useState(false);
  const [heatGeoJSON, setHeatGeoJSON] = useState(() => ({ type: 'FeatureCollection', features: [] }));
  const [onlineCount, setOnlineCount] = useState(0);
  const [mapStyle, setMapStyle] = useState(MAP_STYLES.streets.url);
  const [mapStyleOpen, setMapStyleOpen] = useState(false);
  const [openPopupId, setOpenPopupId] = useState(null);
  /**
   * Vị trí trên bản đồ: `gps` = Geolocation của **thiết bị/trình duyệt đang mở** (không lấy từ máy khác qua mạng).
   * `profile` = last_known từ tài khoản đang đăng nhập (server). Đổi user → reset theo user hiện tại.
   */
  const [userLocation, setUserLocation] = useState(null);
  const [authUserKey, setAuthUserKey] = useState(() => {
    const u = getCurrentUser();
    return u ? `u:${u.id ?? u.user_id ?? u.username ?? ''}` : 'guest';
  });

  useEffect(() => {
    const syncKey = () => {
      const u = getCurrentUser();
      setAuthUserKey(u ? `u:${u.id ?? u.user_id ?? u.username ?? ''}` : 'guest');
    };
    window.addEventListener('user-updated', syncKey);
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'authToken') syncKey();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('user-updated', syncKey);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      setUserLocation((prev) => (prev?.source === 'gps' ? prev : null));
      return;
    }
    const u = getCurrentUser();
    const lat = u?.last_known_lat ?? u?.last_known_latitude;
    const lng = u?.last_known_lng ?? u?.last_known_longitude;
    if (lat != null && lng != null) {
      const acc = u.last_location_accuracy_m ?? u.last_location_accuracy;
      setUserLocation((prev) => {
        if (prev?.source === 'gps') return prev;
        return {
          lat: Number(lat),
          lng: Number(lng),
          accuracy: acc != null ? Number(acc) : null,
          source: 'profile'
        };
      });
      return;
    }
    setUserLocation((prev) => (prev?.source === 'gps' ? prev : null));
  }, [authUserKey]);
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

  useEffect(() => {
    if (!effectiveFusionEnabled) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      const res = await fetchFusionPoints({
        crowd_hours: 24,
        sensor_hours: 1,
        include_sensors: 'false'
      });
      if (!cancelled && res.success && res.data?.crowd) {
        setFusionCrowd(res.data.crowd);
      }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [effectiveFusionEnabled]);

  useEffect(() => {
    if (!heatmapEnabled) {
      queueMicrotask(() => setHeatGeoJSON({ type: 'FeatureCollection', features: [] }));
      return;
    }
    let cancelled = false;
    const load = async () => {
      const res = await fetchCombinedHeatmap({ hours: 24 });
      if (cancelled) return;
      setHeatGeoJSON(buildHeatmapGeoJSON(res.success ? res.data : []));
    };
    load();
    const iv = setInterval(load, 120000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [heatmapEnabled]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
          source: 'gps'
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 25000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const u = getCurrentUser();
    if (u?.last_known_lat != null && u?.last_known_lng != null) return;
    let cancelled = false;
    (async () => {
      const r = await getProfile();
      if (cancelled || !r.success || !r.data) return;
      const d = r.data;
      const lat = d.last_known_lat ?? d.last_known_latitude;
      const lng = d.last_known_lng ?? d.last_known_longitude;
      if (lat == null || lng == null) return;
      const acc = d.last_location_accuracy_m ?? d.last_location_accuracy;
      setUserLocation((prev) => {
        if (prev?.source === 'gps') return prev;
        return {
          lat: Number(lat),
          lng: Number(lng),
          accuracy: acc != null ? Number(acc) : null,
          source: 'profile'
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserKey]);

  const displayCrowdReports = effectiveFusionEnabled ? [] : crowdReports;
  const markerTheme =
    mapStyle === MAP_STYLES.satellite.url || mapStyle === MAP_STYLES.satelliteStreets.url ? 'light' : 'dark';

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
        {heatmapEnabled && heatGeoJSON.features.length > 0 && (
          <Source id="combined-heat" type="geojson" data={heatGeoJSON}>
            <Layer
              id="combined-heat-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'w'], 0, 0, 20, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 1.4],
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0,
                  'rgba(33,102,172,0)',
                  0.25,
                  'rgb(103,169,207)',
                  0.5,
                  'rgb(253,219,199)',
                  0.75,
                  'rgb(239,138,98)',
                  1,
                  'rgb(178,24,43)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 22],
                'heatmap-opacity': 0.72
              }}
            />
          </Source>
        )}
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
        {groupCrowdReportsByPosition(displayCrowdReports).map(({ key: posKey, reports: groupReports }) =>
          groupReports.length === 1 ? (
            <CrowdReportMarker
              key={`crowd-${groupReports[0].id}`}
              report={groupReports[0]}
              onSelect={onCrowdReportSelect}
              getReporterReliability={getReporterReliability}
              isPopupOpen={openPopupId === `crowd-${groupReports[0].id}`}
              onOpenPopup={() => setOpenPopupId(`crowd-${groupReports[0].id}`)}
              onClosePopup={() => setOpenPopupId(null)}
              markerTheme={markerTheme}
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
              markerTheme={markerTheme}
            />
          )
        )}
        {effectiveFusionEnabled &&
          fusionCrowd.map((pt, idx) => (
            <FusionCrowdMarker
              key={`fc-${idx}-${pt.lat}-${pt.lng}`}
              point={pt}
              mode={fusionWaterMode}
              popupKey={`fusion-${idx}-${pt.lat}-${pt.lng}`}
              openPopupId={openPopupId}
              setOpenPopupId={setOpenPopupId}
              markerTheme={markerTheme}
            />
          ))}
        {userLocation &&
          userLocation.lat != null &&
          userLocation.lng != null &&
          Number.isFinite(userLocation.lat) &&
          Number.isFinite(userLocation.lng) && (
            <UserLocationMarker
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              accuracy={userLocation.accuracy}
              source={userLocation.source}
              mapTheme={markerTheme === 'light' ? 'light' : 'dark'}
            />
          )}
      </Map>

      {showFusionLayer && (
      <div style={{ position: 'absolute', top: '80px', left: '20px', zIndex: 100, maxWidth: '260px' }}>
        <button
          type="button"
          onClick={() => setFusionPanelOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.08)',
            background: fusionEnabled ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#fff',
            color: fusionEnabled ? '#fff' : '#334155',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          Trộn dữ liệu
          <span style={{ opacity: 0.85 }}>{fusionEnabled ? 'Bật' : 'Tắt'}</span>
        </button>
        {fusionPanelOpen && (
          <div
            style={{
              marginTop: '8px',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.98)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
              fontSize: '12px',
              color: '#334155'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={fusionEnabled}
                onChange={(e) => setFusionEnabled(e.target.checked)}
              />
              Hiển thị lớp trộn trên bản đồ
            </label>
            <div style={{ marginBottom: '8px', fontWeight: '600' }}>Cách tính mực nước hiển thị</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '6px' }}>
              <input
                type="radio"
                name="fusionWater"
                checked={fusionWaterMode === 'crowd_only'}
                onChange={() => setFusionWaterMode('crowd_only')}
              />
              Chỉ theo báo cáo người dân
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '10px' }}>
              <input
                type="radio"
                name="fusionWater"
                checked={fusionWaterMode === 'fused'}
                onChange={() => setFusionWaterMode('fused')}
              />
              Kết hợp với cảm biến gần đó
            </label>
            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
              Màu điểm theo mực nước ước tính: dưới 10 cm nhạt, 10–30 cm xanh, 30–50 cm vàng, từ 50 cm đỏ.
              Khi bật lớp này, các điểm báo cáo thường trên bản đồ tạm ẩn để dễ nhìn.
            </div>
          </div>
        )}
      </div>
      )}

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
