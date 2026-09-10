import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { publicIdentity } from '../src/auth/user.serializer';

function fakePrisma() {
  const user = { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'America/Sao_Paulo', onboardingCompletedAt: null, preferencesJson: '{}', phone: null, birthDate: null, countryCode: null, region: null, city: null };
  return { user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...user, ...data })) } };
}

describe('dados opcionais do perfil', () => {
  it('normaliza telefone e persiste os dados civis e de localização', async () => {
    const prisma = fakePrisma(); const service = new AuthService(prisma as never, {} as never);
    await service.updateProfile('user-1', { phone: '+55 (11) 99999-9999', birthDate: '1990-05-10', countryCode: 'BR', region: 'SP', city: ' Campinas ' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' }, data: expect.objectContaining({ phone: '+5511999999999', birthDate: '1990-05-10', countryCode: 'BR', region: 'SP', city: 'Campinas' }) }));
  });

  it('limpa localização dependente quando o país muda', async () => {
    const prisma = fakePrisma(); const current = await prisma.user.findUnique(); current.countryCode = 'BR'; current.region = 'SP'; current.city = 'Campinas';
    const service = new AuthService(prisma as never, {} as never);
    await service.updateProfile('user-1', { countryCode: 'PT' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ countryCode: 'PT', region: null, city: null }) }));
  });

  it.each([
    { data: { phone: '123' }, label: 'telefone' },
    { data: { birthDate: '2099-01-01' }, label: 'nascimento' },
    { data: { countryCode: 'XX' }, label: 'país' },
    { data: { countryCode: 'BR', region: 'ZZ' }, label: 'UF' },
    { data: { city: 'Campinas' }, label: 'país' },
  ])('rejeita dados inválidos ($label)', async ({ data }) => {
    const prisma = fakePrisma(); const service = new AuthService(prisma as never, {} as never);
    await expect(service.updateProfile('user-1', data as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('usa exclusivamente o usuário autenticado e não expõe os campos privados na identidade pública', async () => {
    const prisma = fakePrisma(); const service = new AuthService(prisma as never, {} as never);
    await service.updateProfile('user-1', { city: 'Campinas', countryCode: 'BR', region: 'SP' });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-1' } }));
    const identity = publicIdentity({ id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null, phone: '+5511999999999', birthDate: '1990-05-10', countryCode: 'BR', region: 'SP', city: 'Campinas' });
    expect(identity).not.toHaveProperty('phone');
    expect(identity).not.toHaveProperty('birthDate');
    expect(identity).not.toHaveProperty('countryCode');
    expect(identity).not.toHaveProperty('region');
    expect(identity).not.toHaveProperty('city');
  });
});
