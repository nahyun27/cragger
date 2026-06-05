/**
 * BoingPressable — 살짝 작아졌다가 통통 튀어 올라오는 스프링 + 햅틱 피드백.
 *
 * Pressable 의 drop-in 대체. style 은 inner Animated.View 가 아닌 Pressable 자체에 적용.
 * (Animated.createAnimatedComponent 로 Pressable 을 직접 애니메이션해서 레이아웃 영향 0)
 *
 * 사용:
 *   <BoingPressable onPress={handle} style={s.btn} haptic="light">
 *     <Text>...</Text>
 *   </BoingPressable>
 */
import React from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = 'light' | 'soft' | 'medium' | 'none';

export type BoingPressableProps = Omit<PressableProps, 'style'> & {
  haptic?: HapticKind;
  scaleMin?: number;     // 0~1, 누를 때 줄어드는 비율 (default 0.94)
  style?: PressableProps['style'];
  children?: React.ReactNode;
};

export function BoingPressable({
  haptic = 'light',
  scaleMin = 0.94,
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...rest
}: BoingPressableProps) {
  const scale = useSharedValue(1);

  // useAnimatedStyle 의 callback 은 worklet 으로 실행돼서 .value 접근이 render 가 아님.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fire = () => {
    if (haptic === 'none') return;
    const kind =
      haptic === 'soft' ? Haptics.ImpactFeedbackStyle.Soft :
      haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(kind).catch(() => {});
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(scaleMin, { duration: 80 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    // 살짝 통통 — damping 낮을수록 더 출렁임
    scale.value = withSpring(1, {
      damping: 7,
      stiffness: 260,
      mass: 0.7,
      overshootClamping: false,
    });
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    fire();
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[style as any, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
