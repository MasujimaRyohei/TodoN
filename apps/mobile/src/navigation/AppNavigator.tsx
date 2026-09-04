import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import JoinInviteScreen from '../screens/JoinInviteScreen';
import TaskCreateScreen from '../screens/TaskCreateScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TeamCreateScreen from '../screens/TeamCreateScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import TeamListScreen from '../screens/TeamListScreen';
import { theme } from '../theme';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.ink,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'TodoN · 今日' }}
      />
      <Stack.Screen name="Tasks" component={TaskListScreen} options={{ title: 'TodoN · リスト' }} />
      <Stack.Screen name="Teams" component={TeamListScreen} options={{ title: 'チーム' }} />
      <Stack.Screen
        name="TeamCreate"
        component={TeamCreateScreen}
        options={{ title: 'チーム作成' }}
      />
      <Stack.Screen
        name="TeamDetail"
        component={TeamDetailScreen}
        options={{ title: 'チーム詳細' }}
      />
      <Stack.Screen
        name="JoinInvite"
        component={JoinInviteScreen}
        options={{ title: '招待で参加' }}
      />
      <Stack.Screen
        name="TaskCreate"
        component={TaskCreateScreen}
        options={{ title: 'タスク作成' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'タスク詳細' }}
      />
    </Stack.Navigator>
  );
}
