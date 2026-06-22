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

Status: implemented and enabled by default for browser MPT. The wrapper now configures `window.mpt`, injects `mpt.js`, forwards consent, set, and event calls, and `DEMO_SCRIPT.md` documents the live walkthrough. Event schema validation against a live Meiro destination remains a deployment-time QA step.

## Milestone 4: Personalization Expansion

- Replace local rules with Meiro decision payloads
- Add audience-based hero variants and cart banners
- Add product recommendation payload adapters
- Store personalization decisions in debug panel

Status: started. Local personalization now emits structured decision metadata into the debug panel.

## Milestone 5: Deployment And GitHub

- Run production build in CI
- Add linting and smoke tests
- Deploy preview to Netlify
- Create GitHub PR template focused on demo behavior and tracking changes

Status: started. GitHub Actions CI and PR template are in place.
