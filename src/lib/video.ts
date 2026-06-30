import { writeFile, readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, publicUrlFor } from './r2';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Merges the beat's actual audio onto Runway's silent visualizer loop.
 *
 * Runway's output is a short clip (a few seconds); the beat is the real
 * length of the track. We loop the video to fill clipDurationSeconds, trim
 * the audio to start at clipStartSeconds, and mux them together. The
 * silent Runway clip is never posted anywhere on its own — only this
 * merged output is.
 *
 * Runs ffmpeg as a child process via a statically-bundled binary
 * (ffmpeg-static), so it needs a host that allows spawning processes —
 * fine on Railway, NOT reliable on Vercel's serverless functions. This is
 * the same constraint that already pushed the pipeline trigger toward a
 * long-running host; see README.
 */
export async function muxBeatOntoVideo(params: {
  beatId: string;
  rawVideoUrl: string;
  audioUrl: string;
  clipStartSeconds: number;
  clipDurationSeconds: number;
}) {
  const { beatId, rawVideoUrl, audioUrl, clipStartSeconds, clipDurationSeconds } = params;

  const workDir = await mkdtemp(join(tmpdir(), `uaf-${beatId}-`));
  const videoPath = join(workDir, 'raw-video.mp4');
  const audioPath = join(workDir, 'audio.mp3');
  const outputPath = join(workDir, 'final.mp4');

  try {
    const [videoBuf, audioBuf] = await Promise.all([downloadToBuffer(rawVideoUrl), downloadToBuffer(audioUrl)]);
    await writeFile(videoPath, videoBuf);
    await writeFile(audioPath, audioBuf);

    await runFfmpeg({ videoPath, audioPath, outputPath, clipStartSeconds, clipDurationSeconds });

    const finalBuf = await readFile(outputPath);
    const key = `video/${beatId}-final.mp4`;
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: finalBuf,
        ContentType: 'video/mp4',
      })
    );

    return publicUrlFor(key);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function runFfmpeg(params: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  clipStartSeconds: number;
  clipDurationSeconds: number;
}): Promise<void> {
  const { videoPath, audioPath, outputPath, clipStartSeconds, clipDurationSeconds } = params;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .inputOptions(['-stream_loop', '-1']) // loop the short silent clip to fill the duration
      .input(audioPath)
      .inputOptions(['-ss', String(clipStartSeconds)]) // start the audio at the chosen point in the track
      .outputOptions([
        '-t', String(clipDurationSeconds), // cap total output length
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',
      ])
      .on('error', (err) => reject(new Error(`ffmpeg mux failed: ${err.message}`)))
      .on('end', () => resolve())
      .save(outputPath);
  });
}
