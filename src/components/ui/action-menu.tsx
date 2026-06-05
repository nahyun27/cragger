/**
 * ActionMenu — kebab(`more-vertical`) 누르면 뜨는 bottom sheet 액션 메뉴.
 * 공유 / 수정 / 삭제 같은 카드/상세 화면 보조 액션 통일 컴포넌트.
 *
 * 사용 패턴:
 *   const [open, setOpen] = useState(false);
 *   ...
 *   <ScreenHeader
 *     rightActions={[{ icon: 'more-vertical', onPress: () => setOpen(true) }]}
 *   />
 *   <ActionMenu
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     items={[
 *       { icon: 'share-2', label: '공유', onPress: handleShare },
 *       { icon: 'edit-3', label: '수정', onPress: handleEdit },
 *       { icon: 'trash-2', label: '삭제', tone: 'danger', onPress: handleDelete, loading: deleting },
 *     ]}
 *   />
 */
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { BoingPressable } from '@/components/ui/boing-pressable';
import { useThemeColors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;
type Tone = 'default' | 'danger' | 'muted';

export type ActionMenuItem = {
  icon: IconName;
  label: string;
  tone?: Tone;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export type ActionMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
  /** 상단 손잡이/타이틀 노출 */
  title?: string;
};

export function ActionMenu({ visible, onClose, items, title }: ActionMenuProps) {
  const c = useThemeColors();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: c.bg.overlay, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: c.bg.card,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 28,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
          }}
        >
          {/* drag handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 40, height: 4, borderRadius: 999,
              backgroundColor: c.border.strong, marginBottom: title ? 10 : 8,
            }}
          />
          {title ? (
            <Text
              style={{
                fontSize: 13, fontWeight: '900', color: c.text.tertiary,
                letterSpacing: 0.3, textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 6,
              }}
            >
              {title}
            </Text>
          ) : null}

          {items.map((item, i) => (
            <Row key={`${item.icon}-${i}`} item={item} onClose={onClose} />
          ))}

          <BoingPressable
            onPress={onClose}
            haptic="light"
            scaleMin={0.97}
            style={{
              marginTop: 8,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: c.bg.subtle,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: c.text.secondary }}>
              취소
            </Text>
          </BoingPressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ item, onClose }: { item: ActionMenuItem; onClose: () => void }) {
  const c = useThemeColors();
  const tone = item.tone ?? 'default';
  const color =
    tone === 'danger' ? c.status.danger :
    tone === 'muted'  ? c.text.tertiary :
                        c.text.primary;
  const handlePress = () => {
    if (item.disabled || item.loading) return;
    // close first so animation doesn't fight; then call action
    onClose();
    item.onPress();
  };
  return (
    <BoingPressable
      onPress={handlePress}
      haptic={item.disabled || item.loading ? 'none' : 'light'}
      scaleMin={0.97}
      disabled={item.disabled || item.loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        opacity: item.disabled ? 0.4 : 1,
      }}
    >
      {item.loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Feather name={item.icon} size={18} color={color} />
      )}
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '800',
          color,
          letterSpacing: -0.2,
        }}
      >
        {item.label}
      </Text>
    </BoingPressable>
  );
}

// silence StyleSheet unused warning (kept for future refactor)
void StyleSheet;
