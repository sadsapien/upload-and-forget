import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BeatCard from '@/components/BeatCard';
import StatCard from '@/components/StatCard';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const beats = await prisma.beat.findMany({
    orderBy: { createdAt: 'desc' },
    include: { posts: true, sales: true },
  });

  const totalBeats = beats.length;
  const live = beats.filter((b) => b.status === 'READY').length;
  const processing = beats.filter((b) => b.status === 'PROCESSING').length;
  const failed = beats.filter((b) => b.status === 'FAILED').length;
  const totalSales = beats.reduce((sum, b) => sum + b.sales.length, 0);
  const totalRevenueCents = beats.reduce(
    (sum, b) => sum + b.sales.reduce((s, sale) => s + sale.amountCents, 0),
    0
  );

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Beats</h1>
        <Link href="/upload" className="btn-primary">
          Upload beat
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total beats" value={String(totalBeats)} />
        <StatCard label="Live" value={String(live)} />
        <StatCard label="Sales" value={String(totalSales)} accent={totalSales > 0} />
        <StatCard label="Revenue" value={formatPrice(totalRevenueCents)} accent={totalRevenueCents > 0} />
      </div>

      {(processing > 0 || failed > 0) && (
        <div className="flex gap-2 mb-6 text-xs text-muted">
          {processing > 0 && <span>{processing} processing</span>}
          {processing > 0 && failed > 0 && <span>·</span>}
          {failed > 0 && <span className="text-accent">{failed} failed</span>}
        </div>
      )}

      {beats.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No beats yet. Upload one and the rest happens on its own.
        </div>
      ) : (
        <div className="space-y-3">
          {beats.map((beat) => (
            <BeatCard key={beat.id} beat={beat} />
          ))}
        </div>
      )}
    </div>
  );
}
