import {
  requireGenerationConfig,
  requirePublishConfig,
  requireTwitterConfig,
  requireTwitterPublishConfig,
} from './config.js';
import { validateInstagramTarget } from './instagram.js';
import { runPipeline } from './pipeline.js';
import {
  runScheduledPublish,
  runScheduledTwitterPublish,
} from './scheduled-publish.js';
import { runTwitterAuthorize } from './twitter-authorize.js';
import { getAuthenticatedUser } from './twitter.js';
import { runTwitterPipeline } from './twitter-pipeline.js';

async function main() {
  const command = process.argv[2] ?? 'generate';

  if (command === 'instagram:validate') {
    requirePublishConfig();
    const result = await validateInstagramTarget();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'twitter:authorize') {
    requireTwitterConfig();
    const result = await runTwitterAuthorize();
    console.log(
      JSON.stringify(
        { authorized: true, scope: result.scope.split(' ') },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'twitter:validate') {
    requireTwitterConfig();
    const result = await getAuthenticatedUser();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'publish:scheduled') {
    requirePublishConfig();
    const result = await runScheduledPublish();
    console.log(
      JSON.stringify(
        result.skipped
          ? { skipped: true, reason: result.reason, dateKey: result.dateKey }
          : {
              skipped: false,
              dateKey: result.dateKey,
              promptId: result.draft?.prompt.id ?? null,
              title: result.draft?.prompt.title ?? null,
              mediaId: result.draft?.publish.mediaId ?? null,
            },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'generate:twitter') {
    requireGenerationConfig();
    const draft = await runTwitterPipeline(false);
    console.log(
      JSON.stringify(
        {
          promptId: draft.prompt.id,
          title: draft.prompt.title,
          text: draft.twitter.text,
          published: draft.publish.published,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'publish:twitter') {
    requireTwitterPublishConfig();
    const draft = await runTwitterPipeline(true);
    console.log(
      JSON.stringify(
        {
          promptId: draft.prompt.id,
          title: draft.prompt.title,
          tweetId: draft.publish.tweetId ?? null,
          replyTweetId: draft.twitter.reply.replyTweetId ?? null,
          published: draft.publish.published,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'publish:scheduled:twitter') {
    requireTwitterPublishConfig();
    const result = await runScheduledTwitterPublish();
    console.log(
      JSON.stringify(
        result.skipped
          ? { skipped: true, reason: result.reason, dateKey: result.dateKey }
          : {
              skipped: false,
              dateKey: result.dateKey,
              promptId: result.draft?.prompt.id ?? null,
              title: result.draft?.prompt.title ?? null,
              tweetId: result.draft?.publish.tweetId ?? null,
              replyTweetId: result.draft?.twitter.reply.replyTweetId ?? null,
            },
        null,
        2,
      ),
    );
    return;
  }

  const publish = command === 'publish';
  if (publish) {
    requirePublishConfig();
  } else {
    requireGenerationConfig();
  }

  const result = await runPipeline(publish);
  console.log(
    JSON.stringify(
      {
        promptId: result.prompt.id,
        title: result.prompt.title,
        imageUrl: result.image.publicUrl,
        published: result.publish.published,
        mediaId: result.publish.mediaId ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
