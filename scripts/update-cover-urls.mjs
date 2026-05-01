import { createClient } from '@supabase/supabase-js';

// Update these cover paths to use optimized WebP files
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map old filenames → new WebP filenames
const REMAP = {
  '/thumbnail/mn.jpg':    '/thumbnail/mn.webp',
  '/thumbnail/gamru.jpg': '/thumbnail/gamru.webp',
  '/thumbnail/file.jpg':  '/thumbnail/file.webp',
};

async function updateCoverUrls() {
  console.log('\nFetching albums...');
  const { data: albums, error } = await supabase.from('albums').select('id, title, cover');
  if (error) { console.error(error); process.exit(1); }

  let updated = 0;
  for (const album of albums) {
    const newCover = REMAP[album.cover];
    if (!newCover) { console.log(`  skip: ${album.title} (${album.cover})`); continue; }

    const { error: err } = await supabase.from('albums').update({ cover: newCover }).eq('id', album.id);
    if (err) { console.error(`  ❌ ${album.title}:`, err.message); }
    else { console.log(`  ✅ ${album.title}: ${album.cover} → ${newCover}`); updated++; }
  }

  console.log(`\nDone! Updated ${updated} album cover URLs.\n`);
}

updateCoverUrls();
