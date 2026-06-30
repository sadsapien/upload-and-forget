import { prisma } from './prisma';
import { generateRawVisualizer } from './runway';
import { muxBeatOntoVideo } from './video';
import { generateCopy } from './claude';
import { createCheckoutForBeat } from './stripe';
import { postToYouTube } from './social/youtube';
import { postToInstagram } from './social/instagram';
import { postToTikTok } from './social/tiktok';
import type { PipelineStage } from '@prisma/client';

/**
 * Runs all five stages for a beat in order. No audio analysis stage exists —
 * bpm/key/mood were captured as manual input on upload and are already on
 * the Beat row by the time this runs.
 *
 * 1. VIDEO_GENERATION  — Runway visualizer, mood comes straight from the form (silent)
 * 2. AUDIO_MUX         — merges the beat's real audio onto the silent visualizer
 * 3. COPYWRITING       — Claude caption/hashtags/SEO description
 * 4. CHECKOUT_CREATION — Stripe product + price + checkout session
 * 5. SOCIAL_POSTING    — YouTube, then Instagram, then TikTok
 */
export async function runPipeline(beatId: string) {
  const beat = await prisma.beat.findUniqueOrThrow({ where: { id: beatId } });
  await prisma.beat.update({ where: { id: beatId }, data: { status: 'PROCESSING' } });

  try {
    const rawVideoUrl = await runStage(beatId, 'VIDEO_GENERATION', () =>
      generateRawVisualizer({ title: beat.title, mood: beat.mood, audioUrl: beat.audioUrl })
    );
    await prisma.beat.update({ where: { id: beatId }, data: { rawVideoUrl } });

    const videoUrl = await runStage(beatId, 'AUDIO_MUX', () =>
      muxBeatOntoVideo({
        beatId: beat.id,
        rawVideoUrl,
        audioUrl: beat.audioUrl,
        clipStartSeconds: beat.clipStartSeconds,
        clipDurationSeconds: beat.clipDurationSeconds,
      })
    );
    await prisma.beat.update({ where: { id: beatId }, data: { videoUrl } });

    const copy = await runStage(beatId, 'COPYWRITING', () =>
      generateCopy({ title: beat.title, bpm: beat.bpm, key: beat.key, mood: beat.mood, tags: beat.tags })
    );
    await prisma.beat.update({
      where: { id: beatId },
      data: { caption: copy.caption, hashtags: copy.hashtags },
    });

    const checkout = await runStage(beatId, 'CHECKOUT_CREATION', () =>
      createCheckoutForBeat({ id: beat.id, title: beat.title, priceCents: beat.priceCents, slug: beat.slug })
    );
    await prisma.beat.update({
      where: { id: beatId },
      data: {
        stripeProductId: checkout.productId,
        stripePriceId: checkout.priceId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });

    await runStage(beatId, 'SOCIAL_POSTING', async () => {
      const fresh = await prisma.beat.findUniqueOrThrow({ where: { id: beatId } });
      await postOnePlatform(fresh, 'YOUTUBE', () =>
        postToYouTube({
          title: fresh.title,
          caption: fresh.caption!,
          hashtags: fresh.hashtags,
          videoUrl: fresh.videoUrl!,
          checkoutUrl: fresh.checkoutUrl!,
        })
      );
      await postOnePlatform(fresh, 'INSTAGRAM', () =>
        postToInstagram({
          caption: fresh.caption!,
          hashtags: fresh.hashtags,
          videoUrl: fresh.videoUrl!,
          checkoutUrl: fresh.checkoutUrl!,
        })
      );
      await postOnePlatform(fresh, 'TIKTOK', () =>
        postToTikTok({
          caption: fresh.caption!,
          hashtags: fresh.hashtags,
          videoUrl: fresh.videoUrl!,
          checkoutUrl: fresh.checkoutUrl!,
        })
      );
      return null;
    });

    await prisma.beat.update({ where: { id: beatId }, data: { status: 'READY' } });
  } catch (err) {
    await prisma.beat.update({ where: { id: beatId }, data: { status: 'FAILED' } });
    throw err;
  }
}

async function runStage<T>(beatId: string, stage: PipelineStage, fn: () => Promise<T>): Promise<T> {
  const job = await prisma.pipelineJob.create({
    data: { beatId, stage, status: 'RUNNING', startedAt: new Date() },
  });
  try {
    const result = await fn();
    await prisma.pipelineJob.update({
      where: { id: job.id },
      data: { status: 'DONE', finishedAt: new Date() },
    });
    return result;
  } catch (err: any) {
    await prisma.pipelineJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', finishedAt: new Date(), error: String(err?.message ?? err) },
    });
    throw err;
  }
}

async function postOnePlatform(
  beat: { id: string },
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK',
  fn: () => Promise<string>
) {
  const post = await prisma.post.create({ data: { beatId: beat.id, platform, status: 'PENDING' } });
  try {
    const url = await fn();
    await prisma.post.update({ where: { id: post.id }, data: { status: 'POSTED', url, postedAt: new Date() } });
  } catch (err: any) {
    // A single platform failing shouldn't kill the others — log and move on.
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'FAILED', error: String(err?.message ?? err) },
    });
  }
}
