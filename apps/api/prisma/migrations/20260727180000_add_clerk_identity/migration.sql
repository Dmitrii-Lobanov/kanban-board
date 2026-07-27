ALTER TABLE "User"
ADD COLUMN "clerkId" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
