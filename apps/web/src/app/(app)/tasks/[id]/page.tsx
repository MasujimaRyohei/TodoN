import { roleMeetsMinimum } from '@todon/shared';
import { notFound, redirect } from 'next/navigation';

import { TaskDetailClient } from '@/components/task-detail-client';
import { getCurrentUserId } from '@/lib/auth/session';
import { NotFoundError } from '@/lib/http';
import { getTask } from '@/server/tasks';
import { getTeamForUser, listTeamMembers } from '@/server/teams';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: Props) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const { id } = await params;

  let task;

  try {
    task = await getTask(userId, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const teamId = task.scope === 'team' ? (task.teamId ?? null) : null;
  const members = teamId ? await listTeamMembers(userId, teamId) : [];
  const team = teamId ? await getTeamForUser(userId, teamId) : null;
  const canSetPoints = team ? roleMeetsMinimum(team.myRole, team.mainTaskCreateRole) : true;

  return <TaskDetailClient task={task} members={members} canSetPoints={canSetPoints} />;
}
