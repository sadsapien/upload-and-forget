/**
 * Meta Graph API — Instagram Reels.
 * IG posts cannot contain a clickable link, so the checkout link goes in the
 * caption as "link in bio," and we update the business account's bio link
 * to point at this beat's checkout right after posting.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
const IG_ID = process.env.META_IG_BUSINESS_ACCOUNT_ID;
const TOKEN = process.env.META_ACCESS_TOKEN;

export async function postToInstagram(beat: {
  caption: string;
  hashtags: string[];
  videoUrl: string;
  checkoutUrl: string;
}) {
  const caption = `${beat.caption}\n\nLink in bio to buy 🔗\n\n${beat.hashtags
    .map((t) => `#${t.replace(/^#/, '')}`)
    .join(' ')}`;

  const createRes = await fetch(`${GRAPH_BASE}/${IG_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: beat.videoUrl,
      caption,
      access_token: TOKEN,
    }),
  });
  if (!createRes.ok) throw new Error(`IG media container failed: ${createRes.status} ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();

  // Poll until the container has finished processing the video.
  await waitForContainerReady(containerId);

  const publishRes = await fetch(`${GRAPH_BASE}/${IG_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: TOKEN }),
  });
  if (!publishRes.ok) throw new Error(`IG publish failed: ${publishRes.status} ${await publishRes.text()}`);
  const { id: mediaId } = await publishRes.json();

  await updateBioLink(beat.checkoutUrl);

  return `https://instagram.com/reel/${mediaId}`;
}

async function waitForContainerReady(containerId: string, maxAttempts = 20, intervalMs = 5_000) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${TOKEN}`);
    const { status_code } = await res.json();
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR') throw new Error('IG container processing failed');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('IG container did not finish processing in time');
}

async function updateBioLink(checkoutUrl: string) {
  await fetch(`${GRAPH_BASE}/${IG_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website: checkoutUrl, access_token: TOKEN }),
  });
}
