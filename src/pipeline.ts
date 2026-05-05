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
import type { InstagramDraft } from './types.js';

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'bin';
}

export async function runPipeline(publish: boolean): Promise<InstagramDraft> {
  const now = new Date();
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
  const generatedImage = await generateInstagramImage(geminiPrompt);
  const composedImage = await composeInstagramPoster(
    generatedImage.bytes,
    selectedPrompt.title,
  );
  const extension = mimeTypeToExtension('image/png');
  const localPath = await writeLocalImage(dateKey, composedImage, extension);
  const publicUrl = await uploadPublicImage(
    dateKey,
    composedImage,
    'image/png',
  );

  const draft: InstagramDraft = {
    date: dateKey,
    headline: 'Günün Promptu',
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
      mimeType: 'image/png',
      geminiPrompt,
    },
    instagram: {
      caption: buildInstagramCaption(description, settings.websiteUrl),
      comment: {
        hashtags: buildHashtagComment(selectedPrompt.title, selectedPrompt.tags),
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

  await writeDraftJson(dateKey, draft);
  return draft;
}
