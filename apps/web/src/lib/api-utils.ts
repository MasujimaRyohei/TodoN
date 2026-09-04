import { NextResponse } from 'next/server';

import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/http';

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof BadRequestError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ message: 'サーバーで問題が発生しました' }, { status: 500 });
}
