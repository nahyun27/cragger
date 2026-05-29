import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  AlertButton,
  AlertOptions,
} from 'react-native';
import { useThemeColors } from '@/lib/theme';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

let setAlertStateGlobal: React.Dispatch<React.SetStateAction<AlertState>> | null = null;

export function customAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  if (setAlertStateGlobal) {
    setAlertStateGlobal({ visible: true, title, message, buttons, options });
  } else {
    console.warn('CustomAlert is not mounted.');
  }
}

export function CustomAlert() {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
  });

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAlertStateGlobal = setState;
    return () => {
      setAlertStateGlobal = null;
    };
  }, []);

  useEffect(() => {
    if (state.visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 160,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state.visible, scale, opacity]);

  const closeAlert = () => setState((prev) => ({ ...prev, visible: false }));

  const handleDismiss = () => {
    if (state.options?.cancelable !== false) {
      closeAlert();
      state.options?.onDismiss?.();
    }
  };

  const handleButtonPress = (btn: AlertButton) => {
    closeAlert();
    btn.onPress?.();
  };

  if (!state.visible) return null;

  const buttons = state.buttons?.length
    ? state.buttons
    : [{ text: '확인', style: 'default' as const }];

  const stackButtons = buttons.length > 2;

  // 제목 앞 이모지 → 아이콘 자리로 추출
  const emojiMatch = state.title.match(
    /^([\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}])\s*/u,
  );
  const headerEmoji = emojiMatch?.[1];
  const titleText = headerEmoji ? state.title.replace(emojiMatch![0], '').trim() : state.title;

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[s.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        <Animated.View style={[s.alertBox, { transform: [{ scale }] }]}>
          {headerEmoji ? (
            <View style={s.iconWrap}>
              <View style={s.iconCircle}>
                <Text style={s.iconText}>{headerEmoji}</Text>
              </View>
            </View>
          ) : (
            <View style={s.accentBar} />
          )}

          <View style={s.content}>
            <Text style={s.title}>{titleText}</Text>
            {!!state.message && <Text style={s.message}>{state.message}</Text>}
          </View>

          <View style={[s.buttonRow, stackButtons && s.buttonRowStacked]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;

              // 마지막(또는 단일) primary/destructive 버튼 → filled
              const isLast = idx === buttons.length - 1;
              const isFilled = !stackButtons && isLast && (isPrimary || isDestructive);

              return (
                <AlertButtonView
                  key={idx}
                  styles={s}
                  label={btn.text || 'OK'}
                  variant={
                    isFilled
                      ? isDestructive
                        ? 'filledDanger'
                        : 'filled'
                      : isDestructive
                        ? 'ghostDanger'
                        : isCancel
                          ? 'ghostCancel'
                          : 'ghost'
                  }
                  stacked={stackButtons}
                  onPress={() => handleButtonPress(btn)}
                />
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

type ButtonVariant = 'filled' | 'filledDanger' | 'ghost' | 'ghostCancel' | 'ghostDanger';

function AlertButtonView({
  styles: s,
  label,
  variant,
  stacked,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  variant: ButtonVariant;
  stacked: boolean;
  onPress: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const isFilled = variant === 'filled' || variant === 'filledDanger';

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 280,
      friction: 18,
    }).start();
  };

  const bgStyle =
    variant === 'filled'
      ? s.btnFilled
      : variant === 'filledDanger'
        ? s.btnFilledDanger
        : s.btnGhost;

  const textStyle =
    variant === 'filled' || variant === 'filledDanger'
      ? s.btnTextFilled
      : variant === 'ghostDanger'
        ? s.btnTextDestructive
        : variant === 'ghostCancel'
          ? s.btnTextCancel
          : s.btnTextPrimary;

  return (
    <Animated.View style={[s.btnWrap, stacked && s.btnWrapStacked, { transform: [{ scale: pressScale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[s.btn, bgStyle, isFilled && s.btnFilledShadow]}
      >
        <Text style={[s.btnText, textStyle]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(8, 15, 30, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 28,
    },
    alertBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.bg.card,
      borderRadius: 28,
      paddingTop: 0,
      paddingHorizontal: 22,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.32,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 16 },
      elevation: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      overflow: 'hidden',
    },
    accentBar: {
      height: 4,
      backgroundColor: c.brand.primary,
      marginHorizontal: -22,
      marginBottom: 24,
    },
    iconWrap: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 4,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.brand.primary,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    iconText: {
      fontSize: 34,
    },
    content: {
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text.primary,
      textAlign: 'center',
      letterSpacing: -0.4,
      lineHeight: 24,
    },
    message: {
      fontSize: 14.5,
      color: c.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    buttonRowStacked: {
      flexDirection: 'column',
      gap: 8,
    },
    btnWrap: {
      flex: 1,
    },
    btnWrapStacked: {
      width: '100%',
    },
    btn: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    btnFilled: {
      backgroundColor: c.brand.primary,
    },
    btnFilledDanger: {
      backgroundColor: c.status.danger,
    },
    btnFilledShadow: {
      shadowColor: c.brand.primary,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    btnGhost: {
      backgroundColor: c.bg.subtle,
    },
    btnText: {
      fontSize: 15.5,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    btnTextFilled: {
      color: c.brand.onPrimary,
    },
    btnTextPrimary: {
      color: c.brand.primary,
    },
    btnTextCancel: {
      color: c.text.secondary,
      fontWeight: '600',
    },
    btnTextDestructive: {
      color: c.status.danger,
    },
  });
}
