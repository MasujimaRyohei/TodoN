'use client';

import type { UserSettings } from '@todon/shared';
import { useState } from 'react';

type Props = {
  initial: UserSettings;
};

export function SettingsClient({ initial }: Props) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? '保存に失敗しました');
      }

      setSettings(await res.json());
      setMessage('保存しました');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function linkGoogle() {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/google', {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json();
      alert(body.message ?? '連携リクエストを受け付けました');
      setSettings((s) => ({ ...s, googleCalendarLinked: true }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="todon-card todon-card-sky space-y-4 p-5">
        <h2 className="font-extrabold text-todon-ink">通知</h2>
        {(
          [
            ['notifyOnDueToday', '今日期限のタスク'],
            ['notifyOnTaskDone', 'タスク完了時（外部連携）'],
            ['notifyOnTeamAssign', 'チームで担当されたとき'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm font-medium text-todon-ink">
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>

      <section className="todon-card todon-card-lavender space-y-3 p-5">
        <h2 className="font-extrabold text-todon-ink">Slack / Discord</h2>
        <p className="todon-muted text-xs">
          Incoming Webhook URL を貼り付けると、完了時などに投稿します
        </p>
        <div className="space-y-2">
          <label className="todon-label">Slack Webhook</label>
          <input
            className="todon-input"
            value={settings.slackWebhookUrl ?? ''}
            onChange={(e) => setSettings({ ...settings, slackWebhookUrl: e.target.value || null })}
            placeholder="https://hooks.slack.com/..."
          />
        </div>
        <div className="space-y-2">
          <label className="todon-label">Discord Webhook</label>
          <input
            className="todon-input"
            value={settings.discordWebhookUrl ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, discordWebhookUrl: e.target.value || null })
            }
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>
      </section>

      <section className="todon-card todon-card-yellow space-y-3 p-5">
        <h2 className="font-extrabold text-todon-ink">Google カレンダー</h2>
        <p className="todon-muted text-xs">
          OAuth 連携は準備中です。ICS ファイルを Google カレンダーに「URL から追加」できます。
        </p>
        <a href="/api/calendar/export" className="todon-link text-sm">
          📅 ICS をダウンロード
        </a>
        <button
          type="button"
          className="todon-btn-ghost"
          disabled={loading}
          onClick={() => void linkGoogle()}
        >
          連携済みとしてマーク
        </button>
        {settings.googleCalendarLinked ? (
          <p className="text-xs font-bold text-todon-mint">連携フラグ ON</p>
        ) : null}
      </section>

      {message ? <p className="text-sm font-bold text-todon-mint">{message}</p> : null}
      {error ? <p className="todon-error">{error}</p> : null}

      <button
        type="button"
        className="todon-btn-primary"
        disabled={loading}
        onClick={() => void save()}
      >
        {loading ? '保存中…' : '設定を保存'}
      </button>
    </div>
  );
}
