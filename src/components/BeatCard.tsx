import Link from 'next/link';
import StatusBadge from './StatusBadge';
import { formatPrice } from '@/lib/utils';

type BeatCardProps = {
  beat: {
    id: string;
    title: string;
    bpm: number;
    key: string;
    mood: string;
    priceCents: number;
    status: string;
    audioUrl: string;
    posts: { platform: string; status: string }[];
    sales: { amountCents: number }[];
  };
};

export default function BeatCard({ beat }: BeatCardProps) {
  const posted = beat.posts.filter((p) => p.status === 'POSTED').length;
  const revenueCents = beat.sales.reduce((sum, s) => sum + s.amountCents, 0);

  return (
    <div className="card p-4 hover:border-accent transition-colors">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/beats/${beat.id}`} className="min-w-0 flex-1">
          <div className="text-text font-medium truncate">{beat.title}</div>
          <div className="text-muted text-xs font-mono mt-1">
            {beat.bpm} BPM · {beat.key} · {beat.mood} · {formatPrice(beat.priceCents)}
          </div>
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          {beat.sales.length > 0 && (
            <span className="text-ok text-xs font-mono">
              {beat.sales.length} sold · {formatPrice(revenueCents)}
            </span>
          )}
          <span className="text-muted text-xs hidden sm:inline">{posted}/3 posted</span>
          <StatusBadge status={beat.status} />
        </div>
      </div>
      <audio controls src={beat.audioUrl} className="w-full h-8 mt-3" preload="none" />
    </div>
  );
}
