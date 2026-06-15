import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useLocalSearchParams, useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth-context';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import {
  useSprayWallPhotos,
  useSprayWallProblems,
  useGymColorSchemes,
  type HoldType,
  type ProblemType,
} from '@/hooks/use-spray-wall';

const SCREEN_W = Dimensions.get('window').width;
const PHOTO_H = SCREEN_W * 0.75;

const HOLD_LABEL_SHORT: Record<HoldType, string> = {
  start: 'S', middle: '', top: 'T', foot: '',
};

export default function SprayWallScreen() {
  const { id: gymId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const s = makeStyles(c);
  const insets = useSafeAreaInsets();
  const { session: authSession } = useAuth();
  const isLoggedIn = !!authSession?.user.id;

  const photosQ = useSprayWallPhotos(gymId);
  const [photoIdx, setPhotoIdx] = useState(0);
  const currentPhoto = photosQ.data?.[photoIdx] ?? null;
  const photos = photosQ.data ?? [];

  const problemsQ = useSprayWallProblems(gymId, currentPhoto?.id ?? null);
  const sortedProblems = [...(problemsQ.data ?? [])].sort((a, b) => a.number - b.number);

  const colorSchemesQ = useGymColorSchemes(gymId);
  const colorSchemes = colorSchemesQ.data ?? [];

  function getColorHex(color: string | null): string | null {
    if (!color) return null;
    const scheme = colorSchemes.find((s) => s.color === color);
    return resolveColorHex(color, scheme?.color_hex);
  }

  function getColorLabel(color: string | null): string {
    if (!color) return '';
    const scheme = colorSchemes.find((s) => s.color === color);
    return scheme?.official_label ?? resolveColorLabel(color);
  }

  function holdSummary(problem: ReturnType<typeof problemsQ.data>[number]) {
    if (problem.problem_type === 'endurance') {
      return `홀드 ${problem.holds.length}개`;
    }
    const counts = (problem.holds ?? []).reduce<Record<HoldType, number>>(
      (acc, h) => { acc[h.hold_type] = (acc[h.hold_type] ?? 0) + 1; return acc; },
      {} as Record<HoldType, number>,
    );
    return [
      counts.start  && `S×${counts.start}`,
      counts.middle && `#×${counts.middle}`,
      counts.top    && `T×${counts.top}`,
      counts.foot   && `발×${counts.foot}`,
    ].filter(Boolean).join('  ') || '-';
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title="스프레이월"
        onBack={() => router.back()}
        rightActions={
          isLoggedIn && photos.length > 0
            ? [{
                icon: 'plus' as const,
                onPress: () =>
                  router.push({
                    pathname: '/gym/[id]/spray-wall/new',
                    params: { id: gymId },
                  } as never),
              }]
            : []
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* ── 사진 (홀드 없음 — 깔끔한 벽 사진) ─────────────── */}
        {photosQ.isLoading ? (
          <View style={[s.photoPlaceholder, { justifyContent: 'center' }]}>
            <ActivityIndicator color={c.brand.primary} />
          </View>
        ) : photos.length === 0 ? (
          <View style={s.photoPlaceholder}>
            <Feather name="image" size={32} color={c.text.muted} />
            <Text style={s.emptyText}>스프레이월 사진이 없어요</Text>
            <Text style={{ fontSize: 12, color: c.text.muted, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 }}>
              암장 정보 제보를 통해 사진을 추가할 수 있어요
            </Text>
          </View>
        ) : (
          <>
            <View style={{ width: SCREEN_W, height: PHOTO_H }}>
              <Image
                source={{ uri: currentPhoto?.photo_url }}
                style={{ width: SCREEN_W, height: PHOTO_H }}
                resizeMode="cover"
              />
            </View>
            {photos.length > 1 && (
              <View style={s.pageIndicator}>
                {photos.map((ph, i) => (
                  <Pressable key={ph.id} onPress={() => setPhotoIdx(i)}>
                    <View style={[s.pageDot, i === photoIdx && s.pageDotActive]} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── 문제 목록 ────────────────────────────────────────── */}
        <View style={s.listSection}>
          {problemsQ.isLoading ? (
            <ActivityIndicator color={c.brand.primary} style={{ marginTop: 20 }} />
          ) : sortedProblems.length === 0 ? (
            <View style={s.emptyProblems}>
              {photos.length > 0 && (
                <>
                  <Feather name="map-pin" size={24} color={c.text.muted} />
                  <Text style={[s.emptyText, { marginTop: 8 }]}>
                    {isLoggedIn
                      ? '우측 상단 + 버튼으로 문제를 추가해보세요.'
                      : '등록된 문제가 없어요.'}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <>
              <Text style={s.listTitle}>문제 {sortedProblems.length}개</Text>
              {sortedProblems.map((p, idx) => {
                const colorHex = getColorHex(p.color);
                const colorLabel = getColorLabel(p.color);
                const badgeColor = colorHex ?? '#7c3aed';
                const summary = holdSummary(p);
                const displayNum = idx + 1;

                return (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      router.push({
                        pathname: '/gym/[id]/spray-wall/[problemId]',
                        params: { id: gymId, problemId: p.id },
                      } as never)
                    }
                  >
                    {({ pressed }) => (
                      <View style={[s.problemRow, pressed && { opacity: 0.7 }]}>
                        {/* 번호 배지 (리스트 순서 기준) */}
                        <View style={[s.numBadge, { backgroundColor: badgeColor }]}>
                          <Text style={s.numText}>{displayNum}</Text>
                        </View>

                        {/* 정보 */}
                        <View style={s.rowContent}>
                          <View style={s.rowTopLine}>
                            {p.name ? (
                              <Text style={s.nameText} numberOfLines={1}>{p.name}</Text>
                            ) : (
                              <Text style={s.typeLabel}>
                                {p.problem_type === 'endurance' ? '지구력' : '찍볼'}
                              </Text>
                            )}
                            {colorLabel ? (
                              <Text style={[s.colorLabel, { color: badgeColor }]}>
                                {colorLabel}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {p.name && (
                              <Text style={s.typeLabel}>
                                {p.problem_type === 'endurance' ? '지구력' : '찍볼'}
                              </Text>
                            )}
                            <Text style={s.holdSummary}>{summary}</Text>
                          </View>
                        </View>

                        <Feather name="chevron-right" size={16} color={c.text.muted} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },

    photoPlaceholder: {
      width: SCREEN_W, height: PHOTO_H,
      backgroundColor: c.bg.subtle,
      alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    emptyText: { fontSize: 13, color: c.text.muted, fontWeight: '700', textAlign: 'center' },

    pageIndicator: {
      flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10,
    },
    pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border.strong },
    pageDotActive: { backgroundColor: c.brand.primary, width: 16 },

    listSection: { paddingHorizontal: 14, paddingTop: 14, gap: 8 },
    listTitle: {
      fontSize: 12, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2,
    },
    emptyProblems: { alignItems: 'center', paddingVertical: 32, gap: 4 },

    problemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.bg.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    numBadge: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    numText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    rowContent: { flex: 1, gap: 3 },
    rowTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    typeLabel: { fontSize: 11, fontWeight: '800', color: c.text.tertiary },
    colorLabel: { fontSize: 12, fontWeight: '800' },
    nameText: { fontSize: 14, color: c.text.primary, fontWeight: '700', flexShrink: 1 },
    holdSummary: { fontSize: 11, color: c.text.tertiary, fontWeight: '700' },
  });
}
