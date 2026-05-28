import Svg, { Path } from 'react-native-svg';

type MenuIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function MenuIcon({
  size = 20,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: MenuIconProps) {
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
      <Path d="M4 5h16M4 12h16M4 19h16" />
    </Svg>
  );
}
