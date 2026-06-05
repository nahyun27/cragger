import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Sheet } from '@/components/ui/sheet';
import { resolveColorHex, resolveColorLabel } from '@/constants/climb-colors';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

// VB(입문) + V0 ~ V11. - / 기본 / + 는 modifier 옵션 토글.
const BASE_GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11'] as const;
type BaseGrade = (typeof BASE_GRADES)[number];
type Modifier = '-' | '' | '+';

const MODIFIER_OPTIONS: { key: Modifier; label: string; desc: string }[] = [
  { key: '-', label: '−', desc: '약간 쉬움' },
  { key: '',  label: '기본', desc: '체감 정확' },
  { key: '+', label: '+', desc: '약간 어려움' },
];

const SHOW_AVG_THRESHOLD = 10;

type Props = {
  visible: boolean;
  color: string;
  currentVote: string | null;
  avgLabel: string | null;
  voteCount: number;
  isSubmitting: boolean;
  onSubmit: (grade: string) => Promise<void>;
  onClose: () => void;
};

function parseGrade(g: string | null): { base: BaseGrade | null; mod: Modifier } {
  if (!g) return { base: null, mod: '' };
  let mod: Modifier = '';
  let core = g;
  if (g.endsWith('+')) { mod = '+'; core = g.slice(0, -1); }
  else if (g.endsWith('-')) { mod = '-'; core = g.slice(0, -1); }
  const base = core as BaseGrade;
  if (!BASE_GRADES.includes(base)) return { base: null, mod: '' };
  return { base, mod };
}

export function GradePickerModal({
  visible,
  color,
  currentVote,
  avgLabel,
  voteCount,
  isSubmitting,
  onSubmit,
  onClose,
}: Props) {
  const c = useThemeColors();
  const s = React.useMemo(() => makeStyles(c), [c]);

  const [base, setBase] = useState<BaseGrade | null>(null);
  const [mod, setMod] = useState<Modifier>('');

  useEffect(() => {
    if (!visible) return;
    const p = parseGrade(currentVote);
    setBase(p.base);
    setMod(p.mod);
  }, [visible, currentVote]);

  const hex = resolveColorHex(color);
  const label = resolveColorLabel(color);
  const needsBorder = ['white', 'yellow', 'lime'].includes(color.toLowerCase());
  const showAvg = voteCount >= SHOW_AVG_THRESHOLD && avgLabel;
  const selectedGrade = base ? `${base}${mod}` : null;
  const canSubmit = !!selectedGrade && !isSubmitting;
  const selectedIndex = base ? BASE_GRADES.indexOf(base) : -1;

  async function handleSubmit() {
    if (!canSubmit || !selectedGrade) return;
    await onSubmit(selectedGrade);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="bottom"
      title={`${label} 난이도 투표`}
      footer={
        <Pressable onPress={handleSubmit} disabled={!canSubmit}>
          {({ pressed }) => (
            <View
              style={[
                s.submitBtn,
                !canSubmit && s.submitBtnDisabled,
                pressed && canSubmit && { opacity: 0.9 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={c.brand.onPrimary} />
              ) : (
                <>
                  <Feather
                    name="check"
                    size={16}
                    color={canSubmit ? c.brand.onPrimary : c.text.muted}
                  />
                  <Text
                    style={[
                      s.submitBtnText,
                      { color: canSubmit ? c.brand.onPrimary : c.text.muted },
                    ]}
                  >
                    {selectedGrade ? `${selectedGrade} 로 투표하기` : '난이도를 선택해주세요'}
                  </Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      }
    >
      <View style={s.container}>
        {/* Color hero — 색깔 + 라벨 + 통계 한 줄 */}
        <View style={s.heroRow}>
          <View
            style={[
              s.colorCircle,
              { backgroundColor: hex },
              needsBorder ? { borderWidth: 1, borderColor: '#D4D4D8' } : null,
            ]}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.colorLabel}>{label}</Text>
            {showAvg ? (
              <View style={s.avgPill}>
                <Feather name="bar-chart-2" size={10} color={c.brand.primaryDeep} />
                <Text style={s.avgPillText}>
                  평균 <Text style={{ fontWeight: '900' }}>{avgLabel}</Text> · {voteCount}표
                </Text>
              </View>
            ) : (
              <View style={s.statusPill}>
                <Feather name="users" size={10} color={c.text.tertiary} />
                <Text style={s.statusPillText}>
                  데이터 모으는 중 · {voteCount}표
                </Text>
              </View>
            )}
          </View>
          {/* 선택된 그레이드 미리보기 (큰 숫자) */}
          <View style={s.previewBox}>
            <Text
              style={[s.previewValue, !selectedGrade && { color: c.text.muted, fontSize: 16 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {selectedGrade ?? '?'}
            </Text>
          </View>
        </View>

        {/* Slider — V0 ~ V11 */}
        <View style={s.section}>
          <View style={s.fieldHeader}>
            <Feather name="target" size={12} color={c.text.secondary} />
            <Text style={s.fieldLabel}>내 체감 V그레이드</Text>
          </View>
          <View style={s.sliderTrack}>
            <View style={s.trackLine} />
            {selectedIndex >= 0 && (
              <View
                style={[
                  s.trackLineActive,
                  { width: `${(selectedIndex / (BASE_GRADES.length - 1)) * 100}%` },
                ]}
              />
            )}
            <View style={s.tickRow}>
              {BASE_GRADES.map((g) => {
                const active = base === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setBase(g)}
                    disabled={isSubmitting}
                    hitSlop={8}
                    style={s.tickCol}
                  >
                    <View style={[s.tickDot, active && s.tickDotActive]}>
                      {active && <View style={s.tickDotInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={s.tickLabelRow}>
            {BASE_GRADES.map((g) => {
              const active = base === g;
              const isEdge = g === 'VB' || g === 'V11';
              return (
                <View key={g} style={s.tickLabelCol}>
                  <Text
                    style={[
                      s.tickLabel,
                      active && s.tickLabelActive,
                      !active && !isEdge && { opacity: 0 },
                    ]}
                    numberOfLines={1}
                  >
                    {g}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Modifier segmented */}
        <View style={s.section}>
          <View style={s.fieldHeader}>
            <Feather name="sliders" size={12} color={c.text.secondary} />
            <Text style={s.fieldLabel}>미세 조정</Text>
          </View>
          <View style={s.segGroup}>
            {MODIFIER_OPTIONS.map((opt) => {
              const active = mod === opt.key;
              return (
                <Pressable
                  key={opt.key || 'base'}
                  onPress={() => setMod(opt.key)}
                  disabled={isSubmitting || !base}
                  style={s.segOptWrap}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        s.segOpt,
                        active && s.segOptActive,
                        !base && { opacity: 0.5 },
                        pressed && base && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[s.segLabel, active && s.segLabelActive]}>{opt.label}</Text>
                      <Text style={[s.segDesc, active && s.segDescActive]}>{opt.desc}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Don't know */}
        <Pressable onPress={onClose} hitSlop={6} style={s.skipBtn}>
          <Feather name="help-circle" size={13} color={c.text.tertiary} />
          <Text style={s.skipText}>잘 모르겠어요</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: 18, paddingBottom: 4 },

    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.bg.subtle,
    },
    colorCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    colorLabel: {
      fontSize: 16,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.3,
    },
    avgPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.brand.primaryLight,
    },
    avgPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.brand.primaryDeep,
    },
    statusPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.bg.card,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.text.tertiary,
    },

    previewBox: {
      minWidth: 64,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewValue: {
      fontSize: 22,
      fontWeight: '900',
      color: c.brand.primaryDeep,
      letterSpacing: -0.5,
    },

    section: { gap: 10 },

    sliderTrack: {
      height: 28,
      justifyContent: 'center',
      position: 'relative',
    },
    trackLine: {
      position: 'absolute',
      left: 10,
      right: 10,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.bg.subtle,
    },
    trackLineActive: {
      position: 'absolute',
      left: 10,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.brand.primary,
    },
    tickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    tickCol: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 28,
      width: 24,
    },
    tickDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.bg.card,
      borderWidth: 2,
      borderColor: c.border.strong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tickDotActive: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderColor: c.brand.primary,
      borderWidth: 3,
    },
    tickDotInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.brand.primary,
    },
    tickLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -2,
    },
    tickLabelCol: {
      width: 24,
      alignItems: 'center',
    },
    tickLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.text.muted,
    },
    tickLabelActive: {
      color: c.brand.primaryDeep,
      fontSize: 11,
      fontWeight: '900',
    },

    fieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.text.secondary,
      letterSpacing: -0.1,
    },

    segGroup: {
      flexDirection: 'row',
      gap: 8,
      alignSelf: 'stretch',
    },
    segOptWrap: {
      flex: 1,
    },
    segOpt: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      gap: 2,
      backgroundColor: c.bg.card,
      borderWidth: 1.5,
      borderColor: c.border.subtle,
    },
    segOptActive: {
      backgroundColor: c.brand.primaryLight,
      borderColor: c.brand.primary,
    },
    segLabel: {
      fontSize: 16,
      fontWeight: '900',
      color: c.text.primary,
      letterSpacing: -0.3,
    },
    segLabelActive: {
      color: c.brand.primaryDeep,
    },
    segDesc: {
      fontSize: 10.5,
      fontWeight: '700',
      color: c.text.tertiary,
    },
    segDescActive: {
      color: c.brand.primaryDeep,
    },

    skipBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 4,
    },
    skipText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.text.tertiary,
      textDecorationLine: 'underline',
    },

    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 15,
      borderRadius: 14,
      backgroundColor: c.brand.primary,
    },
    submitBtnDisabled: {
      backgroundColor: c.bg.subtle,
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
  });
}
