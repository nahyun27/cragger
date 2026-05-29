import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
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

// Singleton to manage alert state from outside React tree
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
    // Fallback if component is not mounted
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

  useEffect(() => {
    setAlertStateGlobal = setState;
    return () => {
      setAlertStateGlobal = null;
    };
  }, []);

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

  // Default button if none provided
  const buttons = state.buttons?.length
    ? state.buttons
    : [{ text: '확인', style: 'default' as const }];

  // Max 2 buttons side-by-side, otherwise stack them
  const stackButtons = buttons.length > 2;

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={s.overlay} onPress={handleDismiss}>
        <Pressable
          style={s.alertBox}
          onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <View style={s.content}>
            <Text style={s.title}>{state.title}</Text>
            {!!state.message && <Text style={s.message}>{state.message}</Text>}
          </View>
          <View style={[s.buttonContainer, stackButtons && s.buttonContainerStacked]}>
            {buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleButtonPress(btn)}
                  style={({ pressed }) => [
                    s.button,
                    stackButtons && s.buttonStacked,
                    !stackButtons && idx > 0 && s.buttonBorderLeft,
                    stackButtons && idx > 0 && s.buttonBorderTop,
                    pressed && s.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      s.buttonText,
                      isCancel && s.buttonTextCancel,
                      isDestructive && s.buttonTextDestructive,
                    ]}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)', // Slightly dark slate
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    alertBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.bg.card,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: c.shadow.color,
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    content: {
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text.primary,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    message: {
      fontSize: 14,
      color: c.text.secondary,
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: c.border.subtle,
    },
    buttonContainerStacked: {
      flexDirection: 'column',
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonStacked: {
      width: '100%',
    },
    buttonBorderLeft: {
      borderLeftWidth: 1,
      borderLeftColor: c.border.subtle,
    },
    buttonBorderTop: {
      borderTopWidth: 1,
      borderTopColor: c.border.subtle,
    },
    buttonPressed: {
      backgroundColor: c.bg.subtle,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.brand.primary,
    },
    buttonTextCancel: {
      fontWeight: '600',
      color: c.text.muted,
    },
    buttonTextDestructive: {
      color: c.status.danger,
    },
  });
}
