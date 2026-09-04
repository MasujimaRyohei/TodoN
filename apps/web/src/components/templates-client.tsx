'use client';

import type { TaskTemplate } from '@todon/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function TemplatesClient() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');

  async function load() {
    const res = await fetch('/api/templates', { credentials: 'include' });
    setTemplates(await res.json());
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  async function create() {
    if (!name.trim() || !title.trim()) {
      return;
    }

    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name,
        payload: { title, importance: 'medium', urgency: 'medium', weight: 'normal' },
      }),
    });

    setName('');
    setTitle('');
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE', credentials: 'include' });
    await load();
  }

  return (
    <div className="space-y-6">
      <form
        className="todon-card todon-card-pink space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <p className="font-bold text-todon-ink">テンプレートを保存</p>
        <input
          className="todon-input"
          placeholder="テンプレ名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="todon-input"
          placeholder="タスクタイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="todon-btn-primary">
          保存
        </button>
      </form>

      <ul className="space-y-3">
        {templates.map((tpl) => (
          <li
            key={tpl.id}
            className="todon-card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-bold text-todon-ink">{tpl.name}</p>
              <p className="text-sm text-todon-ink-muted">{tpl.payload.title}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/tasks/new?title=${encodeURIComponent(tpl.payload.title)}`}
                className="todon-btn-primary text-xs"
              >
                使う
              </Link>
              <button
                type="button"
                className="todon-btn-ghost text-xs"
                onClick={() => void remove(tpl.id)}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
