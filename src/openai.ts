import OpenAI from 'openai';
import { settings } from './config.js';
import type { GeneratedImage } from './gemini.js';

export async function generateInstagramImageOpenAI(
  prompt: string,
): Promise<GeneratedImage> {
  if (!settings.openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const client = new OpenAI({ apiKey: settings.openaiApiKey });
  const response = await client.images.generate({
    model: settings.openaiImageModel,
    prompt,
    size: '1024x1024',
    n: 1,
  });

  const item = response.data?.[0];
  if (!item?.b64_json) {
    throw new Error(`OpenAI did not return an image payload: ${JSON.stringify(response)}`);
  }

  return {
    bytes: Buffer.from(item.b64_json, 'base64'),
    mimeType: 'image/png',
    prompt,
  };
}
