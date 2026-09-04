import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CapacityLevel, DashboardPayload } from '@todon/shared';
import { CAPACITY_LABELS } from '@todon/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthContext } from '../auth-context';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>;

const capacityLevels: CapacityLevel[] = ['relaxed', 'normal', 'busy', 'overload'];

export default function DashboardScreen({ navigation }: Props) {
  const { client } = useAuthContext();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const dash = await client.dashboard();
    setData(dash);
  }, [client]);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (error) {
        Alert.alert('読み込みエラー', error instanceof Error ? error.message : '');
      }
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function setCapacity(level: CapacityLevel) {
    try {
      await client.setTodayCapacity(level);
      await load();
    } catch (error) {
      Alert.alert('保存できませんでした', error instanceof Error ? error.message : '');
    }
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.title}>ダッシュボード</Text>
      <Text style={styles.sub}>キャパシティ: {CAPACITY_LABELS[data.capacity]}</Text>

      <View style={styles.chips}>
        {capacityLevels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.chip, data.capacity === level ? styles.chipActive : undefined]}
            onPress={() => void setCapacity(level)}
          >
            <Text style={data.capacity === level ? styles.chipLabelActive : styles.chipLabel}>
              {CAPACITY_LABELS[level]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardEyebrow}>AI 提案（ルールベース）</Text>
        <Text style={styles.cardBody}>{data.aiSuggestion}</Text>
      </View>

      <TouchableOpacity style={styles.navTeams} onPress={() => navigation.navigate('Teams')}>
        <Text style={styles.navTeamsLabel}>チーム</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>担当チームタスク（{data.myTeamTasks.length}）</Text>
      {data.myTeamTasks.length === 0 ? (
        <Text style={styles.muted}>担当のチームタスクはありません</Text>
      ) : (
        data.myTeamTasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, styles.teamTaskCard]}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          >
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskHint}>
              {task.status}
              {task.assignee?.name ? ` · 担当 ${task.assignee.name}` : ''}
            </Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>だいたいリピート（{data.todayFlexible.length}）</Text>
      {data.todayFlexible.length === 0 ? (
        <Text style={styles.muted}>今日の候補はありません</Text>
      ) : (
        data.todayFlexible.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          >
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskHint}>{task.flexibleReason}</Text>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>期限切れ（{data.overdue.length}）</Text>
      {data.overdue.slice(0, 5).map((task) => (
        <TouchableOpacity
          key={task.id}
          style={styles.taskCard}
          onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        >
          <Text style={styles.taskTitle}>{task.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#fff8f0', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 12, backgroundColor: '#fff8f0' },
  title: { color: '#3f2f2a', fontSize: 24, fontWeight: '700' },
  sectionTitle: { color: '#3f2f2a', fontSize: 16, fontWeight: '700', marginTop: 8 },
  sub: { color: '#78716c', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipLabel: { color: '#78716c', fontSize: 12 },
  chipLabelActive: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    backgroundColor: '#052e1f',
    gap: 6,
  },
  cardEyebrow: { color: '#fb923c', fontSize: 11, textTransform: 'uppercase' },
  cardBody: { color: '#ecfdf5', fontSize: 14, lineHeight: 20 },
  navTeams: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c084fc',
    backgroundColor: '#f3e8ff33',
  },
  navTeamsLabel: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 13,
  },
  teamTaskCard: {
    borderColor: '#c084fc',
    backgroundColor: '#f3e8ff44',
  },
  muted: { color: '#78716c', fontSize: 13 },
  taskCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 4,
  },
  taskTitle: { color: '#3f2f2a', fontWeight: '600' },
  taskHint: { color: '#78716c', fontSize: 12 },
});
