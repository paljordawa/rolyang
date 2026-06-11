import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LIBRARY_DIR = path.resolve(__dirname, '../local_library');
const BUCKET_NAME = 'media';

// Helper: Sanitize string to URL-friendly slug
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper: Extract Year and Title from Album folder (e.g., "2016 - Starboy" -> year: 2016, title: "Starboy")
function parseAlbumFolder(folderName) {
  const match = folderName.match(/^(\d{4})[\s-]+(.+)$/);
  if (match) {
    return { year: match[1], title: match[2].trim() };
  }
  return { year: null, title: folderName.trim() };
}

// Helper: Extract Track Title from Filename (e.g., "01 - Blinding Lights.mp3" -> "Blinding Lights")
function parseTrackFile(fileName) {
  const match = fileName.match(/^(?:\d+[\s.-]+)?(.+?)\.\w+$/);
  if (match) {
    return match[1].trim();
  }
  return fileName.replace(/\.\w+$/, '').trim();
}

// Helper: Upload file to Supabase Storage
async function uploadFile(filePath, storagePath, mimeType) {
  const fileBuffer = await fs.readFile(filePath);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

  if (error) {
    throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(storagePath).replace(/%2F/g, '/')}`;
}

// Ensure Bucket Exists
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`📦 Creating "${BUCKET_NAME}" bucket...`);
    await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  }
}

async function run() {
  if (!existsSync(LIBRARY_DIR)) {
    console.error(`❌ Library directory not found: ${LIBRARY_DIR}`);
    console.log(`Please create a "local_library" folder in the root of your project and organize your files inside it.`);
    process.exit(1);
  }

  console.log('🚀 Starting Unified Media Upload & Seed...');
  await ensureBucket();

  const artistFolders = await fs.readdir(LIBRARY_DIR, { withFileTypes: true });

  for (const artistDir of artistFolders) {
    if (!artistDir.isDirectory()) continue;

    const artistName = artistDir.name;
    const artistSlug = toSlug(artistName);
    const artistPath = path.join(LIBRARY_DIR, artistName);

    console.log(`\n🎤 Processing Artist: ${artistName}`);

    let artistImageUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000'; // Default placeholder

    // Check for profile image
    const artistFiles = await fs.readdir(artistPath, { withFileTypes: true });
    for (const file of artistFiles) {
      if (file.isFile() && /\.(jpe?g|png|webp)$/i.test(file.name)) {
        const mimeType = file.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const storagePath = `${artistSlug}/${toSlug(file.name.split('.')[0])}${path.extname(file.name)}`;
        artistImageUrl = await uploadFile(path.join(artistPath, file.name), storagePath, mimeType);
        console.log(`  🖼️ Uploaded artist profile: ${file.name}`);
        break; // Only take the first image found in the root artist folder
      }
    }

    // Insert Artist into DB
    const { error: artistErr } = await supabase.from('artists').upsert({
      id: artistSlug,
      name: artistName,
      bio: 'Biography coming soon...', // Default fallback
      image_url: artistImageUrl,
      followers: '0'
    });
    if (artistErr) console.error(`  ❌ Failed to insert artist: ${artistErr.message}`);
    else console.log(`  ✅ Inserted artist into DB`);

    // Process Albums
    for (const albumDir of artistFiles) {
      if (!albumDir.isDirectory()) continue;

      const albumFolder = albumDir.name;
      const { year, title: albumTitle } = parseAlbumFolder(albumFolder);
      const albumSlug = `${artistSlug}-${toSlug(albumTitle)}`;
      const albumPath = path.join(artistPath, albumFolder);

      console.log(`  💿 Processing Album: ${albumTitle} (${year || 'Unknown Year'})`);

      let coverUrl = 'https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=1000'; // Default placeholder
      const tracksToInsert = [];
      const albumFiles = await fs.readdir(albumPath, { withFileTypes: true });

      // Find Cover and Audio files
      for (const file of albumFiles) {
        if (!file.isFile()) continue;

        const filePath = path.join(albumPath, file.name);
        const storageFolder = `${artistSlug}/${toSlug(albumFolder)}`;
        const storagePath = `${storageFolder}/${file.name}`;

        if (/\.(jpe?g|png|webp)$/i.test(file.name)) {
          // Upload Cover
          const mimeType = file.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
          coverUrl = await uploadFile(filePath, storagePath, mimeType);
          console.log(`    🖼️ Uploaded cover: ${file.name}`);
        } else if (/\.(mp3|m4a|wav|aac)$/i.test(file.name)) {
          // Upload Audio Track
          const mimeType = file.name.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg';
          const audioUrl = await uploadFile(filePath, storagePath, mimeType);
          const trackTitle = parseTrackFile(file.name);
          const trackSlug = `${albumSlug}-t${tracksToInsert.length + 1}`;

          console.log(`    🎵 Uploaded track: ${trackTitle}`);

          tracksToInsert.push({
            id: trackSlug,
            title: trackTitle,
            artist_id: artistSlug,
            album_id: albumSlug,
            duration: 0, // Default fallback
            genre: 'Unknown', // Default fallback
            audio_url: audioUrl,
            color: '#3b82f6', // Default fallback UI color
            lyrics: null
          });
        }
      }

      // Insert Album into DB
      const { error: albumErr } = await supabase.from('albums').upsert({
        id: albumSlug,
        title: albumTitle,
        artist_id: artistSlug,
        year: year,
        cover_url: coverUrl
      });
      if (albumErr) console.error(`    ❌ Failed to insert album: ${albumErr.message}`);
      else console.log(`    ✅ Inserted album into DB`);

      // Insert Tracks into DB
      if (tracksToInsert.length > 0) {
        const { error: trackErr } = await supabase.from('tracks').upsert(tracksToInsert);
        if (trackErr) console.error(`    ❌ Failed to insert tracks: ${trackErr.message}`);
        else console.log(`    ✅ Inserted ${tracksToInsert.length} tracks into DB`);
      }
    }
  }

  console.log('\n🎉 All media successfully uploaded and seeded to the database!');
}

run().catch(err => {
  console.error('\n💥 Fatal Error:', err.message);
  process.exit(1);
});
