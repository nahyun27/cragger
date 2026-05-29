import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  focused?: boolean;
};

export function SimpleHomeIcon({ size = 24, color = '#000000', focused = false }: Props) {
  if (focused) {
    // Squat, cute, and wider rounded home icon
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12h.5c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1L13.1 4.3c-.6-.6-1.6-.6-2.2 0L3.4 9.4c-.3.3-.5.7-.5 1.1 0 .8.7 1.5 1.5 1.5H6v5.5c0 1.4 1.1 2.5 2.5 2.5H10v-4.5c0-1.1.9-2 2-2s2 .9 2 2V20h1.5c1.4 0 2.5-1.1 2.5-2.5v-5.5H19z"
          fill={color}
        />
      </Svg>
    );
  }

  // Matching squat outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12h.5c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1L13.1 4.3c-.6-.6-1.6-.6-2.2 0L3.4 9.4c-.3.3-.5.7-.5 1.1 0 .8.7 1.5 1.5 1.5H6v5.5c0 1.4 1.1 2.5 2.5 2.5H10v-4.5c0-1.1.9-2 2-2s2 .9 2 2V20h1.5c1.4 0 2.5-1.1 2.5-2.5v-5.5H19z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
