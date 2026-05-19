import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGyms } from '@/hooks/use-gyms';

export default function HomeScreen() {
  const { data, isLoading, error } = useGyms();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>암장 ({data?.length ?? 0})</Text>

        {isLoading && <ActivityIndicator />}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>불러오기 실패</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
          </View>
        )}

        {data && (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text style={styles.row}>{item.name}</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  row: { paddingVertical: 8, fontSize: 16 },
  errorBox: { padding: 12, borderRadius: 8, backgroundColor: '#FEE2E2' },
  errorTitle: { fontWeight: '600', color: '#991B1B', marginBottom: 4 },
  errorMessage: { color: '#7F1D1D' },
});
