/**
 * Bảng địa chỉ và tọa độ chuẩn cho từng sensor.
 * Dùng khi geocoding (Nominatim) trả về sai. Ưu tiên dữ liệu ở đây.
 *
 * Có thể khai báo theo 3 cách (thử theo thứ tự):
 * 1. By sensor_id: key = sensor_id từ API
 * 2. By location_name: key = tên trạm (khớp chính xác hoặc sensor.location_name chứa key)
 * 3. By tọa độ: key = "lat,lng" (làm tròn 3 chữ số thập phân), ví dụ "10.812,106.718"
 */
export const SENSOR_OVERRIDES = {
  // Theo tọa độ (lat,lng) - khớp mọi sensor có cùng tọa độ làm tròn 3 số
  '10.812,106.718': {
    address: 'Hẻm 860 Xô Viết Nghệ Tĩnh, Phường Thạnh Mỹ Tây, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.812,
    lng: 106.718
  },

  // Theo location_name (khớp chính xác hoặc tên trạm chứa chuỗi này)
  'Nguyễn Hữu Cảnh': {
    address: 'Hẻm 860 Xô Viết Nghệ Tĩnh, Phường Thạnh Mỹ Tây, Quận Bình Thạnh, TP. Hồ Chí Minh',
    lat: 10.812,
    lng: 106.718
  }
};

const COORD_PRECISION = 3;

function normalizeKey(s) {
  if (s == null || typeof s !== 'string') return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

/**
 * Lấy override cho sensor: thử sensor_id → location_name (exact) → location_name (contains) → tọa độ.
 * @param {{ sensor_id?: string, location_name?: string, lat?: number, lng?: number }} sensor
 * @returns {{ address?: string, lat?: number, lng?: number } | null}
 */
export function getSensorOverride(sensor) {
  if (!sensor) return null;

  const id = sensor.sensor_id != null ? String(sensor.sensor_id).trim() : '';
  if (id && SENSOR_OVERRIDES[id]) return SENSOR_OVERRIDES[id];

  const name = normalizeKey(sensor.location_name);
  if (name && SENSOR_OVERRIDES[name]) return SENSOR_OVERRIDES[name];

  for (const [key, value] of Object.entries(SENSOR_OVERRIDES)) {
    if (value && typeof value === 'object' && value.address && !key.includes(',')) {
      if (name && name.includes(key)) return value;
    }
  }

  const lat = sensor.lat != null ? Number(sensor.lat) : null;
  const lng = sensor.lng != null ? Number(sensor.lng) : null;
  if (lat != null && lng != null) {
    const coordKey = `${lat.toFixed(COORD_PRECISION)},${lng.toFixed(COORD_PRECISION)}`;
    if (SENSOR_OVERRIDES[coordKey]) return SENSOR_OVERRIDES[coordKey];
  }

  return null;
}

/**
 * Địa chỉ hiển thị cho sensor: ưu tiên override, sau đó dùng địa chỉ từ API (nếu có), cuối cùng null (sẽ geocode).
 * @param {{ sensor_id?: string, location_name?: string, address?: string, location_address?: string }} sensor
 * @returns {string | null}
 */
export function getSensorDisplayAddress(sensor) {
  if (!sensor) return null;
  const override = getSensorOverride(sensor);
  if (override?.address) return override.address;
  return sensor.address || sensor.location_address || null;
}

/**
 * Tọa độ hiển thị cho sensor: ưu tiên override, sau đó từ API.
 * @param {{ sensor_id?: string, location_name?: string, lat?: number, lng?: number }} sensor
 * @returns {{ lat: number, lng: number }}
 */
export function getSensorDisplayPosition(sensor) {
  const override = getSensorOverride(sensor);
  if (override?.lat != null && override?.lng != null) {
    return { lat: Number(override.lat), lng: Number(override.lng) };
  }
  const lat = sensor?.lat != null ? Number(sensor.lat) : 10.776;
  const lng = sensor?.lng != null ? Number(sensor.lng) : 106.701;
  return { lat, lng };
}
