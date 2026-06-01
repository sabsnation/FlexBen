ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_data" TEXT;

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_key" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "notifications"("user_id", "read");
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
