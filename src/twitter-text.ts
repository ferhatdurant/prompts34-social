import { buildHashtagComment } from './prompt-of-day.js';

export const TWEET_WEIGHT_BUDGET = 250;
export const URL_WEIGHT = 23;

const URL_PATTERN = /https?:\/\/\S+/g;
const ZWJ = 0x200d;
const COMBINING_MARK = /\p{Mn}/u;

function isCjk(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x2e80 && cp <= 0x2fdf) ||
    (cp >= 0x2ff0 && cp <= 0x30ff) ||
    (cp >= 0x3100 && cp <= 0x318f) ||
    (cp >= 0x31a0 && cp <= 0x31ef) ||
    (cp >= 0x3200 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function isEmoji(cp: number): boolean {
  return (
    (cp >= 0x1f000 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    (cp >= 0xfe00 && cp <= 0xfe0f)
  );
}

function isOtherDoubleWeight(cp: number): boolean {
  return cp >= 0x2000 && cp <= 0x2bff;
}

function characterWeight(ch: string): number {
  const cp = ch.codePointAt(0);
  if (cp === undefined || cp === ZWJ) return 0;
  if (COMBINING_MARK.test(ch)) return 0;
  if (isEmoji(cp) || isCjk(cp) || isOtherDoubleWeight(cp)) return 2;
  return 1;
}

export function weightedLength(text: string): number {
  const normalized = text.normalize('NFC');
  let total = 0;
  let cursor = 0;
  for (const match of normalized.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    for (const ch of normalized.slice(cursor, start)) total += characterWeight(ch);
    total += URL_WEIGHT;
    cursor = start + match[0].length;
  }
  for (const ch of normalized.slice(cursor)) total += characterWeight(ch);
  return total;
}

export function truncateToWeight(text: string, maxWeight: number): string {
  if (maxWeight <= 0) return '';
  if (weightedLength(text) <= maxWeight) return text;
  if (maxWeight < 2) return '';

  const ellipsisReserve = 2;
  const cap = maxWeight - ellipsisReserve;
  const normalized = text.normalize('NFC');

  const urlSpans: Array<{ start: number; end: number }> = [];
  for (const m of normalized.matchAll(URL_PATTERN)) {
    const start = m.index ?? 0;
    urlSpans.push({ start, end: start + m[0].length });
  }

  let total = 0;
  let result = '';
  let i = 0;
  while (i < normalized.length) {
    const url = urlSpans.find((span) => span.start === i);
    if (url) {
      if (total + URL_WEIGHT > cap) break;
      total += URL_WEIGHT;
      result += normalized.slice(url.start, url.end);
      i = url.end;
      continue;
    }
    const cp = normalized.codePointAt(i);
    if (cp === undefined) break;
    const ch = String.fromCodePoint(cp);
    const w = characterWeight(ch);
    if (total + w > cap) break;
    total += w;
    result += ch;
    i += ch.length;
  }
  return `${result.trimEnd()}…`;
}

export function buildTwitterDestinationUrl(permalink: string): string {
  const trimmed = permalink.trim().replace(/\/$/, '');
  const separator = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${separator}utm_source=x&utm_medium=social&utm_campaign=prompt-of-day`;
}

interface PromptTweetInput {
  headline: string;
  title: string;
  description: string;
  url: string;
}

export function buildPromptTweet(input: PromptTweetInput): string {
  const headline = input.headline.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const url = input.url.trim();
  const separatorsWeight = 4;

  const headerLine = `${headline}: ${title}`;
  const headerWeight = weightedLength(headerLine);
  const bodyBudget = TWEET_WEIGHT_BUDGET - headerWeight - URL_WEIGHT - separatorsWeight;

  let finalHeader = headerLine;
  let body = description;

  if (bodyBudget <= 0) {
    const headerBudget = TWEET_WEIGHT_BUDGET - URL_WEIGHT - 2;
    finalHeader = truncateToWeight(headerLine, Math.max(0, headerBudget));
    body = '';
  } else if (weightedLength(description) > bodyBudget) {
    body = truncateToWeight(description, bodyBudget);
  }

  const result = body
    ? `${finalHeader}\n\n${body}\n\n${url}`
    : `${finalHeader}\n\n${url}`;

  if (weightedLength(result) > TWEET_WEIGHT_BUDGET) {
    throw new Error(
      `buildPromptTweet exceeded budget (${weightedLength(result)} > ${TWEET_WEIGHT_BUDGET}): ${result}`,
    );
  }
  return result;
}

interface HashtagReplyInput {
  title: string;
  tags: string[];
}

export function buildHashtagReply(input: HashtagReplyInput): string {
  let reply = buildHashtagComment(input.title, input.tags);
  while (reply.length > 0 && weightedLength(reply) > TWEET_WEIGHT_BUDGET) {
    const lastSpace = reply.lastIndexOf(' ');
    if (lastSpace === -1) {
      reply = '';
      break;
    }
    reply = reply.slice(0, lastSpace);
  }
  if (weightedLength(reply) > TWEET_WEIGHT_BUDGET) {
    throw new Error(
      `buildHashtagReply exceeded budget (${weightedLength(reply)} > ${TWEET_WEIGHT_BUDGET}): ${reply}`,
    );
  }
  return reply;
}
