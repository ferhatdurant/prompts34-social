import { describe, expect, it } from 'vitest';
import {
  TWEET_WEIGHT_BUDGET,
  URL_WEIGHT,
  buildHashtagReply,
  buildPromptTweet,
  buildTwitterDestinationUrl,
  truncateToWeight,
  weightedLength,
} from '../src/twitter-text.js';

const PROMPT_URL = 'https://prompts34.com/prompts/abc-123';

describe('weightedLength', () => {
  it('counts ASCII as 1 each', () => {
    expect(weightedLength('hello world')).toBe(11);
  });

  it('counts URLs as fixed 23 regardless of length', () => {
    expect(weightedLength('https://x.co')).toBe(URL_WEIGHT);
    expect(weightedLength('https://prompts34.com/prompts/abc-123?utm_source=x')).toBe(URL_WEIGHT);
  });

  it('counts the … ellipsis as 2 (Other Unicode)', () => {
    expect(weightedLength('a…')).toBe(3);
  });

  it('counts CJK as 2', () => {
    expect(weightedLength('你好')).toBe(4);
  });

  it('counts a basic emoji as 2', () => {
    expect(weightedLength('🎉')).toBe(2);
  });

  it('treats ZWJ as weight 0', () => {
    const family = '👨‍👩‍👧';
    expect(weightedLength(family)).toBe(6);
  });

  it('mixes URL with text correctly', () => {
    expect(weightedLength('check https://example.com out')).toBe(6 + URL_WEIGHT + 4);
  });
});

describe('truncateToWeight', () => {
  it('returns input unchanged when already within budget', () => {
    expect(truncateToWeight('short', 100)).toBe('short');
  });

  it('appends … and stays within budget', () => {
    const out = truncateToWeight('a'.repeat(100), 20);
    expect(weightedLength(out)).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
  });

  it('respects URL boundaries during truncation', () => {
    const out = truncateToWeight('hello https://example.com world', 30);
    expect(weightedLength(out)).toBeLessThanOrEqual(30);
  });
});

describe('buildTwitterDestinationUrl', () => {
  it('appends UTM params to a clean permalink', () => {
    const url = buildTwitterDestinationUrl('https://prompts34.com/prompts/abc');
    expect(url).toBe(
      'https://prompts34.com/prompts/abc?utm_source=x&utm_medium=social&utm_campaign=prompt-of-day',
    );
  });

  it('uses & when permalink already has a query', () => {
    const url = buildTwitterDestinationUrl('https://prompts34.com/prompts/abc?ref=foo');
    expect(url.includes('?ref=foo&utm_source=x')).toBe(true);
  });
});

describe('buildPromptTweet', () => {
  it('emits headline, body, and url separated by blank lines', () => {
    const text = buildPromptTweet({
      headline: 'Günün Promptu',
      title: 'CV Hazırlama',
      description: 'Kısa açıklama',
      url: PROMPT_URL,
    });
    expect(text.startsWith('Günün Promptu: CV Hazırlama')).toBe(true);
    expect(text.includes('\n\nKısa açıklama\n\n')).toBe(true);
    expect(text.endsWith(PROMPT_URL)).toBe(true);
    expect(weightedLength(text)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
  });

  it('truncates long Turkish descriptions with … and stays under budget', () => {
    const longDescription =
      'Bu çok uzun bir açıklama metnidir ve normalde Twitter karakter sınırını rahatça aşmalıdır. ' +
      'Burada birden fazla cümle ve örüntü kullanıyoruz çünkü kırpılmanın doğru çalıştığını ' +
      'doğrulamak istiyoruz. Karakter sayısı arttıkça kırpılma tetiklenmelidir ve sonuna … eklenmelidir.';
    const text = buildPromptTweet({
      headline: 'Günün Promptu',
      title: 'CV Hazırlama',
      description: longDescription,
      url: PROMPT_URL,
    });
    expect(weightedLength(text)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
    expect(text.includes('…')).toBe(true);
    expect(text.endsWith(PROMPT_URL)).toBe(true);
  });

  it('reproduces the previously-failing live tweet under budget', () => {
    const failing = buildPromptTweet({
      headline: 'Günün Promptu',
      title: 'Çift Pozlama: İnsan ve Doğanın Sanatsal Birleşimi',
      description:
        'Bu prompt, fotoğrafçılıkta "Double Exposure" olarak bilinen tekniği simüle eder. ' +
        'Bir insan portresi (genellikle siluet) ile bir manzara veya şehir görüntüsünü estetik bir şekilde harmanlamayı amaçlar.',
      url: PROMPT_URL,
    });
    expect(weightedLength(failing)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
  });

  it('handles emoji and CJK without busting the budget', () => {
    const text = buildPromptTweet({
      headline: 'Günün Promptu',
      title: '🎉 Mixed 内容 Test',
      description: 'Description with emoji 🚀 and CJK 漢字 mixed throughout the body for stress testing.',
      url: PROMPT_URL,
    });
    expect(weightedLength(text)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
  });
});

describe('buildHashtagReply', () => {
  it('produces non-empty hashtag string starting with #', () => {
    const reply = buildHashtagReply({ title: 'CV Hazırlama', tags: ['cv', 'kariyer'] });
    expect(reply.startsWith('#')).toBe(true);
    expect(reply.split(' ').length).toBeGreaterThan(5);
    expect(weightedLength(reply)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
  });

  it('stays within budget even with very long tag list', () => {
    const reply = buildHashtagReply({
      title: 'Çift Pozlama: İnsan ve Doğanın Sanatsal Birleşimi',
      tags: [
        'gorseluretim', 'midjourney', 'doubleexposure', 'ciftpozlama', 'portre', 'surreal',
        'sanat', 'illustrasyon', 'cift', 'pozlama', 'insan', 've', 'doganin', 'sanatsal',
        'birlesimi', 'gununpromptu', 'prompts34', 'yapayzeka', 'prompt', 'chatgpt',
      ],
    });
    expect(weightedLength(reply)).toBeLessThanOrEqual(TWEET_WEIGHT_BUDGET);
  });
});
