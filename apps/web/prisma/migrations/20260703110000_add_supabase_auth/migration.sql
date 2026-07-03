-- AlterTable
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
