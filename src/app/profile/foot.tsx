import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  useProfile,
  useUpdateProfile,
  type ArchType,
  type FootShape,
  type FootWidth,
  type InstepHeight,
} from '@/hooks/use-profile';
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
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <View style={[s.headerBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="arrow-left" size={22} color={c.text.primary} />
            </View>
          )}
        </Pressable>
        <Text style={s.headerTitle}>내 발 프로필</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.helperBox}>
            <Feather name="info" size={13} color={c.text.secondary} />
            <Text style={s.helperText}>
              나에게 맞는 암벽화를 추천받기 위한 정보예요. 모두 선택 사항이에요.
            </Text>
          </View>

          {/* Length inputs */}
          <View style={s.lengthRow}>
            <View style={s.lengthCol}>
              <Text style={s.label}>발 실측 길이 (mm)</Text>
              <TextInput
                style={[s.mmInput, lengthErr && s.inputError]}
                value={footLength}
                onChangeText={setFootLength}
                placeholder="예: 265"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={3}
              />
              {lengthErr && <Text style={s.errText}>{lengthErr}</Text>}
            </View>
            <View style={s.lengthCol}>
              <Text style={s.label}>운동화 사이즈 (mm)</Text>
              <TextInput
                style={[s.mmInput, shoeErr && s.inputError]}
                value={shoeSize}
                onChangeText={setShoeSize}
                placeholder="예: 270"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={3}
              />
              {shoeErr && <Text style={s.errText}>{shoeErr}</Text>}
            </View>
          </View>

          {/* Foot shape — 2x2 cards */}
          <Text style={[s.label, s.sectionLabel]}>발 모양</Text>
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

          {/* Foot width — pills */}
          <Text style={[s.label, s.sectionLabel]}>발 폭</Text>
          <View style={s.pillRow}>
            {WIDTH_OPTIONS.map((opt) => {
              const active = width === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setWidth(active ? null : opt.value)}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        s.pill,
                        active && s.pillActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[s.pillText, active && s.pillTextActive]}>
                        {opt.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Instep height — 3 cards */}
          <Text style={[s.label, s.sectionLabel]}>발등 높이</Text>
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

          {/* Arch type — 3 cards */}
          <Text style={[s.label, s.sectionLabel]}>아치 타입</Text>
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
        </ScrollView>

        <View style={s.footer}>
          <Pressable onPress={() => router.back()} style={s.footerCancel}>
            {({ pressed }) => (
              <View style={[s.cancelBtn, pressed && { opacity: 0.7 }]}>
                <Text style={s.cancelBtnText}>취소</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} style={s.footerSave}>
            {({ pressed }) => (
              <View
                style={[
                  s.saveBtn,
                  !canSubmit && s.saveBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {update.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={s.saveBtnText}>저장</Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.subtle,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: c.text.primary },
    scrollContent: { padding: 16, paddingBottom: 32 },
    helperBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: c.bg.accent,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    helperText: { flex: 1, fontSize: 12, color: c.text.secondary, lineHeight: 17 },
    label: { fontSize: 12, fontWeight: '700', color: c.text.secondary, marginBottom: 8 },
    sectionLabel: { marginTop: 20 },
    lengthRow: { flexDirection: 'row', gap: 12 },
    lengthCol: { flex: 1 },
    mmInput: {
      backgroundColor: c.bg.subtle,
      borderWidth: 1,
      borderColor: c.border.subtle,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: c.text.primary,
      fontWeight: '600',
    },
    inputError: { borderColor: c.status.danger, backgroundColor: c.status.dangerBg },
    errText: { fontSize: 11, color: c.status.danger, marginTop: 4, marginLeft: 4 },
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
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: c.bg.subtle,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    pillActive: {
      backgroundColor: c.brand.primary,
      borderColor: c.brand.primary,
    },
    pillText: { fontSize: 14, fontWeight: '700', color: c.text.tertiary },
    pillTextActive: { color: c.brand.onPrimary },
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
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    footerCancel: { flex: 1 },
    footerSave: { flex: 2 },
    cancelBtn: {
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.subtle,
      borderWidth: 1,
      borderColor: c.border.subtle,
    },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: c.text.secondary },
    saveBtn: {
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brand.primary,
    },
    saveBtnDisabled: { backgroundColor: c.border.strong },
    saveBtnText: { fontSize: 14, fontWeight: '800', color: c.brand.onPrimary },
  });
}
