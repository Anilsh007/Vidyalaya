ALTER TABLE "Student"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Student_userId_key" ON "Student"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Student_userId_fkey'
  ) THEN
    ALTER TABLE "Student"
    ADD CONSTRAINT "Student_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
