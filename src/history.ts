import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { settings } from './config.js';

interface DraftHistoryShape {
  date?: string;
  prompt?: {
    id?: string;
  };
  publish?: {
    published?: boolean;
  };
}

export async function getRecentlyPublishedPromptIds(limit = 14): Promise<string[]> {
  const root = settings.outputRoot;
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const ids: string[] = [];

  for (const directory of directories) {
    if (ids.length >= limit) {
      break;
    }

    const filePath = path.join(root, directory, 'instagram-post.json');
    const raw = await readFile(filePath, 'utf8').catch(() => null);
    if (!raw) {
      continue;
    }

    const parsed = JSON.parse(raw) as DraftHistoryShape;
    if (parsed.publish?.published && parsed.prompt?.id) {
      ids.push(parsed.prompt.id);
    }
  }

  return ids;
}
