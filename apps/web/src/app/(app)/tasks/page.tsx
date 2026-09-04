import type { Task, TaskWithPeople } from '@todon/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUserId } from '@/lib/auth/session';
import { getValidatedServerAppScope } from '@/lib/scope-server';
import { listTasks } from '@/server/tasks';
import { listTeamTasks } from '@/server/team-tasks';
import { getTeamForUser } from '@/server/teams';

function TaskRow({ task, showAssignee }: { task: Task | TaskWithPeople; showAssignee?: boolean }) {
  const assignee = showAssignee && 'assignee' in task ? task.assignee : null;

  return (
    <li>
      <Link href={`/tasks/${task.id}`} className="todon-task-link">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-todon-ink">{task.title}</p>
          <span className="rounded-full bg-todon-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase text-todon-primary">
            {task.status}
          </span>
        </div>
        <p className="text-xs text-todon-ink-muted">
          重要度 {task.importance} / 緊急度 {task.urgency}
          {task.category ? ` / ${task.category.name}` : ''}
          {assignee?.name ? ` / 担当: ${assignee.name}` : ''}
          {task.dueAt ? ` / 期限 ${new Date(task.dueAt).toLocaleString('ja-JP')}` : ''}
        </p>
      </Link>
    </li>
  );
}

export default async function TasksPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const { scope } = await getValidatedServerAppScope(userId);
  const isTeam = scope.mode === 'team';

  let title = '個人タスク';
  let eyebrow = '個人';
  let tasks: (Task | TaskWithPeople)[] = [];
  let newTaskHref = '/tasks/new';

  if (isTeam) {
    const team = await getTeamForUser(userId, scope.teamId);
    tasks = await listTeamTasks(userId, scope.teamId, false);
    title = `${team.name} のタスク`;
    eyebrow = 'チーム';
    newTaskHref = `/tasks/new?teamId=${scope.teamId}`;
  } else {
    tasks = await listTasks(userId, false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="todon-eyebrow">{eyebrow}</p>
          <h1 className="todon-page-title">{title}</h1>
        </div>
        <Link href={newTaskHref} className="todon-btn-primary">
          新規作成
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="todon-muted">まだタスクがありません。上部のボタンから作成してください。</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} showAssignee={isTeam} />
          ))}
        </ul>
      )}
    </div>
  );
}
