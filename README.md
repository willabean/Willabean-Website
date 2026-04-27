# Willabean — HTML/CSS/JS rebuild

Handmade biothane dog collars, leads, and gear. A 28-page static site, designed fresh from the SEO audit copy, with headless Shopify ready to plug in.

## How to preview

**Double-click `start.bat`.** It launches a PowerShell-based web server bundled with the project (needs no extra installs) and opens `http://localhost:8000` in your browser. Leave the terminal window open — close it to stop the server.

Mac/Linux: `chmod +x start.sh && ./start.sh` (needs Python 3, standard on those platforms).

**Do not open `index.html` directly via file://.** The header and footer are injected with `fetch()`, which browsers block on `file://`.

## What's in the box

### Pages (28)

- **Homepage** (`index.html`) — hero with lifestyle photo, founder strip, four-tier range, branded-goods block, review + Instagram placeholders
- **Shop** (`shop.html`) — category landing
- **Our Story** (`our-story.html`) — Aimee + Jon + Willow, values
- **Collections** (`collections/`) — Collars, Leads, Matching Sets (new), Gundog, Mud Daddy
- **Products** (`products/`) — 7 collars (Bertie, Hugo, Walter, Winnie, Mabel, Willow, Archie), 5 matching leads, Henry Traffic Handle, Mud Daddy 5L
- **Journal** (`blog/`) — index plus three long-form posts: "How to measure your dog", "What is biothane", "Slip vs buckle"

Every product page has colour/hardware/fastening pickers, a neck-measurement input, add-to-cart, and Product JSON-LD. Every blog post has FAQPage JSON-LD.

### Technical

- Warm handcrafted design — Fraunces display + Inter body, moss/cream/bronze palette defined in `css/tokens.css`
- Sticky header, mobile nav drawer, sliding cart drawer with line-item display
- Cart runs in **mock mode** by default (local storage, no real checkout). Switches to **live Shopify mode** as soon as you fill in your Storefront API token (see below)
- Skip link, semantic landmarks, keyboard-friendly drawers, ARIA on variant pickers
- Product + Organization + FAQ JSON-LD, canonical URLs, Open Graph tags
- `sitemap.xml`, `robots.txt`, SVG favicon

## Turning on real Shopify checkout

Without this, the cart is local-only and "Proceed to checkout" shows a mock message. With it, add-to-cart talks to your existing Shopify store and the checkout button redirects to your hosted Shopify checkout page.

1. **Generate a Storefront API token in your Shopify admin:**
   - Go to *Settings → Apps and sales channels → Develop apps*
   - *Create an app* (call it "Website Storefront" or similar)
   - Click into it → *Configure Storefront API scopes*
   - Grant these permissions: `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`, `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`
   - *Save* → *Install app* → copy the **Storefront API access token** it shows you

2. **Open `js/config.js` in a text editor** and replace the two placeholder strings:
   ```js
   shopifyDomain: 'willabean.myshopify.com',    // your .myshopify.com domain
   storefrontToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
   ```

3. **Check the `productHandles` map** — each of our product page handles maps to a handle on your Shopify store. If your Shopify product handles differ (e.g. `the-winnie` rather than `winnie`), update the mapping.

4. **Set up the 30%-off-lead automatic discount in Shopify admin** (so the site doesn't need to know about it):
   - *Discounts → Create discount → Buy X get Y*
   - Buy: any product in collection "Dog Collars" — quantity 1
   - Get: any product in collection "Dog Leads" — 30% off, quantity 1
   - **Lowest-priced item gets the discount** (under the "Get" advanced settings) — keeps the discount on the cheapest lead so margin is protected
   - **Maximum number of uses per order:** leave OFF so it scales (one discount per qualifying collar — buy 2 collars + 2 leads, get both leads at 30% off)
   - Set as automatic, no code required
   - Save

   The cart preview on the site implements the same logic (cheapest lead, capped at one discount per collar) so the customer sees the right total before checkout.

5. **Reload the site.** The cart will now talk to Shopify. Add something, open the drawer, click Proceed to Checkout — you'll go to your Shopify-hosted checkout.

`js/config.js` is in `.gitignore` — your token stays on your machine.

## Custom-sizing and bespoke orders

- **Neck measurement** is a free-text number (in cm) on every collar page. When the order lands in Shopify, the value appears as a line-item property on the order ("Neck measurement: 34 cm"). No variants to pre-create.
- **Archie bespoke colour combinations** use the same mechanism — there's a textarea where the customer describes what they want, and it comes through on the order.

## What's intentionally left for you

- **Product photos.** Most product pages currently show placeholder blocks with descriptive captions (which double as alt-text guides). A handful of real images scraped from willabean.co.uk are wired in: the homepage hero, gundog collection cards, and the favicon/logo assets. You can either upload more images into `/images/products/` and swap the placeholder divs for `<img>` tags, or — more practically — leave them alone. Once Shopify integration is on, `shopify.js` can be extended to pull images from the Storefront API automatically (function exists: `getProductByHandle`).
- **Analytics.** No GA/Plausible/Meta Pixel yet. Add your tag in `partials/footer.html` once you pick a provider.
- **Newsletter backend.** The footer form currently just says "thanks". Wire it up to Klaviyo, Mailchimp, or Shopify's customer signup whenever you're ready.
- **Deployment.** This is local-only right now. When you're happy with it, push the whole folder to Netlify/Vercel/GitHub Pages and point your domain at it. I'd recommend running both this site and your current Shopify storefront in parallel briefly while you watch for any issues.

## File tree

```
/
├── index.html                      Homepage
├── shop.html                       Shop landing
├── our-story.html                  About
├── collections/                    5 collection pages
├── products/                       16 product pages
├── blog/                           Index + 3 long-form posts
├── partials/                       header, footer, cart drawer
├── css/                            5 files (reset, tokens, base, components, pages)
├── js/                             includes, main, cart, product-page, shopify, config
├── images/                         brand + lifestyle + products
├── sitemap.xml                     All 28 URLs
├── robots.txt
├── start.bat / start.sh / start.ps1  Local preview launchers
├── willabean-seo-audit-v2.md       The source-of-truth content document
└── README.md                       You are here
```

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| `--cream` | `#f5ede0` | Primary background |
| `--cream-deep` | `#ece2cf` | Section alt / cards |
| `--moss` | `#3e5236` | Primary brand / buttons / links |
| `--moss-deep` | `#2a3a25` | Headings / hover |
| `--bronze` | `#a67b40` | Accent / "handmade" details |
| `--ink` | `#1f1f1a` | Body text |
| `--terracotta` | `#c2592e` | Warnings, sale badges (sparing) |

All in `css/tokens.css` — change once, applies everywhere.

## Typography

- **Fraunces** — warm crafted serif, used for H1/H2/H3 and display text
- **Inter** — clean sans-serif, used for body, UI, buttons

Loaded from Google Fonts CDN; can be self-hosted in `/fonts/` later for performance.

---

*Content in this site is drawn from `willabean-seo-audit-v2.md`. Tech: plain HTML/CSS/JS, no build step, no framework. Commerce: headless Shopify, ready to wire in.*
