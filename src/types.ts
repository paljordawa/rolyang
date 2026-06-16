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
  albumId?: string | null;
  
  // These fields are populated dynamically on the frontend by joining with Artists and Albums
  artist: string;
  album: string;
  coverUrl: string;
  year?: string;
  
  duration: number; // in seconds
  genres: string[];
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

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
  start_date?: string | null;
  end_date?: string | null;
  click_count?: number;
}

export interface Genre {
  id: string;
  name: string;
  image_url?: string;
}

export type ThemeMode = 'light' | 'dark';
export type Language = 'en' | 'bo';
