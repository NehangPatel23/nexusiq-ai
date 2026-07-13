-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "confidence_score" INTEGER;
ALTER TABLE "chat_messages" ADD COLUMN "confidence_reason" TEXT;
