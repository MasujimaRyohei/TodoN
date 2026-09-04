'use client';

import type { CalendarDay } from '@todon/shared';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function monthRange(base: Date) {
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 23, 59, 59));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function CalendarClient() {
  const [cursor, setCursor] = useState(() => new Date());
  const [days, setDays] = useState<CalendarDay[]>([]);

  const label = useMemo(
    () => `${cursor.getUTCFullYear()}年 ${cursor.getUTCMonth() + 1}月`,
    [cursor],
  );

  useEffect(() => {
    const { start, end } = monthRange(cursor);
    void fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data: CalendarDay[]) => setDays(data))
      .catch(() => setDays([]));
  }, [cursor]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="todon-btn-ghost"
          onClick={() =>
            setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1)))
          }
        >
          ← 前月
        </button>
        <p className="font-extrabold text-todon-ink">{label}</p>
        <button
          type="button"
          className="todon-btn-ghost"
          onClick={() =>
            setCursor(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)))
          }
        >
          翌月 →
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {days.map((day) => (
          <div key={day.date} className="todon-card min-h-[88px] p-3">
            <p className="text-xs font-bold text-todon-ink-muted">{day.date.slice(5)}</p>
            {day.tasks.length === 0 ? (
              <p className="mt-1 text-xs text-todon-ink-muted">—</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {day.tasks.slice(0, 3).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-xs font-semibold text-todon-primary hover:underline"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
                {day.tasks.length > 3 ? (
                  <li className="text-[10px] text-todon-ink-muted">+{day.tasks.length - 3}</li>
                ) : null}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
