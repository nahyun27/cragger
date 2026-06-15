/**
 * 보드 세션 입력 — 보드 종류 + 문제 세트들.
 * 한 세트 = (문제 이름, V 그레이드, 플래시 여부).
 * 저장 시 attempts 여러 row 로 풀어짐 (climbing_type='board').
 */
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useThemeColors } from '@/lib/theme';

export type BoardType = 'moonboard' | 'kilter' | 'tension';

export type BoardProblemEntry = {
  id: string;            // UI key 용
  name: string;
  vGrade: string;        // 'V0' ~ 'V9'
  flash: boolean;
};

const BOARD_OPTIONS: { value: BoardType; label: string }[] = [
  { value: 'moonboard', label: '문보드' },
  { value: 'kilter',    label: '킬터' },
  { value: 'tension',   label: '텐션' },
];

const V_GRADES = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9'];

let idCounter = 0;
function newRowId(): string {
  idCounter += 1;
  return `b${Date.now()}_${idCounter}`;
}

export function makeEmptyBoardProblem(): BoardProblemEntry {
  return { id: newRowId(), name: '', vGrade: 'V3', flash: false };
}

type Props = {
  boardType: BoardType | null;
  onChangeBoardType: (v: BoardType) => void;
  problems: BoardProblemEntry[];
  onChangeProblems: (next: BoardProblemEntry[]) => void;
};

export function BoardEntry({
  boardType,
  onChangeBoardType,
  problems,
  onChangeProblems,
}: Props) {
  const c = useThemeColors();

  function updateRow(id: string, patch: Partial<BoardProblemEntry>) {
    onChangeProblems(problems.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removeRow(id: string) {
    onChangeProblems(problems.filter((p) => p.id !== id));
  }
  function addRow() {
    onChangeProblems([...problems, makeEmptyBoardProblem()]);
  }

  return (
    <View style={{ gap: 12 }}>
      {/* 보드 종류 */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.3 }}>
          보드 종류
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {BOARD_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={boardType === opt.value}
              onPress={() => onChangeBoardType(opt.value)}
            />
          ))}
        </View>
      </View>

      {/* 문제 세트 */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.text.tertiary, letterSpacing: 0.3 }}>
          문제 ({problems.length})
        </Text>
        <View style={{ gap: 8 }}>
          {problems.map((p) => (
            <ProblemRow
              key={p.id}
              entry={p}
              onChangeName={(name) => updateRow(p.id, { name })}
              onChangeGrade={(vGrade) => updateRow(p.id, { vGrade })}
              onToggleFlash={() => updateRow(p.id, { flash: !p.flash })}
              onRemove={() => removeRow(p.id)}
            />
          ))}

          <Pressable onPress={addRow}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 11,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: c.border.strong,
                  backgroundColor: pressed ? c.bg.subtle : 'transparent',
                }}
              >
                <Feather name="plus" size={14} color={c.text.secondary} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.text.secondary }}>
                  문제 추가
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ProblemRow({
  entry,
  onChangeName,
  onChangeGrade,
  onToggleFlash,
  onRemove,
}: {
  entry: BoardProblemEntry;
  onChangeName: (name: string) => void;
  onChangeGrade: (g: string) => void;
  onToggleFlash: () => void;
  onRemove: () => void;
}) {
  const c = useThemeColors();
  const [gradeOpen, setGradeOpen] = React.useState(false);

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border.subtle,
        backgroundColor: c.bg.card,
        padding: 10,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          value={entry.name}
          onChangeText={(t) => onChangeName(t.slice(0, 30))}
          placeholder="문제 이름"
          placeholderTextColor={c.text.muted}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: '700',
            color: c.text.primary,
            paddingVertical: 4,
          }}
          maxLength={30}
        />
        <Pressable onPress={onRemove} hitSlop={6}>
          <Feather name="x" size={16} color={c.text.muted} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* V 그레이드 */}
        <Pressable onPress={() => setGradeOpen((v) => !v)}>
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: c.bg.accent,
                borderWidth: 1,
                borderColor: c.brand.primaryLight,
                opacity: pressed ? 0.85 : 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '900', color: c.brand.primaryDeep }}>
                {entry.vGrade}
              </Text>
              <Feather name={gradeOpen ? 'chevron-up' : 'chevron-down'} size={12} color={c.brand.primaryDeep} />
            </View>
          )}
        </Pressable>

        {/* 플래시 토글 */}
        <Pressable onPress={onToggleFlash}>
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: entry.flash ? '#fef3c7' : 'transparent',
                borderWidth: 1,
                borderColor: entry.flash ? '#f59e0b' : c.border.subtle,
                opacity: pressed ? 0.85 : 1,
              }}
            >
              <Feather
                name="zap"
                size={11}
                color={entry.flash ? '#b45309' : c.text.tertiary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '900',
                  color: entry.flash ? '#b45309' : c.text.tertiary,
                  letterSpacing: -0.2,
                }}
              >
                플래시
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* V 그레이드 선택 그리드 */}
      {gradeOpen && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
          {V_GRADES.map((g) => {
            const active = entry.vGrade === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  onChangeGrade(g);
                  setGradeOpen(false);
                }}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: active ? c.brand.primaryDeep : c.bg.subtle,
                      opacity: pressed ? 0.85 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '900',
                        color: active ? c.brand.onPrimary : c.text.secondary,
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
      )}
    </View>
  );
}
