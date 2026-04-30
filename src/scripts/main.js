import { navigate } from 'astro:transitions/client';
import { $likedTracks, $followedArtists, toggleLike, toggleFollow } from '../store/playerStore';
import { supabase } from '../lib/supabase';

// --- Initialization ---

export function initApp() {
  console.log('[App] Initializing Main Script');

  // Maps the legacy appNavigate to Astro's official router
  window.appNavigate = (href) => {
    console.log('[App] Navigating to:', href);
    navigate(href);
  };

  // Define playerPlay FIRST
  window.playerPlay = window.playerPlay || function (payload) {
    window.dispatchEvent(new CustomEvent('player:play', { detail: payload }));
  };

  setupPlayerClickHandler();
  setupShareButton();
  setupProfileDropdown();
  setupHeaderScroll();
  setupPlayerExpandedListener();
  setupBottomNavVisibility();
  setupPlayerReveal();
  setupLikeLogic();
  setupFollowLogic();
  setupPlaylistGlobalLogic();
  setupTrackContextMenu();
  setupTrackHighlighting();
  
  // Initial library render
  renderLibrary('playlists');
  
  window.dispatchEvent(new Event('app:init'));
}

// --- Player Logic ---

function setupPlayerClickHandler() {
  document.addEventListener('click', function(ev) {
    var target = ev.target;
    if (!target) return;

    var actionBtn = target.closest('.js-like-btn, .js-add-to-playlist-btn, .js-track-more-btn, button:not([data-player-album]):not([data-player-book])');
    if (actionBtn) return;
    
    var link = target.closest('a');
    if (link && !link.hasAttribute('data-player-title')) return;

    var el = target.closest('[data-player-album], [data-player-book]');
    if (el) {
      ev.preventDefault();
      ev.stopPropagation();
      
      var albumId = el.getAttribute('data-player-album') || el.getAttribute('data-player-book');
      var chapIndex = el.getAttribute('data-player-chap') ? Number(el.getAttribute('data-player-chap')) : 0;
      var trackId = el.getAttribute('data-track-id');
      var expand = el.getAttribute('data-player-expand') !== 'false';
      
      var titleElement = el.querySelector('[data-player-title]');
      var title = el.getAttribute('data-track-title') || (titleElement ? titleElement.textContent.trim() : null);
      var artist = el.getAttribute('data-artist-name');
      
      var payload = { bookId: albumId, chapIndex: chapIndex, play: true, expand: expand, trackId: trackId, title: title, artist: artist };
      
      var isMainPlayBtn = el.classList.contains('js-main-play-btn');
      var isPlayingThis = false;
      if (isMainPlayBtn && window.__nanostores_player) {
         var currentTrack = window.__nanostores_player.$currentTrack?.get();
         if (currentTrack && albumId) {
             if (String(albumId) === String(currentTrack.bookId)) isPlayingThis = true;
             else if (albumId === 'liked-songs' && window.location.pathname.includes('/collection/tracks')) {
                 if (document.querySelector('[data-player-row][data-track-id="' + currentTrack.trackId + '"]')) {
                     isPlayingThis = true;
                 }
             }
         }
         if (isPlayingThis) {
            window.__nanostores_player.togglePlay();
            return;
         }
      }

      if (window.playerPlay) {
        window.playerPlay(payload);
      }
    }
  });
}

function setupShareButton() {
  document.addEventListener('click', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-share-button]') : null;
    if (!el) return;
    ev.preventDefault();
    const share = { title: document.title, url: location.href };
    if (navigator.share) navigator.share(share).catch(() => {});
    else navigator.clipboard?.writeText(share.title + ' — ' + share.url);
  });
}

function setupProfileDropdown() {
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const logoutBtn = document.getElementById('logout-btn');

  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = profileDropdown.classList.contains('opacity-0');
      if (isHidden) {
        profileDropdown.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
        profileDropdown.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
      } else {
        profileDropdown.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        profileDropdown.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
      }
    });

    document.addEventListener('click', (e) => {
      if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
        profileDropdown.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        profileDropdown.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
      }
    });
  }
}

function setupHeaderScroll() {
  const mainContent = document.getElementById('main-content');
  const mainHeader = document.getElementById('main-header');
  if(mainContent && mainHeader) {
    mainContent.addEventListener('scroll', () => {
      if (mainContent.scrollTop > 40) {
        mainHeader.style.backgroundColor = 'rgba(15, 17, 26, 0.85)';
        mainHeader.style.backdropFilter = 'blur(12px)';
        mainHeader.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        mainHeader.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      } else {
        mainHeader.style.backgroundColor = 'transparent';
        mainHeader.style.backdropFilter = 'none';
        mainHeader.style.boxShadow = 'none';
        mainHeader.style.borderBottom = 'none';
      }
    });
  }
}

function setupPlayerExpandedListener() {
  const update = (expanded) => { /* Logic was empty in Layout */ };
  try { update(localStorage.getItem('player:expanded') === 'true'); } catch(e){}
  window.addEventListener('player:expanded', (ev) => { 
    try { update(ev && ev.detail && ev.detail.expanded === true); } catch(e){} 
  });
}

function setupBottomNavVisibility() {
  const update = (expanded) => {
     var ftr = document.querySelector('[data-bottom-nav]'); 
     var shell = document.querySelector('[data-player-shell]');
     if (ftr) { 
       if (expanded) {
         ftr.style.transform = 'translateY(100%)';
         if(window.innerWidth < 768 && shell) {
            shell.style.bottom = '0px';
            shell.style.left = '0px';
            shell.style.right = '0px';
            shell.style.borderRadius = '0px';
            shell.style.height = '100dvh';
            shell.style.zIndex = '1000';
         }
       } else {
         ftr.style.transform = 'translateY(0)';
         if(window.innerWidth < 768 && shell) {
            shell.style.bottom = '70px';
            shell.style.left = '10px';
            shell.style.right = '10px';
            shell.style.borderRadius = '16px';
            shell.style.height = '62px';
            shell.style.zIndex = '50';
         }
       }
     }
  };
  try { update(localStorage.getItem('player:expanded') === 'true'); } catch(e){}
  window.addEventListener('player:expanded', (ev) => { 
    try { update(ev && ev.detail && ev.detail.expanded === true); } catch(e){} 
  });
}

function setupPlayerReveal() {
  function reveal() {
    const shell = document.querySelector('[data-player-shell]');
    if (!shell) return;
    if (shell.dataset.hidden !== 'false') shell.dataset.hidden = 'false';
  }
  window.addEventListener('player:now-playing', (ev) => {
    if (ev && ev.detail && ev.detail.isPlaying !== false) reveal();
  });
  window.addEventListener('player:play', () => reveal());
  try {
    if (window.__playerNowPlaying && window.__playerNowPlaying.isPlaying !== false) reveal();
  } catch (e) {}
}

// --- Library Logic ---

export function renderLibrary(filter = 'albums') {
  const container = document.getElementById('library-list-container');
  const pills = document.querySelectorAll('.js-library-pill');
  if (!container) return;
  
  if (!window.__libraryData) {
    const dataTag = document.getElementById('library-data-json');
    if (dataTag) {
       try {
         window.__libraryData = JSON.parse(dataTag.textContent || '[]');
       } catch(e) {}
    }
  }

  const allAlbums = window.__libraryData;
  if (!Array.isArray(allAlbums)) return;
  
  pills.forEach(p => {
    if (p.getAttribute('data-library-filter') === filter) {
      p.classList.add('bg-white', 'text-black');
      p.classList.remove('bg-white/10', 'text-white');
    } else {
      p.classList.remove('bg-white', 'text-black');
      p.classList.add('bg-white/10', 'text-white');
    }
  });

  let items = [];
  const likes = $likedTracks.get();

  if (filter === 'playlists') {
    items = [{
      id: 'liked-songs',
      title: 'Liked Songs',
      artist: 'Playlist',
      isLikedSongs: true,
      count: Object.keys(likes).length,
      cover: 'gradient'
    }];
    const userPlaylists = window.__userPlaylists || [];
    items = [...items, ...userPlaylists.map(p => ({ ...p, artist: 'Playlist' }))];
  } else if (filter === 'albums') {
    items = allAlbums;
  } else if (filter === 'artists') {
    const artistsMap = new Map();
    const followed = $followedArtists.get();
    allAlbums.forEach(a => {
      if (!artistsMap.has(a.artist)) {
        artistsMap.set(a.artist, { 
          id: a.id, 
          title: a.artist, 
          cover: a.cover,
          isArtist: true,
          isFollowed: !!followed[a.artist]
        });
      }
    });
    items = Array.from(artistsMap.values()).sort((a, b) => (b.isFollowed ? 1 : 0) - (a.isFollowed ? 1 : 0));
  }

  if (items.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-white/40 text-sm italic">No items found in your ${filter}.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const href = item.isLikedSongs ? '/collection/tracks' : (item.isArtist ? `/artist/${encodeURIComponent(item.title)}` : (item.artist === 'Playlist' ? `/playlist/${item.id}` : `/album/${item.id}`));
    return `
      <a href="${href}" class="flex items-center gap-3 group cursor-pointer hover:bg-white/10 p-2 rounded-md transition-colors relative no-underline" data-library-item>
        <div class="shrink-0 relative">
          ${item.cover && item.cover !== 'gradient' ? `<img src="${item.cover}" alt="${item.title}" class="w-12 h-12 rounded ${item.isArtist ? 'rounded-full' : ''} object-cover shadow-[0_4px_10px_rgba(0,0,0,0.3)]" />` : ''}
          ${item.isLikedSongs ? `<div class="absolute inset-0 rounded bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center"><svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path></svg></div>` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate text-white flex items-center gap-2">
            ${item.title}
            ${item.isFollowed ? '<div class="w-2 h-2 rounded-full bg-brand-primary"></div>' : ''}
          </div>
          <div class="text-[12px] text-white/50 truncate mt-0.5">${item.isArtist ? 'Artist' : (item.isLikedSongs ? `Playlist • ${item.count} songs` : 'Album • ' + (item.artist || ''))}</div>
        </div>
      </a>
    `;
  }).join('');
}

// --- Like/Follow Logic ---

function setupLikeLogic() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-like-btn');
    if (btn) {
      const albumId = btn.getAttribute('data-album-id');
      const chapId = btn.getAttribute('data-chap-id');
      if (albumId && chapId) {
        if (window.__nanostores_player && typeof window.__nanostores_player.toggleLike === 'function') {
          window.__nanostores_player.toggleLike(albumId, chapId);
        } else {
          toggleLike(albumId, chapId);
        }
      }
    }
  });

  $likedTracks.subscribe((likes) => {
    document.querySelectorAll('.js-like-btn').forEach((btn) => {
      const albumId = btn.getAttribute('data-album-id');
      const chapId = btn.getAttribute('data-chap-id');
      const isLiked = !!likes[`${albumId}:${chapId}`];
      btn.querySelector('.empty-heart')?.classList.toggle('hidden', isLiked);
      btn.querySelector('.filled-heart')?.classList.toggle('hidden', !isLiked);
    });
  });
}

function setupFollowLogic() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-follow-btn');
    if (btn) {
      const name = btn.getAttribute('data-artist-name');
      if (name) {
        if (window.__nanostores_player) window.__nanostores_player.toggleFollow(name);
        else toggleFollow(name);
      }
    }
  });

  $followedArtists.subscribe((followed) => {
    document.querySelectorAll('.js-follow-btn').forEach((btn) => {
      const name = btn.getAttribute('data-artist-name');
      const isFollowed = !!followed[name || ""];
      btn.textContent = isFollowed ? 'Following' : 'Follow';
      if (isFollowed) {
         btn.classList.add('bg-[#1db954]', 'border-[#1db954]', 'text-black');
         btn.classList.remove('border-white/30', 'text-white');
      } else {
         btn.classList.remove('bg-[#1db954]', 'border-[#1db954]', 'text-black');
         btn.classList.add('border-white/30', 'text-white');
      }
    });
    // Refresh library if on artists tab
    const activePill = document.querySelector('.js-library-pill.bg-white');
    if (activePill?.getAttribute('data-library-filter') === 'artists') renderLibrary('artists');
  });
}

// --- Playlist Global Logic ---

function setupPlaylistGlobalLogic() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-add-to-playlist-btn');
    if (!btn) return;
    const trackId = btn.getAttribute('data-track-id');
    if (trackId) showPlaylistSelector(trackId, btn);
  });

  document.getElementById('create-playlist-btn')?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    window.createPlaylist();
  });

  // Modal setup
  const modal = document.getElementById('create-playlist-modal');
  const cancelBtn = document.getElementById('cancel-playlist-btn');
  const confirmBtn = document.getElementById('confirm-playlist-btn');
  const input = document.getElementById('playlist-name-input');
  const descInput = document.getElementById('playlist-description-input');

  let currentEditId = null;
  let trackToAddOnCreate = null;

  window.createPlaylist = (trackId) => {
    currentEditId = null;
    trackToAddOnCreate = trackId || null;
    if (modal && input && confirmBtn) {
      document.getElementById('modal-title').textContent = 'Create Playlist';
      confirmBtn.textContent = 'Create';
      input.value = `My Playlist #${(window.__userPlaylists?.length || 0) + 1}`;
      descInput.value = '';
      modal.classList.remove('hidden');
      input.focus(); input.select();
    }
  };

  window.openEditPlaylistModal = (data) => {
    currentEditId = data.id;
    if (modal && input && confirmBtn) {
      document.getElementById('modal-title').textContent = 'Edit Details';
      confirmBtn.textContent = 'Save';
      input.value = data.title || '';
      descInput.value = data.description || '';
      modal.classList.remove('hidden');
      input.focus();
    }
  };

  const closeModal = () => modal?.classList.add('hidden');
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  confirmBtn?.addEventListener('click', async () => {
    const title = input.value.trim();
    const description = descInput.value.trim();
    if (!title) return;

    const isEdit = !!currentEditId;
    confirmBtn.textContent = isEdit ? 'Saving...' : 'Creating...';
    confirmBtn.disabled = true;

    try {
      const url = isEdit ? `/api/library/playlists/${currentEditId}` : '/api/library/playlists';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      
      if (res.ok) {
        if (!isEdit) {
          const newPlaylist = await res.json();
          window.__userPlaylists = [newPlaylist, ...(window.__userPlaylists || [])];
          if (trackToAddOnCreate) {
            await fetch('/api/library/playlists/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playlistId: newPlaylist.id, trackId: trackToAddOnCreate })
            });
          }
          renderLibrary('playlists');
          closeModal();
          window.appNavigate(`/playlist/${newPlaylist.id}`);
        } else {
          closeModal();
          if (window.__userPlaylists) {
            window.__userPlaylists = window.__userPlaylists.map(p => p.id === currentEditId ? { ...p, title, description } : p);
          }
          renderLibrary('playlists');
          // Simple UI update for current page
          const t = document.querySelector('h1'); if(t) t.textContent = title;
        }
      }
    } finally {
       confirmBtn.textContent = isEdit ? 'Save' : 'Create';
       confirmBtn.disabled = false;
    }
  });

  // Library pill clicks
  document.addEventListener('click', (e) => {
    const pill = e.target.closest('.js-library-pill');
    if (pill) {
      const filter = pill.getAttribute('data-library-filter');
      if (filter) renderLibrary(filter);
    }
  });
}

export function showPlaylistSelector(trackId, anchor) {
  let selector = document.getElementById('global-playlist-selector');
  if (!selector) {
    selector = document.createElement('div');
    selector.id = 'global-playlist-selector';
    selector.className = 'fixed z-[100] bg-[#282828] border border-white/10 rounded shadow-2xl py-2 w-48 hidden';
    document.body.appendChild(selector);
  }

  const playlists = window.__userPlaylists || [];
  selector.innerHTML = `
    <div class="px-4 py-2 text-[11px] font-bold text-white/50 uppercase tracking-wider">Add to playlist</div>
    ${playlists.map((p) => `
      <div class="px-4 py-2 text-sm hover:bg-white/10 cursor-pointer text-white truncate" data-playlist-id="${p.id}">${p.title}</div>
    `).join('')}
  `;

  const rect = anchor.getBoundingClientRect();
  selector.style.top = `${rect.bottom + window.scrollY + 5}px`;
  selector.style.left = `${rect.left + window.scrollX - 160}px`;
  selector.classList.remove('hidden');

  const items = selector.querySelectorAll('[data-playlist-id]');
  items.forEach(item => {
    item.addEventListener('click', async () => {
      const playlistId = item.getAttribute('data-playlist-id');
      const res = await fetch('/api/library/playlists/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId, trackId })
      });
      if (res.ok) {
         const orig = anchor.innerHTML;
         anchor.innerHTML = '<svg class="w-4 h-4 text-[#1db954]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
         setTimeout(() => { anchor.innerHTML = orig; }, 2000);
      }
      selector?.classList.add('hidden');
    });
  });

  const closeOnOutside = (e) => {
    if (selector && !selector.contains(e.target) && e.target !== anchor) {
      selector.classList.add('hidden');
      document.removeEventListener('click', closeOnOutside);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnOutside), 10);
}

function setupTrackContextMenu() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-track-more-btn');
    if (btn) {
      const trackId = btn.getAttribute('data-track-id');
      if (trackId) showTrackContextMenu(trackId, btn);
    }
  });
}

export function showTrackContextMenu(trackId, anchor) {
  let menu = document.getElementById('global-track-context-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'global-track-context-menu';
    menu.className = 'fixed z-[100] bg-[#282828] border border-white/10 rounded shadow-2xl py-1 w-48 hidden';
    document.body.appendChild(menu);
  }

  const trackTitle = anchor.getAttribute('data-track-title') || 'Track';
  const playlistId = window.location.pathname.startsWith('/playlist/') ? window.location.pathname.split('/').pop() : null;

  menu.innerHTML = `
    <div class="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">${trackTitle}</div>
    <div class="h-[1px] bg-white/5 mb-1"></div>
    <div class="px-4 py-2 text-sm hover:bg-white/10 cursor-pointer text-white flex items-center gap-3" id="ctx-add-to-playlist">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
      Add to playlist
    </div>
    ${playlistId ? `
      <div class="px-4 py-2 text-sm hover:bg-white/10 cursor-pointer text-white flex items-center gap-3" id="ctx-remove-from-playlist">
         <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
         Remove from this playlist
      </div>` : ''}
    <div class="h-[1px] bg-white/10 my-1"></div>
    <div class="px-4 py-2 text-sm hover:bg-white/10 cursor-pointer text-white flex items-center gap-3" id="ctx-go-to-artist">
       <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
       Go to artist
    </div>
  `;

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
  menu.style.left = `${rect.left + window.scrollX - 160}px`;
  menu.classList.remove('hidden');

  menu.querySelector('#ctx-add-to-playlist')?.addEventListener('click', () => {
    menu.classList.add('hidden'); showPlaylistSelector(trackId, anchor);
  });

  menu.querySelector('#ctx-remove-from-playlist')?.addEventListener('click', async () => {
    menu.classList.add('hidden');
    const res = await fetch('/api/library/playlists/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, trackId })
    });
    if (res.ok) anchor.closest('[data-player-row]')?.remove();
  });

  const closeMenu = (e) => {
    if (menu && !menu.contains(e.target) && e.target !== anchor) {
      menu.classList.add('hidden');
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// --- Track Highlighting Logic ---

function setupTrackHighlighting() {
  let interval = setInterval(() => {
    if (window.__nanostores_player && window.__nanostores_player.$currentTrack) {
      clearInterval(interval);
      window.__nanostores_player.$currentTrack.listen(updateRows);
      window.__nanostores_player.$isPlaying.listen(updateRows);
      updateRows();
    }
  }, 200);

  document.addEventListener('astro:page-load', updateRows);
  window.addEventListener('app:navigation', updateRows);
}

export function updateRows() {
  if (!window.__nanostores_player || !window.__nanostores_player.$currentTrack) return;
  
  const track = window.__nanostores_player.$currentTrack.get();
  const playing = window.__nanostores_player.$isPlaying.get();
  if (!track) return;

  document.querySelectorAll('[data-player-row]').forEach(row => {
    // Highlight only by trackId — whichever track is playing gets highlighted
    // regardless of whether it's on an album, playlist, or artist page.
    const isCurrent = String(row.dataset.trackId) === String(track.trackId);
    
    const title = row.querySelector('[data-player-title]');
    const index = row.querySelector('[data-index-label]');
    
    if (isCurrent) {
      row.setAttribute('data-active', 'true');
      title?.classList.add('text-[#1db954]');
      if (index) {
        if (playing) index.innerHTML = '<svg fill="#1db954" width="14" height="14" viewBox="0 0 24 24"><path d="M8 9.4c0-.75.7-1.4 1.6-1.4s1.6.65 1.6 1.4v5.2c0 .75-.7 1.4-1.6 1.4s-1.6-.65-1.6-1.4V9.4zM2 13.5c0-.75.7-1.4 1.6-1.4s1.6.65 1.6 1.4v1.1c0 .75-.7 1.4-1.6 1.4S2 15.35 2 14.6v-1.1zm12-7c0-.75.7-1.4 1.6-1.4s1.6.65 1.6 1.4v12.2c0 .75-.7 1.4-1.6 1.4s-1.6-.65-1.6-1.4V6.5zm6 4c0-.75.7-1.4 1.6-1.4s1.6.65 1.6 1.4v4.2c0 .75-.7 1.4-1.6 1.4s-1.6-.65-1.6-1.4v-4.2z"/></svg>';
        else index.innerHTML = index.dataset.originalIndex;
        index.classList.add('text-[#1db954]');
      }
    } else {
      row.removeAttribute('data-active');
      title?.classList.remove('text-[#1db954]');
      if (index) {
        index.innerHTML = index.dataset.originalIndex;
        index.classList.remove('text-[#1db954]');
      }
    }
  });

  document.querySelectorAll('.js-main-play-btn').forEach(btn => {
    const isCurrent = btn.getAttribute('data-player-album') === String(track.bookId);
    btn.querySelector('.play-icon')?.classList.toggle('hidden', isCurrent && playing);
    btn.querySelector('.pause-icon')?.classList.toggle('hidden', !(isCurrent && playing));
  });
}
