import React, { useEffect, useState } from 'react';
import { FaCircle, FaMobileScreen, FaCheck, FaStar } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { getStatusLabel, getVelocityLabel } from '../../utils/markerUtils';
import { statusColors } from '../../utils/constants';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { getSensorDisplayAddress } from '../../data/sensorOverrides';
import { useReporterRanking } from '../../context/ReporterRankingContext';
import ReportEvaluationWidget from '../reports/ReportEvaluationWidget';
import './SensorDetailPanel.css';

const PANEL_TITLE = 'CHI TIẾT VỊ TRÍ';

const SensorDetailPanel = ({ sensor, crowdReport }) => {
  const { getReporterReliability } = useReporterRanking();
  const [reportAddress, setReportAddress] = useState(crowdReport?.location_description || null);
  const [sensorAddress, setSensorAddress] = useState(null);

  useEffect(() => {
    if (!crowdReport || crowdReport.location_description) {
      setReportAddress(crowdReport?.location_description || null);
      return;
    }
    const lat = crowdReport.lat;
    const lng = crowdReport.lng;
    if (lat == null || lng == null) return;
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setReportAddress(addr);
    });
    return () => { cancelled = true; };
  }, [crowdReport?.id, crowdReport?.lat, crowdReport?.lng, crowdReport?.location_description]);

  useEffect(() => {
    if (!sensor) {
      setSensorAddress(null);
      return;
    }
    const override = getSensorDisplayAddress(sensor);
    if (override) {
      setSensorAddress(override);
      return;
    }
    const lat = sensor.lat;
    const lng = sensor.lng;
    if (lat == null || lng == null) {
      setSensorAddress(null);
      return;
    }
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setSensorAddress(addr);
    });
    return () => { cancelled = true; };
  }, [sensor?.sensor_id, sensor?.location_name, sensor?.lat, sensor?.lng, sensor?.address]);

  // Không chọn gì: hướng dẫn chọn điểm
  if (!sensor && !crowdReport) {
    return (
      <div className="sensor-detail-panel">
        <div className="sensor-detail-header">
          <h3 className="sensor-detail-title">{PANEL_TITLE}</h3>
        </div>
        <div className="sensor-detail-content">
          <div className="sensor-detail-empty">
            Chọn một điểm trên bản đồ (cảm biến hoặc báo cáo người dân) để xem chi tiết.
          </div>
        </div>
      </div>
    );
  }

  // Đang chọn báo cáo người dân
  if (crowdReport) {
    const moderationStatus = crowdReport.moderation_status;
    let statusInfo = { color: '#6c757d', text: 'Không xác định' };
    if (moderationStatus === 'approved') {
      const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
      statusInfo = {
        color: crowdReport.flood_level && levelColors[crowdReport.flood_level] ? levelColors[crowdReport.flood_level] : '#28a745',
        text: 'Đã duyệt'
      };
    } else if (moderationStatus === 'rejected') {
      statusInfo = { color: '#dc3545', text: 'Đã từ chối' };
    } else {
      const displayStatus = moderationStatus === 'pending' || !moderationStatus ? crowdReport.validation_status : moderationStatus;
      const statusConfig = {
        pending: { color: '#ffc107', text: 'Chờ xét duyệt' },
        verified: { color: '#17a2b8', text: 'Đã xác minh' },
        cross_verified: { color: '#28a745', text: 'Đã xác minh chéo' }
      };
      statusInfo = crowdReport.verified_by_sensor ? statusConfig.cross_verified : (statusConfig[displayStatus] || statusInfo);
    }
    const levelDesc = { 'Nhẹ': 'Đến mắt cá (~10cm)', 'Trung bình': 'Đến đầu gối (~30cm)', 'Nặng': 'Ngập nửa xe (~50cm)' };
    const floodLevelDesc = levelDesc[crowdReport.flood_level] || crowdReport.flood_level;

    return (
      <div className="sensor-detail-panel">
        <div className="sensor-detail-header">
          <h3 className="sensor-detail-title">{PANEL_TITLE}</h3>
        </div>
        <div className="sensor-detail-content">
          <div className="sensor-detail-status-badge">
            <span className="sensor-report-type-badge">
              <FaMobileScreen style={{ marginRight: '6px' }} /> Báo cáo người dân
            </span>
          </div>
          <div className="sensor-detail-item sensor-detail-location">
            <span className="sensor-detail-label"><MdLocationOn style={{ marginRight: '4px' }} /> Địa chỉ:</span>
            <span className="sensor-detail-value">
              {reportAddress === null && !crowdReport.location_description ? 'Đang tải địa chỉ...' : (reportAddress || crowdReport.location_description || `Tọa độ: ${crowdReport.lat?.toFixed(6)}, ${crowdReport.lng?.toFixed(6)}`)}
            </span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">Người báo cáo:</span>
            <span className="sensor-detail-value">{crowdReport.reporter_name || 'Ẩn danh'}</span>
          </div>
          <div className="sensor-detail-item sensor-detail-water-level">
            <span className="sensor-detail-label"><WiFlood style={{ marginRight: '6px' }} /> Mức độ ngập:</span>
            <span className="sensor-detail-value" style={{ color: statusInfo.color, fontWeight: 'bold' }}>
              {crowdReport.flood_level || '—'}
            </span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">Mô tả mức độ:</span>
            <span className="sensor-detail-value">{floodLevelDesc}</span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">Trạng thái:</span>
            <span className="sensor-detail-value" style={{ color: statusInfo.color }}>{statusInfo.text}</span>
          </div>
          {crowdReport.verified_by_sensor && (
            <div className="sensor-detail-item" style={{ color: '#28a745', fontSize: '13px' }}>
              <FaCheck style={{ marginRight: '6px' }} /> Đã xác minh bởi hệ thống cảm biến
            </div>
          )}
          {(() => {
            const rel = getReporterReliability(crowdReport.reporter_id) ?? crowdReport.reporter_reliability ?? null;
            return rel != null ? (
              <div className="sensor-detail-item">
                <span className="sensor-detail-label">Độ tin cậy người báo cáo:</span>
                <span className="sensor-detail-value"><FaStar style={{ marginRight: '4px', color: '#ffc107' }} /> {typeof rel === 'number' ? rel.toFixed(1) : rel}/100</span>
              </div>
            ) : null;
          })()}
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">Thời gian báo cáo:</span>
            <span className="sensor-detail-value">
              {crowdReport.created_at ? new Date(crowdReport.created_at).toLocaleString('vi-VN') : '—'}
            </span>
          </div>
          <ReportEvaluationWidget reportId={crowdReport.id} reporterId={crowdReport.reporter_id} />
        </div>
      </div>
    );
  }

  // Đang chọn cảm biến
  const status = sensor.status || 'normal';
  const color = statusColors[status] || statusColors.normal;
  const isOnline = status !== 'offline';

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
        <h3 className="sensor-detail-title">{PANEL_TITLE}</h3>
      </div>
      <div className="sensor-detail-content">
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
        <div className="sensor-detail-update-date">
          Ngày cập nhật: {formatDate(sensor.last_data_time || sensor.created_at)}
        </div>
        <div className="sensor-detail-update-message">
          Dữ liệu hiện đang được cập nhật!
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Sensor ID:</span>
          <span className="sensor-detail-value">{sensor.sensor_id}</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Model:</span>
          <span className="sensor-detail-value">{sensor.model}</span>
        </div>
        <div className="sensor-detail-item sensor-detail-water-level">
          <span className="sensor-detail-label">
            <WiFlood style={{ marginRight: '6px', fontSize: '18px' }} />
            Mực nước:
          </span>
          <span className="sensor-detail-value" style={{ color: color, fontSize: '18px', fontWeight: 'bold' }}>
            {sensor.water_level?.toFixed(1) || '0.0'} cm
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Trạng thái:</span>
          <span className="sensor-detail-value" style={{ color: color }}>
            {getStatusLabel(status)}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Vận tốc:</span>
          <span className="sensor-detail-value">{getVelocityLabel(sensor.velocity)}</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Nhiệt độ:</span>
          <span className="sensor-detail-value">
            {sensor.temperature != null ? `${sensor.temperature.toFixed(1)} °C` : '—'}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Độ ẩm:</span>
          <span className="sensor-detail-value">
            {sensor.humidity != null ? `${sensor.humidity.toFixed(0)} %` : '—'}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Ngưỡng cảnh báo:</span>
          <span className="sensor-detail-value">{sensor.warning_threshold} cm</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">Ngưỡng nguy hiểm:</span>
          <span className="sensor-detail-value">{sensor.danger_threshold} cm</span>
        </div>
        <div className="sensor-detail-item sensor-detail-location">
          <span className="sensor-detail-label">Trạm:</span>
          <span className="sensor-detail-value">{sensor.location_name}</span>
        </div>
        <div className="sensor-detail-item sensor-detail-location">
          <span className="sensor-detail-label"><MdLocationOn style={{ marginRight: '4px' }} /> Địa chỉ:</span>
          <span className="sensor-detail-value">
            {sensorAddress !== null ? (sensorAddress || sensor.address || sensor.location_address || '—') : 'Đang tải địa chỉ...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SensorDetailPanel;
