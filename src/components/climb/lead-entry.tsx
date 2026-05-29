import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEffectiveScheme, useThemeColors } from '@/lib/theme';

export type LeadResult = 'onsight' | 'flash' | 'redpoint' | 'fall';

export type LeadRoute = {
  id: string;
  grade: string;          // '5.10a', '5.11b', '5.8' 등
  result: LeadResult;
};

// 메인 등급 (큰 단계). 5.10 이상이면 a/b/c/d sub 필요.
const MAIN_GRADES = [
  '5.6', '5.7', '5.8', '5.9',
  '5.10', '5.11', '5.12', '5.13', '5.14', '5.15',
];
const SUB_GRADES = ['a', 'b', 'c', 'd'];

const RESULT_OPTIONS: {
  value: LeadResult;
  label: string;
}[] = [
  { value: 'onsight',  label: '온사이트' },
  { value: 'flash',    label: '플래시' },
  { value: 'redpoint', label: '레드포인트' },
  { value: 'fall',     label: '폴' },
];

const RESULT_STYLES: Record<LeadResult, { light: any; dark: any }> = {
  onsight: {
    light: { bg: '#ecfeff', fg: '#0e7490', border: '#a5f3fc' },
    dark: { bg: 'rgba(14,116,144,0.15)', fg: '#22d3ee', border: '#0891b2' },
  },
  flash: {
    light: { bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' },
    dark: { bg: 'rgba(21,128,61,0.15)', fg: '#4ade80', border: '#16a34a' },
  },
  redpoint: {
    light: { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa' },
    dark: { bg: 'rgba(194,65,12,0.15)', fg: '#fb923c', border: '#ea580c' },
  },
  fall: {
    light: { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
    dark: { bg: 'rgba(185,28,28,0.15)', fg: '#f87171', border: '#dc2626' },
  },
};

const RESULT_LABEL: Record<LeadResult, string> = {
  onsight: '온사이트',
  flash: '플래시',
  redpoint: '레드포인트',
  fall: '폴',
};

function gradeNeedsSub(main: string): boolean {
  const n = parseInt(main.split('.')[1], 10);
  return n >= 10;
}

function fullGrade(main: string, sub: string | null): string {
  return gradeNeedsSub(main) && sub ? `${main}${sub}` : main;
}

type Props = {
  value: LeadRoute[];
  onChange: (next: LeadRoute[]) => void;
};

export function LeadEntry({ value, onChange }: Props) {
  const c = useThemeColors();
  const scheme = useEffectiveScheme();

  const [mainGrade, setMainGrade] = useState<string | null>(null);
  const [subGrade, setSubGrade] = useState<string | null>(null);

  const needsSub = mainGrade != null && gradeNeedsSub(mainGrade);
  const canAdd = mainGrade != null && (!needsSub || subGrade != null);

  // 결과 누르면 즉시 추가. 추가 후 등급/sub 모두 해제 — 다음 루트는 처음부터.
  function handlePickResult(result: LeadResult) {
    if (!canAdd || !mainGrade) return;
    const grade = fullGrade(mainGrade, subGrade);
    const next: LeadRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      grade,
      result,
    };
    onChange([...value, next]);
    setMainGrade(null);
    setSubGrade(null);
  }

  function handleRemove(id: string) {
    onChange(value.filter((r) => r.id !== id));
  }

  // 메인 등급 그리드 (5열) — 큰 카드형
  return (
    <View style={{ gap: 14 }}>
      {/* 라벨 */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>
        등급
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {MAIN_GRADES.map((g) => {
          const active = mainGrade === g;
          return (
            <Pressable
              key={g}
              onPress={() => {
                setMainGrade(g);
                if (!gradeNeedsSub(g)) setSubGrade(null);
              }}
              style={{ width: '18.4%' }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? '#06b6d4' : c.border.subtle,
                    backgroundColor: active ? '#06b6d4' : c.bg.primary,
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                    ...(active && {
                      shadowColor: '#06b6d4',
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: active ? '#ffffff' : c.text.secondary,
                      letterSpacing: -0.3,
                    }}
                  >
                    {g}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* 하위 등급 (a/b/c/d) — 5.10 이상일 때만 */}
      {needsSub && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SUB_GRADES.map((sub) => {
            const active = subGrade === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setSubGrade(sub)}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      paddingVertical: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? '#06b6d4' : c.border.subtle,
                      backgroundColor: active ? '#06b6d4' : c.bg.primary,
                      alignItems: 'center',
                      opacity: pressed ? 0.8 : 1,
                      ...(active && {
                        shadowColor: '#06b6d4',
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '900',
                        color: active ? '#ffffff' : c.text.secondary,
                      }}
                    >
                      {sub}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 결과 4개 — 누르면 즉시 추가 (별도 "추가" 버튼 없음) */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
        완등 방식 (눌러서 추가)
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {RESULT_OPTIONS.map((opt) => {
          const s = RESULT_STYLES[opt.value][scheme];
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePickResult(opt.value)}
              disabled={!canAdd}
              style={{ flex: 1 }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: 14,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: s.border,
                    backgroundColor: s.bg,
                    alignItems: 'center',
                    opacity: !canAdd ? 0.4 : pressed ? 0.8 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: s.fg,
                      letterSpacing: -0.2,
                    }}
                  >
                    {opt.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {!canAdd && (
        <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          {mainGrade == null ? '등급을 선택하세요' : 'a/b/c/d 를 선택하세요'}
        </Text>
      )}

      {/* 누적 리스트 */}
      {value.length > 0 && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
            등록된 루트 {value.length}개
          </Text>
          {value.map((r) => {
            const opt = RESULT_OPTIONS.find((o) => o.value === r.result);
            return (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: c.bg.primary,
                  borderWidth: 1,
                  borderColor: c.border.subtle,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: c.text.primary,
                    minWidth: 56,
                  }}
                >
                  {r.grade}
                </Text>
                {opt && (
                  <View
                    style={{
                      backgroundColor: RESULT_STYLES[r.result][scheme].bg,
                      borderWidth: 1,
                      borderColor: RESULT_STYLES[r.result][scheme].border,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: RESULT_STYLES[r.result][scheme].fg,
                      }}
                    >
                      {RESULT_LABEL[r.result]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => handleRemove(r.id)}
                  hitSlop={6}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Feather name="x" size={16} color="#94a3b8" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
