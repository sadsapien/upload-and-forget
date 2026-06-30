import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { publicUrlFor } from '@/lib/r2';

const createBeatSchema = z.object({
  title: z.string().min(1).max(100),
  bpm: z.number().int().min(40).max(300),
  key: z.string().min(1).max(10),
  mood: z.string().min(1),
  tags: z.array(z.string()).default([]),
  priceCents: z.number().int().min(0),
  audioKey: z.string().min(1), // R2 object key from the presigned upload step
});

export async function GET() {
  const beats = await prisma.beat.findMany({
    orderBy: { createdAt: 'desc' },
    include: { posts: true, sales: true },
  });
  return NextResponse.json(beats);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createBeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const beat = await prisma.beat.create({
    data: {
      title: data.title,
      slug: slugify(data.title),
      bpm: data.bpm,
      key: data.key,
      mood: data.mood,
      tags: data.tags,
      priceCents: data.priceCents,
      audioKey: data.audioKey,
      audioUrl: publicUrlFor(data.audioKey),
    },
  });

  return NextResponse.json(beat, { status: 201 });
}
