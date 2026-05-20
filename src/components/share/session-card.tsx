import React, { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { resolveColorHex } from '@/constants/climb-colors';
import type { SessionDetail } from '@/hooks/use-session';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day} (${KO_WEEKDAYS[d.getDay()]})`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

type Props = {
  session: SessionDetail;
  size?: number;
  ratio?: '1:1' | '4:5' | '9:16';
  layoutType?: 'grid' | 'list' | 'stats';
  backgroundColor?: string;
  backgroundImageUri?: string | null;
  backgroundOpacity?: number;
};

// Custom layout-adjustable Share Card. captureRef target.
export const SessionShareCard = forwardRef<View, Props>(
  (
    {
      session,
      size = 360,
      ratio = '1:1',
      layoutType = 'grid',
      backgroundColor = '#ffffff',
      backgroundImageUri,
      backgroundOpacity = 0.4,
    },
    ref,
  ) => {
    // Determine card dimensions based on ratio
    let width = size;
    let height = size;
    if (ratio === '4:5') {
      height = size * 1.25;
    } else if (ratio === '9:16') {
      height = size * 1.777;
    }

    const sends = session.color_summary
      .filter((c) => c.sends > 0)
      .sort((a, b) => b.sends - a.sends);
    const totalSends = sends.reduce((acc, c) => acc + c.sends, 0);

    // Expand sends to individual color dots for Grid Layout
    const dots: { color: string; key: string }[] = [];
    for (const c of sends) {
      for (let i = 0; i < c.sends; i++) {
        dots.push({ color: c.color, key: `${c.color}-${i}` });
      }
    }

    const isDarkBg = ['#18181b', '#0f766e', '#3b0764'].includes(backgroundColor);
    const textColor = isDarkBg ? '#ffffff' : '#18181b';
    const textMutedColor = isDarkBg ? '#a1a1aa' : '#71717a';
    const textSubtleColor = isDarkBg ? '#71717a' : '#cbd5e1';
    const itemBg = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)';
    const itemBorder = isDarkBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';

    const dotSize = Math.max(
      16,
      Math.min(
        36,
        Math.floor((size - 80) / Math.ceil(Math.sqrt(Math.max(totalSends, 1)) + 1))
      )
    );
    
    const gymLabel = session.gym
      ? `${session.gym.name}${session.gym.branch ? ` ${session.gym.branch}` : ''}`
      : '암장 미선택';

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width,
          height,
          backgroundColor,
          padding: size * 0.08,
          justifyContent: 'space-between',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background image overlay */}
        {backgroundImageUri && (
          <Image
            source={{ uri: backgroundImageUri }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width,
              height,
              opacity: backgroundOpacity,
            }}
            resizeMode="cover"
          />
        )}

        {/* Top Header */}
        <View style={{ zIndex: 1 }}>
          <Text
            style={{
              color: textMutedColor,
              fontSize: size * 0.035,
              fontWeight: '600',
              letterSpacing: 0.5,
            }}
          >
            {formatDate(session.session_date)}
          </Text>
          <Text
            style={{
              color: textColor,
              fontSize: size * 0.056,
              fontWeight: '900',
              marginTop: 4,
              letterSpacing: -0.5,
            }}
            numberOfLines={1}
          >
            {gymLabel}
          </Text>
        </View>

        {/* Center Content based on selected Layout Type */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            marginVertical: size * 0.04,
          }}
        >
          {layoutType === 'grid' && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: Math.max(6, dotSize * 0.16),
                paddingHorizontal: 12,
              }}
            >
              {dots.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>
                  완등 기록 없음
                </Text>
              ) : (
                dots.map((d) => {
                  const hex = resolveColorHex(d.color);
                  const needsBorder = d.color === 'white' || d.color === 'yellow';
                  return (
                    <View
                      key={d.key}
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: hex,
                        borderWidth: needsBorder ? 1 : 0,
                        borderColor: '#d4d4d8',
                        shadowColor: hex,
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 1,
                      }}
                    />
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'list' && (
            <View style={{ width: '100%', gap: 6, paddingHorizontal: 10 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500', textAlign: 'center' }}>
                  완등 기록 없음
                </Text>
              ) : (
                sends.map((c) => {
                  const hex = resolveColorHex(c.color);
                  return (
                    <View
                      key={c.color}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: size * 0.024,
                        paddingHorizontal: size * 0.035,
                        backgroundColor: itemBg,
                        borderWidth: 1,
                        borderColor: itemBorder,
                        borderRadius: 16,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: hex,
                            borderWidth: c.color === 'white' ? 1 : 0,
                            borderColor: '#d4d4d8',
                          }}
                        />
                        <Text style={{ color: textColor, fontWeight: '700', fontSize: size * 0.038 }}>
                          {c.color.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ color: textColor, fontWeight: '800', fontSize: size * 0.038 }}>
                        {c.sends} 완등
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'stats' && (
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: size * 0.05 }}>
              <View
                style={{
                  width: size * 0.36,
                  height: size * 0.36,
                  borderRadius: (size * 0.36) / 2,
                  borderWidth: 4,
                  borderColor: '#0d9488',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: itemBg,
                  shadowColor: '#0d9488',
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text style={{ color: '#0d9488', fontSize: size * 0.11, fontWeight: '900' }}>
                  {totalSends}
                </Text>
                <Text style={{ color: textMutedColor, fontSize: size * 0.028, fontWeight: '700', letterSpacing: 1 }}>
                  TOTAL SENDS
                </Text>
              </View>

              {sends.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 6,
                    paddingHorizontal: 20,
                  }}
                >
                  {sends.map((c) => (
                    <View
                      key={c.color}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        backgroundColor: itemBg,
                        borderWidth: 1,
                        borderColor: itemBorder,
                        borderRadius: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: resolveColorHex(c.color),
                          borderWidth: c.color === 'white' ? 0.5 : 0,
                          borderColor: '#d4d4d8',
                        }}
                      />
                      <Text style={{ color: textColor, fontSize: size * 0.03, fontWeight: '800' }}>
                        {c.sends}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bottom Metadata & Brand Footer */}
        <View style={{ zIndex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: itemBg,
              borderWidth: 1,
              borderColor: itemBorder,
              paddingVertical: size * 0.024,
              paddingHorizontal: size * 0.04,
              borderRadius: 14,
              marginBottom: size * 0.04,
            }}
          >
            <Feather
              name="check-circle"
              size={size * 0.038}
              color="#0d9488"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: textColor,
                fontSize: size * 0.035,
                fontWeight: '700',
              }}
            >
              오늘의 완등 {totalSends}개
              {session.duration_min != null && ` · ${formatDuration(session.duration_min)}`}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopWidth: 1,
              borderColor: textSubtleColor,
              paddingTop: size * 0.03,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="trending-up" size={14} color="#0d9488" />
              <Text
                style={{
                  color: '#0d9488',
                  fontSize: size * 0.036,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                }}
              >
                Cragger
              </Text>
            </View>
            <Text
              style={{
                color: textMutedColor,
                fontSize: size * 0.026,
                fontWeight: '500',
              }}
            >
              cragger.app
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

SessionShareCard.displayName = 'SessionShareCard';
