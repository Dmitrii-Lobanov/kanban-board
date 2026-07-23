CREATE TYPE "ColumnKey" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

ALTER TABLE "Column"
ADD COLUMN "key" "ColumnKey";

UPDATE "Column"
SET "key" = CASE
  WHEN LOWER("title") IN ('backlog', 'todo') THEN 'TODO'::"ColumnKey"
  WHEN LOWER("title") = 'in progress' THEN 'IN_PROGRESS'::"ColumnKey"
  WHEN LOWER("title") = 'done' THEN 'DONE'::"ColumnKey"
  ELSE NULL
END;

ALTER TABLE "Column"
ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX "Column_boardId_key_key"
ON "Column"("boardId", "key");