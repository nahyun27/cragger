import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { GymPickerField } from '@/components/gym/gym-picker-field';
import { CategoryPicker } from '@/components/ui/category-chip';
import { Chip } from '@/components/ui/chip';
import { customAlert } from '@/components/ui/custom-alert';
import { Sheet } from '@/components/ui/sheet';
import type { SessionCategory } from '@/constants/session-category';
import { useGyms } from '@/hooks/use-gyms';
import { useCreatePlan } from '@/hooks/use-session-plans';
import { useThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  plannedDate: string;          // 'YYYY-MM-DD'
  onClose: () => void;
  onSaved?: () => void;
};

type TimeChoice = 'morning' | 'afternoon' | 'evening' | 'none' | 'custom';

const TIME_CHIPS: { value: TimeChoice; label: string; time: string | null }[] = [
  { value: 'none', label: '시간 없음', time: null },
  { value: 'morning', label: '오전 (09:00)', time: '09:00' },
  { value: 'afternoon', label: '오후 (14:00)', time: '14:00' },
  { value: 'evening', label: '저녁 (19:00)', time: '19:00' },
];

function formatHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const NOTES_MAX = 100;

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${w})`;
}

export function PlanSheet({ visible, plannedDate, onClose, onSaved }: Props) {
  const c = useThemeColors();
  const createPlan = useCreatePlan();
  const { data: allGyms } = useGyms();

  const [gymId, setGymId] = useState<string | null>(null);
  const [timeChoice, setTimeChoice] = useState<TimeChoice>('evening');
  const [customTime, setCustomTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<SessionCategory | null>(null);

  // 시트 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setGymId(null);
      setTimeChoice('evening');
      setNotes('');
      setShowTimePicker(false);
      setCategory(null);
    }
  }, [visible]);

  const plannedTime = useMemo(() => {
    if (timeChoice === 'custom') return formatHHMM(customTime);
    return TIME_CHIPS.find((c) => c.value === timeChoice)?.time ?? null;
  }, [timeChoice, customTime]);

  const isNonClimbCategory = category === 'strength' || category === 'endurance';

  // 등반 카테고리는 암장 필수, 근력/지구력은 카테고리만 있으면 OK
  const canSubmit =
    !createPlan.isPending && (isNonClimbCategory ? !!category : !!gymId);

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const gym = allGyms?.find((g) => g.id === gymId);
      const gymName = gym
        ? `${gym.name}${gym.branch ? ` ${gym.branch}` : ''}`
        : category === 'strength' ? '근력 운동'
        : category === 'endurance' ? '지구력 운동'
        : '운동';
      await createPlan.mutateAsync({
        gymId: gymId ?? null,
        gymName,
        plannedDate,
        plannedTime,
        notes: notes.trim() || null,
        category,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      customAlert('등록 실패', e instanceof Error ? e.message : '오류가 발생했어요');
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="bottom"
      title="운동 계획 등록"
      subtitle={formatDateLabel(plannedDate)}
      footer={
        <Pressable onPress={handleSubmit} disabled={!canSubmit}>
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: canSubmit ? c.brand.primary : c.bg.subtle,
                paddingVertical: 14,
                borderRadius: 14,
                opacity: pressed && canSubmit ? 0.85 : 1,
              }}
            >
              {createPlan.isPending ? (
                <ActivityIndicator color={c.brand.onPrimary} />
              ) : (
                <>
                  <Feather
                    name="calendar"
                    size={16}
                    color={canSubmit ? c.brand.onPrimary : c.text.muted}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: canSubmit ? c.brand.onPrimary : c.text.muted,
                      letterSpacing: -0.2,
                    }}
                  >
                    계획 등록
                  </Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      }
    >
      <View style={{ gap: 18, paddingTop: 4, paddingBottom: 8 }}>
        {/* 암장 */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: c.text.tertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            {isNonClimbCategory ? '암장 · 선택' : '암장'}
          </Text>
          <GymPickerField
            value={gymId}
            onChange={setGymId}
            placeholder={isNonClimbCategory ? '암장 선택 (외부 시설은 비워두세요)' : '암장 선택'}
          />
        </View>

        {/* 시간 */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: c.text.tertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            시간대
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIME_CHIPS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={timeChoice === opt.value}
                onPress={() => setTimeChoice(opt.value)}
              />
            ))}
            <Chip
              label={timeChoice === 'custom' ? `직접 (${formatHHMM(customTime)})` : '직접 입력'}
              selected={timeChoice === 'custom'}
              onPress={() => {
                setTimeChoice('custom');
                setShowTimePicker(true);
              }}
            />
          </View>
          {showTimePicker && (
            <DateTimePicker
              value={customTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowTimePicker(false);
                if (d) setCustomTime(d);
              }}
            />
          )}
        </View>

        {/* 운동 종류 (옵션) */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: c.text.tertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            운동 종류 · 선택
          </Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>

        {/* 메모 */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: c.text.tertiary,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            메모 · 선택
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: c.border.subtle,
              borderRadius: 12,
              backgroundColor: c.bg.subtle,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, NOTES_MAX))}
              placeholder="목표 그레이드, 같이 갈 사람 등"
              placeholderTextColor={c.text.muted}
              multiline
              style={{
                fontSize: 14,
                color: c.text.primary,
                minHeight: 48,
                padding: 0,
              }}
            />
            <Text style={{ alignSelf: 'flex-end', fontSize: 10, color: c.text.tertiary, marginTop: 4 }}>
              {notes.length}/{NOTES_MAX}
            </Text>
          </View>
        </View>

        {/* 안내 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: c.bg.accent,
          }}
        >
          <Feather name="info" size={13} color={c.brand.primary} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: c.text.secondary, lineHeight: 17 }}>
            등록한 계획은 캘린더에 표시돼요. 당일 운동을 마치고 기록하면 자동으로 연결할게요.
          </Text>
        </View>
      </View>
    </Sheet>
  );
}
