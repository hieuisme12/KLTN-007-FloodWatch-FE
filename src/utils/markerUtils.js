import L from 'leaflet';

// Tạo icon marker tùy chỉnh với màu sắc
export const createCustomIcon = (color, isBlinking = false) => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ${isBlinking ? 'animation: blink 1s infinite;' : ''}
    ">
      <div style="
        transform: rotate(45deg);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">!</div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Định dạng trạng thái (không có icon, icon sẽ được xử lý ở component)
export const getStatusLabel = (status, t) => {
  const keyMap = { normal: 'normal', warning: 'warning', elevated: 'elevated', danger: 'danger', critical: 'critical', offline: 'offline' };
  const sub = keyMap[status];
  if (typeof t === 'function' && sub) return t(`reportUi.sensorStatus.${sub}`);
  const labels = {
    normal: 'Bình thường',
    warning: 'Cảnh báo',
    elevated: 'Nâng cao',
    danger: 'Nguy hiểm',
    critical: 'Nghiêm trọng',
    offline: 'Mất kết nối'
  };
  return labels[status] || (typeof t === 'function' ? t('reportUi.moderation.unknown') : 'Không xác định');
};

// Định dạng velocity (không có icon, icon sẽ được xử lý ở component)
export const getVelocityLabel = (velocity, t) => {
  if (typeof t === 'function') {
    if (velocity > 0) return t('reportUi.velocity.rising', { value: Number(velocity).toFixed(1) });
    if (velocity < 0) return t('reportUi.velocity.falling', { value: Number(velocity).toFixed(1) });
    return t('reportUi.velocity.stable');
  }
  if (velocity > 0) return `Dâng: +${velocity.toFixed(1)} cm/phút`;
  if (velocity < 0) return `Rút: ${velocity.toFixed(1)} cm/phút`;
  return 'Ổn định';
};
