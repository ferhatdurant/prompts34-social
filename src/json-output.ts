import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { settings } from './config.js';
import type { InstagramDraft, TwitterDraft } from './types.js';

export async function writeDraftJson(
  dateKey: string,
  payload: InstagramDraft,
): Promise<string> {
  const dir = path.join(settings.outputRoot, dateKey);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'instagram-post.json');
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

export async function writeTwitterDraftJson(
  dateKey: string,
  payload: TwitterDraft,
): Promise<string> {
  const dir = path.join(settings.outputRoot, dateKey);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'twitter-post.json');
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}
