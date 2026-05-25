import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircle, FaMobileScreen, FaCheck, FaStar } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { getStatusLabel, getVelocityLabel } from '../../utils/markerUtils';
import { statusColors } from '../../utils/constants';
import { fetchAddressFromCoords } from '../../utils/geocode';
import { getSensorDisplayAddress, getSensorDisplayName } from '../../data/sensorOverrides';
import { useReporterRanking } from '../../context/ReporterRankingProvider';
import ReportEvaluationWidget from '../reports/ReportEvaluationWidget';
import SensorForecastSection from './SensorForecastSection';
import ConfidenceBadge from '../common/ConfidenceBadge';
import {
  getFloodLevelColor,
  getFloodLevelLabel,
  getCrowdReportFloodAccentColor
} from '../../utils/floodLevels';
import {
  getReportModerationDisplay,
  getReportValidationSubline,
  isReportValidationBySensor
} from '../../utils/reportDisplayStatus';

const SensorDetailPanel = ({ sensor, crowdReport }) => {
  const { t, i18n } = useTranslation();
  const { getReporterReliability } = useReporterRanking();
  const reportDesc = crowdReport?.location_description || null;
  const [reportFetched, setReportFetched] = useState(null);
  const sensorStaticAddr = sensor ? getSensorDisplayAddress(sensor) : null;
  const [sensorFetched, setSensorFetched] = useState(null);

  useEffect(() => {
    if (!crowdReport || reportDesc) {
      return;
    }
    const lat = crowdReport.lat;
    const lng = crowdReport.lng;
    if (lat == null || lng == null) return;
    let cancelled = false;
    fetchAddressFromCoords(lat, lng).then((addr) => {
      if (!cancelled) setReportFetched(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [crowdReport?.id, crowdReport?.lat, crowdReport?.lng, reportDesc]); // eslint-disable-line react-hooks/exhaustive-deps -- geocode theo id/lat/lng/mô tả, không theo object crowdReport

  useEffect(
    () => {
      if (!sensor || sensorStaticAddr) {
        return;
      }
      const lat = sensor.lat;
      const lng = sensor.lng;
      if (lat == null || lng == null) return;
      let cancelled = false;
      fetchAddressFromCoords(lat, lng).then((addr) => {
        if (!cancelled) setSensorFetched(addr);
      });
      return () => {
        cancelled = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- geocode theo trường cụ thể, không theo tham chiếu sensor
    [sensor?.sensor_id, sensor?.lat, sensor?.lng, sensor?.address, sensor?.location_name, sensorStaticAddr],
  );

  // Không chọn gì: hướng dẫn chọn điểm
  if (!sensor && !crowdReport) {
    return (
      <div className="sensor-detail-panel">
        <div className="sensor-detail-header">
          <h3 className="sensor-detail-title">{t('reportUi.panelTitle')}</h3>
        </div>
        <div className="sensor-detail-content">
          <div className="sensor-detail-empty">
            {t('reportUi.sensorPanel.emptyHint')}
          </div>
        </div>
      </div>
    );
  }

  // Đang chọn báo cáo người dân
  if (crowdReport) {
    const moderationInfo = getReportModerationDisplay(crowdReport, t);
    const validationSubline = getReportValidationSubline(crowdReport, t);
    const levelColor = getCrowdReportFloodAccentColor(crowdReport);
    const floodLevelDesc = getFloodLevelLabel(crowdReport.flood_level, t);

    return (
      <div className="sensor-detail-panel">
        <div className="sensor-detail-header">
          <h3 className="sensor-detail-title">{t('reportUi.panelTitle')}</h3>
        </div>
        <div className="sensor-detail-content">
          <div className="sensor-detail-status-badge">
            <span className="sensor-report-type-badge">
              <FaMobileScreen style={{ marginRight: '6px' }} /> {t('reportUi.crowdReport')}
            </span>
          </div>
          <div className="sensor-detail-item sensor-detail-location">
            <span className="sensor-detail-label"><MdLocationOn style={{ marginRight: '4px' }} /> {t('reportUi.address')}</span>
            <span className="sensor-detail-value">
              {!reportDesc && reportFetched === null && crowdReport.lat != null && crowdReport.lng != null
                ? t('reportUi.addressLoading')
                : reportDesc ||
                  reportFetched ||
                  (crowdReport.lat != null && crowdReport.lng != null
                    ? t('reportUi.coordLabel', { lat: crowdReport.lat.toFixed(6), lng: crowdReport.lng.toFixed(6) })
                    : '—')}
            </span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">{t('reportUi.reporter')}</span>
            <span className="sensor-detail-value">{crowdReport.reporter_name || t('reportUi.anonymous')}</span>
          </div>
          <div className="sensor-detail-item sensor-detail-water-level">
            <span className="sensor-detail-label"><WiFlood style={{ marginRight: '6px' }} /> {t('reportUi.floodLevel')}</span>
            <span className="sensor-detail-value" style={{ color: levelColor, fontWeight: 'bold' }}>
              {getFloodLevelLabel(crowdReport.flood_level, t) || '—'}
            </span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">{t('reportUi.levelDescLabel')}</span>
            <span className="sensor-detail-value">{floodLevelDesc}</span>
          </div>
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">{t('reportUi.status')}</span>
            <span className="sensor-detail-value" style={{ color: moderationInfo.color }}>
              {moderationInfo.text}
              {validationSubline ? (
                <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {validationSubline}
                </span>
              ) : null}
            </span>
          </div>
          {isReportValidationBySensor(crowdReport) && (
            <div className="sensor-detail-item" style={{ color: '#28a745', fontSize: '13px' }}>
              <FaCheck style={{ marginRight: '6px' }} /> {t('reportUi.sensorVerified')}
            </div>
          )}
          {crowdReport.confidence != null && (
            <div className="sensor-detail-item sensor-detail-confidence">
              <ConfidenceBadge
                confidence={crowdReport.confidence}
                breakdown={crowdReport.confidence_breakdown}
                showBreakdownToggle
              />
            </div>
          )}
          {(() => {
            const rel = getReporterReliability(crowdReport.reporter_id) ?? crowdReport.reporter_reliability ?? null;
            return rel != null ? (
              <div className="sensor-detail-item">
                <span className="sensor-detail-label">{t('reportUi.reporterConfidence')}</span>
                <span className="sensor-detail-value"><FaStar style={{ marginRight: '4px', color: '#ffc107' }} /> {typeof rel === 'number' ? rel.toFixed(1) : rel}/100</span>
              </div>
            ) : null;
          })()}
          <div className="sensor-detail-item">
            <span className="sensor-detail-label">{t('reportUi.reportTime')}</span>
            <span className="sensor-detail-value">
              {crowdReport.created_at
                ? new Date(crowdReport.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
                : '—'}
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
    if (!dateString) return t('reportUi.sensorPanel.na');
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
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
        <h3 className="sensor-detail-title">{t('reportUi.panelTitle')}</h3>
      </div>
      <div className="sensor-detail-content">
        <div className="sensor-detail-status-badge">
          {isOnline ? (
            <span className="sensor-live-badge">
              <FaCircle style={{ color: '#dc3545', fontSize: '10px' }} />{t('reportUi.sensorPanel.liveBadge')}
            </span>
          ) : (
            <span className="sensor-offline-badge">
              <FaCircle style={{ color: '#6c757d', fontSize: '10px' }} />{t('reportUi.sensorPanel.offlineBadge')}
            </span>
          )}
        </div>
        <div className="sensor-detail-update-date">
          {t('reportUi.sensorPanel.updateDateLabel')}: {formatDate(sensor.last_data_time || sensor.created_at)}
        </div>
        <div className="sensor-detail-update-message">
          {t('reportUi.sensorPanel.updatingMessage')}
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.sensorId')}:</span>
          <span className="sensor-detail-value">{sensor.sensor_id}</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.model')}:</span>
          <span className="sensor-detail-value">{sensor.model}</span>
        </div>
        <div className="sensor-detail-item sensor-detail-water-level">
          <span className="sensor-detail-label">
            <WiFlood style={{ marginRight: '6px', fontSize: '18px' }} />
            {t('reportUi.sensorPanel.waterLevel')}:
          </span>
          <span className="sensor-detail-value" style={{ color: color, fontSize: '18px', fontWeight: 'bold' }}>
            {sensor.water_level?.toFixed(1) || '0.0'} cm
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.status')}</span>
          <span className="sensor-detail-value" style={{ color: color }}>
            {getStatusLabel(status, t)}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.velocity')}:</span>
          <span className="sensor-detail-value">{getVelocityLabel(sensor.velocity, t)}</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.temperature')}:</span>
          <span className="sensor-detail-value">
            {sensor.temperature != null ? `${sensor.temperature.toFixed(1)} °C` : '—'}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.humidity')}:</span>
          <span className="sensor-detail-value">
            {sensor.humidity != null ? `${sensor.humidity.toFixed(0)} %` : '—'}
          </span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.warningThreshold')}:</span>
          <span className="sensor-detail-value">{sensor.warning_threshold} cm</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.elevatedThreshold')}:</span>
          <span className="sensor-detail-value">{sensor.elevated_threshold} cm</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.dangerThreshold')}:</span>
          <span className="sensor-detail-value">{sensor.danger_threshold} cm</span>
        </div>
        <div className="sensor-detail-item">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.criticalThreshold')}:</span>
          <span className="sensor-detail-value">{sensor.critical_threshold} cm</span>
        </div>
        <div className="sensor-detail-item sensor-detail-location">
          <span className="sensor-detail-label">{t('reportUi.sensorPanel.station')}:</span>
          <span className="sensor-detail-value">{getSensorDisplayName(sensor)}</span>
        </div>
        <div className="sensor-detail-item sensor-detail-location">
          <span className="sensor-detail-label"><MdLocationOn style={{ marginRight: '4px' }} /> {t('reportUi.address')}</span>
          <span className="sensor-detail-value">
            {!sensorStaticAddr && sensorFetched === null && sensor.lat != null && sensor.lng != null
              ? t('reportUi.addressLoading')
              : sensorStaticAddr ||
                sensorFetched ||
                sensor.address ||
                sensor.location_address ||
                '—'}
          </span>
        </div>
        <SensorForecastSection key={`forecast-${sensor.sensor_id}`} sensorId={sensor.sensor_id} />
      </div>
    </div>
  );
};

export default SensorDetailPanel;
