import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { createCategorySchema } from '@/lib/schemas';
import { createCategory, listCategories } from '@/server/categories';

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser(req);

    const rows = await listCategories(userId);
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();
    const payload = createCategorySchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('カテゴリ名を確認してください');
    }

    const row = await createCategory(userId, payload.data);

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
