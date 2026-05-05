import { settings } from './config.js';
import type { PromptRecord } from './types.js';

export async function fetchPublicPrompts(): Promise<PromptRecord[]> {
  const response = await fetch(`${settings.promptsApiUrl}/prompts/public`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch prompts: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as PromptRecord[];
}

export function buildPromptPermalink(promptId: string): string {
  return `${settings.websiteUrl}/prompts/${promptId}`;
}
