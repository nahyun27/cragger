import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { useCreateShoe } from '@/hooks/use-shoes';

export default function NewShoeScreen() {
  const router = useRouter();
  const createShoe = useCreateShoe();
  const [form, setForm] = useState<ShoeFormValue>(EMPTY_SHOE_FORM);

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
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          암벽화 추가
        </Text>
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
            {createShoe.isPending ? (
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
