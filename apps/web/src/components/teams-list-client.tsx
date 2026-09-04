'use client';

import type { Team, TeamInvite } from '@todon/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { persistAppScope, readAppScope, teamDisplayIcon } from '@/lib/scope-preferences';

type Props = {
  initialTeams: Team[];
  invites: TeamInvite[];
};

const roleLabels = { owner: 'オーナー', admin: '管理者', member: 'メンバー' } as const;

export function TeamsListClient({ initialTeams, invites }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function persistOrder(nextTeams: Team[]) {
    setTeams(nextTeams);
    setError(null);

    const res = await fetch('/api/teams/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamIds: nextTeams.map((team) => team.id) }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { message?: string }).message ?? '並び替えに失敗しました');
    }

    router.refresh();
  }

  function moveTeam(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= teams.length) {
      return;
    }

    const next = [...teams];
    [next[index], next[target]] = [next[target], next[index]];

    setLoadingId('reorder');
    void persistOrder(next)
      .catch((e) => setError(e instanceof Error ? e.message : '並び替えに失敗しました'))
      .finally(() => setLoadingId(null));
  }

  async function onDelete(team: Team) {
    const isOwner = team.myRole === 'owner';
    const confirmed = window.confirm(
      isOwner
        ? `「${team.name}」を削除します。チーム内のタスクなどもすべて削除されます。`
        : `「${team.name}」から退出します。`,
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(team.id);
    setError(null);

    try {
      const res = await fetch(isOwner ? `/api/teams/${team.id}` : `/api/teams/${team.id}/leave`, {
        method: isOwner ? 'DELETE' : 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '操作に失敗しました');
      }

      const scope = readAppScope();
      if (scope?.mode === 'team' && scope.teamId === team.id) {
        persistAppScope({ mode: 'personal' });
      }

      setTeams((prev) => prev.filter((item) => item.id !== team.id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作に失敗しました');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="todon-eyebrow">v2 · チーム</p>
          <h1 className="todon-page-title">チーム一覧</h1>
          <p className="mt-1 text-sm text-todon-ink-muted">並び替え・追加・削除ができます</p>
        </div>
        <Link href="/teams/new" className="todon-btn-primary">
          チームを作成
        </Link>
      </div>

      {invites.length > 0 ? (
        <section className="todon-card todon-card-yellow p-4">
          <h2 className="text-sm font-semibold text-amber-900">保留中の招待</h2>
          <ul className="mt-3 space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-todon-ink">
                  {invite.teamName} への招待（{invite.email}）
                </span>
                <Link href={`/join?token=${invite.token}`} className="todon-link">
                  参加する
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="todon-error">{error}</p> : null}

      {teams.length === 0 ? (
        <p className="todon-muted">
          まだチームがありません。作成するか、招待を受け取ってください。
        </p>
      ) : (
        <ul className="space-y-3">
          {teams.map((team, index) => {
            const isOwner = team.myRole === 'owner';
            const busy = loadingId === team.id || loadingId === 'reorder';

            return (
              <li key={team.id} className="todon-card flex flex-wrap items-center gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`${team.name}を上へ`}
                    disabled={busy || index === 0}
                    onClick={() => moveTeam(index, -1)}
                    className="rounded-md px-2 py-0.5 text-xs text-todon-ink-muted hover:bg-stone-100 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`${team.name}を下へ`}
                    disabled={busy || index === teams.length - 1}
                    onClick={() => moveTeam(index, 1)}
                    className="rounded-md px-2 py-0.5 text-xs text-todon-ink-muted hover:bg-stone-100 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                <Link
                  href={`/teams/${team.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-xl">
                    {teamDisplayIcon(team)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-extrabold text-todon-ink">
                      {team.name}
                    </span>
                    <span className="text-xs text-todon-ink-muted">
                      {team.myRole ? roleLabels[team.myRole] : '—'} / メンバー{' '}
                      {team.memberCount ?? 1} 人
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(team)}
                  className="todon-btn-ghost px-3 py-2 text-xs text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  {isOwner ? '削除' : '退出'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
