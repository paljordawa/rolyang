# Rolyang — Platform Architecture & Operations Guide

This document outlines the architectural decisions, infrastructure, and operational procedures for the **Rolyang** music streaming platform.

---

## 1. Technical Foundation: Vite + React + TypeScript

Rolyang is a fully client-side Single Page Application (SPA) built with **Vite**, **React 19**, and **TypeScript**. The project was migrated from a previous Astro MPA architecture to this stack for improved performance, simpler deployment, and a richer interactive experience.

### Tech Stack

| Layer | Technology |
|---|---|
| Build Tool | Vite 6 |
| UI Framework | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |
| AI Features | Google Gemini (`@google/genai`) |
| Database / Auth | Supabase |

---

## 2. Project Structure

```
rolyang/
├── lib/
│   └── supabase.ts          # Supabase client (browser-side)
├── public/
│   ├── rolyang-logo.svg     # Official Rolyang logo (used site-wide)
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── social.jpg
│   └── sw.js
├── scripts/                 # Admin / migration scripts (Node.js)
│   ├── add-album.mjs
│   ├── migrate-to-supabase-storage.mjs
│   ├── seed.mjs
│   └── ...
├── src/
│   ├── hooks/
│   │   └── useAudio.ts      # Audio playback hook (Web Audio API + MediaSession)
│   ├── App.tsx              # Main application + all views + OnboardingScreen
│   ├── constants.ts         # Static song/artist/playlist data
│   ├── types.ts             # TypeScript interfaces
│   ├── index.css            # Global styles + CSS variables + Tailwind
│   └── main.tsx             # React entry point
├── .env                     # Supabase keys + Gemini API key
├── capacitor.config.ts      # Capacitor stub (for future mobile builds)
├── index.html               # HTML entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Authentication — Rolyang Login / Onboarding Screen

On first launch (or after logout), users are presented with the **Rolyang Splash Screen** — a full-screen animated overlay featuring:

- Animated floating Rolyang logo with cycling colorful glow
- Pulsing purple atmospheric background glow
- **Continue with Google** (Supabase OAuth)
- **Continue with Facebook** (Supabase OAuth)
- **Continue as Guest** (skips auth, stored in localStorage)

### Auth Flow

```
App loads
  └─ isLoggedIn? (localStorage 'rolyang_onboarding_complete')
       ├─ true  → Show main music player immediately
       └─ false → Show OnboardingScreen overlay
                    ├─ OAuth (Google/Facebook) → Supabase session → unlock app
                    └─ Continue as Guest → localStorage flag set → unlock app
```

OAuth redirect URL: `window.location.origin + '/auth/callback'`

---

## 4. Database — Supabase

Rolyang uses **Supabase** (PostgreSQL) as its backend. The connection is managed in `lib/supabase.ts` using `@supabase/supabase-js`.

### Environment Variables

```env
# Vite-compatible (used by lib/supabase.ts)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> ⚠️ **Do not modify the Supabase connection or database schema** through the app. All schema changes must be made directly in the Supabase dashboard.

### Admin / Migration Scripts

The `scripts/` folder contains Node.js utilities for data management:

| Script | Purpose |
|---|---|
| `seed.mjs` | Seed initial song/album data |
| `add-album.mjs` | Add a new album to Supabase |
| `migrate-to-supabase-storage.mjs` | Migrate media files to Supabase Storage |
| `compress-images.mjs` | Compress cover images |
| `convert-to-aac.mjs` | Convert audio files to AAC |
| `update-cover-urls.mjs` | Update cover image URLs in the DB |

---

## 5. Audio Playback — `useAudio` Hook

All audio playback is managed by the `src/hooks/useAudio.ts` hook.

**Features:**
- Web Audio API via native `<Audio>` element
- Queue management with shuffle support
- MediaSession API integration (lock screen controls, OS media notifications)
- Auto-advance to next track on song end
- Volume control
- Seek support

---

## 6. Views & Navigation

The app is a single-page app with view state managed in `App.tsx`:

| View | Description |
|---|---|
| `listenNow` | Home / featured content |
| `browse` | Genre/category browser |
| `favorites` | User's liked songs |
| `artists` | Artist directory |
| `playlists` | User-created + default playlists |

Navigation:
- **Desktop**: Left sidebar (256px wide)
- **Mobile**: Bottom navigation bar + top search header

---

## 7. Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Type check
npm run lint

# Production build
npm run build
```

---

## 8. Environment Setup

Copy `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
GEMINI_API_KEY=<your-gemini-key>  # for AI features
```

---

## 9. Branding

The official Rolyang logo is at `public/rolyang-logo.svg` and is used in:
- Desktop sidebar (32×32)
- Mobile top header (32×32, tappable home button)
- Login / Onboarding splash screen (animated, 128×128 / 160×160 on md+)
