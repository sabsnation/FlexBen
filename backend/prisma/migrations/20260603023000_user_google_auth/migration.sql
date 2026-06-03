-- Login Google: auth_provider, google_sub; senha opcional para contas OAuth
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" TEXT NOT NULL DEFAULT 'password';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_key" ON "users"("google_sub");

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
