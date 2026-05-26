import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Section } from '@/components/ui/section';
import { useJoinCrewByCode, useLookupCrewByCode } from '@/hooks/use-crews';

export default function JoinCrewScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const joinCrew = useJoinCrewByCode();
  const codeUpper = code.trim().toUpperCase();
  const codeReady = codeUpper.length === 6;
  const { data: preview, isLoading: previewLoading, error: previewError } = useLookupCrewByCode(
    codeUpper,
  );

  const canSubmit = codeReady && !!preview && !joinCrew.isPending;

  async function handleJoin() {
    if (!canSubmit) return;
    try {
      const { crewId } = await joinCrew.mutateAsync(codeUpper);
      router.replace({ pathname: '/crew/[id]', params: { id: crewId } } as never);
    } catch (e) {
      Alert.alert('가입 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          크루 가입
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="p-5 gap-6 pb-8">
          <Section title="초대코드" required>
            <View className="flex-row items-center bg-background-secondary border border-border-subtle rounded-xl px-3.5">
              <Feather name="key" size={16} color="#64748b" />
              <TextInput
                placeholder="6자리 (예: ABC234)"
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                className="flex-1 py-3 ml-2 text-text-primary text-base"
                style={{ letterSpacing: 4, fontWeight: '800' }}
              />
            </View>
            <Text className="text-text-tertiary text-xs">
              크루 owner 가 알려준 초대코드를 입력하세요
            </Text>
          </Section>

          {/* 미리보기 카드 */}
          {codeReady && (
            <View className="bg-background-secondary border border-border-subtle rounded-xl p-4 gap-3">
              {previewLoading ? (
                <View className="items-center py-2">
                  <ActivityIndicator color="#06b6d4" />
                </View>
              ) : previewError ? (
                <Text className="text-status-danger text-sm font-semibold">
                  {previewError.message}
                </Text>
              ) : preview ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-full bg-brand-primary/10 items-center justify-center">
                      <Feather name="users" size={20} color="#06b6d4" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-text-primary text-base font-extrabold" numberOfLines={1}>
                        {preview.name}
                      </Text>
                      <Text className="text-text-tertiary text-xs font-semibold">
                        멤버 {preview.member_count}명
                      </Text>
                    </View>
                  </View>
                  {preview.description && (
                    <Text className="text-text-secondary text-sm leading-5">
                      {preview.description}
                    </Text>
                  )}
                </>
              ) : (
                <View className="items-center py-2 gap-1">
                  <Feather name="x-circle" size={20} color="#94a3b8" />
                  <Text className="text-text-tertiary text-sm font-semibold">
                    코드를 확인해주세요
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View className="px-5 pt-3 pb-5 border-t border-border-subtle">
          <Pressable
            onPress={handleJoin}
            disabled={!canSubmit}
            className={`rounded-xl py-4 items-center ${
              !canSubmit ? 'bg-background-tertiary' : 'bg-brand-primary'
            }`}
          >
            {joinCrew.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !canSubmit ? 'text-text-muted' : 'text-background-primary'
                }`}
              >
                가입하기
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
