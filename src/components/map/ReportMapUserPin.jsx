import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { getFloodLevelColor } from '../../utils/floodLevels';

export function getReportPickMarkerColor(level) {
  return getFloodLevelColor(level, '#4CAF50');
}

function getInitials(displayName) {
  const name = (displayName || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

/**
 * Pin chọn vị trí báo cáo — avatar giống marker báo cáo trên bản đồ chính.
 * mode: 'avatar' | 'remove' (nút đỏ + X trắng để hủy pin)
 */
export default function ReportMapUserPin({
  mode = 'avatar',
  avatarUrl,
  displayName,
  markerColor,
  onClick,
  onMouseEnter,
  onMouseLeave,
  removeLabel
}) {
  const borderColor = '#000';
  const bgColor = markerColor || '#17a2b8';
  const initials = getInitials(displayName);

  return (
    <button
      type="button"
      className={`report-map-user-pin${mode === 'remove' ? ' report-map-user-pin--remove' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={mode === 'remove' ? removeLabel : displayName}
    >
      <div
        className="report-map-user-pin__head"
        style={{
          borderColor,
          background: mode === 'remove' ? '#dc3545' : avatarUrl ? undefined : bgColor
        }}
      >
        {mode === 'remove' ? (
          <FaXmark className="report-map-user-pin__remove-icon" aria-hidden />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="" className="report-map-user-pin__img" />
        ) : (
          <span className="report-map-user-pin__initials">{initials}</span>
        )}
      </div>
      <div
        className="report-map-user-pin__pointer"
        style={{ borderTopColor: borderColor }}
      />
    </button>
  );
}
