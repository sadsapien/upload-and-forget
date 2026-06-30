import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

/**
 * Fires the pipeline for a beat. This runs inline for simplicity — fine on
 * a long-running host (Railway) but Vercel's serverless function timeout
 * WILL kill this mid-run since video generation + three social uploads can
 * easily take several minutes. If you deploy the web app to Vercel, swap
 * this for a BullMQ job enqueue instead of calling runPipeline directly;
 * everything else in the pipeline module stays the same.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  runPipeline(params.id).catch((err) => {
    console.error(`Pipeline failed for beat ${params.id}:`, err);
  });

  return NextResponse.json({ started: true });
}
