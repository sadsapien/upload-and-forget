import StatusBadge from './StatusBadge';

const STAGE_LABELS: Record<string, string> = {
  VIDEO_GENERATION: 'Visualizer video',
  AUDIO_MUX: 'Audio + video merge',
  COPYWRITING: 'Caption & hashtags',
  CHECKOUT_CREATION: 'Checkout page',
  SOCIAL_POSTING: 'Social posting',
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube Shorts',
  INSTAGRAM: 'Instagram Reels',
  TIKTOK: 'TikTok',
};

type Props = {
  jobs: { stage: string; status: string; error: string | null }[];
  posts: { platform: string; status: string; url: string | null; error: string | null }[];
};

export default function PipelineStatus({ jobs, posts }: Props) {
  return (
    <div className="card p-5">
      <div className="text-text font-medium mb-4">Pipeline</div>
      <div className="space-y-3">
        {Object.keys(STAGE_LABELS).map((stage) => {
          const job = jobs.find((j) => j.stage === stage);
          return (
            <div key={stage} className="flex items-center justify-between text-sm">
              <span className="text-muted">{STAGE_LABELS[stage]}</span>
              <div className="flex items-center gap-2">
                {job?.error && <span className="text-accent text-xs">{job.error}</span>}
                <StatusBadge status={job?.status ?? 'PENDING'} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-text font-medium mt-6 mb-4">Posts</div>
      <div className="space-y-3">
        {(['YOUTUBE', 'INSTAGRAM', 'TIKTOK'] as const).map((platform) => {
          const post = posts.find((p) => p.platform === platform);
          return (
            <div key={platform} className="flex items-center justify-between text-sm">
              <span className="text-muted">{PLATFORM_LABELS[platform]}</span>
              <div className="flex items-center gap-2">
                {post?.url ? (
                  <a href={post.url} target="_blank" className="text-accent text-xs hover:underline">
                    view
                  </a>
                ) : post?.error ? (
                  <span className="text-accent text-xs">{post.error}</span>
                ) : null}
                <StatusBadge status={post?.status ?? 'PENDING'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
