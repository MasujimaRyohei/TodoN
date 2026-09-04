import type { TeamRole } from './types';

export const TEAM_ROLE_RANK: Record<TeamRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
};

export function isTeamRole(value: string): value is TeamRole {
  return value === 'owner' || value === 'admin' || value === 'member';
}

/** `role` が `minimum` 以上の権限を持つか。 */
export function roleMeetsMinimum(role: TeamRole | string | undefined, minimum: TeamRole): boolean {
  return (
    typeof role === 'string' && isTeamRole(role) && TEAM_ROLE_RANK[role] >= TEAM_ROLE_RANK[minimum]
  );
}
