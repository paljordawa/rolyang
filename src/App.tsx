/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, cloneElement, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { supabase, supabasePublic, isSupabaseConfigured } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Home,
  Search,
  LayoutGrid,
  Mic2,
  ListMusic,
  Heart,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Radio,
  Shuffle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  MoreHorizontal,
  Languages,
  X,
  Users,
  Plus,
  Edit2,
  Share2,
  ListPlus,
  UserPlus,
  UserMinus,
  User,
  LogIn,
  Settings,
  ShieldCheck,
  Info,
  Check,
  GripVertical,
  Bell
} from 'lucide-react';
import { Song, Album } from './types';
import { useAudio } from './hooks/useAudio';
import { Language, Artist, Playlist, Banner } from './types';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SongContextMenu = ({
  song,
  activeContextMenu,
  setActiveContextMenu,
  favorites,
  toggleFavorite,
  setSelectedSongForPlaylist,
  setIsAddToPlaylistModalOpen,
  openArtist,
  setSelectedAlbum,
  selectedPlaylist,
  toggleSongInPlaylist
}: {
  song: any,
  activeContextMenu: string | null,
  setActiveContextMenu: (id: string | null) => void,
  favorites: string[],
  toggleFavorite: (id: string) => void,
  setSelectedSongForPlaylist: (id: string | null) => void,
  setIsAddToPlaylistModalOpen: (open: boolean) => void,
  openArtist: (id: string) => void,
  setSelectedAlbum: (album: any) => void,
  selectedPlaylist?: any,
  toggleSongInPlaylist?: (pid: string, songId?: string) => void
}) => {
  if (activeContextMenu !== song.id) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          setActiveContextMenu(null);
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="absolute right-0 mt-2 w-56 bg-[#1c1c1e] border border-white/5 rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
            setActiveContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors"
        >
          <Heart size={14} className={favorites.includes(song.id) ? "text-[#7c3aed]" : ""} fill={favorites.includes(song.id) ? "currentColor" : "none"} />
          {favorites.includes(song.id) ? 'Remove Favorite' : 'Add Favorite'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSongForPlaylist(song.id);
            setIsAddToPlaylistModalOpen(true);
            setActiveContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors"
        >
          <ListPlus size={14} />
          Add to Playlist
        </button>

        {selectedPlaylist && toggleSongInPlaylist && !['p1', 'p2'].includes(selectedPlaylist.id) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSongInPlaylist(selectedPlaylist.id, song.id);
              setActiveContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors text-[#7c3aed]"
          >
            <X size={14} />
            Remove from this Playlist
          </button>
        )}

        <div className="h-px bg-white/5 my-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            openArtist(song.artistId);
            setActiveContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors"
        >
          <User size={14} />
          Go to Artist
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAlbum({ name: song.album, artistId: song.artistId });
            setActiveContextMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3 transition-colors"
        >
          <ListMusic size={14} />
          Go to Album
        </button>
      </motion.div>
    </>
  );
};

function MobileMarquee({ children, className }: { children: React.ReactNode, className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  React.useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        // Use a small buffer to avoid flickering
        setShouldAnimate(containerRef.current.scrollWidth > containerRef.current.offsetWidth + 2);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [children]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden w-full ${className}`}>
      <div className={`${shouldAnimate ? 'animate-marquee whitespace-nowrap' : 'truncate'}`}>
        <span>{children}</span>
        {shouldAnimate && (
          <>
            <span className="inline-block w-12" />
            <span>{children}</span>
            <span className="inline-block w-12" />
          </>
        )}
      </div>
    </div>
  );
}
function BannerSlider({ items }: { items: HeroItem[] }) {
  const [current, setCurrent] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % items.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [items.length, isHovered]);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full aspect-[2.2/1] md:aspect-[3.5/1] overflow-hidden rounded-2xl">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{
            width: `${items.length * 100}%`,
            transform: `translateX(-${(current * 100) / items.length}%)`,
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              className="h-full px-1 md:px-2 flex-shrink-0"
              style={{ width: `${100 / items.length}%` }}
            >
              <div
                className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/5 cursor-pointer group"
                onClick={it.action}
              >
                <img
                  src={it.image}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  draggable={false}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${it.color} opacity-75 group-hover:opacity-85 transition-opacity duration-300`} />
                <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-end">
                  <div className="text-[10px] font-black tracking-widest uppercase text-white/60 mb-1">{it.title}</div>
                  <div className="text-base md:text-xl lg:text-2xl font-bold text-white mb-0 line-clamp-2 leading-snug group-hover:text-[#a78bfa] transition-colors">{it.subtitle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${current === idx ? 'bg-[#7c3aed] w-4' : 'bg-white/20 hover:bg-white/40'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type HeroItem = { title: string; subtitle: string; image: string; color: string; buttonText?: string; action: () => void; };
function HeroBannerCarousel({ items }: { items: HeroItem[] }) {
  const [current, setCurrent] = React.useState(0);
  const [sliding, setSliding] = React.useState(false);
  const dragStartX = React.useRef(0);
  const dragDelta = React.useRef(0);
  const isDragging = React.useRef(false);
  const autoRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAuto = React.useCallback(() => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (items.length > 1) {
      autoRef.current = setTimeout(() => setCurrent(c => (c + 1) % items.length), 4000);
    }
  }, [items.length]);

  React.useEffect(() => {
    resetAuto();
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [current, resetAuto]);

  const goTo = (idx: number) => {
    if (sliding) return;
    const next = ((idx % items.length) + items.length) % items.length;
    setSliding(true);
    setCurrent(next);
    setTimeout(() => setSliding(false), 450);
    resetAuto();
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    dragDelta.current = 0;
    isDragging.current = true;
  };
  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    dragDelta.current = clientX - dragStartX.current;
  };
  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragDelta.current < -50) goTo(current + 1);
    else if (dragDelta.current > 50) goTo(current - 1);
    dragDelta.current = 0;
  };

  if (items.length === 0) return null;

  return (
    <section className="select-none">
      <div
        className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => { e.preventDefault(); handleDragMove(e.touches[0].clientX); }}
        onTouchEnd={handleDragEnd}
        onClick={() => { if (Math.abs(dragDelta.current) < 5) items[current].action(); }}
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className="flex h-full"
          style={{
            width: `${items.length * 100}%`,
            transform: `translateX(-${(current * 100) / items.length}%)`,
            transition: 'transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / items.length}%` }}
            >
              <img src={it.image} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <div className={`absolute inset-0 bg-gradient-to-t ${it.color} opacity-80`} />
              <div className="absolute inset-0 p-6 flex flex-col justify-end" style={{ pointerEvents: 'none' }}>
                <div className="text-xs font-black tracking-widest uppercase text-white/70 mb-1">{it.title}</div>
                <div className="text-2xl font-bold text-white mb-0 line-clamp-2">{it.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); goTo(current - 1); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm"
              aria-label="Previous"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); goTo(current + 1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all backdrop-blur-sm"
              aria-label="Next"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-[#7c3aed]' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}


export default function App() {

  const [tracks, setTracks] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [browseCategories, setBrowseCategories] = useState<{ id: string, name: string, color: string, icon: string, image_url?: string }[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  const fetchAllData = React.useCallback(async () => {
    try {
      setIsLoadingTracks(true);

      const [artistsRes, albumsRes, tracksRes, playlistsRes, genresRes, trackGenresRes, bannersRes] = await Promise.all([
        supabasePublic.from('artists').select('*'),
        supabasePublic.from('albums').select('*'),
        supabasePublic.from('tracks').select('*'),
        supabasePublic.from('playlists').select('*'),
        supabasePublic.from('genres').select('*'),
        supabasePublic.from('track_genres').select('*'),
        supabasePublic.from('banners').select('*').order('sort_order', { ascending: true })
      ]);

      if (artistsRes.error) { console.error('artists error:', artistsRes.error); throw artistsRes.error; }
      if (albumsRes.error) { console.error('albums error:', albumsRes.error); throw albumsRes.error; }
      if (tracksRes.error) { console.error('tracks error:', tracksRes.error); throw tracksRes.error; }
      if (playlistsRes.error) { console.error('playlists error:', playlistsRes.error); throw playlistsRes.error; }
      if (genresRes.error) console.error('genres RLS error:', genresRes.error);
      if (trackGenresRes.error) console.error('track_genres RLS error:', trackGenresRes.error);

      console.log('[Rolyang] Data loaded — tracks:', tracksRes.data?.length, 'genres:', genresRes.data?.length, 'track_genres:', trackGenresRes.data?.length);

      const fetchedArtists = artistsRes.data.map((a: any) => ({
        id: a.id,
        name: a.name,
        bio: a.bio,
        imageUrl: a.image_url,
        followers: a.followers,
        topSongs: a.top_songs || []
      }));

      const fetchedAlbums = albumsRes.data.map((al: any) => ({
        id: al.id,
        title: al.title,
        artistId: al.artist_id,
        year: al.year,
        coverUrl: al.cover_url
      }));

      const fetchedPlaylists = playlistsRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        songs: p.songs || [],
        coverUrl: p.cover_url
      }));

      const genreMap = (genresRes.data || []).reduce((acc: any, g: any) => {
        acc[g.id] = g.name;
        return acc;
      }, {});

      const trackGenresMap = (trackGenresRes.data || []).reduce((acc: any, tg: any) => {
        if (!acc[tg.track_id]) acc[tg.track_id] = [];
        if (genreMap[tg.genre_id]) {
          acc[tg.track_id].push(genreMap[tg.genre_id]);
        }
        return acc;
      }, {});

      const fetchedTracks = tracksRes.data.map((track: any) => {
        const album = fetchedAlbums.find((al: any) => al.id === track.album_id);
        const artist = fetchedArtists.find((a: any) => a.id === track.artist_id);

        return {
          id: track.id,
          title: track.title,
          artistId: track.artist_id,
          albumId: track.album_id,
          artist: artist?.name || 'Unknown Artist',
          album: album?.title || 'Single',
          coverUrl: track.cover_url || album?.coverUrl || '',
          year: track.year || album?.year || '',
          audioUrl: track.audio_url,
          duration: track.duration,
          genres: trackGenresMap[track.id] || [],
          color: track.color,
          lyrics: track.lyrics || []
        };
      });

      setArtists(fetchedArtists);
      setAlbums(fetchedAlbums);
      setPlaylists(fetchedPlaylists);
      setTracks(fetchedTracks);
      setBanners(bannersRes.data || []);

      const COLOR_PALETTES = [
        'from-pink-500 to-rose-500',
        'from-blue-600 to-indigo-700',
        'from-red-600 to-orange-700',
        'from-yellow-500 to-amber-600',
        'from-slate-700 to-slate-900',
        'from-emerald-400 to-teal-500',
        'from-orange-500 to-red-600',
        'from-cyan-500 to-blue-500',
        'from-purple-500 to-fuchsia-600',
        'from-green-500 to-lime-600'
      ];

      const ICONS = ['✨', '🎧', '🎷', '🎤', '🎸', '🌿', '⚡', '🧠', '🎹', '🎼'];

      const fetchedCategories = (genresRes.data || []).map((g: any, i: number) => ({
        id: g.id,
        name: g.name,
        color: COLOR_PALETTES[i % COLOR_PALETTES.length],
        icon: ICONS[i % ICONS.length],
        image_url: g.image_url
      }));

      setBrowseCategories(fetchedCategories);

    } catch (err) {
      console.error("Error fetching data from Supabase:", err);
    } finally {
      setIsLoadingTracks(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const audio = useAudio(tracks);

  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadUserData = async (userId: string) => {
      try {
        const [favs, follows, pLists] = await Promise.all([
          supabase.from('user_favorites').select('track_id').eq('user_id', userId),
          supabase.from('user_follows').select('artist_id').eq('user_id', userId),
          supabase.from('user_playlists').select('*').eq('user_id', userId)
        ]);

        if (favs.data) setFavorites(favs.data.map(f => f.track_id));
        if (follows.data) setFollowedArtists(follows.data.map(f => f.artist_id));
        if (pLists.data) setUserPlaylists(pLists.data.map(p => ({
          id: p.id, name: p.name, description: p.description, songs: p.songs || [], coverUrl: p.cover_url
        })));
      } catch (err) {
        console.error("Error fetching user data", err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        localStorage.setItem('rolyang_onboarding_complete', 'true');
        loadUserData(session.user.id);
      } else {
        setIsLoggedIn(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        localStorage.setItem('rolyang_onboarding_complete', 'true');
        loadUserData(session.user.id);
        // Refetch all public data now that the session is established
        fetchAllData();
      } else {
        setIsLoggedIn(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // === Fetch notifications on mount + realtime subscription ===
  React.useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchNotifications = async () => {
      const query = supabasePublic
        .from('system_notifications')
        .select('*')
        .eq('type', 'global')
        .order('created_at', { ascending: false })
        .limit(25);
      const { data } = await query;
      if (data) setNotifications(data as any[]);
    };

    fetchNotifications();

    // Realtime: show a toast when a new global broadcast is sent
    const channel = supabasePublic
      .channel('system_notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_notifications', filter: 'type=eq.global' }, (payload: any) => {
        const newNotif = payload.new as any;
        setNotifications(prev => [newNotif, ...prev]);
        setToastNotif(newNotif);
        setTimeout(() => setToastNotif(null), 6000);
      })
      .subscribe();

    return () => { supabasePublic.removeChannel(channel); };
  }, [isSupabaseConfigured]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isNowPlayingMenuOpen, setIsNowPlayingMenuOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<{ name: string, artistId: string } | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [editPlaylistDesc, setEditPlaylistDesc] = useState('');
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState<string | null>(null);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'listenNow' | 'favorites' | 'artists' | 'playlists'>('listenNow');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [radioIsActive, setRadioIsActive] = useState<boolean>(false);
  const [radioVibe, setRadioVibe] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [followedArtists, setFollowedArtists] = useState<string[]>(() => {
    const saved = localStorage.getItem('followedArtists');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('followedArtists', JSON.stringify(followedArtists));
  }, [followedArtists]);

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // === Broadcast Notifications ===
  interface SystemNotification {
    id: string;
    title: string;
    message: string;
    type: 'global' | 'direct';
    recipient_id: string | null;
    status: string;
    created_at: string;
  }
  const [notifications, setNotifications] = React.useState<SystemNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [notifReadIds, setNotifReadIds] = React.useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('rolyang_read_notifs') || '[]')); } catch { return new Set(); }
  });
  const [toastNotif, setToastNotif] = React.useState<SystemNotification | null>(null);

  const unreadCount = React.useMemo(
    () => notifications.filter(n => !notifReadIds.has(n.id)).length,
    [notifications, notifReadIds]
  );

  const markAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setNotifReadIds(allIds);
    localStorage.setItem('rolyang_read_notifs', JSON.stringify([...allIds]));
  };

  const toggleFavorite = async (songId: string) => {
    const isFav = favorites.includes(songId);
    setFavorites(prev => isFav ? prev.filter(id => id !== songId) : [...prev, songId]);

    if (user) {
      if (isFav) {
        await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('track_id', songId);
      } else {
        await supabase.from('user_favorites').insert({ user_id: user.id, track_id: songId });
      }
    }
  };

  const toggleFollowArtist = async (artistId: string) => {
    const isFollow = followedArtists.includes(artistId);
    setFollowedArtists(prev => isFollow ? prev.filter(id => id !== artistId) : [...prev, artistId]);

    if (user) {
      if (isFollow) {
        await supabase.from('user_follows').delete().eq('user_id', user.id).eq('artist_id', artistId);
      } else {
        await supabase.from('user_follows').insert({ user_id: user.id, artist_id: artistId });
      }
    }
  };

  const createPlaylist = () => {
    setNewPlaylistName(`New Playlist ${userPlaylists.length + 1}`);
    setIsCreateModalOpen(true);
  };

  const confirmCreatePlaylist = async () => {
    const newPlaylist: Playlist = {
      id: `user-${Date.now()}`,
      name: newPlaylistName.trim() || `New Playlist ${userPlaylists.length + 1}`,
      description: '',
      songs: [],
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop'
    };
    setUserPlaylists([...userPlaylists, newPlaylist]);
    setSelectedPlaylist(newPlaylist);
    setIsCreateModalOpen(false);

    if (user) {
      await supabase.from('user_playlists').insert({
        id: newPlaylist.id,
        user_id: user.id,
        name: newPlaylist.name,
        description: newPlaylist.description,
        songs: newPlaylist.songs,
        cover_url: newPlaylist.coverUrl
      });
    }
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditPlaylistName(playlist.name);
    setEditPlaylistDesc(playlist.description || '');
    setIsEditModalOpen(true);
  };

  const confirmUpdatePlaylist = async () => {
    if (!selectedPlaylist) return;

    const updated = {
      ...selectedPlaylist,
      name: editPlaylistName.trim() || selectedPlaylist.name,
      description: editPlaylistDesc.trim()
    };

    setUserPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPlaylist(updated);
    setIsEditModalOpen(false);

    if (user) {
      await supabase
        .from('user_playlists')
        .update({
          name: updated.name,
          description: updated.description
        })
        .eq('id', updated.id);
    }
  };

  const toggleSongInPlaylist = async (playlistId: string, songId?: string) => {
    const targetSongId = songId || selectedSongForPlaylist;
    if (!targetSongId) return;

    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    const hasSong = playlist.songs.includes(targetSongId);
    const updatedSongs = hasSong
      ? playlist.songs.filter(id => id !== targetSongId)
      : [...playlist.songs, targetSongId];

    setUserPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, songs: updatedSongs } : p));

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(prev => prev ? { ...prev, songs: updatedSongs } : null);
    }

    if (user) {
      await supabase
        .from('user_playlists')
        .update({ songs: updatedSongs })
        .eq('id', playlistId);
    }

    setIsAddToPlaylistModalOpen(false);
    setSelectedSongForPlaylist(null);
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    if (confirm('Are you sure you want to delete this playlist?')) {
      const pid = selectedPlaylist.id;
      setUserPlaylists(prev => prev.filter(p => p.id !== pid));
      setSelectedPlaylist(null);
      setIsEditModalOpen(false);

      if (user) {
        await supabase
          .from('user_playlists')
          .delete()
          .eq('id', pid);
      }
    }
  };

  const handleSharePlaylist = (playlist: Playlist) => {
    const shareText = `Check out this playlist: ${playlist.name} on Sleep Music!`;
    if (navigator.share) {
      navigator.share({
        title: playlist.name,
        text: shareText,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      alert('Playlist link copied to clipboard!');
    }
  };

  const translations = {
    en: { listenNow: 'Listen Now', browse: 'Browse', radio: 'Radio', library: 'Library', favorites: 'Favorites', search: 'Search' },
    bo: { listenNow: 'ད་ལྟ་ཉོན།', browse: 'ལྟ་ཞིབ།', radio: 'རྒྱང་བསྒྲགས།', library: 'དཔེ་མཛོད།', favorites: 'དགའ་མོས།', search: 'འཚོལ་བཤེར།' }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const playlistSongs = useMemo(() => {
    if (!selectedPlaylist) return [];
    const list = selectedPlaylist.songs.map(id => tracks.find(s => s.id === id)).filter(Boolean) as any[];
    if (isShuffled) {
      return [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [selectedPlaylist?.id, selectedPlaylist?.songs, isShuffled]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [searchType, setSearchType] = useState<'all' | 'artists' | 'albums'>('all');

  const genres = ['All', ...Array.from(new Set(tracks.flatMap(s => s.genres || [])))];

  const filteredSongs = tracks.filter(song => {
    const query = (searchQuery || '').toLowerCase();
    const matchesGenre = activeGenre === 'All' || song.genres?.includes(activeGenre);

    if (query === '') return matchesGenre;

    const matchesTitle = (song.title || '').toLowerCase().includes(query);
    const matchesArtist = (song.artist || '').toLowerCase().includes(query);
    const matchesAlbum = (song.album || '').toLowerCase().includes(query);

    if (searchType === 'artists') return matchesArtist && matchesGenre;
    if (searchType === 'albums') return matchesAlbum && matchesGenre;

    return (matchesTitle || matchesArtist || matchesAlbum) && matchesGenre;
  });

  const filteredArtists = artists.filter(artist =>
    (artist?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const allAlbums = Array.from(new Set(tracks.map(s => s.album))).map(albumName => {
    return tracks.find(s => s.album === albumName)!;
  });

  const newlyReleasedSongs = [...tracks].filter(t => !t.albumId).sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));

  const filteredAlbums = allAlbums.filter(album =>
    (album?.album || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const t = translations[lang];
  const openArtist = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    if (artist) {
      setSelectedArtist(artist);
      setIsOverlayOpen(false); // Close song overlay if it's open
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Rolyang Login / Onboarding Overlay */}
      <AnimatePresence>
        {!isLoggedIn && (
          <OnboardingScreen
            openPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
            openAboutUs={() => setIsAboutUsOpen(true)}
          />
        )}
      </AnimatePresence>
      {/* Background Dynamic Blur */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30 blur-[150px] transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${audio.currentSong?.color || '#000'} 0%, transparent 70%)`
        }}
      />

      {isLoadingTracks && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#7c3aed]"></div>
        </div>
      )}

      {/* Sidebar - Desktop Only */}
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex relative z-20 flex-col w-64 bg-[#0a0a0a]/95 border-r border-white/[0.03] h-full shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="p-6 flex items-center gap-3">
          <div className="relative group/logo">
            <div className="absolute inset-0 bg-[#7c3aed] blur-md opacity-30 group-hover/logo:opacity-50 transition-opacity rounded-full" />
            <img src="/rolyang-logo.svg" alt="Rolyang" className="relative z-10 w-9 h-9 object-contain transform transition-transform duration-300 group-hover/logo:scale-110" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">Rolyang</h1>
            <span className="text-[9px] font-bold text-[#7c3aed] tracking-wider uppercase">Beta</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          <SidebarItem
            icon={<Home size={20} />}
            label={t.listenNow}
            active={currentView === 'listenNow'}
            onClick={() => {
              setCurrentView('listenNow');
              setSearchQuery('');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />

          <div className="mt-8 mb-3 px-4 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868b]">{t.library}</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
          </div>
          <SidebarItem
            icon={<Heart size={20} />}
            label={t.favorites}
            active={currentView === 'favorites'}
            onClick={() => {
              setCurrentView('favorites');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />
          <SidebarItem
            icon={<Users size={20} />}
            label="Artists"
            active={currentView === 'artists'}
            onClick={() => {
              setCurrentView('artists');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />
          <SidebarItem
            icon={<ListMusic size={20} />}
            label="Playlists"
            active={currentView === 'playlists'}
            onClick={() => {
              setCurrentView('playlists');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />

          <div className="mt-8 mb-3 px-4 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868b]">General</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/5 to-transparent" />
          </div>
          <div className="px-4 space-y-1 pb-6">
            <div className="relative group/lang flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all duration-300">
              <Languages size={18} className="text-[#86868b] group-hover/lang:text-[var(--text-primary)] transition-colors" />
              <div className="flex-1 relative flex items-center">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="w-full bg-transparent outline-none cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#86868b] group-hover/lang:text-[var(--text-primary)] transition-all appearance-none pr-8 py-0.5"
                >
                  <option value="en" className="bg-[#0a0a0a] text-white">English</option>
                  <option value="bo" className="bg-[#0a0a0a] text-white">བོད་སྐད།</option>
                </select>
                <div className="absolute right-0 pointer-events-none text-[#86868b] group-hover/lang:text-[var(--text-primary)] transition-colors">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        {/* Top Nav (Desktop) / Mobile Search Header */}
        <header className="h-14 px-4 lg:px-8 flex items-center justify-between z-10 sticky top-0 lg:bg-transparent bg-black">
          <div className="flex items-center gap-2 lg:gap-4 lg:flex-initial">
            <img
              src="/rolyang-logo.svg"
              alt="Rolyang"
              className="lg:hidden w-8 h-8 object-contain mr-2 cursor-pointer"
              onClick={() => {
                if (currentView !== 'listenNow') {
                  setCurrentView('listenNow');
                  setSearchQuery('');
                  setSelectedAlbum(null);
                  setSelectedPlaylist(null);
                  setSelectedArtist(null);
                  setSelectedGenre(null);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3 lg:gap-6 flex-1 justify-end">
            {/* Type & Genre Filters */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex mr-2">
                {(['all', 'artists', 'albums'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${searchType === type
                      ? 'text-[#7c3aed]'
                      : 'text-[#86868b] hover:text-white'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap ${activeGenre === genre
                    ? 'text-[#7c3aed]'
                    : 'text-[#86868b] hover:text-white'
                    }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className={`relative flex items-center justify-end transition-all duration-300 ${isSearchExpanded ? 'flex-1 lg:max-w-md' : 'w-10 lg:flex-1 lg:max-w-md'}`}>
              <motion.div
                animate={{
                  width: isSearchExpanded ? '100%' : (window.innerWidth >= 1024 ? '100%' : '40px'),
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative flex items-center h-10 rounded-xl overflow-hidden ml-auto lg:w-full"
              >
                <div className={`flex items-center w-full h-full transition-all ${isSearchExpanded || window.innerWidth >= 1024 ? 'px-3' : 'justify-center'}`}>
                  <AnimatePresence mode="wait">
                    {(isSearchExpanded || window.innerWidth >= 1024) && (
                      <motion.input
                        key="search-input"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        type="text"
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchExpanded(true)}
                        onBlur={() => {
                          if (searchQuery === '') {
                            setIsSearchExpanded(false);
                          }
                        }}
                        className="flex-1 bg-transparent border-0 py-2 outline-none focus:ring-0 text-sm placeholder:text-[#86868b] text-white"
                      />
                    )}
                  </AnimatePresence>

                  {isSearchExpanded && searchQuery !== '' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="mx-2 text-[#86868b] hover:text-white transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}

                  <Search
                    className={`shrink-0 transition-colors cursor-pointer ${isSearchExpanded ? 'text-[#7c3aed]' : 'text-[#86868b]'}`}
                    size={18}
                    onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
                  />
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Notification Bell */}
              <button
                onClick={() => { setIsNotifOpen(o => !o); if (!isNotifOpen) markAllRead(); }}
                className="relative w-10 h-10 rounded-full bg-[#1c1c1e] flex items-center justify-center text-[#86868b] hover:text-white hover:bg-[#2c2c2e] transition-all border border-white/5 shadow-lg group"
                aria-label="Notifications"
              >
                <Bell size={18} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#7c3aed] rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-lg shadow-[#7c3aed]/40 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-10 h-10 rounded-full bg-[#1c1c1e] flex items-center justify-center text-[#86868b] hover:text-white hover:bg-[#2c2c2e] transition-all border border-white/5 shadow-lg group overflow-hidden"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── Toast Notification Popup ── */}
        {toastNotif && (
          <div
            className="fixed top-16 right-4 z-[200] max-w-xs w-full"
            style={{ animation: 'slideInRight 0.4s ease' }}
          >
            <div className="bg-[#1c1c1e] border border-[#7c3aed]/40 rounded-2xl p-4 shadow-2xl shadow-[#7c3aed]/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={14} className="text-[#7c3aed]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white mb-0.5">{toastNotif.title}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{toastNotif.message}</p>
              </div>
              <button onClick={() => setToastNotif(null)} className="text-zinc-600 hover:text-white transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Notification Drawer ── */}
        {isNotifOpen && (
          <div className="fixed inset-0 z-[190] flex justify-end" onClick={() => setIsNotifOpen(false)}>
            <div
              className="relative w-full max-w-sm h-full bg-[#111] border-l border-white/5 flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
              style={{ animation: 'slideInRight 0.3s ease' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Bell size={16} className="text-[#7c3aed]" />
                    Broadcasts
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Messages from Rolyang team</p>
                </div>
                <button onClick={() => setIsNotifOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 opacity-50">
                    <Bell size={40} className="mb-4 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">No broadcasts yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Admin messages will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map(notif => {
                      const isRead = notifReadIds.has(notif.id);
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(notif.created_at).getTime();
                        const mins = Math.floor(diff / 60000);
                        const hrs = Math.floor(diff / 3600000);
                        const days = Math.floor(diff / 86400000);
                        if (days > 0) return `${days}d ago`;
                        if (hrs > 0) return `${hrs}h ago`;
                        if (mins > 0) return `${mins}m ago`;
                        return 'Just now';
                      })();
                      return (
                        <div key={notif.id} className={`px-5 py-4 transition-colors ${isRead ? 'opacity-60' : 'bg-[#7c3aed]/5'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isRead ? 'bg-zinc-700' : 'bg-[#7c3aed]'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="font-bold text-sm text-white truncate">{notif.title}</p>
                                <span className="text-[9px] text-zinc-500 shrink-0">{timeAgo}</span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">{notif.message}</p>
                              <span className="inline-block mt-2 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">
                                {notif.type === 'global' ? '📢 Global' : '📩 Direct'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="flex-1 overflow-y-auto no-scrollbar pb-32 relative">
          <AnimatePresence mode="wait">
            {selectedAlbum ? (
              <motion.div
                key="album-page"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col min-h-full"
              >
                {/* Album Page Content */}
                {(() => {
                  const albumSongs = tracks
                    .filter(s => s.album === selectedAlbum.name && s.artistId === selectedAlbum.artistId)
                    .sort((a, b) => {
                      const numA = parseInt(a.id.split('-t').pop() || '0');
                      const numB = parseInt(b.id.split('-t').pop() || '0');
                      return numA - numB;
                    });
                  const firstSong = albumSongs[0];
                  if (!firstSong) return null;

                  return (
                    <>
                      <div className="relative min-h-[40vh] md:h-[40vh] flex flex-col justify-end p-6 md:p-8">
                        <img src={firstSong.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-transparent" />

                        <button
                          onClick={() => setSelectedAlbum(null)}
                          className="absolute top-6 left-6 z-10 p-2 rounded-none bg-black/40 text-white hover:bg-black/60 transition-colors"
                        >
                          <ChevronLeft size={24} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                        </button>

                        <div className="relative z-10 mt-auto">
                          <div className="text-[#7c3aed] text-xs font-bold tracking-widest uppercase mb-2">Album</div>
                          <h2 className="text-3xl sm:text-4xl md:text-7xl font-black mb-4 leading-tight md:leading-none">{selectedAlbum.name}</h2>
                          <p className="text-[var(--text-primary)] font-bold text-base md:text-lg mb-2">{firstSong.artist}</p>
                          <p className="text-[#86868b] text-sm md:text-base font-medium mb-6 md:mb-8">
                            {firstSong.year ? `${firstSong.year} • ` : ''}{albumSongs.length} songs
                          </p>

                          <div className="flex items-center gap-3 font-bold transition-all">
                            <button
                              onClick={() => {
                                audio.setCurrentSong(firstSong);
                                audio.setManualQueue(albumSongs.slice(1));
                                audio.setIsPlaying(true);
                              }}
                              className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                              title="Play"
                            >
                              <Play fill="currentColor" size={24} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                            </button>

                            <button
                              onClick={() => {
                                const shuffled = [...albumSongs].sort(() => Math.random() - 0.5);
                                audio.setCurrentSong(shuffled[0]);
                                audio.setManualQueue(shuffled.slice(1));
                                audio.setIsPlaying(true);
                              }}
                              className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                              title="Shuffle"
                            >
                              <Shuffle size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 px-4 sm:px-8 md:px-6 py-6 md:py-8  mx-auto w-full">
                        <div className="hidden md:block">
                          <table className="w-full text-left font-medium border-collapse">
                            <thead>
                              <tr className="text-[#86868b] text-[9px] uppercase font-black tracking-[0.2em]">
                                <th className="py-2 px-4">Title</th>
                                <th className="py-2 px-4 text-right pr-12"></th>
                                <th className="py-2 w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="">
                              {albumSongs.map((song, i) => (
                                <tr
                                  key={song.id}
                                  className={`group transition-all duration-300 cursor-pointer`}
                                  onClick={() => {
                                    audio.setCurrentSong(song);
                                    audio.setManualQueue(albumSongs.slice(i + 1));
                                    audio.setIsPlaying(true);
                                  }}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="truncate font-bold text-sm tracking-tight text-white group-hover:text-[#7c3aed] transition-colors">{song.title}</div>
                                      {audio.currentSong?.id === song.id && audio.isPlaying && (
                                        <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                          {[1, 2, 3].map(j => (
                                            <motion.div
                                              key={j}
                                              animate={{ height: ["20%", "100%", "20%"] }}
                                              transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                              className="w-0.5 bg-[#7c3aed] rounded-full"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                                          }}
                                          className="p-2 rounded-none hover:bg-white/10 text-[#86868b] transition-colors"
                                        >
                                          <MoreHorizontal size={16} />
                                        </button>
                                        <SongContextMenu
                                          song={song}
                                          activeContextMenu={activeContextMenu}
                                          setActiveContextMenu={setActiveContextMenu}
                                          favorites={favorites}
                                          toggleFavorite={toggleFavorite}
                                          setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                          setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                          openArtist={openArtist}
                                          setSelectedAlbum={setSelectedAlbum}
                                        />
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="md:hidden space-y-1">
                          {albumSongs.map((song, i) => (
                            <div
                              key={song.id}
                              onClick={() => {
                                audio.setCurrentSong(song);
                                audio.setManualQueue(albumSongs.slice(i + 1));
                                audio.setIsPlaying(true);
                              }}
                              className={`flex items-center gap-4 p-3 rounded-xl transition-all active:bg-white/10 ${audio.currentSong?.id === song.id ? 'bg-white/5' : ''}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className={`font-bold text-sm truncate ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'text-white'}`}>
                                    {song.title}
                                  </div>
                                  {audio.currentSong?.id === song.id && audio.isPlaying && (
                                    <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                      {[1, 2, 3].map(j => (
                                        <motion.div
                                          key={j}
                                          animate={{ height: ["20%", "100%", "20%"] }}
                                          transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                          className="w-0.5 bg-[#7c3aed] rounded-full"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                                    }}
                                    className="p-2 text-[#86868b]"
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>
                                  <SongContextMenu
                                    song={song}
                                    activeContextMenu={activeContextMenu}
                                    setActiveContextMenu={setActiveContextMenu}
                                    favorites={favorites}
                                    toggleFavorite={toggleFavorite}
                                    setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                    setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                    openArtist={openArtist}
                                    setSelectedAlbum={setSelectedAlbum}
                                  />
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                                  className={`p-2 ${favorites.includes(song.id) ? 'text-[#7c3aed]' : 'text-[#86868b]'}`}
                                >
                                  <Heart fill={favorites.includes(song.id) ? "currentColor" : "none"} size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            ) : selectedPlaylist ? (
              <motion.div
                key="playlist-page"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col min-h-full"
              >
                {/* Playlist Page Content */}
                <div className="relative min-h-[40vh] md:h-[40vh] flex flex-col justify-end p-6 md:p-8">
                  <img src={selectedPlaylist.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-transparent" />

                  <button
                    onClick={() => { setSelectedPlaylist(null); setIsShuffled(false); }}
                    className="absolute top-6 left-6 z-10 p-2 rounded-none bg-black/40 text-white hover:bg-black/60 transition-colors"
                  >
                    <ChevronLeft size={24} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                  </button>

                  <div className="relative z-10 mt-auto">
                    <div className="text-[#7c3aed] text-xs font-bold tracking-widest uppercase mb-2">
                      {['p1', 'p2'].includes(selectedPlaylist.id) ? 'Special Collection' : 'Playlist'}
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-7xl font-black mb-4 leading-tight md:leading-none">{selectedPlaylist.name}</h2>
                    <p className="text-[#86868b] max-w-2xl mb-6 md:mb-8 text-sm md:text-base line-clamp-2 md:line-clamp-none">{selectedPlaylist.description}</p>

                    <div className="flex items-center gap-3 font-bold transition-all">
                      <button
                        onClick={() => {
                          let list = selectedPlaylist.songs.map(id => tracks.find(s => s.id === id)).filter(Boolean);
                          if (isShuffled) {
                            list = [...list].sort(() => Math.random() - 0.5);
                          }
                          if (list.length > 0) {
                            audio.setCurrentSong(list[0] as any);
                            audio.setManualQueue(list.slice(1));
                            audio.setIsPlaying(true);
                          }
                        }}
                        className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        title="Play"
                      >
                        <Play fill="currentColor" size={24} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                      </button>

                      <button
                        onClick={() => setIsShuffled(!isShuffled)}
                        className={`w-12 h-12 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${isShuffled ? 'text-[#7c3aed]' : 'text-white hover:text-[#7c3aed]'}`}
                        title="Shuffle"
                      >
                        <Shuffle size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                      </button>

                      <button
                        onClick={() => handleSharePlaylist(selectedPlaylist)}
                        className="w-12 h-12 text-white hover:text-[#7c3aed] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                        title="Share Playlist"
                      >
                        <Share2 size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                      </button>

                      {!['p1', 'p2'].includes(selectedPlaylist.id) && (
                        <button
                          onClick={() => handleEditPlaylist(selectedPlaylist)}
                          className="w-12 h-12 text-white hover:text-[#7c3aed] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                          title="Edit Playlist"
                        >
                          <Edit2 size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-4 sm:px-8 md:px-6 py-6 md:py-8  mx-auto w-full">
                  <div className="hidden md:block">
                    <table className="w-full text-left font-medium border-collapse">
                      <thead>
                        <tr className="text-[#86868b] text-[10px] uppercase font-black tracking-[0.2em]">
                          <th className="py-4 px-4">Title</th>
                          <th className="py-4 px-4">Album</th>
                          <th className="py-4 px-4 text-right pr-12"></th>
                          <th className="py-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="">
                        {playlistSongs.map((song: any, i: number) => (
                          <tr
                            key={song.id}
                            className={`group transition-all duration-300 cursor-pointer`}
                            onClick={() => {
                              audio.setCurrentSong(song);
                              audio.setManualQueue(playlistSongs.slice(i + 1));
                              audio.setIsPlaying(true);
                            }}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                  <img src={song.coverUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate font-bold text-xs tracking-tight text-white group-hover:text-[#7c3aed] transition-colors">{song.title}</div>
                                    {audio.currentSong?.id === song.id && audio.isPlaying && (
                                      <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                        {[1, 2, 3].map(j => (
                                          <motion.div
                                            key={j}
                                            animate={{ height: ["20%", "100%", "20%"] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                            className="w-0.5 bg-[#7c3aed] rounded-full"
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-[#86868b] truncate group-hover:text-white transition-colors">{song.artist}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-[10px] text-[#86868b] truncate max-w-[150px]">{song.album}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center justify-end gap-2">
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                                    }}
                                    className="p-2 rounded-none hover:bg-white/10 text-[#86868b] transition-colors"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  <SongContextMenu
                                    song={song}
                                    activeContextMenu={activeContextMenu}
                                    setActiveContextMenu={setActiveContextMenu}
                                    favorites={favorites}
                                    toggleFavorite={toggleFavorite}
                                    setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                    setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                    openArtist={openArtist}
                                    setSelectedAlbum={setSelectedAlbum}
                                    selectedPlaylist={selectedPlaylist}
                                    toggleSongInPlaylist={toggleSongInPlaylist}
                                  />
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                                  className={`transition-all p-2 hover:scale-110 active:scale-90 ${favorites.includes(song.id) ? 'text-[#7c3aed]' : 'text-[#86868b]'}`}
                                >
                                  <Heart fill={favorites.includes(song.id) ? "currentColor" : "none"} size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-1">
                    {playlistSongs.map((song: any, i: number) => (
                      <div
                        key={song.id}
                        onClick={() => {
                          audio.setCurrentSong(song);
                          audio.setManualQueue(playlistSongs.slice(i + 1));
                          audio.setIsPlaying(true);
                        }}
                        className={`flex items-center gap-3 py-2 rounded-xl transition-all active:opacity-70 ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : ''}`}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                          <img src={song.coverUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`font-bold text-sm truncate ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'text-white'}`}>
                              {song.title}
                            </div>
                            {audio.currentSong?.id === song.id && audio.isPlaying && (
                              <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                {[1, 2, 3].map(j => (
                                  <motion.div
                                    key={j}
                                    animate={{ height: ["20%", "100%", "20%"] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                    className="w-0.5 bg-[#7c3aed] rounded-full"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-[#86868b] truncate">
                            {song.artist} • {song.album}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                              }}
                              className="p-2 text-[#86868b]"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                            <SongContextMenu
                              song={song}
                              activeContextMenu={activeContextMenu}
                              setActiveContextMenu={setActiveContextMenu}
                              favorites={favorites}
                              toggleFavorite={toggleFavorite}
                              setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                              setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                              openArtist={openArtist}
                              setSelectedAlbum={setSelectedAlbum}
                              selectedPlaylist={selectedPlaylist}
                              toggleSongInPlaylist={toggleSongInPlaylist}
                            />
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                            className={`p-2 ${favorites.includes(song.id) ? 'text-[#7c3aed]' : 'text-[#86868b]'}`}
                          >
                            <Heart fill={favorites.includes(song.id) ? "currentColor" : "none"} size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : selectedArtist ? (
              <motion.div
                key="artist-page"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col min-h-full"
              >
                <div className="relative min-h-[40vh] md:h-[40vh] flex flex-col justify-end p-6 md:p-8">
                  <img src={selectedArtist.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/60 to-transparent" />

                  <button
                    onClick={() => setSelectedArtist(null)}
                    className="absolute top-6 left-6 z-10 p-2 rounded-none bg-black/40 text-white hover:bg-black/60 transition-colors"
                  >
                    <ChevronLeft size={24} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                  </button>

                  <div className="relative z-10 mt-auto">
                    <div className="flex items-center gap-2 text-[#7c3aed] mb-2 font-bold uppercase tracking-widest text-[10px]">
                      <span>Artist</span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl md:text-8xl font-black mb-6 leading-tight md:leading-none">{selectedArtist.name}</h2>
                    <div className="flex items-center gap-3 font-bold transition-all">
                      <button
                        onClick={() => {
                          const firstSongId = selectedArtist.topSongs[0];
                          const song = tracks.find(s => s.id === firstSongId);
                          if (song) {
                            audio.setCurrentSong(song);
                            audio.setIsPlaying(true);
                          }
                        }}
                        className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        title="Play"
                      >
                        <Play fill="currentColor" size={24} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                      </button>
                      <button
                        onClick={() => toggleFollowArtist(selectedArtist.id)}
                        className={`w-12 h-12 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${followedArtists.includes(selectedArtist.id) ? 'text-[#7c3aed]' : 'text-white hover:text-[#7c3aed]'}`}
                        title={followedArtists.includes(selectedArtist.id) ? 'Following' : 'Follow'}
                      >
                        {followedArtists.includes(selectedArtist.id) ? (
                          <UserMinus size={20} className="animate-in zoom-in duration-300" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                        ) : (
                          <UserPlus size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                        )}
                      </button>
                      <span className="ml-2 text-center md:text-left text-[10px] md:text-sm text-gray-400">{selectedArtist.followers} monthly listeners</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-4 sm:px-8 md:px-12 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10  mx-auto w-full">
                  <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold mb-6">{'Popular'}</h3>
                    <div className="space-y-2 mb-12">
                      {selectedArtist.topSongs.map((songId) => {
                        const song = tracks.find(s => s.id === songId);
                        if (!song) return null;
                        return (
                          <div
                            key={songId}
                            onClick={() => {
                              audio.setCurrentSong(song);
                              audio.setIsPlaying(true);
                            }}
                            className="flex items-center gap-3 md:gap-4 py-1.5 transition-colors group cursor-pointer"
                          >
                            <div className="w-14 h-14 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={song.coverUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 ml-1">
                              <div className="flex items-center gap-2">
                                <div className={`font-semibold text-sm md:text-base truncate ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'text-white'}`}>{song.title}</div>
                                {audio.currentSong?.id === song.id && audio.isPlaying && (
                                  <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                    {[1, 2, 3].map(j => (
                                      <motion.div
                                        key={j}
                                        animate={{ height: ["20%", "100%", "20%"] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                        className="w-0.5 bg-[#7c3aed] rounded-full"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] md:text-xs text-[#86868b]">{song.album}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                                  }}
                                  className="p-2 rounded-none hover:bg-white/10 text-[#86868b] transition-colors"
                                >
                                  <MoreHorizontal size={16} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                                </button>

                                <SongContextMenu
                                  song={song}
                                  activeContextMenu={activeContextMenu}
                                  setActiveContextMenu={setActiveContextMenu}
                                  favorites={favorites}
                                  toggleFavorite={toggleFavorite}
                                  setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                  setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                  openArtist={openArtist}
                                  setSelectedAlbum={setSelectedAlbum}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <h3 className="text-xl font-bold mb-6">Discography</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                      {/* Albums */}
                      {albums.filter(al => al.artistId === selectedArtist.id || (al.artistId.startsWith('collab_') && al.artistId.replace('collab_', '').split('__').includes(selectedArtist.id))).map(album => {
                        return (
                          <div
                            key={album.id}
                            className="group cursor-pointer"
                            onClick={() => setSelectedAlbum({ name: album.title, artistId: album.artistId })}
                          >
                            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                              <img src={album.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center text-white">
                                  <Play fill="white" size={24} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                                </div>
                              </div>
                            </div>
                            <div className="font-bold text-sm truncate">{album.title}</div>
                            <div className="text-[10px] text-[#86868b] font-medium uppercase tracking-wider">Album • {album.year || '2024'}</div>
                          </div>
                        );
                      })}
                      {/* Singles */}
                      {tracks.filter(s => (s.artistId === selectedArtist.id || (s.artistId.startsWith('collab_') && s.artistId.replace('collab_', '').split('__').includes(selectedArtist.id))) && !s.albumId).map(single => {
                        return (
                          <div
                            key={single.id}
                            className="group cursor-pointer"
                            onClick={() => {
                              audio.setCurrentSong(single);
                              audio.setIsPlaying(true);
                            }}
                          >
                            <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                              <img src={single.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center text-white">
                                  <Play fill="white" size={24} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                                </div>
                              </div>
                            </div>
                            <div className="font-bold text-sm truncate">{single.title}</div>
                            <div className="text-[10px] text-[#86868b] font-medium uppercase tracking-wider">Single • {single.year || '2024'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <h3 className="text-xl font-bold mb-6">About</h3>
                      <p className="text-[#86868b] leading-relaxed text-sm">
                        {selectedArtist.bio}
                      </p>
                    </div>

                    <div className="py-6 border-t border-white/5 relative overflow-hidden">
                      <div className="relative z-10">
                        <Users className="text-[#7c3aed] mb-4" size={32} />
                        <h4 className="font-bold mb-1">Fan Base</h4>
                        <p className="text-xs text-[#86868b]">Join the global community of {selectedArtist.name} fans.</p>
                      </div>
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Mic2 size={120} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="main-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={selectedGenre ? "flex flex-col min-h-full" : "px-4 lg:px-6 pt-2"}
              >
                {searchQuery ? (
                  <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-8">Search Results</h2>
                ) : (
                  ['playlists', 'favorites', 'artists'].includes(currentView) && (
                    <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
                      {[
                        { id: 'playlists', label: 'Playlists', icon: <ListMusic size={16} /> },
                        { id: 'artists', label: 'Artists', icon: <Users size={16} /> },
                        { id: 'favorites', label: 'Favorites', icon: <Heart size={16} /> }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setCurrentView(tab.id as any)}
                          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${currentView === tab.id
                            ? 'bg-[#7c3aed] text-white'
                            : 'text-[#86868b] hover:text-white hover:bg-white/5'
                            }`}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )
                )}

                {currentView === 'listenNow' && !searchQuery && !selectedGenre && (
                  <div className="space-y-10 pb-24">
                    {/* Genres + Surprise Me */}
                    <div className="flex items-center gap-3 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
                      {browseCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedGenre(cat.name);
                            setActiveGenre(cat.name);
                          }}
                          className={`flex-shrink-0 flex items-center px-5 py-2.5 rounded-full border text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 bg-slate-800 hover:bg-slate-700 border-white/10 text-white shadow-md hover:shadow-lg`}
                        >
                          <span>{cat.name}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          if (tracks.length > 0) {
                            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                            audio.setCurrentSong(shuffled[0]);
                            audio.setManualQueue(shuffled.slice(1));
                            audio.setIsPlaying(true);
                          }
                        }}
                        className="flex-shrink-0 ml-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
                      >
                        <Shuffle size={16} /> Surprise Me
                      </button>
                    </div>

                    {/* Banners Grid */}
                    {(() => {
                      const defaultHeroItems = [
                        {
                          title: 'Trending Artist',
                          subtitle: artists[0]?.name || 'Tsering Gyuymay',
                          image: artists[0]?.imageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop',
                          color: 'from-purple-900/80 to-black',
                          buttonText: 'View Artist',
                          action: () => {
                            if (artists[0]) openArtist(artists[0].id);
                          }
                        },
                        {
                          title: 'New Release',
                          subtitle: newlyReleasedSongs[0]?.title || 'Latest Hit',
                          image: newlyReleasedSongs[0]?.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
                          color: 'from-blue-900/80 to-black',
                          buttonText: 'Play Song',
                          action: () => {
                            if (newlyReleasedSongs[0]) {
                              audio.setCurrentSong(newlyReleasedSongs[0]);
                              audio.setIsPlaying(true);
                            }
                          }
                        }
                      ];

                      const activeBanners = (banners || []).filter(b => {
                        if (!b.is_active) return false;
                        const now = new Date();
                        if (b.start_date && now < new Date(b.start_date)) return false;
                        if (b.end_date && now > new Date(b.end_date)) return false;
                        return true;
                      });

                      const heroItems = activeBanners.length > 0
                        ? activeBanners.map((b, i) => {
                          // Determine display button text based on link target type
                          const buttonText = (() => {
                            if (!b.link_url) return 'Play Now';
                            if (b.link_url.startsWith('track:')) return 'Play Song';
                            if (b.link_url.startsWith('artist:')) return 'View Artist';
                            if (b.link_url.startsWith('album:')) return 'View Album';
                            if (b.link_url.startsWith('playlist:')) return 'View Playlist';
                            return 'Learn More';
                          })();

                          return {
                            title: 'Featured',
                            subtitle: b.title,
                            image: b.image_url,
                            color: i % 2 === 0 ? 'from-purple-900/80 to-black' : 'from-blue-900/80 to-black',
                            buttonText: buttonText,
                            action: () => {
                              try {
                                supabasePublic.rpc('increment_banner_clicks', { banner_id: b.id }).then(({ error }) => {
                                  if (error) console.error('Error incrementing banner clicks:', error);
                                });
                              } catch (e) {
                                console.error('Failed to log banner click:', e);
                              }

                              const link = b.link_url;
                              if (!link) return;

                              if (link.startsWith('track:')) {
                                const id = link.substring(6);
                                const song = tracks.find(s => s.id === id);
                                if (song) {
                                  audio.setCurrentSong(song);
                                  audio.setIsPlaying(true);
                                }
                              } else if (link.startsWith('artist:')) {
                                const id = link.substring(7);
                                const artist = artists.find(a => a.id === id);
                                if (artist) {
                                  setSelectedArtist(artist);
                                  setSelectedAlbum(null);
                                  setSelectedPlaylist(null);
                                  setIsOverlayOpen(false);
                                }
                              } else if (link.startsWith('album:')) {
                                const id = link.substring(6);
                                const album = albums.find(al => al.id === id);
                                if (album) {
                                  setSelectedAlbum({ name: album.title, artistId: album.artistId });
                                  setSelectedArtist(null);
                                  setSelectedPlaylist(null);
                                  setIsOverlayOpen(false);
                                }
                              } else if (link.startsWith('playlist:')) {
                                const id = link.substring(9);
                                const playlist = playlists.find(p => p.id === id) || userPlaylists.find(p => p.id === id);
                                if (playlist) {
                                  setSelectedPlaylist(playlist);
                                  setSelectedArtist(null);
                                  setSelectedAlbum(null);
                                  setIsOverlayOpen(false);
                                }
                              } else {
                                // Fallback to opening external url
                                window.open(link, '_blank');
                              }
                            }
                          };
                        })
                        : defaultHeroItems;

                      if (heroItems.length === 0) return null;

                      return <BannerSlider items={heroItems} />;
                    })()}

                    <div className="space-y-10">
                      {/* Trending Right Now (Live) */}
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold">Trending Right Now</h3>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">Live</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex overflow-x-auto no-scrollbar gap-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                          {tracks.slice(0, 10).map((song, i) => (
                            <div
                              key={song.id}
                              className="flex-shrink-0 w-36 group cursor-pointer"
                              onClick={() => { audio.setCurrentSong(song); audio.setIsPlaying(true); }}
                            >
                              <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-lg">
                                <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                    <Play fill="white" size={16} className="ml-0.5" strokeWidth={0} />
                                  </div>
                                </div>

                                {/* Rank Badge circular */}
                                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-black text-[11px] shadow-lg border border-white/10">
                                  {i + 1}
                                </div>

                                {audio.currentSong?.id === song.id && audio.isPlaying && (
                                  <div className="absolute bottom-2 right-2 flex gap-0.5 items-end h-3 bg-black/60 px-1.5 py-1 rounded-md backdrop-blur-md">
                                    {[1, 2, 3].map(j => (
                                      <motion.div
                                        key={j}
                                        animate={{ height: ['20%', '100%', '20%'] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                        className="w-0.5 bg-[#7c3aed] rounded-full"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 px-0.5">
                                <div className={`font-bold text-xs truncate transition-colors ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'group-hover:text-[#7c3aed]'}`}>{song.title}</div>
                                <div
                                  className="text-[10px] text-zinc-500 truncate mt-0.5 hover:text-white transition-colors cursor-pointer"
                                  onClick={e => { e.stopPropagation(); openArtist(song.artistId); }}
                                >{song.artist}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* New Singles */}
                      <section>
                        <h3 className="text-xl font-bold mb-4">New Singles</h3>
                        <div className="flex overflow-x-auto no-scrollbar gap-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                          {newlyReleasedSongs.map(song => (
                            <div
                              key={song.id}
                              className="flex-shrink-0 w-36 group cursor-pointer"
                              onClick={() => { audio.setCurrentSong(song); audio.setIsPlaying(true); }}
                            >
                              <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-lg">
                                <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                    <Play fill="white" size={16} className="ml-0.5" strokeWidth={0} />
                                  </div>
                                </div>
                                {audio.currentSong?.id === song.id && audio.isPlaying && (
                                  <div className="absolute bottom-2 left-2 flex gap-0.5 items-end h-3">
                                    {[1, 2, 3].map(j => (
                                      <motion.div
                                        key={j}
                                        animate={{ height: ['20%', '100%', '20%'] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                        className="w-0.5 bg-[#7c3aed] rounded-full"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 px-0.5">
                                <div className={`font-bold text-xs truncate transition-colors ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'group-hover:text-[#7c3aed]'}`}>{song.title}</div>
                                <div
                                  className="text-[10px] text-zinc-500 truncate mt-0.5 hover:text-white transition-colors cursor-pointer"
                                  onClick={e => { e.stopPropagation(); openArtist(song.artistId); }}
                                >{song.artist}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* New Albums */}
                      <section>
                        <h3 className="text-xl font-bold mb-4">New Albums</h3>
                        <div className="flex overflow-x-auto no-scrollbar gap-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                          {[...albums]
                            .sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'))
                            .map(al => {
                              const artist = artists.find(art => art.id === al.artistId);
                              return { ...al, album: al.title, artist: artist?.name || 'Unknown Artist' };
                            })
                            .map(album => (
                              <div
                                key={album.id}
                                className="flex-shrink-0 w-36 group cursor-pointer"
                                onClick={() => {
                                  setSelectedAlbum({ name: album.title, artistId: album.artistId });
                                  setSelectedArtist(null);
                                  setSelectedPlaylist(null);
                                  setIsOverlayOpen(false);
                                }}
                              >
                                <div className="relative w-36 h-36 rounded-xl overflow-hidden shadow-lg">
                                  <img src={album.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                      <Play fill="white" size={16} className="ml-0.5" strokeWidth={0} />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 px-0.5">
                                  <div className="font-bold text-xs truncate group-hover:text-[#7c3aed] transition-colors">{album.album}</div>
                                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{album.artist}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </section>

                      {/* Curated by Rolyang */}
                      {playlists.length > 0 && (
                        <section>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Curated by Rolyang</h3>
                            <button
                              className="text-xs font-semibold text-[#7c3aed] uppercase tracking-widest hover:underline"
                              onClick={() => { setCurrentView('playlists'); setSelectedAlbum(null); setSelectedArtist(null); }}
                            >
                              See All
                            </button>
                          </div>
                          <div className="flex overflow-x-auto no-scrollbar gap-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                            {playlists.map(playlist => (
                              <div
                                key={playlist.id}
                                className="flex-shrink-0 w-40 group cursor-pointer"
                                onClick={() => {
                                  setSelectedPlaylist(playlist);
                                  setSelectedArtist(null);
                                  setSelectedAlbum(null);
                                }}
                              >
                                <div className="relative w-40 h-40 rounded-xl overflow-hidden shadow-lg">
                                  <img
                                    src={playlist.coverUrl}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                                      <Play fill="white" size={16} className="ml-0.5" strokeWidth={0} />
                                    </div>
                                  </div>
                                  {/* Subtle gradient overlay at bottom */}
                                  <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                                  <div className="absolute bottom-2 left-2 right-2">
                                    <div className="text-[9px] text-zinc-300 uppercase font-black tracking-widest">{playlist.songs.length} Tracks</div>
                                  </div>
                                </div>
                                <div className="mt-2 px-0.5">
                                  <div className="font-bold text-xs truncate group-hover:text-[#7c3aed] transition-colors">{playlist.name}</div>
                                  <div className="text-[10px] text-zinc-500 truncate mt-0.5 line-clamp-1">{playlist.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Artists */}
                      <section>
                        <h3 className="text-xl font-bold mb-4">Artists</h3>
                        <div className="flex overflow-x-auto no-scrollbar gap-5 -mx-4 px-4 lg:mx-0 lg:px-0">
                          {artists.map(artist => {
                            const trackCount = tracks.filter(t => t.artistId === artist.id).length;
                            return (
                              <div
                                key={artist.id}
                                className="flex-shrink-0 w-28 flex flex-col items-center gap-2 group cursor-pointer"
                                onClick={() => openArtist(artist.id)}
                              >
                                <div className="relative w-28 h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/5 group-hover:ring-[#7c3aed]/60 transition-all duration-300">
                                  <img src={artist.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-xs truncate max-w-[6.5rem] group-hover:text-[#7c3aed] transition-colors">{artist.name}</div>
                                  <div className="text-[10px] text-zinc-500 mt-0.5">{trackCount} {trackCount === 1 ? 'Song' : 'Songs'}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {false && !searchQuery && !selectedGenre && (
                  <div className="space-y-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white mb-1">Discover</h2>
                        <p className="text-zinc-500 text-xs font-semibold">Explore genres, moods, and live vibe radios.</p>
                      </div>
                    </div>

                    {/* Vibe Radio Visualizer Card */}
                    {radioIsActive && audio.currentSong && (
                      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg relative bg-black/40">
                            <img
                              src={audio.currentSong.coverUrl}
                              className="w-full h-full object-cover"
                              style={{
                                animation: audio.isPlaying ? 'spin 12s linear infinite' : 'none',
                                animationPlayState: audio.isPlaying ? 'running' : 'paused'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Radio className="w-6 h-6 text-indigo-400 animate-pulse" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-black mb-1">Live Vibe Radio • {radioVibe}</div>
                            <h4 className="text-base font-bold text-white truncate">{audio.currentSong.title}</h4>
                            <p className="text-xs text-zinc-400 truncate">{audio.currentSong.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => audio.setIsPlaying(!audio.isPlaying)}
                            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                          >
                            {audio.isPlaying ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" />}
                            {audio.isPlaying ? 'Pause' : 'Play'}
                          </button>
                          <button
                            onClick={() => audio.nextSong()}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all border border-white/15 active:scale-95"
                          >
                            Next Vibe
                          </button>
                          <button
                            onClick={() => {
                              setRadioIsActive(false);
                              setRadioVibe(null);
                            }}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-full transition-all border border-red-500/20"
                            title="Turn off Radio"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section 1: Moods & Activities Selector */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-extrabold text-white">How are you feeling today?</h3>
                      <div className="flex overflow-x-auto no-scrollbar gap-3 -mx-4 px-4 lg:mx-0 lg:px-0">
                        {[
                          { id: 'chill', name: 'Chill Vibe', emoji: '🧘', color: 'from-blue-600/20 to-indigo-900/30 border-blue-500/20 text-blue-400', hoverGlow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]', genres: ['Electronic', 'R&B', 'Ambient'] },
                          { id: 'energy', name: 'High Energy', emoji: '⚡', color: 'from-amber-600/20 to-red-900/30 border-amber-500/20 text-amber-400', hoverGlow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]', genres: ['Pop', 'Electronic', 'Rock', 'Dance'] },
                          { id: 'focus', name: 'Deep Focus', emoji: '🧠', color: 'from-emerald-600/20 to-teal-900/30 border-emerald-500/20 text-emerald-400', hoverGlow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]', genres: ['Classical', 'Ambient'] },
                          { id: 'party', name: 'Party Mode', emoji: '🎉', color: 'from-purple-600/20 to-pink-900/30 border-purple-500/20 text-purple-400', hoverGlow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]', genres: ['Pop', 'Electronic', 'Hip Hop'] },
                          { id: 'romance', name: 'Romance', emoji: '💖', color: 'from-rose-600/20 to-red-900/30 border-rose-500/20 text-rose-400', hoverGlow: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]', genres: ['Pop', 'R&B'] }
                        ].map((mood) => (
                          <div
                            key={mood.id}
                            className={`flex-shrink-0 flex items-center justify-between gap-6 p-4 rounded-2xl border bg-gradient-to-br ${mood.color} ${mood.hoverGlow} transition-all duration-300 w-64 group select-none`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{mood.emoji}</span>
                              <div>
                                <h4 className="font-bold text-white text-sm">{mood.name}</h4>
                                <span className="text-[10px] text-zinc-400">Continuous station</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const matchingTracks = tracks.filter(t => t.genres.some(g => mood.genres.includes(g)));
                                if (matchingTracks.length > 0) {
                                  const shuffled = [...matchingTracks].sort(() => Math.random() - 0.5);
                                  audio.setCurrentSong(shuffled[0]);
                                  audio.setManualQueue(shuffled.slice(1));
                                  audio.setIsPlaying(true);
                                  setRadioIsActive(true);
                                  setRadioVibe(mood.name);
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all duration-300 active:scale-90 shadow border border-white/5 shrink-0"
                              title="Start Station"
                            >
                              <Play size={12} fill="currentColor" strokeWidth={0} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Section 2: Bento Grid Genres */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-extrabold text-white">Browse by Genre</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {browseCategories.map((cat, idx) => {
                          const isFeatured = idx === 0 || idx === 3 || idx === 5;
                          const trackCount = tracks.filter(t => t.genres.includes(cat.name)).length;
                          return (
                            <div
                              key={cat.name}
                              onClick={() => {
                                setSelectedGenre(cat.name);
                                setActiveGenre(cat.name);
                              }}
                              className={`relative rounded-2xl p-6 overflow-hidden group cursor-pointer transition-all duration-500 border border-white/5 bg-black/40 hover:bg-white/5 shadow-lg min-h-[140px] flex flex-col justify-between ${isFeatured ? 'col-span-2' : 'col-span-1'}`}
                            >
                              {/* Glow background */}
                              <div className={`absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br ${cat.color} opacity-20 blur-2xl group-hover:scale-125 transition-transform duration-500`} />

                              {cat.image_url && (
                                <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity duration-500" />
                              )}

                              <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                <span className="text-2xl w-fit p-1 bg-white/5 rounded-lg border border-white/5">{cat.icon || '🎵'}</span>
                                <div>
                                  <h4 className="font-extrabold text-white text-base md:text-lg tracking-tight mb-0.5 group-hover:text-indigo-400 transition-colors drop-shadow-md">
                                    {cat.name}
                                  </h4>
                                  <span className="text-[10px] text-zinc-500 font-semibold drop-shadow-md">
                                    {trackCount} {trackCount === 1 ? 'Track' : 'Tracks'}
                                  </span>
                                </div>
                              </div>

                              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white/50">
                                <ChevronRight className="w-4 h-4 translate-x-[-4px] group-hover:translate-x-0 transition-transform" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Section 3: Curated playlists */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-extrabold text-white">Curated Playlists</h3>
                        <button className="text-xs font-semibold text-[#7c3aed] uppercase tracking-widest hover:underline" onClick={() => setCurrentView('playlists')}>See All</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {playlists.map(playlist => (
                          <div
                            key={playlist.id}
                            onClick={() => setSelectedPlaylist(playlist)}
                            className="flex gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-white/10"
                          >
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                              <img src={playlist.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="font-bold text-sm text-white group-hover:text-[#7c3aed] transition-colors truncate">{playlist.name}</div>
                              <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{playlist.description}</div>
                              <div className="text-[9px] text-zinc-500 mt-1.5 uppercase font-black tracking-widest">{playlist.songs.length} Tracks</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {!searchQuery && selectedGenre && (
                  <motion.div
                    key="genre-page"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col min-h-full"
                  >
                    {(() => {
                      const cat = browseCategories.find(c => c.name === selectedGenre) || browseCategories[0] || { name: selectedGenre, color: 'from-fuchsia-500 to-purple-600', icon: '🎵' };
                      const genreSongs = tracks.filter(s => s.genres?.includes(selectedGenre));
                      const uniqueArtistIds = Array.from(new Set(genreSongs.map(s => s.artistId)));
                      const genreArtists = artists.filter(a => uniqueArtistIds.includes(a.id));

                      // For collage, get up to 6 unique album covers from the genre's songs
                      const uniqueCovers = Array.from(new Set(genreSongs.map(s => s.coverUrl).filter(url => url))).slice(0, 6);

                      return (
                        <>
                          <div className="relative min-h-[40vh] md:h-[40vh] flex flex-col px-0 pt-6 pb-6 md:pb-8 overflow-hidden">
                            {uniqueCovers.length > 0 ? (
                              <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 opacity-30">
                                {uniqueCovers.map((cover, idx) => (
                                  <img key={idx} src={cover} alt="" className="w-full h-full object-cover" />
                                ))}
                              </div>
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-40`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/20" />
                            <div className="absolute inset-0 backdrop-blur-3xl" />

                            {!uniqueCovers.length && (
                              <div className="absolute right-[-5%] top-[-5%] text-[20rem] opacity-10 rotate-[15deg] select-none pointer-events-none">
                                {cat.icon}
                              </div>
                            )}

                            <div className="relative z-10 w-full  mx-auto px-4 sm:px-8 md:px-6 lg:px-6 flex flex-col flex-1 justify-left">
                              <div>
                                <button
                                  onClick={() => setSelectedGenre(null)}
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                                >
                                  <ChevronLeft size={24} />
                                </button>
                              </div>

                              <div className="mt-6 md:mt-8">
                                <div className="text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Category</div>
                                <h2 className="text-4xl sm:text-5xl md:text-8xl font-black mb-6 leading-tight md:leading-none text-white">{selectedGenre}</h2>

                                <div className="flex items-center gap-3 font-bold transition-all">
                                  <button
                                    onClick={() => {
                                      if (genreSongs.length > 0) {
                                        audio.setCurrentSong(genreSongs[0]);
                                        audio.setManualQueue(genreSongs.slice(1));
                                        audio.setIsPlaying(true);
                                      }
                                    }}
                                    className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                    title="Play All"
                                  >
                                    <Play fill="currentColor" size={24} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      const shuffled = [...genreSongs].sort(() => Math.random() - 0.5);
                                      if (shuffled.length > 0) {
                                        audio.setCurrentSong(shuffled[0]);
                                        audio.setManualQueue(shuffled.slice(1));
                                        audio.setIsPlaying(true);
                                      }
                                    }}
                                    className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                    title="Shuffle"
                                  >
                                    <Shuffle size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 px-4 sm:px-8 md:px-12 py-6 md:py-8  mx-auto w-full">

                            <div className="flex items-center justify-between mb-8">
                              <h3 className="text-xl font-bold">Recommended Songs</h3>
                              <span className="text-xs text-[#86868b] font-medium uppercase tracking-widest">{genreSongs.length} items</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                              {genreSongs.map((song) => (
                                <div
                                  key={song.id}
                                  onClick={() => {
                                    audio.setCurrentSong(song);
                                    audio.setManualQueue(genreSongs.filter(s => s.id !== song.id));
                                    audio.setIsPlaying(true);
                                  }}
                                  className="flex items-center gap-4 py-1.5 group cursor-pointer transition-all"
                                >
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                                    <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Play size={16} className="text-white fill-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className={`font-bold text-sm truncate transition-colors ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'group-hover:text-[#7c3aed]'}`}>{song.title}</div>
                                      {audio.currentSong?.id === song.id && audio.isPlaying && (
                                        <div className="flex gap-0.5 items-end h-3 mb-0.5">
                                          {[1, 2, 3].map(j => (
                                            <motion.div
                                              key={j}
                                              animate={{ height: ["20%", "100%", "20%"] }}
                                              transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                              className="w-0.5 bg-[#7c3aed] rounded-full"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div
                                      className="text-xs text-[#86868b] truncate hover:text-white transition-colors cursor-pointer inline-block max-w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openArtist(song.artistId);
                                      }}
                                    >
                                      {song.artist}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                                    className={`p-2 transition-all hover:scale-110 ${favorites.includes(song.id) ? 'text-[#7c3aed]' : 'text-[#86868b] hover:text-white'}`}
                                  >
                                    <Heart size={16} fill={favorites.includes(song.id) ? "currentColor" : "none"} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {genreSongs.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-[#86868b]">
                                <ListMusic size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">No songs available for this genre yet.</p>
                              </div>
                            )}

                            {/* Top Artists Row - Moved below Recommended Songs */}
                            {genreArtists.length > 0 && (
                              <div className="mt-12 mb-6">
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-xl font-bold">Top Artists in {selectedGenre}</h3>
                                </div>
                                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
                                  {genreArtists.map(artist => (
                                    <div
                                      key={artist.id}
                                      className="flex-shrink-0 w-32 sm:w-40 group cursor-pointer"
                                      onClick={() => openArtist(artist.id)}
                                    >
                                      <div className="w-full aspect-square rounded-full overflow-hidden mb-3">
                                        <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                      </div>
                                      <div className="text-center">
                                        <div className="font-bold text-sm truncate group-hover:text-[#7c3aed] transition-colors">{artist.name}</div>
                                        <div className="text-xs text-[#86868b]">Artist</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                )}

                {(searchQuery || (currentView !== 'listenNow' && currentView !== 'artists' && currentView !== 'playlists')) && (
                  <div className="mt-4 mb-6">
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-8">
                      {searchQuery ? 'Search Results' : ''}
                    </h2>

                    {currentView === 'favorites' ? (
                      <div className="space-y-8">
                        {(() => {
                          const favoritesList = tracks.filter(s => favorites.includes(s.id));

                          if (favoritesList.length === 0) {
                            return (
                              <div className="py-20 text-center rounded-3xl">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                  <Heart size={32} className="text-[#7c3aed]" />
                                </div>
                                <h4 className="text-lg font-bold mb-1 text-white">No Favorites Yet</h4>
                                <p className="text-sm text-[#86868b]">Songs you love will appear here.</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              {/* Favorites Hero Header */}
                              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-end mb-12">
                                <div className="w-48 h-48 md:w-60 md:h-60 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 group relative cursor-pointer">
                                  <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed] to-[#ff5e3a] flex items-center justify-center">
                                    <Heart size={80} fill="white" className="text-white drop-shadow-lg" />
                                  </div>
                                  <div
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    onClick={() => {
                                      audio.setCurrentSong(favoritesList[0]);
                                      audio.setIsPlaying(true);
                                      audio.setManualQueue(favoritesList.slice(1));
                                    }}
                                  >
                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#7c3aed] shadow-xl">
                                      <Play fill="currentColor" size={32} className="ml-1" />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-1 text-center md:text-left">
                                  <div className="text-[10px] uppercase font-black tracking-[0.3em] text-[#7c3aed] mb-2">Collection</div>
                                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white">
                                    Favorites
                                  </h1>
                                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm text-[#86868b] mb-6">
                                    <span className="font-bold text-white transition-colors hover:text-[#7c3aed] cursor-pointer">Your Music Library</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span>{favoritesList.length} songs</span>
                                  </div>

                                  <div className="flex items-center justify-center md:justify-start gap-3 font-bold transition-all">
                                    <button
                                      onClick={() => {
                                        audio.setCurrentSong(favoritesList[0]);
                                        audio.setIsPlaying(true);
                                        audio.setManualQueue(favoritesList.slice(1));
                                      }}
                                      className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                      title="Play"
                                    >
                                      <Play fill="currentColor" size={24} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const shuffled = [...favoritesList].sort(() => Math.random() - 0.5);
                                        audio.setCurrentSong(shuffled[0]);
                                        audio.setIsPlaying(true);
                                        audio.setManualQueue(favoritesList.slice(1));
                                      }}
                                      className="w-12 h-12 text-white hover:text-[#7c3aed] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                      title="Shuffle"
                                    >
                                      <Shuffle size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                {favoritesList.map((song) => (
                                  <div
                                    key={song.id}
                                    onClick={() => { audio.setCurrentSong(song); audio.setIsPlaying(true); }}
                                    className={`flex items-center gap-4 py-1.5 transition-all duration-300 cursor-pointer group ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : ''}`}
                                  >
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                      <img src={song.coverUrl} className="w-full h-full object-cover" />
                                      {audio.currentSong?.id === song.id && audio.isPlaying && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <div className="flex gap-0.5 items-end h-4 mb-0.5">
                                            {[1, 2, 3].map(j => (
                                              <motion.div
                                                key={j}
                                                animate={{ height: ["30%", "100%", "30%"] }}
                                                transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.1 }}
                                                className="w-0.5 bg-[#7c3aed] rounded-full"
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className={`font-bold text-sm md:text-base truncate ${audio.currentSong?.id === song.id ? 'text-[#7c3aed]' : 'text-white'}`}>
                                        {song.title}
                                      </div>
                                      <div className="text-xs text-[#86868b] truncate mt-0.5">
                                        {song.artist} • {song.album}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
                                          }}
                                          className="p-2 rounded-full hover:bg-white/10 text-[#86868b] transition-colors"
                                        >
                                          <MoreHorizontal size={20} />
                                        </button>

                                        <SongContextMenu
                                          song={song}
                                          activeContextMenu={activeContextMenu}
                                          setActiveContextMenu={setActiveContextMenu}
                                          favorites={favorites}
                                          toggleFavorite={toggleFavorite}
                                          setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                          setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                          openArtist={openArtist}
                                          setSelectedAlbum={setSelectedAlbum}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <div className="h-24" />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
                          {filteredArtists.length > 0 ? (
                            filteredArtists.map(artist => (
                              <div
                                key={artist.id}
                                onClick={() => openArtist(artist.id)}
                                className="group flex flex-col items-center gap-3 transition-all cursor-pointer"
                              >
                                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden">
                                  <img src={artist.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-sm lg:text-base">{artist.name}</div>
                                  <div className="text-[10px] text-[#86868b] uppercase tracking-widest mt-1">Artist</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-4 text-center text-[#86868b] text-xs">No artists found</div>
                          )}
                        </div>

                        {searchType === 'albums' && searchQuery && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
                            {filteredAlbums.length > 0 ? (
                              filteredAlbums.map(album => (
                                <div
                                  key={album.id}
                                  className="group space-y-2 cursor-pointer"
                                >
                                  <div className="relative aspect-square rounded-lg overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500 ring-1 ring-white/5">
                                    <img src={album.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-[10px] lg:text-xs truncate">{album.album}</div>
                                    <div className="text-[8px] lg:text-[10px] text-[#86868b] truncate">{album.artist}</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full py-4 text-center text-[#86868b] text-xs">No albums found</div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                          {(() => {
                            let songsToRender;
                            if (currentView === 'favorites') {
                              songsToRender = filteredSongs.filter(s => favorites.includes(s.id));
                            } else {
                              songsToRender = filteredSongs;
                            }

                            return songsToRender.length > 0 ? (
                              songsToRender.map((song) => (
                                <SongCard
                                  key={song.id}
                                  song={song}
                                  active={audio.currentSong?.id === song.id}
                                  onPlay={() => {
                                    audio.setCurrentSong(song);
                                    audio.setIsPlaying(true);
                                  }}
                                  onArtistClick={() => openArtist(song.artistId)}
                                  activeContextMenu={activeContextMenu}
                                  setActiveContextMenu={setActiveContextMenu}
                                  favorites={favorites}
                                  toggleFavorite={toggleFavorite}
                                  setSelectedSongForPlaylist={setSelectedSongForPlaylist}
                                  setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
                                  openArtist={openArtist}
                                  setSelectedAlbum={setSelectedAlbum}
                                />
                              ))
                            ) : (
                              <div className="col-span-full py-8 text-center text-[#86868b] text-xs italic">
                                {currentView === 'favorites' ? 'No favorite songs yet' :
                                  `No results found`}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentView === 'artists' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-4 mb-6"
                  >
                    <h3 className="text-lg lg:text-xl font-semibold mb-6">Artists</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {artists.filter(artist => followedArtists.includes(artist.id)).map(artist => (
                        <div
                          key={artist.id}
                          onClick={() => openArtist(artist.id)}
                          className="group flex flex-col items-center gap-3 transition-all cursor-pointer"
                        >
                          <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden relative ring-2 ring-transparent group-hover:ring-[#7c3aed]/50 transition-all">
                            <img src={artist.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="font-bold text-sm lg:text-base group-hover:text-[#7c3aed] transition-colors">{artist.name}</div>
                              <Check size={12} className="text-[#7c3aed]" />
                            </div>
                            <div className="text-[10px] text-[#86868b] uppercase tracking-widest mt-1">Following</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {followedArtists.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <Users size={48} className="mb-4" />
                        <p className="text-lg font-medium">You haven't followed any artists yet</p>
                        <p className="text-sm">Follow your favorite artists to see them here</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {currentView === 'playlists' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-4 mb-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg lg:text-xl font-semibold">My Playlists</h3>
                      <button
                        onClick={createPlaylist}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-all text-[#7c3aed]"
                      >
                        <Plus size={18} /> New Playlist
                      </button>
                    </div>
                    {userPlaylists.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                        <ListMusic size={40} className="mb-3" />
                        <p className="text-sm font-medium">No playlists yet</p>
                        <p className="text-xs mt-1">Create your first playlist above</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {userPlaylists.map((p) => (
                          <PlaylistCard key={p.id} playlist={p} tracks={tracks} onClick={() => setSelectedPlaylist(p)} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Player Bar */}
        <footer className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:h-24 h-16 z-40 bg-black/95 backdrop-blur-md lg:px-8 px-4 flex items-center justify-between gap-4 transition-all border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          {/* Mobile Progress Bar (Top Rule) */}
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-white/10 lg:hidden z-[60] overflow-hidden">
            <div
              className="h-full bg-[#7c3aed] shadow-[0_0_15px_#7c3aed] transition-all duration-500 ease-linear rounded-r-full"
              style={{ width: `${Math.max(0.5, (audio.progress / (audio.duration || 1)) * 100)}%` }}
            />
          </div>

          {/* Song Info */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) audio.nextSong();
              if (info.offset.x > 50) audio.prevSong();
            }}
            className="flex items-center gap-4 lg:w-1/3 flex-1 min-w-0"
          >
            <div
              onClick={() => setIsOverlayOpen(true)}
              className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
            >
              <img src={audio.currentSong?.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="text-white" size={16} />
              </div>
            </div>
            <div className="min-w-0 flex-1 lg:flex-none">
              <div onClick={() => setIsOverlayOpen(true)} className="cursor-pointer hover:underline">
                <MobileMarquee className="font-semibold text-sm lg:text-base">
                  {audio.currentSong?.title}
                </MobileMarquee>
              </div>
              <div
                className="text-xs lg:text-sm text-[#86868b] truncate cursor-pointer hover:text-[#7c3aed]"
                onClick={() => openArtist(audio.currentSong?.artistId)}
              >
                {audio.currentSong?.artist}
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(audio.currentSong?.id)}
              className={`transition-colors flex-shrink-0 ${favorites.includes(audio.currentSong?.id) ? 'text-[#7c3aed]' : 'text-[#86868b] hover:text-[#7c3aed]'}`}
            >
              <Heart size={18} fill={favorites.includes(audio.currentSong?.id) ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => {
                setSelectedSongForPlaylist(audio.currentSong?.id);
                setIsAddToPlaylistModalOpen(true);
              }}
              className="text-[#86868b] hover:text-[#7c3aed] transition-colors flex-shrink-0"
              title="Add current song to playlist"
            >
              <ListPlus size={18} />
            </button>
          </motion.div>

          {/* Controls (Desktop Only mainly) */}
          <div className="hidden lg:flex flex-col items-center gap-3 flex-1 max-w-xl">
            <div className="flex items-center gap-8">
              <button className="text-[#86868b] hover:text-[var(--text-primary)] transition-colors"><Mic2 size={18} /></button>
              <button onClick={audio.prevSong} className="text-[var(--text-primary)] hover:scale-110 active:scale-95 transition-transform">
                <SkipBack fill="currentColor" size={24} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              </button>
              <button
                onClick={audio.togglePlay}
                className="w-10 h-10 rounded-full bg-[var(--text-primary)] text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
              >
                {audio.isPlaying ? (
                  <Pause fill="currentColor" size={20} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                ) : (
                  <Play className="ml-1" fill="currentColor" size={20} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                )}
              </button>
              <button onClick={audio.nextSong} className="text-[var(--text-primary)] hover:scale-110 active:scale-95 transition-transform">
                <SkipForward fill="currentColor" size={24} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              </button>
              <button className="text-[#86868b] hover:text-[var(--text-primary)] transition-colors"><MoreHorizontal size={18} /></button>
            </div>
            <div className="w-full flex items-center gap-3 text-xs font-medium text-[#86868b]">
              <span>{formatTime(audio.progress)}</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-[#7c3aed] rounded-full"
                  initial={false}
                  animate={{ width: `${(audio.progress / (audio.duration || 1)) * 100}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
                <input
                  type="range"
                  min="0"
                  max={audio.duration || 100}
                  value={audio.progress}
                  onChange={(e) => audio.seek(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span>{formatTime(audio.duration)}</span>
            </div>
          </div>

          {/* Mobile Only Quick Play */}
          <div className="lg:hidden flex items-center gap-8 pr-2">
            <button onClick={audio.togglePlay} className="p-2 text-[#7c3aed] transition-transform active:scale-95">
              {audio.isPlaying ? (
                <Pause size={34} fill="currentColor" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              ) : (
                <Play size={34} fill="currentColor" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              )}
            </button>
          </div>

          {/* Volume & Extras (Desktop Only) */}
          <div className="hidden lg:flex items-center justify-end gap-4 w-1/3">
            <div className="flex items-center gap-3 group">
              <Volume2 size={18} className="text-[#86868b] group-hover:text-[var(--text-primary)]" />
              <div className="w-24 h-1 bg-white/10 rounded-full relative overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-[#86868b] rounded-full"
                  initial={false}
                  animate={{ width: `${audio.volume * 100}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audio.volume}
                  onChange={(e) => audio.setVolume(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-2 rounded-lg transition-colors ${isQueueOpen ? 'text-[#7c3aed]' : 'text-[#86868b] hover:bg-white/5'}`}
              title="Queue"
            >
              <ListMusic size={18} />
            </button>
            <button
              onClick={() => setIsOverlayOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-[#86868b]"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </footer>

        {/* Queue Sidebar */}
        <AnimatePresence>
          {isQueueOpen && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-32 w-80 glass z-40 border-l border-white/5 flex flex-col pt-16 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListMusic className="text-[#7c3aed]" size={20} />
                  <h2 className="text-xl font-bold tracking-tight">Queue</h2>
                </div>
                <button
                  onClick={() => setIsQueueOpen(false)}
                  className="text-[#86868b] hover:text-white transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <Reorder.Group
                axis="y"
                values={audio.queue}
                onReorder={audio.setQueue}
                className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1"
              >
                {audio.queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#86868b] text-center p-8 opacity-40">
                    <ListMusic size={48} className="mb-4 stroke-[1px]" />
                    <p className="text-sm font-bold">Your queue is empty</p>
                    <p className="text-[10px] mt-1 uppercase tracking-widest leading-relaxed">Add some tracks to see them here</p>
                  </div>
                ) : (
                  audio.queue.map((song) => (
                    <Reorder.Item
                      key={song.queueId}
                      value={song}
                      className="group flex items-center gap-3 p-2 rounded-xl bg-white/0 hover:bg-white/5 transition-all cursor-grab active:cursor-grabbing border border-transparent hover:border-white/5"
                    >
                      <div className="text-[#86868b] group-hover:text-white transition-colors">
                        <GripVertical size={14} />
                      </div>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                        <img src={song.coverUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate tracking-tight">{song.title}</div>
                        <div className="text-[10px] text-[#86868b] truncate uppercase tracking-widest">{song.artist}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.setQueue(prev => prev.filter(s => s.queueId !== song.queueId));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[#86868b] hover:text-[#7c3aed] transition-all"
                        title="Remove from queue"
                      >
                        <X size={14} />
                      </button>
                    </Reorder.Item>
                  ))
                )}
              </Reorder.Group>

              {audio.queue.length > 0 && (
                <div className="p-4 border-t border-white/5 bg-black/20">
                  <button
                    onClick={() => audio.setQueue([])}
                    className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-[#86868b] hover:text-[#7c3aed] transition-colors"
                  >
                    Clear Queue
                  </button>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black z-50 flex items-center justify-around px-4 border-t border-white/5">
          <MobileNavItem
            icon={<Home size={18} />}
            label="Home"
            active={currentView === 'listenNow'}
            onClick={() => {
              setCurrentView('listenNow');
              setSearchQuery('');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />

          <MobileNavItem
            icon={<ListMusic size={18} />}
            label="Library"
            active={['playlists', 'favorites', 'artists'].includes(currentView)}
            onClick={() => {
              setCurrentView('playlists');
              setSelectedAlbum(null);
              setSelectedPlaylist(null);
              setSelectedArtist(null);
              setSelectedGenre(null);
            }}
          />
          <MobileNavItem
            icon={<Search size={18} />}
            label="Search"
            active={searchQuery !== '' || isSearchExpanded}
            onClick={() => {
              setIsSearchExpanded(true);
              setTimeout(() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                  // For mobile scroll into view if needed
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            }}
          />
        </nav>
      </main>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isOverlayOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="fixed inset-0 z-50 glass-dark flex flex-col"
          >
            {/* Dynamic Animated BG */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360],
                  x: ['-10%', '10%', '-10%'],
                  y: ['-10%', '10%', '-10%']
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] opacity-30 blur-[150px]"
                style={{ background: `radial-gradient(circle at 50% 50%, ${audio.currentSong?.color || '#000'} 0%, transparent 60%)` }}
              />
              <motion.div
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 270, 180, 90, 0],
                  x: ['10%', '-10%', '10%'],
                  y: ['10%', '-10%', '10%']
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-50%] opacity-20 blur-[150px] mix-blend-overlay"
                style={{ background: `radial-gradient(circle at 50% 50%, #ffffff 0%, transparent 50%)` }}
              />
            </div>

            {/* Header */}
            <div className="relative px-6 pt-6 flex items-center justify-between">
              <button onClick={() => setIsOverlayOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all hover:rotate-90">
                <ChevronDown size={32} />
              </button>
              <div className="flex flex-col items-center">
                <div className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">Now Playing</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2 rounded-full transition-all ${showLyrics ? 'text-[#7c3aed]' : 'text-white/50 hover:text-white'}`}
                >
                  <ListMusic size={24} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsNowPlayingMenuOpen(!isNowPlayingMenuOpen)}
                    className={`p-2 rounded-full transition-all ${isNowPlayingMenuOpen ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                  >
                    <MoreHorizontal size={24} />
                  </button>

                  <AnimatePresence>
                    {isNowPlayingMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => setIsNowPlayingMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute right-0 mt-2 w-56 glass-dark rounded-2xl overflow-hidden z-[70] shadow-2xl border border-white/10"
                        >
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setSelectedSongForPlaylist(audio.currentSong?.id);
                                setIsAddToPlaylistModalOpen(true);
                                setIsNowPlayingMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left text-xs font-medium"
                            >
                              <ListPlus size={16} className="text-[#7c3aed]" /> Add to Playlist
                            </button>
                            <button
                              onClick={() => {
                                audio.addToQueue(audio.currentSong);
                                setIsNowPlayingMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left text-xs font-medium"
                            >
                              <Play size={16} className="text-[#7c3aed]" /> Add to Up Next
                            </button>
                            <button
                              onClick={() => {
                                openArtist(audio.currentSong?.artistId);
                                setIsNowPlayingMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left text-xs font-medium"
                            >
                              <Users size={16} className="text-[#7c3aed]" /> Go to Artist
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAlbum({ name: audio.currentSong.album, artistId: audio.currentSong?.artistId });
                                setIsOverlayOpen(false);
                                setIsNowPlayingMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left text-xs font-medium"
                            >
                              <LayoutGrid size={16} className="text-[#7c3aed]" /> Go to Album
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className={`relative flex-1 flex flex-col ${showLyrics ? 'md:flex-row' : 'items-center justify-center'} overflow-hidden`}>
              {/* Album Art Section (The Card) */}
              <motion.div
                drag={!showLyrics ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -50) setShowLyrics(true);
                }}
                className={`flex flex-col items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.2,1)] ${showLyrics ? '-translate-y-full opacity-0 pointer-events-none h-0 p-0 overflow-hidden md:flex-1 md:h-auto md:translate-y-0 md:opacity-100 md:pointer-events-auto md:w-1/3 md:scale-75 md:opacity-60 md:p-12' : 'flex-1 w-full max-w-xl p-6 md:p-12 cursor-grab active:cursor-grabbing'}`}
              >
                <motion.div
                  layoutId="main-artwork"
                  key={audio.currentSong?.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`w-full ${showLyrics ? 'max-w-[100px] md:max-w-[260px]' : 'max-w-[300px] md:max-w-sm lg:max-w-[420px]'} aspect-square rounded-3xl overflow-hidden shadow-[0_60px_120px_-30px_rgba(0,0,0,0.7)] relative group cursor-grab active:cursor-grabbing`}
                >
                  <img src={audio.currentSong?.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`mt-4 md:mt-8 text-center w-full ${showLyrics ? 'hidden md:block md:text-left max-w-sm' : 'max-w-xl'}`}
                >
                  <div className="text-[11px] md:text-sm font-black text-[#7c3aed] uppercase tracking-[0.2em] mb-2">{audio.currentSong.album}</div>
                  <h2 className={`font-black text-white mb-2 tracking-tight leading-tight ${showLyrics ? 'text-3xl md:text-4xl' : 'text-3xl md:text-5xl lg:text-7xl'}`}>{audio.currentSong?.title}</h2>
                  <div className={`flex items-center justify-center ${showLyrics ? 'md:justify-start' : ''} gap-4`}>
                    <p
                      className="text-lg md:text-xl font-medium text-white/60 cursor-pointer hover:text-[#7c3aed] transition-colors"
                      onClick={() => openArtist(audio.currentSong?.artistId)}
                    >
                      {audio.currentSong?.artist}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Lyrics Section */}
              <motion.div
                drag={showLyrics ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (showLyrics && info.offset.y > 100) setShowLyrics(false);
                }}
                className={`transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.2,1)] flex flex-col h-full min-h-0 ${showLyrics ? 'flex-1 px-6 pt-2 pb-24 md:p-0' : 'translate-y-full opacity-0 pointer-events-none h-0 md:h-auto md:translate-y-0 md:opacity-100 md:pointer-events-auto md:w-2/3 md:opacity-100 md:relative'} ${showLyrics ? '' : 'hidden md:flex md:w-[300px] xl:w-[400px] md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 md:h-[60vh] md:opacity-40 md:hover:opacity-100'}`}
              >
                <div className={`flex items-center gap-3 mb-6 ${showLyrics ? 'justify-start' : 'justify-center md:justify-start'}`}>
                  <div className="px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.2em] bg-white/10 text-white/60 border border-white/5">
                    Lyrics
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 mask-fade custom-scrollbar scroll-smooth">
                  {audio.currentSong.lyrics && (
                    <div className="space-y-6 md:space-y-8 py-24 md:py-48">
                      {audio.currentSong.lyrics.map((line, i) => {
                        const isActive = audio.progress >= line.time &&
                          (!audio.currentSong.lyrics![i + 1] || audio.progress < audio.currentSong.lyrics![i + 1].time);

                        return (
                          <motion.p
                            key={i}
                            initial={{ opacity: 0.2, scale: 0.95 }}
                            animate={{
                              opacity: isActive ? 1 : 0.2,
                              scale: isActive ? 1.05 : 0.95,
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.3)'
                            }}
                            transition={{ duration: 0.4 }}
                            onClick={() => audio.seek(line.time)}
                            ref={(el) => {
                              if (isActive && el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="text-2xl md:text-4xl font-bold cursor-pointer hover:opacity-100 transition-all duration-300 flex flex-col gap-1.5"
                          >
                            <span className="block">{line.text}</span>
                            {line.translation && (
                              <span className={`block text-lg md:text-xl font-medium transition-colors ${isActive ? 'text-white/60' : 'text-white/20'}`}>
                                {line.translation}
                              </span>
                            )}
                          </motion.p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Footer Controls */}
            <div className="relative px-8 pb-8 w-full max-w-4xl mx-auto">
              <div className="flex flex-col gap-6">
                {/* Progress Bar */}
                <div className="group relative">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                    <span>{formatTime(audio.progress)}</span>
                    <div className="flex-1" />
                    <span>{formatTime(audio.duration)}</span>
                  </div>
                  <div
                    className="relative h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group-hover:h-3 transition-all"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      audio.seek(percentage * audio.duration);
                    }}
                  >
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-[#7c3aed] rounded-full z-10"
                      initial={false}
                      animate={{ width: `${(audio.progress / (audio.duration || 1)) * 100}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                    />
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 md:gap-8">
                  <div className="flex items-center gap-1 md:gap-4 w-12">
                    <button
                      onClick={() => setIsShuffled(!isShuffled)}
                      className={`p-2 rounded-full transition-all hover:bg-white/10 ${isShuffled ? 'text-[#7c3aed]' : 'text-white/40'}`}
                    >
                      <Shuffle size={18} className="md:w-5 md:h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-6 md:gap-14 text-white">
                    <button
                      onClick={audio.prevSong}
                      className="p-2 hover:bg-white/10 transition-all active:scale-90 rounded-full"
                    >
                      <SkipBack fill="currentColor" size={28} className="md:w-9 md:h-9" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                    </button>
                    <button
                      onClick={audio.togglePlay}
                      className="w-16 h-16 md:w-20 md:h-20 bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(250,36,60,0.3)] rounded-full"
                    >
                      {audio.isPlaying ? (
                        <Pause fill="currentColor" size={30} className="md:w-10 md:h-10" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                      ) : (
                        <Play className="ml-1" fill="currentColor" size={30} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                      )}
                    </button>
                    <button
                      onClick={audio.nextSong}
                      className="p-2 hover:bg-white/10 transition-all active:scale-90 rounded-full"
                    >
                      <SkipForward fill="currentColor" size={28} className="md:w-9 md:h-9" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 md:gap-4 w-12 justify-end">
                    <button
                      onClick={() => toggleFavorite(audio.currentSong?.id)}
                      className={`p-2 rounded-full transition-all hover:bg-white/10 ${favorites.includes(audio.currentSong?.id) ? 'text-[#7c3aed]' : 'text-white/40'}`}
                    >
                      <Heart size={22} fill={favorites.includes(audio.currentSong?.id) ? "currentColor" : "none"} className="md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Playlist Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-light border border-white/10 p-6 rounded-3xl shadow-2xl z-10"
            >
              <h3 className="text-xl font-bold mb-4">New Playlist</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#86868b] mb-1.5 ml-1">Playlist Name</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmCreatePlaylist()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#7c3aed]/30 transition-all text-sm placeholder:text-[#86868b]"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCreatePlaylist}
                    className="flex-1 py-3 rounded-xl bg-[#7c3aed] text-white font-bold transition-all text-sm shadow-lg shadow-red-500/20"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Playlist Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedPlaylist && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-light border border-white/10 p-6 rounded-3xl shadow-2xl z-10"
            >
              <h3 className="text-xl font-bold mb-4">Edit Playlist</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#86868b] mb-1.5 ml-1">Playlist Name</label>
                  <input
                    type="text"
                    placeholder="Enter playlist name..."
                    value={editPlaylistName}
                    onChange={(e) => setEditPlaylistName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#7c3aed]/30 transition-all text-sm placeholder:text-[#86868b]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#86868b] mb-1.5 ml-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter description..."
                    value={editPlaylistDesc}
                    onChange={(e) => setEditPlaylistDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#7c3aed]/30 transition-all text-sm placeholder:text-[#86868b] resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUpdatePlaylist}
                    className="flex-1 py-3 rounded-xl bg-[#7c3aed] text-white font-bold transition-all text-sm shadow-lg shadow-red-500/20"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 mt-2">
                  <button
                    onClick={handleDeletePlaylist}
                    className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-all text-sm border border-red-500/20"
                  >
                    Delete Playlist
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {isPrivacyPolicyOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyPolicyOpen(false)}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-light border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl z-10 max-h-[85vh] flex flex-col"
            >
              <h3 className="text-2xl font-bold mb-2">Privacy Policy</h3>
              <p className="text-[#86868b] text-sm mb-6">Last updated: June 11, 2026</p>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-6 text-sm text-white/80">
                <section>
                  <h4 className="text-white font-bold text-base mb-2">1. Information We Collect</h4>
                  <p>When you use Rolyang, we collect information you provide directly to us (such as when you create an account) and information automatically collected through your use of the platform (such as your listening history, favorites, and device information).</p>
                </section>

                <section>
                  <h4 className="text-white font-bold text-base mb-2">2. How We Use Your Information</h4>
                  <p>We use the information we collect to provide, maintain, and improve our services, to develop new features, and to protect Rolyang and our users. Your listening history is primarily used to generate better music recommendations for you.</p>
                </section>

                <section>
                  <h4 className="text-white font-bold text-base mb-2">3. Sharing of Information</h4>
                  <p>We do not sell your personal information. We may share information with third-party service providers that perform services on our behalf (such as hosting and database services via Supabase) in compliance with our strict privacy standards.</p>
                </section>

                <section>
                  <h4 className="text-white font-bold text-base mb-2">4. Your Rights</h4>
                  <p>You have the right to access, update, or delete your personal information at any time. You can manage your account settings directly within the app or contact our support team for assistance.</p>
                </section>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setIsPrivacyPolicyOpen(false)}
                  className="px-8 py-3 rounded-xl bg-[#7c3aed] text-white font-bold transition-all hover:bg-[#6d28d9] hover:scale-105 active:scale-95 shadow-lg shadow-[#7c3aed]/20"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Us Modal */}
      <AnimatePresence>
        {isAboutUsOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutUsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-light border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl z-10 flex flex-col items-center text-center overflow-hidden max-h-[85vh]"
            >
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#7c3aed]/20 to-transparent pointer-events-none" />

              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-[#7c3aed] blur-2xl opacity-50 rounded-full" />
                <img src="/rolyang-logo.svg" alt="Rolyang Logo" className="relative z-10 w-full h-full object-contain" />
              </div>

              <h3 className="text-3xl font-black mb-2">Rolyang</h3>
              <p className="text-[#7c3aed] font-bold text-xs tracking-[0.2em] uppercase mb-6">The heartbeat of Tibetan music</p>

              <div className="space-y-4 text-sm text-white/80 leading-relaxed mb-6 text-left px-2 sm:px-4 w-full flex-1 overflow-y-auto custom-scrollbar">
                <p>
                  Built with passion, Rolyang is a modern platform dedicated to preserving both traditional and contemporary Tibetan songs. Our mission is to keep our rich musical heritage accessible to everyone, completely free of charge, with absolutely zero ads between songs.
                </p>
                <p>
                  This project is maintained as a labor of love. However, keeping the servers running and continually improving the platform requires resources.
                </p>
                <p>
                  If you'd like to support the project—whether to help cover our current platform fees or contribute to our development—please contact me at <a href="mailto:paljordawa@gmail.com" className="text-[#7c3aed] hover:underline font-semibold">paljordawa@gmail.com</a>. Your support helps keep this platform alive and thriving for our community.
                </p>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <h4 className="font-bold text-white mb-3 tracking-wide">Our Future Plans:</h4>
                  <ul className="list-disc pl-5 space-y-2 text-white/70">
                    <li><strong className="text-white/90">Contributor & Artist Accounts:</strong> Dedicated portals for artists to manage their profiles and upload their own music.</li>
                    <li><strong className="text-white/90">Mobile Apps:</strong> Official distribution to iOS (App Store) and Android (Play Store) for a native mobile experience.</li>
                    <li><strong className="text-white/90">Smart Features:</strong> Future improvements including auto-lyrics transcription and detection for an immersive sing-along experience.</li>
                  </ul>
                </div>

                <p className="text-xs text-white/50 pt-6 text-center">
                  Version 0.1.0-beta<br />
                  Powered by Kikisoso
                </p>
              </div>

              <button
                onClick={() => setIsAboutUsOpen(false)}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/10"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add to Playlist Modal */}
      <AnimatePresence>
        {isAddToPlaylistModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddToPlaylistModalOpen(false)}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-light border border-white/10 p-6 rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[70vh]"
            >
              <h3 className="text-xl font-bold mb-4 px-1">Add to Playlist</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {userPlaylists.length > 0 ? (
                  userPlaylists.map(playlist => {
                    const hasSong = selectedSongForPlaylist && playlist.songs.includes(selectedSongForPlaylist);
                    return (
                      <button
                        key={playlist.id}
                        onClick={() => toggleSongInPlaylist(playlist.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          <img src={playlist.coverUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate transition-colors ${hasSong ? 'text-[#7c3aed]' : 'group-hover:text-[#7c3aed]'}`}>{playlist.name}</div>
                          <div className="text-[10px] text-[#86868b]">{playlist.songs.length} songs</div>
                        </div>
                        {hasSong ? (
                          <div className="text-[10px] font-bold text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-1 rounded-md uppercase tracking-wider">Added</div>
                        ) : (
                          <Plus size={16} className="text-[#86868b] group-hover:text-[#7c3aed]" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-[#86868b] mb-4">You haven't created any playlists yet.</p>
                    <button
                      onClick={() => {
                        setIsAddToPlaylistModalOpen(false);
                        createPlaylist();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-bold transition-all"
                    >
                      Create First Playlist
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsAddToPlaylistModalOpen(false)}
                className="mt-4 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-all text-sm"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-[100] bg-black overflow-y-auto no-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="min-h-full w-full flex flex-col items-center justify-center p-6 max-w-md mx-auto"
            >
              <button
                onClick={() => setIsProfileOpen(false)}
                className="fixed top-6 right-6 w-10 h-10 rounded-none bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-95"
              >
                <X size={20} strokeWidth={2} strokeLinejoin="miter" strokeLinecap="square" />
              </button>
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ff4d61] flex items-center justify-center shadow-lg shadow-[#7c3aed]/10 ring-2 ring-white/5 overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-white" />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-0.5 tracking-tight">
                    {user?.user_metadata?.full_name || user?.email || 'User Account'}
                  </h3>
                  <p className="text-[9px] text-[#86868b] font-bold uppercase tracking-[0.2em]">Music Member</p>
                </div>

                <div className="w-full space-y-1 mt-4">
                  <button
                    onClick={async () => {
                      if (user) {
                        await supabase.auth.signOut();
                      }
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="w-full flex items-center gap-4 py-2.5 group transition-all text-left border-b border-white/5"
                  >
                    <div className="text-[#7c3aed] group-hover:scale-110 transition-transform">
                      <LogIn size={18} />
                    </div>
                    <span className="font-semibold text-xs text-white">{user ? 'Logout' : 'Login'}</span>
                  </button>

                  <button onClick={() => setIsPrivacyPolicyOpen(true)} className="w-full flex items-center gap-4 py-2.5 group transition-all text-left border-b border-white/5">
                    <div className="text-[#86868b] group-hover:text-white transition-colors group-hover:scale-110 transition-transform">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="font-semibold text-xs text-white">Privacy Policy</span>
                  </button>

                  <button onClick={() => setIsAboutUsOpen(true)} className="w-full flex items-center gap-4 py-2.5 group transition-all text-left">
                    <div className="text-[#86868b] group-hover:text-white transition-colors group-hover:scale-110 transition-transform">
                      <Info size={18} />
                    </div>
                    <span className="font-semibold text-xs text-white">About Us</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="mt-6 text-[#7c3aed] font-bold uppercase tracking-[0.2em] text-[9px] hover:underline"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${active
        ? 'bg-gradient-to-r from-[#7c3aed]/15 to-[#7c3aed]/5 text-[#a78bfa] font-bold shadow-[0_4px_20px_rgba(124,58,237,0.12)] border border-[#7c3aed]/20'
        : 'text-[#86868b] hover:text-[var(--text-primary)] hover:bg-white/[0.04] border border-transparent'
        }`}
    >
      {active && (
        <div className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full bg-[#7c3aed] shadow-[0_0_8px_#7c3aed]" />
      )}
      <div className={`transition-all duration-300 ${active ? 'scale-110 text-[#a78bfa]' : 'text-[#86868b] group-hover:scale-110 group-hover:text-[var(--text-primary)]'}`}>
        {cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className="text-sm font-medium tracking-wide transition-colors duration-200">{label}</span>
    </div>
  );
}

function SongCard({
  song,
  active,
  onPlay,
  onArtistClick,
  activeContextMenu,
  setActiveContextMenu,
  favorites,
  toggleFavorite,
  setSelectedSongForPlaylist,
  setIsAddToPlaylistModalOpen,
  openArtist,
  setSelectedAlbum
}: {
  key?: React.Key,
  song: any,
  active: boolean,
  onPlay: () => void,
  onArtistClick?: () => void,
  activeContextMenu: string | null,
  setActiveContextMenu: (id: string | null) => void,
  favorites: string[],
  toggleFavorite: (id: string) => void,
  setSelectedSongForPlaylist: (id: string | null) => void,
  setIsAddToPlaylistModalOpen: (open: boolean) => void,
  openArtist: (id: string) => void,
  setSelectedAlbum: (album: { name: string, artistId: string } | null) => void
}) {
  return (
    <div className="group space-y-2 cursor-pointer relative">
      <div className="relative aspect-square rounded-lg overflow-hidden transition-all duration-500">
        <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="w-10 h-10 rounded-none bg-white text-black flex items-center justify-center hover:bg-gray-100 transition-all scale-110 active:scale-95"
            >
              {active ? (
                <Pause fill="currentColor" size={18} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              ) : (
                <Play className="ml-0.5" fill="currentColor" size={18} strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="min-w-0 pr-6 relative">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className={`font-medium text-[9px] lg:text-[11px] truncate ${active ? 'text-[#7c3aed]' : ''}`}>{song.title}</div>
        </div>
        <div
          className="text-[8px] lg:text-[9px] text-[#86868b] truncate hover:text-[var(--text-primary)] inline-block max-w-full"
          onClick={(e) => {
            e.stopPropagation();
            onArtistClick?.();
          }}
        >
          {song.artist}
        </div>
        <div className="absolute right-0 top-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveContextMenu(activeContextMenu === song.id ? null : song.id);
            }}
            className="p-1 rounded-full hover:bg-white/10 text-[#86868b] transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          <SongContextMenu
            song={song}
            activeContextMenu={activeContextMenu}
            setActiveContextMenu={setActiveContextMenu}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            setSelectedSongForPlaylist={setSelectedSongForPlaylist}
            setIsAddToPlaylistModalOpen={setIsAddToPlaylistModalOpen}
            openArtist={openArtist}
            setSelectedAlbum={setSelectedAlbum}
          />
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ playlist, tracks, onClick }: { key?: React.Key, playlist: any, tracks: any[], onClick: () => void }) {
  const renderBackground = () => {
    const covers: string[] = [];
    if (playlist.songs && playlist.songs.length > 0) {
      for (const songId of playlist.songs) {
        const song = tracks.find((t: any) => t.id === songId);
        if (song && song.coverUrl && !covers.includes(song.coverUrl)) {
          covers.push(song.coverUrl);
          if (covers.length === 4) break;
        }
      }
    }

    if (covers.length === 0) {
      return (
        <img
          src={playlist.coverUrl}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
      );
    }

    if (covers.length === 1) {
      return (
        <img
          src={covers[0]}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
      );
    }

    const gridCovers = [...covers];
    while (gridCovers.length < 4) {
      gridCovers.push(covers[gridCovers.length % covers.length]);
    }

    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 transition-transform duration-1000 group-hover:scale-110">
        {gridCovers.map((src, idx) => (
          <img key={idx} src={src} className="w-full h-full object-cover" />
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className="relative h-40 lg:h-48 rounded-2xl overflow-hidden group cursor-pointer border border-white/5 shadow-xl"
    >
      {renderBackground()}
      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-4 flex flex-col justify-end translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
        <h4 className="text-white text-sm lg:text-base font-bold mb-0.5 drop-shadow-md">{playlist.name}</h4>
        <p className="text-white/60 text-[9px] lg:text-xs line-clamp-1">{playlist.description}</p>
      </div>
    </div>
  );
}

function FeaturedSong({ song, onClick, onArtistClick }: { key?: React.Key, song: any, onClick: () => void, onArtistClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-2 transition-all cursor-pointer group"
    >
      <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden flex-shrink-0">
        <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[7px] font-bold text-[#7c3aed] uppercase tracking-widest mb-0.5">Recommended</div>
        <h4 className="font-bold text-xs lg:text-sm truncate mb-0.5">{song.title}</h4>
        <p
          className="text-[#86868b] text-[10px] lg:text-[11px] truncate hover:text-[var(--text-primary)]"
          onClick={(e) => {
            e.stopPropagation();
            onArtistClick?.();
          }}
        >
          {song.artist} • {song.album}
        </p>
      </div>
      <button className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="ml-0.5 text-[var(--text-primary)]" size={14} fill="currentColor" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
      </button>
    </div>
  );
}

function HomeSongCard({ song, onClick }: { key?: React.Key, song: any, onClick: () => void }) {
  return (
    <div className="group space-y-2 cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square rounded-lg overflow-hidden transition-all duration-500">
        <img src={song.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-none bg-white/10 flex items-center justify-center border border-white/10 text-white">
            <Play fill="white" size={18} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
          </div>
        </div>
      </div>
      <div className="min-w-0 px-1">
        <div className="font-bold text-[10px] lg:text-xs truncate group-hover:text-[#7c3aed] transition-colors mb-0.5">{song.title}</div>
        <div className="text-[9px] text-[#86868b] truncate">{song.artist}</div>
      </div>
    </div>
  );
}

function AlbumCard({ album, onClick }: { key?: React.Key, album: any, onClick: () => void }) {
  return (
    <div className="group space-y-2 cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square rounded-lg overflow-hidden transition-all duration-500">
        <img src={album.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-none bg-white/10 flex items-center justify-center border border-white/10 text-white">
            <Play fill="white" size={18} className="ml-1" strokeWidth={0} strokeLinejoin="miter" strokeLinecap="square" />
          </div>
        </div>
      </div>
      <div className="min-w-0 px-1">
        <div className="font-bold text-[10px] lg:text-xs truncate group-hover:text-[#7c3aed] transition-colors mb-0.5">{album.album}</div>
        <div className="text-[9px] text-[#86868b] truncate">{album.artist}</div>
      </div>
    </div>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${active ? 'text-[#7c3aed]' : 'text-[#86868b]'}`}>
      <div className="transition-transform duration-300">
        {icon}
      </div>
      <span className="text-[9px] font-medium tracking-tight whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Rolyang Login / Onboarding Screen ────────────────────────────────────────

function OnboardingScreen({
  openPrivacyPolicy,
  openAboutUs
}: {
  openPrivacyPolicy: () => void,
  openAboutUs: () => void
}) {
  const handleOAuth = async (provider: 'google' | 'facebook') => {
    if (!isSupabaseConfigured) {
      alert("Supabase configuration is missing. Authentication is unavailable.");
      return;
    }
    const isLocal = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.') ||
      window.location.hostname.endsWith('.local');
    const redirectUrl = isLocal ? window.location.origin : 'https://www.rolyang.app';
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-between py-16 px-6 overflow-hidden"
    >
      <motion.div
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[800px] h-[800px] bg-[#450af5] rounded-full blur-[150px] pointer-events-none"
      />
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.6 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="relative z-10 flex flex-col items-center gap-4 mt-12"
      >
        <motion.div
          animate={{
            filter: [
              'drop-shadow(0 0 15px rgba(255,0,128,0.6))',
              'drop-shadow(0 0 15px rgba(0,255,255,0.6))',
              'drop-shadow(0 0 15px rgba(128,0,255,0.6))',
              'drop-shadow(0 0 15px rgba(255,0,128,0.6))',
            ],
            y: [0, -8, 4, 0],
            rotate: [0, 3, -3, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-32 h-32 md:w-40 md:h-40"
        >
          <img src="/rolyang-logo.svg" alt="Rolyang" className="w-full h-full object-contain drop-shadow-2xl" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl text-white tracking-tighter drop-shadow-lg font-bold">Rolyang</h1>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="w-full max-w-sm relative z-10 flex flex-col items-center gap-6"
      >
        <p className="text-white/60 text-center text-sm font-medium">From the Grasslands to the World: Preserving Heritage, One Song at a Time</p>
        <div className="w-full space-y-4">
          <button onClick={() => handleOAuth('google')} className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 px-6 rounded-full hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(255,255,255,0.1)] transition-transform duration-300">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          <button onClick={() => handleOAuth('facebook')} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-bold py-3.5 px-6 rounded-full hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(24,119,242,0.3)] transition-transform duration-300">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.791-4.667 4.529-4.667 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </button>
        </div>
        <p className="text-[11px] text-white/25 text-center font-medium">
          By continuing, you agree to Rolyang's <button onClick={openPrivacyPolicy} className="text-white/50 hover:underline">Privacy Policy</button>.<br />
          <button onClick={openAboutUs} className="text-white/50 hover:underline mt-2">Learn more About Us</button>
        </p>
      </motion.div>
    </motion.div>
  );
}
