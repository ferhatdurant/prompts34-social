import { requireGenerationConfig, requirePublishConfig } from './config.js';
import { validateInstagramTarget } from './instagram.js';
import { runPipeline } from './pipeline.js';

async function main() {
  const command = process.argv[2] ?? 'generate';
  const publish = command === 'publish';

  if (command === 'instagram:validate') {
    requirePublishConfig();
    const result = await validateInstagramTarget();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

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
