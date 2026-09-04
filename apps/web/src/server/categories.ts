import { ForbiddenError } from '@/lib/http';
import { mapCategory } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

export async function listCategories(userId: string) {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  return categories.map(mapCategory);
}

export async function createCategory(
  userId: string,
  params: { name: string; color?: string | null },
) {
  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: params.name } },
  });

  if (existing) {
    throw new ForbiddenError('同じ名前のカテゴリがすでにあります');
  }

  const row = await prisma.category.create({
    data: {
      userId,
      name: params.name,
      color: params.color ?? null,
    },
  });

  return mapCategory(row);
}
