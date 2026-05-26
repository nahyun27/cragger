import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  bg: string;
  fg: string;
  border: string;
}[] = [
  { value: 'onsight',  label: '온사이트',   bg: '#ecfeff', fg: '#0e7490', border: '#a5f3fc' },
  { value: 'flash',    label: '플래시',     bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' },
  { value: 'redpoint', label: '레드포인트', bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa' },
  { value: 'fall',     label: '폴',         bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
];

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
  const [mainGrade, setMainGrade] = useState<string | null>(null);
  const [subGrade, setSubGrade] = useState<string | null>(null);
  const [result, setResult] = useState<LeadResult | null>(null);

  const needsSub = mainGrade != null && gradeNeedsSub(mainGrade);
  const canAdd =
    mainGrade != null &&
    result != null &&
    (!needsSub || subGrade != null);

  function handleAdd() {
    if (!canAdd || !mainGrade || !result) return;
    const grade = fullGrade(mainGrade, subGrade);
    const next: LeadRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      grade,
      result,
    };
    onChange([...value, next]);
    // 다음 입력 위해 result 만 reset (등급은 같은 등급 연속 입력 편의)
    setResult(null);
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
                    borderColor: active ? '#06b6d4' : '#e2e8f0',
                    backgroundColor: active ? '#06b6d4' : '#ffffff',
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
                      color: active ? '#ffffff' : '#475569',
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
                      borderColor: active ? '#06b6d4' : '#e2e8f0',
                      backgroundColor: active ? '#06b6d4' : '#ffffff',
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
                        color: active ? '#ffffff' : '#475569',
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

      {/* 결과 4개 — 카드형 강조 */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
        완등 방식
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {RESULT_OPTIONS.map((opt) => {
          const active = result === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setResult(opt.value)}
              style={{ flex: 1 }}
            >
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? opt.border : '#e2e8f0',
                    backgroundColor: active ? opt.bg : '#ffffff',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: active ? opt.fg : '#64748b',
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

      {/* 추가 버튼 */}
      <Pressable
        onPress={handleAdd}
        disabled={!canAdd}
        style={({ pressed }) => ({
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: canAdd ? '#06b6d4' : '#e2e8f0',
          opacity: pressed && canAdd ? 0.85 : 1,
        })}
      >
        <Feather name="plus" size={14} color={canAdd ? '#ffffff' : '#94a3b8'} />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: canAdd ? '#ffffff' : '#94a3b8',
          }}
        >
          루트 추가
        </Text>
      </Pressable>

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
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#0f172a',
                    minWidth: 56,
                  }}
                >
                  {r.grade}
                </Text>
                {opt && (
                  <View
                    style={{
                      backgroundColor: opt.bg,
                      borderWidth: 1,
                      borderColor: opt.border,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: opt.fg,
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
