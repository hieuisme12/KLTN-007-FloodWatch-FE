import Svg, { Circle, G, Path } from 'react-native-svg';

type TruckIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
};

export default function TruckIcon({
  size = 18,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}: TruckIconProps) {
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
        <Path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m10 0H9m10 0h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <Circle cx="17" cy="18" r="2" />
        <Circle cx="7" cy="18" r="2" />
      </G>
    </Svg>
  );
}
