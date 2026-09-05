import { isAllowedWebhookUrl } from '@/lib/webhook-url';

import { getOrCreateSettings } from './settings';

async function postWebhook(url: string, kind: 'slack' | 'discord', content: string) {
  if (!isAllowedWebhookUrl(url, kind)) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Webhook failed: ${res.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function notifyTaskDone(userId: string, title: string) {
  const settings = await getOrCreateSettings(userId);
  if (!settings.notifyOnTaskDone) {
    return;
  }

  const message = `✅ TodoN: タスク完了「${title}」`;

  if (settings.slackWebhookUrl) {
    await postWebhook(settings.slackWebhookUrl, 'slack', message).catch(() => undefined);
  }

  if (settings.discordWebhookUrl) {
    await postWebhook(settings.discordWebhookUrl, 'discord', message).catch(() => undefined);
  }
}

export async function notifyTeamAssign(userId: string, title: string, teamName: string) {
  const settings = await getOrCreateSettings(userId);
  if (!settings.notifyOnTeamAssign) {
    return;
  }

  const message = `👋 TodoN: ${teamName} で「${title}」が割り当てられました`;

  if (settings.slackWebhookUrl) {
    await postWebhook(settings.slackWebhookUrl, 'slack', message).catch(() => undefined);
  }

  if (settings.discordWebhookUrl) {
    await postWebhook(settings.discordWebhookUrl, 'discord', message).catch(() => undefined);
  }
}
