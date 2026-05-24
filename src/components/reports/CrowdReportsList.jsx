import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCheck,
  FaXmark,
  FaClock,
  FaCircleQuestion,
  FaStar,
  FaCircle,
} from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { useReporterRanking } from '../../context/ReporterRankingProvider';
import ConfidenceBadge from '../common/ConfidenceBadge';
import Skeleton from 'react-loading-skeleton';
import {
  getReportModerationDisplay,
  getReportValidationSubline,
  isReportValidationBySensor
} from '../../utils/reportDisplayStatus';

const MODERATION_ICONS = {
  pending: FaClock,
  approved: FaCheck,
  rejected: FaXmark
};

const CrowdReportsList = ({ reports, loading }) => {
  const { t } = useTranslation();
  const { getReporterReliability } = useReporterRanking();

  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: 'Rất cao', icon: FaStar };
    if (score >= 61) return { color: '#17a2b8', text: 'Cao', icon: FaCircle };
    if (score >= 31) return { color: '#ffc107', text: 'Trung bình', icon: FaCircle };
    return { color: '#dc3545', text: 'Thấp', icon: FaCircle };
  };

  const getFloodLevelInfo = (level) => {
    const levels = {
      Nhẹ: { color: '#17a2b8', icon: WiFlood, desc: 'Đến mắt cá (~10cm)' },
      'Trung bình': { color: '#ffc107', icon: WiFlood, desc: 'Đến đầu gối (~30cm)' },
      Nặng: { color: '#dc3545', icon: WiFlood, desc: 'Ngập nửa xe (~50cm)' }
    };
    return levels[level] || { color: '#6c757d', icon: FaCircleQuestion, desc: level };
  };

  if (loading) {
    return (
      <div style={{ padding: '12px 4px' }}>
        <Skeleton count={5} height={72} style={{ marginBottom: 12 }} borderRadius={8} />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6c757d',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>Chưa có báo cáo nào</p>
        <small>Hãy là người đầu tiên báo cáo tình trạng ngập lụt!</small>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Báo cáo từ người dân ({reports.length})
      </h3>
      {reports.map((report, index) => {
        const moderationInfo = getReportModerationDisplay(report, t);
        const validationSubline = getReportValidationSubline(report, t);
        const StatusIcon = MODERATION_ICONS[moderationInfo.status] || FaCircleQuestion;
        const rel = getReporterReliability(report.reporter_id) ?? report.reporter_reliability ?? null;
        const reliabilityInfo = getReliabilityBadge(rel ?? 50);
        const levelInfo = getFloodLevelInfo(report.flood_level);

        return (
          <div
            key={report.id || `report-${index}-${report.created_at}`}
            style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: `1px solid ${moderationInfo.color}40`,
              borderLeft: `4px solid ${moderationInfo.color}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: '#2c3e50' }}>
                    {report.reporter_name || 'Ẩn danh'}
                  </strong>
                  {rel != null && (
                    <span style={{
                      fontSize: '10px',
                      background: reliabilityInfo.color + '20',
                      color: reliabilityInfo.color,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 'bold'
                    }}>
                      <reliabilityInfo.icon style={{ fontSize: '10px' }} /> {typeof rel === 'number' ? rel.toFixed(1) : rel}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(report.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  background: moderationInfo.color + '20',
                  color: moderationInfo.color,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold'
                }}>
                  <StatusIcon style={{ fontSize: '11px' }} /> {moderationInfo.text}
                </span>
                {validationSubline ? (
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{validationSubline}</span>
                ) : null}
                {report.moderation_status === 'approved' && report.confidence != null && (
                  <ConfidenceBadge
                    confidence={report.confidence}
                    breakdown={report.confidence_breakdown}
                    showBreakdownToggle
                  />
                )}
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <levelInfo.icon style={{ fontSize: '16px' }} />
                <strong style={{ color: levelInfo.color, fontSize: '14px' }}>
                  {report.flood_level}
                </strong>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {levelInfo.desc}
                </span>
              </div>

              {isReportValidationBySensor(report) && (
                <div style={{
                  fontSize: '12px',
                  color: '#28a745',
                  marginTop: '6px',
                  padding: '4px 8px',
                  background: '#f0fff4',
                  borderRadius: '4px'
                }}>
                  <FaCheck style={{ marginRight: '4px' }} /> {t('reportUi.sensorVerified')}
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                <MdLocationOn style={{ marginRight: '4px' }} /> {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CrowdReportsList;
