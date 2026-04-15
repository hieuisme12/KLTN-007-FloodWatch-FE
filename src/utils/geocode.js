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

const CACHE_KEY = 'locationCache';
const CACHE_VERSION = 2; // tăng khi đổi nguồn reverse geocoding (Mapbox/Nominatim) để bỏ cache cũ

function getCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function setCache(cache) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
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
 * Ưu tiên Mapbox nếu có VITE_MAPBOX_TOKEN, sau đó Nominatim (OSM). Có cache.
 * @param {number} lat
 * @param {number} lng
 * @param {{ mapboxToken?: string }} options - mapboxToken từ import.meta.env.VITE_MAPBOX_TOKEN (truyền từ nơi gọi nếu cần)
 * @returns {Promise<string|null>}
 */
export async function fetchAddressFromCoords(lat, lng, options = {}) {
    if (lat == null || lng == null) return null;
    const cacheKey = `v${CACHE_VERSION}_${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    const cache = getCache();
    if (cache[cacheKey]) {
        const cached = cache[cacheKey];
        const corrected = correctThuDucAddress(cached);
        if (corrected !== cached) {
            cache[cacheKey] = corrected;
            setCache(cache);
        }
        return corrected;
    }

    const mapboxToken = (options && options.mapboxToken) || (typeof
        import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.VITE_MAPBOX_TOKEN) || '';

    if (mapboxToken) {
        try {
            const addr = await fetchAddressMapboxReverse(lat, lng, mapboxToken);
            if (addr) {
                const corrected = correctThuDucAddress(addr);
                cache[cacheKey] = corrected;
                setCache(cache);
                return corrected;
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
        if (formatted) {
            cache[cacheKey] = formatted;
            setCache(cache);
        }
        return formatted;
    } catch {
        return null;
    }
}

/**
 * Forward Geocoding: tìm địa chỉ → gợi ý tọa độ dùng cho ô search.
 * Ưu tiên Mapbox Geocoding API (khi có VITE_MAPBOX_TOKEN).
 * @param {string} query
 * @param {{ mapboxToken?: string, limit?: number }} options
 * @returns {Promise<Array<{ id: string, name: string, fullAddress: string, lat: number, lng: number }>>}
 */
export async function searchPlaces(query, options = {}) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q || q.length < 3) return [];

    const mapboxToken =
        (options && options.mapboxToken) ||
        (typeof
            import.meta !== 'undefined' &&
            import.meta.env &&
            import.meta.env.VITE_MAPBOX_TOKEN) ||
        '';

    if (!mapboxToken) return [];

    const limit = options.limit != null ? options.limit : 5;
    const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
    );
    url.searchParams.set('access_token', mapboxToken);
    url.searchParams.set('language', 'vi');
    url.searchParams.set('limit', String(limit));

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
                return {
                    id: String(f.id || `${lat},${lng}`),
                    name: f.text || f.place_name || q,
                    fullAddress: f.place_name || f.text || q,
                    lat: Number(lat),
                    lng: Number(lng)
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}