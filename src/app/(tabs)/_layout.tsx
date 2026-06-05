import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors, useEffectiveScheme } from '@/lib/theme';

type TabButtonProps = {
  onPress?: (e: GestureResponderEvent) => void;
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  children?: React.ReactNode;
  accessibilityState?: { selected?: boolean } & Record<string, unknown>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: unknown;
};

// 스프링 + 햅틱이 들어간 탭 바 버튼.
// 누르는 순간 살짝 줄어들고, 떼면 살짝 오버슈트하면서 원래 크기로 돌아온다 ("boing").
function HapticSpringTabButton(props: TabButtonProps) {
  const scale = useSharedValue(1);
  const isSelected = !!props.accessibilityState?.selected;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (e: GestureResponderEvent) => {
    // 이미 선택된 탭이면 햅틱 살짝만, 새 탭이면 약간 더 또렷하게.
    Haptics.impactAsync(
      isSelected
        ? Haptics.ImpactFeedbackStyle.Soft
        : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
    props.onPress?.(e);
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(0.86, { duration: 90 });
    props.onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    // 약간 통통 튀는 boing — damping 낮으면 진동 크게.
    scale.value = withSpring(1, {
      damping: 6,
      stiffness: 240,
      mass: 0.8,
      overshootClamping: false,
    });
    props.onPressOut?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={props.onLongPress}
      accessibilityRole="button"
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityHint={props.accessibilityHint}
      testID={props.testID}
      style={[
        // 기존 탭 컨테이너 레이아웃 보존
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props.style as any,
        { flex: 1 },
      ]}
    >
      <Animated.View
        style={[
          { flex: 1, alignItems: 'center', justifyContent: 'center' },
          animatedStyle,
        ]}
      >
        {props.children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const c = useThemeColors();
  const scheme = useEffectiveScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text.primary,
        tabBarInactiveTintColor: c.text.muted,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={scheme === 'dark' ? 'dark' : 'light'}
              intensity={80}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: scheme === 'dark' ? '#0a1220' : '#ffffff' },
              ]}
            />
          ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor:
            Platform.OS === 'ios'
              ? scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'
              : 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border.subtle,
          elevation: 0,
          paddingBottom: 20,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBarButton: (props: any) => <HapticSpringTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'create' : 'create-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gyms"
        options={{
          title: '암장',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

