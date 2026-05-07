import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { settings } from './config.js';
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeAuthorizationCode,
} from './twitter-auth.js';
import { saveTwitterRefreshToken } from './twitter-tokens.js';

interface AuthorizeOptions {
  noBrowser?: boolean;
  timeoutMs?: number;
}

interface CallbackResult {
  code: string;
  state: string;
}

function parseRedirectUri(): { hostname: string; port: number; pathname: string } {
  const url = new URL(settings.xRedirectUri);
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  return { hostname: url.hostname || 'localhost', port, pathname: url.pathname || '/' };
}

function startCallbackServer(
  expectedState: string,
  timeoutMs: number,
): Promise<CallbackResult> {
  const { hostname, port, pathname } = parseRedirectUri();
  return new Promise<CallbackResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`Timed out waiting for OAuth callback after ${timeoutMs}ms`));
    }, timeoutMs);

    const server = createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end('Missing URL');
        return;
      }

      const requestUrl = new URL(req.url, `http://${hostname}:${port}`);
      if (requestUrl.pathname !== pathname) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');
      const error = requestUrl.searchParams.get('error');

      if (error) {
        res.statusCode = 400;
        res.end(`OAuth error: ${error}`);
        clearTimeout(timer);
        server.close();
        reject(new Error(`X authorize returned error: ${error}`));
        return;
      }

      if (!code || !state) {
        res.statusCode = 400;
        res.end('Missing code or state');
        return;
      }

      if (state !== expectedState) {
        res.statusCode = 400;
        res.end('State mismatch');
        clearTimeout(timer);
        server.close();
        reject(new Error('OAuth state mismatch'));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        '<html><body style="font-family:system-ui;padding:2rem"><h2>Authorized.</h2><p>You can close this window.</p></body></html>',
      );
      clearTimeout(timer);
      server.close();
      resolve({ code, state });
    });

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    server.listen(port, hostname);
  });
}

async function tryOpenBrowser(url: string): Promise<void> {
  const { spawn } = await import('node:child_process');
  const platform = process.platform;
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  try {
    spawn(command, [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // ignore — we already printed the URL for manual open
  }
}

export async function runTwitterAuthorize(options: AuthorizeOptions = {}): Promise<{
  scope: string;
  username?: string;
}> {
  if (!settings.xClientId || !settings.xClientSecret) {
    throw new Error('Missing X_CLIENT_ID or X_CLIENT_SECRET');
  }

  const pkce = createPkcePair();
  const state = randomBytes(16).toString('hex');
  const authorizeUrl = buildAuthorizeUrl(state, pkce.challenge);

  console.log('\nOpen this URL in a browser logged in as the @prompts34 X account:\n');
  console.log(authorizeUrl);
  console.log('\nWaiting for the OAuth callback on', settings.xRedirectUri, '\n');

  if (!options.noBrowser) {
    await tryOpenBrowser(authorizeUrl);
  }

  const { code } = await startCallbackServer(state, options.timeoutMs ?? 5 * 60 * 1000);
  const tokens = await exchangeAuthorizationCode(code, pkce.verifier);

  if (!tokens.refresh_token) {
    throw new Error(
      'X did not return a refresh_token. Make sure the App requests the offline.access scope.',
    );
  }

  await saveTwitterRefreshToken(tokens.refresh_token, tokens.scope);

  return { scope: tokens.scope };
}
