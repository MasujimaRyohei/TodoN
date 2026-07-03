import { redirect } from 'next/navigation';

import { TeamsListClient } from '@/components/teams-list-client';
import { getCurrentUserId } from '@/lib/auth/session';
import { listPendingInvitesForUser, listTeamsForUser } from '@/server/teams';

export default async function TeamsPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const [teams, invites] = await Promise.all([listTeamsForUser(userId), listPendingInvitesForUser(userId)]);

  return <TeamsListClient initialTeams={teams} invites={invites} />;
}
