import Svg, { Path } from 'react-native-svg';

type PinIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function PinIcon({
  size = 18,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: PinIconProps) {
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
      <Path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4a1 1 0 0 1 1 1z" />
    </Svg>
  );
}
