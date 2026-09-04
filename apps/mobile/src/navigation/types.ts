export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Teams: undefined;
  TeamCreate: undefined;
  TeamDetail: { teamId: string };
  JoinInvite: undefined;
  TaskCreate: { teamId?: string } | undefined;
  TaskDetail: { taskId: string };
};
