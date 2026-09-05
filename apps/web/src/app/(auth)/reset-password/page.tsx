'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (resetError) {
        throw new Error(resetError.message);
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-extrabold text-todon-ink">メールを送信しました 📮</h2>
        <p className="text-sm text-todon-ink-muted">
          {email} 宛のメールにあるリンクを開いて、新しいパスワードを設定してください。
        </p>
        <Link className="todon-link" href="/login">
          ログインへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-extrabold text-todon-ink">パスワードの再設定</h2>
        <p className="text-sm text-todon-ink-muted">登録メールアドレスに再設定リンクを送ります</p>
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
        {error ? <p className="todon-error">{error}</p> : null}
        <button type="submit" disabled={loading} className="todon-btn-primary w-full">
          {loading ? '送信中…' : '再設定リンクを送る'}
        </button>
      </form>
      <p className="text-center text-sm text-todon-ink-muted">
        <Link className="todon-link" href="/login">
          ログインへ戻る
        </Link>
      </p>
    </div>
  );
}
