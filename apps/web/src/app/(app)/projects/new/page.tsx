import { redirect } from 'next/navigation';

import { NewProjectForm } from '@/components/new-project-form';
import { getCurrentUserId } from '@/lib/auth/session';
import { getValidatedServerAppScope } from '@/lib/scope-server';
import { getTeamForUser } from '@/server/teams';

type Props = {
  searchParams: Promise<{ teamId?: string }>;
};

export default async function NewProjectPage({ searchParams }: Props) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const params = await searchParams;
  const { scope } = await getValidatedServerAppScope(userId);
  const teamId = params.teamId ?? (scope.mode === 'team' ? scope.teamId : null);

  let teamName: string | null = null;
  if (teamId) {
    const team = await getTeamForUser(userId, teamId);
    teamName = team.name;
  }

  return <NewProjectForm teamId={teamId} teamName={teamName} />;
}
