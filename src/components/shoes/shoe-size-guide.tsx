import { useMemo } from 'react';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Static climbing-shoe sizing guide. No data fetch — pure copy.
export function ShoeSizeGuide({ visible, onClose }: Props) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>암벽화 사이즈 가이드</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="x" size={20} color={c.text.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.scroll}>
          {/* Intro */}
          <Text style={s.intro}>
            암벽화는 발에 밀착되게 신는 특수화. 실측 발 길이 기준으로 선택해요.
          </Text>

          {/* Size standard table */}
          <Section title="사이즈 기준" icon="layers">
            <View style={s.row}>
              <View style={s.levelBadge}>
                <Text style={s.levelBadgeText}>입문자</Text>
              </View>
              <Text style={s.rowText}>
                실측 <Text style={s.bold}>+5~10mm</Text> · 발가락 안 굽고 편안하게 닿는 정도
              </Text>
            </View>
            <View style={s.row}>
              <View style={[s.levelBadge, s.levelBadgeAdvanced]}>
                <Text style={[s.levelBadgeText, s.levelBadgeTextAdvanced]}>중상급</Text>
              </View>
              <Text style={s.rowText}>
                실측 <Text style={s.bold}>~ -5mm</Text> · 신력·정밀 엣징 강화
              </Text>
            </View>
          </Section>

          {/* Brand-specific notes */}
          <Section title="브랜드별 족형" icon="package">
            <BrandNote
              brand="라스포르티바"
              body="발볼 좁고 아치 높음 (이탈리안 족형). 운동화 대비 EU 1~2 다운 경우가 많아요."
            />
            <BrandNote
              brand="스카르파"
              body="발볼 넓거나 발등 높은 모델이 많음. 정사이즈 ~ 0.5–1 다운."
            />
            <BrandNote
              brand="매드락"
              body="가성비·입문 친화. 정사이즈 ~ 0.5 업 선호."
            />
          </Section>

          {/* Check items */}
          <Section title="꼭 확인" icon="check-circle">
            <CheckItem
              title="족형 매칭"
              body="모델마다 모양(이집트형 / 그리스형 / 스퀘어형)이 달라요. 발볼·발등이 안 맞으면 통증."
            />
            <CheckItem
              title="소재"
              body="가죽(스웨이드)은 늘어남 · 인조가죽은 거의 안 늘어남."
            />
            <CheckItem
              title="직접 착용"
              body="전문 클라이밍 숍에서 모델별 착화감 비교 권장."
            />
          </Section>

          {/* Disclaimer */}
          <Text style={s.disclaimer}>
            위는 일반적인 경향이며 모델별 편차가 큽니다. 직접 신어보고 결정하세요.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Feather name={icon} size={14} color={c.text.secondary} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function BrandNote({ brand, body }: { brand: string; body: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={s.brandRow}>
      <Text style={s.brandName}>{brand}</Text>
      <Text style={s.brandBody}>{body}</Text>
    </View>
  );
}

function CheckItem({ title, body }: { title: string; body: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={s.checkRow}>
      <View style={s.checkDot} />
      <View style={{ flex: 1 }}>
        <Text style={s.checkTitle}>{title}</Text>
        <Text style={s.checkBody}>{body}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: c.border.subtle,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: 20, paddingBottom: 32, gap: 18 },
  intro: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 22,
    fontWeight: '500',
  },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: c.text.primary,
    letterSpacing: -0.2,
  },
  sectionBody: {
    backgroundColor: c.bg.primary,
    borderWidth: 1,
    borderColor: c.border.subtle,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: { flex: 1, fontSize: 13, color: c.text.secondary, lineHeight: 20 },
  bold: { fontWeight: '800', color: c.text.primary },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: c.bg.accent,
    borderWidth: 1,
    borderColor: '#a5f3fc',
    marginTop: 1,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.brand.primaryDeep,
  },
  levelBadgeAdvanced: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  levelBadgeTextAdvanced: {
    color: '#92400e',
  },

  brandRow: { gap: 2 },
  brandName: { fontSize: 13, fontWeight: '800', color: c.text.primary },
  brandBody: { fontSize: 12, color: c.text.secondary, lineHeight: 19 },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#06b6d4',
    marginTop: 7,
  },
  checkTitle: { fontSize: 13, fontWeight: '800', color: c.text.primary },
  checkBody: {
    fontSize: 12,
    color: c.text.secondary,
    lineHeight: 19,
    marginTop: 2,
  },

  disclaimer: {
    fontSize: 11,
    color: c.text.muted,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
  });
}