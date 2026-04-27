// Shopify Storefront API wrapper. Talks to Shopify over GraphQL, stores a cart
// ID in localStorage, and returns a hosted checkout URL at the end.
//
// If window.WillabeanConfig is missing or still has placeholder values, the
// whole module stays dormant — cart.js falls back to its local-only stub.

(function () {
  const CART_ID_KEY = 'willabean_shopify_cart_id_v1';

  const cfg = window.WillabeanConfig;
  const configured =
    cfg &&
    cfg.shopifyDomain &&
    cfg.storefrontToken &&
    !cfg.shopifyDomain.startsWith('your-') &&
    !cfg.storefrontToken.startsWith('your-');

  window.WillabeanShopify = {
    isConfigured: () => configured,

    async query(graphql, variables) {
      if (!configured) throw new Error('Shopify is not configured — set js/config.js');
      const url = `https://${cfg.shopifyDomain}/api/${cfg.apiVersion || '2024-10'}/graphql.json`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': cfg.storefrontToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query: graphql, variables: variables || {} })
      });
      if (!res.ok) throw new Error(`Shopify API ${res.status}`);
      const body = await res.json();
      if (body.errors?.length) {
        console.error('[shopify] GraphQL errors:', body.errors);
        throw new Error(body.errors.map(e => e.message).join('; '));
      }
      return body.data;
    },

    async getProductByHandle(handle) {
      const data = await this.query(`
        query getProduct($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            descriptionHtml
            availableForSale
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            images(first: 6) {
              edges { node { url altText width height } }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price { amount currencyCode }
                  selectedOptions { name value }
                }
              }
            }
            options { name values }
          }
        }
      `, { handle });
      return data.product;
    },

    async getOrCreateCart() {
      let cartId = localStorage.getItem(CART_ID_KEY);
      if (cartId) {
        try {
          const data = await this.query(`
            query getCart($id: ID!) {
              cart(id: $id) {
                id
                checkoutUrl
                totalQuantity
                cost {
                  subtotalAmount { amount currencyCode }
                  totalAmount { amount currencyCode }
                }
                lines(first: 50) {
                  edges {
                    node {
                      id
                      quantity
                      attributes { key value }
                      merchandise {
                        ... on ProductVariant {
                          id
                          title
                          price { amount currencyCode }
                          image { url altText }
                          product { title handle }
                        }
                      }
                    }
                  }
                }
              }
            }
          `, { id: cartId });
          if (data.cart) return data.cart;
        } catch (err) {
          console.warn('[shopify] Stored cart invalid, creating a new one', err);
        }
      }
      const data = await this.query(`
        mutation cartCreate {
          cartCreate {
            cart { id checkoutUrl totalQuantity
              cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
              lines(first: 50) { edges { node { id quantity attributes { key value } merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText } product { title handle } } } } } }
            }
            userErrors { field message }
          }
        }
      `);
      const cart = data.cartCreate.cart;
      localStorage.setItem(CART_ID_KEY, cart.id);
      return cart;
    },

    async addLine({ variantId, quantity = 1, attributes = [] }) {
      return this.addLines([{ variantId, quantity, attributes }]);
    },

    async addLines(lines) {
      const cart = await this.getOrCreateCart();
      const data = await this.query(`
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { id checkoutUrl totalQuantity
              cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
              lines(first: 50) { edges { node { id quantity attributes { key value } merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText } product { title handle } } } } } }
            }
            userErrors { field message }
          }
        }
      `, {
        cartId: cart.id,
        lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity || 1, attributes: l.attributes || [] }))
      });
      if (data.cartLinesAdd.userErrors?.length) {
        throw new Error(data.cartLinesAdd.userErrors.map(e => e.message).join('; '));
      }
      return data.cartLinesAdd.cart;
    },

    async removeLine(lineId) {
      const cart = await this.getOrCreateCart();
      const data = await this.query(`
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { id checkoutUrl totalQuantity
              cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
              lines(first: 50) { edges { node { id quantity attributes { key value } merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText } product { title handle } } } } } }
            }
            userErrors { field message }
          }
        }
      `, { cartId: cart.id, lineIds: [lineId] });
      return data.cartLinesRemove.cart;
    }
  };
})();
