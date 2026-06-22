# Existential Supplies Co. Roadmap

## Milestone 1: Demo Foundation

- Vite React TypeScript app
- Complete route set and static catalog
- Local cart, checkout, account, registration, login, search, consent, demo personas
- Meiro wrapper that logs events when SDK is disabled
- Local personalization and recommendation strategies
- Netlify-ready config

Status: started.

## Milestone 2: Demo Polish

- Replace repeated remote product imagery with product-specific premium packaging visuals
- Add richer empty states and debug states
- QA responsive layouts across mobile, tablet, and desktop
- Add stronger visual distinction between categories while preserving premium tone

Status: mostly complete. Product visuals, empty states, debug event inspection, presenter checklist, and mobile overflow QA are complete.

## Milestone 3: Meiro SDK Connection

- Map wrapper methods to the real SDK
- Confirm endpoint and workspace configuration through env vars
- Add consent gating for SDK calls
- Validate event schemas against Meiro destination expectations
- Add QA checklist for live demo presenters

Status: implemented and enabled by default for browser MPT. The wrapper now configures `window.mpt`, injects `mpt.js`, maps internal demo events to canonical MPT event names, forwards consent, set, and event calls, and `DEMO_SCRIPT.md` documents the live walkthrough. Live destination receipt remains a deployment-time QA step.

## Milestone 4: Personalization Expansion

- Replace local rules with Meiro decision payloads
- Add audience-based hero variants and cart banners
- Add product recommendation payload adapters
- Store personalization decisions in debug panel

Status: in progress. Local personalization now emits structured decision metadata into the debug panel. Ecommerce playbook surfaces are available for abandoned cart, welcome nurture, replenishment, post-purchase cross-sell, win-back, VIP, browse abandonment, and review/referral. These surfaces can be hydrated later from Meiro Profile API attributes or Engage decisions.

## Milestone 5: Deployment And GitHub

- Run production build in CI
- Add linting and smoke tests
- Deploy preview to Netlify
- Create GitHub PR template focused on demo behavior and tracking changes

Status: in progress. GitHub Actions CI, PR template, and dependency-light smoke checks are in place. Netlify preview deployment remains. `npx netlify status` currently reports that the CLI is not logged in; deploy needs `npx netlify login` or `NETLIFY_AUTH_TOKEN`.
