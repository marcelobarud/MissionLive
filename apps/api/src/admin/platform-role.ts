import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export const PLATFORM_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_AUDIT_ACTIONS = {
  SUPER_ADMIN_BOOTSTRAPPED: 'PLATFORM_SUPER_ADMIN_BOOTSTRAPPED',
  ADMIN_PROMOTED: 'PLATFORM_ADMIN_PROMOTED',
  ADMIN_DEMOTED: 'PLATFORM_ADMIN_DEMOTED',
  SUPER_ADMIN_PROMOTED: 'PLATFORM_SUPER_ADMIN_PROMOTED',
  SUPER_ADMIN_DEMOTED: 'PLATFORM_SUPER_ADMIN_DEMOTED',
} as const;

export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[keyof typeof PLATFORM_AUDIT_ACTIONS];

type PlatformUser = { platformRole?: unknown; status?: string | null };

export function normalizePlatformRole(value: unknown): PlatformRole {
  return typeof value === 'string' && (PLATFORM_ROLES as readonly string[]).includes(value) ? value as PlatformRole : 'USER';
}

export function isPlatformAdmin(user: PlatformUser) {
  return normalizePlatformRole(user.platformRole) !== 'USER';
}

function assertActive(user: PlatformUser) {
  if (user.status !== undefined && user.status !== null && user.status !== 'active') throw new UnauthorizedException('Session is invalid or expired.');
}

export function requirePlatformAdmin(user: PlatformUser) {
  assertActive(user);
  if (!isPlatformAdmin(user)) throw new ForbiddenException('Platform administrator access required.');
  return normalizePlatformRole(user.platformRole);
}

export function requireSuperAdmin(user: PlatformUser) {
  assertActive(user);
  if (normalizePlatformRole(user.platformRole) !== 'SUPER_ADMIN') throw new ForbiddenException('Super administrator access required.');
  return 'SUPER_ADMIN' as const;
}

export function assertAtLeastOneActiveSuperAdmin(activeSuperAdminCount: number) {
  if (!Number.isInteger(activeSuperAdminCount) || activeSuperAdminCount < 1) throw new ForbiddenException('The platform must retain at least one active super administrator.');
}

export function assertCanChangePlatformRole(input: { actorRole: unknown; currentTargetRole: unknown; nextTargetRole: unknown; activeSuperAdminCount: number }) {
  const actorRole = normalizePlatformRole(input.actorRole);
  const currentTargetRole = normalizePlatformRole(input.currentTargetRole);
  const nextTargetRole = normalizePlatformRole(input.nextTargetRole);
  if (actorRole === 'USER') throw new ForbiddenException('Platform administrator access required.');
  if (actorRole === 'ADMIN' && (currentTargetRole === 'SUPER_ADMIN' || nextTargetRole === 'SUPER_ADMIN')) throw new ForbiddenException('Only a super administrator can manage super administrators.');
  if (currentTargetRole === 'SUPER_ADMIN' && nextTargetRole !== 'SUPER_ADMIN') assertAtLeastOneActiveSuperAdmin(input.activeSuperAdminCount - 1);
}
