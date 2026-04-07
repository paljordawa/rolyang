import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { Howl } from 'howler';
import { $isPlaying, $currentTrack, togglePlay, updateTrack } from '../store/playerStore';

export default function Player({ books: albums = [], startBookId = null, startChapIndex = 0 }) {
  const isPlaying = useStore($isPlaying);
  const currentTrack = useStore($currentTrack);
  const howlRef = useRef(null);
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

  // 1. Core Howler Instance Manager
  useEffect(() => {
    if (!chap || !chap.audio) return;

    if (howlRef.current) {
       // Prevent rebuilding Howl if track hasn't changed.
       if (lastAudioUrlRef.current === chap.audio) {
           return;
       }
       howlRef.current.unload();
    }
    
    lastAudioUrlRef.current = chap.audio;
    setIsReady(false);
    setProgress(0);
    setDuration(0);

    howlRef.current = new Howl({
      src: [chap.audio],
      html5: true, // Extremely important for audiobooks (streaming rather than loading to RAM)
      preload: 'metadata',
      volume: volume,
      onplay: () => {
         if (!$isPlaying.get()) $isPlaying.set(true);
      },
      onpause: () => {
         if ($isPlaying.get()) $isPlaying.set(false);
      },
      onend: () => handleNext(),
      onload: () => {
         setDuration(howlRef.current.duration());
         setIsReady(true);
         
         // Recover saved play position
         const trackIdKey = `${album.id}:${chap.id}`;
         const saved = localStorage.getItem(`pos:${trackIdKey}`);
         const time = saved ? Number(saved) : 0;
         if (time > 2) {
            howlRef.current.seek(time);
            setProgress(time);
         }
      }
    });

    if (isPlaying) {
       howlRef.current.play();
    }

  }, [chap?.audio, album.id, chap?.id, isPlaying]); // Depend lightly

  // 2. Cleanup Howler on total complete unmount
  useEffect(() => {
     return () => {
        if (howlRef.current) {
           howlRef.current.unload();
           howlRef.current = null;
        }
     };
  }, []);

  // 3. React to Global Play/Pause
  useEffect(() => {
    if (!howlRef.current) return;
    
    // Check if what Howler is doing mismatches our Nanostore (the source of truth)
    if (isPlaying && !howlRef.current.playing()) {
      howlRef.current.play();
    } else if (!isPlaying && howlRef.current.playing()) {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // 4. Synchronize volume
  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(volume);
  }, [volume]);

  // 5. Fire now-playing event deeply required by Layout.astro to remove display:none from layout shell
  useEffect(() => {
    if (!album || !chap) return;
    try {
      const detail = { bookId: album.id, chapIndex: chapIdx, isPlaying };
      window.__playerNowPlaying = detail;
      window.dispatchEvent(new CustomEvent('player:now-playing', { detail }));
    } catch (e) {}
  }, [album?.id, chap?.id, isPlaying]);

  // 6. Progress Scrubber Fast Update Loop
  useEffect(() => {
    let animationFrameId;
    const updateProgress = () => {
       if (howlRef.current && howlRef.current.playing()) {
          setProgress(howlRef.current.seek());
       }
       animationFrameId = requestAnimationFrame(updateProgress);
    };
    updateProgress();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // 7. Periodic Storage Save
  useEffect(() => {
    const t = setInterval(() => {
       if (howlRef.current && howlRef.current.playing() && progress > 0) {
           localStorage.setItem(`pos:${album?.id}:${chap?.id}`, String(progress));
       }
    }, 2000);
    return () => clearInterval(t);
  }, [progress, album?.id, chap?.id]);

  const handleNext = () => {
    const chaptersArray = album.chapters || album.tracks || [];
    if (!chaptersArray.length) return;
    if (chapIdx < chaptersArray.length - 1) {
      updateTrack(album.id, chapIdx + 1, isPlaying);
    } else {
      if ($isPlaying.get()) togglePlay(); // stop exactly at the end
    }
  };

  const handlePrev = () => {
    if (progress > 3 || chapIdx === 0) {
      skipTo(0);
    } else if (chapIdx > 0) {
      updateTrack(album.id, chapIdx - 1, isPlaying);
    }
  };

  const skipTo = (val) => {
    if (howlRef.current) {
      howlRef.current.seek(val);
      setProgress(val);
    }
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
    <div className="w-full bg-[#121212] border-t border-[#282828] px-4 py-3 shadow-2xl flex flex-col md:flex-row items-center gap-4 w-full h-[90px] fixed md:absolute bottom-0 left-0 right-0 z-50">
      
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-4 w-full md:w-[30%]">
        {album.cover ? (
           <img src={album.cover} alt="Cover" className="w-14 h-14 rounded object-cover shadow-md" />
        ) : (
           <div className="w-14 h-14 bg-[#282828] rounded shadow-md border border-[#333]"></div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-white font-medium text-sm truncate hover:underline cursor-pointer">{chap.title || album.title}</span>
          <span className="text-[#a7a7a7] text-xs truncate hover:underline cursor-pointer">{album.artist || album.author || 'Unknown Artist'}</span>
        </div>
      </div>

      {/* 2. Core Controls (Center) */}
      <div className="flex flex-col flex-1 w-full max-w-[45%] items-center justify-center">
         {/* Action buttons */}
         <div className="flex items-center gap-6 mb-2">
           <button onClick={handlePrev} className="text-[#a7a7a7] hover:text-white transition-colors" aria-label="Previous track">
             <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 12L20 18V6l-8.5 6zM4 6h2v12H4V6z" /></svg>
           </button>
           
           <button 
             onClick={() => togglePlay()} 
             className={`w-9 h-9 flex items-center justify-center rounded-full transition-transform ${isReady ? 'bg-white text-black hover:scale-105' : 'bg-gray-500 text-gray-300'}`}
             disabled={!isReady}
             aria-label={isPlaying ? 'Pause' : 'Play'}
           >
              {isPlaying ? (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
              ) : (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M5.25 5.036a.75.75 0 011.125-.66l12 7a.75.75 0 010 1.287l-12 7A.75.75 0 015.25 19.964V5.036z" /></svg>
              )}
           </button>
           
           <button onClick={handleNext} className="text-[#a7a7a7] hover:text-white transition-colors" aria-label="Next track">
             <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 12L4 6v12l8.5-6zM20 6h-2v12h2V6z" /></svg>
           </button>
         </div>

         {/* Scrubber bar */}
         <div className="w-full flex items-center gap-2">
           <span className="text-[11px] text-[#a7a7a7] min-w-[32px] text-right font-medium">{formatTime(progress)}</span>
           <div className="relative flex-1 group h-3 flex items-center cursor-pointer">
              <input 
                type="range" 
                min="0" 
                max={duration || 0} 
                value={progress || 0}
                onChange={(e) => skipTo(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Seek time"
              />
              <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden relative pointer-events-none">
                 <div className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-[#1db954] transition-colors" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
              </div>
           </div>
           <span className="text-[11px] text-[#a7a7a7] min-w-[32px] text-left font-medium">{formatTime(duration)}</span>
         </div>
      </div>

      {/* 3. Utility Controls (Right) */}
      <div className="hidden md:flex w-[30%] justify-end items-center pr-2 gap-3">
         <span className="text-[#a7a7a7]">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M13.426 2.574a.5.5 0 00-.852-.353l-6 6A.5.5 0 016.22 8.5H3a.5.5 0 00-.5.5v6a.5.5 0 00.5.5h3.22a.5.5 0 01.354.146l6 6a.5.5 0 00.852-.353V2.574zM19 12c0-2.3-1.2-4.3-3-5.2v10.4c1.8-.9 3-2.9 3-5.2z"></path></svg>
         </span>
         <div className="relative w-24 group h-3 flex items-center cursor-pointer">
            <input 
               type="range" 
               min="0" 
               max="1" 
               step="0.01"
               value={volume}
               onChange={(e) => setVolume(parseFloat(e.target.value))}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               aria-label="Volume slider"
            />
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full overflow-hidden relative pointer-events-none">
               <div className="absolute top-0 left-0 bottom-0 bg-white group-hover:bg-[#1db954] transition-colors" style={{ width: `${volume * 100}%` }}></div>
            </div>
         </div>
      </div>
      
    </div>
  );
}
