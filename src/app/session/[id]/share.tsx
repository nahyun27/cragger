import { customAlert } from '@/components/ui/custom-alert';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/ui/screen-header';
import { SessionShareCard } from '@/components/share/session-card';
import { useSessionDetail } from '@/hooks/use-session';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;

const BG_COLORS: { value: string; name: string; isDark: boolean; transparent?: boolean }[] = [
  { value: '#ffffff', name: '화이트', isDark: false },
  { value: '#fafaf9', name: '크림', isDark: false },
  { value: '#ecfdf5', name: '민트', isDark: false },
  { value: '#0f172a', name: '차콜', isDark: true },
  { value: '#0e7490', name: '딥틸', isDark: true },
  { value: 'transparent', name: '투명', isDark: false, transparent: true },
];

const OPACITY_PRESETS = [
  { value: 0.2, label: '20%' },
  { value: 0.4, label: '40%' },
  { value: 0.6, label: '60%' },
  { value: 0.8, label: '80%' },
];

const RATIOS: { value: '1:1' | '4:5' | '9:16'; label: string; icon: IconName }[] = [
  { value: '1:1', label: '1:1', icon: 'square' },
  { value: '4:5', label: '4:5', icon: 'instagram' },
  { value: '9:16', label: '9:16', icon: 'smartphone' },
];

const LAYOUTS: { value: 'grid' | 'list' | 'stats'; label: string; icon: IconName }[] = [
  { value: 'grid', label: '그래프', icon: 'bar-chart-2' },
  { value: 'list', label: '리스트', icon: 'list' },
  { value: 'stats', label: '심플', icon: 'circle' },
];

export default function SessionShareScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useSessionDetail(id);

  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);
  const [bgImageUri, setBgImageUri] = useState<string | null>(null);
  const [ratio, setRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
  const [layoutType, setLayoutType] = useState<'grid' | 'list' | 'stats'>('grid');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [bgOpacity, setBgOpacity] = useState<number>(0.4);

  async function pickBackgroundImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        customAlert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요해요.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setBgImageUri(result.assets[0].uri);
      }
    } catch (e) {
      customAlert('사진 선택 실패', e instanceof Error ? e.message : '오류');
    }
  }

  async function capture(): Promise<string> {
    let width = 1080;
    let height = 1080;
    if (ratio === '4:5') height = 1350;
    else if (ratio === '9:16') height = 1920;
    return await captureRef(cardRef, { format: 'png', quality: 1, width, height });
  }

  async function handleSave() {
    if (busy) return;
    setBusy('save');
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        customAlert('권한 필요', '갤러리에 저장하려면 권한이 필요해요.');
        return;
      }
      const uri = await capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      customAlert('저장 완료', '갤러리에 이미지 카드가 저장되었습니다.');
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (busy) return;
    setBusy('share');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        customAlert('공유 불가', '이 기기에서 시스템 공유가 지원되지 않아요.');
        return;
      }
      const uri = await capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '세션 공유' });
    } catch (e) {
      customAlert('공유 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.center} edges={['top', 'bottom']}>
        <ActivityIndicator color={c.brand.primary} />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView style={[s.center, { padding: 24 }]} edges={['top', 'bottom']}>
        <Text style={{ color: c.status.danger, textAlign: 'center', marginBottom: 12, fontSize: 13, fontWeight: '700' }}>
          {error?.message ?? '세션을 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.fallbackBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: '800' }}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const previewSize = ratio === '9:16' ? 200 : ratio === '4:5' ? 250 : 280;
  const previewHeight = ratio === '9:16' ? 355 : ratio === '4:5' ? 312 : 280;
  const dimsLabel = ratio === '1:1' ? '1080×1080' : ratio === '4:5' ? '1080×1350' : '1080×1920';

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader title="기록 공유 카드" onBack={() => router.back()} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Stage */}
        <View style={s.previewStage}>
          <View
            style={[s.previewWrap, {
              width: previewSize,
              height: previewHeight,
              backgroundColor: bgColor,
            }]}
          >
            <SessionShareCard
              ref={cardRef}
              session={data}
              size={previewSize}
              ratio={ratio}
              layoutType={layoutType}
              backgroundColor={bgColor}
              backgroundImageUri={bgImageUri}
              backgroundOpacity={bgOpacity}
            />
          </View>
          <View style={s.previewMeta}>
            <Feather name="image" size={10} color={c.text.muted} />
            <Text style={s.previewMetaText}>{dimsLabel} · PNG 고화질</Text>
          </View>
        </View>

        {/* Options */}
        <View style={s.options}>
          {/* Ratio */}
          <SectionCard title="카드 비율" icon="maximize-2" c={c}>
            <SegmentedRow
              items={RATIOS}
              selected={ratio}
              onSelect={(v) => setRatio(v as '1:1' | '4:5' | '9:16')}
              c={c}
            />
          </SectionCard>

          {/* Layout */}
          <SectionCard title="레이아웃" icon="layout" c={c}>
            <SegmentedRow
              items={LAYOUTS}
              selected={layoutType}
              onSelect={(v) => setLayoutType(v as 'grid' | 'list' | 'stats')}
              c={c}
            />
          </SectionCard>

          {/* Background color */}
          <SectionCard
            title="배경 색상"
            icon="droplet"
            desc="투명 배경은 영상 위에 올려서 쓸 수 있어요"
            c={c}
          >
            <View style={s.colorRow}>
              {BG_COLORS.map((col) => {
                const active = bgColor === col.value;
                const isTransparent = col.transparent === true;
                return (
                  <Pressable
                    key={col.value}
                    onPress={() => setBgColor(col.value)}
                    hitSlop={4}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: 'center', marginBottom: 4 }]}
                  >
                    <View
                      style={[
                        s.colorSwatch,
                        {
                          backgroundColor: isTransparent ? c.bg.card : col.value,
                          borderColor: active ? c.brand.primary : c.border.subtle,
                          borderWidth: active ? 2.5 : 1,
                          borderStyle: isTransparent ? 'dashed' : 'solid',
                          transform: [{ scale: active ? 1.08 : 1 }],
                        },
                      ]}
                    >
                      {isTransparent && !active && (
                        <Feather name="slash" size={18} color={c.text.muted} />
                      )}
                      {active && (
                        <Feather
                          name="check"
                          size={16}
                          color={isTransparent ? c.brand.primary : (col.isDark ? '#ffffff' : c.brand.primary)}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        s.colorLabel,
                        { marginTop: 4 },
                        active && { color: c.brand.primaryDeep },
                      ]}
                    >
                      {col.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          {/* Background image + opacity */}
          <SectionCard
            title="배경 사진"
            icon="image"
            desc="카드 뒤에 은은하게 사진을 깔아요"
            c={c}
            trailing={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={pickBackgroundImage}>
                  {({ pressed }) => (
                    <View style={[s.pillBtn, pressed && { opacity: 0.7 }]}>
                      <Feather name="image" size={11} color={c.text.primary} style={{ marginRight: 4 }} />
                      <Text style={s.pillBtnText}>{bgImageUri ? '변경' : '등록'}</Text>
                    </View>
                  )}
                </Pressable>
                {bgImageUri && (
                  <Pressable onPress={() => setBgImageUri(null)} style={{ marginLeft: 6 }}>
                    {({ pressed }) => (
                      <View style={[s.iconBtn, pressed && { opacity: 0.6 }]}>
                        <Feather name="x" size={13} color={c.status.danger} />
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            }
          >
            {bgImageUri && (
              <View style={{ gap: 6 }}>
                <Text style={s.subLabel}>사진 불투명도</Text>
                <View style={s.opacityRow}>
                  {OPACITY_PRESETS.map((p) => {
                    const active = bgOpacity === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setBgOpacity(p.value)}
                        style={{ flex: 1, marginHorizontal: 3 }}
                      >
                        {({ pressed }) => (
                          <View
                            style={[
                              s.opacityPill,
                              active && s.opacityPillActive,
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <Text style={[s.opacityText, active && s.opacityTextActive]}>
                              {p.label}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </SectionCard>
        </View>
      </ScrollView>

      {/* Sticky Actions */}
      <View style={s.actions}>
        <Pressable
          onPress={handleSave}
          disabled={busy !== null}
          style={{ flex: 1, marginRight: 5 }}
        >
          {({ pressed }) => (
            <View style={[
              s.actionBtn,
              s.actionBtnSecondary,
              (pressed || busy !== null) && { opacity: 0.7 },
            ]}>
              {busy === 'save' ? (
                <ActivityIndicator size="small" color={c.text.primary} />
              ) : (
                <>
                  <Feather name="download" size={15} color={c.text.primary} style={{ marginRight: 6 }} />
                  <Text style={s.actionBtnTextSecondary}>저장</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={handleShare}
          disabled={busy !== null}
          style={{ flex: 1, marginLeft: 5 }}
        >
          {({ pressed }) => (
            <View style={[
              s.actionBtn,
              s.actionBtnPrimary,
              (pressed || busy !== null) && { opacity: 0.85 },
            ]}>
              {busy === 'share' ? (
                <ActivityIndicator size="small" color={c.brand.onPrimary} />
              ) : (
                <>
                  <Feather name="share-2" size={15} color={c.brand.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={s.actionBtnTextPrimary}>공유하기</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SectionCard({
  title, icon, desc, children, trailing, c,
}: {
  title: string;
  icon: IconName;
  desc?: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  c: ThemeColors;
}) {
  return (
    <View style={{
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 14,
      gap: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 9,
          backgroundColor: c.brand.primaryLight,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Feather name={icon} size={14} color={c.brand.primaryDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 }}>
            {title}
          </Text>
          {desc ? (
            <Text style={{ fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 1 }}>
              {desc}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

function SegmentedRow<T extends string>({
  items, selected, onSelect, c,
}: {
  items: { value: T; label: string; icon: IconName }[];
  selected: T;
  onSelect: (v: T) => void;
  c: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.bg.subtle,
        borderRadius: 12,
        padding: 3,
        alignSelf: 'stretch',
      }}
    >
      {items.map((it) => {
        const active = selected === it.value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onSelect(it.value)}
            style={{ flex: 1, marginHorizontal: 1 }}
          >
            {({ pressed }) => (
              <View
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 9,
                    borderRadius: 9,
                    backgroundColor: active ? c.bg.card : 'transparent',
                    opacity: pressed ? 0.8 : 1,
                  },
                  active && {
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  },
                ]}
              >
                <Feather
                  name={it.icon}
                  size={13}
                  color={active ? c.brand.primary : c.text.tertiary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: active ? '900' : '700',
                    color: active ? c.text.primary : c.text.secondary,
                    letterSpacing: -0.2,
                  }}
                  numberOfLines={1}
                >
                  {it.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.primary,
    },
    fallbackBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    scroll: { flex: 1 },

    // preview stage (background area)
    previewStage: {
      alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18,
      backgroundColor: c.bg.subtle,
      gap: 10,
    },
    previewWrap: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    previewMeta: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
      backgroundColor: c.bg.card,
    },
    previewMetaText: { fontSize: 10, color: c.text.tertiary, fontWeight: '700', letterSpacing: 0.2 },

    // options
    options: { padding: 18, gap: 14 },

    // colors
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
    colorSwatch: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
    },
    colorLabel: { fontSize: 10.5, color: c.text.tertiary, fontWeight: '700' },

    // bg image controls
    pillBtn: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
      backgroundColor: c.bg.subtle,
    },
    pillBtnText: { fontSize: 11.5, color: c.text.primary, fontWeight: '900' },
    iconBtn: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.status.dangerBg,
    },
    subLabel: { fontSize: 11, color: c.text.tertiary, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
    opacityRow: { flexDirection: 'row', alignSelf: 'stretch', marginHorizontal: -3 },
    opacityPill: {
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: c.bg.subtle,
    },
    opacityPillActive: { backgroundColor: c.brand.primary },
    opacityText: { fontSize: 12, color: c.text.secondary, fontWeight: '800' },
    opacityTextActive: { color: c.brand.onPrimary, fontWeight: '900' },

    // actions
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 13,
      paddingTop: 10,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 14,
    },
    actionBtnSecondary: {
      backgroundColor: c.bg.subtle,
    },
    actionBtnPrimary: {
      backgroundColor: c.brand.primary,
      shadowColor: c.brand.primary,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    actionBtnTextSecondary: { fontSize: 14, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2 },
    actionBtnTextPrimary: { fontSize: 14, fontWeight: '900', color: c.brand.onPrimary, letterSpacing: -0.2 },
  });
}
