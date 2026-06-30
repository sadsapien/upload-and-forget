'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RetryButton({ beatId }: { beatId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    await fetch(`/api/beats/${beatId}/trigger`, { method: 'POST' });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={retry} disabled={loading} className="btn-primary">
      {loading ? 'Retrying…' : 'Retry pipeline'}
    </button>
  );
}
