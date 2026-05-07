import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { settings } from './config.js';
import { composeInstagramPoster } from './compositor.js';
import { generateInstagramImage } from './gemini.js';
import { getRecentlyPublishedPromptIds } from './history.js';
import {
  createImageContainer,
  createMediaComment,
  publishContainer,
  waitForContainer,
} from './instagram.js';
import { writeDraftJson } from './json-output.js';
import {
  buildGeminiImagePrompt,
  buildHashtagComment,
  buildInstagramCaption,
} from './prompt-of-day.js';
import { buildPromptPermalink, fetchPublicPrompts } from './prompts34.js';
import { chooseScheduledPrompt } from './schedule.js';
import { uploadPublicImage, writeLocalImage } from './storage.js';
import type { DailyContent, InstagramDraft } from './types.js';

const POSTER_FILENAME = 'gunun-promptu.png';
const POSTER_MIME = 'image/png';

async function readExistingPosterBytes(dateKey: string): Promise<Buffer | null> {
  const filePath = path.join(settings.outputRoot, dateKey, POSTER_FILENAME);
  const exists = await stat(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return null;
  }
  return readFile(filePath);
}

export async function prepareDailyContent(now: Date = new Date()): Promise<DailyContent> {
  const dateKey = now.toISOString().slice(0, 10);
  const prompts = await fetchPublicPrompts();
  const recentPromptIds = await getRecentlyPublishedPromptIds(
    settings.scheduleDedupeWindow,
  );
  const { prompt: selectedPrompt, category } = chooseScheduledPrompt(
    prompts,
    now,
    recentPromptIds,
  );
  const description = selectedPrompt.explanation?.trim();
  if (!description) {
    throw new Error('Selected prompt is missing an explanation');
  }

  const geminiPrompt = buildGeminiImagePrompt(selectedPrompt.title);
  let composedImage = await readExistingPosterBytes(dateKey);
  if (!composedImage) {
    const generatedImage = await generateInstagramImage(geminiPrompt);
    composedImage = await composeInstagramPoster(
      generatedImage.bytes,
      selectedPrompt.title,
    );
  }

  const localPath = await writeLocalImage(dateKey, composedImage, 'png');
  const publicUrl = await uploadPublicImage(dateKey, composedImage, POSTER_MIME);

  return {
    date: dateKey,
    category,
    prompt: {
      id: selectedPrompt.id,
      title: selectedPrompt.title,
      description,
      tags: selectedPrompt.tags,
      permalink: buildPromptPermalink(selectedPrompt.id),
    },
    image: {
      localPath,
      publicUrl,
      bytes: composedImage,
      mimeType: POSTER_MIME,
      geminiPrompt,
    },
  };
}

export async function runPipeline(publish: boolean): Promise<InstagramDraft> {
  const content = await prepareDailyContent(new Date());

  const draft: InstagramDraft = {
    date: content.date,
    headline: 'Günün Promptu',
    category: content.category,
    prompt: content.prompt,
    image: {
      localPath: content.image.localPath,
      publicUrl: content.image.publicUrl,
      mimeType: content.image.mimeType,
      geminiPrompt: content.image.geminiPrompt,
    },
    instagram: {
      caption: buildInstagramCaption(content.prompt.description, settings.websiteUrl),
      comment: {
        hashtags: buildHashtagComment(content.prompt.title, content.prompt.tags),
      },
    },
    publish: {
      published: false,
    },
  };

  if (publish) {
    const containerId = await createImageContainer(
      draft.image.publicUrl,
      draft.instagram.caption,
    );
    await waitForContainer(containerId);
    const mediaId = await publishContainer(containerId);
    const commentId = await createMediaComment(
      mediaId,
      draft.instagram.comment?.hashtags ?? '',
    );
    if (draft.instagram.comment) {
      draft.instagram.comment.commentId = commentId;
    }
    draft.publish = {
      containerId,
      mediaId,
      published: true,
    };
  }

  await writeDraftJson(content.date, draft);
  return draft;
}
