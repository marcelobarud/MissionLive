import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';

export type TeamImageStorage = { save(teamId: string, content: Buffer): Promise<string>; read(key: string): Promise<Buffer>; delete(key: string): Promise<void> };

export class LocalTeamImageStorage implements TeamImageStorage {
  private readonly root = resolve(process.env.TEAM_IMAGE_STORAGE_DIR || join(process.cwd(), 'var', 'uploads', 'teams'));

  async save(teamId: string, content: Buffer) {
    if (!/^[0-9a-f-]{36}$/i.test(teamId)) throw new Error('Invalid team image owner.');
    const key = `${teamId}/${randomUUID()}.webp`;
    const file = resolve(this.root, key);
    if (!file.startsWith(`${this.root}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Invalid team image key.');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content, { flag: 'wx' });
    return key;
  }

  private pathFor(key: string) {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key)) throw new Error('Invalid team image key.');
    const file = resolve(this.root, key);
    if (!file.startsWith(`${this.root}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Invalid team image key.');
    return file;
  }

  read(key: string) { return readFile(this.pathFor(key)); }
  async delete(key: string) { try { await unlink(this.pathFor(key)); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
}
