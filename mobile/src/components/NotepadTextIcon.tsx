import Svg, { G, Path, Rect } from 'react-native-svg';

type NotepadTextIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
};

export default function NotepadTextIcon({
  size = 24,
  color = '#000000',
  strokeWidth = 2,
  opacity = 1,
  rotation = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}: NotepadTextIconProps) {
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
        <Path d="M8 2v4m4-4v4m4-4v4" />
        <Rect x="4" y="4" width="16" height="18" rx="2" />
        <Path d="M8 10h6m-6 4h8m-8 4h5" />
      </G>
    </Svg>
  );
}
