import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import StatusBadge from '@/components/StatusBadge';
import PipelineStatus from '@/components/PipelineStatus';
import { formatPrice } from '@/lib/utils';
import RetryButton from './RetryButton';

export const dynamic = 'force-dynamic';

export default async function BeatDetailPage({ params }: { params: { id: string } }) {
  const beat = await prisma.beat.findUnique({
    where: { id: params.id },
    include: { posts: true, pipelineJobs: { orderBy: { createdAt: 'asc' } }, sales: true },
  });

  if (!beat) notFound();

  const revenueCents = beat.sales.reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{beat.title}</h1>
          <div className="text-muted text-sm font-mono mt-1">
            {beat.bpm} BPM · {beat.key} · {beat.mood} · {formatPrice(beat.priceCents)}
          </div>
        </div>
        <StatusBadge status={beat.status} />
      </div>

      {beat.sales.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <span className="text-muted text-sm">Sales</span>
          <span className="text-ok font-mono text-sm">
            {beat.sales.length} sold · {formatPrice(revenueCents)} total
          </span>
        </div>
      )}

      {beat.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {beat.tags.map((t) => (
            <span key={t} className="text-xs text-muted bg-surface2 border border-border rounded-sm px-2 py-1">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="text-text font-medium mb-3">Audio</div>
        <audio controls src={beat.audioUrl} className="w-full" />
      </div>

      {beat.videoUrl && (
        <div className="card p-5">
          <div className="text-text font-medium mb-3">Final clip (what gets posted)</div>
          <video
            controls
            src={beat.videoUrl}
            className="w-full max-w-xs mx-auto rounded-md aspect-[9/16] object-cover bg-surface2"
          />
          <div className="text-muted text-xs mt-2 text-center">
            {beat.clipStartSeconds}s–{beat.clipStartSeconds + beat.clipDurationSeconds}s of the track
          </div>
        </div>
      )}

      {beat.caption && (
        <div className="card p-5">
          <div className="text-text font-medium mb-2">Caption</div>
          <p className="text-muted text-sm whitespace-pre-wrap">{beat.caption}</p>
          {beat.hashtags.length > 0 && (
            <p className="text-accent text-sm mt-2">{beat.hashtags.map((h) => `#${h}`).join(' ')}</p>
          )}
        </div>
      )}

      {beat.checkoutUrl && (
        <div className="card p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-text font-medium">Checkout link</div>
            <div className="text-muted text-xs mt-1 truncate">{beat.checkoutUrl}</div>
          </div>
          <a href={beat.checkoutUrl} target="_blank" className="btn-secondary text-sm shrink-0">
            Open
          </a>
        </div>
      )}

      <PipelineStatus jobs={beat.pipelineJobs} posts={beat.posts} />

      {beat.status === 'FAILED' && <RetryButton beatId={beat.id} />}
    </div>
  );
}
