/**
 * YouTube Data API v3 — single-user OAuth (refresh token stored in env).
 * Requires the channel's quota increase to be approved before this can post
 * more than a handful of videos/day. See README "Before launch" section.
 */

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token as string;
}

export async function postToYouTube(beat: {
  title: string;
  caption: string;
  seoDescription?: string;
  hashtags: string[];
  videoUrl: string;
  checkoutUrl: string;
}) {
  const accessToken = await getAccessToken();
  const videoRes = await fetch(beat.videoUrl);
  const videoBlob = await videoRes.arrayBuffer();

  const description = `${beat.caption}\n\nBuy this beat: ${beat.checkoutUrl}\n\n${beat.hashtags
    .map((t) => `#${t.replace(/^#/, '')}`)
    .join(' ')}`;

  const metadata = {
    snippet: {
      title: beat.title.slice(0, 100),
      description,
      tags: beat.hashtags,
      categoryId: '10', // Music
    },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
  };

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!initRes.ok) throw new Error(`YouTube upload init failed: ${initRes.status}`);

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBlob,
  });
  if (!uploadRes.ok) throw new Error(`YouTube video upload failed: ${uploadRes.status}`);

  const result = await uploadRes.json();
  return `https://youtube.com/shorts/${result.id}`;
}
