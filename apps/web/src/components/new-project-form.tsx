'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  teamId?: string | null;
  teamName?: string | null;
};

export function NewProjectForm({ teamId, teamName }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, teamId: teamId ?? null }),
      });
      if (!res.ok) {
        throw new Error('作成に失敗');
      }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="todon-eyebrow">{teamId ? 'チーム' : '個人'}</p>
        <h1 className="todon-page-title">
          {teamId ? `${teamName ?? 'チーム'} のプロジェクト作成` : 'プロジェクト作成'}
        </h1>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="todon-card space-y-4 p-6">
        <input
          className="todon-input"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="todon-input min-h-[100px]"
          placeholder="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="todon-btn-primary" disabled={loading}>
          作成
        </button>
      </form>
      <Link href="/projects" className="todon-link text-sm">
        一覧へ
      </Link>
    </div>
  );
}
