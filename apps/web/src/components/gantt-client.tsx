'use client';

import type { GanttItem } from '@todon/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function weekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 3);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 14);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function GanttClient() {
  const [items, setItems] = useState<GanttItem[]>([]);

  useEffect(() => {
    const { start, end } = weekRange();
    void fetch(`/api/gantt?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const rangeStart = new Date(weekRange().start).getTime();
  const rangeEnd = new Date(weekRange().end).getTime();
  const span = rangeEnd - rangeStart || 1;

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="todon-muted">表示できるスケジュール付きタスクがありません</p>
      ) : (
        items.map((item) => {
          const left = ((new Date(item.start).getTime() - rangeStart) / span) * 100;
          const width = Math.max(
            8,
            ((new Date(item.end).getTime() - new Date(item.start).getTime()) / span) * 100,
          );

          return (
            <div key={item.id} className="todon-card p-3">
              <div className="mb-2 flex justify-between gap-2 text-sm">
                <Link
                  href={`/tasks/${item.id}`}
                  className="font-bold text-todon-ink hover:text-todon-primary"
                >
                  {item.title}
                </Link>
                <span className="text-xs text-todon-ink-muted">{item.status}</span>
              </div>
              <div className="relative h-6 rounded-full bg-todon-sky-soft">
                <div
                  className="absolute top-0 h-6 rounded-full bg-gradient-to-r from-todon-sky to-todon-primary"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              {item.projectName ? (
                <p className="mt-1 text-xs text-todon-ink-muted">📁 {item.projectName}</p>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
