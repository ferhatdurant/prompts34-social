import { settings } from './config.js';
import { getActiveAccessToken } from './twitter-auth.js';

interface TweetCreateBody {
  text: string;
  media?: { media_ids: string[] };
  reply?: { in_reply_to_tweet_id: string };
}

async function callJson<T>(
  pathname: string,
  init: RequestInit,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`${settings.xApiBase}${pathname}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`X API error ${response.status} on ${pathname}: ${JSON.stringify(json)}`);
  }
  return json as T;
}

function extractMediaId(json: Record<string, unknown>): string | undefined {
  const data = (json.data ?? json) as Record<string, unknown>;
  return (
    (data.id as string | undefined) ??
    (data.media_id_string as string | undefined) ??
    (data.media_id as string | undefined)
  );
}

function extractProcessingState(
  json: Record<string, unknown>,
): { state?: string; checkAfterSecs?: number } | null {
  const data = (json.data ?? json) as Record<string, unknown>;
  const info = data.processing_info as
    | { state?: string; check_after_secs?: number }
    | undefined;
  if (!info) return null;
  return { state: info.state, checkAfterSecs: info.check_after_secs };
}

async function pollMediaStatus(mediaId: string, accessToken: string): Promise<void> {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `${settings.xApiBase}/2/media/upload/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`X media upload error ${response.status} on STATUS: ${body}`);
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const info = extractProcessingState(json);
    if (!info || info.state === 'succeeded') return;
    if (info.state === 'failed') {
      throw new Error(`X media upload STATUS reported failure: ${JSON.stringify(json)}`);
    }
    const wait = Math.min(Math.max(info.checkAfterSecs ?? 1, 1), 5) * 1000;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  throw new Error(`X media upload STATUS did not reach succeeded for media_id ${mediaId}`);
}

export async function uploadMedia(
  imageBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const accessToken = await getActiveAccessToken();

  const initResponse = await fetch(`${settings.xApiBase}/2/media/upload/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: mimeType,
      total_bytes: imageBytes.byteLength,
      media_category: 'tweet_image',
    }),
  });
  if (!initResponse.ok) {
    const body = await initResponse.text().catch(() => '');
    throw new Error(`X media upload error ${initResponse.status} on INITIALIZE: ${body}`);
  }
  const initJson = (await initResponse.json().catch(() => ({}))) as Record<string, unknown>;
  const mediaId = extractMediaId(initJson);
  if (!mediaId) {
    throw new Error(`X media upload INITIALIZE returned no id: ${JSON.stringify(initJson)}`);
  }

  const arrayBuffer = new ArrayBuffer(imageBytes.byteLength);
  new Uint8Array(arrayBuffer).set(imageBytes);
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const appendForm = new FormData();
  appendForm.set('segment_index', '0');
  appendForm.set('media', blob, `gunun-promptu.${mimeType.split('/')[1] ?? 'png'}`);

  const appendResponse = await fetch(
    `${settings.xApiBase}/2/media/upload/${mediaId}/append`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: appendForm,
    },
  );
  if (!appendResponse.ok) {
    const body = await appendResponse.text().catch(() => '');
    throw new Error(`X media upload error ${appendResponse.status} on APPEND: ${body}`);
  }

  const finalizeResponse = await fetch(
    `${settings.xApiBase}/2/media/upload/${mediaId}/finalize`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!finalizeResponse.ok) {
    const body = await finalizeResponse.text().catch(() => '');
    throw new Error(`X media upload error ${finalizeResponse.status} on FINALIZE: ${body}`);
  }
  const finalizeJson = (await finalizeResponse.json().catch(() => ({}))) as Record<string, unknown>;

  const processing = extractProcessingState(finalizeJson);
  if (processing && processing.state && processing.state !== 'succeeded') {
    await pollMediaStatus(mediaId, accessToken);
  }

  return mediaId;
}

export async function createTweet(
  text: string,
  options: { mediaId?: string; replyToTweetId?: string } = {},
): Promise<string> {
  const accessToken = await getActiveAccessToken();
  const body: TweetCreateBody = { text };
  if (options.mediaId) {
    body.media = { media_ids: [options.mediaId] };
  }
  if (options.replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  const json = await callJson<{ data?: { id?: string } }>(
    '/2/tweets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    accessToken,
  );

  const tweetId = json.data?.id;
  if (!tweetId) {
    throw new Error(`X tweet create returned no id: ${JSON.stringify(json)}`);
  }
  return tweetId;
}

export async function getAuthenticatedUser(): Promise<Record<string, unknown>> {
  const accessToken = await getActiveAccessToken();
  return callJson<Record<string, unknown>>(
    '/2/users/me?user.fields=username,name,public_metrics',
    { method: 'GET' },
    accessToken,
  );
}
