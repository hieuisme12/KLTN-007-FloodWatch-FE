import { View } from 'react-native';

export const PROVIDER_DEFAULT = 'default';

function Stub() {
  return null;
}

export const Marker = Stub;
export const Callout = Stub;
export const Polyline = Stub;
export const UrlTile = Stub;

export default function MapView({ children, style }) {
  return <View style={style}>{children}</View>;
}
