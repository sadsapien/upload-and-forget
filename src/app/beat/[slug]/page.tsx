import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PublicBeatPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { purchased?: string };
}) {
  const beat = await prisma.beat.findUnique({ where: { slug: params.slug } });
  if (!beat || !beat.checkoutUrl) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center">
        {searchParams.purchased && (
          <div className="text-ok text-sm mb-4">Purchase complete. Check your email for the download.</div>
        )}

        {beat.videoUrl && (
          <video
            src={beat.videoUrl}
            className="rounded-md w-full mb-6 aspect-[9/16] object-cover bg-surface2"
            controls
            loop
            playsInline
          />
        )}

        <h1 className="text-xl font-semibold">{beat.title}</h1>
        <div className="text-muted text-sm font-mono mt-2">
          {beat.bpm} BPM · {beat.key} · {beat.mood}
        </div>

        <div className="text-2xl font-semibold mt-6 mb-6">{formatPrice(beat.priceCents)}</div>

        <a href={beat.checkoutUrl} className="btn-primary block w-full">
          Buy this beat
        </a>
      </div>
    </div>
  );
}
