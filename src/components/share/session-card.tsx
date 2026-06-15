import React, { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { resolveColorHex } from '@/constants/climb-colors';
import type { SessionDetail } from '@/hooks/use-session';
import { matchGymStyle } from '@/lib/gym-logos';

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
  showGymLogo?: boolean;
};

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
      showGymLogo = true,
    },
    ref,
  ) => {
    let width = size;
    let height = size;
    if (ratio === '4:5') height = size * 1.25;
    else if (ratio === '9:16') height = size * 1.777;

    const isLead = session.discipline === 'lead';
    const sends = session.color_summary
      .filter((c) => c.sends > 0)
      .sort((a, b) => b.sends - a.sends);
    const boulderSendsTotal = sends.reduce((acc, c) => acc + c.sends, 0);

    const leadSorted = [...(session.lead_summary ?? [])]
      .filter((r) => r.sends > 0)
      .reverse();
    const leadSendsTotal = leadSorted.reduce((acc, r) => acc + r.sends, 0);
    const topGrade = leadSorted[0]?.grade ?? null;
    const totalSends = isLead ? leadSendsTotal : boulderSendsTotal;

    const dots: { color: string; key: string }[] = [];
    for (const c of sends) {
      for (let i = 0; i < c.sends; i++) {
        dots.push({ color: c.color, key: `${c.color}-${i}` });
      }
    }

    const isDarkBg = ['#0f172a', '#0e7490', '#3b0764'].includes(backgroundColor);
    const textColor = isDarkBg ? '#ffffff' : '#0f172a';
    const textMutedColor = isDarkBg ? '#94a3b8' : '#64748b';
    const itemBg = isDarkBg ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)';
    const itemBorder = isDarkBg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';
    // ── contentScale: 사용 가능 높이 대비 콘텐츠 자연 높이 비율로 스케일 조정 ──
    const cardPadding = size * 0.08;
    const headerH = size * 0.035 * 1.3 + 4 + size * 0.056 * 1.3; // date + title (line heights)
    const contentMarginTop = size * 0.04;
    const logoRowH = size * 0.04; // 하단 cragger 로고 행
    const availableH = height - 2 * cardPadding - headerH - contentMarginTop - logoRowH;

    const numItems = isLead ? leadSorted.length : sends.length;
    let itemScale = 1;
    if (numItems > 0) {
      let naturalItemH: number;
      let naturalGap: number;
      if (layoutType === 'grid') {
        naturalItemH = size * 0.08;
        naturalGap = size * 0.018;
      } else if (layoutType === 'list') {
        naturalItemH = size * 0.034 + 2 * size * 0.016;
        naturalGap = size * 0.012;
      } else {
        naturalItemH = size * 0.08;
        naturalGap = size * 0.025;
      }
      const naturalTotal = numItems * naturalItemH + Math.max(0, numItems - 1) * naturalGap;
      itemScale = naturalTotal > 0 ? Math.min(1, availableH / naturalTotal) : 1;
    }

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

    const gymLogoUrl = session.gym?.logo_url ?? null;
    const { logo: staticLogoSource, bg: staticLogoBg } = session.gym
      ? matchGymStyle(session.gym.name, session.gym.branch)
      : { logo: null, bg: null };
    const resolvedLogoSource = gymLogoUrl ? { uri: gymLogoUrl } : staticLogoSource;
    const resolvedLogoBg = staticLogoBg ?? 'rgba(255,255,255,0.95)';

    // 그래프(grid) 레이아웃 아이템 sizes
    const chipSize = size * 0.08 * itemScale;
    const chipOverlap = chipSize * 0.35;
    const gridGap = size * 0.018 * itemScale;

    // 리스트 레이아웃 sizes
    const listDot = size * 0.034 * itemScale;
    const listPadV = size * 0.014 * itemScale;
    const listGap = size * 0.012 * itemScale;
    const listFontSz = size * 0.034 * itemScale;

    // 심플(stats) 레이아웃 sizes
    const statDot = size * 0.08 * itemScale;
    const statGap = size * 0.025 * itemScale;
    const statNumFont = size * 0.072 * itemScale;
    const statGradeFont = size * 0.038 * itemScale;
    const statChipFont = size * 0.034 * itemScale;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width,
          height,
          backgroundColor,
          padding: cardPadding,
          justifyContent: 'space-between',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background image */}
        {backgroundImageUri && (
          <Image
            source={{ uri: backgroundImageUri }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width, height, opacity: backgroundOpacity }}
            resizeMode="cover"
          />
        )}

        {/* Gym logo / 이니셜 — 우측 상단 (showGymLogo true일 때만) */}
        {showGymLogo && session.gym && (
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.05,
              right: size * 0.05,
              width: size * 0.13,
              height: size * 0.13,
              borderRadius: size * 0.065,
              backgroundColor: resolvedLogoBg,
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
            {resolvedLogoSource ? (
              <Image source={resolvedLogoSource} style={{ width: '78%', height: '78%' }} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: size * 0.048, fontWeight: '900', color: '#06b6d4', letterSpacing: -0.5 }}>
                {session.gym.name.slice(0, 2)}
              </Text>
            )}
          </View>
        )}

        {/* Top Header */}
        <View style={{ zIndex: 1 }}>
          <Text style={{ color: textMutedColor, fontSize: size * 0.035, fontWeight: '600', letterSpacing: 0.5 }}>
            {formatDate(session.session_date)}
          </Text>
          <Text
            style={{ color: textColor, fontSize: size * 0.056, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 }}
            numberOfLines={1}
          >
            {gymLabel}
          </Text>
        </View>

        {/* Visualization */}
        <View style={{ alignItems: 'flex-start', zIndex: 1, marginTop: contentMarginTop }}>

          {/* ─── grid / lead ─── */}
          {layoutType === 'grid' && isLead && (
            <View style={{ width: '100%', gap: gridGap, paddingRight: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500', textAlign: 'center' }}>완등 기록 없음</Text>
              ) : (
                leadSorted.map((r) => (
                  <View key={r.grade} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <View
                      style={{
                        minWidth: size * 0.13 * itemScale,
                        paddingHorizontal: size * 0.025 * itemScale,
                        paddingVertical: size * 0.012 * itemScale,
                        borderRadius: chipSize / 2,
                        backgroundColor: '#06b6d4',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: size * 0.025 * itemScale,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: statChipFont, fontWeight: '900', letterSpacing: -0.3 }}>
                        {r.grade}
                      </Text>
                    </View>
                    {Array.from({ length: r.sends }).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: chipSize, height: chipSize, borderRadius: chipSize / 2,
                          backgroundColor: '#06b6d4', borderWidth: 2, borderColor: backgroundColor,
                          marginLeft: i === 0 ? 0 : -chipOverlap,
                        }}
                      />
                    ))}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ─── grid / boulder ─── */}
          {layoutType === 'grid' && !isLead && (
            <View style={{ width: '100%', gap: gridGap, paddingRight: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500', textAlign: 'center' }}>완등 기록 없음</Text>
              ) : (
                sends.map((cc) => {
                  const hex = resolveColorHex(cc.color);
                  const needsBorder = cc.color === 'white' || cc.color === 'yellow';
                  return (
                    <View key={cc.color} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      {Array.from({ length: cc.sends }).map((_, i) => (
                        <View
                          key={i}
                          style={{
                            width: chipSize, height: chipSize, borderRadius: chipSize / 2,
                            backgroundColor: hex,
                            borderWidth: 2,
                            borderColor: needsBorder ? (isDarkBg ? '#1e293b' : '#cbd5e1') : backgroundColor,
                            marginLeft: i === 0 ? 0 : -chipOverlap,
                          }}
                        />
                      ))}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ─── list / lead ─── */}
          {layoutType === 'list' && isLead && (
            <View style={{ gap: listGap, alignSelf: 'stretch', alignItems: 'flex-start', paddingRight: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>완등 기록 없음</Text>
              ) : (
                leadSorted.map((r) => (
                  <View
                    key={r.grade}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: listPadV, paddingHorizontal: size * 0.025 * itemScale,
                      backgroundColor: itemBg, borderWidth: 1, borderColor: itemBorder,
                      borderRadius: size * 0.04 * itemScale,
                    }}
                  >
                    <Text style={{ color: textColor, fontWeight: '900', fontSize: listFontSz, letterSpacing: -0.3, marginRight: size * 0.025 * itemScale }}>
                      {r.grade}
                    </Text>
                    <Text style={{ color: textMutedColor, fontWeight: '800', fontSize: listFontSz * 0.94 }}>
                      ×{r.sends}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ─── list / boulder ─── */}
          {layoutType === 'list' && !isLead && (
            <View style={{ gap: listGap, alignSelf: 'stretch', alignItems: 'flex-start', paddingRight: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>완등 기록 없음</Text>
              ) : (
                sends.map((c) => {
                  const hex = resolveColorHex(c.color);
                  return (
                    <View
                      key={c.color}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: listPadV, paddingHorizontal: size * 0.025 * itemScale,
                        backgroundColor: itemBg, borderWidth: 1, borderColor: itemBorder,
                        borderRadius: size * 0.04 * itemScale,
                      }}
                    >
                      <View
                        style={{
                          width: listDot, height: listDot, borderRadius: listDot / 2,
                          backgroundColor: hex,
                          borderWidth: c.color === 'white' ? 1 : 0, borderColor: '#cbd5e1',
                          marginRight: size * 0.02 * itemScale,
                        }}
                      />
                      <Text style={{ color: textColor, fontWeight: '800', fontSize: listFontSz, marginRight: size * 0.02 * itemScale }}>
                        {c.color.toUpperCase()}
                      </Text>
                      <Text style={{ color: textMutedColor, fontWeight: '800', fontSize: listFontSz * 0.94 }}>
                        ×{c.sends}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ─── stats / lead ─── */}
          {layoutType === 'stats' && isLead && (
            <View style={{ gap: statGap, alignSelf: 'stretch', alignItems: 'flex-start', paddingRight: size * 0.04 }}>
              {leadSorted.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>완등 기록 없음</Text>
              ) : (
                leadSorted.map((r) => (
                  <View key={r.grade} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        minWidth: statDot, height: statDot,
                        paddingHorizontal: size * 0.022 * itemScale,
                        borderRadius: statDot / 2, backgroundColor: '#06b6d4',
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: size * 0.04 * itemScale,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: statGradeFont, fontWeight: '900', letterSpacing: -0.3 }}>
                        {r.grade}
                      </Text>
                    </View>
                    <Text style={{ color: textColor, fontSize: statNumFont, fontWeight: '900', letterSpacing: -1 }}>
                      {r.sends}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ─── stats / boulder ─── */}
          {layoutType === 'stats' && !isLead && (
            <View style={{ gap: statGap, alignSelf: 'stretch', alignItems: 'flex-start', paddingRight: size * 0.04 }}>
              {sends.length === 0 ? (
                <Text style={{ color: textMutedColor, fontSize: size * 0.04, fontWeight: '500' }}>완등 기록 없음</Text>
              ) : (
                sends.map((cc) => {
                  const hex = resolveColorHex(cc.color);
                  const needsBorder = cc.color === 'white' || cc.color === 'yellow';
                  return (
                    <View key={cc.color} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: statDot, height: statDot, borderRadius: statDot / 2,
                          backgroundColor: hex,
                          borderWidth: needsBorder ? 1 : 0, borderColor: '#cbd5e1',
                          marginRight: size * 0.04 * itemScale,
                        }}
                      />
                      <Text style={{ color: textColor, fontSize: statNumFont, fontWeight: '900', letterSpacing: -1 }}>
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
