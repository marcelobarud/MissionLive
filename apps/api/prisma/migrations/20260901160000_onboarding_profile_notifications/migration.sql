ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "preferencesJson" TEXT NOT NULL DEFAULT '{}';
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "goalId" TEXT,
    "teamId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_goalId_idx" ON "Notification"("goalId");
CREATE INDEX "Notification_teamId_idx" ON "Notification"("teamId");
