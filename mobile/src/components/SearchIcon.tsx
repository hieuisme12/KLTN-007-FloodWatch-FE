import Svg, { Circle, G, Path } from 'react-native-svg';

type SearchIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function SearchIcon({
  size = 20,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: SearchIconProps) {
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
        <Path d="m21 21l-4.34-4.34" />
        <Circle cx="11" cy="11" r="8" />
      </G>
    </Svg>
  );
}
