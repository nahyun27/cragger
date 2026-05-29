import React from 'react';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

export function InstagramIcon({ size = 12 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        {/* Instagram signature gradient from bottom-left to top-right */}
        <LinearGradient id="instagram-gradient" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#fdf497" />
          <Stop offset="5%" stopColor="#fdf497" />
          <Stop offset="45%" stopColor="#fd5949" />
          <Stop offset="60%" stopColor="#d6249f" />
          <Stop offset="90%" stopColor="#285aeb" />
        </LinearGradient>
      </Defs>
      {/* Outer rounded container with gradient */}
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        fill="url(#instagram-gradient)"
      />
      {/* Inner white glyph parts */}
      <Rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <Circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <Circle
        cx="15.5"
        cy="8.5"
        r="0.8"
        fill="#ffffff"
      />
    </Svg>
  );
}
