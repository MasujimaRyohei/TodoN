'use client';

import type { Category, Project, RepeatType, TaskWeight, Team } from '@todon/shared';
import { pointsFromWeight, roleMeetsMinimum } from '@todon/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { RepeatFields } from '@/components/repeat-fields';
import { VoiceInputButton } from '@/components/voice-input-button';

type Props = {
  categories: Category[];
  teams: Team[];
  projects: Project[];
};

export function NewTaskForm({ categories, teams, projects }: Props) {
  const searchParams = useSearchParams();
  const initialTeamId = searchParams.get('teamId') ?? '';
  const initialProjectId = searchParams.get('projectId') ?? '';
  const initialTitle = searchParams.get('title') ?? '';
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [dueType, setDueType] = useState<'none' | 'datetime' | 'anytime'>('none');
  const [dueAt, setDueAt] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('medium');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [weight, setWeight] = useState<TaskWeight>('normal');
  const [pointsInput, setPointsInput] = useState<number | null>(null);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState(7);
  const [flexibleMinDays, setFlexibleMinDays] = useState(2);
  const [flexibleMaxDays, setFlexibleMaxDays] = useState(4);
  const [scope, setScope] = useState<'personal' | 'team'>(initialTeamId ? 'team' : 'personal');
  const [teamId, setTeamId] = useState(initialTeamId);
  const [assigneeId, setAssigneeId] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ userId: string; label: string }[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [startAt, setStartAt] = useState('');
  const [categoryHint, setCategoryHint] = useState<string | null>(null);
  const [subtaskHints, setSubtaskHints] = useState<string[]>([]);
  const [applySubtasks, setApplySubtasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scope !== 'team' || !teamId) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/teams/${teamId}/members`, { credentials: 'include' })
      .then((res) => res.json())
      .then((rows: { userId: string; user?: { name?: string | null; email?: string } }[]) => {
        if (cancelled) {
          return;
        }

        setTeamMembers(
          rows.map((m) => ({
            userId: m.userId,
            label: m.user?.name ?? m.user?.email ?? m.userId,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setTeamMembers([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scope, teamId]);

  useEffect(() => {
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      void fetch(`/api/tasks/estimate-weight?title=${encodeURIComponent(trimmed)}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((body: { weight?: TaskWeight }) => {
          if (body.weight) {
            setWeight(body.weight);
          }
        })
        .catch(() => undefined);
    }, 400);

    return () => clearTimeout(timer);
  }, [title]);

  const points = pointsInput ?? pointsFromWeight(weight);

  const selectedTeam = scope === 'team' ? teams.find((t) => t.id === teamId) : undefined;
  const canCreateTeamMainTask =
    !selectedTeam || roleMeetsMinimum(selectedTeam.myRole, selectedTeam.mainTaskCreateRole);

  const duePayload = useMemo(() => {
    if (dueType !== 'datetime' || !dueAt) {
      return {
        dueType: dueType === 'datetime' ? 'none' : dueType,
        dueAt: undefined as string | undefined,
      };
    }

    return { dueType: 'datetime' as const, dueAt: new Date(dueAt).toISOString() };
  }, [dueAt, dueType]);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          importance,
          urgency,
          weight,
          points,
          scope,
          ...(scope === 'team' ? { teamId, assigneeId: assigneeId || undefined } : {}),
          ...(scope === 'personal' && projectId ? { projectId } : {}),
          ...(startAt ? { startAt: new Date(startAt).toISOString() } : {}),
          categoryId: categoryId || undefined,
          dueType: repeatType === 'flexible' ? 'flexible' : duePayload.dueType,
          ...(duePayload.dueAt ? { dueAt: duePayload.dueAt } : {}),
          repeatType,
          ...(repeatType === 'fixed' ? { repeatIntervalDays } : {}),
          ...(repeatType === 'flexible' ? { flexibleMinDays, flexibleMaxDays } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '作成に失敗しました');
      }

      const task = (await res.json()) as { id: string };

      if (applySubtasks && subtaskHints.length > 0) {
        await Promise.all(
          subtaskHints.map((st) =>
            fetch(`/api/tasks/${task.id}/subtasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ title: st }),
            }),
          ),
        );
      }

      router.push(`/tasks/${task.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6 todon-card p-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="todon-label">タイトル（必須）</label>
          <div className="flex gap-2">
            <VoiceInputButton
              onText={(text) => setTitle((prev) => (prev ? `${prev} ${text}` : text))}
            />
            <button
              type="button"
              className="todon-btn-ghost text-xs"
              onClick={() => {
                void fetch(`/api/tasks/suggest-category?title=${encodeURIComponent(title)}`, {
                  credentials: 'include',
                })
                  .then((r) => r.json())
                  .then((body: { name: string; reason: string }) => {
                    setCategoryHint(`${body.name}（${body.reason}）`);
                    const match = categories.find((c) => c.name === body.name);
                    if (match) {
                      setCategoryId(match.id);
                    }
                  });
              }}
            >
              カテゴリ推定
            </button>
            <button
              type="button"
              className="todon-btn-ghost text-xs"
              onClick={() => {
                void fetch('/api/tasks/suggest-subtasks', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ title }),
                })
                  .then((r) => r.json())
                  .then((body: { suggestions: string[] }) =>
                    setSubtaskHints(body.suggestions ?? []),
                  );
              }}
            >
              サブタスク案
            </button>
          </div>
        </div>
        <input
          className="todon-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {categoryHint ? <p className="text-xs text-todon-ink-muted">推定: {categoryHint}</p> : null}
        {subtaskHints.length > 0 ? (
          <div className="rounded-lg border border-todon-border bg-todon-yellow-soft/50 p-3 text-sm">
            <p className="font-bold text-todon-ink">サブタスク案</p>
            <ul className="mt-1 list-disc pl-5 text-todon-ink-muted">
              {subtaskHints.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={applySubtasks}
                onChange={(e) => setApplySubtasks(e.target.checked)}
              />
              作成時にサブタスクとして追加する
            </label>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="todon-label">詳細</label>
        <textarea
          className="todon-input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="todon-label">スコープ</label>
          <select
            className="todon-input"
            value={scope}
            onChange={(e) => {
              const next = e.target.value as 'personal' | 'team';
              setScope(next);
              if (next !== 'team') {
                setTeamId('');
                setAssigneeId('');
                setTeamMembers([]);
              }
            }}
          >
            <option value="personal">個人</option>
            <option value="team">チーム</option>
          </select>
        </div>

        {scope === 'team' ? (
          <>
            <div className="space-y-2">
              <label className="todon-label">チーム</label>
              <select
                className="todon-input"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setAssigneeId('');
                }}
                required
              >
                <option value="">選択してください</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="todon-label">担当者（任意）</label>
              <select
                className="todon-input"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">未割当</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {scope === 'personal' && projects.length > 0 ? (
          <div className="space-y-2">
            <label className="todon-label">プロジェクト</label>
            <select
              className="todon-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">なし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="todon-label">開始日時（ガント用・任意）</label>
          <input
            type="datetime-local"
            className="todon-input"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="todon-label">期日タイプ</label>
          <select
            className="todon-input"
            value={dueType}
            onChange={(e) => setDueType(e.target.value as typeof dueType)}
          >
            <option value="none">なし</option>
            <option value="datetime">日時指定</option>
            <option value="anytime">いつでも</option>
          </select>
        </div>

        {dueType === 'datetime' ? (
          <div className="space-y-2">
            <label className="todon-label">期限</label>
            <input
              type="datetime-local"
              className="todon-input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="todon-label">カテゴリ</label>
          <select
            className="todon-input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">なし</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="todon-label">重要度</label>
          <select
            className="todon-input"
            value={importance}
            onChange={(e) => setImportance(e.target.value as typeof importance)}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="todon-label">緊急度</label>
          <select
            className="todon-input"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as typeof urgency)}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="todon-label">タスクの重さ</label>
          <select
            className="todon-input"
            value={weight}
            onChange={(e) => setWeight(e.target.value as typeof weight)}
          >
            <option value="light">軽い</option>
            <option value="normal">普通</option>
            <option value="heavy">重い</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="todon-label">配点（ポイント）</label>
          <input
            type="number"
            min={0}
            max={999}
            className="todon-input"
            value={points}
            onChange={(e) =>
              setPointsInput(Math.max(0, Math.min(999, Number(e.target.value) || 0)))
            }
          />
          <p className="text-xs text-todon-ink-muted">
            重さの目安から自動設定。チームでは上長がタスクの持ち点を決めます。
          </p>
        </div>
      </div>

      {scope === 'team' && selectedTeam && !canCreateTeamMainTask ? (
        <p className="todon-error">
          このチームでメインタスクを作成する権限がありません（必要ロール:{' '}
          {selectedTeam.mainTaskCreateRole}）。
        </p>
      ) : null}

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

      {error ? <p className="todon-error">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || (scope === 'team' && !canCreateTeamMainTask)}
          className="todon-btn-primary disabled:opacity-50"
        >
          {loading ? '保存中…' : '作成する'}
        </button>
        <Link href="/tasks" className="todon-link">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
