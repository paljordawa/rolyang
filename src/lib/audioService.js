import { Capacitor } from '@capacitor/core';
import { Howl } from 'howler';

const isBrowser = typeof window !== 'undefined';
const isNative = isBrowser && Capacitor.isNativePlatform();

class AudioService {
  constructor() {
    this.howl = null;
    this.musicControls = null;
    this.currentTrack = null;
    this.callbacks = {
      onPlay: () => {},
      onPause: () => {},
      onEnd: () => {},
      onLoad: (duration) => {},
      onProgress: (pos) => {}
    };
  }

  async init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    
    if (isNative && isBrowser) {
      try {
        // Community Music Controls Plugin Integration
        const { MusicControls } = await import('capacitor-music-controls-plugin');
        this.musicControls = MusicControls;
        
        this.musicControls.addListener('controlsNotification', (info) => {
          const message = info.message;
          switch (message) {
            case 'music-controls-play': this.play(); break;
            case 'music-controls-pause': this.pause(); break;
            case 'music-controls-next': this.callbacks.onEnd(); break;
            case 'music-controls-previous': /* Handled by UI/Store logic */ break;
            case 'music-controls-destroy': this.pause(); break;
          }
        });
      } catch (e) {
        console.warn("Native MusicControls plugin not available.", e);
      }
    }
  }

  async load(track) {
    this.currentTrack = track;
    
    // Always use Howler for the actual audio playback core on both Web and WebView 
    // unless a dedicated native player plugin is required/installed.
    if (this.howl) this.howl.unload();
    this.howl = new Howl({
      src: [track.audio],
      html5: true,
      volume: 1,
      onplay: () => this.callbacks.onPlay(),
      onpause: () => this.callbacks.onPause(),
      onend: () => this.callbacks.onEnd(),
      onload: () => this.callbacks.onLoad(this.howl.duration()),
      onseek: () => this.callbacks.onProgress(this.howl.seek())
    });

    this.updateMediaSession(track);
  }

  async play() {
    this.howl?.play();
    if (this.musicControls && isNative) {
        this.musicControls.updateIsPlaying({ isPlaying: true });
    }
  }

  async pause() {
    this.howl?.pause();
    if (this.musicControls && isNative) {
        this.musicControls.updateIsPlaying({ isPlaying: false });
    }
  }

  async seek(seconds) {
    if (this.howl) {
      this.howl.seek(seconds);
    }
  }

  setVolume(val) {
    if (this.howl) {
      this.howl.volume(val);
    }
  }

  getDuration() {
    return this.howl?.duration() || 0;
  }

  getCurrentPosition() {
    return this.howl?.seek() || 0;
  }

  updateMediaSession(track) {
    if (!track) return;

    if (this.musicControls && isNative) {
      this.musicControls.create({
        track: track.title,
        artist: track.artist,
        album: track.albumTitle,
        cover: track.cover,
        isPlaying: true,
        dismissable: false,
        hasPrev: true,
        hasNext: true,
        hasClose: true,
        ticker: `Now playing: ${track.title}`,
        playIcon: 'media_play',
        pauseIcon: 'media_pause',
        prevIcon: 'media_previous',
        nextIcon: 'media_next',
        closeIcon: 'media_close',
        notificationIcon: 'notification'
      });
    } else if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.albumTitle,
        artwork: [
          { src: track.cover, sizes: '96x96', type: 'image/jpeg' },
          { src: track.cover, sizes: '128x128', type: 'image/jpeg' },
          { src: track.cover, sizes: '192x192', type: 'image/jpeg' },
          { src: track.cover, sizes: '256x256', type: 'image/jpeg' },
          { src: track.cover, sizes: '384x384', type: 'image/jpeg' },
          { src: track.cover, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
    }
  }
}

export const audioService = new AudioService();
