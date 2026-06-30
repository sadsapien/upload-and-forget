const STYLES: Record<string, string> = {
  DRAFT: 'bg-surface2 text-muted',
  PROCESSING: 'bg-warn/15 text-warn',
  READY: 'bg-ok/15 text-ok',
  FAILED: 'bg-accent/15 text-accent',
  PENDING: 'bg-surface2 text-muted',
  RUNNING: 'bg-warn/15 text-warn',
  DONE: 'bg-ok/15 text-ok',
  POSTED: 'bg-ok/15 text-ok',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${STYLES[status] ?? STYLES.DRAFT}`}>
      {status.toLowerCase()}
    </span>
  );
}
