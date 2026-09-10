import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { validate } from 'class-validator';
import { AdminAuditService } from '../src/admin/admin-audit.service';
import { AdminBootstrapService } from '../src/admin/admin-bootstrap.service';
import { assertAtLeastOneActiveSuperAdmin, assertCanChangePlatformRole, requirePlatformAdmin, requireSuperAdmin } from '../src/admin/platform-role';
import { RegisterDto } from '../src/auth/auth.dto';
import { UpdateProfileDto } from '../src/auth/profile.dto';
import { publicIdentity, publicUser } from '../src/auth/user.serializer';

describe('políticas de administração da plataforma', () => {
  it.each([
    ['USER', false],
    ['ADMIN', true],
    ['SUPER_ADMIN', true],
  ])('exige ADMIN ou SUPER_ADMIN para acesso administrativo (%s)', (platformRole, allowed) => {
    if (allowed) expect(requirePlatformAdmin({ platformRole })).toBe(platformRole);
    else expect(() => requirePlatformAdmin({ platformRole })).toThrow(ForbiddenException);
  });

  it.each([
    ['USER', false],
    ['ADMIN', false],
    ['SUPER_ADMIN', true],
  ])('aceita somente SUPER_ADMIN na política elevada (%s)', (platformRole, allowed) => {
    if (allowed) expect(requireSuperAdmin({ platformRole })).toBe('SUPER_ADMIN');
    else expect(() => requireSuperAdmin({ platformRole })).toThrow(ForbiddenException);
  });

  it('mantém contas desabilitadas bloqueadas mesmo com role administrativa', () => {
    expect(() => requirePlatformAdmin({ platformRole: 'ADMIN', status: 'disabled' })).toThrow(UnauthorizedException);
    expect(() => requireSuperAdmin({ platformRole: 'SUPER_ADMIN', status: 'disabled' })).toThrow(UnauthorizedException);
  });

  it('preserva pelo menos um SUPER_ADMIN ativo', () => {
    expect(() => assertAtLeastOneActiveSuperAdmin(0)).toThrow(ForbiddenException);
    expect(() => assertAtLeastOneActiveSuperAdmin(1)).not.toThrow();
    expect(() => assertCanChangePlatformRole({ actorRole: 'SUPER_ADMIN', currentTargetRole: 'SUPER_ADMIN', nextTargetRole: 'ADMIN', activeSuperAdminCount: 1 })).toThrow(ForbiddenException);
    expect(() => assertCanChangePlatformRole({ actorRole: 'SUPER_ADMIN', currentTargetRole: 'SUPER_ADMIN', nextTargetRole: 'ADMIN', activeSuperAdminCount: 2 })).not.toThrow();
  });

  it('impede que ADMIN promova ou rebaixe SUPER_ADMIN', () => {
    expect(() => assertCanChangePlatformRole({ actorRole: 'ADMIN', currentTargetRole: 'USER', nextTargetRole: 'SUPER_ADMIN', activeSuperAdminCount: 1 })).toThrow(ForbiddenException);
    expect(() => assertCanChangePlatformRole({ actorRole: 'ADMIN', currentTargetRole: 'SUPER_ADMIN', nextTargetRole: 'ADMIN', activeSuperAdminCount: 2 })).toThrow(ForbiddenException);
  });
});

describe('auditoria e bootstrap administrativo', () => {
  it('persiste auditoria sem expor o conteúdo como campo livre', async () => {
    const prisma = { adminAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) } };
    const service = new AdminAuditService(prisma as never);

    await service.record({ actorUserId: null, action: 'PLATFORM_SUPER_ADMIN_BOOTSTRAPPED', targetUserId: 'user-1', metadata: { source: 'explicit-bootstrap' } });

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({ data: { actorUserId: null, action: 'PLATFORM_SUPER_ADMIN_BOOTSTRAPPED', targetUserId: 'user-1', metadataJson: '{"source":"explicit-bootstrap"}' } });
  });

  it('promove o usuário indicado e registra auditoria na mesma transação', async () => {
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'Admin@Example.com', platformRole: 'USER' }),
        update: jest.fn().mockResolvedValue({ id: 'user-1', email: 'Admin@Example.com', platformRole: 'SUPER_ADMIN' }),
      },
      adminAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new AdminBootstrapService(prisma as never, new AdminAuditService(prisma as never));

    await expect(service.bootstrapSuperAdmin(' Admin@Example.com ')).resolves.toMatchObject({ promoted: true, userId: 'user-1', platformRole: 'SUPER_ADMIN' });
    expect(tx.user.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@example.com' } });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { platformRole: 'SUPER_ADMIN' } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: null, action: 'PLATFORM_SUPER_ADMIN_BOOTSTRAPPED', targetUserId: 'user-1' }) }));
  });

  it('é idempotente e não duplica auditoria para SUPER_ADMIN existente', async () => {
    const tx = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'admin@example.com', platformRole: 'SUPER_ADMIN' }), update: jest.fn() }, adminAuditLog: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new AdminBootstrapService(prisma as never, new AdminAuditService(prisma as never));

    await expect(service.bootstrapSuperAdmin('admin@example.com')).resolves.toMatchObject({ promoted: false, platformRole: 'SUPER_ADMIN' });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it('falha claramente quando o usuário do bootstrap não existe', async () => {
    const tx = { user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() }, adminAuditLog: { create: jest.fn() } };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new AdminBootstrapService(prisma as never, new AdminAuditService(prisma as never));

    await expect(service.bootstrapSuperAdmin('missing@example.com')).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.adminAuditLog.create).not.toHaveBeenCalled();
  });
});

describe('limites de exposição do papel da plataforma', () => {
  const user = { id: 'user-1', email: 'admin@example.com', name: 'Admin', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, platformRole: 'ADMIN', timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}' };

  it('expõe platformRole apenas na identidade autenticada', () => {
    expect(publicUser(user)).toMatchObject({ platformRole: 'ADMIN' });
    expect(publicIdentity(user)).not.toHaveProperty('platformRole');
  });

  it('rejeita platformRole no cadastro e na atualização do perfil', async () => {
    const registerErrors = await validate(Object.assign(new RegisterDto(), { email: 'user@example.com', name: 'User', password: 'password123', platformRole: 'SUPER_ADMIN' }), { whitelist: true, forbidNonWhitelisted: true });
    const profileErrors = await validate(Object.assign(new UpdateProfileDto(), { name: 'User', platformRole: 'SUPER_ADMIN' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(registerErrors.some((error) => error.property === 'platformRole')).toBe(true);
    expect(profileErrors.some((error) => error.property === 'platformRole')).toBe(true);
  });
});
