import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';
import { randomUUID } from 'node:crypto';

export const GOAL_PHOTO_STORAGE = Symbol('GOAL_PHOTO_STORAGE');
export type GoalPhotoVariant = 'image' | 'thumbnail';
export type GoalPhotoStorage = {
  save(goalId: string, variant: GoalPhotoVariant, content: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

export class LocalGoalPhotoStorage implements GoalPhotoStorage {
  private readonly root = process.env.GOAL_PHOTO_STORAGE_DIR || join(process.cwd(), 'var', 'goal-photos');

  private pathFor(key: string) {
    const root = normalize(this.root);
    const target = normalize(join(root, key));
    const rel = relative(root, target);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Invalid goal photo key.');
    return target;
  }

  async save(goalId: string, variant: GoalPhotoVariant, content: Buffer) {
    const key = join(goalId, `${variant}-${randomUUID()}.webp`);
    const target = this.pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
    return key;
  }

  read(key: string) { return readFile(this.pathFor(key)); }

  async delete(key: string) {
    try { await unlink(this.pathFor(key)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}
