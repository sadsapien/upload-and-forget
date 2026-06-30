# Upload and Forget

Upload a beat with the basic info typed in yourself — BPM, key, mood. Everything after that
runs on its own: a visualizer video, captions, a checkout page, and posts to YouTube, Instagram,
and TikTok.

## What changed from the original spec

The first version of this had a Python/librosa microservice that tried to detect BPM, key, and
the "hook" of the track automatically. It got cut entirely. You produce every beat yourself and
already know the BPM and key exactly — there's no reason to make an algorithm guess at something
you can type in 5 seconds, especially since trap/phonk specifically trips up BPM detectors
(half-time vs double-time) and key detectors (heavy 808 slides). Mood is now a tag you pick on
upload instead of something inferred from the audio.

That cut one full stage and one full service.

A separate, more important fix: the first version of the pipeline never actually merged the
beat's audio onto the Runway video — it would have posted silent clips, which makes the whole
thing pointless for a beat preview. There's now a real **AUDIO_MUX** stage that runs ffmpeg
(via `ffmpeg-static` + `fluent-ffmpeg`) to loop the silent Runway clip and lay the actual beat
audio over it, starting at `clipStartSeconds` for `clipDurationSeconds` (both manual fields on
the beat, defaulting to 15s in / 30s long — same "you already know, just tell it" philosophy as
BPM/key). The pipeline is five stages now:

1. **Video generation** — Runway, using your mood tag to pick the visual direction (silent output)
2. **Audio mux** — merges the real beat audio onto that clip with ffmpeg
3. **Copywriting** — Claude writes the caption, hashtags, and SEO description from your title/bpm/key/mood
4. **Checkout creation** — Stripe product + price + checkout session
5. **Social posting** — YouTube Shorts, then Instagram Reels, then TikTok, in that order

Sales are also now tracked properly: the Stripe webhook writes a `Sale` row instead of just
logging to console, so the dashboard shows real sale counts and revenue per beat instead of
nothing.

## Project structure

```
src/
  app/
    page.tsx              # dashboard — list of beats + status
    upload/page.tsx        # the manual-input upload form
    beats/[id]/page.tsx    # beat detail + pipeline/post status
    beat/[slug]/page.tsx   # public sales page (where checkout traffic lands)
    api/
      beats/               # CRUD
      beats/[id]/trigger/  # kicks off the 4-stage pipeline
      upload/presigned/    # browser → R2 direct upload
      webhooks/stripe/     # payment confirmation
  components/               # UploadForm, BeatCard, PipelineStatus, StatusBadge
  lib/
    pipeline.ts            # orchestrates the 4 stages, logs each as a PipelineJob row
    runway.ts, claude.ts, stripe.ts, r2.ts
    social/youtube.ts, instagram.ts, tiktok.ts
prisma/schema.prisma         # Beat / PipelineJob / Post models
```

## Setup

```bash
npm install
cp .env.example .env      # fill in real values
npx prisma db push        # creates the tables on your Postgres instance
npm run dev
```

## What's real vs. what needs your credentials

Every integration here is written against the real API shape — none of it is mocked logic — but
none of it will actually run until you fill in the corresponding env vars:

- **Anthropic** — works as soon as `ANTHROPIC_API_KEY` is set.
- **Stripe** — works as soon as `STRIPE_SECRET_KEY` is set. You'll also need to point a webhook
  endpoint at `/api/webhooks/stripe` in the Stripe dashboard and copy the signing secret in.
- **R2** — needs a bucket created and public access (or a custom domain) configured for `R2_PUBLIC_URL`.
- **Runway** — needs `RUNWAY_API_KEY`. Verify the endpoint paths in `lib/runway.ts` against
  Runway's current docs before going live; their API surface moves.
- **YouTube / Instagram / TikTok** — these need real OAuth setup, which is the part you haven't
  started yet. **Submit the Meta Graph API, TikTok Content Posting API, and YouTube Data API
  quota applications now** — approval takes 2–8 weeks and blocks this stage entirely until done.

## UI

A top bar with Dashboard/Upload works at every screen size (the old version had a sidebar that
was hidden entirely on mobile with no fallback — fixed). The dashboard leads with real numbers:
total beats, how many are live, total sales, total revenue — pulled from actual `Sale` rows, not
guessed. Each beat card has an inline audio player so you can sanity-check a beat without opening
its detail page. The upload form shows real upload progress (byte-level, via XHR) and a step
indicator instead of a static "Uploading…" with no feedback. The beat detail page now shows the
actual audio, the final muxed clip with sound, and the caption/checkout/pipeline status together.

## Before you deploy

If you deploy the Next.js app to Vercel, the pipeline trigger route (`/api/beats/[id]/trigger`)
calls `runPipeline()` directly, which can run for several minutes (video generation + ffmpeg mux
+ three uploads) — that will exceed Vercel's serverless function timeout, and serverless
functions also aren't a reliable place to spawn the ffmpeg child process the audio mux step
needs. Either deploy to a long-running host (Railway works fine for both reasons), or swap the
direct call in `src/app/api/beats/[id]/trigger/route.ts` for a BullMQ job enqueue instead.
Everything in `lib/pipeline.ts` stays the same either way — it doesn't care who calls it.

## Note on this build

Prisma's client generation needs to reach `binaries.prisma.sh` to download its query engine, and
`ffmpeg-static`'s install step needs to reach GitHub release assets to download the actual ffmpeg
binary — neither domain was reachable from the sandbox this was built in, so `npx prisma generate`
and a full `npm install` couldn't fully complete here. Both will work normally on your machine or
on Railway. Run `npm install` then `npx prisma generate` as your first two steps.

`fluent-ffmpeg` is unmaintained (no updates in a few years) but still the standard, working choice
for this — it's a thin wrapper around the ffmpeg binary, not something that rots from disuse the
way an API client would.
