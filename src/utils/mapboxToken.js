/**
 * Reads Mapbox token from common env keys and normalizes it.
 * Supports both VITE_MAPBOX_TOKEN and VITE_MAPBOX_ACCESS_TOKEN.
 */
export function getMapboxToken() {
  const raw =
    import.meta.env.VITE_MAPBOX_TOKEN ??
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ??
    '';

  if (typeof raw !== 'string') return '';
  const token = raw.trim().replace(/^["']|["']$/g, '');
  return token;
}

export function hasMapboxToken() {
  return getMapboxToken().length > 0;
}
