import { Prisma } from '@prisma/client';

export function goalAccessWhere(userId: string, goalId?: string): Prisma.GoalWhereInput {
  return {
    ...(goalId ? { id: goalId } : {}),
    OR: [
      { ownerUserId: userId },
      { members: { some: { userId } } },
      { team: { ownerUserId: userId } },
      { team: { members: { some: { userId } } } },
    ],
  };
}
