-- AlterTable
ALTER TABLE "Task" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 3;

UPDATE "Task" SET "points" = 1 WHERE "weight" = 'light';
UPDATE "Task" SET "points" = 8 WHERE "weight" = 'heavy';
