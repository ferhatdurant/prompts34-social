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

export async function uploadMedia(
  imageBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const accessToken = await getActiveAccessToken();
  const form = new FormData();
  const arrayBuffer = new ArrayBuffer(imageBytes.byteLength);
  new Uint8Array(arrayBuffer).set(imageBytes);
  const blob = new Blob([arrayBuffer], { type: mimeType });
  form.set('media', blob, `gunun-promptu.${mimeType.split('/')[1] ?? 'png'}`);
  form.set('media_category', 'tweet_image');

  const response = await fetch(`${settings.xApiBase}/2/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`X media upload error ${response.status}: ${JSON.stringify(json)}`);
  }

  const data = (json.data ?? json) as Record<string, unknown>;
  const mediaId =
    (data.id as string | undefined) ??
    (data.media_id_string as string | undefined) ??
    (data.media_id as string | undefined);
  if (!mediaId) {
    throw new Error(`X media upload returned no id: ${JSON.stringify(json)}`);
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
