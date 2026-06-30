import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const beat = await prisma.beat.findUnique({
    where: { id: params.id },
    include: { posts: true, pipelineJobs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!beat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(beat);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.beat.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
