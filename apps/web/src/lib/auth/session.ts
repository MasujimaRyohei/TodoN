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
    return null;
  }

  return null;
}
