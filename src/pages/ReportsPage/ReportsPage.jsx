import React, { useEffect, useState } from 'react';
import { fetchCrowdReports } from '../../services/api';
import { POLLING_INTERVALS } from '../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
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
    const interval = setInterval(loadReports, POLLING_INTERVALS.CROWD_REPORTS);
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
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: '#2c3e50',
        color: 'white',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              ← Quay lại Dashboard
            </button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: '0', fontSize: '1.6rem', fontWeight: '700' }}>
              📱 Báo cáo từ người dân
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Tổng hợp các báo cáo ngập lụt từ cộng đồng
            </p>
          </div>
          <div style={{ width: '150px' }}></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Filters */}
          <div style={{ 
            background: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '20px'
          }}>
            <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '15px' }}>Lọc:</span>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: filter === 'all' ? '#1E3A8A' : '#e9ecef',
                color: filter === 'all' ? 'white' : '#495057',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filter === 'all' ? '600' : 'normal',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'all') e.target.style.background = '#d3d3d3';
              }}
              onMouseLeave={(e) => {
                if (filter !== 'all') e.target.style.background = '#e9ecef';
              }}
            >
              Tất cả ({reports.length})
            </button>
            <button
              onClick={() => setFilter('verified')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: filter === 'verified' ? '#28a745' : '#e9ecef',
                color: filter === 'verified' ? 'white' : '#495057',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filter === 'verified' ? '600' : 'normal',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'verified') e.target.style.background = '#d3d3d3';
              }}
              onMouseLeave={(e) => {
                if (filter !== 'verified') e.target.style.background = '#e9ecef';
              }}
            >
              ✅ Đã xác minh ({reports.filter(r => r.verified_by_sensor || r.validation_status === 'verified').length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: filter === 'pending' ? '#ffc107' : '#e9ecef',
                color: filter === 'pending' ? 'white' : '#495057',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filter === 'pending' ? '600' : 'normal',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'pending') e.target.style.background = '#d3d3d3';
              }}
              onMouseLeave={(e) => {
                if (filter !== 'pending') e.target.style.background = '#e9ecef';
              }}
            >
              ⏳ Chờ xem xét ({reports.filter(r => r.validation_status === 'pending').length})
            </button>
          </div>

          {/* Reports List */}
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px',
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>Đang tải báo cáo...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              color: '#6c757d'
            }}>
              <p style={{ fontSize: '18px', margin: '0 0 10px 0', fontWeight: '500' }}>Không có báo cáo nào</p>
              <button
                onClick={() => navigate('/report/new')}
                style={{
                  marginTop: '15px',
                  padding: '12px 24px',
                  background: '#1E3A8A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                📝 Tạo báo cáo mới
              </button>
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '20px'
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
                    borderRadius: '10px',
                    padding: '18px',
                    border: `2px solid ${statusInfo.color}30`,
                    borderLeft: `5px solid ${statusInfo.color}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                        {report.reporter_name || 'Ẩn danh'}
                      </strong>
                      {report.reliability_score >= 61 && (
                        <div style={{
                          fontSize: '11px',
                          background: reliabilityInfo.color + '20',
                          color: reliabilityInfo.color,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          marginLeft: '8px'
                        }}>
                          {reliabilityInfo.text}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      background: statusInfo.color + '20',
                      color: statusInfo.color,
                      padding: '6px 12px',
                      borderRadius: '14px',
                      fontWeight: 'bold'
                    }}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                  </div>

                  {/* Location */}
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#495057',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '6px'
                  }}>
                    <span>📍</span>
                    <span style={{ flex: 1, lineHeight: '1.5' }}>{report.location_description || 'Không có thông tin vị trí'}</span>
                  </div>

                  {/* Flood Level */}
                  <div style={{
                    background: levelInfo.color + '10',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ 
                      fontSize: '14px',
                      color: levelInfo.color,
                      fontWeight: 'bold'
                    }}>
                      {levelInfo.emoji} {report.flood_level}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                      {levelInfo.desc}
                    </div>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <div style={{
                      fontSize: '13px',
                      color: '#666',
                      fontStyle: 'italic',
                      marginBottom: '10px',
                      padding: '10px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      lineHeight: '1.5'
                    }}>
                      "{report.description}"
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    borderTop: '1px solid #eee',
                    paddingTop: '10px',
                    marginTop: '10px'
                  }}>
                    <div>🕐 {new Date(report.created_at).toLocaleString('vi-VN')}</div>
                    {report.verified_by_sensor && (
                      <div style={{ color: '#28a745', marginTop: '5px', fontWeight: '500' }}>
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
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/report/new')}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #FFA500 100%)',
          color: 'white',
          border: 'none',
          fontSize: '26px',
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(30, 58, 138, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        title="Tạo báo cáo mới"
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 8px 20px rgba(30, 58, 138, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 6px 16px rgba(30, 58, 138, 0.4)';
        }}
      >
        📝
      </button>
    </div>
  );
};

export default ReportsPage;
