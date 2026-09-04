import type { Task } from '@todon/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUserId } from '@/lib/auth/session';
import { listTasks } from '@/server/tasks';

function Row({ task }: { task: Task }) {
  return (
    <li className="todon-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/tasks/${task.id}`}
            className="text-sm font-semibold text-white hover:underline"
          >
            {task.title}
          </Link>
          <p className="text-xs text-todon-ink-muted">
            {task.status} / {task.importance} / {task.urgency}
          </p>
        </div>
        <p className="text-xs text-amber-200">
          {task.archivedAt ? new Date(task.archivedAt).toLocaleString('ja-JP') : ''}
        </p>
      </div>
    </li>
  );
}

export default async function ArchivePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const tasks = await listTasks(userId, true);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-amber-300">安全な削除の前段階</p>
        <h1 className="todon-page-title">アーカイブ</h1>
        <p className="todon-muted">
          仕様どおり、通常一覧からの直接削除はできません。アーカイブ後にのみ削除できます。
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-todon-ink-muted">アーカイブされたタスクはまだありません。</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <Row key={task.id} task={task} />
          ))}
        </ul>
      )}

      <Link href="/tasks" className="todon-link">
        アクティブなタスクへ戻る
      </Link>
    </div>
  );
}
