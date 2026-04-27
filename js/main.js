// Mobile nav + misc site-wide interactions. Runs after partials are injected.

document.addEventListener('partials:ready', () => {
  wireMobileNav();
  wireNewsletter();
  wireGalleryThumbs();
});

function wireGalleryThumbs() {
  const main = document.querySelector('[data-gallery-main]');
  if (!main) return;
  const thumbs = document.querySelectorAll('[data-thumb]');
  thumbs.forEach(btn => {
    btn.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('is-active'));
      btn.classList.add('is-active');
      const src = btn.dataset.src || btn.querySelector('img')?.src;
      const alt = btn.dataset.alt || btn.querySelector('img')?.alt || '';
      if (src) {
        main.src = src;
        if (alt) main.alt = alt;
      }
    });
  });
}

function wireMobileNav() {
  const drawer = document.getElementById('mobileNav');
  if (!drawer) return;

  const open  = () => {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };
  const close = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  document.querySelectorAll('[data-open-mobile-nav]').forEach(btn => btn.addEventListener('click', open));
  document.querySelectorAll('[data-close-mobile-nav]').forEach(btn => btn.addEventListener('click', close));
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
}

function wireNewsletter() {
  const form = document.querySelector('[data-newsletter-form]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const email = input?.value?.trim();
    if (!email) return;
    // Placeholder behaviour — will POST to Klaviyo/Mailchimp/Shopify in a later phase.
    form.innerHTML = `<p style="color: var(--cream-deep); font-size: var(--fs-sm); margin:0;">
      Thanks — we'll be in touch.
    </p>`;
  });
}
