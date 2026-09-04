-- Re-add User.passwordHash: the production deployment still runs pre-consolidation
-- code that reads this column. It is dropped again once the new code is live.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
