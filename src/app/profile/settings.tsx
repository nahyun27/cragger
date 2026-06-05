/**
 * 프로필 설정 페이지 — 기존 ProfileMenuModal 의 항목들을 전부 풀스크린으로 옮김.
 * 그룹별로 카드 묶음 + 각 row 는 BoingPressable (살짝 작아졌다 통통 튀는 피드백).
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { customAlert } from '@/components/ui/custom-alert';
import { BoingPressable } from '@/components/ui/boing-pressable';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Sheet } from '@/components/ui/sheet';
import { useIsAdmin } from '@/hooks/use-gym-submissions';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase';
import { useThemeColors, useThemePref, type ThemeColors } from '@/lib/theme';

const THEME_PREF_LABEL: Record<'auto' | 'light' | 'dark', string> = {
  auto: '시스템 설정',
  light: '라이트',
  dark: '다크',
};

type IconName = keyof typeof Feather.glyphMap;

type RowProps = {
  icon: IconName;
  label: string;
  desc?: string;
  iconBg?: string;
  iconColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
};

export default function ProfileSettingsScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: isAdmin } = useIsAdmin();
  const themePref = useThemePref((s) => s.pref);
  const setThemePref = useThemePref((s) => s.setPref);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  const isPrivate = profile?.is_private ?? false;

  function handleLogout() {
    customAlert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="설정" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 12 }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        <Section title="프로필">
          <SettingRow
            icon="edit-3"
            iconBg={c.brand.primaryLight}
            iconColor={c.brand.primaryDeep}
            label="프로필 편집"
            desc="닉네임, 사진, 인스타 등"
            onPress={() => router.push('/profile/edit')}
          />
          <SettingRow
            icon={isPrivate ? 'lock' : 'unlock'}
            iconBg={isPrivate ? c.status.warningBg : c.status.successBg}
            iconColor={isPrivate ? c.status.warning : c.status.success}
            label={isPrivate ? '비공개 계정' : '공개 계정'}
            desc={
              isPrivate
                ? '팔로워만 운동 기록·뱃지·신발장을 볼 수 있어요'
                : '누구나 운동 기록·뱃지·신발장을 볼 수 있어요'
            }
            trailing={
              <Switch
                value={isPrivate}
                onValueChange={(val) => updateProfile.mutate({ isPrivate: val })}
                trackColor={{ false: c.border.strong, true: c.brand.primary }}
                thumbColor={Platform.OS === 'ios' ? undefined : c.bg.card}
              />
            }
          />
        </Section>

        <Section title="화면">
          <SettingRow
            icon="moon"
            iconBg={c.bg.subtle}
            iconColor={c.text.secondary}
            label="테마"
            desc={THEME_PREF_LABEL[themePref]}
            onPress={() => setThemeSheetOpen(true)}
          />
          <SettingRow
            icon="bell"
            iconBg={c.brand.primaryLight}
            iconColor={c.brand.primaryDeep}
            label="알림 설정"
            desc="채널별로 받을 알림 선택"
            onPress={() => router.push('/profile/notification-settings' as never)}
          />
        </Section>

        <Section title="내 활동">
          <SettingRow
            icon="message-square"
            iconBg={c.brand.primaryLight}
            iconColor={c.brand.primaryDeep}
            label="내 커뮤니티"
            desc="내가 쓴 글·댓글"
            onPress={() => router.push('/profile/community' as never)}
          />
          <SettingRow
            icon="send"
            iconBg={c.brand.primaryLight}
            iconColor={c.brand.primaryDeep}
            label="내가 보낸 가입 요청"
            onPress={() => router.push('/profile/join-requests' as never)}
          />
          <SettingRow
            icon="edit-3"
            iconBg={c.bg.subtle}
            iconColor={c.text.secondary}
            label="내 제보 내역"
            onPress={() => router.push('/profile/submissions' as never)}
          />
          {isAdmin ? (
            <SettingRow
              icon="shield"
              iconBg={c.status.warningBg}
              iconColor={c.status.warning}
              label="제보 승인 관리"
              desc="관리자 전용"
              onPress={() => router.push('/admin/submissions' as never)}
            />
          ) : null}
        </Section>

        <Section title="도움말">
          <SettingRow
            icon="lock"
            iconBg={c.bg.subtle}
            iconColor={c.text.secondary}
            label="개인정보 처리방침"
            onPress={() => customAlert('안내', '준비 중인 기능입니다.')}
          />
          <SettingRow
            icon="help-circle"
            iconBg={c.brand.primaryLight}
            iconColor={c.brand.primaryDeep}
            label="고객센터 / 문의하기"
            desc="궁금한 점·버그·요청을 보내주세요"
            onPress={() => router.push('/profile/support' as never)}
          />
        </Section>

        <Section>
          <SettingRow
            icon="log-out"
            iconBg={c.status.dangerBg}
            iconColor={c.status.danger}
            label="로그아웃"
            danger
            onPress={handleLogout}
          />
        </Section>
      </ScrollView>

      <Sheet
        visible={themeSheetOpen}
        onClose={() => setThemeSheetOpen(false)}
        variant="bottom"
        title="테마"
        subtitle="화면 색깔 모드를 선택하세요"
      >
        {(['auto', 'light', 'dark'] as const).map((opt) => {
          const active = themePref === opt;
          const icon: 'monitor' | 'sun' | 'moon' =
            opt === 'auto' ? 'monitor' : opt === 'light' ? 'sun' : 'moon';
          return (
            <Pressable
              key={opt}
              onPress={() => {
                // 시트 닫는 modal 애니메이션과 theme 변경(루트 리렌더)이 같은 tick 에
                // 겹치면 expo-router 의 navigation tree 가 일시적으로 흔들리면서
                // "navigation context 없음" 에러가 가끔 뜸. 시트를 먼저 닫고 다음
                // tick 에서 theme 적용 → 두 작업을 분리.
                setThemeSheetOpen(false);
                setTimeout(() => setThemePref(opt), 0);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[s.themeRow, active && s.themeRowActive]}>
                <View style={[s.themeIconBox, active && { backgroundColor: c.brand.primary }]}>
                  <Feather name={icon} size={16} color={active ? c.brand.onPrimary : c.text.secondary} />
                </View>
                <Text style={[s.themeLabel, active && { color: c.brand.primaryDeep }]}>
                  {THEME_PREF_LABEL[opt]}
                </Text>
                {active && <Feather name="check" size={18} color={c.brand.primary} />}
              </View>
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.section}>
      {title ? <Text style={s.sectionTitle}>{title}</Text> : null}
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, label, desc, iconBg, iconColor, trailing, onPress, danger }: RowProps) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const fg = danger ? c.status.danger : c.text.primary;
  return (
    <BoingPressable
      onPress={onPress}
      haptic={onPress ? 'light' : 'none'}
      scaleMin={0.97}
      style={s.row}
    >
      <View style={[s.iconBox, { backgroundColor: iconBg ?? c.bg.subtle }]}>
        <Feather name={icon} size={16} color={iconColor ?? c.text.secondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowLabel, { color: fg }]} numberOfLines={1}>{label}</Text>
        {desc ? <Text style={s.rowDesc} numberOfLines={1}>{desc}</Text> : null}
      </View>
      {trailing ?? (
        onPress ? <Feather name="chevron-right" size={16} color={c.text.muted} /> : null
      )}
    </BoingPressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 20, paddingBottom: 12 },
    section: { gap: 8 },
    sectionTitle: {
      fontSize: 11.5, fontWeight: '900', color: c.text.tertiary,
      letterSpacing: 0.3, textTransform: 'uppercase', paddingHorizontal: 4,
    },
    sectionCard: {
      backgroundColor: c.bg.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    iconBox: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },
    rowDesc: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '600', marginTop: 1 },
    themeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
      marginBottom: 4,
    },
    themeRowActive: { backgroundColor: c.brand.primaryLight },
    themeIconBox: {
      width: 32, height: 32, borderRadius: 10, backgroundColor: c.bg.subtle,
      alignItems: 'center', justifyContent: 'center',
    },
    themeLabel: { flex: 1, fontSize: 14, fontWeight: '800', color: c.text.primary },
  });
}
