import { GoogleGenAI, Modality } from '@google/genai';
import { settings } from './config.js';

export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
  prompt: string;
}

export async function generateInstagramImage(prompt: string): Promise<GeneratedImage> {
  if (!settings.geminiApiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const client = new GoogleGenAI({ apiKey: settings.geminiApiKey });
  const modelsToTry = Array.from(
    new Set([
      settings.geminiImageModel,
      'gemini-3.1-flash-image-preview',
      'gemini-2.5-flash-image',
    ]),
  );
  const errors: string[] = [];

  for (const model of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      for (const candidate of response.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return {
              bytes: Buffer.from(part.inlineData.data, 'base64'),
              mimeType: part.inlineData.mimeType,
              prompt,
            };
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${model}: ${message}`);
    }
  }

  throw new Error(
    `Gemini did not return an image payload. Attempts: ${errors.join(' | ')}`,
  );
}
