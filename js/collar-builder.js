/* Willabean — collar builder prototype.
   Lets the customer pick layer count + a colour for each layer + hardware,
   and renders an SVG mock-up of the collar in real time. */

(function () {
  const PRESETS = {
    1: { match: 'Hugo',           href: '/products/hugo.html',    price: 'From £15' },
    2: { match: 'Winnie or Mabel', href: '/products/winnie.html', price: 'From £22' },
    3: { match: 'Willow',         href: '/products/willow.html',  price: 'From £26' },
    4: { match: 'Archie',         href: '/products/archie.html',  price: 'From £28' }
  };

  const HARDWARE_FILLS = {
    Silver:      { fill: '#c9c9c5', stroke: '#888881' },
    Bronze:      { fill: '#a87a4a', stroke: '#7a572f' },
    Gold:        { fill: '#caa14a', stroke: '#8a6c25' },
    Gunmetal:    { fill: '#3c4147', stroke: '#1a1d20' },
    'Rose Gold': { fill: '#b76e79', stroke: '#854c55' }
  };

  /* Per-layer-count SVG templates. If a file exists, the builder will fetch
     it once, cache it, and tint it via element IDs / classes. If the fetch
     404s, we fall back to the procedural renderer below. */
  const TEMPLATES = {
    1: '/images/builder/hugo.svg',
    2: '/images/builder/winnie.svg',
    3: '/images/builder/willow.svg',
    4: '/images/builder/archie.svg'
  };
  const templateCache = {};   // url -> SVGSVGElement (cloned on each render)

  function init() {
    const root = document.querySelector('[data-collar-builder]');
    if (!root) return;
    if (!window.WillabeanColours) {
      console.warn('[collar-builder] WillabeanColours not loaded');
      return;
    }

    const layerSelect = root.querySelector('[data-layer-count]');
    const layerPickers = root.querySelector('[data-layer-pickers]');
    const hardwarePicker = root.querySelector('[data-hardware-picker]');
    const fasteningPicker = root.querySelector('[data-fastening-picker]');
    const svgEl = root.querySelector('[data-collar-svg]');
    const matchEl = root.querySelector('[data-match]');
    const summaryEl = root.querySelector('[data-summary]');
    const sendBtn = root.querySelector('[data-send-builder]');

    const state = {
      layers: 2,
      colours: ['tan', 'olive', 'burgundy', 'navy', 'yellow', 'white', 'black'],
      hardware: 'Silver',
      fastening: 'Buckle'
    };

    function buildLayerPickers() {
      layerPickers.innerHTML = '';
      const labels = ['Base layer', '2nd layer', '3rd layer', '4th layer', '5th layer', '6th layer', '7th layer'];
      for (let i = 0; i < state.layers; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'product-picker';
        const label = document.createElement('div');
        label.className = 'picker-label';
        const valueText = window.WillabeanColours.find(state.colours[i])?.label || state.colours[i];
        label.innerHTML = `<span class="label">${labels[i]}</span><span class="selected-value" data-layer-label="${i}">${valueText}</span>`;
        wrap.appendChild(label);
        const swatchHost = document.createElement('div');
        swatchHost.className = 'swatches swatches-grid';
        swatchHost.dataset.builderLayer = String(i);
        wrap.appendChild(swatchHost);
        layerPickers.appendChild(wrap);

        renderLayerSwatches(swatchHost, i);
      }
    }

    function renderLayerSwatches(host, layerIndex) {
      host.innerHTML = '';
      window.WillabeanColours.PALETTE.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch';
        btn.style.background = c.hex;
        btn.dataset.colourId = c.id;
        btn.dataset.value = c.label;
        btn.title = c.label;
        btn.setAttribute('aria-label', c.label);
        if (state.colours[layerIndex] === c.id) btn.classList.add('is-selected');
        btn.addEventListener('click', () => {
          state.colours[layerIndex] = c.id;
          host.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          const labelEl = root.querySelector(`[data-layer-label="${layerIndex}"]`);
          if (labelEl) labelEl.textContent = c.label;
          render();
        });
        host.appendChild(btn);
      });
    }

    function buildHardwarePicker() {
      hardwarePicker.innerHTML = '';
      window.WillabeanColours.HARDWARE.forEach(hw => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch';
        btn.dataset.swatch = hw.id;
        btn.dataset.value = hw.label;
        btn.setAttribute('aria-label', hw.label);
        btn.title = hw.label;
        if (state.hardware === hw.label) btn.classList.add('is-selected');
        btn.addEventListener('click', () => {
          state.hardware = hw.label;
          hardwarePicker.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          const lbl = root.querySelector('[data-hardware-label]');
          if (lbl) lbl.textContent = hw.label;
          render();
        });
        hardwarePicker.appendChild(btn);
      });
    }

    function buildFasteningPicker() {
      fasteningPicker.innerHTML = '';
      ['Buckle', 'Clasp'].forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-chip';
        btn.dataset.value = name;
        btn.textContent = name;
        if (state.fastening === name) btn.classList.add('is-selected');
        btn.addEventListener('click', () => {
          state.fastening = name;
          fasteningPicker.querySelectorAll('.option-chip').forEach(c => c.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          const lbl = root.querySelector('[data-fastening-label]');
          if (lbl) lbl.textContent = name;
          render();
        });
        fasteningPicker.appendChild(btn);
      });
    }

    async function render() {
      const preset = PRESETS[state.layers] || PRESETS[6];
      matchEl.innerHTML = `Closest match: <a href="${preset.href}"><strong>The ${preset.match}</strong></a> · <span class="muted">${preset.price}</span>`;
      summaryEl.innerHTML = renderSummary(state);

      const templateUrl = TEMPLATES[state.layers];
      if (templateUrl) {
        const tinted = await loadAndTintTemplate(templateUrl, state);
        if (tinted) {
          svgEl.innerHTML = '';
          svgEl.appendChild(tinted);
          return;
        }
      }
      // Fallback: procedural render
      svgEl.innerHTML = renderCollarSVG(state);
    }

    async function loadAndTintTemplate(url, state) {
      try {
        if (!templateCache[url]) {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) { templateCache[url] = null; return null; }
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
          const root = doc.documentElement;
          if (!root || root.nodeName.toLowerCase() !== 'svg') { templateCache[url] = null; return null; }
          templateCache[url] = root;
        }
        const cached = templateCache[url];
        if (!cached) return null;
        const svg = cached.cloneNode(true);
        applyTint(svg, state);
        return svg;
      } catch (err) {
        console.warn('[collar-builder] template load failed for', url, err);
        templateCache[url] = null;
        return null;
      }
    }

    function applyTint(svg, state) {
      // 1) Layer fills, by id #layer-1, #layer-2, ...
      for (let i = 0; i < state.layers; i++) {
        const node = svg.querySelector('#layer-' + (i + 1));
        if (!node) continue;
        const c = window.WillabeanColours.find(state.colours[i]);
        if (c) node.setAttribute('fill', c.hex);
      }
      // Hide any layer rects beyond what's selected (so a 3-layer template
      // showing 2 layers doesn't leave a stray contrast strip on screen).
      for (let i = state.layers + 1; i <= 8; i++) {
        const node = svg.querySelector('#layer-' + i);
        if (node) node.style.display = 'none';
        const sheen = svg.querySelector('#layer-' + i + '-sheen');
        if (sheen) sheen.style.display = 'none';
      }

      // 2) Hardware tint, applied to .hw-fill (filled), .hw-stroke (the
      //    thicker coloured stroke) and .hw-outline (the dark thin outline).
      const hw = HARDWARE_FILLS[state.hardware] || HARDWARE_FILLS.Silver;
      svg.querySelectorAll('.hw-fill').forEach(el => {
        el.setAttribute('fill', hw.fill);
        if (el.hasAttribute('stroke')) el.setAttribute('stroke', hw.stroke);
      });
      svg.querySelectorAll('.hw-stroke').forEach(el => {
        el.setAttribute('stroke', hw.fill);
      });
      svg.querySelectorAll('.hw-outline').forEach(el => {
        if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
          el.setAttribute('stroke', hw.stroke);
        }
        if (el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') {
          el.setAttribute('fill', hw.stroke);
        }
      });
      svg.querySelectorAll('.rivet').forEach(el => {
        el.setAttribute('fill', hw.fill);
        el.setAttribute('stroke', hw.stroke);
      });

      // 3) Buckle vs clasp toggle
      const buckle = svg.querySelector('#hardware-right-buckle');
      const clasp = svg.querySelector('#hardware-right-clasp');
      if (buckle) buckle.style.display = state.fastening === 'Buckle' ? '' : 'none';
      if (clasp)  clasp.style.display  = state.fastening === 'Clasp'  ? '' : 'none';

      // Make the embedded SVG fill its container.
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.display = 'block';
    }

    function renderSummary(s) {
      const lines = [];
      const labels = ['Base layer', '2nd layer', '3rd layer', '4th layer', '5th layer', '6th layer', '7th layer'];
      for (let i = 0; i < s.layers; i++) {
        const c = window.WillabeanColours.find(s.colours[i]);
        lines.push(`<li><span class="dot" style="background:${c?.hex || '#999'}"></span><strong>${labels[i]}:</strong> ${c?.label || s.colours[i]}</li>`);
      }
      lines.push(`<li><strong>Hardware:</strong> ${s.hardware}</li>`);
      lines.push(`<li><strong>Fastening:</strong> ${s.fastening}</li>`);
      return `<ul class="builder-summary">${lines.join('')}</ul>`;
    }

    layerSelect.addEventListener('change', () => {
      state.layers = parseInt(layerSelect.value, 10) || 2;
      buildLayerPickers();
      render();
    });

    if (sendBtn) {
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const subject = encodeURIComponent('Collar builder design');
        const body = encodeURIComponent(buildEmailBody(state));
        window.location.href = `mailto:team@willabean.co.uk?subject=${subject}&body=${body}`;
      });
    }

    function buildEmailBody(s) {
      const labels = ['Base layer', '2nd layer', '3rd layer', '4th layer', '5th layer', '6th layer', '7th layer'];
      const lines = ['Hi Willabean,', '', 'I designed this in the collar builder:', ''];
      for (let i = 0; i < s.layers; i++) {
        const c = window.WillabeanColours.find(s.colours[i]);
        lines.push(`- ${labels[i]}: ${c?.label || s.colours[i]}`);
      }
      lines.push(`- Hardware: ${s.hardware}`);
      lines.push(`- Fastening: ${s.fastening}`);
      lines.push('', 'My dog\'s neck measurement is: ____ cm', '', 'Thanks!');
      return lines.join('\n');
    }

    // Initial render
    buildLayerPickers();
    buildHardwarePicker();
    buildFasteningPicker();
    render();
  }

  /* ——— SVG renderer ——— */
  function renderCollarSVG(state) {
    const W = 760, H = 280;
    const cx = W / 2, cy = H / 2;
    const colours = state.colours.slice(0, state.layers).map(id =>
      window.WillabeanColours.find(id)?.hex || '#888'
    );
    const hw = HARDWARE_FILLS[state.hardware] || HARDWARE_FILLS.Silver;

    // Collar body: rounded rectangle, full width
    const baseHeight = 70;
    const bodyW = 580;
    const bodyX = (W - bodyW) / 2;
    const bodyY = cy - baseHeight / 2;
    const radius = baseHeight / 2;

    // Build layered strips. Base = full width. Each additional layer narrower
    // and thinner, stacked centred over the base.
    const layerSVGs = [];
    for (let i = 0; i < state.layers; i++) {
      const shrink = i * 8;            // each layer narrower than the last
      const lh = baseHeight - i * 9;   // each layer thinner
      const lw = bodyW - i * 18;
      if (lh <= 6 || lw <= 80) break;
      const lx = (W - lw) / 2;
      const ly = cy - lh / 2;
      const lr = lh / 2;
      // Subtle inner highlight to simulate sheen of pvc-coated webbing
      layerSVGs.push(`
        <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}"
              rx="${lr}" ry="${lr}"
              fill="${colours[i]}"
              stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
        <rect x="${lx + 4}" y="${ly + 3}" width="${lw - 8}" height="${Math.max(2, lh * 0.18)}"
              rx="2" ry="2"
              fill="rgba(255,255,255,0.18)"/>
      `);
    }

    // Rivets: only show if more than one layer; placed along the layer where it meets the base
    const rivets = [];
    if (state.layers > 1) {
      const rivetCount = 8;
      for (let r = 0; r < rivetCount; r++) {
        const rx = bodyX + 30 + (bodyW - 60) * (r / (rivetCount - 1));
        rivets.push(`<circle cx="${rx}" cy="${cy - baseHeight / 2 + 6}" r="2.4" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="0.6"/>`);
        rivets.push(`<circle cx="${rx}" cy="${cy + baseHeight / 2 - 6}" r="2.4" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="0.6"/>`);
      }
    }

    // Hardware: D-ring at left, buckle/clasp at right
    const dRingX = bodyX;
    const buckleX = bodyX + bodyW - 4;

    let leftHw = `
      <circle cx="${dRingX - 14}" cy="${cy}" r="22" fill="none" stroke="${hw.fill}" stroke-width="6"/>
      <circle cx="${dRingX - 14}" cy="${cy}" r="22" fill="none" stroke="${hw.stroke}" stroke-width="1"/>
      <rect x="${dRingX - 6}" y="${cy - 5}" width="14" height="10" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="0.8"/>
    `;

    let rightHw = '';
    if (state.fastening === 'Buckle') {
      // Roller-buckle
      rightHw = `
        <rect x="${buckleX}" y="${cy - 28}" width="4" height="56" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="0.8"/>
        <rect x="${buckleX + 6}" y="${cy - 28}" width="42" height="56" rx="4" ry="4"
              fill="none" stroke="${hw.fill}" stroke-width="6"/>
        <rect x="${buckleX + 6}" y="${cy - 28}" width="42" height="56" rx="4" ry="4"
              fill="none" stroke="${hw.stroke}" stroke-width="1"/>
        <rect x="${buckleX + 25}" y="${cy - 30}" width="3" height="60" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="0.6"/>
      `;
    } else {
      // Side-release plastic-style clasp (rendered in hardware colour for prototype)
      rightHw = `
        <rect x="${buckleX}" y="${cy - 22}" width="48" height="44" rx="6" ry="6" fill="${hw.fill}" stroke="${hw.stroke}" stroke-width="1"/>
        <rect x="${buckleX + 8}" y="${cy - 16}" width="32" height="32" rx="4" ry="4" fill="rgba(0,0,0,0.18)"/>
        <rect x="${buckleX + 14}" y="${cy - 8}" width="20" height="16" rx="2" ry="2" fill="${hw.stroke}"/>
      `;
    }

    return `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live preview of your collar design">
        <defs>
          <linearGradient id="cb-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#f5ede0"/>
            <stop offset="1" stop-color="#ece2cf"/>
          </linearGradient>
          <filter id="cb-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#cb-bg)" rx="20" ry="20"/>

        <g filter="url(#cb-shadow)">
          ${layerSVGs.join('')}
          ${rivets.join('')}
          ${leftHw}
          ${rightHw}
        </g>
      </svg>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
