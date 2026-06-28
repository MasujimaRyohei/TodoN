'use client';

import type { FlexibleTaskView, Task, TaskWithPeople } from '@todon/shared';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { readHideEmptySections, writeHideEmptySections } from '@/lib/dashboard-preferences';

type PanelData = {
  myTeamTasks: TaskWithPeople[];
  todayFlexible: FlexibleTaskView[];
  notificationCandidates: Task[];
  overdue: Task[];
  dueToday: Task[];
  dueSoon: Task[];
  inProgress: Task[];
  highPriorityOpen: Task[];
  stalledPending: Task[];
};

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="todon-muted">該当タスクはありません</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
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
              {task.dueAt ? ` / 期限 ${new Date(task.dueAt).toLocaleString('ja-JP')}` : ''}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FlexibleList({ tasks }: { tasks: FlexibleTaskView[] }) {
  if (tasks.length === 0) {
    return <p className="todon-muted">今日はだいたいリピートの表示候補がありません</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link href={`/tasks/${task.id}`} className="todon-task-link border-todon-mint bg-todon-mint-soft/40">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-todon-ink">{task.title}</p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-todon-mint">
                {task.flexiblePriority}
              </span>
            </div>
            <p className="text-xs text-todon-ink-muted">{task.flexibleReason}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TeamTaskList({ tasks }: { tasks: TaskWithPeople[] }) {
  if (tasks.length === 0) {
    return <p className="todon-muted">担当中のチームタスクはありません</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link href={`/tasks/${task.id}`} className="todon-task-link">
            <p className="font-bold text-todon-ink">{task.title}</p>
            <p className="text-xs text-todon-ink-muted">
              {task.status}
              {task.assignee?.name ? ` / 担当: ${task.assignee.name}` : ''}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="todon-section space-y-3 p-4">
      <div>
        <h2 className="text-sm font-extrabold text-todon-ink">{title}</h2>
        <p className="text-xs text-todon-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function HideEmptyToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="todon-section flex flex-wrap items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm font-extrabold text-todon-ink">空のセクションを非表示</p>
        <p className="text-xs text-todon-ink-muted">タスクがない枠を隠して、見る場所を絞り込みます</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`min-w-[2.5rem] text-center text-xs font-extrabold ${
            enabled ? 'text-todon-primary' : 'text-todon-ink-muted'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="空のセクションを非表示"
          onClick={() => onChange(!enabled)}
          className={`relative h-9 w-16 shrink-0 rounded-full border transition-colors ${
            enabled ? 'border-todon-primary bg-todon-primary' : 'border-stone-300 bg-stone-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function DashboardTaskBoard({
  scopeMode = 'personal',
  data,
  footer,
}: {
  scopeMode?: 'personal' | 'team';
  data: PanelData;
  footer?: ReactNode;
}) {
  const isTeam = scopeMode === 'team';
  const [hideEmpty, setHideEmpty] = useState(true);

  useEffect(() => {
    setHideEmpty(readHideEmptySections());
  }, []);

  function onToggleHideEmpty(next: boolean) {
    setHideEmpty(next);
    writeHideEmptySections(next);
  }

  const show = <T,>(tasks: T[]) => !hideEmpty || tasks.length > 0;

  const gridSections = [
    { key: 'overdue', title: '期限切れ', description: 'すぐに手を付けたいタスク', tasks: data.overdue },
    { key: 'dueToday', title: '今日が期限', description: '今日中に片付けたいタスク', tasks: data.dueToday },
    {
      key: 'dueSoon',
      title: '近日中の期限（7日以内）',
      description: 'そろそろ着手しておきたいタスク',
      tasks: data.dueSoon,
    },
    { key: 'inProgress', title: '着手中', description: '今まさに進めているもの', tasks: data.inProgress },
    {
      key: 'highPriorityOpen',
      title: '重要度が高い未完了',
      description: '放置しすぎないようチェック',
      tasks: data.highPriorityOpen,
    },
    {
      key: 'stalledPending',
      title: '長引いている保留',
      description: '1週間以上更新が止まっている保留',
      tasks: data.stalledPending,
    },
  ].filter((section) => show(section.tasks));

  return (
    <div className="space-y-4">
      {show(data.myTeamTasks) ? (
        <Section
          title={isTeam ? '自分の担当タスク' : '担当のチームタスク'}
          description={isTeam ? 'このチームで自分が担当している未完了タスク' : '自分が担当している未完了タスク'}
        >
          <TeamTaskList tasks={data.myTeamTasks} />
        </Section>
      ) : null}

      {!isTeam && show(data.todayFlexible) ? (
        <Section title="だいたいリピート（今日）" description="周期とキャパシティから算出">
          <FlexibleList tasks={data.todayFlexible} />
        </Section>
      ) : null}

      {show(data.notificationCandidates) ? (
        <Section title="通知候補（控えめ）" description="押しすぎないよう最大5件まで">
          <TaskList tasks={data.notificationCandidates} />
        </Section>
      ) : null}

      {gridSections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {gridSections.map((section) => (
            <Section key={section.key} title={section.title} description={section.description}>
              <TaskList tasks={section.tasks} />
            </Section>
          ))}
        </div>
      ) : null}

      {footer}

      <HideEmptyToggle enabled={hideEmpty} onChange={onToggleHideEmpty} />
    </div>
  );
}
