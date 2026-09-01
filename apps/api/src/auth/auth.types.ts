import { Request } from 'express';

export type AuthUser = { id: string; email: string; name: string };
export type AuthenticatedRequest = Request & { user: AuthUser; sessionId: string };
