import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { NewTaskForm } from '@/components/new-task-form';
import { getCurrentUserId } from '@/lib/auth/session';
import { getServerAppScope } from '@/lib/scope-server';
import { listCategories } from '@/server/categories';
import { listProjects } from '@/server/projects';
import { listTeamsForUser } from '@/server/teams';

export default async function NewTaskPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const scope = await getServerAppScope();

  const [categories, teams, projects] = await Promise.all([
    listCategories(userId),
    listTeamsForUser(userId),
    listProjects(userId, scope),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="todon-eyebrow">最小入力 + 詳細設定</p>
          <h1 className="todon-page-title">タスクを作成</h1>
        </div>
        <Link href="/tasks" className="todon-link">
          一覧へ戻る
        </Link>
      </div>
      <Suspense fallback={<p className="todon-muted">読み込み中…</p>}>
        <NewTaskForm categories={categories} teams={teams} projects={projects} />
      </Suspense>
    </div>
  );
}
