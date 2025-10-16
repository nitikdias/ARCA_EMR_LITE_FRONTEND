/*
  Warnings:

  - You are about to drop the `audio_samples` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."audio_samples" DROP CONSTRAINT "audio_samples_user_id_fkey";

-- DropTable
DROP TABLE "public"."audio_samples";
