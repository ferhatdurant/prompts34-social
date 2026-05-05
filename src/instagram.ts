import { settings } from './config.js';

interface ContainerStatus {
  id?: string;
  status_code?: string;
  status?: string;
}

function graphUrl(pathname: string): string {
  const host =
    settings.instagramApiMode === 'instagram_login'
      ? 'https://graph.instagram.com'
      : 'https://graph.facebook.com';
  return `${host}/${settings.instagramGraphApiVersion}${pathname}`;
}

async function postForm(
  pathname: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(graphUrl(pathname), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.instagramAccessToken}`,
    },
    body:
      settings.instagramApiMode === 'instagram_login'
        ? (() => {
            const form = new FormData();
            for (const [key, value] of Object.entries(body)) {
              form.set(key, value);
            }
            return form;
          })()
        : new URLSearchParams(body),
  });

  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Instagram Graph API error: ${JSON.stringify(json)}`);
  }
  return json;
}

async function getJson(pathname: string, params: Record<string, string>) {
  const url = new URL(graphUrl(pathname));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.instagramAccessToken}`,
    },
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Instagram Graph API error: ${JSON.stringify(json)}`);
  }
  return json;
}

export async function createImageContainer(imageUrl: string, caption: string): Promise<string> {
  if (!settings.instagramAccessToken || !settings.instagramIgUserId) {
    throw new Error('Missing Instagram credentials');
  }

  const payload = await postForm(`/${settings.instagramIgUserId}/media`, {
    image_url: imageUrl,
    caption,
    ...(settings.instagramApiMode === 'facebook_login'
      ? { access_token: settings.instagramAccessToken }
      : {}),
  });

  const id = payload.id;
  if (typeof id !== 'string') {
    throw new Error('Instagram Graph API did not return a container id');
  }

  return id;
}

export async function waitForContainer(containerId: string): Promise<void> {
  if (!settings.instagramAccessToken) {
    throw new Error('Missing Instagram access token');
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const payload = (await getJson(`/${containerId}`, {
      fields: 'status_code,status',
      ...(settings.instagramApiMode === 'facebook_login'
        ? { access_token: settings.instagramAccessToken }
        : {}),
    })) as unknown as ContainerStatus;

    if (payload.status_code === 'FINISHED' || payload.status === 'FINISHED') {
      return;
    }

    if (payload.status_code === 'ERROR' || payload.status === 'ERROR') {
      throw new Error(`Instagram media container failed: ${JSON.stringify(payload)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error('Instagram media container did not reach FINISHED status in time');
}

export async function publishContainer(containerId: string): Promise<string> {
  if (!settings.instagramAccessToken || !settings.instagramIgUserId) {
    throw new Error('Missing Instagram credentials');
  }

  const payload = await postForm(`/${settings.instagramIgUserId}/media_publish`, {
    creation_id: containerId,
    ...(settings.instagramApiMode === 'facebook_login'
      ? { access_token: settings.instagramAccessToken }
      : {}),
  });

  const id = payload.id;
  if (typeof id !== 'string') {
    throw new Error('Instagram Graph API did not return a media id');
  }

  return id;
}

export async function createMediaComment(
  mediaId: string,
  message: string,
): Promise<string> {
  if (!settings.instagramAccessToken) {
    throw new Error('Missing Instagram access token');
  }

  const payload = await postForm(`/${mediaId}/comments`, {
    message,
    ...(settings.instagramApiMode === 'facebook_login'
      ? { access_token: settings.instagramAccessToken }
      : {}),
  });

  const id = payload.id;
  if (typeof id !== 'string') {
    throw new Error('Instagram Graph API did not return a comment id');
  }

  return id;
}

export async function validateInstagramTarget(): Promise<Record<string, unknown>> {
  if (!settings.instagramAccessToken || !settings.instagramIgUserId) {
    throw new Error('Missing Instagram credentials');
  }

  return getJson(`/${settings.instagramIgUserId}`, {
    fields: 'id,username,account_type,media_count',
    ...(settings.instagramApiMode === 'facebook_login'
      ? { access_token: settings.instagramAccessToken }
      : {}),
  });
}
