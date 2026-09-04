import { prisma } from '@/lib/prisma';

import { COOKIE_NAME, verifyUserToken } from './auth/jwt';
import { createClient } from './supabase/server';
import { findPrismaUserIdBySupabaseAuth } from './supabase/sync-user';

export async function getUserIdFromRequest(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    try {
      return await verifyUserToken(token);
    } catch {
      return null;
    }
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return findPrismaUserIdBySupabaseAuth(user);
    }
  } catch {
    // Supabase 未設定時は JWT cookie のみ
  }

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';').map((c) => c.trim());
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const name = part.slice(0, idx);
    const value = part.slice(idx + 1);
    if (name === COOKIE_NAME) {
      const token = decodeURIComponent(value);
      try {
        return await verifyUserToken(token);
      } catch {
        return null;
      }
    }
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
