import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  useProfile,
  useUpdateProfile,
  type ArchType,
  type FootShape,
  type FootWidth,
  type InstepHeight,
} from '@/hooks/use-profile';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { Chip } from '@/components/ui/chip';
import { FormField, FormInput } from '@/components/ui/form';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const SHAPE_OPTIONS: Array<{
  value: FootShape;
  label: string;
  sub: string;
  image: any;
}> = [
  { value: 'egyptian', label: '이집트형', sub: '엄지발가락이 가장 김', image: require('@/assets/images/foot-shapes/egyptian.png') },
  { value: 'roman', label: '로마형', sub: '앞 세 발가락 길이 비슷', image: require('@/assets/images/foot-shapes/roman.png') },
  { value: 'greek', label: '그리스형', sub: '검지발가락이 가장 김', image: require('@/assets/images/foot-shapes/greek.png') },
  { value: 'square', label: '정사각형', sub: '다섯 발가락 길이 거의 동일', image: require('@/assets/images/foot-shapes/square.png') },
];

const WIDTH_OPTIONS: Array<{ value: FootWidth; label: string }> = [
  { value: 'narrow', label: '좁음' },
  { value: 'normal', label: '보통' },
  { value: 'wide', label: '넓음' },
  { value: 'very_wide', label: '매우 넓음' },
];

const INSTEP_OPTIONS: Array<{ value: InstepHeight; label: string; sub: string }> = [
  { value: 'low', label: '낮음', sub: '볼륨감이 적은 발등' },
  { value: 'normal', label: '보통', sub: '일반적인 발등 높이' },
  { value: 'high', label: '높음', sub: '볼륨감이 큰 발등' },
];

const ARCH_OPTIONS: Array<{ value: ArchType; label: string; sub: string }> = [
  { value: 'flat', label: '평발', sub: '아치가 거의 없음' },
  { value: 'normal', label: '보통', sub: '일반적인 아치' },
  { value: 'high', label: '높은 아치', sub: '아치가 뚜렷함' },
];

function parseMm(v: string): number | null {
  const n = parseInt(v.trim(), 10);
  if (!Number.isFinite(n)) return null;
  if (n < 150 || n > 350) return null;
  return n;
}

export default function FootProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [footLength, setFootLength] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [shape, setShape] = useState<FootShape | null>(null);
  const [width, setWidth] = useState<FootWidth | null>(null);
  const [instep, setInstep] = useState<InstepHeight | null>(null);
  const [arch, setArch] = useState<ArchType | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFootLength(profile.foot_length_mm != null ? String(profile.foot_length_mm) : '');
    setShoeSize(profile.shoe_size_mm != null ? String(profile.shoe_size_mm) : '');
    setShape(profile.foot_shape);
    setWidth(profile.foot_width);
    setInstep(profile.instep_height);
    setArch(profile.arch_type);
  }, [profile]);

  const lengthErr =
    footLength.trim() !== '' && parseMm(footLength) == null ? '150~350 사이' : null;
  const shoeErr =
    shoeSize.trim() !== '' && parseMm(shoeSize) == null ? '150~350 사이' : null;
  const canSubmit = !lengthErr && !shoeErr && !update.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await update.mutateAsync({
        footLengthMm: footLength.trim() === '' ? null : parseMm(footLength),
        shoeSizeMm: shoeSize.trim() === '' ? null : parseMm(shoeSize),
        footShape: shape,
        footWidth: width,
        instepHeight: instep,
        archType: arch,
      });
      router.back();
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '오류');
    }
  }

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="내 발 프로필" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 12 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero 안내 */}
          <View style={s.heroCard}>
            <View style={s.heroIcon}>
              <Feather name="info" size={16} color={c.brand.primaryDeep} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heroTitle}>나에게 맞는 암벽화를 추천받기 위한 정보예요</Text>
              <Text style={s.heroDesc}>모두 선택 사항이라 채우는 만큼만 정확도가 올라가요.</Text>
            </View>
          </View>

          {/* Length inputs */}
          <Section title="발 길이" icon="maximize-2" desc="실측은 발 길이, 운동화 사이즈는 평소 신는 사이즈">
            <View style={s.fieldGrid}>
              <FormField label="발 실측 길이" error={lengthErr || undefined} flex>
                <FormInput
                  value={footLength}
                  onChangeText={setFootLength}
                  placeholder="예: 265"
                  keyboardType="number-pad"
                  maxLength={3}
                  trailingUnit="mm"
                />
              </FormField>
              <FormField label="운동화 사이즈" error={shoeErr || undefined} flex>
                <FormInput
                  value={shoeSize}
                  onChangeText={setShoeSize}
                  placeholder="예: 270"
                  keyboardType="number-pad"
                  maxLength={3}
                  trailingUnit="mm"
                />
              </FormField>
            </View>
          </Section>

          {/* Foot shape — 2x2 cards */}
          <Section title="발 모양" icon="zap">
          <View style={s.shapeGrid}>
            {SHAPE_OPTIONS.map((opt) => {
              const active = shape === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setShape(active ? null : opt.value)}
                  style={s.shapeCol}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        s.shapeCard,
                        active && s.shapeCardActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Image source={opt.image} style={s.shapeImg} resizeMode="contain" />
                      <Text style={[s.shapeLabel, active && s.shapeLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={s.shapeSub}>{opt.sub}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          </Section>

          {/* Foot width — pills */}
          <Section title="발 폭" icon="move">
            <View style={s.chipWrap}>
              {WIDTH_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={width === opt.value}
                  onPress={() => setWidth(width === opt.value ? null : opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* Instep height — 3 cards */}
          <Section title="발등 높이" icon="trending-up">
          <View style={s.threeRow}>
            {INSTEP_OPTIONS.map((opt) => {
              const active = instep === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setInstep(active ? null : opt.value)}
                  style={s.threeCol}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        s.threeCard,
                        active && s.threeCardActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[s.threeLabel, active && s.threeLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={s.threeSub}>{opt.sub}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          </Section>

          {/* Arch type — 3 cards */}
          <Section title="아치 타입" icon="activity">
          <View style={s.threeRow}>
            {ARCH_OPTIONS.map((opt) => {
              const active = arch === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setArch(active ? null : opt.value)}
                  style={s.threeCol}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        s.threeCard,
                        active && s.threeCardActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[s.threeLabel, active && s.threeLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={s.threeSub}>{opt.sub}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          </Section>
        </ScrollView>

        <BottomCTA
          label="저장"
          icon="check"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={update.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.primary },
    scrollContent: { padding: 18, paddingBottom: 100, gap: 16 },

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
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 13.5,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.2,
    },
    heroDesc: { fontSize: 11.5, color: c.text.secondary, fontWeight: '600', lineHeight: 16 },

    fieldGrid: { flexDirection: 'row', gap: 10 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    shapeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    shapeCol: { width: '48.5%' },
    shapeCard: {
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 20,
      padding: 16,
      minHeight: 80,
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    shapeCardActive: {
      borderColor: c.brand.primary,
      borderWidth: 2,
      backgroundColor: c.bg.accent,
    },
    shapeImg: {
      width: '100%',
      height: 70,
      marginBottom: 8,
    },
    shapeLabel: { fontSize: 14, fontWeight: '800', color: c.text.primary, marginBottom: 4 },
    shapeLabelActive: { color: c.text.primary },
    shapeSub: { fontSize: 11, color: c.text.tertiary, lineHeight: 15 },
    threeRow: { flexDirection: 'row', gap: 8 },
    threeCol: { flex: 1 },
    threeCard: {
      backgroundColor: c.bg.card,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 20,
      padding: 14,
      alignItems: 'center',
      minHeight: 80,
      justifyContent: 'center',
      shadowColor: c.shadow.color,
      shadowOpacity: c.shadow.opacity,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    threeCardActive: {
      borderColor: c.brand.primary,
      borderWidth: 2,
      backgroundColor: c.bg.accent,
    },
    threeLabel: { fontSize: 14, fontWeight: '800', color: c.text.primary, marginBottom: 3 },
    threeLabelActive: { color: c.text.primary },
    threeSub: { fontSize: 10, color: c.text.tertiary, textAlign: 'center', lineHeight: 14 },
  });
}
