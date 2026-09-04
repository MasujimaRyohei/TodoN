import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Team } from '@todon/shared';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthContext } from '../auth-context';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Teams'>;

export default function TeamListScreen({ navigation }: Props) {
  const { client, token } = useAuthContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await client.listTeams();
    setTeams(rows);
  }, [client]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity hitSlop={12} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.navLink}>ダッシュボード</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity hitSlop={12} onPress={() => navigation.navigate('TeamCreate')}>
          <Text style={styles.navLinkStrong}>作成</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!token) {
        return;
      }

      try {
        await load();
      } catch (error) {
        if (alive) {
          Alert.alert('読み込みエラー', error instanceof Error ? error.message : '');
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [load, token]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (error) {
      Alert.alert('再読込に失敗', error instanceof Error ? error.message : '');
    } finally {
      setRefreshing(false);
    }
  }

  function roleJp(role: NonNullable<Team['myRole']>): string {
    if (role === 'owner') {
      return 'オーナー';
    }

    if (role === 'admin') {
      return '管理者';
    }

    return 'メンバー';
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>v2</Text>
      <Text style={styles.title}>チーム</Text>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('JoinInvite')}>
        <Text style={styles.linkText}>招待トークンで参加する</Text>
      </TouchableOpacity>

      {!token ? (
        <ActivityIndicator animating />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={() => (
            <Text style={styles.muted}>
              まだチームに参加していません。作成するか招待を受けてください。
            </Text>
          )}
          contentContainerStyle={teams.length === 0 ? styles.emptyPad : styles.listPad}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardHint}>
                {item.myRole ? roleJp(item.myRole) : 'メンバー'}
                {typeof item.memberCount === 'number' ? ` · ${item.memberCount} 人` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f0',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  eyebrow: { letterSpacing: 4, color: '#c084fc', fontSize: 11, textTransform: 'uppercase' },
  title: { marginTop: 4, marginBottom: 12, color: '#3f2f2a', fontSize: 22, fontWeight: '600' },
  linkRow: { marginBottom: 16, paddingVertical: 10 },
  linkText: { color: '#7c3aed', fontWeight: '600', fontSize: 14 },
  navLink: { color: '#78716c', fontWeight: '600', fontSize: 14 },
  navLinkStrong: { color: '#c084fc', fontWeight: '700', fontSize: 15 },
  muted: { color: '#78716c', marginTop: 24, fontSize: 14 },
  emptyPad: { flexGrow: 1, paddingBottom: 48 },
  listPad: { paddingBottom: 96 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3730a3',
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#3f2f2a' },
  cardHint: { fontSize: 12, color: '#7c3aed' },
});
