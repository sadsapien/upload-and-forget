import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Upload a beat</h1>
      <p className="text-muted text-sm mb-6">
        Enter the basics yourself — BPM, key, mood. No detection, no guessing. Everything after this is automatic.
      </p>
      <UploadForm />
    </div>
  );
}
