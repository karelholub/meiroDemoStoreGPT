# Existential Supplies Co.

A polished fake ecommerce store for demonstrating Meiro CDP concepts: anonymous behavior tracking, identity resolution, consent-aware tracking, profile enrichment, cart intent, recommendations, and local mock personalization.

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
Profile API hydration is enabled through the Netlify Function at `/api/meiro-profile`. Keep `MEIRO_PROFILE_API_TOKEN` server-side only; do not expose it as a `VITE_` variable. The storefront queries with the identified profile email as `user_id` by default, then merges returned attributes into local personalization and recommendation state.

If analytics consent is disabled, behavioral events are suppressed by the Meiro wrapper and logged as `[Meiro Demo Event Suppressed]` in debug mode. `consent_updated` still fires so consent changes remain auditable.

## Demo Routes

- `/` homepage with personalization zones, recommendations, bestsellers, recently viewed products, newsletter, and trust section
- `/products`, `/category/:slug`, `/product/:id`
- `/cart`, `/checkout`, `/thank-you`
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

`page_view`, `product_view`, `category_view`, `product_list_view`, `search_submitted`, `search_result_clicked`, `product_added_to_cart`, `product_removed_from_cart`, `cart_view`, `checkout_started`, `checkout_step_completed`, `order_completed`, `newsletter_signup`, `user_registered`, `user_logged_in`, `profile_updated`, `recommendation_viewed`, `recommendation_clicked`, `personalization_viewed`, `personalization_clicked`, `consent_updated`.

## Demo Personas

The `/demo-control` page supports anonymous visitors, returning visitors, known customers, high-value customers, cart abandoners, discount-sensitive visitors, marketing burnout, parenting chaos, sleep recovery, newsletter subscribers, post-purchase customers, and lapsed customers.

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
