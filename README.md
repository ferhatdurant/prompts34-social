# prompts34-social

Small CLI pipeline for Prompts34 Instagram automation.

Flow:

1. Pull public prompts from Prompts34.
2. Select one prompt per day using the weekly category schedule.
3. Ask Gemini to create an Instagram-ready image that only contains:
   - `Günün Promptu`
   - the selected prompt title
4. Upload the generated image to a public Supabase Storage bucket.
5. Write a JSON payload locally for review.
6. Optionally publish it through the Instagram Graph API.

Important safety rules baked into the pipeline:

- It never places the full prompt content (`İçerik`) in the Instagram caption.
- The caption uses the prompt explanation plus:
  `Bu prompta ücretsiz olarak ulaşmak için prompts34.com`
- The publish step is explicit. Use `generate` for a reviewable draft and `publish` only when the output looks correct.

## Required environment variables

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (must be public for Instagram to fetch the image)
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_IG_USER_ID`
- `INSTAGRAM_API_MODE` default: `instagram_login`

Optional:

- `PROMPTS34_API_URL` default: `https://api.prompts34.com`
- `PROMPTS34_WEBSITE_URL` default: `https://prompts34.com`
- `GEMINI_IMAGE_MODEL` default: `gemini-3.1-flash-image-preview`
- `INSTAGRAM_GRAPH_API_VERSION` default: `v24.0`
- `SCHEDULE_DEDUPE_WINDOW` default: `14`

## Usage

Generate assets and JSON only:

```bash
npm run generate
```

Generate, upload, and publish:

```bash
npm run publish
```

The script writes files to `output/<date>/`:

- `instagram-post.json`
- `gunun-promptu.png`

## Weekly schedule

All posts run at `12:30` Turkey time and publish one prompt each day:

- Monday: Career / CV
- Tuesday: Productivity
- Wednesday: Social media / content
- Thursday: Business / e-mail
- Friday: Fun / creative
- Saturday: Business / e-mail
- Sunday: Fun / creative

The checked-in cron example is:

- [prompts34-social.cron](/Users/gulaltinkalp/Prompts34/prompts34-social/prompts34-social.cron)

Install it manually when you are ready:

```bash
crontab /Users/gulaltinkalp/Prompts34/prompts34-social/prompts34-social.cron
```

The scheduler avoids recently published prompt ids by reading the latest published
`output/*/instagram-post.json` files and skipping the last `SCHEDULE_DEDUPE_WINDOW`
successful posts when possible.

## Instagram setup notes

This assumes:

- a professional Instagram account
- a valid Graph API access token with publishing permissions
- the correct Instagram user id
- a public image URL reachable by Instagram

The publish flow uses the standard create-container then publish steps:

1. `POST /{ig-user-id}/media`
2. `POST /{ig-user-id}/media_publish`

## Instagram auth modes

Two Meta integration modes exist:

- `instagram_login`:
  - preferred default
  - host: `graph.instagram.com`
  - token type: Instagram user or system user access token
  - permissions: `instagram_business_basic`, `instagram_business_content_publish`
- `facebook_login`:
  - legacy/page-linked path
  - host: `graph.facebook.com`
  - token type: Facebook Page access token

This project defaults to `instagram_login`.
