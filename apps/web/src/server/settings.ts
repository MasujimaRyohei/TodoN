import type { UserSettings } from '@todon/shared';

import { prisma } from '@/lib/prisma';
import { normalizeWebhookUrl } from '@/lib/webhook-url';

function mapSettings(row: {
  userId: string;
  notifyOnDueToday: boolean;
  notifyOnTaskDone: boolean;
  notifyOnTeamAssign: boolean;
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  googleCalendarLinked: boolean;
}): UserSettings {
  return {
    userId: row.userId,
    notifyOnDueToday: row.notifyOnDueToday,
    notifyOnTaskDone: row.notifyOnTaskDone,
    notifyOnTeamAssign: row.notifyOnTeamAssign,
    slackWebhookUrl: row.slackWebhookUrl,
    discordWebhookUrl: row.discordWebhookUrl,
    googleCalendarLinked: row.googleCalendarLinked,
  };
}

export async function getOrCreateSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) {
    return mapSettings(existing);
  }

  const created = await prisma.userSettings.create({ data: { userId } });
  return mapSettings(created);
}

export async function updateSettings(
  userId: string,
  patch: Partial<{
    notifyOnDueToday: boolean;
    notifyOnTaskDone: boolean;
    notifyOnTeamAssign: boolean;
    slackWebhookUrl: string | null;
    discordWebhookUrl: string | null;
    googleCalendarLinked: boolean;
  }>,
) {
  await getOrCreateSettings(userId);

  const slack =
    patch.slackWebhookUrl !== undefined
      ? normalizeWebhookUrl(patch.slackWebhookUrl, 'slack')
      : undefined;
  const discord =
    patch.discordWebhookUrl !== undefined
      ? normalizeWebhookUrl(patch.discordWebhookUrl, 'discord')
      : undefined;

  const row = await prisma.userSettings.update({
    where: { userId },
    data: {
      ...(patch.notifyOnDueToday !== undefined ? { notifyOnDueToday: patch.notifyOnDueToday } : {}),
      ...(patch.notifyOnTaskDone !== undefined ? { notifyOnTaskDone: patch.notifyOnTaskDone } : {}),
      ...(patch.notifyOnTeamAssign !== undefined
        ? { notifyOnTeamAssign: patch.notifyOnTeamAssign }
        : {}),
      ...(slack !== undefined ? { slackWebhookUrl: slack } : {}),
      ...(discord !== undefined ? { discordWebhookUrl: discord } : {}),
      ...(patch.googleCalendarLinked !== undefined
        ? { googleCalendarLinked: patch.googleCalendarLinked }
        : {}),
      updatedAt: new Date(),
    },
  });

  return mapSettings(row);
}
