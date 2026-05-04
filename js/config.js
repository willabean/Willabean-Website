// This file is a safe default — `your-*` placeholders mean the site runs in
// "mock cart" mode (no Shopify calls). Replace the domain and token with real
// values to switch to live Shopify mode.
//
// See README.md for full setup instructions.

window.WillabeanConfig = {
  shopifyDomain: 'jfakrv-sc.myshopify.com',
  storefrontToken: '7275088b7fde68ea23376ddc59d8e35d',
  apiVersion: '2024-10',
  productHandles: {
    // Inferred from live URL pattern: https://www.willabean.co.uk/products/the-archie-dog-collar
    // Verify each handle in Shopify admin → Products → product → "URL handle", adjust if any differ.
    'bertie':              'the-bertie-dog-collar',
    'hugo':                'the-hugo-dog-collar',
    'walter':              'the-walter-dog-collar',
    'winnie':              'the-winnie-dog-collar',
    'mabel':               'the-mabel-dog-collar',
    'willow':              'the-willow-dog-slip-collar',
    'archie':              'the-archie-dog-collar',
    'hugo-lead':           'the-hugo-dog-lead',
    'winnie-lead':         'the-winnie-dog-lead',
    'mabel-lead':          'the-mabel-dog-lead',
    'archie-lead':         'the-archie-dog-lead',
    'henry-traffic-handle':'the-henry-traffic-handle',
    'mud-daddy-5l':        '5l-mud-daddy',

    'puppy-dummy':              'puppy-dummy',
    '1lb-hand-throwing-dummy':  '1lb-hand-throwing-dummy',
    'half-lb-long-throw-dummy': '1-2lb-long-throw-dummy',
    'water-dummy':              'water-dummy',
    'dummy-ball':               'dummy-ball'
  }
};
