'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PasswordInput } from '@/components/password-input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'ログインに失敗しました');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-extrabold text-todon-ink">おかえりなさい 👋</h2>
        <p className="text-sm text-todon-ink-muted">個人タスクのダッシュボードへ</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="space-y-2 text-left">
          <label className="todon-label">メール</label>
          <input
            type="email"
            autoComplete="email"
            className="todon-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 text-left">
          <label className="todon-label">パスワード</label>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="todon-error">{error}</p> : null}
        <button type="submit" disabled={loading} className="todon-btn-primary w-full">
          {loading ? '送信中…' : 'ログインする'}
        </button>
      </form>
      <div className="space-y-1 text-center text-sm text-todon-ink-muted">
        <p>
          <Link className="todon-link" href="/reset-password">
            パスワードを忘れた方
          </Link>
        </p>
        <p>
          はじめてですか？{' '}
          <Link className="todon-link" href="/register">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
