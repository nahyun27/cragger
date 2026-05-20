import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const w = KO_WEEKDAYS[d.getDay()];
  return `${y}.${m}.${day} (${w})`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}분`;
  if (min % 60 === 0) return `${min / 60}시간`;
  return `${(min / 60).toFixed(1)}시간`;
}

// Minimal structural type — any session-shaped row works here.
export type SessionSummary = {
  id: string;
  session_date: string;
  duration_min: number | null;
  gym: { id: string; name: string; branch: string | null } | null;
  send_count: number;
};

export function SessionRow({ session }: { session: SessionSummary }) {
  const router = useRouter();
  const gymName = session.gym?.name || '암장 미선택';
  const branchName = session.gym?.branch ? ` ${session.gym.branch}` : '';
  const hasSends = session.send_count > 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1 }]}
    >
      <View style={s.card}>
        <View style={s.cardIcon}>
          <Feather name="map-pin" size={16} color="#475569" />
        </View>
        <View style={s.cardText}>
          <Text style={s.cardGymName} numberOfLines={1}>
            {gymName}
            {branchName}
          </Text>
          <View style={s.metaRow}>
            <Text style={s.metaText}>{formatDate(session.session_date)}</Text>
            {session.duration_min != null && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Feather name="clock" size={11} color="#94a3b8" />
                <Text style={s.metaText}>{formatDuration(session.duration_min)}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[s.sendBadge, !hasSends && s.sendBadgeMuted]}>
          <Text style={[s.sendBadgeText, !hasSends && s.sendBadgeTextMuted]}>
            완등 {session.send_count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardGymName: { fontSize: 14, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  metaDot: { fontSize: 11, color: '#cbd5e1', marginHorizontal: 2 },
  sendBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  sendBadgeMuted: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  sendBadgeText: { color: '#059669', fontSize: 12, fontWeight: '800' },
  sendBadgeTextMuted: { color: '#94a3b8' },
});
