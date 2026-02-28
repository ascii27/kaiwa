-- AlterTable: add spaced repetition due date to VocabularyItem
ALTER TABLE "VocabularyItem"
ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

