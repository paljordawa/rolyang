export interface Artist {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  followers: string;
  topSongs: string[]; // Song IDs
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  year?: string;
  coverUrl: string;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  albumId: string;
  
  // These fields are populated dynamically on the frontend by joining with Artists and Albums
  artist: string;
  album: string;
  coverUrl: string;
  year?: string;
  
  duration: number; // in seconds
  genre: string;
  color: string; // Vibrant color for the glass background
  audioUrl: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songs: string[]; // Array of song IDs
  coverUrl: string;
}

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'bo';
