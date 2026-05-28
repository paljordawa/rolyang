import { useState, useRef, useEffect, useCallback } from 'react';
import { Song } from '../types';

export interface QueueItem extends Song {
  queueId: string;
}

export function useAudio(tracks: Song[]) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!currentSong) return;

    // Create new audio element if song changes
    const audio = new Audio(currentSong.audioUrl);
    audioRef.current = audio;
    audio.volume = volume;

    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);

      if ('mediaSession' in navigator && audio.duration) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    };

    const onEnded = () => {
      nextSong();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', onEnded);

    // Initial play if active
    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore interruption errors
        });
      }
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', onEnded);
      audio.src = ''; // Clear source to stop downloading
    };
  }, [currentSong]);

  useEffect(() => {
    if (tracks.length > 0 && !currentSong) {
      setCurrentSong(tracks[0]);
    }
  }, [tracks, currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore interruption errors
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, { ...song, queueId: `${song.id}-${Date.now()}-${Math.random()}` }]);
  };

  const nextSong = useCallback(() => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      setCurrentSong(next);
    } else if (currentSong && tracks.length > 0) {
      const currentIndex = tracks.findIndex(s => s.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % tracks.length;
      setCurrentSong(tracks[nextIndex]);
    }
    setIsPlaying(true);
  }, [currentSong, queue]);

  const prevSong = useCallback(() => {
    if (currentSong && tracks.length > 0) {
      const currentIndex = tracks.findIndex(s => s.id === currentSong.id);
      const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
      setCurrentSong(tracks[prevIndex]);
      setIsPlaying(true);
    }
  }, [currentSong, tracks]);

  const setManualQueue = useCallback((songs: Song[]) => {
    setQueue(songs.map(s => ({ ...s, queueId: `${s.id}-${Math.random()}` })));
  }, []);

  useEffect(() => {
    if (audioRef.current && 'mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: currentSong.coverUrl ? [
          { src: currentSong.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', prevSong);
      navigator.mediaSession.setActionHandler('nexttrack', nextSong);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentSong, nextSong, prevSong]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  return {
    currentSong,
    queue,
    addToQueue,
    isPlaying,
    progress,
    duration,
    volume,
    setVolume,
    togglePlay,
    seek,
    nextSong,
    prevSong,
    setCurrentSong,
    setQueue,
    setIsPlaying,
    setManualQueue
  };
}
