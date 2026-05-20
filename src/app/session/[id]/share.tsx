import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { SessionShareCard } from '@/components/share/session-card';
import { useSessionDetail } from '@/hooks/use-session';

export default function SessionShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useSessionDetail(id);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);
  const [bgImageUri, setBgImageUri] = useState<string | null>(null);

  async function pickBackgroundImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요해요.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setBgImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('사진 선택 실패', e instanceof Error ? e.message : '오류');
    }
  }

  async function capture(): Promise<string> {
    // captureRef가 width/height 옵션으로 출력 해상도 보강 가능.
    // 1080×1080 PNG — IG 권장 사이즈.
    return await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      width: 1080,
      height: 1080,
    });
  }

  async function handleSave() {
    if (busy) return;
    setBusy('save');
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '갤러리에 저장하려면 권한이 필요해요.');
        return;
      }
      const uri = await capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '갤러리에 저장됐어요.');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '알 수 없는 오류');
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
        Alert.alert('공유 불가', '이 기기에서 시스템 공유가 지원되지 않아요.');
        return;
      }
      const uri = await capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '세션 공유',
      });
    } catch (e) {
      Alert.alert('공유 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center"
        edges={['top', 'bottom']}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-primary items-center justify-center p-6"
        edges={['top', 'bottom']}
      >
        <Text className="text-status-danger text-center mb-4">
          {error?.message ?? '세션을 찾을 수 없어요'}
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
      {/* Header */}
      <View className="flex-row items-center px-2 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={8}>
          <Text className="text-text-primary text-2xl">←</Text>
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold">
          세션 공유
        </Text>
        <View className="w-10" />
      </View>

      {/* Preview */}
      <View className="flex-1 items-center justify-center px-4 bg-background-secondary">
        <View
          className="rounded-2xl overflow-hidden border border-border-subtle"
          // shadow는 view-shot이 캡처 못 할 수 있어 카드 외부에만 적용
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <SessionShareCard
            ref={cardRef}
            session={data}
            size={340}
            backgroundImageUri={bgImageUri}
          />
        </View>
        <Text className="text-text-tertiary text-xs mt-4">
          저장 / 공유 시 1080×1080 PNG로 출력됩니다
        </Text>

        {/* Background image picker */}
        <View className="flex-row items-center gap-2 mt-3">
          <Pressable
            onPress={pickBackgroundImage}
            className="px-4 py-2 rounded-md border border-border-default bg-background-primary active:opacity-60"
          >
            <Text className="text-text-primary text-sm font-medium">
              {bgImageUri ? '🖼️ 배경 변경' : '🖼️ 배경 사진 추가'}
            </Text>
          </Pressable>
          {bgImageUri && (
            <Pressable
              onPress={() => setBgImageUri(null)}
              className="px-3 py-2 rounded-md border border-border-default bg-background-primary active:opacity-60"
              hitSlop={4}
            >
              <Text className="text-text-tertiary text-sm">제거</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Actions */}
      <View className="px-4 pt-2 pb-2 border-t border-border-subtle flex-row gap-3">
        <Pressable
          onPress={handleSave}
          disabled={busy !== null}
          className="flex-1 rounded-md p-4 items-center border border-border-default active:bg-background-secondary"
        >
          {busy === 'save' ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-text-primary font-semibold">이미지 저장</Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleShare}
          disabled={busy !== null}
          className="flex-1 rounded-md p-4 items-center bg-brand-primary"
        >
          {busy === 'share' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-background-primary font-semibold">공유하기</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
