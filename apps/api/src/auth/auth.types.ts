import { Request } from 'express';
import { PlatformRole } from '../admin/platform-role';

export type PublicAvatar = { type: 'preset' | 'upload' | 'google' | null; presetId: string | null; url: string | null };
export type AuthUser = { id: string; email: string; name: string; avatarUrl?: string | null; avatar: PublicAvatar; platformRole: PlatformRole; timezone?: string; onboardingCompletedAt?: string | null; preferences?: Record<string, boolean | string | number> };
export type AuthenticatedRequest = Request & { user: AuthUser; sessionId: string };
