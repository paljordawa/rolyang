#!/usr/bin/env node
/**
 * add-album.mjs
 * 
 * One-command workflow to add a new album + tracks to Rolyang.
 * 
 * Usage:
 *   node scripts/add-album.mjs \
 *     --id        "album-4" \
 *     --title     "My Album Title" \
 *     --artist    "Artist Name" \
 *     --cover     "./path/to/cover.jpg" \
 *     --audio-dir "./path/to/audio/folder"
 * 
 * What it does:
 *   1. Converts cover image → WebP (400x400, q82)
 *   2. Converts all audio files → AAC .m4a (128kbps, +faststart)
 *   3. Uploads cover to Supabase Storage "thumbnails" bucket
 *   4. Uploads all tracks to Supabase Storage "audio" bucket
 *   5. Inserts album row into "albums" table
 *   6. Inserts all track rows into "tracks" table
 * 
 * Requirements:
 *   - ffmpeg installed (winget install Gyan.FFmpeg)
 *   - env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFile, readdir, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

// ─── ENV ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌ Missing env vars. Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── ARG PARSING ─────────────────────────────────────────────────────────────

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}

const ALBUM_ID   = getArg('--id');
const TITLE      = getArg('--title');
const ARTIST     = getArg('--artist');
const COVER_PATH = getArg('--cover');
const AUDIO_DIR  = getArg('--audio-dir');

if (!ALBUM_ID || !TITLE || !ARTIST || !COVER_PATH || !AUDIO_DIR) {
  console.log(`
Usage:
  node scripts/add-album.mjs \\
    --id        "album-4" \\
    --title     "My Album Title" \\
    --artist    "Artist Name" \\
    --cover     "./path/to/cover.jpg" \\
    --audio-dir "./path/to/audio/folder"

All flags are required.
  `);
  process.exit(1);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const WORK_DIR = './.tmp-album-upload';

function safeName(filename) {
  // Remove non-ASCII characters and replace spaces with hyphens for storage safety
  return basename(filename, extname(filename))
    .replace(/[^\x20-\x7E]/g, '')   // strip non-ASCII (e.g. Tibetan chars)
    .replace(/\s+/g, ' ')
    .trim();
}

async function uploadToStorage(bucket, storageName, filePath, mimeType) {
  const buffer = await readFile(filePath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storageName, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload failed for "${storageName}": ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(storageName)}`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🎵 Adding album: "${TITLE}" by ${ARTIST} (${ALBUM_ID})\n`);

  // Validate inputs
  if (!existsSync(COVER_PATH)) { console.error(`❌ Cover not found: ${COVER_PATH}`); process.exit(1); }
  if (!existsSync(AUDIO_DIR))  { console.error(`❌ Audio dir not found: ${AUDIO_DIR}`); process.exit(1); }

  // Check album ID doesn't already exist
  const { data: existing } = await supabase.from('albums').select('id').eq('id', ALBUM_ID).single();
  if (existing) { console.error(`❌ Album ID "${ALBUM_ID}" already exists in the database.`); process.exit(1); }

  // Create temp work dir
  await mkdir(WORK_DIR, { recursive: true });

  // ── Step 1: Convert cover → WebP ──────────────────────────────────────────
  console.log('Step 1: Converting cover image to WebP...');
  const coverWebpName = `${ALBUM_ID}-cover.webp`;
  const coverWebpPath = join(WORK_DIR, coverWebpName);

  await sharp(COVER_PATH)
    .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(coverWebpPath);

  const coverBefore = (await stat(COVER_PATH)).size;
  const coverAfter  = (await stat(coverWebpPath)).size;
  console.log(`  ✅ Cover: ${Math.round(coverBefore/1024)}KB → ${Math.round(coverAfter/1024)}KB WebP\n`);

  // ── Step 2: Find and convert audio files → AAC ────────────────────────────
  console.log('Step 2: Converting audio files to AAC...');
  const audioFiles = (await readdir(AUDIO_DIR))
    .filter(f => /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f))
    .sort(); // alphabetical = track order

  if (audioFiles.length === 0) {
    console.error(`❌ No audio files found in: ${AUDIO_DIR}`);
    process.exit(1);
  }

  const convertedTracks = [];

  for (let i = 0; i < audioFiles.length; i++) {
    const file     = audioFiles[i];
    const inPath   = join(AUDIO_DIR, file);
    const cleanName = safeName(file);
    const m4aName  = `${ALBUM_ID}-track-${String(i + 1).padStart(2, '0')}-${cleanName}.m4a`;
    const outPath  = join(WORK_DIR, m4aName);

    const isAlreadyAAC = /\.(m4a|aac)$/i.test(file);

    if (isAlreadyAAC) {
      // Just copy — already AAC, but re-encode with +faststart
    }

    try {
      execSync(
        `ffmpeg -i "${inPath}" -vn -c:a aac -b:a 128k -movflags +faststart -y "${outPath}" -loglevel error`,
        { stdio: 'pipe' }
      );

      const before = (await stat(inPath)).size;
      const after  = (await stat(outPath)).size;
      const saved  = Math.round((1 - after / before) * 100);
      console.log(`  ✅ [${i + 1}/${audioFiles.length}] ${file.padEnd(45)} → ${Math.round(after/1024)}KB (-${saved}%)`);

      convertedTracks.push({ index: i, filename: file, m4aName, outPath });
    } catch (err) {
      console.error(`  ❌ Failed: ${file}\n     ${err.message}`);
    }
  }
  const artistSlug = ARTIST.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  
  // Verify or create artist to satisfy foreign key constraint
  const { data: artistExists } = await supabase.from('artists').select('id').eq('id', artistSlug).single();
  if (!artistExists) {
    console.log(`🎤 Artist "${ARTIST}" does not exist in DB. Creating artist profile first...`);
    const { error: artistErr } = await supabase.from('artists').insert({
      id: artistSlug,
      name: ARTIST,
      bio: 'Biography coming soon...',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
      followers: '0'
    });
    if (artistErr) { console.error(`  ❌ Artist creation failed: ${artistErr.message}`); process.exit(1); }
    console.log(`  ✅ Artist profile created for "${ARTIST}"\n`);
  }

  // ── Step 3: Upload cover ───────────────────────────────────────────────────
  console.log('Step 3: Uploading cover to Supabase Storage...');
  const folderPath = `artists/${artistSlug}/${ALBUM_ID}`;
  const coverUrl = await uploadToStorage('media', `${folderPath}/${coverWebpName}`, coverWebpPath, 'image/webp');
  console.log(`  ✅ Cover URL: ${coverUrl}\n`);

  // ── Step 4: Upload audio tracks ───────────────────────────────────────────
  console.log('Step 4: Uploading audio tracks to Supabase Storage...');
  for (const track of convertedTracks) {
    track.audioUrl = await uploadToStorage('media', `${folderPath}/${track.m4aName}`, track.outPath, 'audio/mp4');
    console.log(`  ✅ [${track.index + 1}] ${track.m4aName}`);
  }
  console.log('');

  // ── Step 5: Get track titles from filenames ────────────────────────────────
  // Derive a human-readable title from the filename (strip leading numbers/dashes)
  function toTitle(filename) {
    return basename(filename, extname(filename))
      .replace(/^[\d\s.\-_]+/, '')   // remove leading track numbers
      .replace(/[^\x20-\x7E]/g, '') // strip non-ASCII
      .trim();
  }

  // ── Step 6: Insert album into DB ──────────────────────────────────────────
  console.log('Step 5: Inserting album into database...');
  const { error: albumErr } = await supabase.from('albums').insert({
    id:         ALBUM_ID,
    title:      TITLE,
    artist_id:  artistSlug,
    cover_url:  coverUrl,
    year:       null
  });
  if (albumErr) { console.error(`  ❌ Album insert failed: ${albumErr.message}`); process.exit(1); }
  console.log(`  ✅ Album "${TITLE}" inserted\n`);

  // ── Step 7: Insert tracks into DB ─────────────────────────────────────────
  console.log('Step 6: Inserting tracks into database...');
  for (const track of convertedTracks) {
    const trackId = `${ALBUM_ID}-t${track.index + 1}`;
    const title   = toTitle(track.filename);

    const { error: trackErr } = await supabase.from('tracks').insert({
      id:         trackId,
      album_id:   ALBUM_ID,
      artist_id:  artistSlug,
      title:      title,
      audio_url:  track.audioUrl,
      duration:   0,
      genre:      'Unknown',
      color:      '#3b82f6',
      lyrics:     null
    });

    if (trackErr) console.error(`  ❌ Track "${title}": ${trackErr.message}`);
    else console.log(`  ✅ [${track.index + 1}] ${trackId} — "${title}"`);
  }

  // ── Cleanup temp dir ──────────────────────────────────────────────────────
  const { rmSync } = await import('fs');
  rmSync(WORK_DIR, { recursive: true, force: true });

  console.log(`
──────────────────────────────────────────────────────
✅ Done! Album "${TITLE}" is live with ${convertedTracks.length} tracks.

   Album page: /album/${ALBUM_ID}
   Cover CDN:  ${coverUrl}
──────────────────────────────────────────────────────
`);
}

run().catch(err => {
  console.error('\n💥 Fatal:', err.message);
  process.exit(1);
});
