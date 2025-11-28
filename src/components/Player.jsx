import React, { useEffect, useRef, useState } from 'react';
export default function Player({ books: albums = [], startBookId: startAlbumId = null, startChapIndex = 0 }) {
  const audioRef = useRef(null);
  const [albumIdx, setAlbumIdx] = useState(() => {
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

  // Track current audio source to avoid unnecessary reloads
  const currentAudioSrcRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const audioElementRef = useRef(null);
  const lastKnownTimeRef = useRef(0);
  const lastKnownAlbumChapRef = useRef({ albumId: null, chapId: null });

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
      if (chapIdx < album.chapters.length - 1) setChapIdx(c => c + 1);
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
    
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('canplay', onCanPlay);
    
    return () => {
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

  // media session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const b = albums[albumIdx]; const c = b?.chapters[chapIdx]; if (!b || !c) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({ title: c.title, artist: b.author, album: b.title, artwork: [{ src: b.cover, sizes: '512x512', type: 'image/png' }] });
    navigator.mediaSession.setActionHandler('play', async () => { await audioRef.current?.play(); setIsPlaying(true); });
    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setIsPlaying(false); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { if (chapIdx > 0) setChapIdx(ci => ci - 1); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { if (chapIdx < b.chapters.length - 1) setChapIdx(ci => ci + 1); });
    navigator.mediaSession.setActionHandler('seekto', (details) => { if (!audioRef.current) return; if (details.fastSeek && 'fastSeek' in audioRef.current) audioRef.current.fastSeek(details.seekTime); else audioRef.current.currentTime = details.seekTime; });
    return () => { try { navigator.mediaSession.setActionHandler('play', null); navigator.mediaSession.setActionHandler('pause', null); } catch (e) { } };
  }, [albumIdx, chapIdx, albums]);

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

  // react to data-player-* buttons wired through app-client.js
  useEffect(() => {
    function onPlayerPlay(ev) {
      try {
        const detail = (ev && ev.detail) || {};
        console.log('Player received play event:', detail);
        if (!detail.bookId) {
          console.warn('Player play event missing bookId');
          return;
        }
        const idx = albums.findIndex((b) => b.id === detail.bookId);
        if (idx < 0) {
          console.warn('Album not found:', detail.bookId);
          return;
        }
        console.log('Setting album index:', idx);
        setAlbumIdx(idx);
        if (typeof detail.chapIndex === 'number') {
          const chapters = albums[idx]?.chapters || [];
          const rawIndex = Number(detail.chapIndex);
          if (Number.isFinite(rawIndex)) {
            const maxIdx = Math.max(0, (chapters.length || 1) - 1);
            const clamped = Math.min(Math.max(0, Math.trunc(rawIndex)), maxIdx);
            console.log('Setting chapter index:', clamped);
            setChapIdx(clamped);
          }
        }
        setExpanded(detail.expand !== false);
        
        // Set playing state and ensure audio starts
        const shouldPlay = detail.play !== false;
        setIsPlaying(shouldPlay);
        
        // If we should play, ensure audio starts after source is set
        if (shouldPlay) {
          // Use a small delay to ensure state updates have propagated
          setTimeout(() => {
            const audio = audioRef.current;
            if (audio && audio.src) {
              // If audio is ready, play immediately
              if (audio.readyState >= 2) {
                audio.play().catch(e => {
                  console.warn('Immediate play failed, will retry:', e);
                  // Retry when audio is ready
                  const retryPlay = () => {
                    audio.play().catch(e2 => console.warn('Retry play failed:', e2));
                    audio.removeEventListener('canplay', retryPlay);
                  };
                  audio.addEventListener('canplay', retryPlay);
                });
              } else {
                // Wait for audio to be ready
                const startPlay = () => {
                  audio.play().catch(e => console.warn('Play failed:', e));
                  audio.removeEventListener('canplay', startPlay);
                };
                audio.addEventListener('canplay', startPlay);
              }
            }
          }, 50);
        }
        
        console.log('Player state updated - playing:', shouldPlay);
      } catch (e) {
        console.error('Player play handler error:', e);
      }
    }
    console.log('Player: Setting up player:play listener');
    window.addEventListener('player:play', onPlayerPlay);
    return () => {
      console.log('Player: Removing player:play listener');
      window.removeEventListener('player:play', onPlayerPlay);
    };
  }, [albums]);

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

  // progress bar interaction for the fullscreen overlay
  function onProgressClick(e) {
    try {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const x = (e.clientX || 0) - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const newTime = (duration || 0) * pct;
      if (audioRef.current) audioRef.current.currentTime = newTime;
      setCurrent(newTime);
    } catch (err) { }
  }

  function onProgressKeyDown(e) {
    try {
      if (!audioRef.current) return;
      const key = e.key;
      let delta = 0;
      if (key === 'ArrowLeft') delta = -5;
      else if (key === 'ArrowRight') delta = 5;
      else if (key === 'Home') { audioRef.current.currentTime = 0; setCurrent(0); return; }
      else if (key === 'End') { audioRef.current.currentTime = duration || 0; setCurrent(duration || 0); return; }
      if (delta !== 0) {
        const next = Math.max(0, Math.min(duration || 0, (audioRef.current.currentTime || 0) + delta));
        audioRef.current.currentTime = next; setCurrent(next);
        e.preventDefault();
      }
    } catch (e) {}
  }

  // pointer drag helpers (shared by both bars)
  function startPointerDrag(e) {
    try {
      // capture the bar element that was pressed
      const bar = e.currentTarget;
      draggingBarRef.current = bar;
      setIsSeeking(true);
      // update immediately
      onDragEvent(e);
      // attach listeners on document so dragging continues outside the bar
      window.addEventListener('pointermove', onDragEvent);
      window.addEventListener('pointerup', endPointerDrag);
      window.addEventListener('pointercancel', endPointerDrag);
      // prevent native drag behavior
      e.preventDefault && e.preventDefault();
    } catch (err) {}
  }

  function onDragEvent(e) {
    try {
      const bar = draggingBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const newTime = (duration || 0) * pct;
      if (audioRef.current) audioRef.current.currentTime = newTime;
      setCurrent(newTime);
    } catch (err) {}
  }

  function endPointerDrag() {
    try {
      draggingBarRef.current = null;
      setIsSeeking(false);
      window.removeEventListener('pointermove', onDragEvent);
      window.removeEventListener('pointerup', endPointerDrag);
      window.removeEventListener('pointercancel', endPointerDrag);
    } catch (e) {}
  }

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
      <div className="w-full bg-white/5 dark:bg-black/40 backdrop-blur-md rounded-full px-4 py-2 shadow-sm animate-fade-in transition-all duration-300 ease-in-out relative">
        <audio ref={audioRef} preload="metadata" />
        <div className="flex items-center gap-4">
          <img src={album.cover} alt="cover" className="w-10 h-10 rounded-md object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{chap.title || album.title}</div>
            <div className="text-xs text-white/60 truncate">{album.title} — {album.author}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pause' : 'Play'} className="p-2 rounded-full bg-purple-600 text-white">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M5 4v16l15-8L5 4z" />
                </svg>
              )}
            </button>
            <button onClick={() => setExpanded(true)} aria-label="Expand player" title="Open player" className="p-2 rounded-full border border-white/6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 9.75V6.75A2.25 2.25 0 0 1 6.75 4.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 0-.75.75v3a.75.75 0 0 1-1.5 0zM19.5 14.25v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h3a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 1 1.5 0z" />
              </svg>
            </button>
          </div>
        </div>
        {/* island progress bar placed above the island (not overlapping metadata) */}
        <div className="left-0 right-0 flex justify-center pointer-events-none z-30  ">
          <div className="w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] pointer-events-auto ">
            <div
              role="slider"
              aria-label="Playback position"
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration || 0)}
              aria-valuenow={Math.floor(current || 0)}
              tabIndex={0}
              onKeyDown={onProgressKeyDown}
              onClick={onProgressClick}
              onPointerDown={startPointerDrag}
              className="relative w-full cursor-pointer"
            
            >
              <div className="h-[2px] w-full bg-white/10 rounded-3xl overflow-hidden relative mt-1">
                {/* single gradient fill element with rounded corners; inner track clips the gradient so ends are pill-shaped */}
                <div className="absolute left-0 top-0 h-2 bg-gradient-to-r from-purple-600 via-purple-400 to-pink-500 rounded-full" style={{ width: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%` }} />
              </div>
              {/* small thumb and bap for the island - placed outside the clipped track so it renders as a full circle */}
              <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-3 h-3 rounded-full bg-purple-600 shadow-[0_6px_12px_rgba(139,92,246,0.24)]" />
              </div>
              <div className="absolute left-[calc(var(--pos,0)%)] -top-3 translate-x-[-50%]" style={{ left: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%` }} aria-hidden>
                <div className="w-8 h-2 rounded-full bg-white/6 blur-sm opacity-80" />
              </div>
              <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.14), transparent)' }} />
              <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.14), transparent)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    // fullscreen overlay — cover the entire viewport with no margin
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-black/80 via-black/60 to-black/75 backdrop-blur-sm text-white p-0 animate-fade-in overflow-auto">
      <audio ref={audioRef} preload="metadata" />
      <div className="flex flex-col items-center relative max-w-3xl mx-auto w-full px-6 py-8">
        <div className="absolute left-0 right-0 top-0 z-10 flex justify-between px-6 pt-6">
          <button onClick={() => setExpanded(false)} aria-label="Minimize" title="Minimize" >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>

          </button>
          <button onClick={() => handleShare()} aria-label="Share" title="Share" >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>

          </button>
        </div>

        {/* simplified: only top-left minimize and top-right share (no duplicate collapse button) */}
        <img src={album.cover} className="w-full h-[48vh] rounded-3xl mb-4 object-cover transform p-10 pt-14  transition-transform duration-500" style={{ transform: isPlaying ? 'scale(1.02)' : 'scale(1)' }} />
        <div className="text-center mb-2">
          <div className="font-semibold text-lg">{chap.title}</div>
          <div className="text-sm text-white/70">{album.title} — {album.author}</div>
        </div>

        {/* fullscreen progress bar (top) — match island gradient, large thumb */}
        <div className="w-full mt-3">
          <div
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration || 0)}
            aria-valuenow={Math.floor(current || 0)}
            tabIndex={0}
            onKeyDown={onProgressKeyDown}
            onClick={onProgressClick}
            onPointerDown={startPointerDrag}
            className="relative w-full cursor-pointer"
          >
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden relative">
              {/* one rounded fill only; inner track clips the gradient so we get a smooth pill-shaped end */}
              <div className="absolute left-0 top-0 h-3 bg-gradient-to-r from-purple-600 via-purple-400 to-pink-500 rounded-full" style={{ width: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%` }} />
            </div>
            {/* thumb sits outside the clipped track so it renders fully as a circular overlay */}
            <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `${duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="w-5 h-5 rounded-full bg-purple-600 ring-4 ring-purple-700/30 shadow-[0_8px_28px_rgba(139,92,246,0.42)]" />
            </div>
          </div>
          <div className="w-full flex justify-between text-xs mt-2 text-white/70"><span>{formatTime(current)}</span><span>{formatTime(duration)}</span></div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <button onClick={() => { if (chapIdx > 0) setChapIdx(ci => ci - 1); }} className="big-btn" aria-label="Previous">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" />
            </svg>
          </button>

          <button onClick={() => setIsPlaying(p => !p)} className="p-5 bg-purple-600 text-white rounded-full" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M5 4v16l15-8L5 4z" />
              </svg>
            )}
          </button>

          <button onClick={() => { if (chapIdx < album.chapters.length - 1) setChapIdx(ci => ci + 1); }} className="big-btn" aria-label="Next">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" />
            </svg>
          </button>
        </div>

        <div className="flex   gap-3 mt-4 w-full justify-between ">
          <button onClick={cycleSpeed} className={`big-btn text-sm`} aria-label={`Playback speed ${speed}x`} title={`Playback speed ${speed}x — click to change`}>
            {speed}x
          </button>

          <button onClick={downloadCurrent} className="big-btn" aria-label="Download audio" title="Download audio">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4-4-4M21 21H3" />
            </svg>
          </button>
        </div>

      </div>
      {/* bottom progress bar removed (not needed) */}
    </div>
  );
}

