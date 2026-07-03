import type { Team as PrismaTeam, TeamInvite as PrismaInvite, TeamMember as PrismaMember } from '@prisma/client';
import type { Team, TeamInvite, TeamMember, TeamRole } from '@todon/shared';
import { randomBytes } from 'crypto';

import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/http';
import { mapUser } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import { isTeamRole, requireMembership, requireTeamAdmin, requireTeamOwner } from './team-access';

function mapTeam(row: PrismaTeam & { _count?: { members: number }; members?: { role: string }[] }): Team {
  const myMembership = row.members?.[0];

  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    memberCount: row._count?.members,
    myRole: myMembership && isTeamRole(myMembership.role) ? myMembership.role : undefined,
  };
}

function mapMember(
  row: PrismaMember & { user: { id: string; email: string; name: string | null; createdAt: Date } },
): TeamMember {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    role: row.role as TeamRole,
    createdAt: row.createdAt.toISOString(),
    user: mapUser(row.user),
  };
}

function mapInvite(row: PrismaInvite & { team?: { name: string } }): TeamInvite {
  return {
    id: row.id,
    teamId: row.teamId,
    email: row.email,
    token: row.token,
    status: row.status as TeamInvite['status'],
    createdAt: row.createdAt.toISOString(),
    teamName: row.team?.name,
  };
}

async function nextTeamSortOrder(userId: string, tx: Pick<typeof prisma, 'teamMember'> = prisma) {
  const maxSort = await tx.teamMember.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });

  return (maxSort._max.sortOrder ?? -1) + 1;
}

export async function listTeamsForUser(userId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, select: { role: true } },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { team: { updatedAt: 'desc' } }],
  });

  return memberships.map((m) => mapTeam({ ...m.team, members: [{ role: m.role }] }));
}

export async function getTeamForUser(userId: string, teamId: string) {
  await requireMembership(userId, teamId);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      _count: { select: { members: true } },
      members: { where: { userId }, select: { role: true } },
    },
  });

  if (!team) {
    throw new NotFoundError('チームが見つかりません');
  }

  return mapTeam(team);
}

export async function createTeam(userId: string, name: string, icon?: string | null) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new BadRequestError('チーム名を入力してください');
  }

  const iconValue = icon?.trim() || null;

  const team = await prisma.$transaction(async (tx) => {
    const sortOrder = await nextTeamSortOrder(userId, tx);

    const created = await tx.team.create({
      data: {
        name: trimmed,
        icon: iconValue,
        ownerId: userId,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: created.id,
        userId,
        role: 'owner',
        sortOrder,
      },
    });

    return created;
  });

  return mapTeam({ ...team, _count: { members: 1 }, members: [{ role: 'owner' }] });
}

export async function updateTeam(
  userId: string,
  teamId: string,
  patch: { name?: string; icon?: string | null },
) {
  await requireTeamAdmin(userId, teamId);

  const data: { name?: string; icon?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new BadRequestError('チーム名を入力してください');
    }
    data.name = trimmed;
  }

  if (patch.icon !== undefined) {
    data.icon = patch.icon?.trim() || null;
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data,
    include: {
      _count: { select: { members: true } },
      members: { where: { userId }, select: { role: true } },
    },
  });

  return mapTeam(team);
}

/** @deprecated use updateTeam */
export async function updateTeamName(userId: string, teamId: string, name: string) {
  return updateTeam(userId, teamId, { name });
}

export async function deleteTeam(userId: string, teamId: string) {
  await requireTeamOwner(userId, teamId);

  await prisma.team.delete({ where: { id: teamId } });
}

export async function leaveTeam(userId: string, teamId: string) {
  const membership = await requireMembership(userId, teamId);

  if (membership.role === 'owner') {
    throw new BadRequestError('オーナーは「チームを削除」してください');
  }

  await prisma.teamMember.delete({ where: { id: membership.id } });
}

export async function reorderTeamsForUser(userId: string, teamIds: string[]) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const ownedIds = new Set(memberships.map((m) => m.teamId));
  if (teamIds.length !== ownedIds.size || teamIds.some((id) => !ownedIds.has(id))) {
    throw new BadRequestError('並び替え対象のチームを確認してください');
  }

  await prisma.$transaction(
    teamIds.map((teamId, index) =>
      prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId } },
        data: { sortOrder: index },
      }),
    ),
  );
}

export async function listTeamMembers(userId: string, teamId: string) {
  await requireMembership(userId, teamId);

  const rows = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  return rows.map(mapMember);
}

export async function updateMemberRole(
  actorId: string,
  teamId: string,
  memberId: string,
  role: TeamRole,
) {
  const actor = await requireTeamAdmin(actorId, teamId);

  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!target) {
    throw new NotFoundError('メンバーが見つかりません');
  }

  if (target.role === 'owner') {
    throw new ForbiddenError('オーナーの権限は変更できません');
  }

  if (role === 'owner') {
    throw new BadRequestError('オーナーへの変更はサポートしていません');
  }

  if (actor.role === 'admin' && role === 'admin') {
    throw new ForbiddenError('管理者は他の管理者を任命できません');
  }

  const row = await prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
  });

  return mapMember(row);
}

export async function removeMember(actorId: string, teamId: string, memberId: string) {
  const actor = await requireTeamAdmin(actorId, teamId);

  const target = await prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!target) {
    throw new NotFoundError('メンバーが見つかりません');
  }

  if (target.role === 'owner') {
    throw new ForbiddenError('オーナーは削除できません');
  }

  if (actor.role === 'admin' && target.role === 'admin') {
    throw new ForbiddenError('管理者は他の管理者を削除できません');
  }

  await prisma.teamMember.delete({ where: { id: memberId } });
}

export async function inviteByEmail(actorId: string, teamId: string, email: string) {
  await requireTeamAdmin(actorId, teamId);

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new BadRequestError('メールアドレスを確認してください');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });

  if (existingUser) {
    const already = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: existingUser.id } },
    });

    if (already) {
      throw new BadRequestError('このユーザーはすでにメンバーです');
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: existingUser.id,
        role: 'member',
        sortOrder: await nextTeamSortOrder(existingUser.id),
      },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
      },
    });

    return { type: 'member' as const, member: mapMember(member) };
  }

  const token = randomBytes(24).toString('hex');

  const invite = await prisma.teamInvite.upsert({
    where: { teamId_email: { teamId, email: normalized } },
    create: {
      teamId,
      email: normalized,
      token,
      invitedById: actorId,
      status: 'pending',
    },
    update: {
      token,
      invitedById: actorId,
      status: 'pending',
    },
    include: { team: { select: { name: true } } },
  });

  return { type: 'invite' as const, invite: mapInvite(invite) };
}

export async function acceptInvite(userId: string, token: string) {
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { team: true },
  });

  if (!invite || invite.status !== 'pending') {
    throw new NotFoundError('招待が見つからないか、すでに使用されています');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new ForbiddenError('この招待は別のメールアドレス向けです');
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: invite.teamId, userId } },
  });

  if (!existing) {
    await prisma.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId,
        role: 'member',
        sortOrder: await nextTeamSortOrder(userId),
      },
    });
  }

  await prisma.teamInvite.update({
    where: { id: invite.id },
    data: { status: 'accepted' },
  });

  return getTeamForUser(userId, invite.teamId);
}

export async function listPendingInvitesForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return [];
  }

  const rows = await prisma.teamInvite.findMany({
    where: { email: user.email.toLowerCase(), status: 'pending' },
    include: { team: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapInvite);
}
