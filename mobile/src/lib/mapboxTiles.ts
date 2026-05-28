/** Mapbox Streets raster tiles for react-native-maps UrlTile (Expo Go). */
export function getMapboxTileUrl(): string | null {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
  if (!token) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`;
}
