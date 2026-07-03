'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PasswordInput } from '@/components/password-input';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '登録に失敗しました');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-extrabold text-todon-ink">はじめての TodoN 🎉</h2>
        <p className="text-sm text-todon-ink-muted">8文字以上のパスワードを設定してください</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="space-y-2 text-left">
          <label className="todon-label">表示名（任意）</label>
          <input className="todon-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="todon-error">{error}</p> : null}
        <button type="submit" disabled={loading} className="todon-btn-primary w-full">
          {loading ? '送信中…' : '登録してはじめる'}
        </button>
      </form>
      <p className="text-center text-sm text-todon-ink-muted">
        すでにアカウントがありますか？{' '}
        <Link className="todon-link" href="/login">
          ログイン
        </Link>
      </p>
    </div>
  );
}
