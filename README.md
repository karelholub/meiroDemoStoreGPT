# Existential Supplies Co.

A polished fake ecommerce store for demonstrating Meiro CDP concepts: anonymous behavior tracking, identity resolution, consent-aware tracking, profile enrichment, cart intent, recommendations, and local mock personalization.

## Run Locally

```bash
npm install
npm run dev
npm run build
```

## Environment

Copy `.env.example` to `.env` when connecting real services.

```env
VITE_MEIRO_SDK_ENABLED=false
VITE_MEIRO_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk
VITE_MEIRO_SCRIPT_URL=https://meiro-demo.eu.pipes.meiro.io/mpt.js
VITE_MEIRO_DEBUG=true
VITE_DEMO_DEBUG_ENABLED=true
```

When `VITE_MEIRO_SDK_ENABLED` is false, events are logged as `[Meiro Demo Event]` and stored in the local debug panel.

If analytics consent is disabled, behavioral events are suppressed by the Meiro wrapper and logged as `[Meiro Demo Event Suppressed]` in debug mode. `consent_updated` still fires so consent changes remain auditable.

## Demo Routes

- `/` homepage with personalization zones, recommendations, bestsellers, recently viewed products, newsletter, and trust section
- `/products`, `/category/:slug`, `/product/:id`
- `/cart`, `/checkout`, `/thank-you`
- `/register`, `/login`, `/account`
- `/search`
- `/demo-control` for switching personas

## Meiro Integration Layer

The integration files live in `src/integrations/meiro/`:

- `meiroClient.ts`: `trackEvent`, `identifyUser`, `trackPageView`, debug sink
- `meiroConfig.ts`: Meiro endpoint/script defaults and config status
- `meiroEvents.ts`: reusable ecommerce payload helpers
- `meiroPersonalization.ts`: local rules prepared for Meiro-powered decisions
- `eventSchemas.ts`: tracked event names

When `VITE_MEIRO_SDK_ENABLED=true`, the wrapper creates `window.mpt`, calls `mpt("config", ...)`, injects `mpt.js`, maps consent updates to `mpt("consent", ...)`, and forwards events with `mpt("event", name, payload)`.

The debug panel records recent MPT commands so SDK-mode demos can show `config`, `consent`, `set`, and `event` calls without opening browser developer tools.

See `MEIRO_INTEGRATION.md` for the SDK wiring point, consent behavior, and personalization decision shape.

## Tracked Events

`page_view`, `product_view`, `category_view`, `product_list_view`, `search_submitted`, `search_result_clicked`, `product_added_to_cart`, `product_removed_from_cart`, `cart_view`, `checkout_started`, `checkout_step_completed`, `order_completed`, `newsletter_signup`, `user_registered`, `user_logged_in`, `profile_updated`, `recommendation_viewed`, `recommendation_clicked`, `personalization_viewed`, `personalization_clicked`, `consent_updated`.

## Demo Personas

The `/demo-control` page supports anonymous visitors, returning visitors, known customers, high-value customers, cart abandoners, discount-sensitive visitors, marketing burnout, parenting chaos, sleep recovery, newsletter subscribers, and post-purchase customers.

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

- `npm run check` verifies TypeScript and production bundling.
- Current browser smoke checks cover home, products, product detail, cart, checkout, search, demo-control persona switching, and mobile product-grid overflow.

## Presenter Flow

Use `DEMO_SCRIPT.md` for a concise walkthrough of anonymous tracking, personalization, cart intent, identity resolution, consent-aware suppression, and simulated checkout.
