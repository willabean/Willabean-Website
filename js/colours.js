/* Willabean — webbing colour palette and hardware finishes.
   These are the colours we actually offer (mirroring the live storefront's
   Easify product-options config). Any change to the real range should be
   reflected here, this list drives the swatches on every product page and
   the collar builder. */
window.WillabeanColours = (function () {
  /* Webbing colours (waterproof PVC-coated webbing). 19 colours. */
  const PALETTE = [
    { id: 'black',         label: 'Black',         hex: '#000000' },
    { id: 'white',         label: 'White',         hex: '#ffffff' },
    { id: 'tan',           label: 'Tan',           hex: '#dfa880' },
    { id: 'dark-brown',    label: 'Dark Brown',    hex: '#562e18' },
    { id: 'apricot',       label: 'Apricot',       hex: '#c26a5a' },
    { id: 'orange',        label: 'Orange',        hex: '#ff5600' },
    { id: 'yellow',        label: 'Yellow',        hex: '#ffc700' },
    { id: 'olive',         label: 'Olive',         hex: '#697b51' },
    { id: 'mint-green',    label: 'Mint Green',    hex: '#b4e1d6' },
    { id: 'aqua',          label: 'Aqua',          hex: '#00a19c' },
    { id: 'light-blue',    label: 'Light Blue',    hex: '#8ce2d0' },
    { id: 'blue',          label: 'Blue',          hex: '#005abb' },
    { id: 'navy',          label: 'Navy',          hex: '#445868' },
    { id: 'purple',        label: 'Purple',        hex: '#452b6f' },
    { id: 'bright-purple', label: 'Bright Purple', hex: '#b21bab' },
    { id: 'pastel-pink',   label: 'Pastel Pink',   hex: '#efb9c0' },
    { id: 'deep-pink',     label: 'Deep Pink',     hex: '#bb2649' },
    { id: 'bright-red',    label: 'Bright Red',    hex: '#f12938' },
    { id: 'burgundy',      label: 'Burgundy',      hex: '#9e1b32' }
  ];

  /* Hardware finishes. Hex values are screen approximations of the metal
     finish, the live site uses photographed swatches. */
  const HARDWARE = [
    { id: 'silver',     label: 'Silver',     hex: '#c9c9c5' },
    { id: 'bronze',     label: 'Bronze',     hex: '#a87a4a' },
    { id: 'gold',       label: 'Gold',       hex: '#caa14a' },
    { id: 'gun-metal',  label: 'Gunmetal',   hex: '#3c4147' },
    { id: 'rose-gold',  label: 'Rose Gold',  hex: '#b76e79' }
  ];

  function find(id) {
    return PALETTE.find(c => c.id === id) || HARDWARE.find(c => c.id === id);
  }

  function findByLabel(label) {
    const norm = String(label || '').toLowerCase().trim();
    return PALETTE.find(c => c.label.toLowerCase() === norm)
        || HARDWARE.find(c => c.label.toLowerCase() === norm);
  }

  /* Render colour swatches into an empty container with
     data-render-swatches="<picker-key>". Optional data-default selects an
     id to pre-tick. */
  function renderSwatches(container) {
    const picker = container.dataset.renderSwatches;
    if (!picker) return;
    const defaultId = container.dataset.default;
    container.innerHTML = '';
    container.classList.add('swatches', 'swatches-grid');
    container.setAttribute('data-picker', picker);
    PALETTE.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.dataset.value = c.label;
      btn.dataset.colourId = c.id;
      btn.style.background = c.hex;
      btn.setAttribute('aria-label', c.label);
      btn.title = c.label;
      if ((defaultId && c.id === defaultId) || (!defaultId && i === 0)) {
        btn.classList.add('is-selected');
      }
      container.appendChild(btn);
    });
  }

  /* Render hardware-finish swatches into a container with
     data-render-hardware="<picker-key>". */
  function renderHardware(container) {
    const picker = container.dataset.renderHardware;
    if (!picker) return;
    const defaultId = container.dataset.default;
    container.innerHTML = '';
    container.classList.add('swatches');
    container.setAttribute('data-picker', picker);
    HARDWARE.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.dataset.swatch = c.id;
      btn.dataset.value = c.label;
      btn.dataset.colourId = c.id;
      btn.setAttribute('aria-label', c.label);
      btn.title = c.label;
      if ((defaultId && c.id === defaultId) || (!defaultId && i === 0)) {
        btn.classList.add('is-selected');
      }
      container.appendChild(btn);
    });
  }

  function renderAll() {
    document.querySelectorAll('[data-render-swatches]').forEach(renderSwatches);
    document.querySelectorAll('[data-render-hardware]').forEach(renderHardware);
  }

  return { PALETTE, HARDWARE, find, findByLabel, renderSwatches, renderHardware, renderAll };
})();
