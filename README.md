# Vitaly demo storefront

Vitaly is the fictional health & supplements brand used across Meiro demos (the English rebrand of the Natima demo on `meiro-demo.eu.pipes.meiro.io`). This repo is its storefront: a modern e-commerce site built for demonstrating Meiro CDP concepts: anonymous behaviour tracking, identity resolution, consent-aware tracking, profile enrichment, cart intent, recommendations, web push and personalization.

Deployed at https://dmostoregpt.netlify.app.

## Catalog

`src/data/vitalyCatalog.json` is an export of the **Vitaly · Products** catalog on meiro-demo (130 items, English, CZK). Product `id` = the catalog external id (`natima-…`, immutable from the original Natima build), so `item_id` in every SDK event matches the catalog, the saved feeds and product-level attributes. 29 VITALY Select items use the brand packshots hosted on the instance; other brands use the catalog's own image links. Lifestyle photography in `public/assets/lifestyle/` is from Unsplash; brand story images and the logo in `public/assets/vitaly/` come from the Natima/Vitaly demo kit.

Launch items (`release_date` + zero stock) are treated as pre-orders; past launch dates roll forward in 30-day steps so they always read as upcoming.

## Run Locally

```bash
npm install
npm run dev
npm run check
```

## Environment

Copy `.env.example` to `.env` when connecting real services.

```env
VITE_MEIRO_SDK_ENABLED=true
VITE_MEIRO_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk
VITE_MEIRO_SCRIPT_URL=https://meiro-demo.eu.pipes.meiro.io/mpt.js
VITE_MEIRO_DEBUG=true
VITE_MEIRO_PROFILE_API_ENABLED=true
VITE_MEIRO_PROFILE_API_PROXY_URL=/api/meiro-profile
VITE_MEIRO_PROFILE_API_IDENTIFIER_TYPE=user_id
VITE_DEMO_DEBUG_ENABLED=true
MEIRO_PROFILE_API_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/profile-api/web-perso
MEIRO_PROFILE_API_TOKEN=your-profile-api-token
```

SDK tracking is enabled by default. Set `VITE_MEIRO_SDK_ENABLED=false` to run in local mock mode only.
Profile API hydration is enabled through the Netlify Function at `/api/meiro-profile`. Keep `MEIRO_PROFILE_API_TOKEN` server-side only; do not expose it as a `VITE_` variable. The storefront uses the Meiro SDK `mpt_user_id_js` cookie as the `user_id` identifier when available, then falls back to profile email/phone and merges returned attributes into local personalization and recommendation state.

If analytics consent is disabled, behavioral events are suppressed by the Meiro wrapper and logged as `[Meiro Demo Event Suppressed]` in debug mode. `consent_updated` still fires so consent changes remain auditable.

## Demo Routes

- `/` homepage: hero + personalization zones, category tiles, recommendation rails, VITALY Select spotlight, launch pre-orders, lifecycle slots, Second chance, newsletter with interests
- `/products`, `/category/:slug`, `/collections/:slug` (`vitaly-select`, `bestsellers`, `new`, `second-chance`) with filters and sorting
- `/product/:slug` (also `/product/:catalogId` and the bare catalog slug `/:slug/`, so catalog `link` values map 1:1)
- `/cart` (alias `/kosik`), `/checkout` (alias `/objednavka`), `/thank-you`. The Czech aliases match the path rules of the Vitaly web banners on the instance
- `/register`, `/login`, `/account`
- `/search`
- `/playbooks` mapping common ecommerce CDP journeys to demo surfaces
- `/demo-control` for switching personas
- `/review` for post-purchase review and referral surfaces

## Meiro Integration Layer

The integration files live in `src/integrations/meiro/`:

- `meiroClient.ts`: `trackEvent`, `identifyUser`, `trackPageView`, debug sink
- `meiroConfig.ts`: Meiro endpoint/script defaults and config status
- `meiroEvents.ts`: reusable ecommerce payload helpers
- `meiroPersonalization.ts`: local rules prepared for Meiro-powered decisions
- `eventSchemas.ts`: tracked event names

When `VITE_MEIRO_SDK_ENABLED=true`, the wrapper creates `window.mpt`, calls `mpt("config", ...)`, injects `mpt.js`, maps consent updates to `mpt("consent", ...)`, and forwards events with `mpt("event", name, payload)`.

The debug panel records recent MPT commands so SDK-mode demos can show `config`, `consent`, `set`, and `event` calls without opening browser developer tools.

Internal demo event names are mapped to canonical MPT event names before forwarding, for example `product_added_to_cart` becomes `add_to_cart` and `order_completed` becomes `purchase`.

The local event log still shows internal names because they are more descriptive for the demo. The MPT SDK call log in `/demo-control` shows the canonical names actually sent to Meiro.

See `MEIRO_INTEGRATION.md` for the SDK wiring point, consent behavior, and personalization decision shape.

## Tracked Events

`page_view`, `product_view`, `category_view`, `product_list_view`, `search_submitted`, `search_result_clicked`, `product_added_to_cart`, `product_removed_from_cart`, `cart_view`, `checkout_started`, `checkout_step_completed`, `order_completed`, `newsletter_signup`, `user_registered`, `user_logged_in`, `profile_updated`, `recommendation_viewed`, `recommendation_clicked`, `personalization_viewed`, `personalization_clicked`, `review_submitted`, `wishlist_added` (→ `add_to_wishlist`), `back_in_stock_requested` (→ `generate_lead`, watchdog / launch notify), `consent_updated`. Commerce payloads use CZK and include `item_brand`.

## Demo Personas

The `/demo-control` page supports anonymous visitors, returning visitors, known customers, high-value customers, cart abandoners, discount-sensitive visitors, fitness enthusiast, family health, sleep & stress browsing, newsletter subscribers, post-purchase customers, and lapsed customers.

It also includes seeded Profile API scenarios for deterministic QA of VIP replenishment, cart recovery, and review/referral personalization without depending on a live profile response.

## Web push service worker

`public/mpt-service-worker.js` is served at the site root (`/mpt-service-worker.js`) and only imports the instance worker:

```js
importScripts('https://meiro-demo.eu.pipes.meiro.io/mpt-service-worker.js');
```

The domain must match the `mpt.js` domain. `netlify.toml` pins a JS content type, `Cache-Control: no-cache` and an explicit 200 rule for that path before the SPA catch-all. Web push is configured on the `web-sdk` source on meiro-demo (`/web-push/web-sdk.json`), which is the source this site sends to.

## Netlify

`netlify.toml` includes the build command and SPA redirect:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Roadmap Anchor

See `ROADMAP.md` for the follow-up path. The first implementation intentionally keeps API boundaries stable so Meiro SDK wiring, richer assets, and deployment work can be added without rewriting the demo flows.

## QA Notes

- `npm run check` verifies TypeScript, production bundling, catalog coverage, required routes, event schemas, MPT wiring, Netlify redirect, and project docs.
- Current browser smoke checks cover home, products, product detail, cart, checkout, search, demo-control persona switching, and mobile product-grid overflow.

## Presenter Flow

Use `DEMO_SCRIPT.md` for a concise walkthrough of anonymous tracking, personalization, cart intent, identity resolution, consent-aware suppression, and simulated checkout.
