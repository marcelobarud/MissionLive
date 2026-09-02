import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { AvatarsService, MAX_AVATAR_BYTES } from '../src/avatars/avatars.service';

function fakeUser() { return { id: '11111111-1111-1111-1111-111111111111', email: 'ana@example.com', name: 'Ana', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null, timezone: 'UTC', onboardingCompletedAt: null, preferencesJson: '{}' }; }
function fakePrisma() { const user = fakeUser(); return { user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...user, ...data })) } }; }
function fakeStorage() { return { save: jest.fn().mockResolvedValue('11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp'), read: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) }; }

describe('AvatarsService', () => {
  it('accepts an allowlisted preset without trusting a client user id', async () => {
    const prisma = fakePrisma(); const storage = fakeStorage(); const service = new AvatarsService(prisma as never, storage);
    const result = await service.setPreset(fakeUser().id, 'avatar-01');
    expect(result.avatar).toEqual({ type: 'preset', presetId: 'avatar-01', url: null });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: fakeUser().id }, data: expect.objectContaining({ avatarType: 'PRESET' }) }));
  });

  it.each(['image/gif', 'image/svg+xml', 'text/plain'])('rejects unsupported MIME %s', async (mimetype) => {
    const service = new AvatarsService(fakePrisma() as never, fakeStorage());
    await expect(service.upload(fakeUser().id, { buffer: Buffer.from('bad'), size: 3, mimetype })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates the actual image and stores only a 256px WebP', async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 220, g: 60, b: 90 } } }).jpeg().toBuffer();
    const storage = fakeStorage(); const service = new AvatarsService(fakePrisma() as never, storage);
    const result = await service.upload(fakeUser().id, { buffer: input, size: input.byteLength, mimetype: 'image/jpeg' });
    const metadata = await sharp(storage.save.mock.calls[0][1]).metadata();
    expect(metadata.format).toBe('webp'); expect(metadata.width).toBe(256); expect(metadata.height).toBe(256); expect(result.avatar.type).toBe('upload'); expect(result.avatar.url).toContain('/media/avatars/');
  });

  it('rejects oversized files and malformed MIME-spoofed content', async () => {
    const service = new AvatarsService(fakePrisma() as never, fakeStorage());
    await expect(service.upload(fakeUser().id, { buffer: Buffer.alloc(MAX_AVATAR_BYTES + 1), size: MAX_AVATAR_BYTES + 1, mimetype: 'image/jpeg' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload(fakeUser().id, { buffer: Buffer.from('<svg></svg>'), size: 11, mimetype: 'image/png' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes the newly written file when the database update fails', async () => {
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'blue' } }).png().toBuffer();
    const prisma = fakePrisma(); prisma.user.update.mockRejectedValue(new Error('database unavailable')); const storage = fakeStorage(); const service = new AvatarsService(prisma as never, storage);
    await expect(service.upload(fakeUser().id, { buffer: input, size: input.byteLength, mimetype: 'image/png' })).rejects.toThrow('database unavailable');
    expect(storage.delete).toHaveBeenCalledWith(expect.stringContaining('.webp'));
  });
});
