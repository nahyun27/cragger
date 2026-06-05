import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  COLOR_VOTE_THRESHOLD,
  resolveColorHex,
  resolveColorLabel,
} from '@/constants/climb-colors';
import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { useFavoriteGymIds, useToggleFavorite } from '@/hooks/use-favorites';
import { useGymDetail, type ColorScheme, type ColorStat, type GymDetail } from '@/hooks/use-gym-detail';
import { useMySessionsAtGym } from '@/hooks/use-session';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';

export default function GymDetailScreen() {

  const c = useThemeColors();  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useGymDetail(id);
  const { data: favoriteIds } = useFavoriteGymIds();
  const toggleFavorite = useToggleFavorite();
  const favorited = !!id && !!favoriteIds?.has(id);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg.primary, alignItems: 'center', justifyContent: 'center' }}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg.primary, alignItems: 'center', justifyContent: 'center', padding: 24 }}
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '암장을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }



  const location = [data.city, data.district].filter(Boolean).join(' ');
  const sizeLine = [
    data.size_pyeong ? `${data.size_pyeong}평` : null,
    data.floors_count ? `${data.floors_count}층` : null,
    data.opened_at ? `${new Date(data.opened_at).getFullYear()}년 오픈` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg.primary }} edges={['left', 'right']}>
      <ScreenHeader
        title="암장 정보"
        onBack={() => router.back()}
        rightSlot={
          <Pressable
            onPress={() => {
              if (!id) return;
              toggleFavorite.mutate({ gymId: id, currentlyFavorite: favorited });
            }}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 12,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons
              name={favorited ? 'star' : 'star-outline'}
              size={26}
              color={favorited ? '#f59e0b' : '#94a3b8'}
            />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg.primary }}
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 16 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Hero */}
        <GymHero gym={data} location={location} c={c} />

        {/* 정보 제보 카드 — 정보 수정 + 누락 정보 추가 모두 환영 (초반 베타라 데이터 모으는 게 핵심) */}
        <Pressable
          onPress={() =>
            router.push({ pathname: '/gym/[id]/suggest', params: { id: id! } } as never)
          }
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: c.brand.primary + '55',
                backgroundColor: c.bg.card,
                borderStyle: 'dashed',
                opacity: pressed ? 0.75 : 1,
              }}
            >
              <View
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: c.brand.primaryLight,
                }}
              >
                <Feather name="edit-3" size={16} color={c.brand.primaryDeep} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: c.text.primary, fontWeight: '900', fontSize: 13.5, letterSpacing: -0.2 }}>
                  정보 수정·추가 제보하기
                </Text>
                <Text style={{ color: c.text.tertiary, fontSize: 11.5, fontWeight: '700' }}>
                  더 정확한 정보로 함께 만들어가요. 어떤 항목이든 환영!
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={c.text.muted} />
            </View>
          )}
        </Pressable>

        {/* Spec stats */}
        {(data.size_pyeong || data.floors_count || data.opened_at) && (
          <GymSpecRow gym={data} c={c} />
        )}

        {/* 종목 (볼더링/리드/...) */}
        <DisciplinesSection gym={data} c={c} />

        {/* 트레이닝 보드 (문보드/킬터/텐션) */}
        {(data.has_moonboard || data.has_kilter || data.has_tension) && (
          <TrainingBoardsSection gym={data} />
        )}

        {/* 편의시설 */}
        {(data.has_shower || data.has_locker || data.has_parking || data.parking_info) && (
          <AmenitiesSection gym={data} c={c} />
        )}

        {/* 소개 */}
        {data.description && (
          <Section title="소개" icon="align-left">
            <Text style={{ color: c.text.primary, fontSize: 13.5, lineHeight: 21, fontWeight: '600' }}>
              {data.description}
            </Text>
          </Section>
        )}

        {/* 난이도 */}
        <DifficultySection
          gym={data}
          c={c}
          onVote={() => router.push({ pathname: '/gym/[id]/vote', params: { id: data.id } })}
          onSuggest={() => router.push({ pathname: '/gym/[id]/suggest', params: { id: data.id } } as never)}
        />

        {/* 이 암장에서의 추억 */}
        <MySessionsAtGymSection gymId={id!} />
      </ScrollView>

      <BottomCTA
        label="이 암장에서 기록하기"
        icon="edit-3"
        onPress={() =>
          router.push({ pathname: '/session/new', params: { gymId: data.id } })
        }
      />
    </SafeAreaView>
  );
}

type MergedColorRow = {
  color: string;
  hex: string;
  scheme: ColorScheme | null;
  stat: ColorStat | null;
};

/* ──────────────────────────────────────────────────────────── */
/* GymHero — 로고 + 이름 + 지점 + 주소 + 빠른 액션 (전화/인스타/지도)  */
/* ──────────────────────────────────────────────────────────── */

function GymHero({
  gym, location, c,
}: { gym: GymDetail; location: string; c: ThemeColors }) {
  const addressLine = [location, gym.address].filter(Boolean).join(' · ');
  const actions = useMemo(() => {
    const out: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }[] = [];
    if (addressLine) {
      const q = encodeURIComponent(
        `${gym.name}${gym.branch ? ` ${gym.branch}` : ''} ${gym.address ?? ''}`.trim(),
      );
      out.push({
        icon: 'navigation',
        label: '길찾기',
        onPress: () => Linking.openURL(`https://map.kakao.com/?q=${q}`).catch(() => {}),
      });
    }
    if (gym.phone) {
      out.push({
        icon: 'phone',
        label: '전화',
        onPress: () => Linking.openURL(`tel:${gym.phone}`).catch(() => {}),
      });
    }
    if (gym.instagram_handle) {
      out.push({
        icon: 'instagram',
        label: 'Instagram',
        onPress: () =>
          Linking.openURL(`https://instagram.com/${gym.instagram_handle}`).catch(() => {}),
      });
    }
    if (gym.website_url) {
      out.push({
        icon: 'globe',
        label: '웹사이트',
        onPress: () => Linking.openURL(gym.website_url!).catch(() => {}),
      });
    }
    return out;
  }, [gym, addressLine]);

  return (
    <View
      style={{
        backgroundColor: c.bg.card,
        borderRadius: 18,
        padding: 16,
        gap: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <GymThumbnail
          name={gym.name}
          branch={gym.branch}
          size={64}
          logoUrl={gym.logo_url}
          logoBgHex={gym.logo_bg_hex ?? null}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: c.text.primary, letterSpacing: -0.4 }}>
              {gym.name}
            </Text>
            {gym.branch ? (
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.brand.primary, letterSpacing: -0.2 }}>
                {gym.branch}
              </Text>
            ) : null}
          </View>
          {addressLine ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
              <Feather name="map-pin" size={12} color={c.text.tertiary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: c.text.secondary, fontSize: 12, fontWeight: '600', lineHeight: 17 }}>
                {addressLine}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {actions.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} hitSlop={4}>
              {({ pressed }) => (
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999,
                    backgroundColor: c.bg.subtle,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Feather name={a.icon} size={12} color={c.brand.primary} />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: c.text.primary, letterSpacing: -0.2 }}>
                    {a.label}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* GymSpecRow — 규모 / 층수 / 오픈 (3-cell 통계 타일)            */
/* ──────────────────────────────────────────────────────────── */

function GymSpecRow({ gym, c }: { gym: GymDetail; c: ThemeColors }) {
  const tiles: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [];
  if (gym.size_pyeong) tiles.push({ icon: 'maximize-2', label: '규모', value: `${gym.size_pyeong}평` });
  if (gym.floors_count) tiles.push({ icon: 'layers', label: '층수', value: `${gym.floors_count}층` });
  if (gym.opened_at) {
    tiles.push({ icon: 'calendar', label: '오픈', value: `${new Date(gym.opened_at).getFullYear()}년` });
  }
  if (tiles.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {tiles.map((t) => (
        <View
          key={t.label}
          style={{
            flex: 1,
            backgroundColor: c.bg.card,
            borderRadius: 14,
            paddingVertical: 12, paddingHorizontal: 8,
            alignItems: 'center', gap: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border.subtle,
          }}
        >
          <View
            style={{
              width: 30, height: 30, borderRadius: 9,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: c.brand.primaryLight,
            }}
          >
            <Feather name={t.icon} size={14} color={c.brand.primaryDeep} />
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.3 }}>
            {t.label}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 }}>
            {t.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* DisciplinesSection — 종목 (볼더링/리드/탑로프/스피드/오토빌레이) */
/* ──────────────────────────────────────────────────────────── */

const DISCIPLINES: { key: keyof GymDetail; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'has_boulder', label: '볼더링', icon: 'square' },
  { key: 'has_lead', label: '리드', icon: 'trending-up' },
  { key: 'has_top_rope', label: '탑로프', icon: 'arrow-up' },
  { key: 'has_speed', label: '스피드', icon: 'zap' },
  { key: 'has_auto_belay', label: '오토빌레이', icon: 'shield' },
];

function DisciplinesSection({ gym, c }: { gym: GymDetail; c: ThemeColors }) {
  const items = DISCIPLINES.filter((d) => Boolean(gym[d.key as keyof GymDetail]));
  if (items.length === 0) return null;
  return (
    <Section title="종목" icon="trending-up">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((d) => (
          <View
            key={d.label}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
              backgroundColor: c.bg.subtle,
            }}
          >
            <Feather name={d.icon} size={11} color={c.brand.primary} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.text.primary, letterSpacing: -0.2 }}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* TrainingBoardsSection — 문보드/킬터/텐션 컬러칩                */
/* ──────────────────────────────────────────────────────────── */

const BOARDS = [
  { key: 'has_moonboard' as const, label: '문보드', color: '#a855f7' },
  { key: 'has_kilter' as const, label: '킬터보드', color: '#3b82f6' },
  { key: 'has_tension' as const, label: '텐션보드', color: '#f97316' },
];

function TrainingBoardsSection({ gym }: { gym: GymDetail }) {
  const items = BOARDS.filter((b) => Boolean(gym[b.key]));
  if (items.length === 0) return null;
  return (
    <Section title="트레이닝 보드" icon="grid">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((b) => (
          <View
            key={b.label}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
              backgroundColor: b.color + '20',
              borderWidth: 1, borderColor: b.color + '55',
            }}
          >
            <Feather name="zap" size={10} color={b.color} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: b.color, letterSpacing: -0.2 }}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* AmenitiesSection — 샤워실 / 락커 / 주차장 + 주차 메모          */
/* ──────────────────────────────────────────────────────────── */

const AMENITIES: { key: keyof GymDetail; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'has_shower', label: '샤워실', icon: 'droplet' },
  { key: 'has_locker', label: '락커', icon: 'lock' },
  { key: 'has_parking', label: '주차장', icon: 'truck' },
];

function AmenitiesSection({ gym, c }: { gym: GymDetail; c: ThemeColors }) {
  const items = AMENITIES.filter((a) => Boolean(gym[a.key as keyof GymDetail]));
  return (
    <Section title="편의시설" icon="coffee">
      {items.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {items.map((a) => (
            <View
              key={a.label}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                backgroundColor: c.status.successBg,
              }}
            >
              <Feather name={a.icon} size={11} color={c.status.success} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.status.success, letterSpacing: -0.2 }}>
                {a.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {gym.parking_info ? (
        <View
          style={{
            flexDirection: 'row', gap: 8,
            padding: 10, borderRadius: 10,
            backgroundColor: c.bg.subtle,
          }}
        >
          <Feather name="info" size={12} color={c.text.tertiary} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 }}>
            {gym.parking_info}
          </Text>
        </View>
      ) : null}
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* DifficultySection — 색깔별 난이도 + 투표 진입                 */
/* ──────────────────────────────────────────────────────────── */

function DifficultySection({
  gym, c, onVote, onSuggest,
}: { gym: GymDetail; c: ThemeColors; onVote: () => void; onSuggest: () => void }) {
  const rows = mergeColorRows(gym.color_schemes, gym.color_stats);
  // 색깔 자체가 등록 안 돼 있으면 투표 불가 → 제보 유도.
  // color_schemes 가 비었으면 어떤 색깔에 투표할지 정의가 안 된 상태.
  const hasColors = gym.color_schemes.length > 0;
  return (
    <Section
      title="난이도"
      icon="bar-chart-2"
      desc={hasColors ? '공식 표기 + 사용자 체감 평균' : '아직 등록된 색깔이 없어요'}
    >
      {hasColors ? (
        <>
          <View style={{ gap: 4 }}>
            {rows.map((row) => (
              <ColorRow key={row.color} row={row} />
            ))}
          </View>
          <Pressable onPress={onVote}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 11, borderRadius: 12,
                  backgroundColor: c.brand.primary,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 4,
                }}
              >
                <Feather name="thumbs-up" size={13} color={c.brand.onPrimary} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: c.brand.onPrimary, letterSpacing: -0.2 }}>
                  내 체감 난이도 투표하기
                </Text>
              </View>
            )}
          </Pressable>
        </>
      ) : (
        <EmptyState
          compact
          icon="edit-3"
          tone="muted"
          title="이 암장의 색깔이 등록되어 있지 않아요"
          description={'난이도 투표는 색깔 정보가 있어야 가능해요.\n어떤 색깔이 있는지 제보해주세요!'}
          action={{
            label: '색깔 정보 제보하기',
            icon: 'edit-3',
            onPress: onSuggest,
          }}
        />
      )}
    </Section>
  );
}

function mergeColorRows(
  schemes: ColorScheme[],
  stats: ColorStat[],
): MergedColorRow[] {
  const statMap = new Map(stats.map((s) => [s.color.toLowerCase(), s]));
  const schemeMap = new Map(schemes.map((s) => [s.color.toLowerCase(), s]));
  const seen = new Set<string>();
  const out: MergedColorRow[] = [];

  // 1) 공식 색깔 체계 순서대로 (order_index)
  for (const sch of schemes) {
    const key = sch.color.toLowerCase();
    seen.add(key);
    out.push({
      color: sch.color,
      hex: sch.color_hex ?? resolveColorHex(sch.color),
      scheme: sch,
      stat: statMap.get(key) ?? null,
    });
  }

  // 2) 공식엔 없지만 투표만 있는 색깔 (체감만 모인 케이스) — 평균 V 오름차순
  const orphanStats = stats
    .filter((s) => !seen.has(s.color.toLowerCase()))
    .slice()
    .sort((a, b) => (a.avg_v_grade ?? -1) - (b.avg_v_grade ?? -1));
  for (const st of orphanStats) {
    out.push({
      color: st.color,
      hex: resolveColorHex(st.color),
      scheme: null,
      stat: st,
    });
  }

  return out;
}

// 'V3-V4', 'Vb-V0-', 'V0+', 'V-4', 'Vb' 등 → 슬라이더용 숫자 (0~8.5 범위).
// 못 읽으면 null.
function parseOfficialV(label: string | null): number | null {
  if (!label) return null;
  const tokens = label.split(/[-~]/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  const nums = tokens.map(tokenToNum).filter((n): n is number => n != null);
  if (nums.length === 0) return null;
  // 범위 표기 (V3-V4) 는 평균, 단일 (V3) 은 그대로
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function tokenToNum(tok: string): number | null {
  // 'Vb' → 0 (베이스), 'V0+' → 0.5, 'V0-' → -0.5, 'V3' → 3, 'V-4' 는 미해석 → null
  const m = /^V(b|B|\d+)([+\-])?$/.exec(tok);
  if (!m) return null;
  const body = m[1];
  const suffix = m[2];
  const base = body.toLowerCase() === 'b' ? 0 : parseInt(body, 10);
  if (Number.isNaN(base)) return null;
  if (suffix === '+') return base + 0.5;
  if (suffix === '-') return base - 0.5;
  return base;
}

function ColorRow({ row }: { row: MergedColorRow }) {
  const label = resolveColorLabel(row.color);
  const needsBorder = ['white', 'yellow', 'lime'].includes(row.color.toLowerCase());
  const stat = row.stat;
  const hasEnoughVotes = stat != null && stat.vote_count >= COLOR_VOTE_THRESHOLD;

  // 효과 V: 투표 충분하면 voted, 아니면 공식 라벨에서 파싱
  const officialV = parseOfficialV(row.scheme?.official_label ?? null);
  const effectiveV = hasEnoughVotes ? (stat?.avg_v_grade ?? null) : officialV;
  const fillPct =
    effectiveV != null
      ? Math.min(100, Math.max(0, (effectiveV / 8.5) * 100))
      : null;

  const rightLabel = hasEnoughVotes
    ? stat?.avg_v_grade_label ?? null
    : row.scheme?.official_label ?? null;
  const subText = hasEnoughVotes && stat ? `${stat.vote_count}표` : null;

  return (
    <View className="flex-row items-center gap-3 px-2 py-2 rounded-xl">
      {/* Color circle */}
      <View
        className="w-7 h-7 rounded-full"
        style={[
          { backgroundColor: row.hex },
          needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null,
        ]}
      />

      {/* Name */}
      <View style={{ width: 54 }}>
        <Text className="text-text-primary text-[13px] font-bold">{label}</Text>
      </View>

      {/* Slider */}
      <View className="flex-1">
        <View className="h-1.5 bg-background-tertiary rounded-full relative">
          {fillPct != null && (
            <>
              <View
                className="absolute left-0 top-0 h-full bg-brand-primary rounded-full"
                style={{ width: `${fillPct}%`, opacity: hasEnoughVotes ? 1 : 0.45 }}
              />
              <View
                className="absolute w-3 h-3 rounded-full bg-brand-primary border-2 border-white"
                style={{
                  left: `${fillPct}%`,
                  top: -3,
                  marginLeft: -6,
                  opacity: hasEnoughVotes ? 1 : 0.6,
                }}
              />
            </>
          )}
        </View>
      </View>

      {/* Right — V label + vote count if any */}
      <View className="items-end" style={{ minWidth: 64 }}>
        {rightLabel ? (
          <Text
            className="text-text-primary text-xs font-extrabold"
            style={!hasEnoughVotes ? { opacity: 0.55 } : undefined}
          >
            {rightLabel}
          </Text>
        ) : (
          <Text className="text-text-muted text-[10px] font-semibold">—</Text>
        )}
        {subText && (
          <Text className="text-text-tertiary" style={{ fontSize: 10, fontWeight: '600' }}>
            {subText}
          </Text>
        )}
      </View>
    </View>
  );
}



function MySessionsAtGymSection({ gymId }: { gymId: string }) {
  const c = useThemeColors();
  const router = useRouter();
  const { data, isLoading } = useMySessionsAtGym(gymId, 10);

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="heart" size={14} color={c.brand.primary} />
        <Text style={{ fontSize: 15, fontWeight: '900', color: c.text.primary, letterSpacing: -0.3 }}>
          이 암장에서의 추억
        </Text>
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 1.5,
            borderRadius: 999,
            backgroundColor: c.bg.subtle,
            minWidth: 22,
            alignItems: 'center',
            marginLeft: 2,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '900', color: c.text.muted }}>{data.length}</Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: c.bg.card,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border.subtle,
          overflow: 'hidden',
        }}
      >
        {data.map((sess, i) => (
          <Pressable
            key={sess.id}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: sess.id } })}
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: i === data.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: c.border.subtle,
                  backgroundColor: pressed ? c.bg.subtle : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: c.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Feather name="calendar" size={14} color={c.brand.primaryDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 }}>
                    {formatSessionDateMemory(sess.session_date)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.text.tertiary, marginTop: 2 }}>
                    {sess.duration_min != null ? `${sess.duration_min}분` : '시간 미기록'}
                    {sess.membership_id ? ' · 회원권 사용' : ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={c.text.muted} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function formatSessionDateMemory(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff < 7) return `${diff}일 전`;
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${wd})`;
}
