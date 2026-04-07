# Audiobook Platform Architecture & Roadmap

This document outlines the current architectural decisions for the Audiobook platform and details the roadmap required to scale it into a production-level standard audio streaming platform (similar to Spotify or Apple Music).

## 1. Technical Foundation: Astro + Howler.js + View Transitions

### Why Astro?

Astro is primarily designed for generating static websites or Multi-Page Applications (MPAs). Historically, MPAs are completely incompatible with music streaming platforms because navigating to a new page forces the browser to refresh, which immediately kills playback.

### The Solution: View Transitions & Persistent Islands

Despite using Astro, this platform achieves uninterrupted, continuous audio playback using **Astro View Transitions**.
By enabling View Transitions (`<ViewTransitions />` in `Layout.astro`):

- Astro intercepts all link clicks natively and replaces the DOM without a full page reload.
- **The Magic:** The `<Player client:load />` island is marked with `transition:persist`, ensuring it survives DOM swaps untouched.

### The Engine: Howler.js

We have migrated from the native HTML5 `<audio>` tag to **Howler.js**. 

- **Reliability:** Howler handles cross-browser audio issues, codecs, and buffering much more gracefully than raw tags.
- **Unified API:** It provides a consistent interface for playback, volume, and seeking that integrates perfectly with our React-based Player island.
- **Automatic Cleanup:** It manages the audio lifecycle during rapid page transitions, preventing memory leaks and "ghost audio."

---

## 2. State Management & Highlighting (Nanostores)

Because the project relies on Astro's "Islands Architecture," we use **[Nanostores](https://github.com/nanostores/nanostores)** for ultra-fast, framework-agnostic state management.

### Universal Song Highlighting System

A core challenge of music platforms is keeping the UI synchronized as the user navigates between different playlists that contain the same songs. We solve this with a multi-layered approach:

1. **Global Store:** The `$currentTrack` Nanostore holds the `trackId`, `title`, and `artist`.
2. **Meta-Matching Logic:** Every track row in the application carries data attributes (`data-track-id`, `data-track-title`, `data-artist-name`). 
3. **Navigation Sync:** On every `astro:page-load`, a global observer scans the new page's tracks and highlights the currently playing song using a tiered match:
    - Match by unique `trackId`.
    - Fallback: Match by **Title + Artist** (ensures highlighting works across custom playlists where IDs might differ).

---

## 3. Immediate Functional Roadmap (To-Dos)

### A. Media Session API Integration

(In Progress) Integrating `navigator.mediaSession` inside `Player.jsx` to pass cover art and metadata to the OS lock screen and catch hardware "Next/Prev" keys.

### B. HLS Streaming (M3U8)

(Future) Implement `hls.js` or Howler's streaming support for large files to enable instant playback and adaptive quality.

### C. Backend & Database

(Active) Migrating `data.json` to Turso (SQLite on the Edge) and implementing persistent 'Liked Songs' and 'Followed Artists' via secure Astro API endpoints (SSR).

---

## 4. App Development Key Workflow

### Phase 1: Environment & Foundation

- **Astro SSR Setup:** Set `output: 'server'`. 
- **Turso Database:** Connect via `@libsql/client` and secure `.env` variables.

### Phase 2: Data Modeling

- **Tracks & Users:** Relational schema forTracks, Playlists, and User Interactions.

### Phase 3: Persistent State (Nanostores)

- **Shared State:** Use Nanostores to bridge the gap between Astro's static HTML and the dynamic React Player island.
- **Universal Highlighting:** Implement the `astro:page-load` observer to keep tracklist UI synced with the playing state.

### Phase 4: Core Player Features (Howler.js)

- **Audio Controller:** Fully implement the Player using **Howler.js**.
- **Metadata Propagation:** ensure `playerPlay()` calls and the `Player` island exchange `trackId`, `title`, and `artist` for robust UI synchronization.

### Phase 5: UI & Discovery

- **CSR/SSR Discovery:** Query Turso for search results and library views.
- **Optimistic UI:** Update Heart icons and follow buttons instantly via Nanostores before the database confirms.

### Phase 6: Optimization & Launch

- **Edge Deployment:** Deploy to Netlify/Vercel with Turso replication for sub-100ms latency globally.
- **Skeleton Loaders:** Use Astro's latest features for deferred loading of tracklists.
