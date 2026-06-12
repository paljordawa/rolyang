import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'media';

async function listRecursive(pathStr, filesList = []) {
  const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(pathStr, { limit: 100 });
  if (error) {
    throw new Error(`Error listing path ${pathStr} in bucket ${BUCKET_NAME}: ${error.message}`);
  }
  for (const file of files || []) {
    const fullPath = pathStr ? `${pathStr}/${file.name}` : file.name;
    if (file.id === null) {
      // It's a folder
      await listRecursive(fullPath, filesList);
    } else {
      // It's a file
      filesList.push(fullPath);
    }
  }
  return filesList;
}

async function run() {
  console.log("🚀 Starting Supabase Storage Reorganization...");
  
  // 1. List all files in the bucket
  console.log("Step 1: Listing all files in the 'media' bucket...");
  const allFiles = await listRecursive('');
  console.log(`Found ${allFiles.length} total files in the bucket.`);

  // 2. Filter files that need to be moved
  const filesToMove = allFiles.filter(filePath => {
    return !filePath.startsWith('artists/') && !filePath.startsWith('banners/');
  });

  console.log(`Identified ${filesToMove.length} files that need to be moved to the '/artists/' directory:`);
  filesToMove.forEach(f => console.log(` - ${f}`));

  if (filesToMove.length === 0) {
    console.log("No files to move! Structure is already correct.");
  } else {
    // 3. Copy files to new location
    console.log("\nStep 2: Copying files to the new '/artists/' location...");
    for (const oldPath of filesToMove) {
      const newPath = `artists/${oldPath}`;
      console.log(`Copying: ${oldPath} -> ${newPath}`);
      const { error } = await supabase.storage.from(BUCKET_NAME).copy(oldPath, newPath);
      if (error) {
        console.error(`❌ Failed to copy ${oldPath}: ${error.message}`);
        process.exit(1);
      }
    }
    console.log("All files successfully copied!");
  }

  // 4. Update Database Records
  console.log("\nStep 3: Updating database records...");
  
  // Tracks
  const { data: tracks, error: tracksErr } = await supabase.from('tracks').select('id, title, audio_url');
  if (tracksErr) {
    console.error("Error fetching tracks:", tracksErr);
    process.exit(1);
  }
  
  let updatedTracksCount = 0;
  for (const track of tracks || []) {
    const url = track.audio_url;
    if (url && url.includes('/public/media/') && !url.includes('/public/media/artists/') && !url.includes('/public/media/banners/')) {
      const newUrl = url.replace('/public/media/', '/public/media/artists/');
      console.log(`Updating Track [${track.title}]:\n  Old: ${url}\n  New: ${newUrl}`);
      
      const { error: updateErr } = await supabase.from('tracks').update({ audio_url: newUrl }).eq('id', track.id);
      if (updateErr) {
        console.error(`❌ Failed to update track ${track.id}:`, updateErr.message);
        process.exit(1);
      }
      updatedTracksCount++;
    }
  }
  console.log(`Updated ${updatedTracksCount} tracks in the database.`);

  // Albums
  const { data: albums, error: albumsErr } = await supabase.from('albums').select('id, title, cover_url');
  if (albumsErr) {
    console.error("Error fetching albums:", albumsErr);
    process.exit(1);
  }

  let updatedAlbumsCount = 0;
  for (const album of albums || []) {
    const url = album.cover_url;
    if (url && url.includes('/public/media/') && !url.includes('/public/media/artists/') && !url.includes('/public/media/banners/')) {
      const newUrl = url.replace('/public/media/', '/public/media/artists/');
      console.log(`Updating Album [${album.title}]:\n  Old: ${url}\n  New: ${newUrl}`);
      
      const { error: updateErr } = await supabase.from('albums').update({ cover_url: newUrl }).eq('id', album.id);
      if (updateErr) {
        console.error(`❌ Failed to update album ${album.id}:`, updateErr.message);
        process.exit(1);
      }
      updatedAlbumsCount++;
    }
  }
  console.log(`Updated ${updatedAlbumsCount} albums in the database.`);

  // 5. Delete original files from old location
  if (filesToMove.length > 0) {
    console.log("\nStep 4: Deleting old files from the root of the bucket...");
    const { error: removeErr } = await supabase.storage.from(BUCKET_NAME).remove(filesToMove);
    if (removeErr) {
      console.error(`❌ Failed to delete old files: ${removeErr.message}`);
      process.exit(1);
    }
    console.log("Deleted old files from the root successfully!");
  }

  console.log("\n✅ Reorganization completed successfully!");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
