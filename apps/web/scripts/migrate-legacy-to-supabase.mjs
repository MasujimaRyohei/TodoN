// One-off ops for the legacy bcrypt -> Supabase Auth migration.
//
//   node --env-file=.env scripts/migrate-legacy-to-supabase.mjs                     # dry run: list legacy users
//   node --env-file=.env scripts/migrate-legacy-to-supabase.mjs --apply             # create+link Supabase Auth users
//   node --env-file=.env scripts/migrate-legacy-to-supabase.mjs --set-password <email> <newPassword>
//
// bcrypt hashes cannot be imported, so each migrated user needs a fresh password:
// either via the Supabase dashboard (Authentication -> Users) or --set-password here.

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const setPwIndex = args.indexOf('--set-password');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient();

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function setPassword() {
  const email = args[setPwIndex + 1]?.toLowerCase();
  const password = args[setPwIndex + 2];
  if (!email || !password) {
    throw new Error('usage: --set-password <email> <newPassword>');
  }

  const authUser = await findAuthUserByEmail(email);
  if (!authUser) {
    throw new Error(`no Supabase auth user for ${email}`);
  }

  const { error } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`updateUserById failed: ${error.message}`);
  console.log(`password updated for ${email}`);
}

async function main() {
  if (setPwIndex !== -1) {
    await setPassword();
    return;
  }

  // passwordHash is a nullable, otherwise-unused column; query it directly.
  const legacy = await prisma.$queryRaw`
    SELECT "id", "email", "name"
    FROM "User"
    WHERE "passwordHash" IS NOT NULL AND "supabaseId" IS NULL
  `;

  if (legacy.length === 0) {
    console.log('No legacy users to migrate.');
    return;
  }

  console.log(`${legacy.length} legacy user(s) to migrate${APPLY ? '' : ' (dry run)'}:\n`);

  for (const user of legacy) {
    const email = user.email.toLowerCase();
    console.log(`- ${email} (${user.name ?? 'no name'})`);

    if (!APPLY) continue;

    let authUser = await findAuthUserByEmail(email);

    if (authUser) {
      console.log(`  reusing existing Supabase auth user ${authUser.id}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name: user.name ?? null },
      });
      if (error) throw new Error(`createUser failed for ${email}: ${error.message}`);
      authUser = data.user;
      console.log(`  created Supabase auth user ${authUser.id}`);
    }

    await prisma.$executeRaw`UPDATE "User" SET "supabaseId" = ${authUser.id} WHERE "id" = ${user.id}`;
    console.log(`  linked User.supabaseId -> ${authUser.id}`);
    console.log('');
  }

  if (APPLY) {
    console.log('Next: set a password for each migrated user in the Supabase dashboard');
    console.log(
      '(Authentication -> Users -> row menu -> "Send password recovery" or "Reset password").',
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
