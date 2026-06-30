'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MOODS = ['dark', 'eerie', 'melodic', 'aggressive', 'nostalgic'];

type Step = 'idle' | 'uploading' | 'creating' | 'starting' | 'done';

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  uploading: 'Uploading audio',
  creating: 'Saving beat details',
  starting: 'Starting pipeline',
  done: 'Done',
};

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [mood, setMood] = useState('dark');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('29.99');
  const [step, setStep] = useState<Step>('idle');
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submitting = step !== 'idle' && step !== 'done';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Select an audio file.');
      return;
    }
    setError(null);

    try {
      setStep('uploading');
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, key: audioKey } = await presignRes.json();

      await uploadWithProgress(uploadUrl, file, setUploadPct);

      setStep('creating');
      const beatRes = await fetch('/api/beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bpm: Number(bpm),
          key,
          mood,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          priceCents: Math.round(Number(price) * 100),
          audioKey,
        }),
      });
      if (!beatRes.ok) {
        const body = await beatRes.json();
        throw new Error(body.error ? JSON.stringify(body.error) : 'Failed to create beat');
      }
      const beat = await beatRes.json();

      setStep('starting');
      await fetch(`/api/beats/${beat.id}/trigger`, { method: 'POST' });

      setStep('done');
      router.push(`/beats/${beat.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setStep('idle');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-xl">
      <div>
        <label className="field-label">Audio file</label>
        <input
          type="file"
          accept="audio/*"
          required
          disabled={submitting}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field-input file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-accent file:text-text file:text-sm"
        />
      </div>

      <div>
        <label className="field-label">Title</label>
        <input
          required
          disabled={submitting}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hollow Frame"
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">BPM</label>
          <input
            required
            disabled={submitting}
            type="number"
            inputMode="numeric"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="140"
            className="field-input font-mono"
          />
        </div>
        <div>
          <label className="field-label">Key</label>
          <input
            required
            disabled={submitting}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="F# Minor"
            className="field-input font-mono"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Mood / vibe</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              type="button"
              key={m}
              disabled={submitting}
              onClick={() => setMood(m)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors disabled:opacity-40 ${
                mood === m ? 'bg-accent border-accent text-text' : 'border-border text-muted hover:text-text'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Reference tags (optional, comma separated)</label>
        <input
          disabled={submitting}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="phonk, drift, horror"
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label">Price (CAD)</label>
        <input
          required
          disabled={submitting}
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="field-input font-mono"
        />
      </div>

      {error && <div className="text-accent text-sm">{error}</div>}

      {submitting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{STEP_LABELS[step]}</span>
            {step === 'uploading' && <span className="font-mono">{uploadPct}%</span>}
          </div>
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${stepProgress(step, uploadPct)}%` }}
            />
          </div>
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? STEP_LABELS[step] + '…' : 'Upload and forget'}
      </button>
    </form>
  );
}

function stepProgress(step: Step, uploadPct: number) {
  if (step === 'uploading') return Math.min(uploadPct, 100) * 0.7; // upload is the slow part, weight it
  if (step === 'creating') return 80;
  if (step === 'starting') return 95;
  if (step === 'done') return 100;
  return 0;
}

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Audio upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Audio upload failed'));
    xhr.send(file);
  });
}
