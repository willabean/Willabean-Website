/* Willabean — three-question wizard that recommends a collar.
   Decision logic is small and human-readable: a state object captures the
   three answers, and a flat lookup picks the best match. */

(function () {
  if (!document.querySelector('[data-chooser]')) return;

  const state = { use: null, design: null, fastening: null };

  const PRODUCTS = {
    bertie: {
      name: 'The Bertie',
      desc: 'A soft single-colour house collar, O-ring fastening, for indoor wear only. Light enough to lie on, easy to slip on and off.',
      image: '/images/products/bertie/1.jpg',
      price: 'From £15',
      href: '/products/bertie.html'
    },
    hugo: {
      name: 'The Hugo',
      desc: 'A clean single-layer collar in your colour and your hardware. The first proper walking collar most of our customers buy.',
      image: '/images/products/hugo/1.jpg',
      price: 'From £15',
      href: '/products/hugo.html'
    },
    walter: {
      name: 'The Walter',
      desc: 'A narrow contrast strip riveted along the full length of a wider base. The understated, fully layered design, two colours quietly done.',
      image: '/images/products/walter/1.jpg',
      price: 'From £22',
      href: '/products/walter.html'
    },
    winnie: {
      name: 'The Winnie',
      desc: 'A primary colour for the length of the collar, with a contrast accent layered at the buckle. The elegant flourish.',
      image: '/images/products/winnie/1.jpg',
      price: 'From £22',
      href: '/products/winnie.html'
    },
    mabel: {
      name: 'The Mabel',
      desc: 'Two colours laid end-to-end and joined at the centre. The bold half-and-half design.',
      image: '/images/products/mabel/1.jpg',
      price: 'From £24',
      href: '/products/mabel.html'
    },
    willow: {
      name: 'The Willow',
      desc: 'A three-section slip collar separated by a D-ring and an O-ring, with a built-in grab handle and safety stopper. Built for working dogs.',
      image: '/images/products/willow/1.jpg',
      price: 'From £26',
      href: '/products/willow.html'
    },
    archie: {
      name: 'The Archie',
      desc: 'Up to four accent colours layered onto your chosen base. Our most bespoke build, no two are the same. Worth the wait.',
      image: '/images/products/archie/1.jpg',
      price: 'From £28',
      href: '/products/archie.html'
    }
  };

  function pickProduct(s) {
    // Working dog → Willow always (purpose-built slip collar)
    if (s.use === 'working') return 'willow';

    // Indoor only → Bertie
    if (s.use === 'house') return 'bertie';

    // Walks: based on design preference
    if (s.design === 'single') return 'hugo';
    if (s.design === 'multi')  return 'archie';
    // Two-colour: Mabel for bold half-and-half, Winnie for the signature equal-width
    // Slight bias: Winnie is the signature, default to it.
    return 'winnie';
  }

  function pickLede(s, product) {
    if (s.use === 'working') {
      return 'For working dogs, gundog training and water retrieves, the Willow is the only collar in the range built for the job. Three sections of webbing separated by a D-ring and O-ring, with a grab section and safety stopper.';
    }
    if (s.use === 'house') {
      return 'For indoor wear, the Bertie is the right call. Soft and light, easy to slip on and off, never meant to take a lead.';
    }
    if (product === 'archie') {
      return 'When you want every detail to be your call, the Archie is the build for it. Up to five colours, layered and riveted, properly bespoke.';
    }
    if (product === 'hugo') {
      return 'For everyday walking with no fuss, the Hugo is where most of our customers start. One colour, your hardware, built to last.';
    }
    return 'For everyday walking with a bit more design to it, the Winnie is our signature accent build. Your main colour for the length of the collar, with a contrast layer at the buckle. Pick two colours, pick your hardware, we make it to fit.';
  }

  const steps = document.querySelectorAll('.chooser-step');
  const showStep = (id) => {
    steps.forEach(s => s.classList.toggle('is-active', s.dataset.step === id));
    window.scrollTo({ top: document.querySelector('.chooser-section').offsetTop - 80, behavior: 'smooth' });
  };

  document.querySelectorAll('.chooser-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const val = btn.dataset.value;
      state[key] = val;

      if (key === 'use') {
        // Skip Step 2 + 3 for indoor and for working — those are decisive on their own
        if (val === 'house' || val === 'working') {
          renderResult();
          showStep('result');
          return;
        }
        showStep('2');
        return;
      }
      if (key === 'design') {
        showStep('3');
        return;
      }
      if (key === 'fastening') {
        renderResult();
        showStep('result');
      }
    });
  });

  function renderResult() {
    const productKey = pickProduct(state);
    const p = PRODUCTS[productKey];
    document.querySelector('[data-result-title]').textContent = p.name;
    document.querySelector('[data-result-lede]').textContent = pickLede(state, productKey);
    const img = document.querySelector('[data-result-image]');
    img.src = p.image;
    img.alt = p.name + ' handmade UK dog collar';
    document.querySelector('[data-result-name]').textContent = p.name;
    document.querySelector('[data-result-desc]').textContent = p.desc;
    document.querySelector('[data-result-price]').textContent = p.price;
    document.querySelector('[data-result-link]').setAttribute('href', p.href);
  }

  document.querySelector('[data-restart]')?.addEventListener('click', () => {
    state.use = state.design = state.fastening = null;
    document.querySelectorAll('.chooser-option').forEach(b => b.classList.remove('is-selected'));
    showStep('1');
  });
})();
