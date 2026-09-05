'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PasswordInput } from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(evt: React.FormEvent) {
    evt.preventDefault();

    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw new Error(updateError.message);
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'パスワードを更新できませんでした。リンクの有効期限が切れている場合は再度お試しください。',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-extrabold text-todon-ink">新しいパスワード</h2>
        <p className="text-sm text-todon-ink-muted">8文字以上で設定してください</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div className="space-y-2 text-left">
          <label className="todon-label">新しいパスワード</label>
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="todon-error">{error}</p> : null}
        <button type="submit" disabled={loading} className="todon-btn-primary w-full">
          {loading ? '更新中…' : 'パスワードを更新する'}
        </button>
      </form>
    </div>
  );
}
