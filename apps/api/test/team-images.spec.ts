import { BadRequestException, ForbiddenException } from '@nestjs/common';
import sharp from 'sharp';
import { MAX_TEAM_IMAGE_BYTES, TeamsService } from '../src/teams/teams.service';

const TEAM_ID = '11111111-1111-1111-1111-111111111111';

function fakeTeam(overrides: Record<string, unknown> = {}) { return { id: TEAM_ID, ownerUserId: 'owner', name: 'Equipe teste', description: null, avatarUrl: null, imageFileKey: null, members: [], goals: [], ...overrides }; }
function fakePrisma(team = fakeTeam()) {
  let current = team;
  return { team: { findFirst: jest.fn().mockImplementation(async () => ({ ...current, members: current.members ?? [] })), findUnique: jest.fn().mockImplementation(async () => ({ imageFileKey: current.imageFileKey })), update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => { current = { ...current, ...data }; return current; }), delete: jest.fn().mockResolvedValue(current) } };
}
function fakeStorage() { return { save: jest.fn().mockResolvedValue(`${TEAM_ID}/22222222-2222-2222-2222-222222222222.webp`), read: jest.fn(), delete: jest.fn().mockResolvedValue(undefined) }; }
function fakeDependencies() { return { goals: { get: jest.fn() }, activity: { record: jest.fn() } }; }

describe('team images', () => {
  it('validates the actual image, stores a normalized WebP and hides the file key', async () => {
    const input = await sharp({ create: { width: 700, height: 420, channels: 3, background: { r: 31, g: 74, b: 65 } } }).jpeg().toBuffer();
    const prisma = fakePrisma(); const storage = fakeStorage(); const deps = fakeDependencies(); const service = new TeamsService(prisma as never, deps.goals as never, deps.activity as never, storage);
    const result = await service.uploadImage('owner', TEAM_ID, { buffer: input, size: input.byteLength, mimetype: 'image/jpeg' });
    const saved = storage.save.mock.calls[0][1] as Buffer; const metadata = await sharp(saved).metadata();
    expect(metadata.format).toBe('webp'); expect(metadata.width).toBe(512); expect(metadata.height).toBe(512); expect(result.imageUrl).toBe(`/teams/${TEAM_ID}/image`); expect(result).not.toHaveProperty('imageFileKey');
  });

  it.each(['image/gif', 'image/svg+xml', 'text/plain'])('rejects unsupported MIME %s', async (mimetype) => {
    const deps = fakeDependencies(); const service = new TeamsService(fakePrisma() as never, deps.goals as never, deps.activity as never, fakeStorage());
    await expect(service.uploadImage('owner', TEAM_ID, { buffer: Buffer.from('not an image'), size: 13, mimetype })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized files and a MIME-spoofed payload', async () => {
    const deps = fakeDependencies(); const service = new TeamsService(fakePrisma() as never, deps.goals as never, deps.activity as never, fakeStorage());
    await expect(service.uploadImage('owner', TEAM_ID, { buffer: Buffer.alloc(MAX_TEAM_IMAGE_BYTES + 1), size: MAX_TEAM_IMAGE_BYTES + 1, mimetype: 'image/jpeg' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.uploadImage('owner', TEAM_ID, { buffer: Buffer.from('<svg></svg>'), size: 11, mimetype: 'image/png' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only lets owner or admin replace/remove the image and cleans the previous file', async () => {
    const oldKey = `${TEAM_ID}/33333333-3333-3333-3333-333333333333.webp`; const prisma = fakePrisma(fakeTeam({ imageFileKey: oldKey, members: [{ id: 'member-1', userId: 'admin', role: 'admin', user: { id: 'admin', name: 'Admin', email: 'admin@example.test', avatarUrl: null, avatarType: null, avatarPresetId: null, avatarFileKey: null } }] })); const storage = fakeStorage(); const deps = fakeDependencies(); const service = new TeamsService(prisma as never, deps.goals as never, deps.activity as never, storage); const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'white' } }).png().toBuffer();
    await service.uploadImage('admin', TEAM_ID, { buffer: input, size: input.byteLength, mimetype: 'image/png' }); await service.removeImage('admin', TEAM_ID);
    expect(storage.delete).toHaveBeenCalledWith(oldKey); expect(storage.delete).toHaveBeenCalledWith(expect.stringContaining('.webp'));
    await expect(service.removeImage('viewer', TEAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('serves the image only after team access is validated', async () => {
    const key = `${TEAM_ID}/22222222-2222-2222-2222-222222222222.webp`; const prisma = fakePrisma(fakeTeam({ imageFileKey: key })); const storage = fakeStorage(); storage.read.mockResolvedValue(Buffer.from('webp')); const deps = fakeDependencies(); const service = new TeamsService(prisma as never, deps.goals as never, deps.activity as never, storage);
    await expect(service.readImage('owner', TEAM_ID)).resolves.toEqual(Buffer.from('webp'));
    prisma.team.findFirst.mockResolvedValueOnce(null);
    await expect(service.readImage('external-user', TEAM_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes the referenced image after deleting the team', async () => {
    const key = `${TEAM_ID}/22222222-2222-2222-2222-222222222222.webp`; const prisma = fakePrisma(fakeTeam({ imageFileKey: key })); const storage = fakeStorage(); const deps = fakeDependencies(); const service = new TeamsService(prisma as never, deps.goals as never, deps.activity as never, storage);
    await expect(service.remove('owner', TEAM_ID)).resolves.toEqual({ deleted: true });
    expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: TEAM_ID } });
    expect(storage.delete).toHaveBeenCalledWith(key);
  });
});
