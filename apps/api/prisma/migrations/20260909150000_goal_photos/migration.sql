CREATE TABLE "GoalPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "goalStepId" TEXT,
    "dailyOccurrenceId" TEXT,
    "goalStepTitleSnapshot" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageFileKey" TEXT NOT NULL,
    "thumbnailFileKey" TEXT NOT NULL,
    "quotaScopeKey" TEXT NOT NULL,
    "quotaSlot" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalPhoto_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalPhoto_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalPhoto_goalStepId_fkey" FOREIGN KEY ("goalStepId") REFERENCES "GoalStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GoalPhoto_dailyOccurrenceId_fkey" FOREIGN KEY ("dailyOccurrenceId") REFERENCES "GoalDailyOccurrence" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GoalPhoto_authorUserId_quotaScopeKey_quotaSlot_key" ON "GoalPhoto"("authorUserId", "quotaScopeKey", "quotaSlot");
CREATE INDEX "GoalPhoto_goalId_createdAt_idx" ON "GoalPhoto"("goalId", "createdAt");
CREATE INDEX "GoalPhoto_authorUserId_idx" ON "GoalPhoto"("authorUserId");
CREATE INDEX "GoalPhoto_goalStepId_idx" ON "GoalPhoto"("goalStepId");
CREATE INDEX "GoalPhoto_dailyOccurrenceId_idx" ON "GoalPhoto"("dailyOccurrenceId");
