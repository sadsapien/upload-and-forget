import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CopyResult = {
  caption: string;
  hashtags: string[];
  seoDescription: string;
};

const SYSTEM_PROMPT = `You write social captions and SEO copy for a dark trap/phonk beat producer's
auto-posted beat clips. Voice: terse, confident, no hype-bro filler, no emoji spam (max 1 emoji
if it actually fits). You are given the beat's title, BPM, key, and mood/vibe tags directly —
these are exact, producer-entered values, never guess or contradict them.

Return ONLY valid JSON, no markdown fences, no preamble, matching this shape exactly:
{
  "caption": string,       // 1-2 sentences, platform-agnostic, mentions mood/vibe naturally
  "hashtags": string[],    // 8-15 tags, mix of broad (#trapbeat) and niche (#phonkbeat, mood-based)
  "seoDescription": string // 2-3 sentences for YouTube description, can mention BPM/key for producers searching by those
}`;

export async function generateCopy(beat: {
  title: string;
  bpm: number;
  key: string;
  mood: string;
  tags: string[];
}): Promise<CopyResult> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          title: beat.title,
          bpm: beat.bpm,
          key: beat.key,
          mood: beat.mood,
          tags: beat.tags,
        }),
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content for copywriting');
  }

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned) as CopyResult;
  } catch (err) {
    throw new Error(`Failed to parse Claude copy response as JSON: ${cleaned.slice(0, 200)}`);
  }
}
