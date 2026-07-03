'use client';

import type { TaskWithPeople, Team, TeamMember } from '@todon/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TEAM_ICON_PRESETS } from '@/lib/team-icon-presets';
import { persistAppScope, teamDisplayIcon } from '@/lib/scope-preferences';

type Props = {
  team: Team;
  members: TeamMember[];
  tasks: TaskWithPeople[];
};

const roleLabels = { owner: 'オーナー', admin: '管理者', member: 'メンバー' } as const;

export function TeamDetailClient({ team, members: initialMembers, tasks: initialTasks }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [tasks] = useState(initialTasks);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamIcon, setTeamIcon] = useState(team.icon ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canAdmin = team.myRole === 'owner' || team.myRole === 'admin';

  async function onInvite(evt: React.FormEvent) {
    evt.preventDefault();
    if (!canAdmin) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '招待に失敗しました');
      }

      const body = (await res.json()) as { type: string; member?: TeamMember; invite?: { token: string } };

      if (body.type === 'member' && body.member) {
        setMembers((prev) => [...prev, body.member!]);
        setMessage(`${inviteEmail} をメンバーに追加しました`);
      } else {
        setMessage(`招待リンクを発行しました（未登録ユーザー向け）`);
      }

      setInviteEmail('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '招待に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function onSaveIcon(nextIcon: string) {
    if (!canAdmin) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icon: nextIcon || null }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'アイコンの更新に失敗しました');
      }

      const updated = (await res.json()) as Team;
      setTeamIcon(updated.icon ?? '');
      persistAppScope({
        mode: 'team',
        teamId: team.id,
        teamName: team.name,
        teamIcon: updated.icon,
      });
      setMessage('チームアイコンを更新しました');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アイコンの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function onTeamReview() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/teams/${team.id}/reviews`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '振り返りの生成に失敗しました');
      }

      setMessage('チーム週次振り返りを生成しました。振り返りページで確認できます。');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="todon-eyebrow">v2 · チーム</p>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white text-2xl">
              {teamDisplayIcon({ name: team.name, icon: teamIcon })}
            </span>
            <h1 className="todon-page-title">{team.name}</h1>
          </div>
          <p className="mt-1 text-xs text-todon-ink-muted">
            あなたのロール: {team.myRole ? roleLabels[team.myRole] : '—'} / メンバー {team.memberCount ?? members.length} 人
          </p>
        </div>
        <Link href="/teams" className="todon-link">
          一覧へ
        </Link>
      </div>

      {message ? <p className="todon-link">{message}</p> : null}
      {error ? <p className="todon-error">{error}</p> : null}

      {canAdmin ? (
        <section className="todon-section space-y-3 p-4">
          <h2 className="text-sm font-extrabold text-todon-ink">チームアイコン</h2>
          <p className="text-xs text-todon-ink-muted">画面左の切り替えボタンに表示されます</p>
          <div className="flex flex-wrap gap-2">
            {TEAM_ICON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={loading}
                onClick={() => void onSaveIcon(preset)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                  teamIcon === preset
                    ? 'border-todon-primary bg-todon-primary-soft'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 todon-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold text-todon-ink">チームタスク</h2>
          <Link
            href={`/tasks/new?teamId=${team.id}`}
            className="todon-btn-primary text-xs"
          >
            タスクを追加
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p className="todon-muted">チームタスクはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="block rounded-xl border-2 border-todon-border bg-white px-4 py-3 hover:border-todon-sky"
                >
                  <p className="font-bold text-todon-ink">{task.title}</p>
                  <p className="text-xs text-todon-ink-muted">
                    {task.status}
                    {task.assignee?.name ? ` / 担当: ${task.assignee.name}` : ' / 未割当'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 todon-card p-5">
        <h2 className="text-lg font-extrabold text-todon-ink">メンバー</h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 todon-card px-3 py-2 text-sm"
            >
              <span className="text-todon-ink">{member.user?.name ?? member.user?.email ?? member.userId}</span>
              <span className="text-xs text-todon-ink-muted">{roleLabels[member.role]}</span>
            </li>
          ))}
        </ul>

        {canAdmin ? (
          <form onSubmit={(e) => void onInvite(e)} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="メールで招待"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="todon-input flex-1"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-emerald-700 px-4 py-2 text-sm text-emerald-100 disabled:opacity-50"
            >
              招待
            </button>
          </form>
        ) : null}
      </section>

      <section className="todon-card p-5">
        <h2 className="text-lg font-extrabold text-todon-ink">チーム振り返り</h2>
        <p className="mt-1 text-xs text-todon-ink-muted">今週のチームタスク状況から週次レポートを生成します</p>
        <button
          type="button"
          disabled={loading || !canAdmin}
          onClick={() => void onTeamReview()}
          className="mt-3 todon-btn-primary disabled:opacity-50"
        >
          今週のチーム振り返りを生成
        </button>
        {!canAdmin ? (
          <p className="mt-2 text-xs text-todon-ink-muted">生成はオーナー・管理者のみ可能です</p>
        ) : null}
        <Link href="/reviews" className="mt-3 inline-block todon-link">
          振り返り一覧へ →
        </Link>
      </section>
    </div>
  );
}
