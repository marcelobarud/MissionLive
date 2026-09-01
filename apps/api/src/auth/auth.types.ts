import { Request } from 'express';

export type AuthUser = { id: string; email: string; name: string; timezone?: string };
export type AuthenticatedRequest = Request & { user: AuthUser; sessionId: string };
