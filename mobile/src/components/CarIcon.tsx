import Svg, { Circle, G, Path } from 'react-native-svg';

type CarIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
};

export default function CarIcon({
  size = 18,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}: CarIconProps) {
  const viewBoxSize = 24 + padding * 2;
  const viewBoxOffset = -padding;

  return (
    <Svg
      viewBox={`${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      style={{
        transform: [
          { rotate: `${rotation}deg` },
          { scaleX: flipHorizontal ? -1 : 1 },
          { scaleY: flipVertical ? -1 : 1 }
        ]
      }}
    >
      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <Circle cx="7" cy="17" r="2" />
        <Path d="M9 17h6" />
        <Circle cx="17" cy="17" r="2" />
      </G>
    </Svg>
  );
}
