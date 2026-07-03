import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  let db = false;
  let auth = false;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'unknown';
  }

  const secret = process.env.AUTH_SECRET;
  auth = Boolean(secret && secret.length >= 16);

  return NextResponse.json({
    ok: db && auth,
    db,
    auth,
    ...(dbError ? { dbError } : {}),
  });
}
