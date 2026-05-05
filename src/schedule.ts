import { createHash } from 'node:crypto';
import type { PromptRecord, ScheduleCategory } from './types.js';

interface ScheduleRule {
  category: ScheduleCategory;
  includeTags: string[];
  includeTitleTerms?: string[];
}

const WEEKDAY_RULES: Record<number, ScheduleRule> = {
  1: {
    category: 'career_cv',
    includeTags: ['cv', 'özgeçmiş', 'kariyer', 'mulakat', 'interview', 'linkedin'],
    includeTitleTerms: ['cv', 'özgeçmiş', 'mülakat', 'linkedin', 'cover letter'],
  },
  2: {
    category: 'productivity',
    includeTags: ['yazılım', 'kod inceleme', 'refactor', 'workflow', 'otomasyon', 'verimlilik'],
    includeTitleTerms: ['refactor', 'kod', 'plan', 'analiz'],
  },
  3: {
    category: 'social_content',
    includeTags: ['sosyal medya', 'içerik üretimi', 'pazarlama', 'seo', 'blog', 'viral post'],
    includeTitleTerms: ['içerik', 'sosyal medya', 'blog', 'viral', 'x (twitter)', 'twitter'],
  },
  4: {
    category: 'business_email',
    includeTags: ['e-posta', 'iş planı', 'startup', 'strateji', 'sunum', 'iletişim'],
    includeTitleTerms: ['e-posta', 'iş planı', 'sunum', 'gelir modeli'],
  },
  5: {
    category: 'fun_creative',
    includeTags: ['görsel', 'görsel üretim', 'midjourney', 'sanat', 'portre', 'fantastik', 'selfie'],
    includeTitleTerms: ['görsel', 'portre', 'sanat', 'logo', 'midjourney', 'selfie'],
  },
  6: {
    category: 'business_email',
    includeTags: ['e-posta', 'iş planı', 'startup', 'strateji', 'sunum', 'iletişim'],
    includeTitleTerms: ['e-posta', 'iş planı', 'sunum', 'gelir modeli'],
  },
  0: {
    category: 'fun_creative',
    includeTags: ['görsel', 'görsel üretim', 'midjourney', 'sanat', 'portre', 'fantastik', 'selfie'],
    includeTitleTerms: ['görsel', 'portre', 'sanat', 'logo', 'midjourney', 'selfie'],
  },
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}

function promptMatchesRule(prompt: PromptRecord, rule: ScheduleRule): boolean {
  const normalizedTags = prompt.tags.map(normalize);
  const normalizedTitle = normalize(prompt.title);
  const tagMatch = rule.includeTags.some((tag) => normalizedTags.includes(normalize(tag)));
  const titleMatch = (rule.includeTitleTerms ?? []).some((term) =>
    normalizedTitle.includes(normalize(term)),
  );
  return tagMatch || titleMatch;
}

export function getScheduleRule(date = new Date()): ScheduleRule {
  return WEEKDAY_RULES[date.getDay()] ?? WEEKDAY_RULES[1];
}

export function chooseScheduledPrompt(
  prompts: PromptRecord[],
  date = new Date(),
  excludedPromptIds: string[] = [],
): { prompt: PromptRecord; category: ScheduleCategory } {
  const rule = getScheduleRule(date);
  const eligible = prompts
    .filter(
      (prompt) =>
        prompt.is_public &&
        prompt.title.trim().length > 0 &&
        (prompt.explanation ?? '').trim().length > 0 &&
        promptMatchesRule(prompt, rule),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const excluded = new Set(excludedPromptIds);
  const preferred = eligible.filter((prompt) => !excluded.has(prompt.id));
  const pool = preferred.length > 0 ? preferred : eligible;

  if (pool.length === 0) {
    throw new Error(`No prompts available for scheduled category ${rule.category}`);
  }

  const dayKey = date.toISOString().slice(0, 10);
  const hash = createHash('sha256')
    .update(`${rule.category}:${dayKey}`)
    .digest('hex');
  const numeric = Number.parseInt(hash.slice(0, 12), 16);

  return {
    prompt: pool[numeric % pool.length],
    category: rule.category,
  };
}
