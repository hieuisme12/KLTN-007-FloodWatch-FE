import React from 'react';
import { 
  FaCheck, 
  FaXmark, 
  FaClock, 
  FaCircleQuestion, 
  FaStar, 
  FaCircle, 
  FaTriangleExclamation, 
  FaMobileScreen
} from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import { statusColors } from '../../utils/constants';
import { useReporterRanking } from '../../context/ReporterRankingContext';

const CrowdReportsList = ({ reports, loading }) => {
  const { getReporterReliability } = useReporterRanking();
  // Hàm lấy status info - ưu tiên moderation_status theo logic đúng
  const getStatusInfo = (report) => {
    // Logic: Nếu moderation_status đã được xử lý (approved/rejected), hiển thị nó
    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const moderationStatus = report.moderation_status;
    const validationStatus = report.validation_status;
    
    // Nếu đã được moderator xử lý (approved hoặc rejected), ưu tiên hiển thị
    if (moderationStatus === 'approved' || moderationStatus === 'rejected') {
      if (moderationStatus === 'rejected') {
        return { text: 'Đã từ chối', color: '#dc3545', icon: FaXmark };
      }
      // Đã duyệt: màu theo mức độ ngập (Nặng / Trung bình / Nhẹ)
      const levelColors = { 'Nặng': '#dc3545', 'Trung bình': '#ffc107', 'Nhẹ': '#17a2b8' };
      const level = report.flood_level && levelColors[report.flood_level] ? report.flood_level : null;
      const color = level ? levelColors[level] : '#28a745';
      return { text: 'Đã duyệt', color, icon: FaCheck };
    }
    
    // Nếu moderation_status = 'pending' hoặc null, hiển thị validation_status
    const displayStatus = moderationStatus === 'pending' || !moderationStatus 
      ? validationStatus 
      : moderationStatus;
    
    // Badge mapping cho validation_status
    const statusConfig = {
      pending: { text: 'Chờ xét duyệt', color: '#ffc107', icon: FaClock },
      verified: { text: 'Đã xác minh', color: '#17a2b8', icon: FaCheck },
      cross_verified: { text: 'Đã xác minh chéo', color: '#28a745', icon: FaCheck }
    };
    
    // Nếu có verified_by_sensor, ưu tiên hiển thị cross_verified
    if (report.verified_by_sensor) {
      return statusConfig.cross_verified;
    }
    
    return statusConfig[displayStatus] || { text: 'Không xác định', color: '#6c757d', icon: FaCircleQuestion };
  };

  // Hàm format reliability score
  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: 'Rất cao', icon: FaStar };
    if (score >= 61) return { color: '#17a2b8', text: 'Cao', icon: FaCircle };
    if (score >= 31) return { color: '#ffc107', text: 'Trung bình', icon: FaCircle };
    return { color: '#dc3545', text: 'Thấp', icon: FaCircle };
  };

  // Hàm format flood level - dùng WiFlood cho tất cả mức độ ngập
  const getFloodLevelInfo = (level) => {
    const levels = {
      'Nhẹ': { color: '#17a2b8', icon: WiFlood, desc: 'Đến mắt cá (~10cm)' },
      'Trung bình': { color: '#ffc107', icon: WiFlood, desc: 'Đến đầu gối (~30cm)' },
      'Nặng': { color: '#dc3545', icon: WiFlood, desc: 'Ngập nửa xe (~50cm)' }
    };
    return levels[level] || { color: '#6c757d', icon: FaCircleQuestion, desc: level };
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
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Báo cáo từ người dân ({reports.length})
      </h3>
      {reports.map((report, index) => {
        const statusInfo = getStatusInfo(report);
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
              <span style={{
                fontSize: '11px',
                background: statusInfo.color + '20',
                color: statusInfo.color,
                padding: '4px 8px',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>
                <statusInfo.icon style={{ fontSize: '11px' }} /> {statusInfo.text}
              </span>
            </div>

            {/* Body */}
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

              {report.verified_by_sensor && (
                <div style={{
                  fontSize: '12px',
                  color: '#28a745',
                  marginTop: '6px',
                  padding: '4px 8px',
                  background: '#f0fff4',
                  borderRadius: '4px'
                }}>
                  <FaCheck style={{ marginRight: '4px' }} /> Đã xác minh bởi hệ thống cảm biến
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
