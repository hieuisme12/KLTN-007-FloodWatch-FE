import Svg, { Circle, G, Path } from 'react-native-svg';

type RadarIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function RadarIcon({
  size = 26,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: RadarIconProps) {
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
      <G fill="none">
        <Path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
        <Path d="M4 6h.01" />
        <Path d="M2.29 9.62a10 10 0 1 0 19.02-1.27" />
        <Path d="M16.24 7.76a6 6 0 1 0-8.01 8.91" />
        <Path d="M12 18h.01" />
        <Path d="M17.98 11.66a6 6 0 0 1-2.22 5.01" />
        <Circle cx="12" cy="12" r="2" />
        <Path d="m13.41 10.59l5.66-5.66" />
      </G>
    </Svg>
  );
}
