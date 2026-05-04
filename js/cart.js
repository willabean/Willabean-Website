// Cart — runs in Shopify mode if WillabeanShopify.isConfigured() is true,
// otherwise falls back to localStorage. The drawer UI is the same either way.

const LOCAL_STORAGE_KEY = 'willabean_cart_v1';

const LocalCart = {
  items: [],

  load() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch { this.items = []; }
  },

  save() { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.items)); },

  async addItem({ id, title, variant, price, image, properties }) {
    const signature = JSON.stringify({ id, variant, properties });
    const existing = this.items.find(i => i.signature === signature);
    if (existing) existing.quantity += 1;
    else this.items.push({ signature, id, title, variant, price, image, properties, quantity: 1 });
    this.save();
  },

  async addItems(items) {
    for (const it of items) await this.addItem(it);
  },

  async removeItem(signature) {
    this.items = this.items.filter(i => i.signature !== signature);
    this.save();
  },

  async getState() {
    return {
      mode: 'local',
      lines: this.items.map(i => ({
        id: i.signature,
        title: i.title,
        variant: i.variant,
        properties: i.properties,
        price: i.price / 100,
        currency: 'GBP',
        quantity: i.quantity,
        image: i.image
      })),
      subtotal: this.items.reduce((s, i) => s + (i.price * i.quantity), 0) / 100,
      currency: 'GBP',
      count: this.items.reduce((s, i) => s + i.quantity, 0),
      checkoutUrl: null
    };
  }
};

const ShopifyCart = {
  _cache: null,

  async addItem({ variantId, quantity, attributes }) {
    this._cache = await window.WillabeanShopify.addLine({ variantId, quantity, attributes });
  },

  async addItems(items) {
    this._cache = await window.WillabeanShopify.addLines(items);
  },

  async removeItem(lineId) {
    this._cache = await window.WillabeanShopify.removeLine(lineId);
  },

  async refresh() {
    this._cache = await window.WillabeanShopify.getOrCreateCart();
  },

  async getState() {
    if (!this._cache) await this.refresh();
    const cart = this._cache;
    return {
      mode: 'shopify',
      lines: cart.lines.edges.map(({ node }) => {
        const m = node.merchandise;
        const props = (node.attributes || []).reduce((o, a) => (o[a.key] = a.value, o), {});
        return {
          id: node.id,
          title: m.product.title,
          variant: m.title === 'Default Title' ? '' : m.title,
          properties: Object.keys(props).length ? props : null,
          price: parseFloat(m.price.amount),
          currency: m.price.currencyCode,
          quantity: node.quantity,
          image: m.image?.url || null
        };
      }),
      subtotal: parseFloat(cart.cost.subtotalAmount.amount),
      currency: cart.cost.subtotalAmount.currencyCode,
      count: cart.totalQuantity,
      checkoutUrl: cart.checkoutUrl
    };
  }
};

const Cart = {
  backend: null,

  init() {
    const useShopify = window.WillabeanShopify?.isConfigured();
    this.backend = useShopify ? ShopifyCart : LocalCart;
    if (!useShopify) LocalCart.load();
  },

  async addItem(args) {
    // Shopify path expects { variantId, quantity, attributes }
    // Local path expects { id, title, variant, price, image, properties }
    await this.backend.addItem(args);
    await this.render();
    this.open();
  },

  async addItems(items) {
    if (!items || !items.length) return;
    if (this.backend.addItems) await this.backend.addItems(items);
    else for (const it of items) await this.backend.addItem(it);
    await this.render();
    this.open();
  },

  async removeItem(id) {
    await this.backend.removeItem(id);
    await this.render();
  },

  open() {
    document.querySelector('.cart-drawer')?.classList.add('is-open');
    document.querySelector('.cart-overlay')?.classList.add('is-open');
    document.querySelector('.cart-drawer')?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  },

  close() {
    document.querySelector('.cart-drawer')?.classList.remove('is-open');
    document.querySelector('.cart-overlay')?.classList.remove('is-open');
    document.querySelector('.cart-drawer')?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  },

  async render() {
    const itemsEl = document.querySelector('[data-cart-items]');
    const footerEl = document.querySelector('[data-cart-footer]');
    const totalEl = document.querySelector('[data-cart-total]');
    const countEl = document.querySelector('[data-cart-count]');
    if (!itemsEl) return;

    let state;
    try {
      state = await this.backend.getState();
    } catch (err) {
      console.error('[cart] render failed', err);
      itemsEl.innerHTML = `<div class="cart-empty"><h4>Something went wrong</h4><p style="font-size: var(--fs-sm);">Try refreshing the page. If this keeps happening, email team@willabean.co.uk and we'll sort it.</p></div>`;
      return;
    }

    if (countEl) {
      countEl.textContent = state.count;
      countEl.classList.toggle('is-visible', state.count > 0);
    }

    if (state.lines.length === 0) {
      itemsEl.innerHTML = `<div class="cart-empty">
        <h4>Your basket is empty</h4>
        <p style="font-size: var(--fs-sm); margin-bottom: var(--s-5);">Start with a collar — that's where most of our customers do.</p>
        <a href="/collections/collars.html" class="btn btn-primary btn-sm" data-close-cart>Shop collars</a>
      </div>`;
      itemsEl.querySelector('[data-close-cart]')?.addEventListener('click', () => this.close());
      if (footerEl) footerEl.hidden = true;
      return;
    }

    if (footerEl) footerEl.hidden = false;

    const currencySymbol = state.currency === 'GBP' ? '£' : state.currency + ' ';

    // Apply the "30% off any lead with a collar" rule client-side so the cart
    // reflects the price the customer will see at Shopify checkout.
    // Cap: min(collarQty, leadQty) — one discounted lead per collar (set), no
    // freebie if they have 1 collar and 2 leads.
    const isCollar = (t='') => /\bcollar\b/i.test(t) && !/\blead\b/i.test(t);
    const isLead   = (t='') => /\blead\b/i.test(t);
    const sumQty = (lines) => lines.reduce((s, l) => s + l.quantity, 0);
    const collarQty = sumQty(state.lines.filter(l => isCollar(l.title)));
    const leadQty   = sumQty(state.lines.filter(l => isLead(l.title)));
    let setsRemaining = Math.min(collarQty, leadQty);

    // Discount the cheapest lead first — standard retail rule, protects margin.
    // Customer pays full price on the more expensive lead if they have multiple.
    const allocOrder = state.lines
      .map((l, i) => ({ i, l }))
      .filter(({ l }) => isLead(l.title))
      .sort((a, b) => a.l.price - b.l.price);
    const discountedQtyByIndex = new Map();
    for (const { i, l } of allocOrder) {
      const take = Math.min(l.quantity, setsRemaining);
      if (take > 0) discountedQtyByIndex.set(i, take);
      setsRemaining -= take;
      if (setsRemaining <= 0) break;
    }

    const adjustedLines = state.lines.map((line, i) => {
      const discountedQty = discountedQtyByIndex.get(i) || 0;
      const fullQty = line.quantity - discountedQty;
      const discountedPrice = line.price * 0.7;
      const lineTotal = (fullQty * line.price) + (discountedQty * discountedPrice);
      return { ...line, discountedQty, fullQty, discountedPrice, lineTotal };
    });

    const discountAmount = adjustedLines.reduce((sum, l) =>
      sum + l.discountedQty * (l.price - l.discountedPrice), 0);
    const adjustedSubtotal = adjustedLines.reduce((sum, l) => sum + l.lineTotal, 0);

    itemsEl.innerHTML = adjustedLines.map(line => `
      <div class="cart-item" data-line-id='${esc(line.id)}'>
        <div class="cart-item-media">
          ${line.image
            ? `<img src="${esc(line.image)}" alt="${esc(line.title)}" loading="lazy"/>`
            : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--cream-deep),var(--bronze-soft));"></div>`}
        </div>
        <div>
          <div class="cart-item-title">${esc(line.title)}</div>
          <div class="cart-item-meta">
            ${line.variant ? `<div>${esc(line.variant)}</div>` : ''}
            ${line.properties ? Object.entries(line.properties).map(([k,v]) => `<div><em>${esc(k)}:</em> ${esc(v)}</div>`).join('') : ''}
          </div>
          <div class="cart-item-price">
            <span>${renderLineUnitPrice(line, currencySymbol)}</span>
            <button class="cart-item-remove" data-remove>Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    itemsEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.cart-item').dataset.lineId;
        this.removeItem(id);
      });
    });

    if (totalEl) totalEl.textContent = `${currencySymbol}${adjustedSubtotal.toFixed(2)}`;

    this.renderDiscountLine(currencySymbol, discountAmount, state.subtotal);
    this.renderUpsell(state);
    this.renderFinalUpsell(state);

    // Update checkout button behaviour
    const checkoutBtn = document.querySelector('[data-checkout]');
    if (checkoutBtn) {
      checkoutBtn.onclick = () => {
        if (state.checkoutUrl) {
          window.location.href = state.checkoutUrl;
        } else {
          alert('Shopify isn\'t configured yet — set up js/config.js (see README) to enable real checkout. This is the mock basket for preview.');
        }
      };
    }
  }
};

Cart.renderDiscountLine = function (currencySymbol, discountAmount, fullSubtotal) {
  const totalRow = document.querySelector('.cart-total');
  if (!totalRow) return;
  let discountRow = document.querySelector('[data-cart-discount-row]');

  if (discountAmount <= 0) {
    if (discountRow) discountRow.remove();
    return;
  }

  if (!discountRow) {
    discountRow = document.createElement('div');
    discountRow.dataset.cartDiscountRow = 'true';
    discountRow.className = 'cart-total cart-discount-row';
    totalRow.parentNode.insertBefore(discountRow, totalRow);
  }
  discountRow.innerHTML = `
    <span style="color: var(--muted);">30% off cheapest lead</span>
    <strong style="color: var(--bronze); font-family: var(--font-display); font-weight: 500;">−${currencySymbol}${discountAmount.toFixed(2)}</strong>
  `;
};

// Final pre-checkout extras — only shown if the category isn't already in the basket.
const FINAL_EXTRAS = [
  {
    key: 'mud-daddy',
    title: 'Mud Daddy 5L',
    desc: 'Wash your dog off at the boot.',
    image: '/images/products/mud-daddy-5l/1.jpg',
    href: '/products/mud-daddy-5l.html',
    price: '£39.99',
    test: (titles) => !titles.some(t => /mud daddy/i.test(t))
  },
  {
    key: 'gundog',
    title: 'Gundog kit',
    desc: 'Throwing dummies for retrieves and training.',
    image: '/images/products/1lb-hand-throwing-dummy/1.jpg',
    href: '/collections/gundog.html',
    price: 'From £8',
    test: (titles) => !titles.some(t => /\b(dummy|gundog)\b/i.test(t))
  },
  {
    key: 'henry',
    title: 'Henry Traffic Handle',
    desc: 'Close-control secondary handle for busy walks.',
    image: '/images/products/henry-traffic-handle/1.jpg',
    href: '/products/henry-traffic-handle.html',
    price: '£12.00',
    test: (titles) => !titles.some(t => /traffic handle|\bhenry\b/i.test(t))
  }
];

Cart.renderFinalUpsell = function (state) {
  const slot = document.querySelector('[data-cart-extras]');
  if (!slot) return;

  // Only suggest extras when the basket already has a "main" item (collar or
  // lead) — no point pushing accessories on an empty/extras-only basket.
  const titles = state.lines.map(l => (l.title || '').toLowerCase());
  const hasMain = titles.some(t => /collar|lead/i.test(t));
  const missing = hasMain ? FINAL_EXTRAS.filter(e => e.test(titles)) : [];

  if (!missing.length) { slot.hidden = true; slot.innerHTML = ''; return; }

  slot.hidden = false;
  slot.innerHTML = `
    <span class="cart-extras-title">Anything else for the kit?</span>
    <div class="cart-extras-list">
      ${missing.map(e => `
        <a href="${esc(e.href)}" class="cart-extra-tile" data-close-cart>
          <img src="${esc(e.image)}" alt="${esc(e.title)}" loading="lazy"/>
          <span class="cart-extra-tile-body">
            <span class="cart-extra-tile-title">${esc(e.title)}</span>
            <span class="cart-extra-tile-desc">${esc(e.desc)}</span>
          </span>
          <span class="cart-extra-tile-price">${esc(e.price)} &rarr;</span>
        </a>
      `).join('')}
    </div>
  `;
  slot.querySelectorAll('[data-close-cart]').forEach(el =>
    el.addEventListener('click', () => this.close()));
};

// Bidirectional pairing — collar ↔ lead. Walter and Willow are coming soon.
const SET_PAIRS = {
  hugo:   { collar: { name: 'Hugo Collar',   href: '/products/hugo.html'   }, lead: { name: 'Hugo Lead',   href: '/products/hugo-lead.html'   } },
  winnie: { collar: { name: 'Winnie Collar', href: '/products/winnie.html' }, lead: { name: 'Winnie Lead', href: '/products/winnie-lead.html' } },
  mabel:  { collar: { name: 'Mabel Collar',  href: '/products/mabel.html'  }, lead: { name: 'Mabel Lead',  href: '/products/mabel-lead.html'  } },
  archie: { collar: { name: 'Archie Collar', href: '/products/archie.html' }, lead: { name: 'Archie Lead', href: '/products/archie-lead.html' } }
};

Cart.renderUpsell = function (state) {
  const slot = document.querySelector('[data-cart-upsell]');
  if (!slot) return;

  const titles = state.lines.map(l => (l.title || '').toLowerCase());

  let suggestion = null;
  let direction = null;
  for (const [key, pair] of Object.entries(SET_PAIRS)) {
    const re = new RegExp(`\\b${key}\\b`);
    const collarInCart = titles.some(t => re.test(t) && !/\blead\b/.test(t));
    const leadInCart   = titles.some(t => re.test(t) &&  /\blead\b/.test(t));
    if (collarInCart && !leadInCart) { suggestion = pair.lead;   direction = 'lead';   break; }
    if (leadInCart && !collarInCart) { suggestion = pair.collar; direction = 'collar'; break; }
  }

  if (!suggestion) { slot.hidden = true; slot.innerHTML = ''; return; }

  const verb = direction === 'lead' ? 'Build' : 'Add';
  const blurb = direction === 'lead'
    ? 'Same construction, designed as a pair.'
    : 'Pairs with the lead in your basket. Same construction, designed together.';

  slot.hidden = false;
  slot.innerHTML = `
    <strong>Now ${verb.toLowerCase()} the matching ${esc(suggestion.name)}</strong>
    ${blurb} <strong style="display:inline; color:var(--bronze);">30% off</strong> your cheapest lead with a collar, applied automatically at checkout (one discount per collar).
    <a href="${esc(suggestion.href)}" class="btn btn-outline btn-sm" data-close-cart>${verb} the ${esc(suggestion.name)} &rarr;</a>
  `;
  slot.querySelector('[data-close-cart]')?.addEventListener('click', () => this.close());
};

function renderLineUnitPrice(line, currencySymbol) {
  const full = `${currencySymbol}${line.price.toFixed(2)}`;
  const disc = `${currencySymbol}${line.discountedPrice.toFixed(2)}`;
  if (line.discountedQty === 0) {
    return `${full} × ${line.quantity}`;
  }
  if (line.discountedQty === line.quantity) {
    return `<s style="color:var(--muted);">${full}</s> <strong style="color:var(--moss-deep);">${disc}</strong> × ${line.quantity} <span class="discount-tag">30% off with collar</span>`;
  }
  // Partial: some units full, some discounted (e.g. 1 collar + 2 same lead)
  return `${full} × ${line.fullQty} + <s style="color:var(--muted);">${full}</s> <strong style="color:var(--moss-deep);">${disc}</strong> × ${line.discountedQty} <span class="discount-tag">30% off × ${line.discountedQty}</span>`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

document.addEventListener('partials:ready', async () => {
  Cart.init();
  await Cart.render();

  document.querySelectorAll('[data-open-cart]').forEach(btn =>
    btn.addEventListener('click', () => Cart.open()));
  document.querySelectorAll('[data-close-cart]').forEach(btn =>
    btn.addEventListener('click', () => Cart.close()));
  document.querySelector('[data-cart-overlay]')?.addEventListener('click', () => Cart.close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.cart-drawer.is-open')) Cart.close();
  });
});

window.WillabeanCart = Cart;
