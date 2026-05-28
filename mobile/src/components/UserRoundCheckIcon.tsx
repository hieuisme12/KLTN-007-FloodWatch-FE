import Svg, { Circle, G, Path } from 'react-native-svg';

type UserRoundCheckIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function UserRoundCheckIcon({
  size = 20,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: UserRoundCheckIconProps) {
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
        <Path d="M2 21a8 8 0 0 1 13.292-6" />
        <Circle cx="10" cy="8" r="5" />
        <Path d="m16 19l2 2l4-4" />
      </G>
    </Svg>
  );
}
