import { useMemo } from 'react';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { Sheet } from '@/components/ui/sheet';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type IconName = React.ComponentProps<typeof Feather>['name'];

export function ShoeSizeGuide({ visible, onClose }: Props) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <Sheet visible={visible} onClose={onClose} variant="full" title="암벽화 사이즈 가이드">
      <View style={{ gap: 20 }}>
        {/* Hero */}
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <MaterialCommunityIcons name="foot-print" size={20} color={c.brand.primaryDeep} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.heroTitle}>운동화처럼 사면 안 돼요</Text>
            <Text style={s.heroDesc}>
              암벽화는 발에 딱 붙어야 힘이 잘 실려요. 평소 신는 운동화보다 작은 사이즈가 정상.
            </Text>
          </View>
        </View>

        {/* 한 줄 핵심 */}
        <View style={s.tldrCard}>
          <Text style={s.tldrLabel}>TL;DR</Text>
          <Text style={s.tldrText}>
            <Text style={s.bold}>실측 발 길이 기준</Text>으로 선택. 운동화 사이즈는 잊으세요.
          </Text>
        </View>

        {/* 레벨별 사이즈 */}
        <Section title="레벨별 사이즈" icon="layers" desc="실측 발 길이 대비">
          <View style={s.levelGrid}>
            <LevelCard
              tone="success"
              level="입문"
              range="+5 ~ +10mm"
              desc="발가락 안 굽고 편안하게"
              emoji="🌱"
            />
            <LevelCard
              tone="brand"
              level="중급"
              range="0 ~ +5mm"
              desc="살짝 끼지만 통증 X"
              emoji="🧗"
            />
            <LevelCard
              tone="warning"
              level="상급"
              range="-5 ~ 0mm"
              desc="엣징·정밀 발끝 컨트롤"
              emoji="🔥"
            />
          </View>
        </Section>

        {/* 족형 */}
        <Section title="내 발 모양 확인" icon="git-branch" desc="모델 추천에 가장 중요">
          <View style={s.shapeGrid}>
            <ShapeCard label="이집트형" desc="엄지가 가장 김" />
            <ShapeCard label="그리스형" desc="검지가 가장 김" />
            <ShapeCard label="스퀘어형" desc="앞 발가락 비슷" />
          </View>
        </Section>

        {/* 브랜드별 핏 */}
        <Section title="브랜드별 핏" icon="package" desc="EU 사이즈 기준 경향">
          <BrandRow
            brand="라스포르티바"
            fitTag="좁고 높음"
            tagTone="brand"
            body="이탈리안 족형. 운동화 대비 EU 1~2 다운이 흔해요."
          />
          <BrandRow
            brand="스카르파"
            fitTag="넓음"
            tagTone="success"
            body="발볼 넓거나 발등 높은 모델 많음. 정사이즈 ~ 0.5~1 다운."
          />
          <BrandRow
            brand="매드락"
            fitTag="가성비"
            tagTone="warning"
            body="입문 친화. 정사이즈 ~ 0.5 업 선호."
          />
          <BrandRow
            brand="언파라렐 / 오순"
            fitTag="국내 핏"
            tagTone="muted"
            body="아시안 라스트 — 발볼 넓은 한국 발에 비교적 무난."
          />
        </Section>

        {/* 소재 차이 */}
        <Section title="가죽 vs 인조가죽" icon="droplet" desc="시간 지나면 어떻게 변해요?">
          <MaterialRow
            material="가죽 (스웨이드)"
            change="0.5 ~ 1 사이즈 늘어남"
            tone="warning"
            hint="처음엔 빡빡해도 OK"
          />
          <MaterialRow
            material="인조가죽"
            change="거의 안 늘어남"
            tone="brand"
            hint="처음 신었을 때 사이즈가 그대로 유지"
          />
        </Section>

        {/* 꿀팁 체크리스트 */}
        <Section title="구매 전 체크리스트" icon="check-square">
          <TipRow icon="clock" text="오후에 신어보기 — 발은 하루 종일 부어요" />
          <TipRow icon="user-x" text="양말 X — 맨발 또는 풋커버 위에 신어요" />
          <TipRow icon="arrow-down" text="서서 발가락이 살짝 굽을 정도가 적당" />
          <TipRow icon="repeat" text="여러 모델 비교 — 같은 사이즈도 모델마다 달라요" />
          <TipRow icon="zap" text="처음엔 통증 OK, 길들이면 풀려요 (가죽 한정)" />
        </Section>

        {/* Disclaimer */}
        <View style={s.disclaimerCard}>
          <Feather name="alert-circle" size={13} color={c.text.muted} />
          <Text style={s.disclaimerText}>
            일반적인 경향이며 모델·개인 발 편차가 큽니다. 직접 신어보고 결정하세요.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}

/* ──────────────────── Section ──────────────────── */

function Section({
  title, icon, desc, children,
}: {
  title: string;
  icon: IconName;
  desc?: string;
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBox}>
          <Feather name={icon} size={13} color={c.brand.primaryDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>{title}</Text>
          {desc && <Text style={s.sectionDesc}>{desc}</Text>}
        </View>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

/* ──────────────────── Level Card ──────────────────── */

type Tone = 'success' | 'brand' | 'warning' | 'muted';

function LevelCard({
  tone, level, range, desc, emoji,
}: {
  tone: Tone;
  level: string;
  range: string;
  desc: string;
  emoji: string;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const palette = tonePalette(c, tone);
  return (
    <View style={[s.levelCard, { backgroundColor: palette.bg, borderColor: palette.fg + '33' }]}>
      <Text style={s.levelEmoji}>{emoji}</Text>
      <Text style={[s.levelLabel, { color: palette.fg }]}>{level}</Text>
      <Text style={[s.levelRange, { color: c.text.primary }]}>{range}</Text>
      <Text style={s.levelDesc}>{desc}</Text>
    </View>
  );
}

/* ──────────────────── Shape Card ──────────────────── */

function ShapeCard({ label, desc }: { label: string; desc: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.shapeCard}>
      <Text style={s.shapeLabel}>{label}</Text>
      <Text style={s.shapeDesc}>{desc}</Text>
    </View>
  );
}

/* ──────────────────── Brand Row ──────────────────── */

function BrandRow({
  brand, fitTag, tagTone, body,
}: {
  brand: string;
  fitTag: string;
  tagTone: Tone;
  body: string;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const palette = tonePalette(c, tagTone);
  return (
    <View style={s.brandRow}>
      <View style={s.brandHeader}>
        <Text style={s.brandName}>{brand}</Text>
        <View style={[s.tag, { backgroundColor: palette.bg }]}>
          <Text style={[s.tagText, { color: palette.fg }]}>{fitTag}</Text>
        </View>
      </View>
      <Text style={s.brandBody}>{body}</Text>
    </View>
  );
}

/* ──────────────────── Material Row ──────────────────── */

function MaterialRow({
  material, change, tone, hint,
}: {
  material: string;
  change: string;
  tone: Tone;
  hint: string;
}) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const palette = tonePalette(c, tone);
  return (
    <View style={s.materialRow}>
      <View style={s.materialHeader}>
        <Text style={s.materialName}>{material}</Text>
        <View style={[s.tag, { backgroundColor: palette.bg }]}>
          <Text style={[s.tagText, { color: palette.fg }]}>{change}</Text>
        </View>
      </View>
      <Text style={s.materialHint}>{hint}</Text>
    </View>
  );
}

/* ──────────────────── Tip Row ──────────────────── */

function TipRow({ icon, text }: { icon: IconName; text: string }) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.tipRow}>
      <View style={s.tipIconBox}>
        <Feather name={icon} size={12} color={c.brand.primaryDeep} />
      </View>
      <Text style={s.tipText}>{text}</Text>
    </View>
  );
}

/* ──────────────────── Palette ──────────────────── */

function tonePalette(c: ThemeColors, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'success': return { bg: c.status.successBg, fg: c.status.success };
    case 'warning': return { bg: c.status.warningBg, fg: c.status.warning };
    case 'muted':   return { bg: c.bg.subtle,        fg: c.text.tertiary };
    case 'brand':
    default:        return { bg: c.brand.primaryLight, fg: c.brand.primaryDeep };
  }
}

/* ──────────────────── Styles ──────────────────── */

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    // Hero
    heroCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.brand.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    heroIcon: {
      width: 36, height: 36, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 14, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: -0.2,
    },
    heroDesc: { fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 },

    // TL;DR
    tldrCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.bg.subtle,
    },
    tldrLabel: {
      fontSize: 10, fontWeight: '900',
      color: c.brand.primary, letterSpacing: 0.5,
      paddingHorizontal: 7, paddingVertical: 3,
      borderRadius: 6, backgroundColor: c.brand.primaryLight,
    },
    tldrText: { flex: 1, fontSize: 12.5, color: c.text.primary, fontWeight: '600', lineHeight: 17 },

    // Section
    section: { gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionIconBox: {
      width: 26, height: 26, borderRadius: 8,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 14, fontWeight: '900', color: c.text.primary, letterSpacing: -0.3,
    },
    sectionDesc: { fontSize: 11, color: c.text.tertiary, fontWeight: '700', marginTop: 1 },

    // Level cards
    levelGrid: { flexDirection: 'row', gap: 8 },
    levelCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      gap: 4,
    },
    levelEmoji: { fontSize: 22, lineHeight: 26 },
    levelLabel: { fontSize: 11, fontWeight: '900', letterSpacing: -0.1 },
    levelRange: { fontSize: 12.5, fontWeight: '900', letterSpacing: -0.3 },
    levelDesc: {
      fontSize: 10.5, fontWeight: '700',
      color: c.text.tertiary, textAlign: 'center', lineHeight: 14,
    },

    // Shape cards
    shapeGrid: { flexDirection: 'row', gap: 8 },
    shapeCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      gap: 3,
    },
    shapeLabel: {
      fontSize: 12.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2,
    },
    shapeDesc: {
      fontSize: 10.5, fontWeight: '700', color: c.text.tertiary, textAlign: 'center',
    },

    // Brand rows
    brandRow: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      gap: 4,
    },
    brandHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    brandName: { fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    brandBody: { fontSize: 11.5, color: c.text.secondary, fontWeight: '600', lineHeight: 16 },

    // Material rows
    materialRow: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      gap: 4,
    },
    materialHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    materialName: { fontSize: 13, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    materialHint: { fontSize: 11.5, color: c.text.tertiary, fontWeight: '600', lineHeight: 16 },

    // Tag
    tag: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 999,
    },
    tagText: { fontSize: 10.5, fontWeight: '900', letterSpacing: -0.1 },

    // Tips
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.bg.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    tipIconBox: {
      width: 24, height: 24, borderRadius: 8,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    tipText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: c.text.primary, lineHeight: 17 },

    // Disclaimer
    disclaimerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.bg.subtle,
    },
    disclaimerText: { flex: 1, fontSize: 10.5, color: c.text.tertiary, fontWeight: '600', lineHeight: 14 },

    bold: { fontWeight: '900', color: c.text.primary },
  });
}
