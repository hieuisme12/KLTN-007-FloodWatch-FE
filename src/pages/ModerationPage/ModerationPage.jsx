import React, { useEffect, useState } from 'react';
import { fetchPendingReports, moderateReport } from '../../services/api';
import { isModerator } from '../../utils/auth';
import { useReporterRanking } from '../../context/ReporterRankingContext';
import { useNavigate } from 'react-router-dom';
import { FaMagnifyingGlass, FaClock, FaCheck, FaXmark, FaStar, FaCircle, FaArrowsRotate, FaCircleQuestion, FaClock as FaClockIcon } from 'react-icons/fa6';
import { WiFlood } from 'react-icons/wi';
import { MdLocationOn } from 'react-icons/md';
import './ModerationPage.css';

const ModerationPage = () => {
  const navigate = useNavigate();
  const { getReporterReliability } = useReporterRanking();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [rejectionReason, setRejectionReason] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [locationCache, setLocationCache] = useState(() => {
    // Load cache từ localStorage khi khởi tạo
    try {
      const saved = localStorage.getItem('locationCache');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    // Kiểm tra quyền
    if (!isModerator()) {
      navigate('/');
      return;
    }

    loadReports();
    const interval = setInterval(loadReports, 10000); // Refresh mỗi 10 giây
    return () => clearInterval(interval);
  }, [navigate]);

  const loadReports = async () => {
    setLoading(true);
    const result = await fetchPendingReports(100);
    
    if (result.success && result.data) {
      setReports(result.data);
      
      // Lấy địa chỉ cho các báo cáo không có location_description (giống ReportsPage)
      const reportsWithoutLocation = result.data.filter(
        report => {
          if (!report.lat || !report.lng) return false;
          if (report.location_description) return false;
          
          const cacheKey = `${report.lat.toFixed(6)},${report.lng.toFixed(6)}`;
          const currentCache = JSON.parse(localStorage.getItem('locationCache') || '{}');
          if (currentCache[cacheKey]) {
            setReports(prevReports => 
              prevReports.map(r => 
                r.id === report.id ? { ...r, location_description: currentCache[cacheKey] } : r
              )
            );
            return false;
          }
          
          return true;
        }
      );
      
      // Giới hạn 2 báo cáo mỗi lần
      const reportsToFetch = reportsWithoutLocation.slice(0, 2);
      
      for (const report of reportsToFetch) {
        const address = await fetchLocationDescription(report.lat, report.lng);
        if (address) {
          setReports(prevReports => 
            prevReports.map(r => 
              r.id === report.id ? { ...r, location_description: address } : r
            )
          );
        }
        if (reportsToFetch.indexOf(report) < reportsToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      }
    }
    
    setLoading(false);
  };

  const handleApprove = async (reportId) => {
    setShowApproveModal(reportId);
  };

  const confirmApprove = async (reportId) => {
    setShowApproveModal(null);
    setProcessing({ ...processing, [reportId]: 'approving' });
    
    const result = await moderateReport(reportId, 'approve');
    
    if (result.success) {
      setNotification({
        type: 'success',
        message: result.message
      });
      // Xóa báo cáo đã duyệt khỏi danh sách
      setReports(reports.filter(r => r.id !== reportId));
      // Trigger event để các trang khác refresh
      window.dispatchEvent(new CustomEvent('reportsUpdated'));
    } else {
      setNotification({
        type: 'error',
        message: '✗ Lỗi: ' + (result.error || 'Không thể duyệt báo cáo')
      });
    }
    
    setProcessing({ ...processing, [reportId]: null });
  };

  const handleReject = async (reportId) => {
    const reason = rejectionReason[reportId]?.trim();
    
    if (!reason) {
      setNotification({
        type: 'error',
        message: 'Vui lòng nhập lý do từ chối'
      });
      return;
    }

    setShowRejectModal(null);
    setProcessing({ ...processing, [reportId]: 'rejecting' });
    
    const result = await moderateReport(reportId, 'reject', reason);
    
    if (result.success) {
      setNotification({
        type: 'success',
        message: result.message
      });
      // Xóa báo cáo đã từ chối khỏi danh sách
      setReports(reports.filter(r => r.id !== reportId));
      setRejectionReason({ ...rejectionReason, [reportId]: '' });
      // Trigger event để các trang khác refresh
      window.dispatchEvent(new CustomEvent('reportsUpdated'));
    } else {
      setNotification({
        type: 'error',
        message: '✗ Lỗi: ' + (result.error || 'Không thể từ chối báo cáo')
      });
    }
    
    setProcessing({ ...processing, [reportId]: null });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: '#ffc107', text: 'Chờ xem xét', bg: '#fff3cd', icon: FaClock },
      verified: { color: '#17a2b8', text: 'Đã xác minh', bg: '#d1ecf1', icon: FaCheck },
      cross_verified: { color: '#28a745', text: 'Xác minh chéo', bg: '#d4edda', icon: FaCheck },
      rejected: { color: '#dc3545', text: 'Đã từ chối', bg: '#f8d7da', icon: FaXmark }
    };
    
    return badges[status] || badges.pending;
  };

  const getModerationStatusBadge = (status) => {
    const badges = {
      pending: { color: '#ffc107', text: 'Chờ duyệt', bg: '#fff3cd', icon: FaClock },
      approved: { color: '#28a745', text: 'Đã duyệt', bg: '#d4edda', icon: FaCheck },
      rejected: { color: '#dc3545', text: 'Đã từ chối', bg: '#f8d7da', icon: FaXmark }
    };
    
    return badges[status] || badges.pending;
  };

  const getReliabilityBadge = (score) => {
    if (score >= 81) return { color: '#28a745', text: 'Rất cao', icon: FaStar };
    if (score >= 61) return { color: '#17a2b8', text: 'Cao', icon: FaCircle };
    if (score >= 31) return { color: '#ffc107', text: 'Trung bình', icon: FaCircle };
    return { color: '#dc3545', text: 'Thấp', icon: FaCircle };
  };

  const getFloodLevelInfo = (level) => {
    const levels = {
      'Nhẹ': { 
        color: '#17a2b8', 
        icon: WiFlood, 
        desc: 'Đến mắt cá (~10cm)'
      },
      'Trung bình': { 
        color: '#ffc107', 
        icon: WiFlood, 
        desc: 'Đến đầu gối (~30cm)'
      },
      'Nặng': { 
        color: '#dc3545', 
        icon: WiFlood, 
        desc: 'Ngập nửa xe (~50cm)'
      }
    };
    return levels[level] || { 
      color: '#6c757d', 
      icon: FaCircleQuestion, 
      desc: level || 'Không xác định'
    };
  };

  // Hàm format địa chỉ từ reverse geocoding (giống ReportsPage)
  const formatAddress = (data) => {
    if (!data || !data.address) return null;
    
    const addr = data.address;
    const parts = [];
    
    if (addr.road) {
      parts.push(addr.road);
    }
    if (addr.house_number) {
      parts.unshift(addr.house_number);
    }
    if (addr.suburb || addr.neighbourhood) {
      parts.push(addr.suburb || addr.neighbourhood);
    }
    if (addr.ward) {
      parts.push(`Phường ${addr.ward}`);
    }
    if (addr.district || addr.city_district) {
      parts.push(`Quận ${addr.district || addr.city_district}`);
    }
    if (addr.city && !addr.district) {
      parts.push(addr.city);
    }
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    if (data.display_name) {
      const displayName = data.display_name
        .split(',')
        .slice(0, 4)
        .join(', ')
        .trim();
      return displayName;
    }
    
    return null;
  };

  // Hàm lấy địa chỉ từ tọa độ (giống ReportsPage)
  const fetchLocationDescription = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // Kiểm tra cache trước (cả trong state và localStorage)
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }
    
    // Kiểm tra localStorage
    try {
      const saved = localStorage.getItem('locationCache');
      const savedCache = saved ? JSON.parse(saved) : {};
      if (savedCache[cacheKey]) {
        setLocationCache(savedCache);
        return savedCache[cacheKey];
      }
    } catch (err) {
      // Ignore
    }
    
    try {
      // Thêm delay nhỏ để tránh rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`,
        {
          headers: {
            'User-Agent': 'HCM-Flood-Frontend/1.0'
          }
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      const formattedAddress = formatAddress(data);
      
      if (formattedAddress) {
        const newCache = { ...locationCache, [cacheKey]: formattedAddress };
        setLocationCache(newCache);
        
        try {
          localStorage.setItem('locationCache', JSON.stringify(newCache));
        } catch (err) {
        }
        
        return formattedAddress;
      }
      
      return null;
    } catch (err) {
      return null;
    }
  };

  if (!isModerator()) {
    return null;
  }

  return (
    <div className="moderation-page">
      {/* Page Title */}
      <div style={{
        backgroundImage: 'url(/moderation.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 40px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '2rem', 
              color: 'white', 
              fontWeight: '700', 
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              Kiểm duyệt báo cáo
            </h1>
            <p style={{ 
              margin: '0', 
              color: 'rgba(255, 255, 255, 0.95)', 
              fontSize: '15px',
              fontWeight: '400',
              lineHeight: '1.6',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              Duyệt hoặc từ chối các báo cáo đang chờ xem xét
            </p>
          </div>
          <button 
            onClick={loadReports} 
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }
            }}
          >
            <FaArrowsRotate /> Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FaCheck /></div>
          <h2>Không có báo cáo nào cần duyệt</h2>
          <p>Tất cả báo cáo đã được xử lý</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '15px',
          padding: '20px'
        }}>
          {reports.map((report) => {
            const statusBadge = getStatusBadge(report.validation_status);
            const moderationBadge = getModerationStatusBadge(report.moderation_status);
            const rel = getReporterReliability(report.reporter_id) ?? report.reporter_reliability ?? null;
            const reliabilityBadge = getReliabilityBadge(rel ?? 0);
            const levelInfo = getFloodLevelInfo(report.flood_level);
            const cardId = report.id;
            const isHovered = hoveredCardId === cardId;
            
            return (
              <div 
                key={report.id} 
                className="report-card-gradient"
                  style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0',
                  transition: 'border-color 0.2s ease',
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = levelInfo.color;
                  setHoveredCardId(cardId);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  setHoveredCardId(null);
                }}
              >
                {/* Top Section - White with Icon and Title */}
                <div style={{
                  padding: '24px 20px',
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative'
                }}>
                  {/* Status Badge - Top Left */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      background: '#ffc107',
                      color: '#856404',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <FaClock /> Chờ duyệt
                    </span>
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: levelInfo.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: 'white'
                  }}>
                    <levelInfo.icon />
                  </div>
                  
                  {/* Title */}
                  <div style={{
                    textAlign: 'center',
                    width: '100%'
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#2c3e50',
                      marginBottom: '4px'
                    }}>
                      {report.flood_level || 'Nặng'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      {levelInfo.desc}
                    </div>
                  </div>
                </div>

                {/* Wave Separator - Transparent */}
                <div style={{
                  height: '24px',
                  background: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  marginTop: '-1px'
                }}>
                  <svg 
                    viewBox="0 0 1200 24" 
                    preserveAspectRatio="none"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block'
                    }}
                  >
                    <path
                      d="M0,24 C200,8 400,16 600,12 C800,8 1000,16 1200,12 L1200,24 L0,24 Z"
                      fill="transparent"
                      style={{
                        transition: 'fill 0.2s ease'
                      }}
                    />
                  </svg>
                </div>

                {/* Bottom Section - With GIF Background */}
                <div style={{
                  flex: 1,
                  padding: '20px',
                  color: '#2c3e50',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* GIF Background - Only plays on hover */}
                  {isHovered ? (
                    <img 
                      src="/water_flow.gif" 
                      alt="Water flow"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none'
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'transparent',
                      pointerEvents: 'none'
                    }}></div>
                  )}
                  
                  {/* Content */}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {/* Reporter Name */}
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}>
                        {report.reporter_name || 'Ẩn danh'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        ID: {report.id}
                      </div>
                      {rel != null && (
                        <div style={{
                          fontSize: '11px',
                          background: 'rgba(0,0,0,0.1)',
                          color: '#2c3e50',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          Độ tin cậy người báo cáo: {reliabilityBadge.text} ({typeof rel === 'number' ? rel.toFixed(1) : rel})
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div style={{
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'start',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.7)',
                      padding: '10px',
                      borderRadius: '8px',
                      backdropFilter: 'blur(10px)',
                      color: '#2c3e50'
                    }}>
                      <MdLocationOn style={{ marginTop: '2px', flexShrink: 0, fontSize: '16px' }} />
                      <span style={{ flex: 1, lineHeight: '1.5' }}>
                        {report.location_description || 
                         (report.lat && report.lng ? `${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}` : 'Không có thông tin vị trí')}
                      </span>
                    </div>

                    {/* Photo if available */}
                    {report.photo_url && (
                      <div style={{
                        background: 'rgba(255,255,255,0.7)',
                        padding: '10px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <img 
                          src={report.photo_url} 
                          alt="Báo cáo" 
                          style={{
                            width: '100%',
                            maxHeight: '200px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(report.photo_url, '_blank')}
                        />
                      </div>
                    )}

                    {/* Verified by sensor */}
                    {report.verified_by_sensor && (
                      <div style={{
                        fontSize: '12px',
                        background: 'rgba(40, 167, 69, 0.2)',
                        color: '#28a745',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '500'
                      }}>
                        <FaCheck /> Đã được xác nhận bởi cảm biến
                      </div>
                    )}

                    {/* Footer Info */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      color: '#2c3e50'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaClockIcon /> {new Date(report.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '10px'
                    }}>
                      <button
                        onClick={() => handleApprove(report.id)}
                        disabled={processing[report.id]}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: processing[report.id] === 'approving' ? '#6c757d' : '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: processing[report.id] ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s ease',
                          opacity: processing[report.id] ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!processing[report.id]) {
                            e.target.style.background = '#42a5f5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!processing[report.id]) {
                            e.target.style.background = '#1976d2';
                          }
                        }}
                      >
                        {processing[report.id] === 'approving' ? 'Đang xử lý...' : 'Duyệt'}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(report.id)}
                        disabled={processing[report.id]}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: processing[report.id] === 'rejecting' ? '#6c757d' : '#9e9e9e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: processing[report.id] ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s ease',
                          opacity: processing[report.id] ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!processing[report.id]) {
                            e.target.style.background = '#bdbdbd';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!processing[report.id]) {
                            e.target.style.background = '#9e9e9e';
                          }
                        }}
                      >
                        {processing[report.id] === 'rejecting' ? 'Đang xử lý...' : 'Từ chối'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal xác nhận duyệt */}
                {showApproveModal === report.id && (
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2000
                    }}
                    onClick={() => setShowApproveModal(null)}
                  >
                    <div 
                      style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#2c3e50' }}>
                        Xác nhận duyệt báo cáo
                      </h3>
                      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                        Bạn có chắc chắn muốn duyệt báo cáo này?
                      </p>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setShowApproveModal(null)}
                          style={{
                            padding: '10px 20px',
                            background: '#e9ecef',
                            color: '#495057',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#d3d3d3'}
                          onMouseLeave={(e) => e.target.style.background = '#e9ecef'}
                        >
                          Hủy
                        </button>
                        <button 
                          onClick={() => confirmApprove(report.id)}
                          style={{
                            padding: '10px 20px',
                            background: '#1976d2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#42a5f5'}
                          onMouseLeave={(e) => e.target.style.background = '#1976d2'}
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal nhập lý do từ chối */}
                {showRejectModal === report.id && (
                  <div className="reject-modal-overlay" onClick={() => setShowRejectModal(null)}>
                    <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
                      <h3>Lý do từ chối báo cáo</h3>
                      <textarea
                        className="reject-reason-input"
                        placeholder="Nhập lý do từ chối báo cáo này..."
                        value={rejectionReason[report.id] || ''}
                        onChange={(e) => setRejectionReason({ 
                          ...rejectionReason, 
                          [report.id]: e.target.value 
                        })}
                        rows={4}
                      />
                      <div className="modal-actions">
                        <button 
                          className="btn-cancel"
                          onClick={() => {
                            setShowRejectModal(null);
                            setRejectionReason({ ...rejectionReason, [report.id]: '' });
                          }}
                        >
                          Hủy
                        </button>
                        <button 
                          className="btn-confirm-reject"
                          onClick={() => handleReject(report.id)}
                        >
                          Xác nhận từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Popup */}
      {notification && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}
          onClick={() => setNotification(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {notification.type === 'success' ? (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#d4edda',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FaCheck style={{ color: '#28a745', fontSize: '20px' }} />
                </div>
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#f8d7da',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FaXmark style={{ color: '#dc3545', fontSize: '20px' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#2c3e50' 
                }}>
                  {notification.type === 'success' ? 'Thành công' : 'Lỗi'}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#666', 
                  lineHeight: '1.5' 
                }}>
                  {notification.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setNotification(null)}
                style={{
                  padding: '10px 24px',
                  background: notification.type === 'success' ? '#1976d2' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = notification.type === 'success' ? '#42a5f5' : '#c82333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = notification.type === 'success' ? '#1976d2' : '#dc3545';
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPage;

