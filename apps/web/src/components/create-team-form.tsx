'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TEAM_ICON_PRESETS } from '@/lib/team-icon-presets';
import { persistAppScope } from '@/lib/scope-preferences';

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, icon }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '作成に失敗しました');
      }

      const team = (await res.json()) as { id: string; name: string; icon?: string | null };
      persistAppScope({ mode: 'team', teamId: team.id, teamName: team.name, teamIcon: team.icon });
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 todon-card p-6">
      <div className="space-y-2">
        <label className="todon-label">チーム名</label>
        <input
          className="todon-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={64}
        />
      </div>

      <div className="space-y-2">
        <label className="todon-label">チームアイコン</label>
        <div className="flex flex-wrap gap-2">
          {TEAM_ICON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setIcon(preset)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${
                icon === preset
                  ? 'border-todon-primary bg-todon-primary-soft'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="todon-error">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="todon-btn-primary disabled:opacity-50">
          {loading ? '作成中…' : '作成する'}
        </button>
        <Link href="/teams" className="todon-link">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
