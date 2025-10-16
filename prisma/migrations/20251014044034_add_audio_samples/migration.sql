-- CreateTable
CREATE TABLE "audio_samples" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimetype" TEXT NOT NULL DEFAULT 'audio/wav',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_samples_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audio_samples" ADD CONSTRAINT "audio_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
