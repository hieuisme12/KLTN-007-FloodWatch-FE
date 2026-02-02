import React, { useEffect, useState } from 'react';
import { fetchCrowdReports } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { statusColors } from '../../utils/constants';
import './ReportsPage.css';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, verified, pending

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const result = await fetchCrowdReports();
      
      if (result.success && result.data) {
        setReports(result.data);
      }
      
      setLoading(false);
    };

    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: '⭐ Rất cao' };
    if (score >= 61) return { color: '#17a2b8', text: '🟢 Cao' };
    if (score >= 31) return { color: '#ffc107', text: '🟡 Trung bình' };
    return { color: '#dc3545', text: '🔴 Thấp' };
  };

  const getFloodLevelInfo = (level) => {
    const levels = {
      'Nhẹ': { color: '#17a2b8', emoji: '💧', desc: 'Đến mắt cá (~10cm)' },
      'Trung bình': { color: '#ffc107', emoji: '⚠️', desc: 'Đến đầu gối (~30cm)' },
      'Nặng': { color: '#dc3545', emoji: '🚨', desc: 'Ngập nửa xe (~50cm)' }
    };
    return levels[level] || { color: '#6c757d', emoji: '❓', desc: level };
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    if (filter === 'verified') return report.verified_by_sensor || report.validation_status === 'verified' || report.validation_status === 'cross_verified';
    if (filter === 'pending') return report.validation_status === 'pending';
    return true;
  });

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f5f5f5',
      paddingBottom: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: '#2c3e50',
        color: 'white',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: '1px solid white',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '10px'
            }}
          >
            ← Quay lại Dashboard
          </button>
          <h1 style={{ margin: '10px 0 5px 0', fontSize: '1.5rem' }}>
            📱 Báo cáo từ người dân
          </h1>
          <p style={{ margin: '0', opacity: 0.9, fontSize: '14px' }}>
            Tổng hợp các báo cáo ngập lụt từ cộng đồng
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        <div style={{ 
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>Lọc:</span>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: filter === 'all' ? '#007bff' : '#e9ecef',
              color: filter === 'all' ? 'white' : '#495057',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: filter === 'all' ? 'bold' : 'normal'
            }}
          >
            Tất cả ({reports.length})
          </button>
          <button
            onClick={() => setFilter('verified')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: filter === 'verified' ? '#28a745' : '#e9ecef',
              color: filter === 'verified' ? 'white' : '#495057',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: filter === 'verified' ? 'bold' : 'normal'
            }}
          >
            ✅ Đã xác minh ({reports.filter(r => r.verified_by_sensor || r.validation_status === 'verified').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: filter === 'pending' ? '#ffc107' : '#e9ecef',
              color: filter === 'pending' ? 'white' : '#495057',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: filter === 'pending' ? 'bold' : 'normal'
            }}
          >
            ⏳ Chờ xem xét ({reports.filter(r => r.validation_status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            background: 'white',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#666' }}>Đang tải báo cáo...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'white',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <p style={{ fontSize: '16px', margin: '0 0 10px 0' }}>Không có báo cáo nào</p>
            <button
              onClick={() => navigate('/report/new')}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📝 Tạo báo cáo mới
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '15px'
          }}>
            {filteredReports.map((report, index) => {
              const statusInfo = getStatusInfo(report.validation_status, report.verified_by_sensor);
              const reliabilityInfo = getReliabilityBadge(report.reliability_score || 50);
              const levelInfo = getFloodLevelInfo(report.flood_level);

              return (
                <div
                  key={report.id || `report-${index}`}
                  style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '15px',
                    border: `1px solid ${statusInfo.color}40`,
                    borderLeft: `4px solid ${statusInfo.color}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#2c3e50' }}>
                        {report.reporter_name || 'Ẩn danh'}
                      </strong>
                      {report.reliability_score >= 61 && (
                        <div style={{
                          fontSize: '11px',
                          background: reliabilityInfo.color + '20',
                          color: reliabilityInfo.color,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          marginLeft: '8px'
                        }}>
                          {reliabilityInfo.text}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      background: statusInfo.color + '20',
                      color: statusInfo.color,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 'bold'
                    }}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                  </div>

                  {/* Location */}
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#495057',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '5px'
                  }}>
                    <span>📍</span>
                    <span style={{ flex: 1 }}>{report.location_description || 'Không có thông tin vị trí'}</span>
                  </div>

                  {/* Flood Level */}
                  <div style={{
                    background: levelInfo.color + '10',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      color: levelInfo.color,
                      fontWeight: 'bold'
                    }}>
                      {levelInfo.emoji} {report.flood_level}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {levelInfo.desc}
                    </div>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <div style={{
                      fontSize: '13px',
                      color: '#666',
                      fontStyle: 'italic',
                      marginBottom: '8px',
                      padding: '8px',
                      background: '#f8f9fa',
                      borderRadius: '4px'
                    }}>
                      "{report.description}"
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    fontSize: '11px',
                    color: '#999',
                    borderTop: '1px solid #eee',
                    paddingTop: '8px',
                    marginTop: '8px'
                  }}>
                    <div>🕐 {new Date(report.created_at).toLocaleString('vi-VN')}</div>
                    {report.verified_by_sensor && (
                      <div style={{ color: '#28a745', marginTop: '4px' }}>
                        ✅ Đã được xác nhận bởi cảm biến gần đó
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/report/new')}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Tạo báo cáo mới"
      >
        📝
      </button>
    </div>
  );
};

export default ReportsPage;
