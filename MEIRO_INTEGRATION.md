# Meiro Integration Notes

The app is intentionally built around a stable local wrapper so the UI does not need to change when the real Meiro SDK is connected.

## Files

- `src/integrations/meiro/meiroClient.ts`: public wrapper for `trackEvent`, `identifyUser`, `trackPageView`, and consent gating
- `src/integrations/meiro/meiroEvents.ts`: ecommerce payload helpers
- `src/integrations/meiro/meiroPersonalization.ts`: local decision rules and decision metadata
- `src/integrations/meiro/meiroConfig.ts`: environment/configuration status for demo-control
- `src/integrations/meiro/eventSchemas.ts`: canonical event names

## Environment Variables

```env
VITE_MEIRO_SDK_ENABLED=true
VITE_MEIRO_ENDPOINT=https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk
VITE_MEIRO_SCRIPT_URL=https://meiro-demo.eu.pipes.meiro.io/mpt.js
VITE_MEIRO_DEBUG=true
```

The demo endpoint and script URL default to the Meiro demo source:

- script: `https://meiro-demo.eu.pipes.meiro.io/mpt.js`
- collection endpoint: `https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk`

SDK tracking is enabled by default. Set `VITE_MEIRO_SDK_ENABLED=false` to disable SDK loading and run in local mock mode.

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
window.mpt("event", eventName, payload);
```

Keep all UI code calling the wrapper methods, not the SDK directly.

`identifyUser()` calls `window.mpt("set", userPayload)` so later events share the profile fields.

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
