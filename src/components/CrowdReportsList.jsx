import React from 'react';
import { statusColors } from '../utils/constants';

const CrowdReportsList = ({ reports, loading }) => {
  // Hàm lấy màu và icon theo validation status
  const getStatusInfo = (status, verified) => {
    if (verified || status === 'cross_verified') {
      return { color: '#28a745', icon: '✅', text: 'Đã xác minh' };
    }
    if (status === 'pending') {
      return { color: '#ffc107', icon: '⏳', text: 'Chờ xem xét' };
    }
    if (status === 'verified') {
      return { color: '#17a2b8', icon: '✅', text: 'Đã xác minh' };
    }
    if (status === 'rejected') {
      return { color: '#dc3545', icon: '❌', text: 'Đã từ chối' };
    }
    return { color: '#6c757d', icon: '❓', text: 'Không xác định' };
  };

  // Hàm format reliability score
  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: '⭐ Rất cao', emoji: '⭐' };
    if (score >= 61) return { color: '#17a2b8', text: '🟢 Cao', emoji: '🟢' };
    if (score >= 31) return { color: '#ffc107', text: '🟡 Trung bình', emoji: '🟡' };
    return { color: '#dc3545', text: '🔴 Thấp', emoji: '🔴' };
  };

  // Hàm format flood level
  const getFloodLevelInfo = (level) => {
    const levels = {
      'Nhẹ': { color: '#17a2b8', emoji: '💧', desc: 'Đến mắt cá (~10cm)' },
      'Trung bình': { color: '#ffc107', emoji: '⚠️', desc: 'Đến đầu gối (~30cm)' },
      'Nặng': { color: '#dc3545', emoji: '🚨', desc: 'Ngập nửa xe (~50cm)' }
    };
    return levels[level] || { color: '#6c757d', emoji: '❓', desc: level };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>Đang tải báo cáo...</p>
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
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#2c3e50' }}>
        📱 Báo cáo từ người dân ({reports.length})
      </h3>
      {reports.map((report, index) => {
        const statusInfo = getStatusInfo(report.validation_status, report.verified_by_sensor);
        const reliabilityInfo = getReliabilityBadge(report.reliability_score || 50);
        const levelInfo = getFloodLevelInfo(report.flood_level);

        return (
          <div
            key={report.id || `report-${index}-${report.created_at}`}
            style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: `1px solid ${statusInfo.color}40`,
              borderLeft: `4px solid ${statusInfo.color}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: '#2c3e50' }}>
                    {report.reporter_name || 'Ẩn danh'}
                  </strong>
                  {report.reliability_score >= 61 && (
                    <span style={{
                      fontSize: '10px',
                      background: reliabilityInfo.color + '20',
                      color: reliabilityInfo.color,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 'bold'
                    }}>
                      {reliabilityInfo.emoji} {report.reliability_score}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(report.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                background: statusInfo.color + '20',
                color: statusInfo.color,
                padding: '4px 8px',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>
                {statusInfo.icon} {statusInfo.text}
              </span>
            </div>

            {/* Body */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>{levelInfo.emoji}</span>
                <strong style={{ color: levelInfo.color, fontSize: '14px' }}>
                  {report.flood_level}
                </strong>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {levelInfo.desc}
                </span>
              </div>

              {report.verified_by_sensor && (
                <div style={{
                  fontSize: '12px',
                  color: '#28a745',
                  marginTop: '6px',
                  padding: '4px 8px',
                  background: '#f0fff4',
                  borderRadius: '4px'
                }}>
                  ✅ Đã xác minh bởi hệ thống cảm biến
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                📍 {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CrowdReportsList;
