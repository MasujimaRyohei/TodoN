import { prisma } from '@/lib/prisma';

export async function upsertUserFromSupabase(params: {
  supabaseId: string;
  email: string;
  name?: string | null;
}) {
  const email = params.email.trim().toLowerCase();
  const name = params.name?.trim() || null;

  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      supabaseId: params.supabaseId,
      name,
    },
    update: {
      supabaseId: params.supabaseId,
      ...(name ? { name } : {}),
    },
  });
}

export async function findPrismaUserIdBySupabaseAuth(user: { id: string; email?: string | null }) {
  const bySupabaseId = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });

  if (bySupabaseId) {
    return bySupabaseId.id;
  }

  if (!user.email) {
    return null;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  return byEmail?.id ?? null;
}
