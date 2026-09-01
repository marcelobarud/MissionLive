CREATE TABLE "GoalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "customCategory" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalTemplate_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "GoalTemplate_ownerUserId_idx" ON "GoalTemplate"("ownerUserId");
CREATE INDEX "GoalTemplate_categoryId_idx" ON "GoalTemplate"("categoryId");
