import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { publicUser } from '../auth/user.serializer';
import { AvatarStorage } from './avatar-storage';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const AVATAR_STORAGE = Symbol('AVATAR_STORAGE');
const MAX_AVATAR_SIDE = 10000;
const MAX_AVATAR_PIXELS = 40_000_000;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);
  private readonly uploads = new Map<string, number[]>();
  constructor(private readonly prisma: PrismaService, @Inject(AVATAR_STORAGE) private readonly storage: AvatarStorage) {}

  async setPreset(userId: string, presetId: string) {
    if (!/^avatar-(0[1-9]|10)$/.test(presetId)) throw new BadRequestException('Invalid avatar preset.');
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('User not found.');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarType: 'PRESET', avatarPresetId: presetId, avatarFileKey: null } });
    await this.removeOld(current.avatarFileKey);
    return publicUser(user);
  }

  async upload(userId: string, file: { buffer: Buffer; size: number; mimetype: string }) {
    const now = Date.now(); const recent = (this.uploads.get(userId) ?? []).filter((timestamp) => now - timestamp < 60_000); if (recent.length >= 20) throw new BadRequestException('Too many avatar uploads. Try again shortly.'); recent.push(now); this.uploads.set(userId, recent);
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('An image file is required.');
    if (file.size > MAX_AVATAR_BYTES || file.buffer.byteLength > MAX_AVATAR_BYTES) throw new BadRequestException('The image must be at most 5 MB.');
    if (!MIME_TYPES.has(file.mimetype.toLowerCase())) throw new BadRequestException('Use a JPEG, PNG or WebP image.');
    const metadata = await sharp(file.buffer, { failOn: 'error', animated: false }).metadata().catch(() => { throw new BadRequestException('The image is invalid or malformed.'); });
    if (!metadata.width || !metadata.height || !metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || metadata.width > MAX_AVATAR_SIDE || metadata.height > MAX_AVATAR_SIDE || metadata.width * metadata.height > MAX_AVATAR_PIXELS || (metadata.pages ?? 1) > 1) throw new BadRequestException('The image dimensions or format are not supported.');
    const processed = await sharp(file.buffer, { failOn: 'error' }).rotate().resize(256, 256, { fit: 'cover', position: 'centre' }).webp({ quality: 84 }).toBuffer().catch(() => { throw new BadRequestException('The image could not be processed.'); });
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('User not found.');
    let newKey: string | undefined;
    try {
      newKey = await this.storage.save(userId, processed);
      const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarType: 'UPLOAD', avatarPresetId: null, avatarFileKey: newKey } });
      await this.removeOld(current.avatarFileKey);
      return publicUser(user);
    } catch (error) {
      if (newKey) await this.storage.delete(newKey).catch(() => undefined);
      throw error;
    }
  }

  async remove(userId: string) {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('User not found.');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { avatarType: null, avatarPresetId: null, avatarFileKey: null } });
    await this.removeOld(current.avatarFileKey);
    return publicUser(user);
  }

  async read(userId: string, fileName: string) {
    if (!/^[0-9a-f-]{36}\.webp$/i.test(fileName)) throw new NotFoundException('Avatar not found.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { avatarType: true, avatarFileKey: true } });
    if (!user || user.avatarType !== 'UPLOAD' || user.avatarFileKey !== `${userId}/${fileName}`) throw new NotFoundException('Avatar not found.');
    return this.storage.read(user.avatarFileKey).catch(() => { throw new NotFoundException('Avatar not found.'); });
  }

  private async removeOld(key?: string | null) { if (!key) return; await this.storage.delete(key).catch((error: unknown) => this.logger.warn(`Could not remove previous avatar: ${(error as Error).message}`)); }
}
