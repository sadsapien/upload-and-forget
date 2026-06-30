export default function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-semibold font-mono ${accent ? 'text-accent' : 'text-text'}`}>{value}</div>
    </div>
  );
}
