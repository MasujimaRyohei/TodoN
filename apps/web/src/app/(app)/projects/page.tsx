import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUserId } from '@/lib/auth/session';
import { getValidatedServerAppScope } from '@/lib/scope-server';
import { teamDisplayIcon } from '@/lib/scope-preferences';
import { listProjects } from '@/server/projects';
import { getTeamForUser } from '@/server/teams';

export default async function ProjectsPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const { scope } = await getValidatedServerAppScope(userId);
  const isTeam = scope.mode === 'team';

  let team = null;
  if (isTeam) {
    team = await getTeamForUser(userId, scope.teamId);
  }

  const projects = await listProjects(userId, scope);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="todon-eyebrow">{isTeam ? 'チーム' : '個人'}</p>
          <h1 className="todon-page-title">
            {isTeam ? (
              <>
                {team?.name} のプロジェクト
                <span className="ml-2 text-2xl" aria-hidden>
                  {teamDisplayIcon({ name: team?.name ?? 'T', icon: team?.icon })}
                </span>
              </>
            ) : (
              <>プロジェクト 📁</>
            )}
          </h1>
        </div>
        <Link
          href={isTeam ? `/projects/new?teamId=${scope.teamId}` : '/projects/new'}
          className="todon-btn-primary text-sm"
        >
          新規プロジェクト
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="todon-muted">
          {isTeam
            ? 'チームのプロジェクトを作ってタスクをまとめましょう'
            : 'プロジェクトを作ってタスクをまとめましょう'}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="todon-card block p-5 transition hover:border-todon-sky"
              >
                <p className="font-extrabold text-todon-ink">{p.name}</p>
                <p className="text-xs text-todon-ink-muted">タスク {p.taskCount ?? 0} 件</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
