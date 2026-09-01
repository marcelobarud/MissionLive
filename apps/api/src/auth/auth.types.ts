import { Request } from 'express';

export type AuthUser = { id: string; email: string; name: string; avatarUrl?: string | null; timezone?: string; onboardingCompletedAt?: string | null; preferences?: Record<string, boolean | string | number> };
export type AuthenticatedRequest = Request & { user: AuthUser; sessionId: string };
