import { settings } from './config.js';
import { writeTwitterDraftJson } from './json-output.js';
import { prepareDailyContent } from './pipeline.js';
import { buildTwitterHashtagReply, buildTwitterText } from './prompt-of-day.js';
import { createTweet, uploadMedia } from './twitter.js';
import type { TwitterDraft } from './types.js';

export async function runTwitterPipeline(publish: boolean): Promise<TwitterDraft> {
  const content = await prepareDailyContent(new Date());

  const text = buildTwitterText(
    content.prompt.title,
    content.prompt.description,
    settings.websiteUrl,
  );
  const hashtags = buildTwitterHashtagReply(content.prompt.title, content.prompt.tags);

  const draft: TwitterDraft = {
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
    twitter: {
      text,
      reply: { hashtags },
    },
    publish: { published: false },
  };

  if (publish) {
    const mediaId = await uploadMedia(content.image.bytes, content.image.mimeType);
    const tweetId = await createTweet(text, { mediaId });
    const replyId = await createTweet(hashtags, { replyToTweetId: tweetId });

    draft.twitter.reply.replyTweetId = replyId;
    draft.publish = {
      mediaId,
      tweetId,
      published: true,
    };
  }

  await writeTwitterDraftJson(content.date, draft);
  return draft;
}
