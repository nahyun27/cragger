/**
 * 고객센터 / 문의하기.
 *   - 상단 hero: 보낸 문의 요약 (총 N건, 처리 중 / 완료)
 *   - "새 문의 보내기" 폼 (카테고리, 제목, 본문, 답변받을 이메일 옵션)
 *   - 내가 보낸 문의 목록 (상태 뱃지 + 본문 펼치기 + 관리자 응답)
 */
import { useRouter } from '@/lib/router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { customAlert } from '@/components/ui/custom-alert';
import { BottomCTA } from '@/components/ui/bottom-cta';
import { EmptyState } from '@/components/ui/empty-state';
import { FormCard, FormField, FormInput } from '@/components/ui/form';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Section } from '@/components/ui/section';
import { useAuth } from '@/lib/auth-context';
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  useCancelSupportInquiry,
  useCreateSupportInquiry,
  useMySupportInquiries,
  type SupportCategory,
  type SupportInquiry,
  type SupportStatus,
} from '@/hooks/use-support-inquiries';
import { useThemeColors, type ThemeColors } from '@/lib/theme';

const CATEGORIES: { key: SupportCategory; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'general', icon: 'message-circle' },
  { key: 'bug', icon: 'alert-triangle' },
  { key: 'feature', icon: 'zap' },
  { key: 'account', icon: 'user' },
  { key: 'gym_data', icon: 'map-pin' },
  { key: 'other', icon: 'more-horizontal' },
];

const STATUS_TONE: Record<SupportStatus, 'warning' | 'brand' | 'success' | 'muted'> = {
  open: 'warning',
  in_progress: 'brand',
  resolved: 'success',
  cancelled: 'muted',
};

function relativeDate(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function SupportScreen() {
  const c = useThemeColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { session } = useAuth();
  const myEmail = session?.user.email ?? '';

  const list = useMySupportInquiries();
  const create = useCreateSupportInquiry();

  const [category, setCategory] = useState<SupportCategory>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const inquiries = list.data ?? [];
  const summary = useMemo(() => {
    const out = { open: 0, in_progress: 0, resolved: 0, cancelled: 0 };
    for (const r of inquiries) out[r.status]++;
    return out;
  }, [inquiries]);

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !create.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        category,
        subject,
        body,
        contactEmail: contactEmail.trim() || null,
      });
      setSubject('');
      setBody('');
      setContactEmail('');
      customAlert('전송 완료', '문의가 접수되었어요. 확인 후 답변드릴게요.');
    } catch (e) {
      customAlert('전송 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <ScreenHeader
        title="고객센터"
        onBack={() => router.back()}
        count={inquiries.length > 0 ? inquiries.length : undefined}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: 16 }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroIcon}>
              <Feather name="headphones" size={20} color={c.brand.primaryDeep} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.heroTitle}>도움이 필요하신가요?</Text>
              <Text style={s.heroDesc}>
                문의 주시면 확인 후 빠르게 답변드릴게요. 보낸 내역은 아래에서 확인할 수 있어요.
              </Text>
            </View>
          </View>

          {/* New inquiry form */}
          <Section title="새 문의" icon="edit-3">
            <FormField label="카테고리" required>
              <View style={s.catGrid}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setCategory(cat.key)}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            s.catChip,
                            active ? s.catChipOn : s.catChipOff,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Feather
                            name={cat.icon}
                            size={12}
                            color={active ? c.brand.onPrimary : c.text.secondary}
                          />
                          <Text style={[s.catChipText, active && { color: c.brand.onPrimary }]}>
                            {CATEGORY_LABEL[cat.key]}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </FormField>

            <FormField label="제목" required>
              <FormInput
                placeholder="문의 제목 (최대 100자)"
                value={subject}
                onChangeText={(t) => setSubject(t.slice(0, 100))}
                maxLength={100}
              />
            </FormField>

            <FormField
              label="내용"
              required
              trailingLabel={
                <Text style={s.charCount}>{body.length} / 2000</Text>
              }
            >
              <FormInput
                placeholder="자세한 상황·재현 방법·기대했던 결과 등을 적어주세요"
                value={body}
                onChangeText={(t) => setBody(t.slice(0, 2000))}
                maxLength={2000}
                multiline
              />
            </FormField>

            <FormField
              label="답변받을 이메일"
              hint={`비워두면 가입 이메일(${myEmail})로 답변드려요`}
            >
              <FormInput
                placeholder="other@example.com (선택)"
                value={contactEmail}
                onChangeText={setContactEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                leadingIcon="mail"
              />
            </FormField>
          </Section>

          {/* My inquiries */}
          <Section title="보낸 문의" icon="inbox" desc={inquiries.length > 0 ? `총 ${inquiries.length}건` : undefined}>
            {list.isLoading ? (
              <ActivityIndicator color={c.brand.primary} />
            ) : inquiries.length === 0 ? (
              <EmptyState
                compact
                icon="inbox"
                tone="muted"
                title="보낸 문의가 없어요"
                description="문의를 보내면 여기에 표시돼요"
              />
            ) : (
              <View style={{ gap: 10 }}>
                {(summary.open + summary.in_progress) > 0 && (
                  <View style={s.summaryStrip}>
                    {summary.open > 0 && (
                      <SummaryPill
                        label={STATUS_LABEL.open}
                        count={summary.open}
                        tone="warning"
                        c={c}
                      />
                    )}
                    {summary.in_progress > 0 && (
                      <SummaryPill
                        label={STATUS_LABEL.in_progress}
                        count={summary.in_progress}
                        tone="brand"
                        c={c}
                      />
                    )}
                    {summary.resolved > 0 && (
                      <SummaryPill
                        label={STATUS_LABEL.resolved}
                        count={summary.resolved}
                        tone="success"
                        c={c}
                      />
                    )}
                  </View>
                )}
                {inquiries.map((it) => (
                  <InquiryCard key={it.id} inquiry={it} c={c} />
                ))}
              </View>
            )}
          </Section>
        </ScrollView>

        <BottomCTA
          label="문의 보내기"
          icon="send"
          onPress={handleSubmit}
          loading={create.isPending}
          disabled={!canSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryPill({
  label, count, tone, c,
}: { label: string; count: number; tone: 'warning' | 'brand' | 'success'; c: ThemeColors }) {
  const bg =
    tone === 'warning' ? c.status.warningBg
    : tone === 'success' ? c.status.successBg
    : c.brand.primaryLight;
  const fg =
    tone === 'warning' ? c.status.warning
    : tone === 'success' ? c.status.success
    : c.brand.primaryDeep;
  return (
    <View style={[summaryPillStyles.box, { backgroundColor: bg }]}>
      <Text style={[summaryPillStyles.count, { color: fg }]}>{count}</Text>
      <Text style={[summaryPillStyles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const summaryPillStyles = StyleSheet.create({
  box: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 10, gap: 1,
  },
  count: { fontSize: 16, fontWeight: '900' },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.2 },
});

function InquiryCard({ inquiry, c }: { inquiry: SupportInquiry; c: ThemeColors }) {
  const s = useMemo(() => makeStyles(c), [c]);
  const cancel = useCancelSupportInquiry();
  const [expanded, setExpanded] = useState(false);
  const tone = STATUS_TONE[inquiry.status];
  const statusBg =
    tone === 'warning' ? c.status.warningBg
    : tone === 'success' ? c.status.successBg
    : tone === 'muted' ? c.bg.subtle
    : c.brand.primaryLight;
  const statusFg =
    tone === 'warning' ? c.status.warning
    : tone === 'success' ? c.status.success
    : tone === 'muted' ? c.text.tertiary
    : c.brand.primaryDeep;

  return (
    <Pressable onPress={() => setExpanded((v) => !v)}>
      {({ pressed }) => (
        <View style={[s.inquiryCard, pressed && { backgroundColor: c.bg.subtle }]}>
          <View style={s.inquiryHeader}>
            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[s.statusBadgeText, { color: statusFg }]}>
                {STATUS_LABEL[inquiry.status]}
              </Text>
            </View>
            <Text style={s.catLabel}>{CATEGORY_LABEL[inquiry.category]}</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.timeText}>{relativeDate(inquiry.created_at)}</Text>
          </View>
          <Text style={s.subjectText} numberOfLines={expanded ? undefined : 1}>
            {inquiry.subject}
          </Text>
          <Text
            style={s.bodyText}
            numberOfLines={expanded ? undefined : 2}
          >
            {inquiry.body}
          </Text>
          {expanded && inquiry.admin_response ? (
            <View style={s.responseBox}>
              <View style={s.responseLabelRow}>
                <Feather name="message-square" size={11} color={c.brand.primaryDeep} />
                <Text style={s.responseLabel}>관리자 답변</Text>
                {inquiry.responded_at ? (
                  <Text style={s.responseTime}>· {relativeDate(inquiry.responded_at)}</Text>
                ) : null}
              </View>
              <Text style={s.responseText}>{inquiry.admin_response}</Text>
            </View>
          ) : null}
          {expanded && inquiry.status === 'open' ? (
            <Pressable
              onPress={() => {
                customAlert('문의 취소', '정말 취소하시겠어요?', [
                  { text: '돌아가기', style: 'cancel' },
                  {
                    text: '취소하기',
                    style: 'destructive',
                    onPress: () => cancel.mutate(inquiry.id),
                  },
                ]);
              }}
              style={({ pressed: p }) => [s.cancelBtn, p && { opacity: 0.7 }]}
            >
              <Feather name="x-circle" size={12} color={c.status.danger} />
              <Text style={s.cancelText}>문의 취소</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.primary },
    list: { padding: 18, gap: 18 },

    hero: {
      flexDirection: 'row', gap: 12,
      padding: 14, borderRadius: 14,
      backgroundColor: c.brand.primaryLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.brand.primary + '33',
    },
    heroIcon: {
      width: 38, height: 38, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.bg.card,
    },
    heroTitle: {
      fontSize: 14, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: -0.2,
    },
    heroDesc: { fontSize: 12, color: c.text.secondary, fontWeight: '600', lineHeight: 17 },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999,
    },
    catChipOff: { backgroundColor: c.bg.subtle },
    catChipOn: { backgroundColor: c.brand.primary },
    catChipText: { fontSize: 12, fontWeight: '800', color: c.text.secondary, letterSpacing: -0.2 },

    charCount: { fontSize: 11, fontWeight: '700', color: c.text.muted },

    summaryStrip: { flexDirection: 'row', gap: 6 },

    inquiryCard: {
      backgroundColor: c.bg.subtle,
      borderRadius: 12, padding: 12, gap: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.subtle,
    },
    inquiryHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    statusBadge: {
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    },
    statusBadgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.2 },
    catLabel: { fontSize: 11, fontWeight: '800', color: c.text.tertiary },
    timeText: { fontSize: 11, fontWeight: '700', color: c.text.muted },
    subjectText: {
      fontSize: 13.5, fontWeight: '900', color: c.text.primary, letterSpacing: -0.2,
    },
    bodyText: { fontSize: 12.5, color: c.text.secondary, fontWeight: '600', lineHeight: 18 },
    responseBox: {
      marginTop: 4, padding: 10, borderRadius: 10,
      backgroundColor: c.brand.primaryLight, gap: 4,
    },
    responseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    responseLabel: {
      fontSize: 11, fontWeight: '900', color: c.brand.primaryDeep, letterSpacing: 0.2,
    },
    responseTime: { fontSize: 10.5, fontWeight: '700', color: c.text.tertiary },
    responseText: {
      fontSize: 13, color: c.text.primary, fontWeight: '600', lineHeight: 19,
    },

    cancelBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      alignSelf: 'flex-start', marginTop: 6,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
      backgroundColor: c.status.dangerBg,
    },
    cancelText: { fontSize: 11.5, fontWeight: '800', color: c.status.danger },
  });
}
