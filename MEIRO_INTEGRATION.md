# Meiro Integration Notes

The app is intentionally built around a stable local wrapper so the UI does not need to change when the real Meiro SDK is connected.

## Files

- `src/integrations/meiro/meiroClient.ts`: public wrapper for `trackEvent`, `identifyUser`, `trackPageView`, and consent gating
- `src/integrations/meiro/meiroEvents.ts`: ecommerce payload helpers
- `src/integrations/meiro/meiroPersonalization.ts`: local decision rules and decision metadata
- `src/integrations/meiro/meiroProfileApi.ts`: Profile API fetch and attribute normalization for realtime personalization
- `src/integrations/meiro/meiroConfig.ts`: environment/configuration status for demo-control
- `src/integrations/meiro/eventSchemas.ts`: canonical event names

## Environment Variables

```env
VITE_MEIRO_SDK_ENABLED=true
VITE_MEIRO_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk
VITE_MEIRO_SCRIPT_URL=https://meiro-demo.eu.pipes.meiro.io/mpt.js
VITE_MEIRO_DEBUG=true
VITE_MEIRO_PROFILE_API_ENABLED=true
VITE_MEIRO_PROFILE_API_PROXY_URL=/api/meiro-profile
VITE_MEIRO_PROFILE_API_IDENTIFIER_TYPE=user_id
MEIRO_PROFILE_API_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/profile-api/web-perso
MEIRO_PROFILE_API_TOKEN=your-profile-api-token
```

The demo endpoint and script URL default to the Meiro demo source:

- script: `https://meiro-demo.eu.pipes.meiro.io/mpt.js`
- collection endpoint: `https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk`

SDK tracking is enabled by default. Set `VITE_MEIRO_SDK_ENABLED=false` to disable SDK loading and run in local mock mode.

Profile API hydration is enabled through the server-side Netlify Function at `/api/meiro-profile`. By default the browser queries:

```txt
/api/meiro-profile?identifier_type=user_id&identifier_value={profile.email}
```

The function forwards to `MEIRO_PROFILE_API_ENDPOINT` using the server-only `MEIRO_PROFILE_API_TOKEN` as the `X-API-Token` header. Returned attributes are normalized into the local `CustomerProfile` shape and reused by banners, account fields, lifecycle slots, and `next_best_product` recommendations. Supported identifier configuration values are `user_id`, `email`, `phone`, `device_id`, and `browser`; the current UI can supply email/user_id and phone identifiers.

## Profile API Attribute Coverage

The storefront consumes these Profile API attributes when present. The current real-time Profile API set covers VIP/value, purchase recency, last purchase, cart, reorder, and journey membership.

| Attribute | Main surfaces |
| --- | --- |
| `email`, `first_name`, `surname`, `phone` | account identity, checkout contact prefill |
| `street_address`, `apartment_or_company`, `city`, `postal_code`, `country` | checkout shipping prefill |
| `vip_tier`, `lifetime_value`, `purchase_count` | homepage banner, account banner, VIP lifecycle slot |
| `recommended_tags`, `category_affinity` | homepage recommendations, category intro, recommendation ordering |
| `predicted_reorder_date`, `last_purchased_sku`, `days_since_last_purchase` | top banner, replenishment slot, reorder product, review/referral product, win-back slots |
| `has_active_cart`, `cart_item_ids`, `last_abandoned_cart_value` | hero recovery, cart banner, cross-sell recommendations |
| `last_viewed_product_id`, `viewed_product_count` | recently viewed rail and browse-abandonment proof |
| `journey_membership`, `marketing_consent`, `push_opt_in`, `discount_affinity` | journey labels, consent proof, cart discount slot |
| `next_best_product_ids`, `next_best_action` | optional recommendation/content override fields |
| `delivery_status`, `repeat_buyer`, `has_left_review`, `referral_code` | optional post-delivery/review/referral fields; not expected until OMS/review/referral source fields exist |

Common aliases are accepted in `meiroProfileApi.ts`, for example `loyalty_tier` for `vip_tier`, `total_orders` for `purchase_count`, and `recommended_product_ids` for `next_best_product_ids`.

`/demo-control` shows a configured-attribute missing-values list after a profile loads. It only treats the currently configured real-time attributes as required. Optional recommendation/content fields and post-delivery placeholders are shown separately so they do not look like Profile API failures.

`src/data/profileApiScenarios.ts` contains deterministic seeded profiles for presenter QA. Loading one from `/demo-control` marks Profile API status as loaded with `identifier_type=scenario` and populates the same normalized profile fields that the live API would populate. This does not call the live Profile API and is meant only to validate UI surfaces and demo flow.

## Implemented MPT Bootstrap

When enabled, `meiroClient.ts` creates the queue-compatible `window.mpt` function, calls:

```ts
window.mpt("config", {
  collection_endpoint: "https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk",
  link_tracking: { enabled: true },
  tracking_rules: {
    enabled: true,
    storage_allowlist: {
      local_storage: ["esc_consent", "esc_persona", "esc_profile"],
      session_storage: ["checkout_step"],
    },
  },
});
```

Then it asynchronously injects the SDK script from `VITE_MEIRO_SCRIPT_URL`.

The wrapper records every MPT command it issues in a local debug buffer. `/demo-control` and the floating debug panel show recent `config`, `consent`, `set`, and `event` calls so presenters can confirm what would be sent to the SDK.

## Consent Behavior

`consent_updated` always tracks so consent changes are auditable.

When SDK mode is enabled, app consent updates call:

```ts
window.mpt("consent", {
  storage_persistence: "granted" | "denied",
  user_id: "granted" | "denied",
  session_id: "granted" | "denied",
});
```

Analytics or marketing consent grants `storage_persistence` and `session_id`. Analytics or personalization consent grants `user_id`.

When analytics consent is off, the wrapper suppresses behavioral events before they enter the local event buffer or SDK forwarding path. In debug mode the console shows:

```txt
[Meiro Demo Event Suppressed]
```

When personalization consent is off, personalization decisions become `suppressed` and zones render fallback content.

## SDK Wiring Point

The SDK forwarding path is implemented inside `trackEvent()`:

```ts
window.mpt("set", {
  page_url: event.page_url,
  referrer: event.referrer,
});
window.mpt("event", canonicalMptEventName, {
  ...payload,
  original_event_name: internalEventName,
});
```

Keep all UI code calling the wrapper methods, not the SDK directly.

`identifyUser()` calls `window.mpt("set", userPayload)` so later events share the profile fields.

## Event Name Mapping

The app keeps descriptive internal event names for the local debug panel, but the browser SDK only accepts canonical MPT event names. `meiroClient.ts` maps internal names before forwarding:

- `product_view` → `view_item`
- `product_list_view` / `category_view` → `view_item_list`
- `product_added_to_cart` → `add_to_cart`
- `product_removed_from_cart` → `remove_from_cart`
- `cart_view` → `view_cart`
- `checkout_started` / `checkout_contact_submitted` / `checkout_step_completed` → `begin_checkout`
- `checkout_shipping_submitted` → `add_shipping_info`
- `checkout_payment_submitted` → `add_payment_info`
- `order_completed` → `purchase`
- `search_submitted` → `search`
- `search_result_clicked` / `recommendation_clicked` → `select_item`
- `newsletter_signup` / `user_registered` → `sign_up`
- `user_logged_in` → `login`
- `personalization_viewed` → `view_promotion`
- `personalization_clicked` → `select_promotion`
- `review_submitted` → `form_submit`
- `profile_updated` → `generate_lead`

`consent_updated` is not forwarded as an event because consent is already sent through `mpt("consent", ...)`.

If the browser console shows a validation error like:

```txt
Expected one of [...]. Received: product_added_to_cart
```

then an internal event name is being forwarded directly. Add or fix the mapping in `eventNameMap` inside `meiroClient.ts`.

The wrapper also sends `mpt("consent", ...)` immediately after `mpt("config", ...)` during SDK initialization so first-page events are not queued before consent state is known.

Use **Clear debug history** in `/demo-control` before a live run to reset local events, personalization decisions, and MPT command history.

## Personalization Decisions

Each zone resolves a structured decision:

- `zoneId`
- `decision`: `personalized`, `fallback`, or `suppressed`
- `ruleId`
- `reason`
- `content`
- `personaId`
- `timestamp`

The latest decisions are visible in `/demo-control` and the floating debug panel.
