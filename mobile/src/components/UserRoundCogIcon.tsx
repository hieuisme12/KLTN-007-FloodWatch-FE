import Svg, { Circle, G, Path } from 'react-native-svg';

type UserRoundCogIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
};

export default function UserRoundCogIcon({
  size = 20,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0
}: UserRoundCogIconProps) {
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
        <Path d="m14.305 19.53l.923-.382m0-2.296l-.923-.383m2.547-1.241l-.383-.923m.383 6.467l-.383.924m2.679-6.468l.383-.923m-.001 7.391l-.382-.924M2 21a8 8 0 0 1 10.434-7.62m8.338 3.472l.924-.383m-.924 2.679l.924.383" />
        <Circle cx="10" cy="8" r="5" />
        <Circle cx="18" cy="18" r="3" />
      </G>
    </Svg>
  );
}
