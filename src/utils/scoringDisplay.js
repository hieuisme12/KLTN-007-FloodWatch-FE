/**
 * Hiển thị confidence báo cáo (0–100) và điểm fusion (cm → mức màu).
 */

/** Ngưỡng confidence: <40 vàng, 40–70 cam, >70 xanh */
export function getConfidenceTier(confidence) {
  const n = Number(confidence);
  if (Number.isNaN(n) || confidence == null) return null;
  if (n < 40) return { id: 'low', tierKey: 'low', color: '#ca8a04', bg: '#fef9c3' };
  if (n < 70) return { id: 'mid', tierKey: 'mid', color: '#ea580c', bg: '#ffedd5' };
  return { id: 'high', tierKey: 'high', color: '#16a34a', bg: '#dcfce7' };
}

export function getConfidenceRingColor(confidence) {
  const t = getConfidenceTier(confidence);
  return t ? t.color : null;
}

/**
 * Màu theo mực nước (cm) — thang 5 mức 10/20/30/40/55 đồng bộ FLOOD_LEVELS.
 */
export function fusionCmToColor(cm) {
  const n = Number(cm);
  if (Number.isNaN(n) || cm == null) return '#6c757d';
  if (n >= 50) return '#F44336';
  if (n >= 40) return '#FF9800';
  if (n >= 30) return '#FFC107';
  if (n >= 20) return '#8BC34A';
  if (n >= 10) return '#4CAF50';
  return '#94a3b8';
}

export function fusionCmToMarkerRadius(cm) {
  const n = Number(cm);
  if (Number.isNaN(n) || cm == null) return 10;
  if (n >= 50) return 18;
  if (n >= 40) return 16;
  if (n >= 30) return 14;
  if (n >= 20) return 12;
  if (n >= 10) return 11;
  return 9;
}

const COVERAGE_LABELS = {
  blended: 'Đang trộn với dữ liệu cảm biến gần nhất',
  crowd_only_far: 'Xa cảm biến — chỉ dựa trên báo cáo người dân',
  crowd_only_no_sensor: 'Chưa có đo từ cảm biến gần trong khoảng thời gian xét'
};

const COVERAGE_I18N_KEYS = {
  blended: 'mapView.coverageBlended',
  crowd_only_far: 'mapView.coverageCrowdOnlyFar',
  crowd_only_no_sensor: 'mapView.coverageCrowdOnlyNoSensor'
};

export function getFusionCoverageLabel(coverage, translate) {
  if (!coverage) return '—';
  if (typeof translate === 'function' && COVERAGE_I18N_KEYS[coverage]) {
    return translate(COVERAGE_I18N_KEYS[coverage]);
  }
  return COVERAGE_LABELS[coverage] || String(coverage);
}

export function formatForecastConfidence(c, translate) {
  const keyMap = { none: 'none', low: 'low', medium: 'medium', high: 'high' };
  const sub = keyMap[c];
  if (typeof translate === 'function' && sub) {
    return translate(`reportUi.forecastConfidence.${sub}`);
  }
  const map = {
    none: 'Không đủ dữ liệu',
    low: 'Thấp (ít mẫu)',
    medium: 'Trung bình',
    high: 'Cao'
  };
  return map[c] || c || '—';
}
