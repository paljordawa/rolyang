// Client helpers for SPA-like navigation and global player control
// - appNavigate(href): fetches page and swaps <main> content
// - playerPlay(payload): dispatches player:play

window.playerPlay = function (payload) {
  try { window.dispatchEvent(new CustomEvent('player:play', { detail: payload })); } catch (e) { }
};

async function appNavigate(href) {
  try {
    const res = await fetch(href, { cache: 'no-store' });
    if (!res.ok) { location.href = href; return; }
    const html = await res.text();
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const newMain = tmp.querySelector('main');
    if (!newMain) { location.href = href; return; }
    const curMain = document.querySelector('main');
    if (!curMain) { location.href = href; return; }
    // Replace contents
    curMain.innerHTML = newMain.innerHTML;

    // Execute scripts from the fetched main (inline and external)
    newMain.querySelectorAll('script').forEach((s) => {
      const next = document.createElement('script');
      if (s.src) next.src = s.src;
      if (s.type) next.type = s.type;
      if (s.textContent) next.textContent = s.textContent;
      document.head.appendChild(next);
      // remove after executed
      setTimeout(() => next.remove(), 1000);
    });

    // update title if present
    const titleEl = tmp.querySelector('title'); if (titleEl) document.title = titleEl.innerText;
    history.pushState({}, '', href);
    window.dispatchEvent(new Event('app:navigation'));
  } catch (e) {
    location.href = href;
  }
}

// link delegation for internal navigation
document.addEventListener('click', async (ev) => {
  if (ev.defaultPrevented) return;
  const anyEv = ev;
  let el = anyEv.target;
  while (el && el.nodeName !== 'A') el = el.parentElement;
  if (!el || el.nodeName !== 'A') return;
  const href = el.getAttribute && el.getAttribute('href');
  if (!href || (href.startsWith('http') && !href.startsWith(location.origin))) return; // external
  if ((el.hasAttribute && el.hasAttribute('data-no-route')) || el.target === '_blank') return;
  ev.preventDefault();
  appNavigate(href);
});

// popstate -> navigate
window.addEventListener('popstate', (e) => {
  const href = location.pathname + location.search + location.hash;
  appNavigate(href);
});

// delegation for player actions using data attributes
document.addEventListener('click', (ev) => {
  const anyEv = ev;
  const el = anyEv.target && anyEv.target.closest ? anyEv.target.closest('[data-player-book]') : null;
  if (!el) return;
  ev.preventDefault();
  const bookId = el.dataset.playerBook;
  const chapIndex = el.dataset.playerChap ? Number(el.dataset.playerChap) : 0;
  const expand = el.dataset.playerExpand !== 'false';
  const payload = { bookId, chapIndex, play: true, expand };
  // Dispatch the event and let the React player handle playback. Do not attempt
  // to force synchronous playback here — that logic was reverted per project
  // preference to keep the player island handling play behavior.
  window.playerPlay(payload);
});

// simple share button handling
document.addEventListener('click', (ev) => {
  const anyEv = ev;
  const el = anyEv.target && anyEv.target.closest ? anyEv.target.closest('[data-share-button]') : null;
  if (!el) return;
  ev.preventDefault();
  const share = { title: document.title, url: location.href };
  if (navigator.share) navigator.share(share).catch(() => {});
  else navigator.clipboard?.writeText(`${share.title} — ${share.url}`);
});

// Re-dispatch app:navigation on initial load so components relying on it can init
window.dispatchEvent(new Event('app:init'));
