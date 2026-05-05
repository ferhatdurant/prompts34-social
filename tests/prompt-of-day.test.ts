import { describe, expect, it } from 'vitest';
import {
  buildGeminiImagePrompt,
  buildInstagramCaption,
  choosePromptOfTheDay,
  getPromptCandidates,
} from '../src/prompt-of-day.js';
import type { PromptRecord } from '../src/types.js';

const prompts: PromptRecord[] = [
  {
    id: 'b',
    title: 'İkinci Prompt',
    content: 'hidden',
    tags: ['cv'],
    explanation: 'Açıklama 2',
    suggested_model: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a',
    title: 'İlk Prompt',
    content: 'hidden',
    tags: ['görsel'],
    explanation: 'Açıklama 1',
    suggested_model: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c',
    title: 'Eksik Açıklama',
    content: 'hidden',
    tags: [],
    explanation: null,
    suggested_model: null,
    is_public: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('prompt-of-day helpers', () => {
  it('filters to public prompts with explanation', () => {
    expect(getPromptCandidates(prompts).map((prompt) => prompt.id)).toEqual(['a', 'b']);
  });

  it('picks a deterministic prompt for a given day', () => {
    const first = choosePromptOfTheDay(prompts, new Date('2026-05-05T10:00:00Z'));
    const second = choosePromptOfTheDay(prompts, new Date('2026-05-05T23:59:59Z'));
    expect(first.id).toBe(second.id);
  });

  it('builds a caption without prompt content', () => {
    expect(buildInstagramCaption('Kısa açıklama', 'https://prompts34.com')).toBe(
      'Kısa açıklama\n\nBu prompta ücretsiz olarak ulaşmak için prompts34.com',
    );
  });

  it('builds an image prompt with the headline and title only', () => {
    const prompt = buildGeminiImagePrompt('CV Hazırlama');
    expect(prompt).toContain('background artwork');
    expect(prompt).toContain('CV Hazırlama');
    expect(prompt).toContain('Do not include any words');
  });
});
