# Demo Presenter Script

Use this as the short path through the Meiro CDP storytelling environment.

## 1. Anonymous Behavior

Start at `/products`, open two or three product detail pages, then visit `/account`.

Show:
- recently viewed products
- category affinity beginning to form
- `product_view`, `product_list_view`, and `page_view` events in the debug panel

## 2. Persona-Based Personalization

Open `/demo-control` and switch to:

- Marketing Burnout Visitor
- Parenting Chaos Visitor
- Sleep Recovery Visitor
- Cart Abandoner

Return to `/` after each switch.

Show:
- hero copy changing
- recommendation rail title changing
- personalization events in debug

## 3. Cart Intent

Add `Monday Survival Kit` to cart and open `/cart`.

Show:
- cart opener logic
- personalized cart banner
- cart cross-sell rail
- add/remove/quantity events

## 4. Identity Resolution

Open `/register` and create a fake profile after browsing anonymously.

Show:
- local anonymous history visible in account
- registered customer profile attributes
- consent state
- `identifyUser()` debug log and `user_registered`

## 5. Consent-Aware Tracking

Open `/demo-control`, use **Clear debug history**, turn analytics off, then browse a product page.

Show:
- behavioral events suppressed in console as `[Meiro Demo Event Suppressed]`
- `consent_updated` remains tracked
- personalization can be switched independently
- in SDK mode, consent changes are forwarded through `mpt("consent", ...)`
- SDK mode shows recent MPT commands in the debug panel

## 6. Simulated Checkout

Add any product, open `/checkout`, complete the four steps, and land on `/thank-you`.

Show:
- checkout step events
- order payload shape
- post-purchase lifecycle
- thank-you next-best-action zone

## 7. Ecommerce Playbook Coverage

Open `/playbooks`.

Show:
- eight Meiro ecommerce use cases mapped to concrete web surfaces
- scenario buttons that load matching demo personas
- Profile API-ready fields such as `vip_tier`, `predicted_reorder_date`, `days_since_last_purchase`, and `has_left_review`
- `/review` as the post-delivery review and referral surface

## Live Demo Notes

- No real payments or backend calls are made.
- SDK tracking is enabled by default and `src/integrations/meiro/meiroClient.ts` loads `mpt.js` and forwards events. Set `VITE_MEIRO_SDK_ENABLED=false` for mock-only local demos.
- Keep `/demo-control` open in another tab when presenting; it is the command center for personas, consent, checklist progress, and event inspection.
