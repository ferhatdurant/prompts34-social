import { createHash } from 'node:crypto';
import type { PromptRecord } from './types.js';

export function getPromptCandidates(prompts: PromptRecord[]): PromptRecord[] {
  return prompts
    .filter(
      (prompt) =>
        prompt.is_public &&
        prompt.title.trim().length > 0 &&
        (prompt.explanation ?? '').trim().length > 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function choosePromptOfTheDay(
  prompts: PromptRecord[],
  date = new Date(),
): PromptRecord {
  const candidates = getPromptCandidates(prompts);
  if (candidates.length === 0) {
    throw new Error('No public prompts with explanation are available for Günün Promptu');
  }

  const dayKey = date.toISOString().slice(0, 10);
  const hash = createHash('sha256').update(dayKey).digest('hex');
  const numeric = Number.parseInt(hash.slice(0, 12), 16);
  return candidates[numeric % candidates.length];
}

export function buildInstagramCaption(description: string, websiteUrl: string): string {
  return `${description.trim()}\n\nBu prompta ücretsiz olarak ulaşmak için ${websiteUrl.replace(/^https?:\/\//, '')}`;
}

export function buildGeminiImagePrompt(title: string): string {
  return [
    'Create a polished Instagram-ready background artwork for Prompts34.',
    'The image must be portrait-oriented and optimized for an Instagram feed post.',
    'Do not include any words, letters, numbers, logos, watermarks, UI screenshots, or typographic elements in the generated image.',
    'Do not render the prompt title anywhere in the image.',
    'Do not place any header text at the top of the image.',
    `The theme should visually fit this prompt topic in an abstract way: "${title}".`,
    'Use a clean premium editorial layout, modern AI/productivity visual language, strong contrast, and professional social-media art direction.',
    'Leave a large clean central area for later text overlay and keep the upper-middle area free of any visual clutter.',
    'No watermark.',
  ].join(' ');
}

function slugToken(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function buildHashtagComment(title: string, tags: string[]): string {
  const baseHashtags = [
    'gununpromptu',
    'prompts34',
    'yapayzeka',
    'prompt',
    'chatgpt',
    'gemini',
    'aitools',
    'promptengineering',
    'artificialintelligence',
    'productivity',
    'turkishai',
    'instaturkiye',
    'kesfet',
    'explorepage',
    'ai',
    'contentcreator',
    'digitaltools',
    'workflow',
    'creativity',
    'innovation',
  ];
  const titleTokens = title
    .split(/\s+/)
    .map(slugToken)
    .filter(Boolean);
  const tagTokens = tags.map(slugToken).filter(Boolean);

  const ordered = [...tagTokens, ...titleTokens, ...baseHashtags];
  const unique = Array.from(new Set(ordered));
  const selected = unique.slice(0, 24);
  return selected.map((tag) => `#${tag}`).join(' ');
}
