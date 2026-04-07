import { atom, map } from 'nanostores';

// Basic state atoms
export const $isPlaying = atom(false);
export const $isExpanded = atom(false);
export const $currentTrack = atom({
  bookId: null,
  chapIndex: 0,
  trackId: null,
  title: null,
  artist: null
});

// For syncing 'Like' states across components
export const $likedUpdate = atom(0); // A counter to trigger re-renders
export const $likedTracks = map({}); // A map of 'albumId:chapId' -> boolean

// For syncing 'Follow' states across components
export const $followedArtists = map({}); // A map of 'artistName' -> boolean

// Helper to initialize likes from localStorage
if (typeof window !== 'undefined') {
  const initLikes = () => {
    const likes = {};
    const followed = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('liked:')) {
        const value = localStorage.getItem(key);
        likes[key.replace('liked:', '')] = value === 'true';
      } else if (key && key.startsWith('follow:')) {
        const value = localStorage.getItem(key);
        followed[key.replace('follow:', '')] = value === 'true';
      }
    }
    $likedTracks.set(likes);
    $followedArtists.set(followed);
  };
  initLikes();
}

export function toggleLike(albumId, chapId) {
  const key = `${albumId}:${chapId}`;
  const current = !!$likedTracks.get()[key];
  const newState = !current;
  
  $likedTracks.setKey(key, newState);
  
  if (typeof window !== 'undefined') {
    // 1. Persist to localStorage (for instant fallback)
    localStorage.setItem(`liked:${key}`, newState ? 'true' : 'false');
    
    // 2. Persist to Database via API
    fetch('/api/library/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: chapId, liked: newState })
    }).catch(err => console.error('Failed to sync like to DB:', err));

    window.dispatchEvent(new CustomEvent('player:like-sync'));
  }
}

export function toggleFollow(artistName) {
  if (!artistName) return;
  const current = !!$followedArtists.get()[artistName];
  const newState = !current;
  
  $followedArtists.setKey(artistName, newState);
  
  if (typeof window !== 'undefined') {
    // 1. Persist to localStorage
    localStorage.setItem(`follow:${artistName}`, newState ? 'true' : 'false');

    // 2. Persist to Database via API
    fetch('/api/library/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistName, followed: newState })
    }).catch(err => console.error('Failed to sync follow to DB:', err));

    window.dispatchEvent(new CustomEvent('player:follow-sync'));
  }
}

export async function hydrateLibrary() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/library/sync');
    const { likedTracks, followedArtists } = await res.json();
    if (likedTracks) $likedTracks.set(likedTracks);
    if (followedArtists) $followedArtists.set(followedArtists);
    console.log('Library hydrated from Database');
  } catch (e) {
    console.error('Failed to hydrate library:', e);
  }
}

// Global bridge for plain JS / other components
if (typeof window !== 'undefined') {
  // Remove OR condition to guarantee we use the latest function, bypassing HMR stale closures
  window.playerPlay = function (payload) {
    try { 
      console.log('playerPlay called with:', payload);
      // 1. Dispatch event (legacy support)
      window.dispatchEvent(new CustomEvent('player:play', { detail: payload })); 
      
      // 2. Direct Nanostore update (new Phase 3 architectural bridge)
      // Call directly because we are inside playerStore
      updateTrack(payload.bookId, payload.chapIndex, payload.play !== false, payload.trackId, payload.title, payload.artist);
    } catch (e) { 
      console.error('playerPlay error:', e);
    }
  };

  window.__nanostores_player = {
    updateTrack: (bookId, chapIndex, shouldPlay = true, trackId = null, title = null, artist = null) => {
      updateTrack(bookId, chapIndex, shouldPlay, trackId, title, artist);
    },
    togglePlay: () => {
      togglePlay();
    },
    toggleFollow,
    toggleLike,
    hydrateLibrary,
    $isPlaying,
    $currentTrack,
    $isExpanded,
    $likedTracks,
    $followedArtists
  };
  
  // Hydrate library on store load
  hydrateLibrary();
}

export function updateTrack(bookId, chapIndex, shouldPlay = true, trackId = null, title = null, artist = null) {
  $currentTrack.set({ bookId, chapIndex, trackId, title, artist });
  if (shouldPlay) $isPlaying.set(true);
}

export function togglePlay() {
  $isPlaying.set(!$isPlaying.get());
}
