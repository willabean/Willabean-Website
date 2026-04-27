// Product page: variant pickers, measurement validation, add-to-cart.
// When Shopify is configured, fetches the live product, maps the pickers to
// real Shopify option values, and adds the correct variantId to the cart.
// When Shopify is NOT configured, falls back to local-cart behaviour using
// the static data-* attributes on the page.

document.addEventListener('partials:ready', () => {
  const root = document.querySelector('[data-product]');
  if (!root) return;

  // Populate any swatch placeholders from the shared palette.
  if (window.WillabeanColours) window.WillabeanColours.renderAll();

  const staticData = {
    id:     root.dataset.productId,
    handle: root.dataset.productHandle,
    title:  root.dataset.productTitle,
    price:  parseInt(root.dataset.productPrice, 10) // pence
  };

  // Set mode: arrived via /products/<collar>.html?set=true from matching-sets.
  // Renders an extra "Lead length" picker, changes the button label, and on
  // add-to-basket adds both the collar AND its matching lead in one go.
  const SET_LEADS = {
    hugo:   { handle: 'hugo-lead',   title: 'The Hugo Lead',   basePrice: 1500 },
    winnie: { handle: 'winnie-lead', title: 'The Winnie Lead', basePrice: 2200 },
    mabel:  { handle: 'mabel-lead',  title: 'The Mabel Lead',  basePrice: 3000 },
    archie: { handle: 'archie-lead', title: 'The Archie Lead', basePrice: 2500 }
  };
  const params = new URLSearchParams(location.search);
  const setMode = params.get('set') === 'true' && SET_LEADS[staticData.id];
  const matchingLead = setMode ? SET_LEADS[staticData.id] : null;
  let shopifyLeadProduct = null;

  const state = {};      // picker values keyed by picker name
  const priceAdds = {};  // picker key -> pence add for the selected option
  let shopifyProduct = null;

  if (matchingLead) injectSetMode();

  // ——— Pickers ———
  document.querySelectorAll('[data-picker]').forEach(group => {
    const key = group.dataset.picker;
    const options = group.querySelectorAll('[data-value]');
    if (!options.length) return;
    // Honour any pre-rendered .is-selected (set by colours.js) — otherwise pick first
    let selected = group.querySelector('[data-value].is-selected');
    if (!selected) {
      selected = options[0];
      selected.classList.add('is-selected');
    }
    state[key] = selected.dataset.value;
    priceAdds[key] = parseInt(selected.dataset.priceAdd || '0', 10);
    updateSelectedLabel(group, state[key]);

    options.forEach(el => {
      el.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('is-selected'));
        el.classList.add('is-selected');
        state[key] = el.dataset.value;
        priceAdds[key] = parseInt(el.dataset.priceAdd || '0', 10);
        updateSelectedLabel(group, state[key]);
        updateBuyButton();
        document.dispatchEvent(new CustomEvent('willabean:picker-change', {
          detail: { picker: key, value: el.dataset.value, colourId: el.dataset.colourId || null }
        }));
      });
    });
  });

  function totalPence() {
    const base = parseInt(staticData.price, 10) || 0;
    const extras = Object.values(priceAdds).reduce((a, b) => a + (b || 0), 0);
    return base + extras;
  }

  function formatGBP(pence) {
    const num = (pence / 100).toFixed(2);
    return `£${num}`;
  }

  function updateBuyButton() {
    const btn = document.querySelector('[data-add-to-cart]');
    if (!btn) return;
    const tmpl = btn.dataset.priceTemplate;
    if (!tmpl) return;
    btn.innerHTML = tmpl.replace('{price}', formatGBP(totalPence()));
    btn.dataset.originalLabel = btn.innerHTML;
  }

  function updateSelectedLabel(group, value) {
    const label = group.closest('.product-picker')?.querySelector('.selected-value');
    if (label) label.textContent = value;
  }

  // ——— Measurement ———
  const measureInput = document.querySelector('[data-measurement]');
  const measureError = document.querySelector('[data-measurement-error]');

  function validateMeasurement() {
    if (!measureInput) return true;
    const val = parseFloat(measureInput.value);
    const min = parseFloat(measureInput.min) || 15;
    const max = parseFloat(measureInput.max) || 70;
    if (!val || val < min || val > max) {
      if (measureError) measureError.textContent = `Please enter a neck measurement between ${min} and ${max} cm.`;
      measureInput.setAttribute('aria-invalid', 'true');
      return false;
    }
    if (measureError) measureError.textContent = '';
    measureInput.removeAttribute('aria-invalid');
    return true;
  }

  measureInput?.addEventListener('blur', validateMeasurement);
  measureInput?.addEventListener('input', () => {
    if (measureInput.getAttribute('aria-invalid') === 'true') validateMeasurement();
  });

  // ——— Layered colours textarea (Archie) ———
  const layeredColours = document.querySelector('[data-layered-colours]');

  // ——— Load live Shopify product if configured ———
  if (window.WillabeanShopify?.isConfigured()) {
    const handleMap = window.WillabeanConfig?.productHandles || {};
    const handle = handleMap[staticData.handle] || staticData.handle;
    window.WillabeanShopify.getProductByHandle(handle).then(product => {
      if (!product) {
        console.warn('[product-page] Shopify product not found for handle:', handle);
        return;
      }
      shopifyProduct = product;
      // Update price display from live Shopify if present
      const priceEl = document.querySelector('.product-price');
      if (priceEl && product.priceRange?.minVariantPrice) {
        const p = product.priceRange.minVariantPrice;
        const symbol = p.currencyCode === 'GBP' ? '£' : p.currencyCode + ' ';
        priceEl.innerHTML = `<span class="from">From</span>${symbol}${parseFloat(p.amount).toFixed(2)}`;
      }
    }).catch(err => {
      console.error('[product-page] Failed to load Shopify product', err);
    });
  }

  // ——— Add to basket ———
  const addBtn = document.querySelector('[data-add-to-cart]');
  addBtn?.addEventListener('click', async () => {
    if (measureInput && !validateMeasurement()) {
      measureInput.focus();
      return;
    }

    const properties = {};
    const dogNameInput = document.querySelector('[data-dog-name]');
    if (dogNameInput?.value.trim()) properties["Dog's name"] = dogNameInput.value.trim();
    if (measureInput) properties['Neck measurement'] = measureInput.value + ' cm';
    if (layeredColours?.value.trim()) properties['Layered colours'] = layeredColours.value.trim();

    // Shopify path
    if (shopifyProduct && window.WillabeanShopify?.isConfigured()) {
      const variant = pickVariant(shopifyProduct, state);
      if (!variant) {
        alert('Sorry — that combination isn\'t available. Try a different option, or email team@willabean.co.uk.');
        return;
      }
      // Include picker values as attributes too, so things like neck measurement
      // and custom colour instructions come through on the order.
      const attrs = Object.entries(properties).map(([key, value]) => ({ key, value }));
      // Also include any state keys that aren't matched to variant options (e.g.
      // textarea custom colours)
      Object.entries(state).forEach(([k, v]) => {
        if (!variant.selectedOptions.find(opt => opt.name.toLowerCase() === k.toLowerCase())) {
          attrs.push({ key: titleCase(k), value: v });
        }
      });
      addBtn.disabled = true;
      addBtn.textContent = 'Adding…';
      try {
        const collarLine = { variantId: variant.id, quantity: 1, attributes: attrs };
        if (matchingLead) {
          const leadLine = buildLeadAddPayload(properties);
          if (!leadLine) {
            alert('Could not match a lead variant for that combination. The collar will be added on its own — email team@willabean.co.uk and we\'ll sort the lead manually.');
            await window.WillabeanCart.addItem(collarLine);
          } else {
            await window.WillabeanCart.addItems([collarLine, leadLine]);
          }
        } else {
          await window.WillabeanCart.addItem(collarLine);
        }
      } catch (err) {
        console.error(err);
        alert('Could not add to basket. ' + err.message);
      } finally {
        addBtn.disabled = false;
        addBtn.innerHTML = addBtn.dataset.originalLabel || 'Add to basket';
      }
      return;
    }

    // Local path
    const variantSummary = Object.entries(state)
      .map(([k, v]) => `${titleCase(k)}: ${v}`)
      .join(' · ');

    const galleryImg = document.querySelector('[data-gallery-main]');
    const collarLine = {
      id: staticData.id,
      title: staticData.title,
      variant: variantSummary,
      price: parseInt(staticData.price, 10) + Object.entries(priceAdds)
        .filter(([k]) => k !== '_matchingLeadBase' && k !== 'length')
        .reduce((a, [, v]) => a + (v || 0), 0),
      image: galleryImg?.getAttribute('src') || null,
      properties: Object.keys(properties).length ? properties : null
    };

    if (matchingLead) {
      const leadLine = buildLeadAddPayload(properties);
      await window.WillabeanCart.addItems([collarLine, leadLine]);
    } else {
      await window.WillabeanCart.addItem(collarLine);
    }
  });

  if (addBtn) {
    addBtn.dataset.originalLabel = addBtn.innerHTML;
    // If a price template hasn't been set, infer one from the current label
    if (!addBtn.dataset.priceTemplate) {
      addBtn.dataset.priceTemplate = addBtn.innerHTML.replace(/£\d+(?:\.\d{2})?/, '{price}');
    }
    updateBuyButton();
  }

  function pickVariant(product, state) {
    // Try to find a variant whose selectedOptions match the UI state.
    const normalized = (s) => String(s).toLowerCase().trim();
    const variants = product.variants.edges.map(e => e.node);

    return variants.find(v => {
      return v.selectedOptions.every(opt => {
        const key = findStateKey(state, opt.name);
        if (!key) return true; // option not represented in UI — any value ok
        return normalized(state[key]) === normalized(opt.value);
      });
    }) || variants.find(v => v.availableForSale);
  }

  // ——— Set mode helpers ———
  function injectSetMode() {
    // Replace the standard "30% off lead" block with a set-mode banner
    const offer = document.querySelector('.matching-offer');
    if (offer) {
      offer.innerHTML = `<strong>Building a matching set.</strong> Adds the ${matchingLead.title} with the same colours, hardware and your chosen length. <strong style="color:var(--bronze);">30% off the lead</strong> applied automatically at checkout (one discount per collar, on the cheapest lead in the order).`;
    }

    // Inject a "Lead length" picker right before the add-to-basket button
    const addBtn = document.querySelector('[data-add-to-cart]');
    if (addBtn) {
      const block = document.createElement('div');
      block.className = 'product-picker';
      block.dataset.setLeadBlock = 'true';
      block.innerHTML = `
        <div class="picker-label">
          <span class="label">Lead length</span>
          <span class="selected-value">1.2 m (standard)</span>
        </div>
        <div class="options" data-picker="length">
          <button class="option-chip" type="button" data-value="1.2 m (standard)">1.2 m · Standard</button>
          <button class="option-chip" type="button" data-value="1.5 m" data-price-add="300">1.5 m <span class="price-add">+£3</span></button>
          <button class="option-chip" type="button" data-value="1.8 m" data-price-add="600">1.8 m <span class="price-add">+£6</span></button>
        </div>
      `;
      addBtn.parentNode.insertBefore(block, addBtn);

      // Update button label for set mode
      addBtn.dataset.priceTemplate = 'Add set to basket, from {price}';
      // Bake the lead's base price into the running total
      priceAdds._matchingLeadBase = matchingLead.basePrice;
    }

    // Pre-fetch the lead's Shopify product so the variant lookup at click time is fast
    if (window.WillabeanShopify?.isConfigured()) {
      const handleMap = window.WillabeanConfig?.productHandles || {};
      const leadHandle = handleMap[matchingLead.handle] || matchingLead.handle;
      window.WillabeanShopify.getProductByHandle(leadHandle).then(p => {
        if (p) shopifyLeadProduct = p;
        else console.warn('[product-page] matching lead not found in Shopify:', leadHandle);
      }).catch(err => console.error('[product-page] failed to load matching lead', err));
    }
  }

  function buildLeadAddPayload(properties) {
    // Drop collar-only state keys before resolving the lead variant
    const leadState = { ...state };
    delete leadState.fastening;
    delete leadState.width;

    if (shopifyLeadProduct && window.WillabeanShopify?.isConfigured()) {
      const variant = pickVariant(shopifyLeadProduct, leadState);
      if (!variant) return null;
      const attrs = Object.entries(properties)
        .filter(([k]) => k !== 'Neck measurement') // lead doesn't take a neck size
        .map(([key, value]) => ({ key, value }));
      Object.entries(leadState).forEach(([k, v]) => {
        if (!variant.selectedOptions.find(opt => opt.name.toLowerCase() === k.toLowerCase())) {
          attrs.push({ key: titleCase(k), value: v });
        }
      });
      return { variantId: variant.id, quantity: 1, attributes: attrs };
    }

    // Local-mode fallback
    const lengthAdd = parseInt(priceAdds.length || '0', 10);
    const variantSummary = Object.entries(leadState)
      .map(([k, v]) => `${titleCase(k)}: ${v}`)
      .join(' · ');
    const leadProperties = { ...properties };
    delete leadProperties['Neck measurement'];
    return {
      id: matchingLead.handle,
      title: matchingLead.title,
      variant: variantSummary,
      price: matchingLead.basePrice + lengthAdd,
      image: `/images/products/${matchingLead.handle}/1.png`,
      properties: Object.keys(leadProperties).length ? leadProperties : null
    };
  }

  function findStateKey(state, optionName) {
    const target = optionName.toLowerCase().replace(/\s+/g, '-');
    const keys = Object.keys(state).map(k => ({ raw: k, normal: k.toLowerCase() }));
    const hit = keys.find(k => k.normal === target || k.normal.includes(target) || target.includes(k.normal));
    return hit?.raw;
  }

  function titleCase(s) {
    return String(s)
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, c => c.toUpperCase());
  }
});
