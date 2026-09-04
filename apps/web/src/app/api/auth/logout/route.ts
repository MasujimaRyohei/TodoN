import { NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createRouteHandlerClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
