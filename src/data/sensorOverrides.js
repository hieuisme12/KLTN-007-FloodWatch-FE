/**
 * Utility functions cho sensor — lấy dữ liệu trực tiếp từ API payload,
 * không hardcode override.
 */

/**
 * Tọa độ từ payload API.
 * @returns {{ lat: number, lng: number } | null}
 */
export function getSensorCoordsFromApi(sensor) {
  if (!sensor) return null;
  const latRaw = sensor.lat ?? sensor.latitude;
  const lngRaw = sensor.lng ?? sensor.longitude ?? sensor.lon;
  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lng = lngRaw != null ? Number(lngRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Địa chỉ hiển thị: lấy từ API payload (address hoặc location_address).
 * Nếu không có → trả null (caller sẽ gọi reverse geocode).
 */
export function getSensorDisplayAddress(sensor) {
  if (!sensor) return null;
  return sensor.address || sensor.location_address || null;
}

/**
 * Tên trạm hiển thị: lấy từ API payload (location_name).
 */
export function getSensorDisplayName(sensor) {
  if (!sensor) return 'Vị trí không xác định';
  const n = sensor.location_name;
  if (n != null && String(n).trim()) return String(n).trim();
  return 'Vị trí không xác định';
}

/** Tọa độ hiển thị marker — từ API. */
export function getSensorDisplayPosition(sensor) {
  return getSensorCoordsFromApi(sensor);
}
