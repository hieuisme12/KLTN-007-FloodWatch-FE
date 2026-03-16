import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa6';
import { getReportEvaluationAverage, getReportEvaluations, submitReportEvaluation } from '../../services/api';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';

/**
 * Đánh giá theo từng báo cáo: hiển thị điểm trung bình của báo cáo này; chỉ cho đánh giá nếu chưa đánh giá.
 * Người tạo báo cáo không được đánh giá. User đã đánh giá báo cáo này rồi thì không cho đánh giá lại.
 */
const ReportEvaluationWidget = ({ reportId, reporterId = null, compact = false }) => {
  const [average, setAverage] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [userAlreadyRated, setUserAlreadyRated] = useState(false);

  const fetchAverage = async () => {
    if (!reportId) return;
    setLoading(true);
    const res = await getReportEvaluationAverage(reportId);
    setLoading(false);
    if (res.success && res.average != null) {
      setAverage(Number(res.average));
      setCount(res.count || 0);
    } else {
      setAverage(null);
      setCount(0);
    }
  };

  const checkUserAlreadyRated = async () => {
    if (!reportId || !isAuthenticated()) return;
    const res = await getReportEvaluations(reportId);
    const currentUser = getCurrentUser();
    if (!res.success || !currentUser?.id) return;
    const list = res.data || [];
    const alreadyRated = list.some((e) => Number(e.evaluator_id) === Number(currentUser.id));
    setUserAlreadyRated(alreadyRated);
  };

  useEffect(() => {
    fetchAverage();
  }, [reportId]);

  useEffect(() => {
    checkUserAlreadyRated();
  }, [reportId]);

  const handleSubmit = async () => {
    if (!reportId || selectedRating < 1 || selectedRating > 5) return;
    setSubmitting(true);
    setMessage('');
    const res = await submitReportEvaluation(reportId, selectedRating);
    setSubmitting(false);
    if (res.success) {
      setMessage('Đã gửi đánh giá.');
      setUserAlreadyRated(true);
      fetchAverage();
    } else {
      setMessage(res.error || 'Gửi thất bại');
    }
  };

  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();
  const isOwnReport = reporterId != null && currentUser?.id != null && Number(reporterId) === Number(currentUser.id);
  const canRate = authenticated && !isOwnReport && !userAlreadyRated;
  const displayRating = hoverRating || selectedRating;

  if (compact) {
    return (
      <span className="report-eval-compact" style={{ fontSize: '12px', color: '#666', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <FaStar style={{ color: '#ffc107' }} />
        {loading ? '...' : (average != null ? `${Number(average).toFixed(1)} (${count})` : '—')}
      </span>
    );
  }

  return (
    <div className="report-evaluation-widget" style={{ marginTop: '8px', padding: '8px 0', borderTop: '1px solid #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>Đánh giá cộng đồng:</span>
        {loading ? (
          <span style={{ fontSize: '12px', color: '#999' }}>Đang tải...</span>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <FaStar style={{ color: '#ffc107', fontSize: '14px' }} />
              <strong>{average != null ? Number(average).toFixed(1) : '—'}</strong>
              {count > 0 && <span style={{ fontSize: '12px', color: '#999', marginLeft: '4px' }}>({count} đánh giá)</span>}
            </span>
          </>
        )}
      </div>
      {canRate && (
        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>Bạn chấm:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSelectedRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: displayRating >= star ? '#ffc107' : '#ddd',
                fontSize: '18px'
              }}
            >
              <FaStar />
            </button>
          ))}
          {selectedRating >= 1 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                fontSize: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi'}
            </button>
          )}
        </div>
      )}
      {message && <div style={{ fontSize: '12px', color: message.includes('thất bại') ? '#dc3545' : '#28a745', marginTop: '4px' }}>{message}</div>}
    </div>
  );
};

export default ReportEvaluationWidget;
