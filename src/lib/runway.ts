/**
 * Runway Gen-3 video generation.
 *
 * NOTE: Runway's API surface changes; verify the exact endpoint paths and
 * request shape against https://docs.dev.runwayml.com before going live —
 * this follows their documented async task pattern (create task -> poll
 * status -> retrieve output url) but field names may have shifted.
 */

const RUNWAY_BASE = process.env.RUNWAY_API_BASE || 'https://api.dev.runwayml.com/v1';

function headers() {
  return {
    Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Mood comes straight from the manual upload form — no inferred mood,
// no audio analysis. Map producer-facing mood tags to visual prompt direction.
const MOOD_PROMPTS: Record<string, string> = {
  dark: 'moody dark cinematic loop, deep shadows, slow drifting smoke, red-black palette',
  eerie: 'unsettling atmospheric loop, flickering light, fog, desaturated cold tones',
  melodic: 'dreamy slow-motion loop, soft bokeh lights, warm haze, gentle camera drift',
  aggressive: 'high-contrast strobing loop, sharp geometric shapes, fast glitch cuts, red accent',
  nostalgic: 'grainy VHS-style loop, warm amber tones, soft film grain, slow pan',
};

function promptForMood(mood: string, title: string) {
  const direction = MOOD_PROMPTS[mood.toLowerCase()] ?? MOOD_PROMPTS['dark'];
  return `Looping abstract background visualizer for a trap/phonk beat titled "${title}". ${direction}. No text, no logos, seamless loop, vertical 9:16 framing.`;
}

export async function generateRawVisualizer(beat: { title: string; mood: string; audioUrl: string }) {
  const createRes = await fetch(`${RUNWAY_BASE}/image_to_video`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      promptText: promptForMood(beat.mood, beat.title),
      ratio: '768:1280',
      duration: 10,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Runway task creation failed: ${createRes.status} ${await createRes.text()}`);
  }

  const { id: taskId } = await createRes.json();
  return pollUntilDone(taskId);
}

async function pollUntilDone(taskId: string, maxAttempts = 30, intervalMs = 10_000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, { headers: headers() });
    if (!res.ok) throw new Error(`Runway status check failed: ${res.status}`);

    const task = await res.json();

    if (task.status === 'SUCCEEDED') {
      const outputUrl = task.output?.[0];
      if (!outputUrl) throw new Error('Runway task succeeded but returned no output url');
      return outputUrl as string;
    }

    if (task.status === 'FAILED') {
      throw new Error(`Runway task failed: ${task.failure ?? 'unknown error'}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Runway task did not complete within the polling window');
}
