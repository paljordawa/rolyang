import fs from 'fs';
import path from 'path';

const appPath = path.join(process.cwd(), 'src', 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Replace the onAuthStateChange hook
const oldAuthEffectRegex = /useEffect\(\(\) => \{\s*if \(\!isSupabaseConfigured\) return;\s*supabase\.auth\.getSession\(\)[\s\S]*?subscription\.unsubscribe\(\);\s*\}, \[\]\);/;

const newAuthEffect = `useEffect(() => {
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
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        localStorage.setItem('rolyang_onboarding_complete', 'true');
        loadUserData(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);`;

code = code.replace(oldAuthEffectRegex, newAuthEffect);

// 2. Replace toggleFavorite
const oldToggleFavRegex = /const toggleFavorite = \(songId: string\) => \{\s*setFavorites\(prev =>\s*prev\.includes\(songId\) \? prev\.filter\(id => id !== songId\) : \[\.\.\.prev, songId\]\s*\);\s*\};/;
const newToggleFav = `const toggleFavorite = async (songId: string) => {
    const isFav = favorites.includes(songId);
    setFavorites(prev => isFav ? prev.filter(id => id !== songId) : [...prev, songId]);
    
    if (user) {
      if (isFav) {
        await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('track_id', songId);
      } else {
        await supabase.from('user_favorites').insert({ user_id: user.id, track_id: songId });
      }
    }
  };`;
code = code.replace(oldToggleFavRegex, newToggleFav);

// 3. Replace toggleFollowArtist
const oldToggleFollowRegex = /const toggleFollowArtist = \(artistId: string\) => \{\s*setFollowedArtists\(prev =>\s*prev\.includes\(artistId\) \? prev\.filter\(id => id !== artistId\) : \[\.\.\.prev, artistId\]\s*\);\s*\};/;
const newToggleFollow = `const toggleFollowArtist = async (artistId: string) => {
    const isFollow = followedArtists.includes(artistId);
    setFollowedArtists(prev => isFollow ? prev.filter(id => id !== artistId) : [...prev, artistId]);
    
    if (user) {
      if (isFollow) {
        await supabase.from('user_follows').delete().eq('user_id', user.id).eq('artist_id', artistId);
      } else {
        await supabase.from('user_follows').insert({ user_id: user.id, artist_id: artistId });
      }
    }
  };`;
code = code.replace(oldToggleFollowRegex, newToggleFollow);

// 4. Replace confirmCreatePlaylist
const oldConfirmCreateRegex = /const confirmCreatePlaylist = \(\) => \{\s*const newPlaylist: Playlist = \{\s*id: `user-\$\{Date\.now\(\)\}`,\s*name: newPlaylistName\.trim\(\) \|\| `New Playlist \$\{userPlaylists\.length \+ 1\}`,\s*description: 'User created playlist',\s*songs: \[\],\s*coverUrl: 'https:\/\/images\.unsplash\.com\/photo-1470225620780-dba8ba36b745\?q=80&w=1000&auto=format&fit=crop'\s*\};\s*setUserPlaylists\(\[\.\.\.userPlaylists, newPlaylist\]\);\s*setSelectedPlaylist\(newPlaylist\);\s*setIsCreateModalOpen\(false\);\s*\};/;
const newConfirmCreate = `const confirmCreatePlaylist = async () => {
    const newPlaylist: Playlist = {
      id: \`user-\${Date.now()}\`,
      name: newPlaylistName.trim() || \`New Playlist \${userPlaylists.length + 1}\`,
      description: 'User created playlist',
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
  };`;
code = code.replace(oldConfirmCreateRegex, newConfirmCreate);

// 5. Replace toggleSongInPlaylist
const oldToggleSongPlaylistRegex = /const toggleSongInPlaylist = \(songId: string\) => \{\s*if \(\!selectedPlaylist\) return;\s*const updatedSongs = selectedPlaylist\.songs\.includes\(songId\)\s*\? selectedPlaylist\.songs\.filter\(id => id !== songId\)\s*: \[\.\.\.selectedPlaylist\.songs, songId\];\s*const updatedPlaylist = \{\s*\.\.\.selectedPlaylist,\s*songs: updatedSongs\s*\};\s*setSelectedPlaylist\(updatedPlaylist\);\s*setUserPlaylists\(prev => prev\.map\(p => p\.id === selectedPlaylist\.id \? updatedPlaylist : p\)\);\s*\};/;
const newToggleSongPlaylist = `const toggleSongInPlaylist = async (songId: string) => {
    if (!selectedPlaylist) return;
    const updatedSongs = selectedPlaylist.songs.includes(songId)
      ? selectedPlaylist.songs.filter(id => id !== songId)
      : [...selectedPlaylist.songs, songId];
      
    const updatedPlaylist = {
      ...selectedPlaylist,
      songs: updatedSongs
    };
    
    setSelectedPlaylist(updatedPlaylist);
    setUserPlaylists(prev => prev.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p));

    if (user && selectedPlaylist.id.startsWith('user-')) {
      await supabase.from('user_playlists').update({ songs: updatedSongs }).eq('id', selectedPlaylist.id).eq('user_id', user.id);
    }
  };`;
code = code.replace(oldToggleSongPlaylistRegex, newToggleSongPlaylist);

// 6. Replace handleEditPlaylist (Save)
const oldSavePlaylistRegex = /const handleSavePlaylistEdit = \(\) => \{\s*if \(\!editingPlaylist\) return;\s*const updatedPlaylist = \{\s*\.\.\.editingPlaylist,\s*name: editPlaylistName\.trim\(\) \|\| editingPlaylist\.name,\s*description: editPlaylistDescription\.trim\(\)\s*\};\s*setUserPlaylists\(prev => prev\.map\(p => p\.id === updatedPlaylist\.id \? updatedPlaylist : p\)\);\s*if \(selectedPlaylist\?.id === updatedPlaylist\.id\) \{\s*setSelectedPlaylist\(updatedPlaylist\);\s*\}\s*setEditingPlaylist\(null\);\s*\};/;
const newSavePlaylist = `const handleSavePlaylistEdit = async () => {
    if (!editingPlaylist) return;
    const updatedPlaylist = {
      ...editingPlaylist,
      name: editPlaylistName.trim() || editingPlaylist.name,
      description: editPlaylistDescription.trim()
    };
    
    setUserPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
    if (selectedPlaylist?.id === updatedPlaylist.id) {
      setSelectedPlaylist(updatedPlaylist);
    }
    setEditingPlaylist(null);

    if (user && updatedPlaylist.id.startsWith('user-')) {
      await supabase.from('user_playlists').update({
        name: updatedPlaylist.name,
        description: updatedPlaylist.description
      }).eq('id', updatedPlaylist.id).eq('user_id', user.id);
    }
  };`;
code = code.replace(oldSavePlaylistRegex, newSavePlaylist);


// 7. Replace handleDeletePlaylist
const oldDeletePlaylistRegex = /const handleDeletePlaylist = \(playlistId: string\) => \{\s*setUserPlaylists\(prev => prev\.filter\(p => p\.id !== playlistId\)\);\s*if \(selectedPlaylist\?.id === playlistId\) \{\s*setSelectedPlaylist\(null\);\s*setCurrentView\('playlists'\);\s*\}\s*\};/;
const newDeletePlaylist = `const handleDeletePlaylist = async (playlistId: string) => {
    setUserPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
      setCurrentView('playlists');
    }
    
    if (user && playlistId.startsWith('user-')) {
      await supabase.from('user_playlists').delete().eq('id', playlistId).eq('user_id', user.id);
    }
  };`;
code = code.replace(oldDeletePlaylistRegex, newDeletePlaylist);


fs.writeFileSync(appPath, code, 'utf8');
console.log('App.tsx user sync refactored successfully.');
