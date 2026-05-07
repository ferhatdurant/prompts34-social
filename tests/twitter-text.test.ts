import { describe, expect, it } from 'vitest';
import {
  TWITTER_MAX_TWEET_LENGTH,
  TWITTER_URL_LENGTH,
  buildTwitterText,
  buildTwitterHashtagReply,
} from '../src/prompt-of-day.js';

const SHORT_TITLE = 'CV Hazırlama';
const SHORT_DESCRIPTION = 'Kısa açıklama';
const LONG_DESCRIPTION =
  'Bu çok uzun bir açıklama metnidir ve normalde Twitter karakter sınırını rahatça aşmalıdır. ' +
  'Burada birden fazla cümle ve örüntü kullanıyoruz çünkü kırpılmanın doğru çalıştığını ' +
  'doğrulamak istiyoruz. Karakter sayısı arttıkça kırpılma tetiklenmelidir ve sonuna … eklenmelidir.';

function effectiveLength(text: string): number {
  return Array.from(text).length - 'https://prompts34.com'.length + TWITTER_URL_LENGTH;
}

describe('buildTwitterText', () => {
  it('emits a tweet that fits within Twitter limits for short input', () => {
    const text = buildTwitterText(SHORT_TITLE, SHORT_DESCRIPTION, 'https://prompts34.com');
    expect(text.startsWith('Günün Promptu: CV Hazırlama')).toBe(true);
    expect(text.includes('Kısa açıklama')).toBe(true);
    expect(text.endsWith('https://prompts34.com')).toBe(true);
    expect(effectiveLength(text)).toBeLessThanOrEqual(TWITTER_MAX_TWEET_LENGTH);
  });

  it('truncates long descriptions with ellipsis to stay under the limit', () => {
    const text = buildTwitterText(SHORT_TITLE, LONG_DESCRIPTION, 'https://prompts34.com');
    expect(effectiveLength(text)).toBeLessThanOrEqual(TWITTER_MAX_TWEET_LENGTH);
    expect(text.includes('…')).toBe(true);
    expect(text.endsWith('https://prompts34.com')).toBe(true);
  });

  it('never includes the prompt content (full prompt body) — only description', () => {
    const text = buildTwitterText(SHORT_TITLE, SHORT_DESCRIPTION, 'https://prompts34.com');
    expect(text).not.toMatch(/<content>|<prompt>/i);
  });
});

describe('buildTwitterHashtagReply', () => {
  it('produces a non-empty hashtag string', () => {
    const reply = buildTwitterHashtagReply(SHORT_TITLE, ['cv', 'kariyer']);
    expect(reply.startsWith('#')).toBe(true);
    expect(reply.split(' ').length).toBeGreaterThan(5);
  });
});
