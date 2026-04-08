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
          
          // Recover saved play position
          const trackIdKey = `${album.id}:${chap.id}`;
          const saved = localStorage.getItem(`pos:${trackIdKey}`);
          const time = saved ? Number(saved) : 0;
          if (time > 2) {
             audioService.seek(time);
             setProgress(time);
          }
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
    if (chap && chap.id && (currentTrack.trackId !== chap.id || currentTrack.title !== chap.title)) {
       // This ensures the global store has the actual track title/identity 
       // even if started from a bookId/index pair.
       console.log('Player updating track:', album.id, chapIdx, isPlaying, chap.id, chap.title, album.artist);
       updateTrack(album.id, chapIdx, isPlaying, chap.id, chap.title, album.artist);
    }
  }, [chap?.id, currentTrack.trackId, album.id, chapIdx, isPlaying]);

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
      {/* 1. Glassmorphic Player Bar (Floating/Persistent) */}
      <div 
        onClick={() => { if (window.innerWidth < 768) setIsExpanded(true); }}
        className="w-full bg-black/40 backdrop-blur-2xl border border-white/10 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center md:flex-row gap-4 w-full h-full relative group rounded-2xl sm:rounded-none"
      >
        {/* 1. Mini Progress Bar (Top Edge - Mobile only) */}
        <div className="md:hidden absolute top-0 left-4 right-4 h-[3px] bg-white/5 z-20 pointer-events-none rounded-full overflow-hidden">
           <div 
             className="h-full bg-gradient-to-r from-[#1db954] to-[#1ed760] shadow-[0_0_12px_rgba(29,185,84,0.6)] transition-all duration-500 ease-linear" 
             style={{ width: `${(duration > 0 ? (progress / duration) * 100 : 0)}%` }}
           />
        </div>
        
        {/* 1. Track Info (Visual Core) */}
        <div className="flex items-center gap-4 w-full md:w-[30%] pointer-events-none">
          {album.cover && (
             <div className="relative shrink-0 group/cover">
                <img src={album.cover} alt="Cover" className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shadow-2xl ring-1 ring-white/20 group-hover/cover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"></div>
             </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-black text-[14px] md:text-sm truncate leading-tight tracking-tight drop-shadow-sm">{chap.title || album.title}</span>
            <span className="text-white/50 text-[11px] md:text-[12px] truncate mt-0.5 font-bold uppercase tracking-[0.05em]">{album.artist || 'Unknown Artist'}</span>
          </div>
        </div>

        {/* 2. Desktop Control Center (Center) */}
        <div className="flex flex-col flex-1 w-full max-w-[45%] items-center justify-center hidden md:flex">
           <div className="flex items-center gap-8 mb-2">
             <button 
               onClick={(e) => { e.stopPropagation(); setIsShuffle(!isShuffle); }} 
               className={`transition-all duration-300 hover:scale-110 ${isShuffle ? 'text-[#1db954] drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]' : 'text-white/40 hover:text-white'}`}
               title="Shuffle"
             >
               <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
             </button>

             <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="text-white/60 hover:text-white hover:scale-110 transition-all">
               <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
             </button>
             
             <button 
               onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
               className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl ${isReady ? 'bg-white text-black hover:scale-110' : 'bg-gray-800 text-gray-500'}`}
               disabled={!isReady}
             >
                {isPlaying ? (
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                ) : (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
                )}
             </button>
             
             <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="text-white/60 hover:text-white hover:scale-110 transition-all">
               <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
             </button>

             <button 
               onClick={(e) => { e.stopPropagation(); setIsRepeat(!isRepeat); }} 
               className={`transition-all duration-300 hover:scale-110 ${isRepeat ? 'text-[#1db954] drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]' : 'text-white/40 hover:text-white'}`}
               title="Repeat"
             >
               <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
             </button>
           </div>

           <div className="w-full flex items-center gap-3">
             <span className="text-[10px] text-white/40 min-w-[32px] text-right font-black tracking-tighter">{formatTime(progress)}</span>
             <div className="relative flex-1 group h-4 flex items-center cursor-pointer">
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 0} 
                  value={progress || 0}
                  onChange={(e) => skipTo(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden relative pointer-events-none group-hover:h-1.5 transition-all">
                   <div className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-[#1db954] transition-colors shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
                </div>
                {/* Visual Thumb for hover */}
                <div 
                   className="absolute w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-lg pointer-events-none transition-opacity"
                   style={{ left: `calc(${duration ? (progress / duration) * 100 : 0}% - 6px)` }}
                ></div>
             </div>
             <span className="text-[10px] text-white/40 min-w-[32px] text-left font-black tracking-tighter">{formatTime(duration)}</span>
           </div>
        </div>

        {/* 3. Utility Controls (Right) */}
        <div className="flex w-auto md:w-[30%] justify-end items-center pr-2 gap-4 ml-auto">
           <div className="hidden md:flex items-center gap-3">
              <span className="text-white/40">
                 <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M13.426 2.574a.5.5 0 00-.852-.353l-6 6A.5.5 0 016.22 8.5H3a.5.5 0 00-.5.5v6a.5.5 0 00.5.5h3.22a.5.5 0 01.354.146l6 6a.5.5 0 00.852-.353V2.574zM19 12c0-2.3-1.2-4.3-3-5.2v10.4c1.8-.9 3-2.9 3-5.2z"></path></svg>
              </span>
              <div className="relative w-20 group h-4 flex items-center cursor-pointer">
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
                 <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative pointer-events-none">
                    <div className="absolute top-0 left-0 bottom-0 bg-white/80 group-hover:bg-[#1db954] transition-colors" style={{ width: `${volume * 100}%` }}></div>
                 </div>
              </div>
           </div>
           
           {/* Mobile-Only Mini Play */}
           <button 
             onClick={(e) => { e.stopPropagation(); togglePlay(); }}
             className="md:hidden w-11 h-11 flex items-center justify-center text-white bg-white/10 rounded-full backdrop-blur-md active:scale-90 transition-all border border-white/10"
           >
             {isPlaying ? (
               <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
             ) : (
               <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
             )}
           </button>
        </div>
      </div>

      {/* 2. Full-Screen Glass Mobile Player */}
      <div 
        className={`fixed inset-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      >
        {/* Dynamic Blurred Background */}
        <div className="absolute inset-x-0 bottom-0 top-0 -z-20 overflow-hidden bg-black">
          <img 
            src={album.cover} 
            className="w-full h-full object-cover blur-[100px] opacity-60 scale-150" 
            alt="Blur BG" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20"></div>
        </div>

        <div className="h-full flex flex-col px-8 py-10 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setIsExpanded(false)} className="text-white/40 hover:text-white p-3 bg-white/5 rounded-full backdrop-blur-md transition-all border border-white/10 active:scale-90">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="text-center">
               <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">Playing from album</span>
               <h2 className="text-white font-bold text-sm tracking-tight truncate max-w-[180px]">{album.title}</h2>
            </div>
            <button className="text-white/40 p-2">
               <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.95 20 14.53 20 13c0-4.42-3.58-8-8-8zm0 12c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 6.74C4.46 8.05 4 9.47 4 11c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            </button>
          </div>

          {/* Epic Large Artwork */}
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            <div className="w-full aspect-square max-w-[320px] rounded-[48px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative group">
                <img src={album.cover} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt="Current Cover" />
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.2)]"></div>
            </div>
            
            {/* Pagination Visual */}
            <div className="flex gap-2.5 mt-10">
              <div className="w-2 h-2 rounded-full bg-[#1db954] shadow-[0_0_10px_rgba(29,185,84,0.6)]"></div>
              <div className="w-2 h-2 rounded-full bg-white/10"></div>
              <div className="w-2 h-2 rounded-full bg-white/10"></div>
            </div>
          </div>

          {/* Rich Content Info */}
          <div className="mt-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <h3 className="text-3xl font-black text-white truncate leading-tight tracking-[0.01em] drop-shadow-lg">{chap.title}</h3>
                <p className="text-white/50 font-bold text-lg truncate mt-1 tracking-tight">{album.artist || 'Unknown Artist'}</p>
              </div>
              <button 
                onClick={(e) => {
                   e.stopPropagation();
                   // @ts-ignore
                   if (window.__nanostores_player) window.__nanostores_player.toggleLike(album.id, chap.id);
                }}
                className="text-white/30 hover:text-[#1db954] transition-colors p-2"
              >
                 <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </button>
            </div>
          </div>

          {/* High-Contrast Seek Area */}
          <div className="mt-10 px-1 flex flex-col gap-4">
            <div className="relative w-full h-2 bg-white/10 rounded-full">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#1db954] to-[#1ed760] rounded-full shadow-[0_0_15px_rgba(29,185,84,0.5)]" 
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              ></div>
              <input 
                type="range"
                className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer h-full"
                min="0"
                max={duration || 0}
                value={progress || 0}
                onChange={(e) => skipTo(Number(e.target.value))}
              />
              {/* Refined Thumb handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-2xl z-10 border-4 border-[#1db954]"
                style={{ left: `calc(${duration ? (progress / duration) * 100 : 0}% - 10px)` }}
              ></div>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-[11px] font-black tracking-widest">{formatTime(progress)}</span>
              <span className="text-white/40 text-[11px] font-black tracking-widest">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Master Playback Controls */}
          <div className="mt-10 mb-10 flex items-center justify-between px-2">
            <button 
              onClick={() => setIsShuffle(!isShuffle)} 
              className={`p-3 transition-all ${isShuffle ? 'text-[#1db954] scale-110 drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'text-white/30'}`}
            >
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
            </button>
            <button onClick={handlePrev} className="text-white hover:scale-125 active:scale-90 transition-all p-4">
              <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button 
              onClick={() => togglePlay()} 
              disabled={!isReady}
              className="w-24 h-24 shrink-0 bg-white rounded-full flex items-center justify-center text-black shadow-[0_20px_60px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <svg width="36" height="36" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="5" height="14" rx="2" /><rect x="13" y="5" width="5" height="14" rx="2" /></svg>
              ) : (
                <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24" className="ml-2"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button onClick={handleNext} className="text-white hover:scale-125 active:scale-90 transition-all p-4">
              <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
            </button>
            <button 
              onClick={() => setIsRepeat(!isRepeat)} 
              className={`p-3 transition-all ${isRepeat ? 'text-[#1db954] scale-110 drop-shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'text-white/30'}`}
            >
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            </button>
          </div>

          {/* Secondary Utilities */}
          <div className="mt-auto flex items-center justify-between px-4 pb-2">
             <button className="text-white/40 hover:text-white transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
             </button>
             <button className="text-white/40 hover:text-white transition-colors flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-white/10">Connected Devices</span>
             </button>
             <button className="text-white/40 hover:text-white transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" /></svg>
             </button>
          </div>
        </div>
      </div>
    </>
  );
}
