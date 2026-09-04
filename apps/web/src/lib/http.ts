import { prisma } from '@/lib/prisma';

import { createClient } from './supabase/server';
import { findPrismaUserIdBySupabaseAuth } from './supabase/sync-user';

/**
 * Resolves the current Prisma user id from a Supabase session:
 * a bearer access token (mobile) or the SSR session cookies (web).
 */
export async function getUserIdFromRequest(req: Request) {
  const supabase = await createClient();

  const bearer = req.headers.get('authorization');
  const accessToken = bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : null;

  try {
    const { data } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (data.user) {
      return findPrismaUserIdBySupabaseAuth(data.user);
    }
  } catch {
    return null;
  }

  return null;
}

export async function requireUser(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    throw new UnauthorizedError('Unauthorized');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }

  return { userId, user };
}

export class UnauthorizedError extends Error {
  status = 401;
}

export class BadRequestError extends Error {
  status = 400;
}

export class NotFoundError extends Error {
  status = 404;
}

export class ForbiddenError extends Error {
  status = 403;
}
