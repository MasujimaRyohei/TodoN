import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  let db = false;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'unknown';
  }

  const auth = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  return NextResponse.json({
    ok: db && auth,
    db,
    auth,
    ...(dbError ? { dbError } : {}),
  });
}
