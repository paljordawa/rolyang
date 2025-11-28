# Rolyang Music Album

A modern, responsive audio player web application built with Astro and React. Stream music albums with a beautiful, mobile-first interface featuring persistent playback, offline support, and smooth navigation.

## 🎵 Features

### Core Functionality

- **Album Library**: Browse and explore music albums with cover art
- **Audio Player**: Full-featured player with play/pause, seek, and chapter navigation
- **Persistent Playback**: Audio continues playing across page navigation
- **Progress Tracking**: Automatic position saving and restoration
- **Chapter Management**: Navigate between tracks within albums

### Player Features

- **Mini Player**: Collapsed bottom player for background playback
- **Fullscreen Player**: Expanded view with album art and detailed controls
- **Playback Speed**: Adjustable speed (0.5x - 2x)
- **Media Session API**: Integration with system media controls
- **Smooth Transitions**: Fade in/out audio transitions
- **Download Support**: Download individual tracks
- **Share Functionality**: Share albums and tracks

### User Experience

- **Responsive Design**: Mobile-first layout with Tailwind CSS
- **SPA-like Navigation**: Smooth page transitions without full reloads
- **Active State Highlighting**: Visual feedback for currently playing tracks
- **Offline Support**: Service worker for offline functionality
- **PWA Ready**: Web manifest for installable app experience

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build) v4.0.0
- **UI Library**: React 18.0.0
- **Styling**: Tailwind CSS 3.0.0
- **Build Tool**: Astro (Vite-based)
- **Package Manager**: pnpm

## 📁 Project Structure

```text
audiobook/
├── public/
│   ├── audio/              # Audio files (MP3, M4A)
│   ├── thumbnail/          # Album cover images
│   ├── manifest.webmanifest # PWA manifest
│   └── sw.js               # Service worker
├── src/
│   ├── components/
│   │   └── Player.jsx      # Main React audio player component
│   ├── data/
│   │   └── data.json       # Album and track metadata
│   ├── layouts/
│   │   └── Layout.astro    # Main layout wrapper
│   ├── pages/
│   │   ├── index.astro     # Homepage with album grid
│   │   ├── album/
│   │   │   └── [id].astro  # Individual album detail page
│   │   └── player/
│   │       └── [albumId]/
│   │           └── [chapterId].astro # Track detail page
│   ├── scripts/
│   │   └── app-client.js   # Client-side navigation and player controls
│   └── styles.css          # Global styles
├── astro.config.mjs        # Astro configuration
├── tailwind.config.cjs     # Tailwind CSS configuration
└── package.json            # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or compatible version)
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd audiobook
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Add audio files**

   - Place your audio files in `public/audio/`
   - Add album cover images to `public/thumbnail/`
   - Update `src/data/data.json` with your album and track information

4. **Configure albums**

   - Edit `src/data/data.json` to add/modify albums
   - Each album should have:
     - `id`: Unique identifier (e.g., "album-1")
     - `title`: Album name
     - `author`: Artist name
     - `cover`: Path to cover image (e.g., "/thumbnail/image.jpg")
     - `description`: Album description
     - `chapters`: Array of tracks with `id`, `title`, `audio` path, and `duration`

### Development

Start the development server:

```bash
pnpm run dev
# or
npm run dev
```

The app will be available at `http://localhost:4321` (default Astro port).

### Build

Create a production build:

```bash
pnpm run build
# or
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
pnpm run preview
# or
npm run preview
```

## 📝 Configuration

### Album Data Structure

Edit `src/data/data.json` to manage your albums:

```json
[
  {
    "id": "album-1",
    "title": "Album Title",
    "author": "Artist Name",
    "cover": "/thumbnail/cover.jpg",
    "description": "Album description",
    "chapters": [
      {
        "id": "track-1",
        "title": "Track Title",
        "audio": "/audio/track.mp3",
        "duration": "3:45"
      }
    ]
  }
]
```

### Audio File Paths

- Audio files should be placed in `public/audio/`
- Reference them in `data.json` as `/audio/filename.mp3`
- Supported formats: MP3, M4A, and other browser-supported audio formats

### Styling

- Global styles: `src/styles.css`
- Tailwind configuration: `tailwind.config.cjs`
- Component-specific styles: Inline styles in Astro components

## 🎨 Customization

### Changing Colors

The app uses Tailwind CSS. Modify colors in component classes or extend the theme in `tailwind.config.cjs`.

### Player Behavior

Edit `src/components/Player.jsx` to customize:

- Playback speed options
- Fade in/out duration
- Position save interval
- UI layout and styling

### Navigation

Modify `src/scripts/app-client.js` to customize:

- SPA navigation behavior
- Player event handling
- Share functionality

## 🌐 Deployment

### Netlify

1. Connect your repository to Netlify
2. Set build command: `pnpm run build` (or `npm run build`)
3. Set publish directory: `dist`
4. Deploy!

### Other Platforms

The `dist/` folder contains static files that can be deployed to:

- Vercel
- GitHub Pages
- Any static hosting service

**Note**: Ensure audio files and assets are properly served. Some platforms may require configuration for large audio files.

## 🔧 Troubleshooting

### Styles Not Loading

- Ensure `src/styles.css` is imported in `Layout.astro`
- Check that Tailwind is properly configured
- Verify PostCSS configuration

### Audio Not Playing

- Check browser console for CORS errors
- Ensure audio file paths in `data.json` match actual file locations
- Verify audio files are in `public/audio/` directory
- Check browser audio autoplay policies

### Player Not Appearing

- Check browser console for JavaScript errors
- Verify React is properly hydrated
- Ensure `Player.jsx` is correctly imported in `Layout.astro`

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Key Features Explained

### Persistent Player

The player component is mounted in the layout and persists across all pages. It maintains state using:

- React state management
- localStorage for position and playback state
- Custom events for cross-component communication

### SPA-like Navigation

The app uses client-side navigation via `app-client.js`:

- Fetches page content without full reload
- Preserves player state during navigation
- Updates browser history

### Active Track Highlighting

Tracks are highlighted when playing using:

- Custom event listeners
- Data attributes for track identification
- CSS transitions for smooth visual feedback

## 📄 License

This project is private and not licensed for public use.

## 🤝 Contributing

This is a private project. For questions or issues, contact the project maintainer.

---

Built with ❤️ using Astro and React
