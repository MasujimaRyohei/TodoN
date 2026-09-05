import { BadRequestError } from '@/lib/http';

type WebhookKind = 'slack' | 'discord';

const ALLOWED_HOSTS: Record<WebhookKind, string[]> = {
  slack: ['hooks.slack.com'],
  discord: ['discord.com', 'discordapp.com', 'canary.discord.com', 'ptb.discord.com'],
};

const LABELS: Record<WebhookKind, string> = {
  slack: 'Slack',
  discord: 'Discord',
};

/**
 * Rejects anything that is not a plain https webhook on the provider's own host.
 * Guards against SSRF (internal IPs, file://, redirectors) since the URL is later
 * fetched server-side.
 */
export function normalizeWebhookUrl(
  raw: string | null | undefined,
  kind: WebhookKind,
): string | null {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return null;
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestError(`${LABELS[kind]} Webhook URL の形式が正しくありません`);
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestError(`${LABELS[kind]} Webhook URL は https で指定してください`);
  }

  const host = url.hostname.toLowerCase();
  const ok = ALLOWED_HOSTS[kind].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
  if (!ok) {
    throw new BadRequestError(`${LABELS[kind]} の正規の Webhook URL を指定してください`);
  }

  return url.toString();
}

export function isAllowedWebhookUrl(raw: string, kind: WebhookKind): boolean {
  try {
    return normalizeWebhookUrl(raw, kind) !== null;
  } catch {
    return false;
  }
}
