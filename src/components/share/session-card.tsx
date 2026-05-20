import React, { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { resolveColorHex } from '@/constants/climb-colors';
import type { SessionDetail } from '@/hooks/use-session';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const COND_EMOJI: Record<number, string> = {
  1: '😵',
  2: '😟',
  3: '😐',
  4: '🙂',
  5: '😄',
};

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
  // 카드 sizing: 화면 미리보기는 작게(360), 캡처 직전 1080으로 키운 hidden 인스턴스
  // 따로 렌더 — captureRef가 width/height 인자로 스케일 가능. 일단 size로 흡수.
  size?: number;
  // 배경 이미지 URI (사진 picker로 선택한 로컬 file://). 카드 뒤에 깔리고
  // opacity로 텍스트 가독성 확보.
  backgroundImageUri?: string | null;
  // 배경 이미지 투명도 (0~1). 기본 0.4 — 텍스트/점 가독성 유지.
  backgroundOpacity?: number;
};

// 1:1 정사각형 공유 카드. captureRef 대상.
// 완등(send)만 점으로 표시. project/fall 은 자랑용에 부적합이라 제외.
export const SessionShareCard = forwardRef<View, Props>(
  (
    { session, size = 360, backgroundImageUri, backgroundOpacity = 0.4 },
    ref,
  ) => {
    const sends = session.color_summary
      .filter((c) => c.sends > 0)
      .sort((a, b) => b.sends - a.sends);
    const totalSends = sends.reduce((acc, c) => acc + c.sends, 0);

    // 색깔별로 점을 sends 개씩 펼침. 같은 색깔끼리 묶여 표시되도록 정렬.
    const dots: { color: string; key: string }[] = [];
    for (const c of sends) {
      for (let i = 0; i < c.sends; i++) {
        dots.push({ color: c.color, key: `${c.color}-${i}` });
      }
    }

    const condEmoji = session.condition ? COND_EMOJI[session.condition] : null;
    const dotSize = Math.max(20, Math.min(40, Math.floor((size - 96) / Math.ceil(Math.sqrt(Math.max(totalSends, 1)) + 2))));
    const gymLabel = session.gym
      ? `${session.gym.name}${session.gym.branch ? ` ${session.gym.branch}` : ''}`
      : '암장 미선택';

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width: size,
          height: size,
          backgroundColor: '#ffffff',
          padding: size * 0.07,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Background image (semi-transparent) */}
        {backgroundImageUri && (
          <Image
            source={{ uri: backgroundImageUri }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: size,
              height: size,
              opacity: backgroundOpacity,
            }}
            resizeMode="cover"
          />
        )}

        {/* Header */}
        <View>
          <Text
            style={{
              color: '#71717a',
              fontSize: size * 0.038,
              fontWeight: '500',
            }}
          >
            {formatDate(session.session_date)}
          </Text>
          <Text
            style={{
              color: '#18181b',
              fontSize: size * 0.06,
              fontWeight: '800',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {gymLabel}
          </Text>
        </View>

        {/* Dot grid (center) */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: Math.max(6, dotSize * 0.18),
            paddingVertical: size * 0.05,
          }}
        >
          {dots.length === 0 ? (
            <Text style={{ color: '#a1a1aa', fontSize: size * 0.04 }}>
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
                    ...(needsBorder
                      ? { borderWidth: 1, borderColor: '#D4D4D8' }
                      : null),
                  }}
                />
              );
            })
          )}
        </View>

        {/* Meta + footer */}
        <View>
          <Text
            style={{
              color: '#18181b',
              fontSize: size * 0.042,
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            완등 {totalSends}개
            {session.duration_min != null && ` · ${formatDuration(session.duration_min)}`}
            {condEmoji && ` · ${condEmoji}`}
          </Text>
          <View
            style={{
              marginTop: size * 0.04,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#0d9488',
                fontSize: size * 0.038,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              Cragger
            </Text>
            <Text
              style={{
                color: '#a1a1aa',
                fontSize: size * 0.028,
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
