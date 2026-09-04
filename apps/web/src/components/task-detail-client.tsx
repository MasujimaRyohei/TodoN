'use client';

import type { RepeatType, SubTask, Task, TaskWithPeople, TeamMember } from '@todon/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { RepeatFields } from '@/components/repeat-fields';
import { TaskCollaboration } from '@/components/task-collaboration';

type Props = {
  task: TaskWithPeople;
  members?: TeamMember[];
};

const statusLabels: Record<Task['status'], string> = {
  todo: '未着手',
  doing: '着手中',
  done: '完了',
  pending: '保留',
  canceled: '中止',
};

export function TaskDetailClient({ task: initial, members = [] }: Props) {
  const router = useRouter();
  const [task, setTask] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [status, setStatus] = useState<Task['status']>(initial.status);
  const [importance, setImportance] = useState(initial.importance);
  const [urgency, setUrgency] = useState(initial.urgency);
  const [weight, setWeight] = useState(initial.weight);
  const [dueType, setDueType] = useState(initial.dueType);
  const [dueAt, setDueAt] = useState(
    initial.dueAt ? new Date(initial.dueAt).toISOString().slice(0, 16) : '',
  );
  const [repeatType, setRepeatType] = useState<RepeatType>(initial.repeatType);
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(initial.repeatIntervalDays ?? 7);
  const [flexibleMinDays, setFlexibleMinDays] = useState(initial.flexibleMinDays ?? 2);
  const [flexibleMaxDays, setFlexibleMaxDays] = useState(initial.flexibleMaxDays ?? 4);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const archived = Boolean(task.archivedAt);

  const progress = useMemo(() => {
    const subs = task.subtasks ?? [];
    if (subs.length === 0) {
      return null;
    }
    const done = subs.filter((s) => s.completed).length;
    return Math.round((done / subs.length) * 100);
  }, [task.subtasks]);

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          status,
          importance,
          urgency,
          weight,
          dueType,
          ...(dueType === 'datetime' && dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
          ...(dueType !== 'datetime' ? { dueAt: null } : {}),
          repeatType,
          repeatIntervalDays: repeatType === 'fixed' ? repeatIntervalDays : null,
          flexibleMinDays: repeatType === 'flexible' ? flexibleMinDays : null,
          flexibleMaxDays: repeatType === 'flexible' ? flexibleMaxDays : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '更新に失敗しました');
      }

      const next = await res.json();
      setTask(next);
      setMessage('保存しました');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function onSkipFlexible() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${task.id}/skip-flexible`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'スキップに失敗しました');
      }

      const next = await res.json();
      setTask(next);
      setMessage('今日はスキップしました（カウント +1）');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'スキップに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function onArchive() {
    if (!confirm('このタスクをアーカイブしますか？')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/archive`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'アーカイブに失敗しました');
      }

      router.push('/archive');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アーカイブに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!confirm('削除すると元に戻せません。よろしいですか？')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '削除に失敗しました');
      }

      router.push('/archive');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function addSubtask() {
    if (!subtaskTitle.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: subtaskTitle.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '追加に失敗しました');
      }

      const subtask = await res.json();
      setTask({
        ...task,
        subtasks: [...(task.subtasks ?? []), subtask as SubTask],
      });
      setSubtaskTitle('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '追加に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSubtask(sub: SubTask) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subtasks/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed: !sub.completed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '更新に失敗しました');
      }

      const updated = await res.json();
      setTask({
        ...task,
        subtasks: (task.subtasks ?? []).map((s) => (s.id === sub.id ? (updated as SubTask) : s)),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="todon-link">
            ← 一覧へ
          </Link>
          {initial.scope === 'team' && initial.teamId ? (
            <Link href={`/teams/${initial.teamId}`} className="text-sm todon-link hover:underline">
              チームへ
            </Link>
          ) : null}
        </div>
        {archived ? (
          <span className="rounded-full bg-amber-900/40 px-3 py-1 text-xs text-amber-200">
            アーカイブ済み
          </span>
        ) : null}
      </div>

      <div className="space-y-4 todon-card p-6">
        <div className="space-y-2">
          <label className="todon-label">タイトル</label>
          <input
            value={title}
            disabled={archived}
            onChange={(e) => setTitle(e.target.value)}
            className="todon-input disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="todon-label">詳細</label>
          <textarea
            value={description}
            disabled={archived}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="todon-input disabled:opacity-50"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="todon-label">ステータス</label>
            <select
              value={status}
              disabled={archived}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              className="todon-input disabled:opacity-50"
            >
              {(Object.keys(statusLabels) as Task['status'][]).map((key) => (
                <option key={key} value={key}>
                  {statusLabels[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="todon-label">期日タイプ</label>
            <select
              value={dueType}
              disabled={archived}
              onChange={(e) => setDueType(e.target.value as Task['dueType'])}
              className="todon-input disabled:opacity-50"
            >
              <option value="none">なし</option>
              <option value="datetime">日時指定</option>
              <option value="anytime">いつでも</option>
              <option value="flexible">だいたい</option>
            </select>
          </div>

          {dueType === 'datetime' ? (
            <div className="space-y-2">
              <label className="todon-label">期限</label>
              <input
                type="datetime-local"
                disabled={archived}
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="todon-input disabled:opacity-50"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="todon-label">重要度</label>
            <select
              value={importance}
              disabled={archived}
              onChange={(e) => setImportance(e.target.value as Task['importance'])}
              className="todon-input disabled:opacity-50"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="todon-label">緊急度</label>
            <select
              value={urgency}
              disabled={archived}
              onChange={(e) => setUrgency(e.target.value as Task['urgency'])}
              className="todon-input disabled:opacity-50"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="todon-label">重さ</label>
            <select
              value={weight}
              disabled={archived}
              onChange={(e) => setWeight(e.target.value as Task['weight'])}
              className="todon-input disabled:opacity-50"
            >
              <option value="light">軽い</option>
              <option value="normal">普通</option>
              <option value="heavy">重い</option>
            </select>
          </div>
        </div>

        {!archived ? (
          <RepeatFields
            repeatType={repeatType}
            onRepeatTypeChange={setRepeatType}
            repeatIntervalDays={repeatIntervalDays}
            onRepeatIntervalDaysChange={setRepeatIntervalDays}
            flexibleMinDays={flexibleMinDays}
            onFlexibleMinDaysChange={setFlexibleMinDays}
            flexibleMaxDays={flexibleMaxDays}
            onFlexibleMaxDaysChange={setFlexibleMaxDays}
          />
        ) : null}

        {task.lastCompletedAt ? (
          <p className="text-xs text-todon-ink-muted">
            最終完了: {new Date(task.lastCompletedAt).toLocaleString('ja-JP')}
            {task.flexibleSkipCount ? ` / スキップ ${task.flexibleSkipCount} 回` : ''}
          </p>
        ) : null}

        {repeatType !== 'none' ? (
          <p className="text-xs text-todon-ink-muted">
            完了にするとリピートタスクは未着手に戻り、次の周期が始まります。
          </p>
        ) : null}

        {progress !== null ? (
          <p className="text-sm text-emerald-300">サブタスク進捗: {progress}%</p>
        ) : null}

        {message ? <p className="todon-link">{message}</p> : null}
        {error ? <p className="todon-error">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={archived || loading}
            onClick={() => void save()}
            className="todon-btn-primary disabled:opacity-50"
          >
            変更を保存
          </button>
          {repeatType === 'flexible' && !archived ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void onSkipFlexible()}
              className="todon-btn-ghost px-4 py-2 todon-label transition hover:bg-todon-sky-soft disabled:opacity-50"
            >
              今日はスキップ
            </button>
          ) : null}
          <button
            type="button"
            disabled={archived || loading}
            onClick={() => void onArchive()}
            className="todon-btn-ghost border-todon-yellow px-4 py-2 text-sm text-amber-800 transition hover:bg-amber-900/30 disabled:opacity-50"
          >
            アーカイブ
          </button>
          <button
            type="button"
            disabled={!archived || loading}
            onClick={() => void onDelete()}
            className="todon-btn-ghost border-rose-300 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-900/30 disabled:opacity-50"
          >
            削除（アーカイブ済みのみ）
          </button>
        </div>
      </div>

      <div className="space-y-3 todon-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-todon-ink">サブタスク</h2>
            <p className="text-xs text-todon-ink-muted">小さなステップに分けて進捗を可視化します</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={subtaskTitle}
            disabled={archived}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            placeholder="新しいサブタスク"
            className="todon-input flex-1 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={archived || loading}
            onClick={() => void addSubtask()}
            className="todon-btn-primary transition hover:bg-white disabled:opacity-50"
          >
            追加
          </button>
        </div>

        <ul className="space-y-2">
          {(task.subtasks ?? []).map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
            >
              <label className="flex flex-1 items-center gap-2 text-sm text-todon-ink">
                <input
                  type="checkbox"
                  disabled={archived || loading}
                  checked={sub.completed}
                  onChange={() => void toggleSubtask(sub)}
                />
                <span className={sub.completed ? 'line-through text-todon-ink-muted' : ''}>
                  {sub.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <TaskCollaboration task={task} members={members} />
    </div>
  );
}
