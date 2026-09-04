import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { parseScopeCookie, SCOPE_COOKIE_NAME } from '@/lib/scope-preferences';
import { createProjectSchema } from '@/lib/schemas';
import { createProject, listProjects } from '@/server/projects';

function scopeFromRequest(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${SCOPE_COOKIE_NAME}=([^;]+)`));
  return (
    parseScopeCookie(match?.[1] ? decodeURIComponent(match[1]) : null) ?? {
      mode: 'personal' as const,
    }
  );
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser(req);
    return NextResponse.json(await listProjects(userId, scopeFromRequest(req)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();
    const payload = createProjectSchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('プロジェクト名を確認してください');
    }

    const scope = scopeFromRequest(req);
    const teamId = payload.data.teamId ?? (scope.mode === 'team' ? scope.teamId : null);

    const project = await createProject(userId, { ...payload.data, teamId });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
