import type { CapacityLevel } from './capacity';

export type { CapacityLevel } from './capacity';

export type TaskScope = 'personal' | 'team';

export type TaskStatus = 'todo' | 'doing' | 'done' | 'pending' | 'canceled';

export type DueType = 'none' | 'datetime' | 'anytime' | 'flexible';

export type RepeatType = 'none' | 'fixed' | 'flexible';

export type PriorityLevel = 'low' | 'medium' | 'high';

export type TaskWeight = 'light' | 'normal' | 'heavy';

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  scope: TaskScope;
  teamId?: string | null;
  ownerId: string;
  assigneeId?: string | null;
  status: TaskStatus;
  dueType: DueType;
  dueAt?: string | null;
  repeatType: RepeatType;
  repeatIntervalDays?: number | null;
  flexibleMinDays?: number | null;
  flexibleMaxDays?: number | null;
  flexibleSkipCount?: number;
  lastCompletedAt?: string | null;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  categoryId?: string | null;
  projectId?: string | null;
  startAt?: string | null;
  weight: TaskWeight;
  points: number;
  archivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: SubTask[];
  category?: Category | null;
  project?: Project | null;
};

export type FlexibleTaskView = Task & {
  flexibleReason: string;
  flexiblePriority: 'low' | 'medium' | 'high' | 'urgent';
};

export type SubTask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  points: number;
  completedById?: string | null;
  completedAt?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  userId?: string | null;
  teamId?: string | null;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

export type TeamRole = 'owner' | 'admin' | 'member';

export type Team = {
  id: string;
  name: string;
  icon?: string | null;
  ownerId: string;
  mainTaskCreateRole: TeamRole;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  myRole?: TeamRole;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
  user?: User;
};

export type TeamMemberPointsSummary = {
  userId: string;
  name: string | null;
  email: string;
  allTime: number;
  month: number;
  week: number;
  today: number;
};

export type TeamPointsPayload = {
  members: TeamMemberPointsSummary[];
  teamTotal: {
    allTime: number;
    month: number;
    week: number;
    today: number;
  };
};

export type TeamInvite = {
  id: string;
  teamId: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
  teamName?: string;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
};

export type TaskActivityLog = {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  before?: string | null;
  after?: string | null;
  createdAt: string;
  user?: User;
};

export type TaskWithPeople = Task & {
  owner?: User | null;
  assignee?: User | null;
};

export type AuthResponse = {
  user: User;
  token: string | null;
  refreshToken?: string | null;
  needsEmailConfirmation?: boolean;
};

export type RefreshResponse = {
  token: string;
  refreshToken: string;
};

import type { DashboardTodayProgress } from './today-progress';

export type { DashboardTodayProgress };

export type DashboardTodayInfo = {
  dateLabel: string;
  dayKey: string;
  serverNow: string;
  timeZone: string;
};

export type DashboardPayload = {
  scopeMode: 'personal' | 'team';
  teamId?: string;
  teamName?: string;
  teamIcon?: string | null;
  overdue: Task[];
  dueToday: Task[];
  dueSoon: Task[];
  inProgress: Task[];
  stalledPending: Task[];
  highPriorityOpen: Task[];
  todayFlexible: FlexibleTaskView[];
  myTeamTasks: TaskWithPeople[];
  capacity: CapacityLevel;
  aiSuggestion: string;
  notificationCandidates: Task[];
  todayInfo: DashboardTodayInfo;
  todayProgress: DashboardTodayProgress;
};

export type Project = {
  id: string;
  userId: string;
  scope?: TaskScope;
  teamId?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
};

export type TaskTemplatePayload = {
  title: string;
  description?: string | null;
  importance?: PriorityLevel;
  urgency?: PriorityLevel;
  weight?: TaskWeight;
  points?: number;
  dueType?: DueType;
  repeatType?: RepeatType;
  categoryName?: string | null;
};

export type TaskTemplate = {
  id: string;
  userId: string;
  name: string;
  payload: TaskTemplatePayload;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  userId: string;
  notifyOnDueToday: boolean;
  notifyOnTaskDone: boolean;
  notifyOnTeamAssign: boolean;
  slackWebhookUrl?: string | null;
  discordWebhookUrl?: string | null;
  googleCalendarLinked: boolean;
};

export type Habit = {
  id: string;
  userId: string;
  title: string;
  targetPerWeek: number;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  weekDoneCount?: number;
};

export type HabitLog = {
  id: string;
  habitId: string;
  day: string;
  completed: boolean;
};

export type CalendarDay = {
  date: string;
  tasks: Task[];
};

export type GanttItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: TaskStatus;
  projectName?: string | null;
};

export type WeeklyReview = {
  id: string;
  userId?: string | null;
  teamId?: string | null;
  type: 'personal' | 'team';
  weekStart: string;
  weekEnd: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  rawStats: Record<string, unknown>;
  createdAt: string;
};
