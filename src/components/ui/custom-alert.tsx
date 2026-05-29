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

  // Animation
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAlertStateGlobal = setState;
    return () => {
      setAlertStateGlobal = null;
    };
  }, []);

  useEffect(() => {
    if (state.visible) {
      scale.setValue(0.88);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 180,
          friction: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
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

  // 단일 / 듀얼은 가로, 3개 이상은 세로
  const stackButtons = buttons.length > 2;

  // 제목 첫 글자가 이모지면 분리해서 큰 아이콘으로 표시
  const emojiMatch = state.title.match(
    /^([\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}])\s*/u,
  );
  const headerEmoji = emojiMatch?.[1];
  const titleText = headerEmoji ? state.title.replace(emojiMatch![0], '') : state.title;

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
          {headerEmoji && (
            <View style={s.iconCircle}>
              <Text style={s.iconText}>{headerEmoji}</Text>
            </View>
          )}
          <View style={s.content}>
            <Text style={s.title}>{titleText}</Text>
            {!!state.message && <Text style={s.message}>{state.message}</Text>}
          </View>
          <View style={[s.buttonContainer, stackButtons && s.buttonContainerStacked]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;
              // 듀얼 버튼이면 마지막 버튼이 primary, 단일이면 그 자체가 primary
              const isFilled =
                !stackButtons &&
                ((buttons.length === 1 && isPrimary) ||
                  (buttons.length === 2 && idx === buttons.length - 1 && isPrimary) ||
                  isDestructive);

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleButtonPress(btn)}
                  style={({ pressed }) => [
                    s.button,
                    stackButtons && s.buttonStacked,
                    isFilled && (isDestructive ? s.buttonFilledDanger : s.buttonFilled),
                    !isFilled && s.buttonGhost,
                    !stackButtons && idx > 0 && !isFilled && s.buttonGap,
                    pressed && (isFilled ? s.buttonFilledPressed : s.buttonGhostPressed),
                  ]}
                >
                  <Text
                    style={[
                      s.buttonText,
                      isFilled && s.buttonTextFilled,
                      !isFilled && isCancel && s.buttonTextCancel,
                      !isFilled && isDestructive && s.buttonTextDestructive,
                      !isFilled && isPrimary && s.buttonTextPrimary,
                    ]}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 28,
    },
    alertBox: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: c.bg.card,
      borderRadius: 24,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
      alignItems: 'stretch',
    },
    iconCircle: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.bg.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    iconText: {
      fontSize: 30,
    },
    content: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: c.text.primary,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    message: {
      fontSize: 14,
      color: c.text.secondary,
      textAlign: 'center',
      lineHeight: 21,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    buttonContainerStacked: {
      flexDirection: 'column',
      gap: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonStacked: {
      width: '100%',
    },
    buttonGap: {},
    buttonFilled: {
      backgroundColor: c.brand.primary,
    },
    buttonFilledDanger: {
      backgroundColor: c.status.danger,
    },
    buttonGhost: {
      backgroundColor: c.bg.subtle,
    },
    buttonFilledPressed: {
      opacity: 0.85,
    },
    buttonGhostPressed: {
      backgroundColor: c.border.subtle,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    buttonTextFilled: {
      color: '#ffffff',
    },
    buttonTextPrimary: {
      color: c.brand.primary,
    },
    buttonTextCancel: {
      color: c.text.secondary,
      fontWeight: '600',
    },
    buttonTextDestructive: {
      color: c.status.danger,
    },
  });
}
