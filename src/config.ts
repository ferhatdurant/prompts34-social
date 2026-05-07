import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  PROMPTS34_API_URL: z.string().url().default('https://api.prompts34.com'),
  PROMPTS34_WEBSITE_URL: z.string().url().default('https://prompts34.com'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_IMAGE_MODEL: z.string().min(1).default('gemini-3.1-flash-image-preview'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('instagram-assets'),
  INSTAGRAM_GRAPH_API_VERSION: z.string().min(1).default('v24.0'),
  INSTAGRAM_API_MODE: z
    .enum(['instagram_login', 'facebook_login'])
    .default('instagram_login'),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),
  INSTAGRAM_IG_USER_ID: z.string().min(1).optional(),
  SCHEDULE_DEDUPE_WINDOW: z.coerce.number().int().positive().default(14),
  SCHEDULE_TARGET_HOUR_TR: z.coerce.number().int().min(0).max(23).default(12),
  SCHEDULE_TARGET_MINUTE_TR: z.coerce.number().int().min(0).max(59).default(30),
  X_CLIENT_ID: z.string().min(1).optional(),
  X_CLIENT_SECRET: z.string().min(1).optional(),
  X_REDIRECT_URI: z.string().url().default('http://localhost:8765/callback'),
  X_API_BASE: z.string().url().default('https://api.x.com'),
  X_AUTHORIZE_BASE: z.string().url().default('https://x.com/i/oauth2/authorize'),
  X_TOKEN_BUCKET: z.string().min(1).default('social-tokens'),
});

const cleanedEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    value === '' ? undefined : value,
  ]),
);
const parsed = envSchema.parse(cleanedEnv);

export const settings = {
  promptsApiUrl: parsed.PROMPTS34_API_URL,
  websiteUrl: parsed.PROMPTS34_WEBSITE_URL.replace(/\/$/, ''),
  geminiApiKey: parsed.GEMINI_API_KEY,
  geminiImageModel: parsed.GEMINI_IMAGE_MODEL,
  supabaseUrl: parsed.SUPABASE_URL,
  supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: parsed.SUPABASE_STORAGE_BUCKET,
  instagramGraphApiVersion: parsed.INSTAGRAM_GRAPH_API_VERSION,
  instagramApiMode: parsed.INSTAGRAM_API_MODE,
  instagramAccessToken: parsed.INSTAGRAM_ACCESS_TOKEN,
  instagramIgUserId: parsed.INSTAGRAM_IG_USER_ID,
  scheduleDedupeWindow: parsed.SCHEDULE_DEDUPE_WINDOW,
  scheduleTargetHourTr: parsed.SCHEDULE_TARGET_HOUR_TR,
  scheduleTargetMinuteTr: parsed.SCHEDULE_TARGET_MINUTE_TR,
  xClientId: parsed.X_CLIENT_ID,
  xClientSecret: parsed.X_CLIENT_SECRET,
  xRedirectUri: parsed.X_REDIRECT_URI,
  xApiBase: parsed.X_API_BASE.replace(/\/$/, ''),
  xAuthorizeBase: parsed.X_AUTHORIZE_BASE,
  xTokenBucket: parsed.X_TOKEN_BUCKET,
  outputRoot: 'output',
};

export function requireGenerationConfig(): void {
  if (!settings.geminiApiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }
  if (!settings.supabaseUrl || !settings.supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for public image upload',
    );
  }
}

export function requirePublishConfig(): void {
  requireGenerationConfig();
  if (!settings.instagramAccessToken || !settings.instagramIgUserId) {
    throw new Error(
      'Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID for Instagram publishing',
    );
  }
}

export function requireTwitterConfig(): void {
  if (!settings.supabaseUrl || !settings.supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Twitter token storage',
    );
  }
  if (!settings.xClientId || !settings.xClientSecret) {
    throw new Error('Missing X_CLIENT_ID or X_CLIENT_SECRET for Twitter publishing');
  }
}

export function requireTwitterPublishConfig(): void {
  requireGenerationConfig();
  requireTwitterConfig();
}
