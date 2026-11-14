import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SAMPLES: Array<{ filename: string; imageRelPath: string }> = [
  {
    filename: 'sample-ishq-haveli.mp4',
    imageRelPath: 'src/assets/images/hero_lahore_mansion_1794630972170.jpg',
  },
  {
    filename: 'sample-shab-e-wafa.mp4',
    imageRelPath: 'src/assets/images/hero_karachi_rain_1794630973087.jpg',
  },
  {
    filename: 'sample-zindagi-safar.mp4',
    imageRelPath: 'src/assets/images/poster_zindagi_safar_1794630974764.jpg',
  },
];

export async function ensureSampleVideos(): Promise<void> {
  const sampleDir = path.resolve(process.cwd(), 'uploads', 'samples');
  fs.mkdirSync(sampleDir, { recursive: true });

  // Fallback to local hero preview videos if available
  const hero1Path = path.resolve(process.cwd(), 'public', 'hero1.mp4');
  const hero2Path = path.resolve(process.cwd(), 'public', 'hero2.mp4');
  const ishqOut = path.join(sampleDir, 'sample-ishq-haveli.mp4');
  if ((!fs.existsSync(ishqOut) || fs.statSync(ishqOut).size === 0) && fs.existsSync(hero1Path)) {
    fs.copyFileSync(hero1Path, ishqOut);
  }
  const shabOut = path.join(sampleDir, 'sample-shab-e-wafa.mp4');
  if ((!fs.existsSync(shabOut) || fs.statSync(shabOut).size === 0) && fs.existsSync(hero2Path)) {
    fs.copyFileSync(hero2Path, shabOut);
  }
  const zindagiOut = path.join(sampleDir, 'sample-zindagi-safar.mp4');
  if ((!fs.existsSync(zindagiOut) || fs.statSync(zindagiOut).size === 0) && fs.existsSync(hero1Path)) {
    fs.copyFileSync(hero1Path, zindagiOut);
  }

  for (const item of SAMPLES) {
    const outPath = path.join(sampleDir, item.filename);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 4096) {
      continue;
    }
    const imgPath = path.resolve(process.cwd(), item.imageRelPath);
    if (!fs.existsSync(imgPath)) {
      continue;
    }

    try {
      // Render an 8-second 720p H.264 MP4 preview with gentle zoom motion and silent AAC track
      await execFileAsync('ffmpeg', [
        '-y',
        '-loop', '1',
        '-i', imgPath,
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', '8',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fade=t=in:st=0:d=0.6,fade=t=out:st=7.2:d=0.8',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-shortest',
        '-movflags', '+faststart',
        outPath,
      ]);
    } catch (err) {
      console.warn(`Could not generate sample video ${item.filename}:`, (err as Error).message);
    }
  }
}
