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

  return (
    <View style={{ gap: 12 }}>
      {/* 메인 등급 */}
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
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? '#06b6d4' : '#e2e8f0',
                backgroundColor: active ? '#ecfeff' : '#ffffff',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: active ? '#0e7490' : '#475569',
                }}
              >
                {g}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 하위 등급 (a/b/c/d) — 5.10 이상일 때만 */}
      {needsSub && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SUB_GRADES.map((sub) => {
            const active = subGrade === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setSubGrade(sub)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? '#06b6d4' : '#e2e8f0',
                  backgroundColor: active ? '#ecfeff' : '#ffffff',
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: active ? '#0e7490' : '#475569',
                  }}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 결과 4개 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {RESULT_OPTIONS.map((opt) => {
          const active = result === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setResult(opt.value)}
              style={({ pressed }) => ({
                flexGrow: 1,
                minWidth: '22%',
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? opt.border : '#e2e8f0',
                backgroundColor: active ? opt.bg : '#ffffff',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: active ? opt.fg : '#64748b',
                }}
              >
                {opt.label}
              </Text>
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
