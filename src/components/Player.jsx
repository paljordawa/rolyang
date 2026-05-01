import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { audioService } from '../lib/audioService';
import { $isPlaying, $currentTrack, togglePlay, updateTrack } from '../store/playerStore';

export default function Player({ books: albums = [], startBookId = null, startChapIndex = 0 }) {
   const isPlaying = useStore($isPlaying);
   const currentTrack = useStore($currentTrack);
   const audioReadyRef = useRef(false);
   const lastAudioUrlRef = useRef(null);

  // Derive current audio book and chapter
  const albumIdx = useMemo(() => {
    if (!albums || !albums.length) return 0;
    const idx = albums.findIndex(b => b.id === (currentTrack?.bookId || startBookId));
    return idx >= 0 ? idx : 0;
  }, [albums, currentTrack?.bookId, startBookId]);

  const chapIdx = useMemo(() => {
    return typeof currentTrack?.chapIndex === 'number' ? currentTrack.chapIndex : (startChapIndex || 0);
  }, [currentTrack?.chapIndex, startChapIndex]);

  const album = albums[albumIdx] || { title: 'Unknown Album', chapters: [] };
  const chaptersArray = album.chapters || album.tracks || [];
  const chap = chaptersArray[chapIdx] || null;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // 1. Initialize Audio Service
  useEffect(() => {
     audioService.init({
       onPlay: () => { if (!$isPlaying.get()) $isPlaying.set(true); },
       onPause: () => { if ($isPlaying.get()) $isPlaying.set(false); },
       onEnd: () => handleNext(),
       onLoad: (d) => {
          setDuration(d);
          setIsReady(true);
          
          // Recover saved play position DISABLED
          // Track will always start at 0
       },
       onProgress: (p) => setProgress(p)
     });
  }, [album.id, chap?.id]);

  // 2. Core Audio Instance Manager
  useEffect(() => {
    if (!chap || !chap.audio) return;

    if (lastAudioUrlRef.current === chap.audio) {
        return;
    }
    
    lastAudioUrlRef.current = chap.audio;
    setIsReady(false);
    setProgress(0);
    setDuration(0);

    audioService.load({
      audio: chap.audio,
      id: chap.id,
      title: chap.title,
      artist: album.artist,
      albumTitle: album.title,
      cover: album.cover
    });

    // Increment play count - fire-and-forget, never blocks playback
    if (chap.id) {
      fetch('/api/library/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: chap.id })
      }).catch(() => {});
    }

    if (isPlaying) {
       audioService.play();
    }

  }, [chap?.audio, album.id, chap?.id]); // Only trigger when the track identity changes

  // 3. React to Global Play/Pause
  useEffect(() => {
    // Check if what AudioService is doing mismatches our Nanostore (the source of truth)
    if (isPlaying) {
      audioService.play();
    } else {
      audioService.pause();
    }
  }, [isPlaying]);

  // 4. Synchronize volume
  useEffect(() => {
    audioService.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    // Guard: only sync when user has intentionally started playback.
    // Without this, the player defaults to the first track (Stay) on mount
    // and incorrectly writes its ID into the store before any play action.
    if (!currentTrack.bookId) return;
    if (chap && chap.id && (currentTrack.trackId !== chap.id || currentTrack.title !== chap.title)) {
       console.log('Player syncing track to store:', album.id, chapIdx, chap.id);
       updateTrack(album.id, chapIdx, isPlaying, chap.id, chap.title, album.artist);
    }
  }, [chap?.id, currentTrack.trackId, currentTrack.bookId, album.id, chapIdx]);

  // Adjust chapIdx when album changes to keep the same track if possible
  useEffect(() => {
    if (!album || !album.chapters || !chap || !chap.id) return;
    const index = album.chapters.findIndex(c => c.id === chap.id);
    console.log('Album changed, looking for chap.id:', chap.id, 'in new album, found at index:', index);
    if (index >= 0 && index !== chapIdx) {
      console.log('Updating chapIdx from', chapIdx, 'to', index);
      updateTrack(album.id, index, isPlaying, chap.id, chap.title, album.artist);
    }
  }, [album.id]);

  // 6. Fire now-playing event deeply required by Layout.astro to remove display:none from layout shell
  useEffect(() => {
    if (!album || !chap) return;
    try {
      const detail = { bookId: album.id, chapIndex: chapIdx, isPlaying, trackId: chap.id };
      window.__playerNowPlaying = detail;
      window.dispatchEvent(new CustomEvent('player:now-playing', { detail }));
    } catch (e) {}
  }, [album?.id, chap?.id, isPlaying]);

  // 6. Progress Scrubber Update Loop
  useEffect(() => {
    let animationFrameId;
    const updateProgress = () => {
       if (isPlaying) {
          const currentPos = audioService.getCurrentPosition();
          setProgress(currentPos);
          
          if (duration === 0 || duration < 1) {
             const d = audioService.getDuration();
             if (d > 0) setDuration(d);
          }
       }
       animationFrameId = requestAnimationFrame(updateProgress);
    };
    updateProgress();
    return () => cancelAnimationFrame(animationFrameId);
  }, [duration, isPlaying]);

  // 7. Periodic Storage Save
  useEffect(() => {
    const t = setInterval(() => {
       if (isPlaying && progress > 0) {
           localStorage.setItem(`pos:${album?.id}:${chap?.id}`, String(progress));
       }
    }, 2000);
    return () => clearInterval(t);
  }, [progress, album?.id, chap?.id, isPlaying]);

  // 8. Lifecycle expansion tracker
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('player:expanded', { detail: { expanded: isExpanded } }));
    if (isExpanded) {
       document.body.style.overflow = 'hidden';
    } else {
       document.body.style.overflow = '';
    }
  }, [isExpanded]);

  const handleNext = () => {
    const chaptersArray = album.chapters || album.tracks || [];
    if (!chaptersArray.length) return;

    if (isRepeat && !isShuffle && chapIdx === chaptersArray.length - 1) {
      // Repeat All - Loop back to start
      const nextTrack = chaptersArray[0];
      updateTrack(album.id, 0, isPlaying, nextTrack.id, nextTrack.title, album.artist);
      return;
    }

    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * chaptersArray.length);
      const nextTrack = chaptersArray[nextIdx];
      updateTrack(album.id, nextIdx, isPlaying, nextTrack.id, nextTrack.title, album.artist);
    } else if (chapIdx < chaptersArray.length - 1) {
      const nextTrack = chaptersArray[chapIdx + 1];
      updateTrack(album.id, chapIdx + 1, isPlaying, nextTrack.id, nextTrack.title, album.artist);
    } else {
      if ($isPlaying.get()) togglePlay(); // stop
    }
  };

  const handlePrev = () => {
    if (progress > 3 || chapIdx === 0) {
      skipTo(0);
    } else if (chapIdx > 0) {
      updateTrack(album.id, chapIdx - 1, isPlaying, chaptersArray[chapIdx - 1].id);
    }
  };

  const skipTo = (val) => {
    audioService.seek(val);
    setProgress(val);
    const d = audioService.getDuration();
    if (d > 0 && d !== duration) setDuration(d);
  };

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  if (!chap || !chap.audio) {
    return null; // Don't render until we have valid data
  }

  return (
    <>
      {/* 1. Player Bar (Floating Pill Mobile / Persistent Desktop) */}
      <div 
        onClick={() => { if (window.innerWidth < 768) setIsExpanded(true); }}
        className="w-full flex items-center md:flex-row gap-2 md:gap-4 w-full h-full relative group px-2 md:px-0"
      >
        {/* 1. Track Info (Visual Core) */}
        <div className="flex items-center gap-3 w-[70%] md:w-[30%] pointer-events-none md:pl-4">
          {album.cover && (
             <div className="relative shrink-0 group">
                <img src={album.cover} alt="Cover" className="w-[42px] h-[42px] md:w-16 md:h-16 rounded-md object-cover shadow-2xl ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500" />
             </div>
          )}
          <div className="flex flex-col min-w-0 flex-1 justify-center h-full">
            <span className="text-white font-medium text-[14px] md:text-[15px] truncate leading-tight tracking-tight drop-shadow-sm">{chap.title || album.title}</span>
            <span className="text-white/60 text-[12px] md:text-[13px] truncate mt-[2px] font-normal">{album.artist || 'Unknown Artist'}</span>
          </div>
        </div>

        {/* 2. Desktop Control Center (Center) */}
        <div className="flex flex-col flex-1 w-full max-w-[40%] items-center justify-center hidden md:flex">
           <div className="flex items-center gap-6 mb-2">
             <button 
               onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }} 
               className={`transition-all duration-300 hover:scale-110 ${isShuffle ? 'text-brand-primary' : 'text-white/40 hover:text-white'}`}
               title="Shuffle"
             >
               <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
             </button>

             <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="text-white/60 hover:text-white hover:scale-110 transition-all">
               <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
             </button>
             
             <button 
               onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
               className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl ${isReady ? 'bg-white text-black hover:scale-105' : 'bg-white/20 text-white/50'}`}
               disabled={!isReady}
             >
                {isPlaying ? (
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                ) : (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
                )}
             </button>
             
             <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="text-white/60 hover:text-white hover:scale-110 transition-all">
               <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); setIsRepeat(!isRepeat); }} 
               className={`transition-all duration-300 hover:scale-110 ${isRepeat ? 'text-brand-primary' : 'text-white/40 hover:text-white'}`}
               title="Repeat"
             >
               <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
             </button>
           </div>

           <div className="w-full flex items-center gap-2">
             <span className="text-[11px] text-white/40 w-10 text-right opacity-80 font-bold tabular-nums">{formatTime(progress)}</span>
             <div className="relative flex-1 group h-3 flex items-center cursor-pointer">
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 0} 
                  value={progress || 0}
                  onChange={(e) => skipTo(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-[4px] bg-white/10 rounded-full overflow-hidden relative pointer-events-none group-hover:bg-white/20 transition-all">
                   <div className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-brand-primary transition-colors" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
                </div>
                {/* Visual Thumb for hover */}
                <div 
                   className="absolute w-[12px] h-[12px] bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md pointer-events-none transition-opacity"
                   style={{ left: `calc(${duration ? (progress / duration) * 100 : 0}% - 6px)` }}
                ></div>
             </div>
             <span className="text-[11px] text-white/40 w-10 text-left opacity-80 font-bold tabular-nums">{formatTime(duration)}</span>
           </div>
        </div>

        {/* 3. Utility Controls (Right) */}
        <div className="flex w-auto md:w-[30%] justify-end items-center md:pr-4 gap-4 ml-auto h-full">
           {/* Mobile-Only Toggle Like */}
           <button 
             onClick={(e) => {
                e.stopPropagation();
                // @ts-ignore
                if (window.__nanostores_player) window.__nanostores_player.toggleLike(album.id, chap.id);
             }}
             className="md:hidden text-white/60 hover:text-brand-primary transition-colors pr-2"
           >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
           </button>

           <div className="hidden md:flex items-center gap-2">
              <span className="text-white/40 group-hover:text-white transition-colors">
                 <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M13.426 2.574a.5.5 0 00-.852-.353l-6 6A.5.5 0 016.22 8.5H3a.5.5 0 00-.5.5v6a.5.5 0 00.5.5h3.22a.5.5 0 01.354.146l6 6a.5.5 0 00.852-.353V2.574zM19 12c0-2.3-1.2-4.3-3-5.2v10.4c1.8-.9 3-2.9 3-5.2z"></path></svg>
              </span>
              <div className="relative w-[90px] group h-3 flex items-center cursor-pointer">
                 <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 />
                 <div className="w-full h-[4px] bg-white/10 rounded-full overflow-hidden relative pointer-events-none group-hover:bg-white/20 transition-all">
                    <div className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-brand-primary transition-colors" style={{ width: `${volume * 100}%` }}></div>
                 </div>
              </div>
           </div>
           
           {/* Mobile-Only Mini Play */}
           <button 
             onClick={(e) => { e.stopPropagation(); togglePlay(); }}
             className="md:hidden w-[38px] h-[38px] flex items-center justify-center text-white bg-transparent active:scale-90 transition-all"
           >
             {isPlaying ? (
               <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
             ) : (
               <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
             )}
           </button>
        </div>

        {/* 1. Mini Progress Bar (Bottom Edge - Mobile only) */}
        <div className="md:hidden absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 z-20 pointer-events-none overflow-hidden">
           <div 
             className="h-full bg-white transition-all duration-500 ease-linear" 
             style={{ width: `${(duration > 0 ? (progress / duration) * 100 : 0)}%` }}
           />
        </div>
      </div>

      {/* 2. Full-Screen Glass Mobile Player */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#121212] transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      >
        {/* Dynamic Blurred Background Gradient */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={album.cover} 
            className="w-full h-full object-cover blur-[100px] opacity-40 scale-150 transform transition-transform duration-1000" 
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/40 to-black/95"></div>
        </div>

        <div className="h-full flex flex-col px-6 pt-10 pb-8 relative z-10 w-full max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <button onClick={() => setIsExpanded(false)} className="text-white hover:scale-110 active:scale-90 transition-all p-2 -ml-2">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="text-center">
               <span className="text-white text-xs font-medium uppercase tracking-widest block mb-0.5 opacity-90 drop-shadow-sm">{album.title}</span>
            </div>
            <button className="text-white p-2 hover:scale-110 transition-all -mr-2">
               <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>

          {/* Epic Large Artwork */}
          <div className="flex-1 flex flex-col justify-center items-center py-2 shrink-0">
            <div className="w-full aspect-square max-w-[340px] rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-white/5 mx-auto">
                <img src={album.cover} className="w-full h-full object-cover" alt="Current Cover" />
            </div>
          </div>

          {/* Bottom Section (Typography + Controls) */}
          <div className="mt-6 shrink-0 pb-4">
            {/* Rich Content Info */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <h3 className="text-[26px] md:text-[28px] font-medium text-white truncate text-left tracking-tight drop-shadow-md mb-1">{chap.title}</h3>
                <p className="text-white/60 font-normal text-[16px] truncate text-left">{album.artist || 'Unknown Artist'}</p>
              </div>
              <button 
                onClick={(e) => {
                   e.stopPropagation();
                   // @ts-ignore
                   if (window.__nanostores_player) window.__nanostores_player.toggleLike(album.id, chap.id);
                }}
                className="text-white hover:text-brand-primary active:scale-95 transition-all p-2 bg-white/5 rounded-full backdrop-blur-md"
              >
                 <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>

            {/* High-Contrast Seek Area */}
            <div className="flex flex-col gap-1 mb-4">
              <div className="relative w-full h-[4px] bg-white/20 rounded-full group">
                <input 
                  type="range"
                  className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer h-full border-0"
                  min="0"
                  max={duration || 0}
                  value={progress || 0}
                  onChange={(e) => skipTo(Number(e.target.value))}
                />
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-white rounded-full transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                ></div>
                {/* Thumb handle */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-white rounded-full shadow-lg z-10 opacity-100 peer-active:scale-125 transition-transform"
                  style={{ left: `calc(${duration ? (progress / duration) * 100 : 0}% - 5px)` }}
                ></div>
              </div>
              <div className="flex justify-between items-center opacity-70 mt-1">
                <span className="text-white text-[11px] font-bold tracking-widest tabular-nums">{formatTime(progress)}</span>
                <span className="text-white text-[11px] font-bold tracking-widest tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Master Playback Controls */}
            <div className="flex items-center justify-between mt-2 mb-2">
              <button 
                onClick={() => setIsShuffle(!isShuffle)} 
                className={`p-2 transition-all active:scale-90 ${isShuffle ? 'text-brand-primary' : 'text-white/60 hover:text-white'}`}
              >
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              </button>
              
              <div className="flex items-center gap-6">
                <button onClick={handlePrev} className="text-white active:scale-90 transition-transform p-1">
                  <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
                </button>
                <button 
                  onClick={() => togglePlay()} 
                  disabled={!isReady}
                  className="w-[68px] h-[68px] shrink-0 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                  {isPlaying ? (
                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                  ) : (
                    <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24" className="ml-1.5"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
                  )}
                </button>
                <button onClick={handleNext} className="text-white active:scale-90 transition-transform p-1">
                  <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
                </button>
              </div>

              <button 
                onClick={() => setIsRepeat(!isRepeat)} 
                className={`p-2 transition-all active:scale-90 ${isRepeat ? 'text-brand-primary' : 'text-white/60 hover:text-white'}`}
              >
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
