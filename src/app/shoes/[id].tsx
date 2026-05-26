import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { EMPTY_SHOE_FORM, ShoeForm, type ShoeFormValue } from '@/components/shoes/shoe-form';
import {
  useDeleteShoe,
  useShoe,
  useUpdateShoe,
} from '@/hooks/use-shoes';

export default function EditShoeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const shoeQ = useShoe(id);
  const updateShoe = useUpdateShoe();
  const deleteShoe = useDeleteShoe();

  const [form, setForm] = useState<ShoeFormValue>(EMPTY_SHOE_FORM);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !shoeQ.data) return;
    const s = shoeQ.data;
    setForm({
      brand: s.brand ?? '',
      model: s.model,
      size: s.size ?? '',
      status: s.status,
      purchasedAt: s.purchased_at,
      note: s.note ?? '',
      ownershipStatus: s.ownership_status,
      wantedFit: s.wanted_fit,
      fitPerception: s.fit_perception,
      stiffness: s.stiffness,
      stretch: s.stretch,
      usages: s.usages ?? [],
      fitFeatures: s.fit_features ?? [],
      isPrimary: s.is_primary,
      ratings: {
        overall: s.rating_overall,
        edging: s.rating_edging,
        smearing: s.rating_smearing,
        toehook: s.rating_toehook,
        heelhook: s.rating_heelhook,
        sensitivity: s.rating_sensitivity,
        comfort: s.rating_comfort,
        durability: s.rating_durability,
        value: s.rating_value,
        design: s.rating_design,
      },
    });
    setPrefilled(true);
  }, [shoeQ.data, prefilled]);

  const canSubmit =
    prefilled && form.model.trim().length > 0 && !updateShoe.isPending;

  async function handleSubmit() {
    if (!id || !canSubmit) return;
    try {
      await updateShoe.mutateAsync({
        shoeId: id,
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
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  function handleDelete() {
    if (!id || deleteShoe.isPending) return;
    Alert.alert('이 암벽화를 삭제할까요?', '되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteShoe.mutateAsync(id);
            router.back();
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류');
          }
        },
      },
    ]);
  }

  if (shoeQ.isLoading || !prefilled) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (shoeQ.error || !shoeQ.data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {shoeQ.error?.message ?? '암벽화를 찾을 수 없어요'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="border border-border-default rounded-md px-4 py-2"
        >
          <Text className="text-text-primary">돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          암벽화 수정
        </Text>
        <Pressable
          onPress={handleDelete}
          disabled={deleteShoe.isPending}
          className="p-2 active:opacity-60"
          hitSlop={8}
        >
          {deleteShoe.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Feather name="trash-2" size={20} color="#ef4444" />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ShoeForm value={form} onChange={setForm} />

        <View className="px-4 pt-2 pb-2 border-t border-border-subtle">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-md p-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {updateShoe.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                저장
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
