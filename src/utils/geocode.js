import { getLocationCacheStorageKey } from './auth';
import { getMapboxToken } from './mapboxToken';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';
import { getAccessToken } from './authSession';

/** Session Google Places (Autocomplete + Details) — một token cho nhiều lần gõ đến khi chọn / huỷ */
let geocodeAutocompleteSessionToken = null;

function createSessionTokenString() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Token dùng cho các request /geocode/search tới khi gọi /geocode/place thành công hoặc bị huỷ */
export function getOrCreateGeocodeAutocompleteSessionToken() {
  if (!geocodeAutocompleteSessionToken) geocodeAutocompleteSessionToken = createSessionTokenString();
  return geocodeAutocompleteSessionToken;
}

export function clearGeocodeAutocompleteSessionToken() {
  geocodeAutocompleteSessionToken = null;
}

function getGeocodeSearchPath() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOCODE_SEARCH_PATH) ||
    API_ENDPOINTS.GEOCODE_SEARCH
  );
}

function getGeocodePlacePath() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOCODE_PLACE_PATH) ||
    API_ENDPOINTS.GEOCODE_PLACE
  );
}

function getGeocodeForwardPath() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOCODE_FORWARD_PATH) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FORWARD_GEOCODE_PATH) ||
    API_ENDPOINTS.GEOCODE_FORWARD
  );
}

async function fetchGeocodePublic(url) {
  const headers = { Accept: 'application/json' };
  const res = await fetch(url, { headers, credentials: 'omit' });
  if (!res.ok) return null;
  const json = await res.json();
  if (json && json.success === false) return null;
  return json;
}

/**
 * Khung giới hạn TP.HCM (WGS84) — chỉ gợi ý địa chỉ trong khu vực này.
 * minLon, minLat, maxLon, maxLat (tương đương Mapbox `bbox`).
 */
export const HCM_CITY_BBOX = {
  minLon: 106.36,
  minLat: 10.37,
  maxLon: 106.85,
  maxLat: 10.88
};

/** Kiểm tra tọa độ có nằm trong nội thành TP.HCM (theo bbox trên) */
export function isPointInHcmCity(lng, lat) {
  if (lng == null || lat == null || Number.isNaN(lng) || Number.isNaN(lat)) return false;
  return (
    lng >= HCM_CITY_BBOX.minLon &&
    lng <= HCM_CITY_BBOX.maxLon &&
    lat >= HCM_CITY_BBOX.minLat &&
    lat <= HCM_CITY_BBOX.maxLat
  );
}

/**
 * Các phường/địa điểm bị Nominatim gán nhầm "Thành phố Thủ Đức" → quận đúng (TP.HCM)
 * Key: chuỗi có trong địa chỉ (phường/ward), value: quận thay thế cho "Thành phố Thủ Đức"
 */
const THU_DUC_CORRECTIONS = {
    'Thạnh Mỹ Tây': 'Quận Bình Thạnh',
    'Trung Mỹ Tây': 'Quận 12',
    'Tân Chánh Hiệp': 'Quận 12',
    'Tân Thới Hiệp': 'Quận 12',
    'Tân Thới Nhất': 'Quận 12',
    'Thạnh Lộc': 'Quận 12',
    'An Phú Đông': 'Quận 12',
    'Đông Hưng Thuận': 'Quận 12',
};

/**
 * Sửa địa chỉ khi Nominatim trả về "Thành phố Thủ Đức" sai (một số khu vực thuộc Quận 12, Bình Thạnh...)
 * @param {string} address - Địa chỉ đã format
 * @returns {string} Địa chỉ đã sửa (nếu có)
 */
function correctThuDucAddress(address) {
    if (!address || typeof address !== 'string') return address;
    if (!address.includes('Thành phố Thủ Đức')) return address;
    for (const [wardKey, correctDistrict] of Object.entries(THU_DUC_CORRECTIONS)) {
        if (address.includes(wardKey)) {
            return address.replace(/Thành phố Thủ Đức/g, correctDistrict).trim();
        }
    }
    return address;
}

/**
 * Chuỗi địa chỉ hiển thị: giữ số nhà, đường, phường, quận, thành phố — bỏ mã bưu chính và quốc gia thừa.
 * Dùng cho mọi nguồn (BE Google, Mapbox, Nominatim).
 */
export function formatAddressForUiDisplay(raw) {
    if (raw == null) return null;
    const s0 = typeof raw === 'string' ? raw.trim() : String(raw).trim();
    if (!s0) return null;
    let s = s0.replace(/\s+/g, ' ');
    s = s.replace(/,?\s*(Việt Nam|Vietnam)\s*$/iu, '').trim();
    s = s.replace(/,?\s*\b\d{5,7}\b\s*$/u, '').trim();
    const parts = s
        .split(',')
        .map((p) => p.trim())
        .filter((p) => {
            if (!p) return false;
            if (/^\d{4,7}$/.test(p)) return false;
            if (/^(mã\s*bưu\s*chính|mã\s*bưu\s*điện|postal\s*code|zip\s*code)\s*:?\s*\d+/i.test(p)) return false;
            return true;
        });
    s = parts.join(', ').replace(/,\s*,+/g, ', ').replace(/^,\s*|,\s*$/g, '').trim();
    return s || null;
}

function pickLongName(c) {
    if (!c || typeof c !== 'object') return '';
    return (c.long_name || c.longName || c.name || '').trim();
}

function componentHasType(c, types) {
    const t = c.types || c.type;
    if (Array.isArray(t)) return types.some((x) => t.includes(x));
    if (typeof t === 'string') return types.includes(t);
    return false;
}

/**
 * Gỡ địa chỉ từ JSON BE (chuỗi hoặc address_components kiểu Google).
 */
function parseBackendReverseGeocodePayload(data) {
    if (data == null) return null;
    if (typeof data === 'string') {
        const t = data.trim();
        return t || null;
    }
    const root = data.data !== undefined ? data.data : data;
    if (root == null) return null;
    if (typeof root === 'string') {
        const t = root.trim();
        return t || null;
    }
    if (typeof root !== 'object') return null;

    if (typeof root.address === 'string' && root.address.trim()) return root.address.trim();
    if (typeof root.formatted_address === 'string' && root.formatted_address.trim()) {
        return root.formatted_address.trim();
    }
    if (typeof root.display_name === 'string' && root.display_name.trim()) {
        return root.display_name.trim();
    }

    const ac = root.address_components || root.components;
    if (!Array.isArray(ac) || ac.length === 0) return null;

    const getFirst = (...typeList) => {
        const c = ac.find((x) => componentHasType(x, typeList));
        return c ? pickLongName(c) : '';
    };

    const streetNum = getFirst('street_number');
    const route = getFirst('route');
    const ward =
        getFirst('sublocality_level_1', 'sublocality', 'neighborhood', 'locality') ||
        getFirst('administrative_area_level_3');
    const district = getFirst('administrative_area_level_2');
    const city = getFirst('administrative_area_level_1');

    const line1 = [streetNum, route].filter(Boolean).join(' ').trim();
    const parts = [];
    if (line1) parts.push(line1);
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (city) parts.push(city);
    return parts.length > 0 ? parts.join(', ') : null;
}

const REVERSE_BE_UNAVAILABLE_KEY = 'geocode_reverse_be_unavailable';

function isBackendReverseGeocodeDisabled() {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SKIP_BACKEND_REVERSE_GEOCODE === 'true') {
        return true;
    }
    try {
        return sessionStorage.getItem(REVERSE_BE_UNAVAILABLE_KEY) === '1';
    } catch {
        return false;
    }
}

function markBackendReverseGeocodeDisabled() {
    try {
        sessionStorage.setItem(REVERSE_BE_UNAVAILABLE_KEY, '1');
    } catch {
        /* private mode */
    }
}

/**
 * Reverse geocode qua BE (Google Geocoding trên server).
 */
async function fetchAddressFromBackendReverse(lat, lng) {
    if (isBackendReverseGeocodeDisabled()) return null;
    const path =
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REVERSE_GEOCODE_PATH) ||
        API_ENDPOINTS.REVERSE_GEOCODE;
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${rel}?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    const headers = { Accept: 'application/json' };
    const token = typeof window !== 'undefined' ? getAccessToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        const res = await fetch(url, { headers, credentials: 'omit' });
        if (res.status === 404) {
            markBackendReverseGeocodeDisabled();
            return null;
        }
        if (!res.ok) return null;
        const json = await res.json();
        if (json && json.success === false) return null;
        return parseBackendReverseGeocodePayload(json);
    } catch {
        return null;
    }
}

function finalizeAddressString(addr) {
    if (!addr || typeof addr !== 'string') return null;
    const corrected = correctThuDucAddress(addr.trim());
    return formatAddressForUiDisplay(corrected);
}

/**
 * Format địa chỉ từ response Nominatim reverse geocoding
 */
export function formatAddressFromNominatim(data) {
    if (!data || !data.address) return null;
    const addr = data.address;
    const parts = [];
    if (addr.house_number) parts.push(addr.house_number);
    if (addr.road) parts.push(addr.road);
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.ward) parts.push(`Phường ${addr.ward}`);
    if (addr.district || addr.city_district) parts.push(`Quận ${addr.district || addr.city_district}`);
    if (addr.city && !addr.district) parts.push(addr.city);
    let formatted = null;
    if (parts.length > 0) formatted = parts.join(', ');
    else if (data.display_name) {
        formatted = data.display_name.split(',').slice(0, 4).join(', ').trim();
    }
    if (formatted) formatted = correctThuDucAddress(formatted);
    return formatted;
}

const CACHE_VERSION = 3; // tăng khi đổi nguồn / format (BE Google, bỏ mã bưu chính khi hiển thị)

function getCache() {
    try {
        const raw = localStorage.getItem(getLocationCacheStorageKey());
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function setCache(cache) {
    try {
        localStorage.setItem(getLocationCacheStorageKey(), JSON.stringify(cache));
    } catch {
        // Quota, private mode, or disabled storage — caller keeps in-memory cache if any
    }
}

/**
 * Reverse Geocoding bằng Mapbox Geocoding API v6 (khi có token)
 * @param {number} lat
 * @param {number} lng
 * @param {string} accessToken
 * @returns {Promise<string|null>}
 */
async function fetchAddressMapboxReverse(lat, lng, accessToken) {
    if (!accessToken || lat == null || lng == null) return null;
    const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('language', 'vi');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const features = data ?.features;
    if (!Array.isArray(features) || features.length === 0) return null;
    const f = features[0];
    const props = f ?.properties;
    if (props ?.full_address) return props.full_address;
    if (props ?.name && props ?.place_formatted) return `${props.name}, ${props.place_formatted}`;
    if (props ?.place_formatted) return props.place_formatted;
    const ctx = props ?.context;
    if (ctx) {
        const parts = [];
        if (ctx.address ?.name) parts.push(ctx.address.name);
        else if (ctx.street ?.name) parts.push(ctx.street.name);
        if (ctx.locality ?.name) parts.push(ctx.locality.name);
        if (ctx.district ?.name) parts.push(ctx.district.name);
        if (ctx.place ?.name) parts.push(ctx.place.name);
        if (ctx.region ?.name) parts.push(ctx.region.name);
        if (ctx.country ?.name) parts.push(ctx.country.name);
        if (parts.length > 0) return parts.join(', ');
    }
    return null;
}

/**
 * Lấy địa chỉ từ tọa độ (Reverse Geocoding).
 * Thứ tự: BE (Google qua server) → Mapbox → Nominatim. Chuỗi trả về đã bỏ mã bưu chính khi hiển thị.
 * @param {number} lat
 * @param {number} lng
 * @param {{ mapboxToken?: string, skipBackend?: boolean }} options
 *   - mapboxToken từ VITE_MAPBOX_TOKEN
 *   - skipBackend: bỏ qua /geocode/reverse (khi BE chưa có route)
 * @returns {Promise<string|null>}
 */
export async function fetchAddressFromCoords(lat, lng, options = {}) {
    if (lat == null || lng == null) return null;
    const cacheKey = `v${CACHE_VERSION}_${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    const cache = getCache();
    if (cache[cacheKey]) {
        const finalized = finalizeAddressString(cache[cacheKey]);
        if (finalized !== cache[cacheKey]) {
            cache[cacheKey] = finalized;
            setCache(cache);
        }
        return finalized;
    }

    const skipBackend = options.skipBackend === true || isBackendReverseGeocodeDisabled();

    if (!skipBackend) {
        try {
            const beAddr = await fetchAddressFromBackendReverse(lat, lng);
            const beFinal = finalizeAddressString(beAddr);
            if (beFinal) {
                cache[cacheKey] = beFinal;
                setCache(cache);
                return beFinal;
            }
        } catch {
            /* fallback Mapbox / Nominatim */
        }
    }

    const mapboxToken = (options && options.mapboxToken) || getMapboxToken();

    if (mapboxToken) {
        try {
            const addr = await fetchAddressMapboxReverse(lat, lng, mapboxToken);
            const out = finalizeAddressString(addr);
            if (out) {
                cache[cacheKey] = out;
                setCache(cache);
                return out;
            }
        } catch {
            // fallback to Nominatim
        }
    }

    try {
        await new Promise((r) => setTimeout(r, 150));
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`, { headers: { 'User-Agent': 'HCM-Flood-Frontend/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const formatted = formatAddressFromNominatim(data);
        const out = finalizeAddressString(formatted);
        if (out) {
            cache[cacheKey] = out;
            setCache(cache);
        }
        return out;
    } catch {
        return null;
    }
}

/**
 * Forward Geocoding: tìm địa chỉ → gợi ý tọa độ dùng cho ô search.
 * Ưu tiên Mapbox Geocoding API (khi có VITE_MAPBOX_TOKEN).
 * @param {string} query
 * @param {{ mapboxToken?: string, limit?: number, bbox?: object, mapboxTypes?: string }} options
 * @returns {Promise<Array<{ id: string, name: string, fullAddress: string, lat: number, lng: number }>>}
 */
export async function searchPlaces(query, options = {}) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q || q.length < 2) return [];

    const mapboxToken = (options && options.mapboxToken) || getMapboxToken();

    if (!mapboxToken) return [];

    const limit = options.limit != null ? options.limit : 5;
    const bboxOpt = options.bbox || HCM_CITY_BBOX;
    const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
    );
    url.searchParams.set('access_token', mapboxToken);
    url.searchParams.set('language', 'vi');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set(
        'bbox',
        `${bboxOpt.minLon},${bboxOpt.minLat},${bboxOpt.maxLon},${bboxOpt.maxLat}`
    );
    url.searchParams.set('proximity', '106.701,10.776');
    url.searchParams.set('country', 'vn');
    if (options.mapboxTypes && String(options.mapboxTypes).trim()) {
        url.searchParams.set('types', String(options.mapboxTypes).trim());
    }

    try {
        const res = await fetch(url.toString());
        if (!res.ok) return [];
        const data = await res.json();
        const features = Array.isArray(data ?.features) ? data.features : [];
        return features
            .map((f) => {
                const center = Array.isArray(f.center) ? f.center : null;
                const lng = center ?.[0];
                const lat = center ?.[1];
                if (lat == null || lng == null) return null;
                const latN = Number(lat);
                const lngN = Number(lng);
                if (!isPointInHcmCity(lngN, latN)) return null;
                const rawAddr = f.place_name || f.text || q;
                return {
                    id: String(f.id || `${lat},${lng}`),
                    name: f.text || f.place_name || q,
                    fullAddress: finalizeAddressString(rawAddr) || rawAddr,
                    lat: latN,
                    lng: lngN
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Forward geocoding Nominatim — chỉ trong bbox TP.HCM (`viewbox` + `bounded=1` + lọc tọa độ).
 * @param {string} query
 * @param {{ limit?: number }} options
 * @returns {Promise<Array<Record<string, unknown>>>} raw Nominatim results (lat/lon/display_name…)
 */
export async function searchNominatimPlacesInHcm(query, options = {}) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q || q.length < 2) return [];

    const limit = options.limit != null ? options.limit : 5;
    const { minLon, minLat, maxLon, maxLat } = HCM_CITY_BBOX;
    const viewbox = `${minLon},${maxLat},${maxLon},${minLat}`;
    const url =
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}` +
        `&limit=${limit}&addressdetails=1&accept-language=vi&countrycodes=vn` +
        `&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'HCM-Flood-Frontend/1.0' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        return list.filter((item) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            return isPointInHcmCity(lng, lat);
        });
    } catch {
        return [];
    }
}

function parseForwardGeocodeResponseList(json) {
    if (json == null) return [];
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.results)) return json.results;
    if (json.data && typeof json.data === 'object' && Array.isArray(json.data.results)) return json.data.results;
    return [];
}

function normalizeForwardItem(it) {
    if (!it || typeof it !== 'object') return null;
    const lat =
        it.lat ??
        it.latitude ??
        it?.geometry?.location?.lat ??
        it?.location?.lat;
    const lng =
        it.lng ??
        it.longitude ??
        it.lon ??
        it?.geometry?.location?.lng ??
        it?.location?.lng ??
        it?.location?.lon;
    const label =
        (typeof it.formatted_address === 'string' && it.formatted_address) ||
        (typeof it.address === 'string' && it.address) ||
        (typeof it.display_name === 'string' && it.display_name) ||
        (typeof it.description === 'string' && it.description) ||
        (typeof it.name === 'string' && it.name) ||
        '';
    const t = String(label).trim();
    if (lat == null || lng == null || !t) return null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
    return { lat: latN, lng: lngN, label: t };
}

function unwrapGeocodePayload(json) {
    if (json == null) return null;
    if (json.success === false) return null;
    return json.data !== undefined ? json.data : json;
}

function parseGeocodeSearchRawList(json) {
    const root = unwrapGeocodePayload(json);
    if (!root) return [];
    if (Array.isArray(root)) return root;
    if (Array.isArray(root.predictions)) return root.predictions;
    if (Array.isArray(root.results)) return root.results;
    if (Array.isArray(root.suggestions)) return root.suggestions;
    if (root.data && Array.isArray(root.data.results)) return root.data.results;
    return [];
}

/**
 * Chuẩn hoá một dòng gợi ý từ BE (/geocode/search): có thể chỉ có place_id (Places Autocomplete) hoặc đã có tọa độ.
 */
function normalizeGeocodeSearchRow(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const placeId = raw.place_id || raw.placeId || null;
    const sf = raw.structured_formatting;
    const mainText = (sf && sf.main_text) || raw.main_text;
    const secondaryText = (sf && sf.secondary_text) || raw.secondary_text;
    const desc =
        (typeof raw.description === 'string' && raw.description.trim()) ||
        [mainText, secondaryText].filter(Boolean).join(', ').trim() ||
        (typeof raw.formatted_address === 'string' && raw.formatted_address.trim()) ||
        (typeof raw.address === 'string' && raw.address.trim()) ||
        '';
    const lat =
        raw.lat ??
        raw.latitude ??
        raw?.geometry?.location?.lat ??
        raw?.location?.lat;
    const lng =
        raw.lng ??
        raw.longitude ??
        raw.lon ??
        raw?.geometry?.location?.lng ??
        raw?.location?.lng ??
        raw?.location?.lon;
    if (!desc && !placeId) return null;
    const latN = lat != null ? Number(lat) : null;
    const lngN = lng != null ? Number(lng) : null;
    const hasCoords = Number.isFinite(latN) && Number.isFinite(lngN);
    if (!placeId && !hasCoords) return null;
    return {
        place_id: placeId,
        description: desc || mainText || String(placeId),
        lat: hasCoords ? latN : null,
        lng: hasCoords ? lngN : null,
        formatted_address:
            (typeof raw.formatted_address === 'string' && raw.formatted_address.trim()) || null
    };
}

/**
 * Gợi ý địa chỉ khi gõ — GET /api/v1/geocode/search (public, không JWT).
 * @param {string} query
 * @param {{ session_token?: string, lat?: number, lng?: number, radius?: number, limit?: number }} options
 */
export async function fetchGeocodeSearchSuggestionsFromBackend(query, options = {}) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q || q.length < 2) return [];

    const path = getGeocodeSearchPath();
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${rel}`);
    url.searchParams.set('q', q);
    const session =
        (options && options.session_token) != null && String(options.session_token).trim()
            ? String(options.session_token).trim()
            : getOrCreateGeocodeAutocompleteSessionToken();
    if (session) url.searchParams.set('session_token', session);
    if (options.limit != null && Number.isFinite(Number(options.limit))) {
        const lim = Math.min(15, Math.max(1, Math.round(Number(options.limit))));
        url.searchParams.set('limit', String(lim));
    }

    const lat = options.lat;
    const lng = options.lng;
    if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        url.searchParams.set('lat', String(lat));
        url.searchParams.set('lng', String(lng));
    }
    if (options.radius != null && Number.isFinite(Number(options.radius))) {
        url.searchParams.set('radius', String(options.radius));
    }

    try {
        const json = await fetchGeocodePublic(url.toString());
        if (!json) return [];
        const list = parseGeocodeSearchRawList(json);
        const out = [];
        for (const raw of list) {
            const row = normalizeGeocodeSearchRow(raw);
            if (row) out.push(row);
        }
        return out;
    } catch {
        return [];
    }
}

/**
 * Chi tiết địa điểm — GET /api/v1/geocode/place (public). Trả tọa độ chuẩn cho Mapbox [lng, lat].
 */
export async function fetchGeocodePlaceByPlaceId(placeId, sessionToken = null) {
    const id = typeof placeId === 'string' ? placeId.trim() : '';
    if (!id) return null;

    const path = getGeocodePlacePath();
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${rel}`);
    url.searchParams.set('place_id', id);
    const st =
        sessionToken != null && String(sessionToken).trim()
            ? String(sessionToken).trim()
            : geocodeAutocompleteSessionToken;
    if (st) url.searchParams.set('session_token', st);

    try {
        const json = await fetchGeocodePublic(url.toString());
        if (!json) return null;
        const root = unwrapGeocodePayload(json);
        if (!root || typeof root !== 'object') return null;
        const lat =
            root.lat ??
            root.latitude ??
            root?.location?.lat ??
            root?.geometry?.location?.lat ??
            root?.result?.geometry?.location?.lat;
        const lng =
            root.lng ??
            root.longitude ??
            root?.location?.lng ??
            root?.location?.lon ??
            root?.geometry?.location?.lng ??
            root?.result?.geometry?.location?.lng;
        const formatted =
            (typeof root.formatted_address === 'string' && root.formatted_address.trim()) ||
            (typeof root.address === 'string' && root.address.trim()) ||
            (typeof root.formattedAddress === 'string' && root.formattedAddress.trim()) ||
            null;
        const latN = lat != null ? Number(lat) : NaN;
        const lngN = lng != null ? Number(lng) : NaN;
        if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
        clearGeocodeAutocompleteSessionToken();
        return { lat: latN, lng: lngN, formatted_address: formatted };
    } catch {
        return null;
    }
}

/**
 * Geocode chuỗi địa chỉ đầy đủ — GET /api/v1/geocode/forward?address= (public).
 * @returns {Promise<{ lat: number, lng: number, label: string } | null>}
 */
export async function forwardGeocodeAddressFromBackend(address) {
    const a = typeof address === 'string' ? address.trim() : '';
    if (!a) return null;

    const path = getGeocodeForwardPath();
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${rel}`);
    url.searchParams.set('address', a);

    try {
        const json = await fetchGeocodePublic(url.toString());
        if (!json) return null;
        const list = parseForwardGeocodeResponseList(json);
        for (const it of list) {
            const row = normalizeForwardItem(it);
            if (row) return row;
        }
        const root = unwrapGeocodePayload(json);
        if (root && typeof root === 'object') {
            const row = normalizeForwardItem(root);
            if (row) return row;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Sau khi người dùng chọn một gợi ý: có sẵn tọa độ hoặc gọi /geocode/place khi có place_id.
 * @param {object} option — hàng từ searchPlacesUnified hoặc { place_id, geocode_session_token, lat, lng, lon, fullAddress, display_name, name }
 */
export async function resolveGeocodePlaceSelection(option) {
    if (!option || typeof option !== 'object') return null;
    const latRaw = option.lat != null ? option.lat : option.latitude;
    const lngRaw = option.lng != null ? option.lng : option.lon;
    const lat = latRaw != null ? Number(latRaw) : NaN;
    const lng = lngRaw != null ? Number(lngRaw) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        clearGeocodeAutocompleteSessionToken();
        const fullAddress =
            String(option.fullAddress || option.display_name || option.name || '').trim() || null;
        return { lat, lng, formatted_address: fullAddress };
    }
    const pid = option.place_id || option.placeId;
    if (!pid || typeof pid !== 'string') return null;
    const session = option.geocode_session_token || option.session_token;
    const place = await fetchGeocodePlaceByPlaceId(pid, session);
    if (!place) return null;
    return {
        lat: place.lat,
        lng: place.lng,
        formatted_address: place.formatted_address || option.fullAddress || option.display_name || option.name
    };
}

function suggestionKey(lat, lng, label) {
    return `${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}_${String(label).slice(0, 48)}`;
}

/**
 * Gợi ý địa chỉ khi gõ tay (TP.HCM): BE /geocode/search (Places Autocomplete) → Mapbox → Nominatim.
 * Tối thiểu 2 ký tự (theo API). Một số gợi ý chỉ có place_id — khi chọn cần gọi resolveGeocodePlaceSelection hoặc fetchGeocodePlaceByPlaceId.
 * Trả về: { id, display_name, lat?, lon?, place_id?, geocode_session_token? } (tương thích field display_name với Nominatim).
 */
export async function searchAddressSuggestionsInHcm(query, options = {}) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q || q.length < 2) return [];

    const limit = options.limit != null ? options.limit : 8;
    const mapboxToken = (options && options.mapboxToken) || getMapboxToken();

    const seen = new Set();
    const rows = [];

    const sessionForRow = () =>
        (options && options.session_token && String(options.session_token).trim()) ||
        geocodeAutocompleteSessionToken ||
        getOrCreateGeocodeAutocompleteSessionToken();

    const push = (displayName, lat, lng, placeId = null) => {
        if (lat == null || lng == null) return;
        const latN = Number(lat);
        const lngN = Number(lng);
        if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return;
        if (!isPointInHcmCity(lngN, latN)) return;
        const label = formatAddressForUiDisplay(String(displayName).trim()) || String(displayName).trim();
        const key = placeId ? `pid:${placeId}` : suggestionKey(latN, lngN, label);
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({
            id: placeId || key,
            display_name: label,
            lat: String(latN),
            lon: String(lngN),
            ...(placeId ? { place_id: placeId } : {})
        });
    };

    const pushPlaceOnly = (displayName, placeId) => {
        if (!placeId) return;
        const label = formatAddressForUiDisplay(String(displayName).trim()) || String(displayName).trim();
        const key = `pid:${placeId}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({
            id: placeId,
            display_name: label,
            place_id: placeId,
            geocode_session_token: sessionForRow()
        });
    };

    const runMerge = async (queryStr) => {
        const beOpts = {
            limit,
            lat: options.lat,
            lng: options.lng,
            radius: options.radius
        };
        if (options.session_token) beOpts.session_token = options.session_token;

        const beRows = await fetchGeocodeSearchSuggestionsFromBackend(queryStr, beOpts);
        for (const r of beRows) {
            if (rows.length >= limit) break;
            const label = r.formatted_address || r.description;
            if (r.lat != null && r.lng != null) {
                push(label, r.lat, r.lng, r.place_id);
            } else if (r.place_id) {
                pushPlaceOnly(label, r.place_id);
            }
        }

        const minLenFallback = 3;
        if (rows.length < limit && mapboxToken && queryStr.length >= minLenFallback) {
            const mbOpts = {
                limit: limit - rows.length,
                mapboxToken
            };
            if (/\d/.test(queryStr)) {
                mbOpts.mapboxTypes = 'address,locality,neighborhood,place,poi';
            }
            const mb = await searchPlaces(queryStr, mbOpts);
            for (const r of mb) {
                if (rows.length >= limit) break;
                push(r.fullAddress || r.name, r.lat, r.lng);
            }
        }

        if (rows.length < limit && queryStr.length >= minLenFallback) {
            const nom = await searchNominatimPlacesInHcm(queryStr, { limit: limit - rows.length });
            for (const item of nom) {
                if (rows.length >= limit) break;
                const d = item.display_name;
                if (d) push(d, item.lat, item.lon);
            }
        }
    };

    await runMerge(q);

    if (rows.length === 0 && q.length >= 5) {
        const fwd = await forwardGeocodeAddressFromBackend(q);
        if (fwd) push(fwd.label, fwd.lat, fwd.lng);
    }

    if (rows.length === 0 && /^\s*\d/.test(q)) {
        const stripped = q.replace(/^\s*\d+[\s,/-]*/, '').trim();
        if (stripped.length >= 2 && stripped !== q) {
            await runMerge(stripped);
        }
    }

    return rows.slice(0, limit);
}

/**
 * Gợi ý địa chỉ dạng Mapbox/Routing: { id, name, fullAddress, lat?, lng?, place_id?, geocode_session_token? }.
 * Dùng cho trang Tìm đường (field="fullAddress"). Nguồn: BE → Mapbox → Nominatim.
 */
export async function searchPlacesUnified(query, options = {}) {
    const rows = await searchAddressSuggestionsInHcm(query, options);
    return rows
        .map((item, idx) => {
            const fullAddress = item.display_name || '';
            const name = fullAddress.split(',')[0]?.trim() || fullAddress || String(query).trim();
            const hasCoords =
                item.lat != null &&
                item.lon != null &&
                String(item.lat).trim() !== '' &&
                String(item.lon).trim() !== '' &&
                Number.isFinite(parseFloat(item.lat)) &&
                Number.isFinite(parseFloat(item.lon));
            if (item.place_id && !hasCoords) {
                return {
                    id: `p-${item.place_id}`,
                    name,
                    fullAddress,
                    place_id: item.place_id,
                    geocode_session_token: item.geocode_session_token,
                    lat: undefined,
                    lng: undefined
                };
            }
            if (!hasCoords) return null;
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            return {
                id: String(item.id || `u-${lat.toFixed(5)}-${lng.toFixed(5)}-${idx}`),
                name,
                fullAddress,
                lat,
                lng,
                ...(item.place_id ? { place_id: item.place_id } : {})
            };
        })
        .filter(Boolean);
}