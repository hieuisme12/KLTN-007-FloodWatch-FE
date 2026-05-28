import Svg, { Circle, G, Path } from 'react-native-svg';

type CircleXIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function CircleXIcon({
  size = 20,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: CircleXIconProps) {
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
        <Circle cx="12" cy="12" r="10" />
        <Path d="m15 9l-6 6m0-6l6 6" />
      </G>
    </Svg>
  );
}
