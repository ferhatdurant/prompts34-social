import { describe, expect, it } from 'vitest';
import { buildAuthorizeUrl, createPkcePair } from '../src/twitter-auth.js';

describe('createPkcePair', () => {
  it('produces a verifier and a base64url-encoded SHA-256 challenge', () => {
    const pair = createPkcePair();
    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge.length).toBeGreaterThanOrEqual(43);
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.verifier).not.toBe(pair.challenge);
  });

  it('returns different verifiers across calls', () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe('buildAuthorizeUrl', () => {
  it('builds an authorize URL with required params and S256 challenge method', () => {
    process.env.X_CLIENT_ID = process.env.X_CLIENT_ID ?? 'test_client_id';
    const url = new URL(buildAuthorizeUrl('state123', 'challenge_abc'));
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state123');
    expect(url.searchParams.get('code_challenge')).toBe('challenge_abc');
    const scope = url.searchParams.get('scope') ?? '';
    expect(scope).toContain('tweet.write');
    expect(scope).toContain('offline.access');
  });
});
