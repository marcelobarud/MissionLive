-- Preserve existing reminders as reminders created for and delivered to the historical user.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "goalStepId" TEXT,
    "remindAt" DATETIME NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reminder_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reminder_goalStepId_fkey" FOREIGN KEY ("goalStepId") REFERENCES "GoalStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Reminder" ("id", "creatorUserId", "targetUserId", "goalId", "goalStepId", "remindAt", "timezone", "status", "deliveredAt", "createdAt", "updatedAt")
SELECT "id", "userId", "userId", "goalId", NULL, "remindAt", "timezone", "status", "deliveredAt", "createdAt", "updatedAt"
FROM "Reminder";

DROP TABLE "Reminder";
ALTER TABLE "new_Reminder" RENAME TO "Reminder";

CREATE INDEX "Reminder_creatorUserId_status_remindAt_idx" ON "Reminder"("creatorUserId", "status", "remindAt");
CREATE INDEX "Reminder_targetUserId_status_remindAt_idx" ON "Reminder"("targetUserId", "status", "remindAt");
CREATE INDEX "Reminder_goalId_idx" ON "Reminder"("goalId");
CREATE INDEX "Reminder_goalStepId_idx" ON "Reminder"("goalStepId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
