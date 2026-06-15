import { useRouter } from '@/lib/router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { useNotifPrefs, useSetNotifPref } from '@/hooks/use-notification-prefs';
import { useIsAdmin } from '@/hooks/use-gym-submissions';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Channel = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
};

const SECTIONS: { title: string; channels: Channel[] }[] = [
  {
    title: '커뮤니티',
    channels: [
      { key: 'post_comment', label: '내 글에 댓글', desc: '내가 쓴 글에 댓글이 달릴 때', icon: 'message-circle' },
      { key: 'post_like', label: '내 글에 좋아요', desc: '내가 쓴 글에 좋아요가 눌릴 때', icon: 'heart' },
      { key: 'comment_reply', label: '내 댓글에 답글', desc: '내 댓글에 답글이 달릴 때', icon: 'corner-down-right' },
      { key: 'follow', label: '새 팔로워', desc: '누군가 나를 팔로우할 때', icon: 'user-plus' },
    ],
  },
  {
    title: '크루',
    channels: [
      { key: 'crew_announcement', label: '크루 공지', desc: '내가 속한 크루에 공지가 올라올 때', icon: 'volume-2' },
      { key: 'crew_join_request', label: '가입 요청', desc: '(크루장) 내 크루에 가입 요청이 오면', icon: 'user-check' },
      { key: 'crew_join_result', label: '가입 결과', desc: '내가 보낸 가입 요청이 처리될 때', icon: 'check-circle' },
      { key: 'crew_meetup', label: '모임 알림', desc: '내가 속한 크루의 모임 일정', icon: 'calendar' },
      { key: 'crew_battle', label: '대결 알림', desc: '크루 대결 시작/종료/초대', icon: 'zap' },
    ],
  },
  {
    title: '암장',
    channels: [
      { key: 'gym_submission_result', label: '내 제보 결과', desc: '관리자가 내 제보를 처리하면', icon: 'edit-3' },
    ],
  },
  {
    title: '뱃지',
    channels: [
      { key: 'badge_earned', label: '새 뱃지 획득', desc: '조건을 달성해서 뱃지를 받았을 때', icon: 'award' },
    ],
  },
];

const ADMIN_SECTION: { title: string; channels: Channel[] } = {
  title: '관리자',
  channels: [
    { key: 'gym_submission_new', label: '새 제보 알림', desc: '새 암장 정보 제보가 들어올 때', icon: 'inbox' },
  ],
};

export default function NotificationSettingsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: prefs, isLoading, error } = useNotifPrefs();
  const { data: isAdmin } = useIsAdmin();
  const set = useSetNotifPref();

  const sections = useMemo(() => {
    return isAdmin ? [...SECTIONS, ADMIN_SECTION] : SECTIONS;
  }, [isAdmin]);

  function isOn(key: string): boolean {
    const v = prefs?.[key];
    return v !== false; // default 켜짐
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="알림 설정" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && <ActivityIndicator color={c.brand.primary} style={{ marginTop: 32 }} />}
        {error && <Text style={s.error}>{error.message}</Text>}

        {!isLoading && (
          <>
            <View style={s.noteBox}>
              <Feather name="info" size={13} color={c.text.tertiary} />
              <Text style={s.noteText}>
                꺼둔 채널은 알림 목록에 쌓이지 않아요. 푸시 알림은 별도 설정에서 켜야 받아볼 수 있어요.
              </Text>
            </View>

            {sections.map((sec) => (
              <View key={sec.title} style={s.section}>
                <Text style={s.sectionTitle}>{sec.title}</Text>
                <View style={s.card}>
                  {sec.channels.map((ch, i) => (
                    <View
                      key={ch.key}
                      style={[s.row, i < sec.channels.length - 1 && s.rowBorder]}
                    >
                      <View style={s.iconBox}>
                        <Feather name={ch.icon} size={16} color={c.brand.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.rowLabel}>{ch.label}</Text>
                        <Text style={s.rowDesc}>{ch.desc}</Text>
                      </View>
                      <Switch
                        value={isOn(ch.key)}
                        onValueChange={(v) => set.mutate({ key: ch.key, value: v })}
                        trackColor={{ true: c.brand.primary, false: c.bg.subtle }}
                        thumbColor={c.bg.card}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 22, paddingBottom: 12 },
    error: { color: c.status.danger, textAlign: 'center', marginTop: 16 },
    noteBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: c.bg.subtle, borderRadius: 12, padding: 12,
    },
    noteText: { flex: 1, fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 },
    section: { gap: 8 },
    sectionTitle: {
      fontSize: 12, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase', paddingHorizontal: 4,
    },
    card: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    iconBox: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { fontSize: 14, fontWeight: '800', color: c.text.primary, letterSpacing: -0.2 },
    rowDesc: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '600', lineHeight: 16 },
  });
}
