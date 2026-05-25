/**
 * Hiển thị trạng thái báo cáo 2 tầng: moderation (chính) + validation (phụ).
 * Ưu tiên label từ BE (`display_moderation` / `display_validation`), fallback i18n.
 */

const DISPLAY_KEY_I18N = {
  approved: 'reportUi.displayKey.approved',
  rejected: 'reportUi.displayKey.rejected',
  auto_approved: 'reportUi.displayKey.auto_approved',
  pending_manual_only: 'reportUi.displayKey.pending_manual_only',
  pending_near_auto: 'reportUi.displayKey.pending_near_auto',
  cross_verified: 'reportUi.displayKey.cross_verified',
  no_sensor: 'reportUi.displayKey.no_sensor',
  pending: 'reportUi.displayKey.pending',
  not_cross_verified: 'reportUi.displayKey.not_cross_verified',
};

export function pickDisplayLabel(field, t) {
  if (field == null) return null;
  if (typeof field === 'string') {
    const s = field.trim();
    return s || null;
  }
  if (typeof field === 'object') {
    const key = field.key;
    if (key && typeof t === 'function' && DISPLAY_KEY_I18N[key]) {
      const translated = t(DISPLAY_KEY_I18N[key], { defaultValue: '' });
      if (translated) return field.hint ? `${translated} (${field.hint})` : translated;
    }
    if (typeof field.label === 'string') {
      const s = field.label.trim();
      return s || null;
    }
  }
  return null;
}

const MODERATION_FALLBACK_KEYS = {
  pending: 'reportUi.moderation.pending',
  approved: 'reportUi.moderation.approved',
  rejected: 'reportUi.moderation.rejected'
};

const MODERATION_COLORS = {
  pending: '#ffc107',
  approved: '#28a745',
  rejected: '#dc3545'
};

/** Tầng chính: Chờ duyệt / Đã duyệt / Đã từ chối */
export function getReportModerationDisplay(report, t) {
  const status = report?.moderation_status || 'pending';
  const label = pickDisplayLabel(report?.display_moderation, t);
  const fallbackKey = MODERATION_FALLBACK_KEYS[status] || 'reportUi.moderation.unknown';
  return {
    status,
    text: label || t(fallbackKey),
    color: MODERATION_COLORS[status] || '#6c757d'
  };
}

/** Tầng phụ: Xác minh chéo / Chưa xác minh chéo — không thay thế nhãn moderation */
export function getReportValidationSubline(report, t) {
  const mod = report?.moderation_status || 'pending';
  const val = report?.validation_status;
  const label = pickDisplayLabel(report?.display_validation, t);

  if (label) return label;

  if (val === 'cross_verified') {
    return t('reportUi.validation.cross_verified');
  }
  if (val === 'verified' && mod === 'pending') {
    return t('reportUi.validation.verified');
  }
  if (mod === 'pending' && val && val !== 'cross_verified' && val !== 'verified') {
    return t('reportUi.validation.not_cross_verified');
  }
  if (mod === 'pending' && (!val || val === 'pending')) {
    return t('reportUi.validation.not_cross_verified');
  }

  return null;
}

/** Cột cảm biến: chỉ "Đã xác nhận" khi sensor thực sự xác minh ngập phù hợp */
export function isReportValidationBySensor(report) {
  if (!report) return false;
  return report.validation_status === 'cross_verified';
}

/** Thông báo sau POST /api/report-flood */
export function buildReportSubmitSuccessCopy(result, t) {
  const message = typeof result?.message === 'string' ? result.message.trim() : '';
  const data = result?.data;
  const mod = data?.moderation_status;
  const val = data?.validation_status;

  if (val === 'cross_verified' && (mod === 'pending' || !mod)) {
    return message || t('newReport.submitCrossVerifiedPending');
  }
  if (mod === 'pending' || !mod) {
    return message || t('newReport.submitPendingModeration');
  }
  return message || t('newReport.thanks');
}

export function getStatusPillStyleFromColor(color) {
  const byColor = {
    '#dc3545': { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
    '#ffc107': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    '#17a2b8': { bg: '#e0f7fa', text: '#0e7490', border: '#b2ebf2' },
    '#28a745': { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    '#6c757d': { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
  };
  return (
    byColor[color] || {
      bg: '#f1f5f9',
      text: color || '#475569',
      border: '#e2e8f0'
    }
  );
}
