-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GoalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "assignmentMode" TEXT NOT NULL DEFAULT 'ALL_PARTICIPANTS',
    "assigneeUserId" TEXT,
    "assigneeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalStep_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalStep_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GoalStep" ("createdAt", "description", "goalId", "id", "position", "title", "updatedAt") SELECT "createdAt", "description", "goalId", "id", "position", "title", "updatedAt" FROM "GoalStep";
DROP TABLE "GoalStep";
ALTER TABLE "new_GoalStep" RENAME TO "GoalStep";
CREATE INDEX "GoalStep_goalId_idx" ON "GoalStep"("goalId");
CREATE INDEX "GoalStep_assigneeUserId_idx" ON "GoalStep"("assigneeUserId");
CREATE UNIQUE INDEX "GoalStep_goalId_position_key" ON "GoalStep"("goalId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
