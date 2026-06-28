import { redirect } from 'next/navigation';

import { NewProjectForm } from '@/components/new-project-form';
import { getCurrentUserId } from '@/lib/auth/session';
import { NotFoundError } from '@/lib/http';
import { getServerAppScope } from '@/lib/scope-server';
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
  const scope = await getServerAppScope();
  const teamId = params.teamId ?? (scope.mode === 'team' ? scope.teamId : null);

  let teamName: string | null = null;
  if (teamId) {
    try {
      const team = await getTeamForUser(userId, teamId);
      teamName = team.name;
    } catch (error) {
      if (error instanceof NotFoundError) {
        redirect('/projects/new');
      }
      throw error;
    }
  }

  return <NewProjectForm teamId={teamId} teamName={teamName} />;
}
