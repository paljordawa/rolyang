import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $isPlaying, $currentTrack, $isExpanded, $likedTracks, toggleLike as storeToggleLike } from '../store/playerStore';
export default function Player({ books: albums = [], startBookId: startAlbumId = null, startChapIndex = 0 }) {
  const audioRef = useRef(null);
  const [albumIdx, setAlbumIdx] = useState(() => {
    if (!Array.isArray(albums)) return 0;
    const idx = albums.findIndex(b => b.id === startAlbumId);
    return idx >= 0 ? idx : 0;
  });
  const [chapIdx, setChapIdx] = useState(startChapIndex || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const draggingBarRef = useRef(null);
  // Start collapsed by default — only expand on a direct play event or when Layout passes start props
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const lastCountedTrackIdRef = useRef(null);

  const handlePrevious = () => {
    if (current > 3 || chapIdx === 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrent(0);
    } else if (chapIdx > 0) {
      const album = albums[albumIdx];
      if (album && album.chapters) {
          const prevChap = album.chapters[chapIdx - 1];
          if (prevChap) localStorage.setItem(`pos:${album.id}:${prevChap.id}`, '0');
      }
      setChapIdx(ci => ci - 1);
    }
  };

  const handleNext = () => {
    const album = albums[albumIdx];
    if (album && album.chapters && chapIdx < album.chapters.length - 1) {
      const nextChap = album.chapters[chapIdx + 1];
      if (nextChap) localStorage.setItem(`pos:${album.id}:${nextChap.id}`, '0');
      setChapIdx(ci => ci + 1);
    }
  };

  // Track current audio source to avoid unnecessary reloads
  const currentAudioSrcRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const audioElementRef = useRef(null);
  const lastKnownTimeRef = useRef(0);
  const lastKnownAlbumChapRef = useRef({ albumId: null, chapId: null });


  const [isLiked, setIsLiked] = useState(false);

  // Normalize URL for comparison (handle relative/absolute differences)
  const normalizeUrl = (url) => {
    if (!url) return '';
    try {
      // Convert to absolute URL for comparison
      const a = document.createElement('a');
      a.href = url;
      return a.href;
    } catch (e) {
      return url;
    }
  };

  // Ensure audio element persists across re-renders
  useEffect(() => {
    if (!audioRef.current) return;
    audioElementRef.current = audioRef.current;
  }, []);

  useEffect(() => {
    const audio = audioRef.current || audioElementRef.current;
    if (!audio) return;
    const album = albums[albumIdx]; if (!album) return;
    const chap = album.chapters[chapIdx]; if (!chap) return;
    
    // Update liked state
    const savedLiked = localStorage.getItem(`liked:${album.id}:${chap.id}`);
    const currentlyLiked = savedLiked !== null ? savedLiked === 'true' : chap.liked === true;
    setIsLiked(currentlyLiked);

    // Only change source if it's different from current
    const newSrc = chap.audio;
    const normalizedNewSrc = normalizeUrl(newSrc);
    const normalizedCurrentSrc = normalizeUrl(currentAudioSrcRef.current);
    
    // Get current playback state - use ref to preserve across renders
    const currentTime = audio.currentTime || lastKnownTimeRef.current;
    const wasPlaying = !audio.paused && !audio.ended;
    
    // Update last known time continuously
    if (currentTime > 0) {
      lastKnownTimeRef.current = currentTime;
    }
    
    // Save current position before any changes (for previous track)
    if (normalizedCurrentSrc && normalizedCurrentSrc !== normalizedNewSrc && lastKnownTimeRef.current > 0) {
      try {
        const prevAlbum = albums.find(a => {
          return a.chapters.some(c => normalizeUrl(c.audio) === normalizedCurrentSrc);
        });
        if (prevAlbum) {
          const prevChap = prevAlbum.chapters.find(c => normalizeUrl(c.audio) === normalizedCurrentSrc);
          if (prevChap) {
            localStorage.setItem(`pos:${prevAlbum.id}:${prevChap.id}`, String(lastKnownTimeRef.current));
          }
        }
      } catch (e) {
        console.warn('Failed to save position:', e);
      }
    }
    
    // If same source, don't reload - preserve everything
    if (normalizedCurrentSrc === normalizedNewSrc && audio.src) {
      // Get saved position as fallback
      const saved = localStorage.getItem(`pos:${album.id}:${chap.id}`);
      const savedTime = saved ? Number(saved) : 0;
      
      // Restore time from ref or saved position if audio was reset or time is off
      const targetTime = lastKnownTimeRef.current > 0 ? lastKnownTimeRef.current : (savedTime > 2 ? savedTime : currentTime);
      
      if (targetTime > 0 && Math.abs(audio.currentTime - targetTime) > 1) {
        // Time is significantly off, restore it
        audio.currentTime = targetTime;
        setCurrent(targetTime);
        lastKnownTimeRef.current = targetTime;
      } else if (currentTime > 0) {
        // Update ref with current time
        lastKnownTimeRef.current = currentTime;
      }
      
      // Update playback rate if needed
      if (audio.playbackRate !== speed) {
        audio.playbackRate = speed;
      }
      
      // Update saved position continuously
      if (currentTime > 0) {
        localStorage.setItem(`pos:${album.id}:${chap.id}`, String(currentTime));
      }
      
      // Update refs
      lastKnownAlbumChapRef.current = { albumId: album.id, chapId: chap.id };
      
      // Ensure playback continues if it should be playing
      if (isPlaying && audio.paused && !audio.ended) {
        audio.play().catch(e => console.warn('Resume play failed:', e));
      }
      
      return;
    }
    
    // Store playback state before changing source
    const wasActuallyPlaying = wasPlaying && normalizedCurrentSrc === normalizedNewSrc;
    wasPlayingRef.current = wasActuallyPlaying;
    
    // If switching tracks, preserve current time for potential restore
    const previousTime = normalizedCurrentSrc && normalizedCurrentSrc !== normalizedNewSrc ? lastKnownTimeRef.current : null;
    
    currentAudioSrcRef.current = newSrc;
    lastKnownAlbumChapRef.current = { albumId: album.id, chapId: chap.id };
    
    // Only change src if it's actually different to avoid interrupting playback
    const currentAudioSrc = normalizeUrl(audio.src);
    if (currentAudioSrc !== normalizedNewSrc || !audio.src) {
      const wasPaused = audio.paused;
      
      audio.src = newSrc;
      audio.preload = 'auto'; // Change to 'auto' to load faster
      
      // Restore time if we had a previous position
      const saved = localStorage.getItem(`pos:${album.id}:${chap.id}`);
      const timeToRestore = saved && Number(saved) > 2 ? Number(saved) : (previousTime || 0);
      
      // Set time immediately if audio is already loaded, otherwise wait for metadata
      const setTime = (targetTime) => {
        if (targetTime > 0) {
          if (audio.readyState >= 2) {
            // Audio is ready, set time immediately
            audio.currentTime = targetTime;
            setCurrent(targetTime);
          } else {
            // Wait for metadata
            const setTimeOnLoad = () => {
              if (audio.readyState >= 1) {
                audio.currentTime = targetTime;
                setCurrent(targetTime);
                audio.removeEventListener('loadedmetadata', setTimeOnLoad);
                audio.removeEventListener('canplay', setTimeOnLoad);
              }
            };
            audio.addEventListener('loadedmetadata', setTimeOnLoad);
            audio.addEventListener('canplay', setTimeOnLoad);
          }
        }
      };
      
      if (timeToRestore > 0) {
        setTime(timeToRestore);
      }
      
      // If it was playing before or isPlaying is true, resume after load
      if ((!wasPaused && wasActuallyPlaying) || isPlaying) {
        const resumePlay = () => {
          audio.play().catch(e => {
            console.warn('Auto-resume prevented:', e);
            // Don't set isPlaying to false here, let the user retry
          });
          audio.removeEventListener('canplay', resumePlay);
        };
        // Try multiple events to catch when audio is ready
        audio.addEventListener('canplay', resumePlay);
        audio.addEventListener('canplaythrough', resumePlay);
        // Also try loadeddata as a fallback
        audio.addEventListener('loadeddata', resumePlay);
      }
    }
    
    audio.playbackRate = speed;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      // If isPlaying is true but audio isn't playing, start it
      if (isPlaying && audio.paused) {
        audio.play().catch(e => {
          console.warn('Auto-play on load failed:', e);
        });
      }
    };
    const onTime = () => {
      const time = audio.currentTime || 0;
      setCurrent(time);
      // Update ref continuously
      if (time > 0) {
        lastKnownTimeRef.current = time;
      }
    };
    const onEnd = () => {
      if (chapIdx < album.chapters.length - 1) {
        localStorage.setItem(`pos:${album.id}:${album.chapters[chapIdx + 1].id}`, '0');
        setChapIdx(c => c + 1);
      }
      else setIsPlaying(false);
    };
    const onPlay = () => {
      setIsPlaying(true);
      wasPlayingRef.current = true;
    };
    const onPause = () => {
      setIsPlaying(false);
      wasPlayingRef.current = false;
    };
    const onCanPlay = () => {
      // When audio can play and isPlaying is true, ensure it starts
      if (isPlaying && audio.paused) {
        audio.play().catch(e => {
          console.warn('Auto-play on canplay failed:', e);
        });
      }
    };
    
    const handleLikeSync = () => {
      const album = albums[albumIdx];
      const chap = album?.chapters[chapIdx];
      if (!album || !chap) return;
      const savedLiked = localStorage.getItem(`liked:${album.id}:${chap.id}`);
      setIsLiked(savedLiked !== null ? savedLiked === 'true' : chap.liked === true);
    };

    const handleGlobalKeydown = (e) => {
      // Space to play/pause (only if not typing in an input)
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };

    window.addEventListener('player:like-sync', handleLikeSync);
    window.addEventListener('keydown', handleGlobalKeydown);
    
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('canplay', onCanPlay);
    
    return () => {
      window.removeEventListener('player:like-sync', handleLikeSync);
      window.removeEventListener('keydown', handleGlobalKeydown);
      try { audio?.removeEventListener('loadedmetadata', onLoaded); } catch (e) {}
      try { audio?.removeEventListener('timeupdate', onTime); } catch (e) {}
      try { audio?.removeEventListener('ended', onEnd); } catch (e) {}
      try { audio?.removeEventListener('play', onPlay); } catch (e) {}
      try { audio?.removeEventListener('pause', onPause); } catch (e) {}
      try { audio?.removeEventListener('canplay', onCanPlay); } catch (e) {}
    };
  }, [albumIdx, chapIdx, albums, speed, isPlaying]);

  // persist position - save more frequently and on navigation
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const b = albums[albumIdx]; const c = b?.chapters[chapIdx];
    if (!b || !c) return;
    
    // Save immediately
    const savePosition = () => {
      try {
        const currentTime = a.currentTime;
        if (currentTime > 0 && isFinite(currentTime)) {
          localStorage.setItem(`pos:${b.id}:${c.id}`, String(currentTime));
        }
      } catch (e) {
        console.warn('Failed to save position:', e);
      }
    };
    
    // Save every 2 seconds (more frequent)
    const t = setInterval(savePosition, 2000);
    
    // Also save on timeupdate (but throttle it)
    let lastSave = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSave > 1000) { // Save at most once per second
        savePosition();
        lastSave = now;
      }
    };
    
    a.addEventListener('timeupdate', onTimeUpdate);
    
    return () => {
      clearInterval(t);
      try { a.removeEventListener('timeupdate', onTimeUpdate); } catch (e) {}
      // Save one final time on cleanup
      savePosition();
    };
  }, [albumIdx, chapIdx, albums]);

  // Media Session API Integration
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const album = albums[albumIdx];
    const chap = album?.chapters?.[chapIdx];
    if (!album || !chap) return;

    // Set metadata
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: chap.title || 'Unknown Title',
      artist: album.artist || album.author || 'Unknown Artist',
      album: album.title || 'Unknown Album',
      artwork: [
        { src: album.cover, sizes: '96x96', type: 'image/jpeg' },
        { src: album.cover, sizes: '128x128', type: 'image/jpeg' },
        { src: album.cover, sizes: '192x192', type: 'image/jpeg' },
        { src: album.cover, sizes: '256x256', type: 'image/jpeg' },
        { src: album.cover, sizes: '384x384', type: 'image/jpeg' },
        { src: album.cover, sizes: '512x512', type: 'image/jpeg' },
      ]
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Set position state for lock screen progress
    if ('setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration || 0,
          playbackRate: speed || 1,
          position: current || 0
        });
      } catch (e) {
        console.warn('Error setting position state:', e);
      }
    }

    // Action handlers
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
    navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
        setCurrent(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + skipTime);
      }
    });

    return () => {
      const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward'];
      actions.forEach(action => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch (e) {}
      });
    };
  }, [albumIdx, chapIdx, albums, isPlaying, duration, current, speed]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.playbackRate = speed;
    // smooth fade in/out when play state changes
    const fade = (from, to, duration = 300) => {
      try {
        if (!a) return Promise.resolve();
        const steps = 12;
        const stepTime = Math.max(8, Math.floor(duration / steps));
        let currentStep = 0;
        const delta = (to - from) / steps;
        a.volume = from;
        return new Promise((resolve) => {
          const t = setInterval(() => {
            currentStep += 1;
            try { a.volume = Math.min(1, Math.max(0, a.volume + delta)); } catch (e) {}
            if (currentStep >= steps) { clearInterval(t); resolve(); }
          }, stepTime);
        });
      } catch (e) { return Promise.resolve(); }
    };

    let mounted = true;
    (async () => {
      if (isPlaying) {
        try {
          // Only fade if audio was paused, otherwise keep playing smoothly
          const wasPaused = a.paused;
          if (wasPaused) {
            // start from 0 volume then fade to 1
            try { a.volume = 0; } catch (e) {}
            await a.play().catch(() => {});
            if (!mounted) return;
            await fade(0, 1, 350);
          } else {
            // Already playing, just ensure volume is at max
            try { a.volume = 1; } catch (e) {}
          }
        } catch (e) { 
          // If play fails, try to resume
          try { await a.play(); } catch (e2) {}
        }
      } else {
        try {
          const curVol = typeof a.volume === 'number' ? a.volume : 1;
          await fade(curVol, 0, 250);
          if (!mounted) return;
          a.pause();
        } catch (e) { 
          try { a.pause(); } catch (e2) {}
        }
      }
    })();
    return () => { mounted = false; };
  }, [isPlaying, speed]);

  function formatTime(s) { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60).toString().padStart(2, '0'); return `${m}:${sec}`; }
  function seekTo(v) { if (audioRef.current) audioRef.current.currentTime = Number(v); }
  // seek to a position in the current audio

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  // (removed: previously exposed a synchronous player API for gesture-based play)
  const album = albums[albumIdx] || { title: '', author: '', cover: '', chapters: [] };
  const chap = (album?.chapters && album.chapters[chapIdx]) || {};

  const toggleLike = (e) => {
    if (e) e.stopPropagation();
    const album = albums[albumIdx];
    const chap = album?.chapters[chapIdx];
    if (!album || !chap) return;

    // Use central store logic
    storeToggleLike(album.id, chap.id);

    // Add temporary scale animation for tactile feedback
    if (e.currentTarget) {
      const btn = e.currentTarget;
      btn.style.transform = 'scale(1.2)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 150);
    }
  };

  useEffect(() => {
    const handleLikeSync = () => {
      const album = albums[albumIdx];
      const chap = album?.chapters[chapIdx];
      if (!album || !chap) return;
      const savedLiked = localStorage.getItem(`liked:${album.id}:${chap.id}`);
      setIsLiked(savedLiked !== null ? savedLiked === 'true' : chap.liked === true);
    };

    // Sync with Nanostores
    const unsubPlaying = $isPlaying.subscribe((p) => {
      if (p !== isPlaying) setIsPlaying(p);
    });
    const unsubTrack = $currentTrack.subscribe((t) => {
      if (!t.bookId) return;
      const idx = albums.findIndex(b => b.id === t.bookId);
      if (idx >= 0) {
        setAlbumIdx(idx);
        if (typeof t.chapIndex === 'number') setChapIdx(t.chapIndex);
        setExpanded(true);
        setIsPlaying(true);
      }
    });

    const unsubLikes = $likedTracks.subscribe((likes) => {
      const album = albums[albumIdx];
      const chap = album?.chapters[chapIdx];
      if (album && chap) {
        const key = `${album.id}:${chap.id}`;
        setIsLiked(!!likes[key]);
      }
    });

    const unsubExpanded = $isExpanded.subscribe((e) => {
      if (e !== expanded) setExpanded(e);
    });

    return () => {
      unsubPlaying();
      unsubTrack();
      unsubLikes();
      unsubExpanded();
    };
  }, [albumIdx, chapIdx, albums, speed, isPlaying]);

  // Track Play Count
  useEffect(() => {
    if (isPlaying) {
      const album = albums[albumIdx];
      const chap = album?.chapters?.[chapIdx];
      if (chap && chap.id && chap.id !== lastCountedTrackIdRef.current) {
        lastCountedTrackIdRef.current = chap.id;
        fetch('/api/library/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: chap.id })
        }).catch(err => console.error('Failed to increment play count:', err));
      }
    }
  }, [isPlaying, albumIdx, chapIdx, albums]);

  // (Redundant Media Session blocks removed)

  function cycleSpeed() {
    const i = speedOptions.indexOf(speed);
    const next = speedOptions[(i + 1) % speedOptions.length];
    setSpeed(next);
  }

  

  // react to layout-provided start props (when the Player is mounted in Layout)
  useEffect(() => {
    if (!startAlbumId) return;
    const idx = albums.findIndex(b => b.id === startAlbumId);
    if (idx >= 0) setAlbumIdx(idx);
    if (typeof startChapIndex === 'number') setChapIdx(startChapIndex);
    setIsPlaying(true);
    setExpanded(true);
  }, [startAlbumId, startChapIndex, albums]);

  // (Legacy window:player:play listener removed in favor of Nanostores)

  useEffect(() => {
    try {
      const album = albums[albumIdx];
      const chap = album?.chapters?.[chapIdx];
      if (!album || !chap) return;
      const detail = { bookId: album.id, chapIndex: chapIdx, isPlaying };
      // expose latest state for pages that mount after the event fires
      window.__playerNowPlaying = detail;
      window.dispatchEvent(new CustomEvent('player:now-playing', { detail }));
    } catch (e) {}
  }, [albumIdx, chapIdx, isPlaying, albums]);

  // persist expanded/collapsed setting
  useEffect(() => {
    try { localStorage.setItem('player:expanded', expanded ? 'true' : 'false'); } catch (e) {}
    try {
      // Notify the rest of the page that the player expanded state changed so
      // other layout elements (for example page titles) can hide or show.
      window.dispatchEvent(new CustomEvent('player:expanded', { detail: { expanded } }));
    } catch (e) {}
  }, [expanded]);

  // Restore persistent playback state after a full page navigation / reload
  useEffect(() => {
    try {
      const raw = localStorage.getItem('player:state');
      if (!raw) return;
      const state = JSON.parse(raw);
      const bIdx = albums.findIndex(b => b.id === state.bookId);
      if (bIdx >= 0) setAlbumIdx(bIdx);
      if (typeof state.chapIndex === 'number') setChapIdx(state.chapIndex);
      // restore position if available
      setTimeout(() => {
        try {
                    if (typeof state.currentTime === 'number' && audioRef.current) audioRef.current.currentTime = state.currentTime;
                  const a = audioRef.current;
          if (state.isPlaying) {
            // smooth fade-in on resume to mask small reload gap
            const a = audioRef.current;
            try { a.volume = 0; } catch (e) {}
            setIsPlaying(true);
            // ramp to target volume over 500ms
            const ramp = 50; // ms step
            const steps = 10;
            let step = 0;
            const start = () => {
              step++;
              const v = Math.min(1, (step / steps));
              try { if (a) a.volume = v; } catch (e) {}
              if (step < steps) setTimeout(start, ramp);
            };
            setTimeout(start, 80);
          }
          // Do NOT auto-restore expanded state from storage. Expansion should only occur
          // when a direct play event is received or when the layout passes start props.
        } catch (e) {}
      }, 30);
    } catch (e) { }
  }, [albums]);

  // Save player state when the page unloads or when the component unmounts
  useEffect(() => {
    const saveState = () => {
      try {
        const b = albums[albumIdx]; const c = b?.chapters?.[chapIdx];
        if (!b || !c) return;
        const st = { bookId: b.id, chapIndex: chapIdx, currentTime: audioRef.current?.currentTime || 0, isPlaying };
        localStorage.setItem('player:state', JSON.stringify(st));
      } catch (e) {}
    };

    window.addEventListener('pagehide', saveState);
    window.addEventListener('beforeunload', saveState);
    return () => {
      saveState();
      window.removeEventListener('pagehide', saveState);
      window.removeEventListener('beforeunload', saveState);
    };
  }, [albumIdx, chapIdx, isPlaying, albums]);

  // prevent the page from scrolling while the player is open in full-screen
  useEffect(() => {
    try {
      const prev = document.documentElement.style.overflow;
      if (expanded) document.documentElement.style.overflow = 'hidden';
      else document.documentElement.style.overflow = prev || '';
      return () => { document.documentElement.style.overflow = prev || ''; };
    } catch (e) { }
  }, [expanded]);

  // share helper
  async function handleShare() {
    try {
      const title = `${album.title}${chap.title ? ' — ' + chap.title : ''}`;
      if (navigator.share) {
        await navigator.share({ title, url: location.href });
        return;
      }
      // fallback: copy URL to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(location.href);
        // small visual feedback might be useful, but keep minimal for now
        console.info('Link copied to clipboard');
        return;
      }
      // last resort: prompt so user can copy
      window.prompt('Copy this link', location.href);
    } catch (e) { console.warn('Share failed', e); }
  }

  // (Redundant drag and progress functions removed)

  // download helper
  async function downloadCurrent() {
    try {
      const b = albums[albumIdx];
      const c = b.chapters[chapIdx];
      const url = c?.audio;
      if (!url) return;
      const safe = (s) => s ? s.replace(/[^a-z0-9\.\-\_]+/gi, '_') : 'audio';
      const ext = url.split('.').pop().split('?')[0] || 'mp3';
      const filename = `${safe(b.title)}_${safe(c.title)}.${ext}`;

      const res = await fetch(url);
      if (!res.ok) { window.open(url, '_blank'); return; }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      try { const b = albums[albumIdx]; const c = b.chapters[chapIdx]; window.open(c?.audio || location.href, '_blank'); } catch (e) { }
    }
  }

  // Render normally — page-level view transitions should no longer persist this element

  // Compact collapsed / mini player shown when not expanded
    // Normal navigation: update chapter index (no cross-fade)

    // Compact collapsed / mini player shown when not expanded
  if (!expanded) {
    return (
      <div className="w-full h-full flex items-center bg-black/95 md:bg-[#181818] md:border-t md:border-white/10 md:rounded-none rounded-md px-2 md:px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)] md:shadow-none animate-fade-in transition-all duration-300 ease-in-out relative border border-white/10 mb-2 md:mb-0 mx-2 md:mx-0 max-w-[calc(100%-16px)] md:max-w-none">
        <audio ref={audioRef} preload="metadata" />
        
        {/* Left: Cover and Info */}
        <div 
           className="flex items-center gap-3 w-[70%] md:w-[30%] cursor-pointer md:cursor-default" 
           onClick={() => { if(window.innerWidth < 768) setExpanded(true); }}
        >
          <img src={album.cover} alt="cover" className="w-10 h-10 md:w-14 md:h-14 rounded-md object-cover flex-shrink-0 shadow-md" />
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-[13px] md:text-sm font-[600] text-white truncate hover:underline cursor-pointer">{chap.title || album.title}</div>
            <div className="text-[11px] md:text-[12px] text-white/70 truncate hover:underline cursor-pointer">{album.title} — {album.artist}</div>
          </div>
          <button className="hidden md:block p-2 text-white/70 hover:text-white" aria-label="Like" onClick={toggleLike}>
             {isLiked ? (
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1db954]"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path></svg>
             ) : (
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
             )}
          </button>
        </div>

        {/* Center: Playback Controls (Desktop only) */}
        <div className="flex-1 col justify-center items-center h-full max-w-[40%] hidden md:flex flex-col">
          <div className="flex items-center gap-5 mb-1">
            <button onClick={() => setShuffle(!shuffle)} className={shuffle ? "text-[#1db954]" : "text-white/70 hover:text-white"} aria-label="Shuffle">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
            <button onClick={handlePrevious} className="text-white/70 hover:text-white" aria-label="Previous">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
            </button>
            <button onClick={() => setIsPlaying(p => !p)} className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black hover:scale-105 transition" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M5.25 5.036a.75.75 0 0 1 1.125-.66l12 7a.75.75 0 0 1 0 1.287l-12 7A.75.75 0 0 1 5.25 19.964V5.036z" /></svg>
              )}
            </button>
            <button onClick={handleNext} className="text-white/70 hover:text-white" aria-label="Next">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
            </button>
            <button onClick={() => setRepeat(!repeat)} className={repeat ? "text-[#1db954]" : "text-white/70 hover:text-white"} aria-label="Repeat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
            </button>
          </div>
          {/* Progress bar inside controls (desktop) */}
          <div className="w-full flex items-center gap-2 max-w-md mt-1">
            <span className="text-[11px] text-white/70 min-w-[32px] text-right font-medium">{formatTime(current)}</span>
            <input 
              type="range"
              min="0"
              max={duration || 0}
              value={current || 0}
              onChange={(e) => seekTo(e.target.value)}
              className="player-range flex-1 h-1 bg-transparent"
              style={{ '--progress-pct': `${duration ? (current / duration) * 100 : 0}%` }}
              aria-label="Playback position"
            />
            <span className="text-[11px] text-white/70 min-w-[32px] text-left font-medium">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Extra Controls (Desktop only) */}
        <div className="hidden md:flex flex-1 justify-end items-center gap-4 w-[30%] pr-2">
          <button className="text-white/70 hover:text-white" title={`Playback speed ${speed}x`} onClick={cycleSpeed}>
             <span className="text-xs font-bold border border-white/50 rounded px-1 py-0.5 opacity-80">{speed}x</span>
          </button>
          <button onClick={downloadCurrent} className="text-white/70 hover:text-white" aria-label="Download">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>
          <div className="flex items-center gap-2 w-24">
             <button onClick={() => { const v = volume > 0 ? 0 : 1; setVolume(v); if(audioRef.current) audioRef.current.volume = v; }} className="text-white/70 hover:text-white" aria-label={volume === 0 ? "Unmute" : "Mute"}>
                {volume === 0 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                )}
             </button>
             <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (audioRef.current) audioRef.current.volume = v;
                }}
                className="player-range flex-1 h-1 bg-transparent"
                style={{ '--progress-pct': `${volume * 100}%` }}
                aria-label="Volume"
             />
          </div>
        </div>

        {/* Mobile controls (Only shown on small screens) */}
        <div className="flex md:hidden items-center gap-2 justify-end flex-1 pr-1">
            <button className="text-white/70 p-2" aria-label="Devices">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            </button>
            <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pause' : 'Play'} className="p-2 text-white">
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M5.25 5.036a.75.75 0 0 1 1.125-.66l12 7a.75.75 0 0 1 0 1.287l-12 7A.75.75 0 0 1 5.25 19.964V5.036z" /></svg>
              )}
            </button>
        </div>

        {/* Mobile progress bar along bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 md:hidden">
            <div 
              className="h-full bg-white transition-all duration-300" 
              style={{ width: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%` }}
            ></div>
        </div>
      </div>
    );
  }

  // Expanded Mobile Full Screen Player
  return (
    <div className="fixed inset-0 z-[9999] md:hidden bg-gradient-to-b from-gray-700 via-gray-900 to-black text-white p-0 animate-fade-in overflow-hidden flex flex-col">
      <audio ref={audioRef} preload="metadata" />
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2 mb-2 w-full mt-2">
        <button onClick={() => setExpanded(false)} aria-label="Minimize" className="p-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Playing from Album</span>
            <span className="text-[13px] font-bold truncate max-w-[200px]">{album.title}</span>
        </div>
        <button className="p-2" aria-label="More options">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mt-0.5"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6">
          {/* Cover Art */}
          <div className="w-full flex-1 max-h-[40vh] flex items-center justify-center mb-10 mt-6 md:mt-10 mx-auto">
             <img src={album.cover} className="w-full h-full max-h-[350px] max-w-[350px] object-cover rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.5)] bg-black" />
          </div>

          {/* Song Info */}
          <div className="flex justify-between items-end mb-6">
             <div className="flex flex-col flex-1 pr-4 min-w-0">
                <span className="text-[22px] font-bold truncate mb-1">{chap.title}</span>
                <span className="text-base text-white/70 truncate">{album.artist}</span>
             </div>
             <button onClick={toggleLike} className="p-2 text-white/70 hover:text-[#1db954]" aria-label="Like">
               {isLiked ? (
                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#1db954]"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path></svg>
               ) : (
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
               )}
             </button>
          </div>

          {/* Progress Slider */}
          <div className="w-full mb-8">
              <input 
                type="range"
                min="0"
                max={duration || 0}
                value={current || 0}
                onChange={(e) => seekTo(e.target.value)}
                className="player-range w-full h-1.5 bg-transparent mb-3"
                style={{ '--progress-pct': `${duration ? (current / duration) * 100 : 0}%` }}
                aria-label="Playback position"
              />
              <div className="flex justify-between text-[11px] text-white/70 font-semibold opacity-90">
                 <span>{formatTime(current)}</span>
                 <span>{formatTime(duration)}</span>
              </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mb-8 max-w-[320px] mx-auto w-full">
            <button onClick={() => setShuffle(!shuffle)} className={shuffle ? "text-[#1db954]" : "text-white/70"} aria-label="Shuffle">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
            <button onClick={handlePrevious} className="text-white" aria-label="Previous">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
            </button>
            <button onClick={() => setIsPlaying(p => !p)} className="flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white text-black hover:scale-105 transition shadow-lg" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1.5"><path d="M5.25 5.036a.75.75 0 0 1 1.125-.66l12 7a.75.75 0 0 1 0 1.287l-12 7A.75.75 0 0 1 5.25 19.964V5.036z" /></svg>
              )}
            </button>
            <button onClick={handleNext} className="text-white" aria-label="Next">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
            </button>
            <button onClick={() => setRepeat(!repeat)} className={repeat ? "text-[#1db954]" : "text-white/70"} aria-label="Repeat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
            </button>
          </div>

          {/* Bottom Bar: Devices and Share/Speed */}
          <div className="flex items-center justify-between pb-8 mt-auto text-white/70">
             <button className="hover:text-white" title="Devices" aria-label="Devices">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
             </button>
             <div className="flex items-center gap-5">
                 <button onClick={cycleSpeed} className="min-w-[32px] text-center text-xs font-bold border border-white/50 rounded px-1.5 py-0.5 hover:text-white hover:border-white transition">{speed}x</button>
                 <button onClick={downloadCurrent} className="hover:text-white" aria-label="Download">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                 </button>
             </div>
          </div>
      </div>
    </div>
  );
}

