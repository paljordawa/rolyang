import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const AAC_DIR       = './public/audio/aac';
const ORIGINAL_M4A  = './public/audio/hearMeNow.m4a'; // Already AAC, not in aac/ folder
const THUMBNAIL_DIR = './public/thumbnail';

const AUDIO_BUCKET     = 'audio';
const THUMBNAIL_BUCKET = 'thumbnails';

// Map: original MP3 filename stem → AAC filename (same stem, .m4a)
// Also map the hearMeNow.m4a which is already in the root audio folder
const DB_AUDIO_MAP = {
  // db audio path → new m4a filename in aac/ folder (or special handling)
  '/audio/stay.mp3':                                             'stay.m4a',
  '/audio/Cut Your Teeth Kygo Remix.mp3':                       'Cut Your Teeth Kygo Remix.m4a',
  '/audio/raging.mp3':                                          'raging.m4a',
  '/audio/oasis.mp3':                                           'oasis.m4a',
  '/audio/hearMeNow.m4a':                                       'hearMeNow.m4a',  // special — in root audio/
  '/audio/Another Night ( Original Mix).mp3':                   'Another Night ( Original Mix).m4a',
  '/audio/Runaway (Original Mix).mp3':                          'Runaway (Original Mix).m4a',
  '/audio/Broken.mp3':                                          'Broken.m4a',
  '/audio/beleive.mp3':                                         'beleive.m4a',
  '/audio/Stand By Me ft.Micky Blue(Original Mix).mp3':         'Stand By Me ft.Micky Blue(Original Mix).m4a',
  '/audio/Something New.mp3':                                   'Something New.m4a',
  '/audio/don-diablo-What We Started.mp3':                      'don-diablo-What We Started.m4a',
  '/audio/Secret Stash.mp3':                                    'Secret Stash.m4a',
  '/audio/Don Diablo-Children Of A Miracle.mp3':                'Don Diablo-Children Of A Miracle.m4a',
  '/audio/Don DiabloྀSave A Little Love.mp3':                   'Don DiabloྀSave A Little Love.m4a',
  "/audio/Don Diablo - Don't Let Go ft. Holly Winter.mp3":      "Don Diablo - Don't Let Go ft. Holly Winter.m4a",
  '/audio/King Arthur - Pretty Young Money.mp3':                'King Arthur - Pretty Young Money.m4a',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function ensureBucket(name) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === name);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(name, { public: true });
    if (error) throw new Error(`Failed to create bucket "${name}": ${error.message}`);
    console.log(`  📦 Created bucket: ${name}`);
  } else {
    console.log(`  📦 Bucket exists: ${name}`);
  }
}

function publicUrl(bucket, filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;
}

async function uploadFile(bucket, filename, filePath, mimeType) {
  const buffer = await readFile(filePath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Upload failed for ${filename}: ${error.message}`);
  return publicUrl(bucket, filename);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🚀 Starting Supabase Storage migration...\n');

  // 1. Ensure buckets exist
  console.log('Step 1: Setting up storage buckets...');
  await ensureBucket(AUDIO_BUCKET);
  await ensureBucket(THUMBNAIL_BUCKET);

  // 2. Upload AAC audio files
  console.log('\nStep 2: Uploading AAC audio files...');
  const urlMap = {}; // dbPath → new supabase URL

  for (const [dbPath, m4aName] of Object.entries(DB_AUDIO_MAP)) {
    const filePath = m4aName === 'hearMeNow.m4a'
      ? ORIGINAL_M4A
      : join(AAC_DIR, m4aName);

    try {
      const url = await uploadFile(AUDIO_BUCKET, m4aName, filePath, 'audio/mp4');
      urlMap[dbPath] = url;
      console.log(`  ✅ ${m4aName}`);
    } catch (err) {
      console.error(`  ❌ ${m4aName}: ${err.message}`);
    }
  }

  // 3. Upload WebP thumbnails
  console.log('\nStep 3: Uploading WebP thumbnails...');
  const thumbUrlMap = {}; // old db cover path → new URL

  const thumbFiles = (await readdir(THUMBNAIL_DIR)).filter(f => f.endsWith('.webp'));
  for (const file of thumbFiles) {
    const filePath = join(THUMBNAIL_DIR, file);
    try {
      const url = await uploadFile(THUMBNAIL_BUCKET, file, filePath, 'image/webp');
      thumbUrlMap[`/thumbnail/${file}`] = url;
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
    }
  }

  // 4. Update tracks table (audio column)
  console.log('\nStep 4: Updating tracks.audio in database...');
  const { data: tracks } = await supabase.from('tracks').select('id, audio');
  let audioUpdated = 0;

  for (const track of tracks || []) {
    const newUrl = urlMap[track.audio];
    if (!newUrl) { console.log(`  ⚠️  No mapping for: ${track.audio}`); continue; }

    const { error } = await supabase.from('tracks').update({ audio: newUrl }).eq('id', track.id);
    if (error) { console.error(`  ❌ Track ${track.id}: ${error.message}`); }
    else { console.log(`  ✅ Track ${track.id}`); audioUpdated++; }
  }

  // 5. Update albums table (cover column)
  console.log('\nStep 5: Updating albums.cover in database...');
  const { data: albums } = await supabase.from('albums').select('id, cover');
  let coverUpdated = 0;

  for (const album of albums || []) {
    const newUrl = thumbUrlMap[album.cover];
    if (!newUrl) { console.log(`  ⚠️  No mapping for: ${album.cover}`); continue; }

    const { error } = await supabase.from('albums').update({ cover: newUrl }).eq('id', album.id);
    if (error) { console.error(`  ❌ Album ${album.id}: ${error.message}`); }
    else { console.log(`  ✅ Album ${album.id}`); coverUpdated++; }
  }

  // 6. Summary
  console.log('\n──────────────────────────────────────────────────');
  console.log(`✅ Audio files uploaded:  ${Object.keys(urlMap).length}`);
  console.log(`✅ Thumbnails uploaded:   ${Object.keys(thumbUrlMap).length}`);
  console.log(`✅ Tracks DB updated:     ${audioUpdated}/${(tracks||[]).length}`);
  console.log(`✅ Albums DB updated:     ${coverUpdated}/${(albums||[]).length}`);
  console.log('\n🎉 Migration complete! Files are now served from Supabase Storage CDN.');
  console.log('   You can now delete public/audio/ and public/thumbnail/ from your repo.\n');
}

run().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
