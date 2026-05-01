# Rolyang Music Platform — Architecture & Operations Guide

This document outlines all architectural decisions, infrastructure configuration, and operational procedures for the Rolyang music streaming platform.

---

## 1. Technical Foundation: Astro + Unified Audio + View Transitions

### Why Astro?

Astro is primarily designed for Multi-Page Applications (MPAs). Historically, MPAs are incompatible with music platforms because navigating to a new page kills playback. We solve this with **Astro View Transitions** and **Persistent Islands**.

### Continuous Playback Architecture

- Astro intercepts all link clicks and replaces the DOM without a full page reload.
- The `<Player client:load />` island is marked with `transition:persist`, surviving all DOM swaps untouched.
- Client-side scripts are initialized on every `astro:page-load` event via `src/scripts/main.js`.

### The Engine: Unified Audio Service (`src/lib/audioService.js`)

An abstracted engine supporting both web and native playback:

- **Web (Howler.js):** `html5: true` enables native browser range-request streaming. Audio starts playing within ~0.5s even for large files.
- **Native (Capacitor):** Uses `capacitor-music-controls-plugin` for OS lock-screen controls and hardware key support.
- **Unified API:** Both engines share a single interface (`load`, `play`, `pause`, `seek`, `setVolume`).

> [!IMPORTANT]
> Capacitor support is permanent and will never be dropped. Do NOT introduce audio formats (e.g., Opus) that are unsupported in iOS/Android WebView.

---

## 2. Infrastructure & Backend

### Database: Supabase (PostgreSQL)

- **Project URL:** `https://qmmawqxonyyyzphfnemd.supabase.co`
- **Auth:** Supabase SSR via `@supabase/ssr`. Server client in `src/lib/supabaseServer.js`.
- **Client:** Browser client in `src/lib/supabase.js`.
- **Environment Variables Required:**
  ```
  PUBLIC_SUPABASE_URL=https://qmmawqxonyyyzphfnemd.supabase.co
  PUBLIC_SUPABASE_ANON_KEY=<anon key>
  SUPABASE_SERVICE_ROLE_KEY=<service role key — never commit to Git>
  ```

### Schema Overview

| Table | Key Columns |
|---|---|
| `albums` | `id`, `title`, `artist`, `cover` (Supabase Storage URL) |
| `tracks` | `id`, `album_id`, `title`, `audio` (Supabase Storage URL), `duration`, `play_count` |
| `playlists` | `id`, `user_id`, `title`, `description`, `cover` |
| `playlist_tracks` | `playlist_id`, `track_id`, `added_at` |
| `liked_tracks` | `user_id`, `track_id` |
| `followed_artists` | `user_id`, `artist_name` |

> [!WARNING]
> NEVER commit the `SUPABASE_SERVICE_ROLE_KEY` to Git. It has full database bypass access.

### Media Storage: Supabase Storage (CDN)

All media files are stored in Supabase Storage and served via Cloudflare-backed CDN. **Do NOT store media files in `public/`** — they would bloat every Netlify deployment.

| Bucket | Contents | Visibility |
|---|---|---|
| `audio` | AAC audio tracks (`.m4a`) | Public |
| `thumbnails` | WebP album covers (`.webp`) | Public |

**URL format:**
```
https://qmmawqxonyyyzphfnemd.supabase.co/storage/v1/object/public/{bucket}/{filename}
```

### Audio Format: AAC (.m4a)

All audio is encoded as **AAC at 128kbps** using ffmpeg with `-movflags +faststart` for optimal web streaming (metadata at file start).

```bash
ffmpeg -i input.mp3 -vn -c:a aac -b:a 128k -movflags +faststart output.m4a
```

- `-vn` strips any embedded video streams (some MP3s contain album art as H.264)
- `-movflags +faststart` moves the moov atom to the file start — audio begins immediately without waiting for full download
- AAC is ~20% smaller than MP3 at equivalent quality and is natively supported across all browsers, iOS, and Android WebView

### Image Format: WebP

All album cover images are stored as **WebP at quality 82, 400×400px** (2× retina for max 200px display size).

```bash
# Using sharp (already installed via Astro)
node scripts/compress-images.mjs
```

---

## 3. Deployment: Netlify

- **Adapter:** `@astrojs/netlify`
- **Output mode:** `server` (SSR)
- **Build command:** `npm run build`
- **Package manager:** `npm` (not pnpm — pnpm caused symlink issues on Netlify)

### OAuth Redirect Configuration (Required for Production)

In the **Supabase Dashboard → Authentication → URL Configuration**:
- **Site URL:** `https://rolyang.netlify.app`
- **Redirect URLs:** Add `https://rolyang.netlify.app/auth/callback`

> [!CAUTION]
> Without the correct redirect URL whitelist, Facebook/Google OAuth login will redirect to `localhost` instead of production.

---

## 4. State Management (Nanostores)

Because the project uses Astro's Islands Architecture, **[Nanostores](https://github.com/nanostores/nanostores)** provides ultra-fast, framework-agnostic shared state.

### Stores (`src/store/playerStore.js`)

| Store | Type | Purpose |
|---|---|---|
| `$isPlaying` | `atom(false)` | Global play/pause state |
| `$currentTrack` | `atom({bookId, chapIndex, trackId, title, artist})` | Currently playing track |
| `$likedTracks` | `map({})` | `"albumId:chapId"` → boolean |
| `$followedArtists` | `map({})` | `"artistName"` → boolean |

### Track Highlighting System

Every track row carries `data-track-id`. The `updateRows()` function in `main.js` highlights by **exact `trackId` match only**:

```js
const isCurrent = String(row.dataset.trackId) === String(track.trackId);
```

This ensures the correct track is highlighted across all pages (album, playlist, artist) regardless of context.

> [!NOTE]
> The Player.jsx store-sync effect is guarded with `if (!currentTrack.bookId) return`. This prevents the default first track (index 0 of album 0) from being written into the store on mount before any user action.

---

## 5. Performance Optimizations

### Server-Side
- **Parallelized fetching:** All Supabase queries use `Promise.all()` in Layout.astro, index.astro, and album/[id].astro to eliminate sequential waterfall.
- **Null-safe rendering:** All Supabase results use `|| []` coalescing (never destructuring defaults, which don't handle `null`).
- **Search:** Batch-fetches track indices to eliminate N+1 query pattern.

### Client-Side
- **Script consolidation:** All inline JS extracted to `src/scripts/main.js` (modular, tree-shakeable).
- **Library data injection:** `window.__libraryData` and `window.__userPlaylists` injected via inline `<script>` in Layout.astro sidebar, so data is available synchronously to all page scripts.

### Media
- **Images:** WebP, 400×400px, quality 82 (~90% smaller than original JPGs)
- **Audio:** AAC 128kbps with `+faststart` (browser streams progressively, not fully downloaded)
- **CDN:** Supabase Storage backed by Cloudflare — global edge delivery

---

## 6. Client-Side Scripts (`src/scripts/main.js`)

All global UI behaviors are initialized in `initApp()`, called on every `astro:page-load`:

| Function | Purpose |
|---|---|
| `setupPlayerClickHandler` | Intercepts row/card clicks → dispatches `player:play` |
| `setupProfileDropdown` | Profile menu toggle + logout |
| `setupHeaderScroll` | Frosted glass header on scroll |
| `setupPlayerReveal` | Shows player shell when playback starts |
| `setupBottomNavVisibility` | Hides bottom nav when player is expanded (mobile) |
| `setupLikeLogic` | Heart button toggle + DB sync |
| `setupFollowLogic` | Follow button toggle + DB sync |
| `setupPlaylistGlobalLogic` | Create/edit/delete playlist modal |
| `setupTrackContextMenu` | Track "..." context menu |
| `setupTrackHighlighting` | Subscribes to `$currentTrack` → calls `updateRows()` |
| `renderLibrary` | Renders sidebar library list (Albums/Playlists/Artists tabs) |

---

## 7. Mobile Development (Capacitor)

### Build & Sync Process

```bash
# 1. Build Astro to dist/
npm run build

# 2. Sync to native folders
npx cap sync

# 3. Open in IDE
npx cap open android
npx cap open ios
```

> [!TIP]
> Ensure `capacitor.config.ts` has `webDir: 'dist'`.

### Background Audio

- **Android:** Foreground Service via `capacitor-music-controls-plugin`
- **iOS:** Enable "Audio, AirPlay, and Picture in Picture" background modes in Xcode

### Media Session (Lock Screen)

`audioService.js` calls `navigator.mediaSession` on web and `MusicControls.create()` on native, propagating track title, artist, album, and artwork to the OS.

---

## 8. Utility Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `compress-images.mjs` | Converts JPG/PNG thumbnails → WebP (400px, q82) using sharp |
| `convert-to-aac.mjs` | Batch-converts MP3/WAV → AAC .m4a using ffmpeg |
| `migrate-to-supabase-storage.mjs` | Uploads audio + thumbnails to Supabase Storage, updates DB URLs |
| `update-cover-urls.mjs` | Updates album cover URLs in DB (one-off, post-migration) |

Run scripts with env vars:
```bash
$env:PUBLIC_SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/<script>.mjs
```

---

## 9. Environment Setup (Local Development)

1. Copy `.env.example` to `.env`
2. Fill in `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` from Supabase Dashboard → Project Settings → API
3. Run `npm install` then `npm run dev`

> [!NOTE]
> The app requires authentication — you must log in before seeing any content. Use Facebook or email/password OAuth configured in your Supabase project.
