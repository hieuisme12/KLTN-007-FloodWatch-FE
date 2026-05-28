import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';

type MapPinIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function MapPinIcon({
  size = 26,
  color = '#0ea5e9',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: MapPinIconProps) {
  const pinPath = 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0';

  return (
    <Svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      style={rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined}
    >
      <Defs>
        <Mask id="pin-hole-mask">
          <Rect x="0" y="0" width="24" height="24" fill="#fff" />
          <Circle cx="12" cy="10" r="3" fill="#000" />
        </Mask>
      </Defs>
      <G>
        <Path d={pinPath} fill={color} mask="url(#pin-hole-mask)" />
        <Path d={pinPath} fill="none" />
        <Circle cx="12" cy="10" r="3" fill="none" />
      </G>
    </Svg>
  );
}
