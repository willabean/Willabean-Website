// Fetch-based partial injection for shared header / footer / cart drawer.
// Runs as early as possible so the nav is visible before page content paints.

(async function injectPartials() {
  const sitePath = location.pathname;
  const depth = (sitePath.match(/\//g) || []).length - 1;
  // For file:// previews or when served from a subfolder we compute a relative root.
  // We always use absolute paths starting with / assuming the site is served from the domain root.
  const ROOT = '';

  const slots = [
    { id: 'site-header', url: ROOT + '/partials/header.html' },
    { id: 'site-footer', url: ROOT + '/partials/footer.html' },
    { id: 'site-cart',   url: ROOT + '/partials/cart-drawer.html' }
  ];

  await Promise.all(slots.map(async ({ id, url }) => {
    const slot = document.getElementById(id);
    if (!slot) return;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      slot.innerHTML = await res.text();
    } catch (err) {
      console.error('[includes] Failed to load', url, err);
      slot.innerHTML = `<div style="padding:1rem;background:#fee;color:#900;font:14px/1.4 system-ui">
        Failed to load <code>${url}</code>. Run the local server (start.bat / start.sh) — opening index.html directly via file:// won't work.
      </div>`;
    }
  }));

  // Mark the current nav link
  const navKey = document.body.dataset.nav;
  if (navKey) {
    document.querySelectorAll(`[data-nav="${navKey}"]`).forEach(el => el.classList.add('is-current'));
  }

  // Stamp current year in footer
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Notify the rest of the JS that partials are in the DOM
  document.dispatchEvent(new CustomEvent('partials:ready'));
})();
