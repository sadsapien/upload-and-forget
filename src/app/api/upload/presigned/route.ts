import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPresignedUploadUrl } from '@/lib/r2';

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const key = `audio/${Date.now()}-${parsed.data.filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const uploadUrl = await getPresignedUploadUrl(key, parsed.data.contentType);

  return NextResponse.json({ uploadUrl, key });
}
