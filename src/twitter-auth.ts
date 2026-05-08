import { createHash, randomBytes } from 'node:crypto';
import { settings } from './config.js';
import { loadTwitterRefreshToken, saveTwitterRefreshToken } from './twitter-tokens.js';

export const TWITTER_OAUTH_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'media.write',
  'offline.access',
];

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function createPkcePair(): PkcePair {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  if (!settings.xClientId) {
    throw new Error('Missing X_CLIENT_ID');
  }
  const url = new URL(settings.xAuthorizeBase);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', settings.xClientId);
  url.searchParams.set('redirect_uri', settings.xRedirectUri);
  url.searchParams.set('scope', TWITTER_OAUTH_SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

function basicAuthHeader(): string {
  if (!settings.xClientId || !settings.xClientSecret) {
    throw new Error('Missing X_CLIENT_ID or X_CLIENT_SECRET');
  }
  const raw = `${settings.xClientId}:${settings.xClientSecret}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${settings.xApiBase}/2/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`X token endpoint error (${response.status}): ${JSON.stringify(json)}`);
  }
  return json as unknown as TokenResponse;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  if (!settings.xClientId) {
    throw new Error('Missing X_CLIENT_ID');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: settings.xRedirectUri,
    code_verifier: codeVerifier,
    client_id: settings.xClientId,
  });
  return postToken(body);
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  if (!settings.xClientId) {
    throw new Error('Missing X_CLIENT_ID');
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: settings.xClientId,
  });
  return postToken(body);
}

export async function getActiveAccessToken(): Promise<string> {
  const stored = await loadTwitterRefreshToken();
  if (!stored) {
    throw new Error(
      'No Twitter refresh token stored. Run `npm run twitter:authorize` first.',
    );
  }
  const refreshed = await refreshAccessToken(stored.refreshToken);
  if (refreshed.refresh_token && refreshed.refresh_token !== stored.refreshToken) {
    await saveTwitterRefreshToken(refreshed.refresh_token, refreshed.scope);
  }
  return refreshed.access_token;
}
