import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUserId } from '@/lib/auth/session';
import { NotFoundError } from '@/lib/http';
import { getProject } from '@/server/projects';

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const { id } = await params;

  let project;

  try {
    project = await getProject(userId, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="todon-link text-sm">
          ← プロジェクト一覧
        </Link>
        <h1 className="todon-page-title mt-2">{project.name}</h1>
        {project.description ? <p className="todon-muted">{project.description}</p> : null}
      </div>

      <Link
        href={
          project.scope === 'team' && project.teamId
            ? `/tasks/new?teamId=${project.teamId}&projectId=${project.id}`
            : `/tasks/new?projectId=${project.id}`
        }
        className="todon-btn-primary inline-block text-sm"
      >
        このプロジェクトにタスク追加
      </Link>

      <section className="space-y-3">
        <h2 className="font-extrabold text-todon-ink">タスク</h2>
        {project.tasks.length === 0 ? (
          <p className="todon-muted">タスクはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {project.tasks.map((task) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}`} className="todon-task-link">
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
