'use client';

import type { TaskActivityLog, TaskComment, TaskWithPeople, TeamMember } from '@todon/shared';
import { useEffect, useState } from 'react';

type Props = {
  task: TaskWithPeople;
  members: TeamMember[];
};

export function TaskCollaboration({ task, members }: Props) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivityLog[]>([]);
  const [body, setBody] = useState('');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [commentsRes, activityRes] = await Promise.all([
          fetch(`/api/tasks/${task.id}/comments`, { credentials: 'include' }),
          fetch(`/api/tasks/${task.id}/activity`, { credentials: 'include' }),
        ]);

        if (!commentsRes.ok || !activityRes.ok) {
          return;
        }

        const [commentsData, activityData] = await Promise.all([
          commentsRes.json() as Promise<TaskComment[]>,
          activityRes.json() as Promise<TaskActivityLog[]>,
        ]);

        if (!cancelled) {
          setComments(commentsData);
          setActivity(activityData);
        }
      } catch {
        // ignore
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function postComment(evt: React.FormEvent) {
    evt.preventDefault();
    if (!body.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: body.trim() }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message ?? '投稿に失敗しました');
      }

      const created = (await res.json()) as TaskComment;
      setComments((prev) => [...prev, created]);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignee() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assigneeId: assigneeId || null }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error((payload as { message?: string }).message ?? '担当者の更新に失敗しました');
      }

      const activityRes = await fetch(`/api/tasks/${task.id}/activity`, { credentials: 'include' });
      if (activityRes.ok) {
        setActivity((await activityRes.json()) as TaskActivityLog[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '担当者の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (task.scope !== 'team') {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-5">
        <h2 className="text-lg font-extrabold text-todon-ink">チーム情報</h2>
        <p className="mt-1 text-xs text-todon-ink-muted">
          オーナー: {task.owner?.name ?? task.owner?.email ?? '—'}
          {task.assignee
            ? ` / 担当: ${task.assignee.name ?? task.assignee.email}`
            : ' / 担当: 未割当'}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="todon-label">担当者</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="todon-input"
            >
              <option value="">未割当</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name ?? m.user?.email ?? m.userId}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void saveAssignee()}
            className="todon-btn-ghost border-todon-lavender px-4 py-2 text-sm text-todon-lavender disabled:opacity-50"
          >
            担当を更新
          </button>
        </div>
      </section>

      <section className="space-y-3 todon-card p-5">
        <h2 className="text-lg font-extrabold text-todon-ink">コメント</h2>
        <ul className="space-y-3">
          {comments.length === 0 ? (
            <li className="todon-muted">コメントはまだありません</li>
          ) : (
            comments.map((comment) => (
              <li key={comment.id} className="todon-card px-3 py-2">
                <p className="text-xs text-todon-ink-muted">
                  {comment.user?.name ?? comment.user?.email ?? 'ユーザー'} ·{' '}
                  {new Date(comment.createdAt).toLocaleString('ja-JP')}
                </p>
                <p className="mt-1 text-sm text-todon-ink">{comment.body}</p>
              </li>
            ))
          )}
        </ul>

        <form onSubmit={(e) => void postComment(e)} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="コメントを書く"
            className="todon-input"
          />
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="todon-btn-primary disabled:opacity-50"
          >
            投稿
          </button>
        </form>
      </section>

      <section className="space-y-3 todon-card p-5">
        <h2 className="text-lg font-extrabold text-todon-ink">履歴</h2>
        {activity.length === 0 ? (
          <p className="todon-muted">履歴はまだありません</p>
        ) : (
          <ul className="space-y-2 text-sm text-todon-ink-muted">
            {activity.map((log) => (
              <li key={log.id} className="border-b border-todon-border pb-2">
                <span className="text-todon-ink-muted">
                  {new Date(log.createdAt).toLocaleString('ja-JP')}
                </span>
                {' · '}
                <span>{log.user?.name ?? log.user?.email ?? 'ユーザー'}</span>
                {' · '}
                <span>{log.action}</span>
                {log.before || log.after ? (
                  <span className="text-todon-ink-muted">
                    {' '}
                    ({log.before ?? '—'} → {log.after ?? '—'})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="todon-error">{error}</p> : null}
    </div>
  );
}
