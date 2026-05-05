import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { settings } from './config.js';

async function ensurePublicBucket(): Promise<void> {
  if (!settings.supabaseUrl || !settings.supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration for upload');
  }

  const supabase = createClient(
    settings.supabaseUrl,
    settings.supabaseServiceRoleKey,
  );
  const bucketName = settings.supabaseStorageBucket;
  const existing = await supabase.storage.getBucket(bucketName);

  if (!existing.error && existing.data) {
    if (!existing.data.public) {
      const update = await supabase.storage.updateBucket(bucketName, {
        public: true,
      });
      if (update.error) {
        throw new Error(`Supabase bucket update failed: ${update.error.message}`);
      }
    }
    return;
  }

  const create = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '10MB',
  });
  if (create.error) {
    throw new Error(`Supabase bucket create failed: ${create.error.message}`);
  }
}

export async function writeLocalImage(
  dateKey: string,
  bytes: Buffer,
  extension: string,
): Promise<string> {
  const dir = path.join(settings.outputRoot, dateKey);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `gunun-promptu.${extension}`);
  await writeFile(filePath, bytes);
  return filePath;
}

export async function uploadPublicImage(
  dateKey: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  if (!settings.supabaseUrl || !settings.supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration for upload');
  }

  await ensurePublicBucket();

  const supabase = createClient(
    settings.supabaseUrl,
    settings.supabaseServiceRoleKey,
  );

  const extension = mimeType.split('/')[1] ?? 'png';
  const storagePath = `instagram/gunun-promptu/${dateKey}.${extension}`;
  const upload = await supabase.storage
    .from(settings.supabaseStorageBucket)
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (upload.error) {
    throw new Error(`Supabase upload failed: ${upload.error.message}`);
  }

  const publicUrl = supabase.storage
    .from(settings.supabaseStorageBucket)
    .getPublicUrl(storagePath).data.publicUrl;

  if (!publicUrl) {
    throw new Error('Supabase did not return a public URL');
  }

  return publicUrl;
}
