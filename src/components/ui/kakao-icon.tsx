import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function KakaoIcon({ size = 20, color = '#3C1E1E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3c-5.523 0-10 3.582-10 8 0 2.84 1.83 5.335 4.608 6.808l-1.127 4.103c-.09.324.286.58.566.39l4.823-3.21c.365.05.738.077 1.12.077 5.523 0 10-3.582 10-8s-4.477-8-10-8z"
        fill={color}
      />
    </Svg>
  );
}
