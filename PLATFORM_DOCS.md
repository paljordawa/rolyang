# Audiobook Platform Architecture & Roadmap

This document outlines the current architectural decisions for the Audiobook platform and details the roadmap required to scale it into a production-level standard audio streaming platform (similar to Spotify or Apple Music).

## 1. Technical Foundation: Astro + Unified Audio + View Transitions

### Why Astro?

Astro is primarily designed for generating static websites or Multi-Page Applications (MPAs). Historically, MPAs are completely incompatible with music streaming platforms because navigating to a new page forces the browser to refresh, which immediately kills playback.

### The Solution: View Transitions & Persistent Islands

Despite using Astro, this platform achieves uninterrupted, continuous audio playback using **Astro View Transitions**.
By enabling View Transitions (`<ViewTransitions />` in `Layout.astro`):

- Astro intercepts all link clicks natively and replaces the DOM without a full page reload.
- **The Magic:** The `<Player client:load />` island is marked with `transition:persist`, ensuring it survives DOM swaps untouched.

### The Engine: Unified Audio Service (`audioService.js`)

We have migrated to an abstracted engine in `src/lib/audioService.js` that enables seamless switching between platforms:

- **Web (Howler.js):** Maintains the high reliability of Howler for browser-based streaming.
- **Native (Capacitor):** Pre-configured to use native plugins (Capawesome or Community Music Controls) for system-level background audio performance.
- **Unified API:** Both engines share a single interface for load, play, pause, and seek, controlled by React components and Nanostores.

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

## 3. Mobile Development Roadmap (Capacitor)

### A. Media Session & Native Controls

Integrating `navigator.mediaSession` (Web) and **Capacitor Music Controls** (Native) to ensure the OS lock screen displays metadata and responds to hardware keys (Next/Prev/Play/Pause). 

### B. Background Audio Strategy

To ensure audio keeps playing when the app is minimized:

- **Android:** Implement a Foreground Service via native plugins.
- **iOS:** Enable "Audio, AirPlay, and Picture in Picture" background modes in Xcode.

### C. HLS Streaming (M3U8)

(Future) Implement `hls.js` or native HLS support for large files to enable instant playback and adaptive quality.

---

## 4. App Development Key Workflow

### Phase 1: Foundation & Capacitor wrapper

- **Capacitor Setup:** Project wrapped with `@capacitor/core` and `@capacitor/cli`.
- **Build Target:** Astro builds to `dist/`, which serves as the Capacitor `webDir`.

### Phase 2: Data & Backend

- **Supabase:** Migrating to Postgres on the edge for 'Liked Songs', 'Followed Artists', and User Authentication.

> [!WARNING]
> **Supabase Migration:** When migrating from local environments or other systems, ensure the Supabase SQL schema (previously in `supabase_schema.sql`) has been applied to the production project first. Use migration scripts if you need to move data from legacy SQLite `local.db` files. NEVER commit sensitive Supabase Service Role keys to Git.

### Phase 3: Persistent State (Nanostores)

- **Shared State:** Use Nanostores to bridge the gap between Astro's static HTML and the dynamic React Player island.

### Phase 4: Core Player Features (Unified Service)

- **Audio Controller:** Use `audioService.js` to manage engine switching (Web Howler vs Native Plugin).
- **Metadata Propagation:** Centralized Media Session updates for lock-screen persistence.

### Phase 5: UI & Discovery

- **Optimistic UI:** Update Heart icons and follow buttons instantly via Nanostores.
- **Safe Area Design:** Ensure player UI respects iPhone notches and Home indicators.

### Phase 6: Optimization & Launch

- **Native Deployment:** Automated sync via `npx cap copy` and testing on physical iOS/Android devices.
- **Skeleton Loaders:** Enhanced perceived performance during track transitions.

---

## 5. Mobile Build & Sync Process

To deploy the current web state to a physical device or emulator, follow these steps:

### 1. Build the Astro Project

Astro must generate the static production build in the `dist/` directory first.

```bash
pnpm run build
```

### 2. Sync to Capacitor

Update the native Android/iOS folders with the latest code and plugins.

```bash
npx cap sync
```

### 3. Open Native IDEs

Open the project in Android Studio or Xcode to compile and run on a device.

```bash
npx cap open android
npx cap open ios
```

> [!TIP]
> Ensure your `capacitor.config.ts` has `webDir: 'dist'` to match Astro's default output.
