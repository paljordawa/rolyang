import sharp from 'sharp';
import { readdir, stat, rename } from 'fs/promises';
import { join, extname, basename } from 'path';

const THUMBNAIL_DIR = './public/thumbnail';
const MAX_SIZE = 400; // px (displayed at max 232px, 400 gives 2x retina quality)
const QUALITY = 82;   // WebP quality (80-85 is sweet spot)

async function compress() {
  const files = await readdir(THUMBNAIL_DIR);
  const images = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  console.log(`\nFound ${images.length} images to optimize:\n`);

  for (const file of images) {
    const inPath = join(THUMBNAIL_DIR, file);
    const outName = basename(file, extname(file)) + '.webp';
    const outPath = join(THUMBNAIL_DIR, outName);

    const before = (await stat(inPath)).size;

    try {
      await sharp(inPath)
        .resize(MAX_SIZE, MAX_SIZE, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath);

      const after = (await stat(outPath)).size;
      const saved = Math.round((1 - after / before) * 100);
      const beforeKB = Math.round(before / 1024);
      const afterKB = Math.round(after / 1024);

      console.log(`✅ ${file.padEnd(20)} ${beforeKB}KB → ${afterKB}KB  (-${saved}%)`);

      // Remove original if it was a non-webp file and the webp is different
      if (extname(file).toLowerCase() !== '.webp') {
        // Keep the originals for now — we'll update DB references separately
      }
    } catch (err) {
      console.error(`❌ Failed: ${file}`, err.message);
    }
  }

  console.log('\nDone! WebP files created alongside originals.');
  console.log('Next: update your Supabase cover URLs to use the .webp versions.\n');
}

compress();
