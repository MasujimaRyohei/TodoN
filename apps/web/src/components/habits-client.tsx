'use client';

import type { Habit } from '@todon/shared';
import { useEffect, useState } from 'react';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function HabitsClient() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(3);
  const today = todayKey();

  async function load() {
    const res = await fetch('/api/habits', { credentials: 'include' });
    setHabits(await res.json());
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  async function create() {
    if (!title.trim()) {
      return;
    }

    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, targetPerWeek: target }),
    });

    setTitle('');
    await load();
  }

  async function toggle(habitId: string) {
    await fetch(`/api/habits/${habitId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ day: today }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <form
        className="todon-card todon-card-mint flex flex-wrap gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <input
          className="todon-input min-w-[200px] flex-1"
          placeholder="例: ストレッチ 5分"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="todon-input w-32"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              週{n}回
            </option>
          ))}
        </select>
        <button type="submit" className="todon-btn-primary">
          追加
        </button>
      </form>

      <ul className="space-y-3">
        {habits.length === 0 ? (
          <li className="todon-muted">習慣はまだありません</li>
        ) : (
          habits.map((h) => (
            <li
              key={h.id}
              className="todon-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-bold text-todon-ink">{h.title}</p>
                <p className="text-xs text-todon-ink-muted">
                  今週 {h.weekDoneCount ?? 0} / {h.targetPerWeek} 回
                </p>
              </div>
              <button type="button" className="todon-btn-ghost" onClick={() => void toggle(h.id)}>
                今日やった ✓
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
