/**
 * TikTok Content Posting API. TikTok's developer approval is the slowest
 * and most restrictive of the three platforms — this should be the last
 * integration you flip on, after YouTube and Instagram are stable.
 */

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2';

export async function postToTikTok(beat: {
  caption: string;
  hashtags: string[];
  videoUrl: string;
  checkoutUrl: string;
}) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const caption = `${beat.caption} Link in bio 🔗 ${beat.hashtags
    .map((t) => `#${t.replace(/^#/, '')}`)
    .join(' ')}`;

  const initRes = await fetch(`${TIKTOK_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: beat.videoUrl,
      },
    }),
  });

  if (!initRes.ok) throw new Error(`TikTok publish init failed: ${initRes.status} ${await initRes.text()}`);

  const { data } = await initRes.json();
  return data.publish_id as string;
}
