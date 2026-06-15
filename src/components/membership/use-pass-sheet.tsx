import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GymThumbnail } from '@/components/gym/gym-thumbnail';
import { customAlert } from '@/components/ui/custom-alert';
import { Sheet } from '@/components/ui/sheet';
import {
  useUnlinkedSessionsForMembership,
  useUsePass,
  type MembershipRow,
} from '@/hooks/use-memberships';
import { useThemeColors } from '@/lib/theme';

type Props = {
  visible: boolean;
  membership: MembershipRow | null;
  onClose: () => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day} (${WEEKDAYS[d.getDay()]})`;
}

export function UsePassSheet({ visible, membership, onClose }: Props) {
  const c = useThemeColors();
  const usePass = useUsePass();
  const { data: unlinked, isLoading } = useUnlinkedSessionsForMembership(
    membership ?? undefined,
  );

  if (!membership) return null;

  const remaining = (membership.total_passes ?? 0) - membership.used_passes;

  async function handleLink(sessionId: string) {
    if (!membership) return;
    try {
      await usePass.mutateAsync({
        id: membership.id,
        current: membership.used_passes,
        sessionId,
      });
      onClose();
    } catch (e) {
      customAlert('실패', e instanceof Error ? e.message : '오류');
    }
  }

  async function handleJustDeduct() {
    if (!membership) return;
    try {
      await usePass.mutateAsync({
        id: membership.id,
        current: membership.used_passes,
      });
      onClose();
    } catch (e) {
      customAlert('실패', e instanceof Error ? e.message : '오류');
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      variant="bottom"
      title="횟수권 사용하기"
      subtitle={`남은 ${remaining}회 → ${remaining - 1}회`}
    >
      <View style={{ gap: 16, paddingBottom: 8 }}>
        {/* 미연결 세션 목록 */}
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              color: c.text.tertiary,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            최근 미연결 기록 (최대 3주)
          </Text>
          {isLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={c.brand.primary} />
            </View>
          ) : !unlinked || unlinked.length === 0 ? (
            <View
              style={{
                paddingVertical: 18,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: c.border.subtle,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Feather name="info" size={14} color={c.text.muted} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: c.text.tertiary,
                  textAlign: 'center',
                }}
              >
                연결할 수 있는 기록이 없어요
              </Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {unlinked.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleLink(s.id)}
                  disabled={usePass.isPending}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: c.border.subtle,
                        backgroundColor: pressed ? c.bg.subtle : c.bg.card,
                      }}
                    >
                      {s.gym ? (
                        <GymThumbnail
                          name={s.gym.name}
                          branch={s.gym.branch}
                          size={36}
                        />
                      ) : (
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: c.bg.subtle,
                          }}
                        />
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: c.text.primary,
                            letterSpacing: -0.2,
                          }}
                          numberOfLines={1}
                        >
                          {s.gym
                            ? `${s.gym.name}${s.gym.branch ? ` ${s.gym.branch}` : ''}`
                            : '암장 미선택'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: c.text.tertiary,
                          }}
                        >
                          {formatShortDate(s.session_date)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={c.text.muted} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* "기록 없이 차감" 버튼 */}
        <Pressable onPress={handleJustDeduct} disabled={usePass.isPending}>
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: c.bg.subtle,
                borderWidth: 1,
                borderColor: c.border.subtle,
                opacity: pressed ? 0.85 : 1,
              }}
            >
              {usePass.isPending ? (
                <ActivityIndicator color={c.text.secondary} />
              ) : (
                <>
                  <Feather name="minus-circle" size={15} color={c.text.secondary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: c.text.secondary,
                      letterSpacing: -0.2,
                    }}
                  >
                    기록 없이 차감
                  </Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      </View>
    </Sheet>
  );
}
