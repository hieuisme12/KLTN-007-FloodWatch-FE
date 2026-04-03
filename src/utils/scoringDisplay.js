/**
 * Hiển thị confidence báo cáo (0–100) và điểm fusion (cm → mức màu).
 */

/** Ngưỡng confidence: <40 vàng, 40–70 cam, >70 xanh */
export function getConfidenceTier(confidence) {
  const n = Number(confidence);
  if (Number.isNaN(n) || confidence == null) return null;
  if (n < 40) return { id: 'low', label: 'Thấp', color: '#ca8a04', bg: '#fef9c3' };
  if (n < 70) return { id: 'mid', label: 'Trung bình', color: '#ea580c', bg: '#ffedd5' };
  return { id: 'high', label: 'Cao', color: '#16a34a', bg: '#dcfce7' };
}

export function getConfidenceRingColor(confidence) {
  const t = getConfidenceTier(confidence);
  return t ? t.color : null;
}

/**
 * Màu theo mực nước suy ra từ cm (thang 10 / 30 / 50 như flood_level).
 */
export function fusionCmToColor(cm) {
  const n = Number(cm);
  if (Number.isNaN(n) || cm == null) return '#6c757d';
  if (n >= 50) return '#dc3545';
  if (n >= 30) return '#ffc107';
  if (n >= 10) return '#17a2b8';
  return '#94a3b8';
}

export function fusionCmToMarkerRadius(cm) {
  const n = Number(cm);
  if (Number.isNaN(n) || cm == null) return 10;
  if (n >= 50) return 16;
  if (n >= 30) return 14;
  if (n >= 10) return 12;
  return 9;
}

const COVERAGE_LABELS = {
  blended: 'Đang trộn với dữ liệu cảm biến gần nhất',
  crowd_only_far: 'Xa cảm biến — chỉ dựa trên báo cáo người dân',
  crowd_only_no_sensor: 'Chưa có đo từ cảm biến gần trong khoảng thời gian xét'
};

export function getFusionCoverageLabel(coverage) {
  if (!coverage) return '—';
  return COVERAGE_LABELS[coverage] || String(coverage);
}

export function formatForecastConfidence(c) {
  const map = {
    none: 'Không đủ dữ liệu',
    low: 'Thấp (ít mẫu)',
    medium: 'Trung bình',
    high: 'Cao'
  };
  return map[c] || c || '—';
}
