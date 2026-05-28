# Rolyang 🎵

**Rolyang** is a premium music streaming web application built with a modern Vite + React stack. It features an Apple Music-inspired UI, real-time audio playback, Supabase-backed user authentication, and AI-powered features via Google Gemini.

---

## Features

- 🎵 **Full audio playback** — Web Audio API with queue, shuffle, skip, seek, and volume control
- 🔐 **Supabase Auth** — Google & Facebook OAuth login with guest mode
- 🎨 **Apple Music-style UI** — Dark glassmorphism design with dynamic color theming
- 📱 **Fully responsive** — Desktop sidebar + mobile bottom nav
- 🔍 **Search & Browse** — Dynamic genre filtering based on available tracks
- ❤️ **Favorites & Playlists** — Synced securely to Supabase `user_favorites`
- 🎤 **Artists & Albums** — Detailed artist/album pages
- 🌍 **Bilingual** — English + Tibetan (བོད་སྐད།) language toggle
- 🔒 **Login Splash Screen** — OAuth buttons with dynamic avatar rendering and strict session isolation on logout
- 🤖 **AI features** — Powered by Google Gemini

---

## Tech Stack

| | |
|---|---|
| **Framework** | React 19 + TypeScript |
| **Build** | Vite 6 |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **Database / Auth** | Supabase |
| **AI** | Google Gemini (`@google/genai`) |

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

### 3. Run locally

```bash
npm run dev
# → http://localhost:3000
```

### 4. Build for production

```bash
npm run build
```

---

## Project Structure

```
rolyang/
├── lib/
│   └── supabase.ts       # Supabase client
├── public/
│   └── rolyang-logo.svg  # Official logo
├── scripts/              # Admin/migration Node.js scripts
├── src/
│   ├── hooks/
│   │   └── useAudio.ts   # Audio playback engine
│   ├── App.tsx           # Main app + all views
│   ├── types.ts          # TypeScript types
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
├── .env                  # Environment variables (not committed)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Database (Supabase)

- Database schema and table changes must be made in the **Supabase Dashboard** directly.
- The Supabase client in `lib/supabase.ts` uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- All tracks, artists, albums, and playlists are fetched dynamically from the database.
- Admin data scripts are in the `scripts/` folder.

---

## Branding

The Rolyang logo (`public/rolyang-logo.svg`) is used across:
- Desktop sidebar
- Mobile header (tap to go home)
- Login / onboarding splash screen

---

## License

Private — All rights reserved.
