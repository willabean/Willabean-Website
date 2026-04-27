// Willabean Shopify Storefront config.
//
// How to use:
//   1. Duplicate this file and save it as `js/config.js` in the same folder.
//   2. Fill in your Shopify domain and Storefront API token (instructions in README.md).
//   3. `config.js` is gitignored so your token never leaves your machine.
//
// If config.js is absent OR the token is still the placeholder, the site runs
// in "mock mode" — the cart is local-only (no Shopify calls, no real checkout).
// As soon as real values are filled in, the site switches to live Shopify mode.

window.WillabeanConfig = {
  // e.g. "willabean.myshopify.com"  (NOT the willabean.co.uk custom domain)
  shopifyDomain: 'your-shop.myshopify.com',

  // Storefront API access token. Create under:
  //   Shopify admin → Settings → Apps and sales channels → Develop apps →
  //   Create an app → "Configure Storefront API scopes" →
  //   Grant: unauthenticated_read_product_listings,
  //          unauthenticated_read_product_inventory,
  //          unauthenticated_write_checkouts,
  //          unauthenticated_read_checkouts
  //   → Install app → Copy the "Storefront API access token".
  storefrontToken: 'your-storefront-access-token',

  // Storefront API version — bump occasionally to stay on a supported release.
  apiVersion: '2024-10',

  // Map each of our product pages to the matching Shopify product handle.
  // A Shopify handle is the product URL slug (e.g. willabean.co.uk/products/the-winnie
  // → handle is "the-winnie"). Update these if your Shopify handles differ.
  productHandles: {
    'bertie':              'bertie',
    'hugo':                'hugo',
    'walter':              'walter',
    'winnie':              'winnie',
    'mabel':               'mabel',
    'willow':              'willow',
    'archie':              'archie',
    'hugo-lead':           'hugo-lead',
    'winnie-lead':         'winnie-lead',
    'mabel-lead':          'mabel-lead',
    'archie-lead':         'archie-lead',
    'henry-traffic-handle':'henry-traffic-handle',
    'mud-daddy-5l':        'mud-daddy-5l',

    'puppy-dummy':              'puppy-dummy',
    '1lb-hand-throwing-dummy':  '1lb-hand-throwing-dummy',
    'half-lb-long-throw-dummy': '1-2lb-long-throw-dummy',
    'water-dummy':              'water-dummy',
    'dummy-ball':               'dummy-ball'
  }
};
