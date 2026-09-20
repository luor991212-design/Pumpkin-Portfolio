import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'media');
const qa = path.join(root, 'qa');
await fs.mkdir(qa, { recursive: true });
await fs.mkdir(output, { recursive: true });
function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error));
}
for (let i = 1; i <= 2; i++) {
  const input = path.resolve(root, '..', '作品集首页', `视频 ${i}.mp4`);
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', input], { encoding: 'utf8' });
  const match = probe.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!match) throw new Error(probe.stderr);
  const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  console.log(`Video ${i}: ${duration}s\n${probe.stderr.match(/Video:.*/)?.[0]}`);
  // Frequent keyframes make frame seeking with the scroll wheel responsive.
  const forward = path.join(output, `transition-${i}.mp4`);
  // Bake the transition into a short 1.6-second clip. Playing at 1× avoids
  // the decode spikes caused by accelerating a four-second source in-browser.
  run(['-y', '-i', input, '-an', '-vf', 'scale=1920:-2,setpts=.4*PTS', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', forward]);
  // Reverse clips let upward navigation use the same smooth, decoded playback
  // path as forward navigation instead of jumping between still frames.
  run(['-y', '-i', forward, '-an', '-vf', 'reverse', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, `transition-${i}-reverse.mp4`)]);
  for (const [label, time] of [['start', 0], ['middle', duration / 2], ['end', duration - .08]]) {
    run(['-y', '-ss', String(time), '-i', input, '-frames:v', '1', '-vf', 'scale=1600:-2', path.join(qa, `video-${i}-${label}.png`)]);
  }
}
await sharp(path.join(qa, 'video-1-start.png')).webp({ quality: 88 }).toFile(path.join(output, 'hero-1.webp'));
await sharp(path.join(qa, 'video-1-end.png')).webp({ quality: 88 }).toFile(path.join(output, 'hero-2.webp'));
await sharp(path.join(qa, 'video-2-end.png')).webp({ quality: 88 }).toFile(path.join(output, 'hero-3.webp'));
const tiles = [];
for (let i=1; i<=2; i++) {
  for (const [n, label] of ['start','middle','end'].entries()) {
    const buffer = await sharp(path.join(qa, `video-${i}-${label}.png`)).resize(520,293,{fit:'cover'}).toBuffer();
    tiles.push({ input: buffer, left:n*520, top:(i-1)*293 });
  }
}
await sharp({create:{width:1560,height:586,channels:3,background:'#080c15'}}).composite(tiles).jpeg({quality:85}).toFile(path.join(qa,'video-contact-sheet.jpg'));
console.log('Videos and poster frames prepared.');
