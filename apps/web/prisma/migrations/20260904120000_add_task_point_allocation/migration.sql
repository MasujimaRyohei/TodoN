-- AlterTable
ALTER TABLE "Team" ADD COLUMN "mainTaskCreateRole" TEXT NOT NULL DEFAULT 'admin';

-- AlterTable
ALTER TABLE "SubTask" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubTask" ADD COLUMN "completedById" TEXT;
ALTER TABLE "SubTask" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: completed subtasks keep a completion timestamp so existing progress still counts
UPDATE "SubTask" SET "completedAt" = "updatedAt" WHERE "completed" = true AND "completedAt" IS NULL;

-- CreateIndex
CREATE INDEX "SubTask_completedById_idx" ON "SubTask"("completedById");

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
