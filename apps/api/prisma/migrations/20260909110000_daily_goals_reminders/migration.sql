ALTER TABLE "Goal" ADD COLUMN "recurrenceType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Goal" ADD COLUMN "recurrenceTimezone" TEXT;

ALTER TABLE "Reminder" ADD COLUMN "recurrenceType" TEXT NOT NULL DEFAULT 'ONCE';
ALTER TABLE "Reminder" ADD COLUMN "timeOfDay" TEXT;
ALTER TABLE "Reminder" ADD COLUMN "lastDeliveredAt" DATETIME;

DROP INDEX "Notification_reminderId_key";
ALTER TABLE "Notification" ADD COLUMN "deliveryKey" TEXT;
CREATE UNIQUE INDEX "Notification_deliveryKey_key" ON "Notification"("deliveryKey");

CREATE TABLE "GoalDailyOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "completedAt" DATETIME,
    "completionMode" TEXT,
    "completedByUserId" TEXT,
    "completionOverrideReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalDailyOccurrence_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalDailyOccurrence_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoalDailyOccurrence_goalId_localDate_key" ON "GoalDailyOccurrence"("goalId", "localDate");
CREATE INDEX "GoalDailyOccurrence_goalId_localDate_idx" ON "GoalDailyOccurrence"("goalId", "localDate");
CREATE INDEX "GoalDailyOccurrence_completedByUserId_idx" ON "GoalDailyOccurrence"("completedByUserId");

CREATE TABLE "GoalDailyStepProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurrenceId" TEXT NOT NULL,
    "goalStepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalDailyStepProgress_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "GoalDailyOccurrence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalDailyStepProgress_goalStepId_fkey" FOREIGN KEY ("goalStepId") REFERENCES "GoalStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalDailyStepProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoalDailyStepProgress_occurrenceId_goalStepId_userId_key" ON "GoalDailyStepProgress"("occurrenceId", "goalStepId", "userId");
CREATE INDEX "GoalDailyStepProgress_goalStepId_idx" ON "GoalDailyStepProgress"("goalStepId");
CREATE INDEX "GoalDailyStepProgress_userId_idx" ON "GoalDailyStepProgress"("userId");
