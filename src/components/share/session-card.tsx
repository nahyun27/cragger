import React, { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

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

    const isLead = session.discipline === 'lead';
    const sends = session.color_summary
      .filter((c) => c.sends > 0)
      .sort((a, b) => b.sends - a.sends);
    const boulderSendsTotal = sends.reduce((acc, c) => acc + c.sends, 0);

    // Lead: 등급 내림차순 (최고 → 최저)
    const leadSorted = [...(session.lead_summary ?? [])]
      .filter((r) => r.sends > 0)
      .reverse();
    const leadSendsTotal = leadSorted.reduce((acc, r) => acc + r.sends, 0);
    const topGrade = leadSorted[0]?.grade ?? null;

    const totalSends = isLead ? leadSendsTotal : boulderSendsTotal;

    // Expand sends to individual color dots for Grid Layout (boulder only)
    const dots: { color: string; key: string }[] = [];
    for (const c of sends) {
      for (let i = 0; i < c.sends; i++) {
        dots.push({ color: c.color, key: `${c.color}-${i}` });
      }
    }

    const isDarkBg = ['#0f172a', '#0e7490', '#3b0764'].includes(backgroundColor);
    const textColor = isDarkBg ? '#ffffff' : '#0f172a';
    const textMutedColor = isDarkBg ? '#94a3b8' : '#64748b';
    const textSubtleColor = isDarkBg ? '#64748b' : '#cbd5e1';
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

    // 암장 로고 — 있으면 카드에 워터마크처럼 노출.
    // 사진/투명 배경(영상 위) → 우측 상단 작게, 솔리드 색깔 → 가운데 하단 부드럽게.
    const gymLogoUrl = session.gym?.logo_url ?? null;
    const hasOverlay = backgroundImageUri != null || backgroundColor === 'transparent';
    const logoPosition: 'topRight' | 'centerBottom' = hasOverlay ? 'topRight' : 'centerBottom';

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

        {/* Gym logo — 우측 상단 (사진/투명 배경일 때) */}
        {gymLogoUrl && logoPosition === 'topRight' && (
          <View
            style={{
              position: 'absolute',
              top: size * 0.05,
              right: size * 0.05,
              width: size * 0.13,
              height: size * 0.13,
              borderRadius: size * 0.065,
              backgroundColor: 'rgba(255,255,255,0.95)',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              zIndex: 2,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          >
            <Image
              source={{ uri: gymLogoUrl }}
              style={{ width: '78%', height: '78%' }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Gym logo — 가운데 하단 워터마크 (솔리드 배경일 때) */}
        {gymLogoUrl && logoPosition === 'centerBottom' && (
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.06,
              left: 0,
              right: 0,
              alignItems: 'center',
              opacity: 0.4,
              zIndex: 1,
            }}
          >
            <Image
              source={{ uri: gymLogoUrl }}
              style={{ width: size * 0.18, height: size * 0.09 }}
              resizeMode="contain"
            />
          </View>
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

        {/* Layout content — bottom-anchored */}
        <View
          style={{
            alignItems: 'center',
            zIndex: 1,
            marginTop: size * 0.04,
          }}
        >
          {layoutType === 'grid' && isLead && (
            <View style={{ width: '100%', gap: size * 0.018, paddingHorizontal: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500', textAlign: 'center' }}>
                  완등 기록 없음
                </Text>
              ) : (
                leadSorted.map((r) => {
                  const chipSize = size * 0.08;
                  const overlap = chipSize * 0.35;
                  return (
                    <View key={r.grade} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <View
                        style={{
                          minWidth: size * 0.13,
                          paddingHorizontal: size * 0.025,
                          paddingVertical: size * 0.012,
                          borderRadius: chipSize / 2,
                          backgroundColor: '#06b6d4',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: size * 0.025,
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: size * 0.034,
                            fontWeight: '900',
                            letterSpacing: -0.3,
                          }}
                        >
                          {r.grade}
                        </Text>
                      </View>
                      {Array.from({ length: r.sends }).map((_, i) => (
                        <View
                          key={i}
                          style={{
                            width: chipSize,
                            height: chipSize,
                            borderRadius: chipSize / 2,
                            backgroundColor: '#06b6d4',
                            borderWidth: 2,
                            borderColor: backgroundColor,
                            marginLeft: i === 0 ? 0 : -overlap,
                          }}
                        />
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'grid' && !isLead && (
            <View style={{ width: '100%', gap: size * 0.018, paddingHorizontal: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500', textAlign: 'center' }}>
                  완등 기록 없음
                </Text>
              ) : (
                sends.map((cc) => {
                  const hex = resolveColorHex(cc.color);
                  const needsBorder = cc.color === 'white' || cc.color === 'yellow';
                  const chipSize = size * 0.08;
                  const overlap = chipSize * 0.35;
                  return (
                    <View key={cc.color} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      {Array.from({ length: cc.sends }).map((_, i) => (
                        <View
                          key={i}
                          style={{
                            width: chipSize,
                            height: chipSize,
                            borderRadius: chipSize / 2,
                            backgroundColor: hex,
                            borderWidth: 2,
                            borderColor: needsBorder ? (isDarkBg ? '#1e293b' : '#cbd5e1') : backgroundColor,
                            marginLeft: i === 0 ? 0 : -overlap,
                          }}
                        />
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'list' && isLead && (
            <View style={{ gap: size * 0.012, alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>
                  완등 기록 없음
                </Text>
              ) : (
                leadSorted.map((r) => (
                  <View
                    key={r.grade}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: size * 0.014,
                      paddingHorizontal: size * 0.025,
                      backgroundColor: itemBg,
                      borderWidth: 1,
                      borderColor: itemBorder,
                      borderRadius: size * 0.04,
                    }}
                  >
                    <Text style={{ color: textColor, fontWeight: '900', fontSize: size * 0.04, letterSpacing: -0.3, marginRight: size * 0.025 }}>
                      {r.grade}
                    </Text>
                    <Text style={{ color: textMutedColor, fontWeight: '800', fontSize: size * 0.032 }}>
                      ×{r.sends}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {layoutType === 'list' && !isLead && (
            <View style={{ gap: size * 0.012, alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>
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
                        paddingVertical: size * 0.014,
                        paddingHorizontal: size * 0.025,
                        backgroundColor: itemBg,
                        borderWidth: 1,
                        borderColor: itemBorder,
                        borderRadius: size * 0.04,
                      }}
                    >
                      <View
                        style={{
                          width: size * 0.034,
                          height: size * 0.034,
                          borderRadius: (size * 0.034) / 2,
                          backgroundColor: hex,
                          borderWidth: c.color === 'white' ? 1 : 0,
                          borderColor: '#cbd5e1',
                          marginRight: size * 0.02,
                        }}
                      />
                      <Text style={{ color: textColor, fontWeight: '800', fontSize: size * 0.034, marginRight: size * 0.02 }}>
                        {c.color.toUpperCase()}
                      </Text>
                      <Text style={{ color: textMutedColor, fontWeight: '800', fontSize: size * 0.032 }}>
                        ×{c.sends}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'stats' && isLead && (
            <View style={{ gap: size * 0.025, alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>
                  완등 기록 없음
                </Text>
              ) : (
                leadSorted.map((r) => {
                  const dot = size * 0.08;
                  return (
                    <View
                      key={r.grade}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View
                        style={{
                          minWidth: dot,
                          height: dot,
                          paddingHorizontal: size * 0.022,
                          borderRadius: dot / 2,
                          backgroundColor: '#06b6d4',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: size * 0.04,
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: size * 0.038,
                            fontWeight: '900',
                            letterSpacing: -0.3,
                          }}
                        >
                          {r.grade}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: textColor,
                          fontSize: size * 0.072,
                          fontWeight: '900',
                          letterSpacing: -1,
                        }}
                      >
                        {r.sends}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {layoutType === 'stats' && !isLead && (
            <View style={{ gap: size * 0.025, alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>
                  완등 기록 없음
                </Text>
              ) : (
                sends.map((cc) => {
                  const hex = resolveColorHex(cc.color);
                  const needsBorder = cc.color === 'white' || cc.color === 'yellow';
                  const dot = size * 0.08;
                  return (
                    <View
                      key={cc.color}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View
                        style={{
                          width: dot,
                          height: dot,
                          borderRadius: dot / 2,
                          backgroundColor: hex,
                          borderWidth: needsBorder ? 1 : 0,
                          borderColor: '#cbd5e1',
                          marginRight: size * 0.04,
                        }}
                      />
                      <Text
                        style={{
                          color: textColor,
                          fontSize: size * 0.072,
                          fontWeight: '900',
                          letterSpacing: -1,
                        }}
                      >
                        {cc.sends}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>

      </View>
    );
  },
);

SessionShareCard.displayName = 'SessionShareCard';
