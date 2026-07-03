import { cookies } from 'next/headers';

import { COOKIE_NAME, verifyUserToken } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';
import { findPrismaUserIdBySupabaseAuth } from '@/lib/supabase/sync-user';

export async function getCurrentUserId() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return findPrismaUserIdBySupabaseAuth(user);
    }
  } catch {
    // Supabase 未設定時は従来 JWT のみ使う
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifyUserToken(token);
  } catch {
    return null;
  }
}
