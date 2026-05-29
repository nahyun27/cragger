/**
 * 뱃지 아이콘 — 시리즈별 일관된 시각 디자인.
 *
 * 시리즈:
 * - 완등 (medal-N): bronze→silver→gold 그라데이션 메달 (숫자 크게)
 *   icon = 'target' → 1, 'medal-100' / 'medal-500' / 'medal-1000' 등
 * - 세션 (session): 진행도 막대 + 숫자
 *   icon = 'session-N'
 * - 연속 streak: 위로 향하는 화살표 + 강도별 색깔
 *   icon = 'streak-N'
 * - V그레이드: 컬러 텍스트 + 등급별 색조 강화
 *   icon = 'V0' .. 'V9'
 * - 리드 5.1x: 'V'/'5.' 텍스트 굵게
 * - 레인보우: 무지개 그라데이션 원
 *   icon = 'rainbow'
 * - 색깔 마스터: 다색 점들
 *   icon = 'palette'
 * - 소셜 (글/댓글/투표/크루/모임/대결): Feather icon 그대로
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, G } from 'react-native-svg';

type BadgeIconProps = {
  icon: string;
  color: string;
  size?: number;
};

const RAINBOW = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'] as const;

export function BadgeIcon({ icon, color, size = 20 }: BadgeIconProps) {
  // 완등 메달 — 'target' (첫완등) / 'medal-100' / 'medal-500' / 'medal-1000'
  if (icon === 'target' || icon.startsWith('medal-')) {
    const num = icon === 'target' ? '1' : icon.split('-')[1];
    const tier =
      num === '1' ? 'bronze' :
      num === '100' ? 'silver' :
      num === '500' ? 'gold' :
      num === '1000' ? 'platinum' : 'bronze';
      
    const grads: Record<string, [string, string]> = {
      bronze:   ['#fcd34d', '#92400e'], // brighter top, darker bottom
      silver:   ['#f3f4f6', '#4b5563'],
      gold:     ['#fef08a', '#a16207'],
      platinum: ['#cffafe', '#0891b2'],
    };
    
    const w = size * 1.7;
    const h = size * 1.7;
    const r = w / 2;
    
    return (
      <View style={{ 
        width: w, 
        height: h, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: grads[tier][1], 
        shadowOpacity: 0.4, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id={`medal-base-${tier}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={grads[tier][0]} />
              <Stop offset="100%" stopColor={grads[tier][1]} />
            </SvgLinearGradient>
            <SvgLinearGradient id={`medal-inner-${tier}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={grads[tier][1]} />
              <Stop offset="100%" stopColor={grads[tier][0]} />
            </SvgLinearGradient>
            <SvgLinearGradient id="medal-shine" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Outer thick rim */}
          <Circle cx={r} cy={r} r={r} fill={`url(#medal-base-${tier})`} />
          {/* Inner recessed area (reversed gradient for depth) */}
          <Circle cx={r} cy={r} r={r * 0.75} fill={`url(#medal-inner-${tier})`} />
          
          {/* Glossy overlay over the whole medal */}
          <Circle cx={r} cy={r} r={r} fill="url(#medal-shine)" />
          
          {/* Subtle white highlights on edges */}
          <Circle cx={r} cy={r} r={r - size * 0.03} fill="none" stroke="#ffffff" strokeWidth={size * 0.04} strokeOpacity={0.6} />
          <Circle cx={r} cy={r} r={r * 0.75} fill="none" stroke="#ffffff" strokeWidth={size * 0.04} strokeOpacity={0.3} />
          <Circle cx={r} cy={r} r={r * 0.75} fill="none" stroke="#000000" strokeWidth={size * 0.02} strokeOpacity={0.3} />
        </Svg>
        <Text style={[textIconStyles.text, {
          color: '#ffffff',
          fontSize: num.length >= 4 ? size * 0.45 : num.length >= 3 ? size * 0.55 : size * 0.7,
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }]}>{num}</Text>
      </View>
    );
  }

  // 세션 — 'session-N' (달력 모양 커스텀 방패)
  if (icon.startsWith('session-')) {
    const num = icon.split('-')[1];
    const w = size * 1.6;
    const h = size * 1.8;
    const startY = size * 0.2;
    const r = size * 0.25;
    const headerY = startY + size * 0.4;
    
    const bodyPath = `
      M 0 ${startY + r}
      A ${r} ${r} 0 0 1 ${r} ${startY}
      L ${w - r} ${startY}
      A ${r} ${r} 0 0 1 ${w} ${startY + r}
      L ${w} ${h - r}
      A ${r} ${r} 0 0 1 ${w - r} ${h}
      L ${r} ${h}
      A ${r} ${r} 0 0 1 0 ${h - r}
      Z
    `;

    return (
      <View style={{ 
        width: w, 
        height: h, 
        alignItems: 'center', 
        shadowColor: color, 
        shadowOpacity: 0.35, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="session-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          {/* Main Body */}
          <Path d={bodyPath} fill={color} />
          <Path d={bodyPath} fill="url(#session-grad)" />
          {/* Inner Highlight */}
          <Path d={bodyPath} fill="none" stroke="#ffffff" strokeWidth={size * 0.08} strokeOpacity={0.4} />
          
          {/* Calendar top divider */}
          <Path d={`M 0 ${headerY} L ${w} ${headerY}`} stroke="#ffffff" strokeWidth={size * 0.08} strokeOpacity={0.4} />

          {/* Binder rings */}
          <Path d={`M ${w * 0.3} ${size * 0.05} L ${w * 0.3} ${startY + size * 0.15}`} stroke="#ffffff" strokeWidth={size * 0.18} strokeLinecap="round" opacity={0.9} />
          <Path d={`M ${w * 0.7} ${size * 0.05} L ${w * 0.7} ${startY + size * 0.15}`} stroke="#ffffff" strokeWidth={size * 0.18} strokeLinecap="round" opacity={0.9} />
        </Svg>
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: startY + size * 0.15 }}>
          <Text style={[textIconStyles.text, {
            color: '#ffffff',
            fontSize: num.length >= 3 ? size * 0.5 : size * 0.65,
            textShadowColor: 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }]}>
            {num}
          </Text>
        </View>
      </View>
    );
  }

  // 연속 streak — 'streak-N'
  if (icon.startsWith('streak-')) {
    const num = parseInt(icon.split('-')[1] ?? '0', 10);
    // 3 → trending-up / 7 → zap / 30 → activity
    const featherName: keyof typeof Feather.glyphMap =
      num >= 30 ? 'activity' : num >= 7 ? 'zap' : 'trending-up';
      
    const rectSize = size * 1.25;
    const w = size * 1.8;
    const h = size * 1.8;
    const center = w / 2;
    const r = size * 0.3;

    return (
      <View style={{ 
        width: w, 
        height: h, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: color, 
        shadowOpacity: 0.4, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="streak-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          <G rotation="45" origin={`${center}, ${center}`}>
            <Rect x={center - rectSize/2} y={center - rectSize/2} width={rectSize} height={rectSize} rx={r} fill={color} />
            <Rect x={center - rectSize/2} y={center - rectSize/2} width={rectSize} height={rectSize} rx={r} fill="url(#streak-grad)" />
            <Rect x={center - rectSize/2} y={center - rectSize/2} width={rectSize} height={rectSize} rx={r} fill="none" stroke="#ffffff" strokeWidth={size * 0.08} strokeOpacity={0.4} />
          </G>
        </Svg>
        <Feather 
          name={featherName} 
          size={size * 0.85} 
          color="#ffffff" 
          style={{ 
            textShadowColor: 'rgba(0,0,0,0.3)', 
            textShadowOffset: { width: 0, height: 1 }, 
            textShadowRadius: 2,
            opacity: 0.95
          }} 
        />
      </View>
    );
  }

  // V그레이드 / 리드 — 방패 모양 + 흰 텍스트
  if (/^V\d/.test(icon) || /^5\.\d/.test(icon)) {
    const w = size * 1.8;
    const h = size * 2.1;
    const r = size * 0.3; // Top border radius
    const pointHeight = size * 0.6;
    
    // SVG path for a tag/shield: flat top with rounded corners, straight sides, pointed bottom
    const path = `
      M 0 ${r}
      A ${r} ${r} 0 0 1 ${r} 0
      L ${w - r} 0
      A ${r} ${r} 0 0 1 ${w} ${r}
      L ${w} ${h - pointHeight}
      L ${w / 2} ${h}
      L 0 ${h - pointHeight}
      Z
    `;

    return (
      <View style={{ 
        width: w, 
        height: h, 
        alignItems: 'center', 
        shadowColor: color, 
        shadowOpacity: 0.35, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          {/* Base color */}
          <Path d={path} fill={color} />
          {/* Glossy gradient overlay */}
          <Path d={path} fill="url(#grad)" />
          {/* Subtle inner highlight/border */}
          <Path d={path} fill="none" stroke="#ffffff" strokeWidth={size * 0.08} strokeOpacity={0.4} />
        </Svg>
        <View style={{ flex: 1, justifyContent: 'center', marginTop: -size * 0.25 }}>
          <Text style={[textIconStyles.text, {
            color: '#ffffff',
            fontSize: icon.length >= 4 ? size * 0.5 : size * 0.75,
            textShadowColor: 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }]}>
            {icon}
          </Text>
        </View>
      </View>
    );
  }

  // 첫 대결 (battle-shield) — 커스텀 방패 + 교차된 칼 모양
  if (icon === 'battle-shield') {
    const w = size * 1.6;
    const h = size * 1.9;
    const r = size * 0.2; // Top border radius
    
    // Classic crest/shield shape: flat top, rounded bottom converging to point
    const shieldPath = `
      M 0 ${r}
      A ${r} ${r} 0 0 1 ${r} 0
      L ${w - r} 0
      A ${r} ${r} 0 0 1 ${w} ${r}
      L ${w} ${h * 0.5}
      C ${w} ${h * 0.8} ${w * 0.7} ${h} ${w / 2} ${h}
      C ${w * 0.3} ${h} 0 ${h * 0.8} 0 ${h * 0.5}
      Z
    `;

    return (
      <View style={{ 
        width: w, 
        height: h, 
        alignItems: 'center', 
        shadowColor: color, 
        shadowOpacity: 0.35, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 4 }, 
        elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="battle-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          <Path d={shieldPath} fill={color} />
          <Path d={shieldPath} fill="url(#battle-grad)" />
          <Path d={shieldPath} fill="none" stroke="#ffffff" strokeWidth={size * 0.08} strokeOpacity={0.4} />
        </Svg>
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: size * 0.05 }}>
          <MaterialCommunityIcons 
            name="sword-cross" 
            size={size * 0.9} 
            color="#ffffff" 
            style={{ 
              textShadowColor: 'rgba(0,0,0,0.3)', 
              textShadowOffset: { width: 0, height: 1 }, 
              textShadowRadius: 2,
              opacity: 0.95 
            }} 
          />
        </View>
      </View>
    );
  }

  // 레인보우 — 무지개 모양 (부채꼴 쿼터)
  if (icon === 'rainbow') {
    const w = size * 1.6;
    const h = size * 1.6;
    const strokeW = size * 0.2;
    const boundW = size * 1.4; // 7 colors * 0.2
    
    // Center the sector in the 1.6 x 1.6 box
    const cx = (w - boundW) / 2;
    const cy = h - (h - boundW) / 2;
    
    const colors = RAINBOW;

    return (
      <View style={{
        width: w, height: h, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#3b82f6', shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5,
      }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="rainbow-shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </SvgLinearGradient>
          </Defs>
          
          <G x={cx} y={cy}>
            {/* 무지개 부채꼴 */}
            {colors.map((c, i) => {
              const r = size * 1.3 - i * strokeW;
              return (
                <Path 
                  key={c} 
                  d={`M 0 ${-r} A ${r} ${r} 0 0 1 ${r} 0`} 
                  fill="none" 
                  stroke={c} 
                  strokeWidth={strokeW + 0.5} // Add 0.5 to overlap slightly and prevent anti-aliasing gaps
                />
              );
            })}
            
            {/* 3D 광택 오버레이 */}
            {colors.map((c, i) => {
              const r = size * 1.3 - i * strokeW;
              return (
                <Path 
                  key={`shine-${i}`} 
                  d={`M 0 ${-r} A ${r} ${r} 0 0 1 ${r} 0`} 
                  fill="none" 
                  stroke="url(#rainbow-shine)" 
                  strokeWidth={strokeW + 0.5} 
                />
              );
            })}
          </G>
        </Svg>
      </View>
    );
  }

  // 색깔 마스터 — 실제 화가의 팔레트 (둥근 보드 + 엄지 구멍 + 5색 페인트 블롭)
  if (icon === 'palette') {
    const s = size;
    const outer = s * 1.6;
    const dotSize = s * 0.34;
    const dotR = dotSize / 2;
    const center = outer / 2;
    const r = s * 0.55;
    const dots = [
      { angle: -150, color: '#ef4444' },
      { angle: -100, color: '#f59e0b' },
      { angle: -50,  color: '#eab308' },
      { angle: 0,    color: '#22c55e' },
      { angle: 50,   color: '#3b82f6' },
    ];
    return (
      <View style={{
        width: outer, height: outer, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#d97706', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 5,
      }}>
        {/* Base Palette */}
        <View style={{
          position: 'absolute', width: outer, height: outer, borderRadius: outer / 2, backgroundColor: '#fbbf24',
        }} />
        <Svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`} style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="palette-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={center} cy={center} r={center} fill="url(#palette-grad)" />
          {/* Outer edge highlight */}
          <Circle cx={center} cy={center} r={center - s*0.04} fill="none" stroke="#ffffff" strokeWidth={s*0.06} strokeOpacity={0.5} />
        </Svg>
        {/* Thumb hole */}
        <View style={{
          position: 'absolute', width: s * 0.55, height: s * 0.55, borderRadius: s * 0.275, backgroundColor: '#fef3c7',
          top: outer * 0.55, left: outer * 0.18,
          shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.4, shadowRadius: 3, elevation: 2,
        }} />
        {/* Paint Blobs */}
        {dots.map(({ angle, color: dotColor }, i) => {
          const rad = (angle * Math.PI) / 180;
          const px = center + r * Math.cos(rad) - dotR;
          const py = center + r * Math.sin(rad) - dotR;
          return (
            <View key={i} style={{
              position: 'absolute', width: dotSize, height: dotSize, borderRadius: dotR, backgroundColor: dotColor, top: py, left: px,
              shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3, shadowRadius: 1, elevation: 1,
            }} />
          );
        })}
      </View>
    );
  }

  // Known feather icon mapping fallback (Social and other generic categories)
  const featherName = [
    'target', 'award', 'star', 'calendar', 'clock', 'activity',
    'aperture', 'layers', 'edit-2', 'message-circle', 'pie-chart',
    'users', 'flag', 'coffee', 'shield', 'trending-up', 'zap'
  ].includes(icon) ? icon : 'star';

  const w = size * 1.6;
  const h = size * 1.6;
  const rad = w / 2;

  return (
    <View style={{
      width: w, 
      height: h, 
      alignItems: 'center', 
      justifyContent: 'center',
      shadowColor: color, 
      shadowOpacity: 0.4, 
      shadowRadius: 6, 
      shadowOffset: { width: 0, height: 4 }, 
      elevation: 5,
    }}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute' }}>
        <Defs>
          <SvgLinearGradient id="fallback-grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={rad} cy={rad} r={rad} fill={color} />
        <Circle cx={rad} cy={rad} r={rad} fill="url(#fallback-grad)" />
        <Circle cx={rad} cy={rad} r={rad - size * 0.04} fill="none" stroke="#ffffff" strokeWidth={size * 0.06} strokeOpacity={0.5} />
      </Svg>
      <Feather 
        name={featherName as any} 
        size={size * 0.85} 
        color="#ffffff" 
        style={{ 
          textShadowColor: 'rgba(0,0,0,0.3)', 
          textShadowOffset: { width: 0, height: 1 }, 
          textShadowRadius: 2, 
          opacity: 0.95 
        }} 
      />
    </View>
  );
}

const medalStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  text: {
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
});

const sessionStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const streakStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const textIconStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});

const rainbowStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: '#ffffff',
  },
});

