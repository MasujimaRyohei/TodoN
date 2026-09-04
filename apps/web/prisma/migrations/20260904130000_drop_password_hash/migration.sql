-- Legacy bcrypt auth removed; Supabase Auth is the only mechanism.
ALTER TABLE "User" DROP COLUMN "passwordHash";
