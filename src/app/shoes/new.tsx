import { customAlert } from '@/components/ui/custom-alert';
import { useRouter } from 'expo-router';
import React, { useState, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { EMPTY_SHOE_FORM, ShoeForm, type ShoeFormValue } from '@/components/shoes/shoe-form';
import { ShoeSizeGuide } from '@/components/shoes/shoe-size-guide';
import { ScreenHeader } from '@/components/ui/screen-header';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { useCreateShoe } from '@/hooks/use-shoes';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

export default function NewShoeScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const router = useRouter();
  const createShoe = useCreateShoe();
  const [form, setForm] = useState<ShoeFormValue>(EMPTY_SHOE_FORM);
  const [guideOpen, setGuideOpen] = useState(false);

  const canSubmit = form.model.trim().length > 0 && !createShoe.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await createShoe.mutateAsync({
        brand: form.brand || null,
        model: form.model,
        size: form.size || null,
        status: form.status,
        purchasedAt: form.purchasedAt,
        note: form.note || null,
        ownershipStatus: form.ownershipStatus,
        wantedFit: form.wantedFit,
        fitPerception: form.fitPerception,
        stiffness: form.stiffness,
        stretch: form.stretch,
        usages: form.usages,
        fitFeatures: form.fitFeatures,
        isPrimary: form.isPrimary,
        ratingOverall: form.ratings.overall,
        ratingEdging: form.ratings.edging,
        ratingSmearing: form.ratings.smearing,
        ratingToehook: form.ratings.toehook,
        ratingHeelhook: form.ratings.heelhook,
        ratingSensitivity: form.ratings.sensitivity,
        ratingComfort: form.ratings.comfort,
        ratingDurability: form.ratings.durability,
        ratingValue: form.ratings.value,
        ratingDesign: form.ratings.design,
      });
      router.back();
    } catch (e) {
      customAlert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={s.safeContainer} edges={['left', 'right']}>
      <ScreenHeader title="새 신발 등록" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sizing Guide banner */}
        <Pressable
          onPress={() => setGuideOpen(true)}
          hitSlop={6}
        >
          {({ pressed }) => (
            <View style={[s.guideBanner, pressed && s.btnPressed]}>
              <Feather name="info" size={14} color={c.brand.primary} />
              <Text style={s.guideBannerText}>
                어떤 사이즈가 맞을까요? 사이즈 가이드 확인하기
              </Text>
            </View>
          )}
        </Pressable>

        <ShoeForm value={form} onChange={setForm} />

        <BottomCTA
          label="등록 완료"
          onPress={handleSubmit}
          loading={createShoe.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>

      <ShoeSizeGuide visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: c.bg.card,
  },
  flex1: {
    flex: 1,
    backgroundColor: c.bg.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: c.bg.card,
  },
  headerTitle: {
    color: c.text.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg.card,
  },
  btnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  guideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.bg.accent,
    borderBottomWidth: 1,
    borderBottomColor: '#cffafe',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  guideBannerText: {
    color: '#0891b2',
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: c.bg.card,
  },
  submitBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  submitBtnTextDisabled: {
    color: c.text.muted,
  },
  });
}