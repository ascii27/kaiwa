-- CreateEnum
CREATE TYPE "CharacterStyle" AS ENUM ('KANJI', 'HIRAGANA', 'ROMAJI');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "characterStyle" "CharacterStyle" NOT NULL DEFAULT 'KANJI';
ALTER TABLE "Turn" ADD COLUMN     "translation" TEXT;
