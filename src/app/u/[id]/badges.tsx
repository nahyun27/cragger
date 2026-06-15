/**
 * 다른 유저의 전체 배지 페이지 — 읽기 전용.
 */
import { useLocalSearchParams, useRouter } from '@/lib/router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { BadgeIcon } from '@/components/ui/badge-icon';
import { customAlert } from '@/components/ui/custom-alert';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import {
  BADGES,
  BADGE_CATEGORY_LABEL,
  type BadgeCategory,
  type BadgeDef,
} from '@/constants/badges';
import { useUserBadges } from '@/hooks/use-badges';
import { usePublicProfile } from '@/hooks/use-profile';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

export default function OtherUserBadgesPage() {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: earnedRows } = useUserBadges(id);
  const { data: profile } = usePublicProfile(id);

  const featuredKey = profile?.featured_badge_key;
  const earnedMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of earnedRows ?? []) m.set(r.badge_key, r.earned_at);
    return m;
  }, [earnedRows]);

  const unlockedCount = earnedMap.size;
  const totalCount = BADGES.length;
  const progress = totalCount > 0 ? unlockedCount / totalCount : 0;

  function handleBadgePress(badge: BadgeDef) {
    const earnedAt = earnedMap.get(badge.key);
    if (earnedAt) {
      const dateStr = new Date(earnedAt).toLocaleDateString('ko-KR');
      customAlert(
        badge.name,
        `달성일: ${dateStr}\n\n${badge.hint}`,
        [{ text: '닫기', style: 'cancel' }],
        undefined,
        <BadgeIcon icon={badge.icon} color={badge.color} size={36} />,
      );
    } else {
      customAlert(
        '미획득 배지',
        `${badge.hint}\n\n(아직 획득하지 못했어요)`,
        undefined,
        undefined,
        <View style={{ opacity: 0.35 }}>
          <BadgeIcon icon={badge.icon} color={c.text.muted} size={36} />
        </View>,
      );
    }
  }

  const groupedByCategory = React.useMemo(() => {
    const order: BadgeCategory[] = ['record', 'grade', 'streak', 'social'];
    const groups = new Map<BadgeCategory, { earned: BadgeDef[]; locked: BadgeDef[] }>();
    for (const cat of order) groups.set(cat, { earned: [], locked: [] });
    for (const b of BADGES) {
      const bucket = groups.get(b.category)!;
      if (earnedMap.has(b.key)) bucket.earned.push(b);
      else bucket.locked.push(b);
    }
    return order
      .map((cat) => ({ cat, ...groups.get(cat)! }))
      .filter((g) => g.earned.length + g.locked.length > 0);
  }, [earnedMap]);

  const renderBadge = (badge: BadgeDef) => {
    const isLocked = !earnedMap.has(badge.key);
    const isFeatured = featuredKey === badge.key;
    const iconColor = isLocked ? c.text.muted : badge.color;
    return (
      <Pressable key={badge.key} style={s.badgeItem} onPress={() => handleBadgePress(badge)}>
        {({ pressed }) => (
          <View style={[s.badgeItemInner, pressed && { opacity: 0.6 }]}>
            <View style={[
              s.badgeIconWrap,
              !isLocked && {
                shadowColor: badge.color,
                shadowOpacity: 0.45,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 6,
              },
            ]}>
              <View style={isLocked ? { opacity: 0.4 } : undefined}>
                <BadgeIcon icon={badge.icon} color={iconColor} size={22} />
              </View>
              {isLocked && (
                <View style={s.badgeLockBadge}>
                  <Feather name="lock" size={8} color={c.bg.card} />
                </View>
              )}
              {isFeatured && (
                <View style={s.badgeSelectedPin}>
                  <Text style={s.badgeSelectedPinText}>★</Text>
                </View>
              )}
            </View>
            <Text style={[s.badgeTitle, isLocked && { color: c.text.muted }]} numberOfLines={2}>
              {badge.name}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="배지 진열장" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.collectionHeader}>
          <View style={s.collectionHeaderTop}>
            <Text style={s.collectionLabel}>컬렉션 진행도</Text>
            <Text style={s.collectionCount}>
              <Text style={s.collectionCountStrong}>{unlockedCount}</Text>
              <Text style={s.collectionCountMuted}> / {totalCount}</Text>
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {groupedByCategory.map(({ cat, earned, locked }) => {
          const all = [...earned, ...locked];
          return (
            <Section
              key={cat}
              title={BADGE_CATEGORY_LABEL[cat]}
              icon="award"
              desc={`${earned.length} / ${earned.length + locked.length}`}
            >
              <View style={s.badgesGrid}>
                {all.map(renderBadge)}
              </View>
            </Section>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 16 },

    collectionHeader: {
      gap: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    collectionHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    collectionLabel: {
      fontSize: 12, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    collectionCount: { fontSize: 14 },
    collectionCountStrong: { color: c.text.primary, fontWeight: '900' },
    collectionCountMuted: { color: c.text.tertiary, fontWeight: '700' },
    progressTrack: {
      height: 6, borderRadius: 3, backgroundColor: c.bg.subtle, overflow: 'hidden',
    },
    progressFill: {
      height: '100%', borderRadius: 3, backgroundColor: c.brand.primary,
    },

    badgesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    badgeItem: { width: '22%' },
    badgeItemInner: { alignItems: 'center', gap: 6 },
    badgeIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    badgeLockBadge: {
      position: 'absolute',
      bottom: -2, right: -2,
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: c.text.tertiary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: c.bg.card,
    },
    badgeSelectedPin: {
      position: 'absolute',
      top: -4, right: -4,
      width: 16, height: 16, borderRadius: 8,
      backgroundColor: c.brand.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: c.bg.card,
    },
    badgeSelectedPinText: { fontSize: 9, color: c.brand.onPrimary, fontWeight: '900' },
    badgeTitle: {
      fontSize: 11, fontWeight: '800', color: c.text.primary,
      textAlign: 'center', letterSpacing: -0.1,
    },
  });
}
