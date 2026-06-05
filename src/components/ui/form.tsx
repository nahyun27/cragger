/**
 * 공통 폼 컴포넌트 — 모든 입력 폼의 시각 언어를 통일.
 *
 * 기본 단위:
 *   <FormCard title="..." icon="..." desc?="...">
 *     <FormField label="..." required? error?>
 *       <FormInput value={...} onChangeText={...} placeholder="..." />  // 또는 children
 *     </FormField>
 *   </FormCard>
 *
 * 입력 박스 스타일:
 *   - bg = bg.subtle, radius 12, padding 14h/12v, minHeight 46
 *   - 왼쪽 leadingIcon, 오른쪽 trailingNode 슬롯 (단위·X 버튼 등)
 *
 * 카드 스타일:
 *   - bg = bg.card, radius 16, padding 14, border = subtle hairline
 *   - 상단에 아이콘 박스(28×28) + 타이틀 + 옵션 desc
 *
 * 사용 예 — gym suggest, profile edit, battle new, crew new 등.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useThemeColors, type ThemeColors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;

/* ──────────────────────────────────────────────────────────── */
/* FormCard                                                     */
/* ──────────────────────────────────────────────────────────── */

export type FormCardProps = {
  title: React.ReactNode;
  icon?: IconName;
  desc?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
} & ViewProps;

export function FormCard({ title, icon, desc, trailing, children, style, ...rest }: FormCardProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <View style={[s.card, style]} {...rest}>
      <View style={s.cardHeader}>
        {icon ? (
          <View style={s.cardIconBox}>
            <Feather name={icon} size={14} color={c.brand.primaryDeep} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {typeof title === 'string' ? (
            <Text style={s.cardTitle}>{title}</Text>
          ) : (
            title
          )}
          {desc ? <Text style={s.cardDesc}>{desc}</Text> : null}
        </View>
        {trailing ?? null}
      </View>
      {children}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* FormField                                                    */
/* ──────────────────────────────────────────────────────────── */

export type FormFieldProps = {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  flex?: boolean;
  trailingLabel?: React.ReactNode;   // 라벨 우측 (예: 글자수 카운터, 제보 칩)
  children: React.ReactNode;
};

export function FormField({
  label, required, error, hint, flex, trailingLabel, children,
}: FormFieldProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <View style={[s.field, flex && { flex: 1 }]}>
      {label ? (
        <View style={s.fieldLabelRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            {required ? <Text style={s.fieldRequired}>*</Text> : null}
          </View>
          {trailingLabel}
        </View>
      ) : null}
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* FormInput — text input                                       */
/* ──────────────────────────────────────────────────────────── */

export type FormInputProps = Omit<TextInputProps, 'style'> & {
  leadingIcon?: IconName;
  leadingText?: string;        // 예: '@'
  trailingUnit?: string;       // 예: 'cm', 'kg'
  trailingNode?: React.ReactNode;
  multiline?: boolean;
  inputStyle?: TextInputProps['style'];   // 글자간격 등 inline override
};

export function FormInput({
  leadingIcon, leadingText, trailingUnit, trailingNode, multiline, inputStyle, ...rest
}: FormInputProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <View style={[s.inputBox, multiline && s.inputBoxMultiline]}>
      {leadingIcon ? (
        <Feather name={leadingIcon} size={14} color={c.text.tertiary} />
      ) : null}
      {leadingText ? <Text style={s.inputLeadingText}>{leadingText}</Text> : null}
      <TextInput
        {...rest}
        placeholderTextColor={rest.placeholderTextColor ?? c.text.muted}
        multiline={multiline}
        style={[
          s.inputText,
          { color: c.text.primary },
          multiline && { minHeight: 64, textAlignVertical: 'top' },
          inputStyle,
        ]}
      />
      {trailingUnit ? <Text style={s.inputUnit}>{trailingUnit}</Text> : null}
      {trailingNode}
    </View>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* FormPressable — date picker, dropdown trigger, etc.          */
/* ──────────────────────────────────────────────────────────── */

export type FormPressableProps = {
  onPress: () => void;
  leadingIcon?: IconName;
  placeholder?: string;
  value?: string | null;
  trailingNode?: React.ReactNode;
  disabled?: boolean;
};

export function FormPressable({
  onPress, leadingIcon, placeholder, value, trailingNode, disabled,
}: FormPressableProps) {
  const c = useThemeColors();
  const s = makeStyles(c);
  // Inner-View pattern — function-form Pressable style 가 flex-direction 을
  // iOS 26 dev build 에서 가끔 못 잡아서 아이콘/텍스트가 세로로 깨지는 사례 있음.
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[
            s.inputBox,
            pressed && { opacity: 0.7 },
            disabled && { opacity: 0.5 },
          ]}
        >
          {leadingIcon ? (
            <Feather name={leadingIcon} size={14} color={c.text.tertiary} />
          ) : null}
          <Text
            style={[
              s.inputText,
              { color: value ? c.text.primary : c.text.muted },
            ]}
          >
            {value || placeholder || ''}
          </Text>
          {trailingNode}
        </View>
      )}
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* FormClearBtn — 입력 우측에 두는 X 버튼                       */
/* ──────────────────────────────────────────────────────────── */

export function FormClearBtn({ onPress }: { onPress: () => void }) {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="지우기"
    >
      {({ pressed }) => (
        <View style={[s.clearBtn, pressed && { opacity: 0.6 }]}>
          <Feather name="x" size={14} color={c.text.tertiary} />
        </View>
      )}
    </Pressable>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* styles                                                       */
/* ──────────────────────────────────────────────────────────── */

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.bg.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
      padding: 14,
      gap: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardIconBox: {
      width: 28, height: 28, borderRadius: 9,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 13.5, fontWeight: '900',
      color: c.text.primary, letterSpacing: -0.2,
    },
    cardDesc: {
      fontSize: 11, color: c.text.tertiary, fontWeight: '600', marginTop: 1,
    },

    field: { gap: 6 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fieldLabel: {
      fontSize: 11.5, fontWeight: '900', color: c.text.tertiary, letterSpacing: 0.2,
    },
    fieldRequired: { color: c.status.danger, fontSize: 11 },
    fieldError: { color: c.status.danger, fontSize: 11.5, fontWeight: '600' },
    fieldHint: { color: c.text.tertiary, fontSize: 11, fontWeight: '600' },

    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.bg.subtle,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 46,
    },
    inputBoxMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
    inputText: { flex: 1, fontSize: 14.5, fontWeight: '600' },
    inputLeadingText: { fontSize: 15, fontWeight: '700', color: c.text.tertiary },
    inputUnit: { fontSize: 12, color: c.text.tertiary, fontWeight: '800' },

    clearBtn: {
      width: 46, height: 46, borderRadius: 12,
      backgroundColor: c.bg.subtle,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
