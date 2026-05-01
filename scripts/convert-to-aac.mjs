import { readdir, stat, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const INPUT_DIR  = './public/audio';
const OUTPUT_DIR = './public/audio/aac';
const BITRATE    = '128k'; // 128kbps AAC — transparent quality for music

async function convert() {
  // Create output folder if needed
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const files = await readdir(INPUT_DIR);
  const audioFiles = files.filter(f => /\.(mp3|wav|flac|ogg)$/i.test(f));

  console.log(`\nConverting ${audioFiles.length} files to AAC (${BITRATE})...\n`);

  let totalBefore = 0;
  let totalAfter  = 0;

  for (const file of audioFiles) {
    const inPath  = join(INPUT_DIR, file);
    const outName = basename(file, extname(file)) + '.m4a';
    const outPath = join(OUTPUT_DIR, outName);

    const before = (await stat(inPath)).size;
    totalBefore += before;

    try {
      execSync(
        `ffmpeg -i "${inPath}" -c:a aac -b:a ${BITRATE} -movflags +faststart -y "${outPath}" -loglevel error`,
        { stdio: 'pipe' }
      );

      const after = (await stat(outPath)).size;
      totalAfter += after;
      const saved  = Math.round((1 - after / before) * 100);
      const beforeMB = (before / 1024 / 1024).toFixed(2);
      const afterMB  = (after  / 1024 / 1024).toFixed(2);

      console.log(`✅ ${file.padEnd(50)} ${beforeMB}MB → ${afterMB}MB  (-${saved}%)`);
    } catch (err) {
      console.error(`❌ Failed: ${file}\n   ${err.message}`);
    }
  }

  const totalSaved = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`\n──────────────────────────────────────────`);
  console.log(`Total: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB  (-${totalSaved}% saved)`);
  console.log(`\nAAC files saved to: ${OUTPUT_DIR}`);
  console.log(`Note: -movflags +faststart optimizes for web streaming (metadata at file start)\n`);
}

convert();
