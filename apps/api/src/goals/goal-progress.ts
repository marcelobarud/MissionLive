export type GoalParticipantSource = {
  ownerUserId: string;
  members?: Array<{ userId: string }>;
  team?: { ownerUserId: string; members?: Array<{ userId: string }> } | null;
};

export type GoalStepAssignment = { assignmentMode?: string | null; assigneeUserId?: string | null };

export type GoalViewerProgressSource = GoalParticipantSource & {
  steps: Array<GoalStepAssignment & { progresses?: Array<{ userId: string; completed: boolean }> }>;
};

export function participantIds(goal: GoalParticipantSource) {
  const ids = new Set<string>([goal.ownerUserId]);
  for (const member of goal.members ?? []) ids.add(member.userId);
  if (goal.team) {
    ids.add(goal.team.ownerUserId);
    for (const member of goal.team.members ?? []) ids.add(member.userId);
  }
  return ids;
}

export function assignmentMode(step: GoalStepAssignment) {
  return step.assignmentMode === 'SPECIFIC_PARTICIPANT' ? 'SPECIFIC_PARTICIPANT' : 'ALL_PARTICIPANTS';
}

export function stepAppliesTo(step: GoalStepAssignment, userId: string, ids: Set<string>) {
  if (!ids.has(userId)) return false;
  return assignmentMode(step) === 'ALL_PARTICIPANTS' || step.assigneeUserId === userId;
}

export function stepHasUnavailableAssignee(step: GoalStepAssignment, ids: Set<string>) {
  return assignmentMode(step) === 'SPECIFIC_PARTICIPANT' && (!step.assigneeUserId || !ids.has(step.assigneeUserId));
}

export function goalProgressForViewer(goal: GoalViewerProgressSource, userId: string) {
  const ids = participantIds(goal);
  const applicableSteps = goal.steps.filter((step) => stepAppliesTo(step, userId, ids));
  return {
    completedSteps: applicableSteps.filter((step) => (step.progresses ?? []).some((progress) => progress.userId === userId && progress.completed)).length,
    totalSteps: applicableSteps.length,
  };
}
