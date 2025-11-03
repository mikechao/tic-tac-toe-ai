ALTER TABLE "matches"
  ADD COLUMN "difficulty" text NOT NULL DEFAULT 'standard';

UPDATE "matches"
SET "difficulty" = 'standard'
WHERE "difficulty" IS NULL;

ALTER TABLE "matches"
  ALTER COLUMN "difficulty" DROP DEFAULT;
