import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  focused?: boolean;
};

export function SimpleHomeIcon({ size = 24, color = '#000000', focused = false }: Props) {
  if (focused) {
    // A clean, simple, and round-cornered filled home icon
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2.1c-.38 0-.74.15-1.02.43L2.69 10.5c-.56.56-.56 1.48 0 2.04.56.56 1.48.56 2.04 0L6 11.23V20c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-8.77l1.27 1.27c.56.56 1.48.56 2.04 0 .56-.56.56-1.48 0-2.04L13.02 2.53A1.44 1.44 0 0012 2.1z"
          fill={color}
        />
      </Svg>
    );
  }

  // A matching clean, simple, and round-cornered outline home icon
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.1c-.38 0-.74.15-1.02.43L2.69 10.5c-.56.56-.56 1.48 0 2.04.56.56 1.48.56 2.04 0L6 11.23V20c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-8.77l1.27 1.27c.56.56 1.48.56 2.04 0 .56-.56.56-1.48 0-2.04L13.02 2.53A1.44 1.44 0 0012 2.1zM16 20H8v-9.66l4-4 4 4V20z"
        fill={color}
      />
    </Svg>
  );
}
