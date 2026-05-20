import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';

import { SessionShareCard } from '@/components/share/session-card';
import { useSessionDetail } from '@/hooks/use-session';

const BG_COLORS = [
  { value: '#ffffff', name: '화이트', isDark: false },
  { value: '#fafaf9', name: '크림', isDark: false },
  { value: '#ecfdf5', name: '민트', isDark: false },
  { value: '#0f172a', name: '차콜', isDark: true },
  { value: '#0f766e', name: '딥틸', isDark: true },
  { value: '#3b0764', name: '퍼플', isDark: true },
];

const OPACITY_PRESETS = [
  { value: 0.2, label: '20%' },
  { value: 0.4, label: '40%' },
  { value: 0.6, label: '60%' },
  { value: 0.8, label: '80%' },
];

const RATIOS = [
  { value: '1:1', label: '1:1 정방형', icon: 'square' },
  { value: '4:5', label: '4:5 피드형', icon: 'smartphone' },
  { value: '9:16', label: '9:16 스토리', icon: 'phone' },
] as const;

const LAYOUTS = [
  { value: 'grid', label: '그리드', icon: 'grid' },
  { value: 'list', label: '리스트', icon: 'list' },
  { value: 'stats', label: '대형 통계', icon: 'pie-chart' },
] as const;

export default function SessionShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요해요.');
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
      Alert.alert('사진 선택 실패', e instanceof Error ? e.message : '오류');
    }
  }

  async function capture(): Promise<string> {
    let width = 1080;
    let height = 1080;
    if (ratio === '4:5') {
      height = 1350;
    } else if (ratio === '9:16') {
      height = 1920;
    }
    return await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      width,
      height,
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
      Alert.alert('저장 완료', '갤러리에 이미지 카드가 저장되었습니다.');
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

  const previewSize = ratio === '9:16' ? 200 : ratio === '4:5' ? 250 : 280;
  const previewHeight = ratio === '9:16' ? 355 : ratio === '4:5' ? 312 : 280;

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-2 border-b border-border-subtle">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60" hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </Pressable>
        <Text className="flex-1 text-center text-text-primary text-base font-semibold mr-6">
          기록 공유 카드
        </Text>
      </View>

      <ScrollView className="flex-1 bg-background-secondary" showsVerticalScrollIndicator={false}>
        {/* Preview Area */}
        <View
          className="items-center justify-center py-6 px-4"
          style={{ backgroundColor: 'rgba(244, 244, 245, 0.4)' }}
        >
          <View
            className="rounded-2xl overflow-hidden border border-border-subtle"
            style={{
              backgroundColor: bgColor,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 16,
              elevation: 5,
              width: previewSize,
              height: previewHeight,
            }}
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
          <Text className="text-text-tertiary text-[10px] mt-3 font-semibold">
            {ratio === '1:1' ? '1080×1080' : ratio === '4:5' ? '1080×1350' : '1080×1920'} PNG 고화질 출력
          </Text>
        </View>

        {/* Options Panel */}
        <View className="p-5 gap-6">
          {/* Ratio Selector */}
          <View>
            <Text className="text-text-primary text-sm font-bold mb-2.5">카드 비율</Text>
            <View className="flex-row gap-2">
              {RATIOS.map((item) => {
                const active = ratio === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRatio(item.value)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? '#0d9488' : '#e2e8f0',
                        backgroundColor: active ? 'rgba(13, 148, 136, 0.05)' : '#ffffff',
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={14}
                      color={active ? '#0d9488' : '#64748b'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-brand-primary' : 'text-text-secondary'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Layout Selector */}
          <View>
            <Text className="text-text-primary text-sm font-bold mb-2.5">레이아웃 테마</Text>
            <View className="flex-row gap-2">
              {LAYOUTS.map((item) => {
                const active = layoutType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setLayoutType(item.value)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? '#0d9488' : '#e2e8f0',
                        backgroundColor: active ? 'rgba(13, 148, 136, 0.05)' : '#ffffff',
                        opacity: pressed ? 0.8 : 1,
                      }
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={14}
                      color={active ? '#0d9488' : '#64748b'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-brand-primary' : 'text-text-secondary'
                      }`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Background Color Selector */}
          <View>
            <Text className="text-text-primary text-sm font-bold mb-2.5">배경 색상</Text>
            <View className="flex-row gap-3 flex-wrap">
              {BG_COLORS.map((color) => {
                const active = bgColor === color.value;
                return (
                  <Pressable
                    key={color.value}
                    onPress={() => setBgColor(color.value)}
                    style={({ pressed }) => [
                      {
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? '#0d9488' : '#e2e8f0',
                        backgroundColor: color.value,
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: active ? 1.05 : 1 }],
                      }
                    ]}
                  >
                    {active && (
                      <Feather
                        name="check"
                        size={16}
                        color={color.isDark ? '#ffffff' : '#0d9488'}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Background Image & Opacity Selector */}
          <View className="bg-background-primary border border-border-subtle p-4 rounded-2xl gap-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-text-primary text-sm font-bold">배경 사진 추가</Text>
                <Text className="text-text-tertiary text-[10px] mt-0.5">배경 뒤에 은은하게 사진을 겹쳐요</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={pickBackgroundImage}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <Feather name="image" size={12} color="#64748b" />
                  <Text className="text-text-secondary text-xs font-bold">
                    {bgImageUri ? '변경' : '등록'}
                  </Text>
                </Pressable>
                {bgImageUri && (
                  <Pressable
                    onPress={() => setBgImageUri(null)}
                    style={({ pressed }) => [
                      {
                        padding: 6,
                        opacity: pressed ? 0.6 : 1,
                      }
                    ]}
                  >
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            </View>

            {bgImageUri && (
              <View className="border-t border-border-subtle pt-3">
                <Text className="text-text-secondary text-xs font-semibold mb-2">사진 불투명도</Text>
                <View className="flex-row gap-2">
                  {OPACITY_PRESETS.map((p) => {
                    const active = bgOpacity === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        onPress={() => setBgOpacity(p.value)}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            borderWidth: 1,
                            alignItems: 'center',
                            borderColor: active ? '#0d9488' : '#e2e8f0',
                            backgroundColor: active ? 'rgba(13, 148, 136, 0.05)' : '#f8fafc',
                            opacity: pressed ? 0.8 : 1,
                          }
                        ]}
                      >
                        <Text
                          className={`text-xs ${
                            active ? 'text-brand-primary font-bold' : 'text-text-secondary'
                          }`}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View className="px-5 pt-3 pb-3 border-t border-border-subtle flex-row gap-3 bg-background-primary">
        <Pressable
          onPress={handleSave}
          disabled={busy !== null}
          style={({ pressed }) => [
            {
              flex: 1,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              flexDirection: 'row',
              gap: 6,
              opacity: pressed ? 0.7 : 1,
            }
          ]}
        >
          {busy === 'save' ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <Feather name="download" size={16} color="#0f172a" />
              <Text className="text-text-primary font-bold text-sm">이미지 저장</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleShare}
          disabled={busy !== null}
          style={({ pressed }) => [
            {
              flex: 1,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0d9488',
              flexDirection: 'row',
              gap: 6,
              opacity: pressed ? 0.8 : 1,
              shadowColor: '#0d9488',
              shadowOpacity: 0.15,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 6,
              elevation: 2,
            }
          ]}
        >
          {busy === 'share' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Feather name="share-2" size={16} color="white" />
              <Text className="text-white font-bold text-sm">공유하기</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
