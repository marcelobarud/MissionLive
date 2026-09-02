import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

export type AvatarStorage = { save(userId: string, content: Buffer): Promise<string>; read(key: string): Promise<Buffer>; delete(key: string): Promise<void> };

export class LocalAvatarStorage implements AvatarStorage {
  private readonly root = resolve(process.env.AVATAR_STORAGE_DIR || join(process.cwd(), 'var', 'avatars'));

  async save(userId: string, content: Buffer) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid avatar owner.');
    const key = `${userId}/${randomUUID()}.webp`;
    const file = resolve(this.root, key);
    if (!file.startsWith(`${this.root}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Invalid avatar key.');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content, { flag: 'wx' });
    return key;
  }

  private pathFor(key: string) {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key)) throw new Error('Invalid avatar key.');
    const file = resolve(this.root, key);
    if (!file.startsWith(`${this.root}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Invalid avatar key.');
    return file;
  }

  read(key: string) { return readFile(this.pathFor(key)); }
  async delete(key: string) { try { await unlink(this.pathFor(key)); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
}
