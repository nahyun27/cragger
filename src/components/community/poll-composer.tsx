import React from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/lib/theme';

export type PollDraft = {
  enabled: boolean;
  question: string;
  options: string[];
  isMulti: boolean;
  closesAt: Date | null;
};

export const EMPTY_POLL_DRAFT: PollDraft = {
  enabled: false,
  question: '',
  options: ['', ''],
  isMulti: false,
  closesAt: null,
};

const QUESTION_MAX = 100;
const OPTION_MAX = 40;
const MAX_OPTIONS = 6;

type Props = {
  value: PollDraft;
  onChange: (next: PollDraft) => void;
};

export function PollComposer({ value, onChange }: Props) {
  const c = useThemeColors();
  const [showPicker, setShowPicker] = React.useState(false);

  function setEnabled(enabled: boolean) {
    onChange({ ...value, enabled });
  }
  function setQuestion(q: string) {
    onChange({ ...value, question: q.slice(0, QUESTION_MAX) });
  }
  function setOption(i: number, label: string) {
    const next = [...value.options];
    next[i] = label.slice(0, OPTION_MAX);
    onChange({ ...value, options: next });
  }
  function addOption() {
    if (value.options.length >= MAX_OPTIONS) return;
    onChange({ ...value, options: [...value.options, ''] });
  }
  function removeOption(i: number) {
    if (value.options.length <= 2) return;
    onChange({ ...value, options: value.options.filter((_, idx) => idx !== i) });
  }
  function toggleMulti() {
    onChange({ ...value, isMulti: !value.isMulti });
  }

  return (
    <View style={{ gap: 12 }}>
      {/* 토글 */}
      <Pressable
        onPress={() => setEnabled(!value.enabled)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 4,
          }}
        >
          <View
            style={{
              width: 38,
              height: 22,
              borderRadius: 999,
              padding: 2,
              backgroundColor: value.enabled ? c.brand.primary : c.border.subtle,
              justifyContent: 'center',
              alignItems: value.enabled ? 'flex-end' : 'flex-start',
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#ffffff',
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.text.primary }}>
              투표 추가
            </Text>
            <Text style={{ fontSize: 11, color: c.text.muted, marginTop: 1 }}>
              여론조사형 — 글에 투표 위젯이 붙어요
            </Text>
          </View>
        </View>
      </Pressable>

      {!value.enabled ? null : (
        <View
          style={{
            gap: 10,
            padding: 14,
            borderRadius: 14,
            backgroundColor: c.bg.subtle,
            borderWidth: 1,
            borderColor: c.border.subtle,
          }}
        >
          {/* 질문 */}
          <View
            style={{
              backgroundColor: c.bg.card,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border.subtle,
              paddingHorizontal: 12,
            }}
          >
            <TextInput
              placeholder="질문을 입력하세요 (예: 다음 모임 장소?)"
              placeholderTextColor={c.text.muted}
              value={value.question}
              onChangeText={setQuestion}
              maxLength={QUESTION_MAX}
              style={{
                paddingVertical: 10,
                fontSize: 14,
                color: c.text.primary,
                fontWeight: '700',
              }}
            />
          </View>

          {/* 선택지 */}
          <View style={{ gap: 6 }}>
            {value.options.map((opt, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: c.bg.card,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border.subtle,
                  paddingHorizontal: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: c.brand.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.brand.primaryDeep }}>
                    {i + 1}
                  </Text>
                </View>
                <TextInput
                  placeholder={`선택지 ${i + 1}`}
                  placeholderTextColor={c.text.muted}
                  value={opt}
                  onChangeText={(t) => setOption(i, t)}
                  maxLength={OPTION_MAX}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    fontSize: 13,
                    color: c.text.primary,
                  }}
                />
                {value.options.length > 2 && (
                  <Pressable onPress={() => removeOption(i)} hitSlop={6}>
                    {({ pressed }) => (
                      <Feather
                        name="x"
                        size={14}
                        color={c.text.muted}
                        style={{ opacity: pressed ? 0.5 : 1 }}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            ))}
            {value.options.length < MAX_OPTIONS && (
              <Pressable onPress={addOption}>
                {({ pressed }) => (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.brand.primaryLight,
                      borderStyle: 'dashed',
                      backgroundColor: c.brand.primaryLight,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Feather name="plus" size={12} color={c.brand.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: c.brand.primary }}>
                      선택지 추가
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {/* 복수 선택 토글 */}
          <Pressable
            onPress={toggleMulti}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 4,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: value.isMulti ? c.brand.primary : c.border.subtle,
                  backgroundColor: value.isMulti ? c.brand.primary : c.bg.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {value.isMulti && <Feather name="check" size={11} color="#ffffff" />}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text.secondary }}>
                복수 선택 허용
              </Text>
            </View>
          </Pressable>

          {/* 마감 시간 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={() => setShowPicker(true)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.border.subtle,
                backgroundColor: c.bg.card,
              }}
            >
              <Feather name="clock" size={13} color={c.text.secondary} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: '700',
                  color: value.closesAt ? c.text.primary : c.text.muted,
                }}
              >
                {value.closesAt
                  ? formatLong(value.closesAt)
                  : '마감 시간 (선택)'}
              </Text>
            </Pressable>
            {value.closesAt && (
              <Pressable
                onPress={() => onChange({ ...value, closesAt: null })}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={c.text.muted} />
              </Pressable>
            )}
          </View>
          {showPicker && (
            <>
              <DateTimePicker
                value={value.closesAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(event, picked) => {
                  if (Platform.OS !== 'ios') setShowPicker(false);
                  if (event.type === 'dismissed') return;
                  if (picked) onChange({ ...value, closesAt: picked });
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowPicker(false)}
                  style={{ alignSelf: 'flex-end', padding: 6 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: c.brand.primary }}>
                    완료
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function formatLong(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mi} 마감`;
}
