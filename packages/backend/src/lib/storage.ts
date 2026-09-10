import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../env.js';

export async function saveFile(buffer: Buffer, mimeType: string) {
  await fs.mkdir(env.STORAGE_PATH, { recursive: true });
  const ref = `${crypto.randomUUID()}.${({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' } as Record<string,string>)[mimeType]}`;
  await fs.writeFile(path.join(env.STORAGE_PATH, ref), buffer, { flag:'wx' });
  return ref;
}

export async function readFile(ref: string) {
  return fs.readFile(path.join(env.STORAGE_PATH, path.basename(ref)));
}

export function contentType(ref: string) {
  const ext = path.extname(ref).toLowerCase();
  return ext === '.jpg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp';
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
