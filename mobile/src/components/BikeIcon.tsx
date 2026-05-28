import Svg, { Circle, G, Path } from 'react-native-svg';

type BikeIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
};

export default function BikeIcon({
  size = 18,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}: BikeIconProps) {
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
        <Circle cx="18.5" cy="17.5" r="3.5" />
        <Circle cx="5.5" cy="17.5" r="3.5" />
        <Circle cx="15" cy="5" r="1" />
        <Path d="M12 17.5V14l-3-3l4-3l2 3h2" />
      </G>
    </Svg>
  );
}
