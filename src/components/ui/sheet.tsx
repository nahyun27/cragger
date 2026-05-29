/**
 * 통합 Sheet 컴포넌트 — 3 variants.
 *
 *   <Sheet variant="bottom" visible onClose title="설정">    bottom sheet
 *   <Sheet variant="center" visible onClose title="확인">    centered card
 *   <Sheet variant="full" visible onClose title="크루장 위임"> full page slide
 *
 * 모든 variant 가 useThemeColors 로 다크/라이트 자동 적용.
 * 헤더(title + close) + scroll body + 선택적 footer.
 */
import { Feather } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

export type SheetVariant = 'bottom' | 'center' | 'full';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  variant?: SheetVariant;
  title?: string;
  subtitle?: string;
  /** 우상단 close 버튼 숨기기 (드래그 핸들로 닫는 케이스 등) */
  hideCloseButton?: boolean;
  /** 백드롭 탭으로 닫기 비활성화 (form 진행 중 보호) */
  disableBackdropClose?: boolean;
  /** sticky 푸터 (예: Save / Cancel 버튼) */
  footer?: ReactNode;
  /** 본문 ScrollView 끄기. 본인이 FlatList 등 쓸 때 */
  noScroll?: boolean;
  /** ScrollView contentContainer 추가 스타일 */
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Sheet({
  visible,
  onClose,
  variant = 'bottom',
  title,
  subtitle,
  hideCloseButton,
  disableBackdropClose,
  footer,
  noScroll,
  contentStyle,
  children,
}: SheetProps) {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const animationType = variant === 'center' ? 'fade' : 'slide';
  const transparent = variant !== 'full';

  if (variant === 'full') {
    return (
      <Modal
        visible={visible}
        animationType={animationType}
        onRequestClose={onClose}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={s.fullContainer} edges={['top']}>
          {(title || !hideCloseButton) && (
            <SheetHeader
              title={title}
              subtitle={subtitle}
              onClose={onClose}
              hideClose={hideCloseButton}
              c={c}
              s={s}
            />
          )}
          {noScroll ? (
            <View style={[s.body, contentStyle]}>{children}</View>
          ) : (
            <ScrollView
              contentContainerStyle={[s.bodyScroll, contentStyle]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          )}
          {footer && <View style={s.footer}>{footer}</View>}
        </SafeAreaView>
      </Modal>
    );
  }

  // bottom / center
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View
        style={[
          s.backdrop,
          variant === 'bottom' ? s.backdropBottom : s.backdropCenter,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={disableBackdropClose ? undefined : onClose}
        />
        <View
          style={[
            variant === 'bottom' ? s.bottomSheet : s.centerCard,
            // center variant 은 padding 으로 너비 보장
          ]}
        >
          {variant === 'bottom' && <View style={s.dragHandle} />}
          {(title || !hideCloseButton) && (
            <SheetHeader
              title={title}
              subtitle={subtitle}
              onClose={onClose}
              hideClose={hideCloseButton}
              c={c}
              s={s}
            />
          )}
          {noScroll ? (
            <View style={[s.body, contentStyle]}>{children}</View>
          ) : (
            <ScrollView
              contentContainerStyle={[s.bodyScroll, contentStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )}
          {footer && <View style={s.footer}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
  hideClose,
  c,
  s,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  hideClose?: boolean;
  c: ThemeColors;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.header}>
      <View style={s.headerTextCol}>
        {title && <Text style={s.title}>{title}</Text>}
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {!hideClose && (
        <Pressable onPress={onClose} hitSlop={10}>
          {({ pressed }) => (
            <View style={[s.closeBtn, pressed && { opacity: 0.6 }]}>
              <Feather name="x" size={20} color={c.text.primary} />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    // ── Backdrop ─────────────────────────────────────────────
    backdrop: {
      flex: 1,
      backgroundColor: c.bg.overlay,
    },
    backdropBottom: {
      justifyContent: 'flex-end',
    },
    backdropCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },

    // ── Bottom sheet ────────────────────────────────────────
    bottomSheet: {
      backgroundColor: c.bg.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 32,
      maxHeight: '90%',
      shadowColor: c.shadow.color,
      shadowOpacity: 0.2,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -8 },
      elevation: 16,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border.strong,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },

    // ── Center card ─────────────────────────────────────────
    centerCard: {
      backgroundColor: c.bg.card,
      borderRadius: 20,
      width: '100%',
      maxWidth: 420,
      maxHeight: '85%',
      shadowColor: c.shadow.color,
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
      overflow: 'hidden',
    },

    // ── Full screen ─────────────────────────────────────────
    fullContainer: {
      flex: 1,
      backgroundColor: c.bg.primary,
    },

    // ── Header ──────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.subtle,
    },
    headerTextCol: {
      flex: 1,
      paddingRight: 12,
      gap: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text.primary,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: c.text.tertiary,
      lineHeight: 17,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.subtle,
    },

    // ── Body ────────────────────────────────────────────────
    body: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    bodyScroll: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },

    // ── Footer ──────────────────────────────────────────────
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.subtle,
      backgroundColor: c.bg.card,
    },
  });
}
