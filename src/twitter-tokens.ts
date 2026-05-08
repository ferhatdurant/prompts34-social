import { createClient } from '@supabase/supabase-js';
import { settings } from './config.js';
import type { TwitterTokenRecord } from './types.js';

const TOKEN_OBJECT_PATH = 'twitter.json';

function createSupabaseAdminClient() {
  if (!settings.supabaseUrl || !settings.supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration for token storage');
  }
  return createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
}

async function ensurePrivateTokenBucket(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const bucketName = settings.xTokenBucket;
  const existing = await supabase.storage.getBucket(bucketName);

  if (!existing.error && existing.data) {
    if (existing.data.public) {
      throw new Error(
        `Token bucket "${bucketName}" is public; refusing to store secrets there. Recreate it as a private bucket.`,
      );
    }
    return;
  }

  const create = await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: '64KB',
  });
  if (create.error) {
    throw new Error(`Supabase token bucket create failed: ${create.error.message}`);
  }
}

export async function loadTwitterRefreshToken(): Promise<TwitterTokenRecord | null> {
  await ensurePrivateTokenBucket();
  const supabase = createSupabaseAdminClient();
  const result = await supabase.storage
    .from(settings.xTokenBucket)
    .download(TOKEN_OBJECT_PATH);

  if (result.error) {
    const message = result.error.message ?? '';
    if (/not found/i.test(message) || /Object not found/i.test(message)) {
      return null;
    }
    throw new Error(`Twitter token download failed: ${message}`);
  }

  const text = await result.data.text();
  const parsed = JSON.parse(text) as TwitterTokenRecord;
  if (!parsed.refreshToken) {
    return null;
  }
  return parsed;
}

export async function saveTwitterRefreshToken(
  refreshToken: string,
  scope: string,
): Promise<void> {
  await ensurePrivateTokenBucket();
  const supabase = createSupabaseAdminClient();

  const payload: TwitterTokenRecord = {
    refreshToken,
    scope,
    updatedAt: new Date().toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');

  const upload = await supabase.storage
    .from(settings.xTokenBucket)
    .upload(TOKEN_OBJECT_PATH, body, {
      contentType: 'application/json',
      upsert: true,
    });
  if (upload.error) {
    throw new Error(`Twitter token upload failed: ${upload.error.message}`);
  }
}
