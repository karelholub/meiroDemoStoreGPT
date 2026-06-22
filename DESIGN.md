---
name: Existential Supplies Co.
description: A premium fictional ecommerce system for Meiro CDP demo storytelling.
colors:
  ink: "#1e1b18"
  paper: "#fbf8f2"
  surface: "#fffdf8"
  surface-muted: "#efe8dc"
  accent: "#b64f38"
  sage: "#6f7565"
  text-muted: "#686259"
  border: "#ded5c4"
  disabled: "#9d968a"
  gold: "#d9b25f"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "clamp(2.8rem, 6.4vw, 4.85rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "0"
  headline:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "clamp(2.2rem, 5vw, 3.9rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "0"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  xs: "0.45rem"
  sm: "0.7rem"
  md: "1rem"
  lg: "1.4rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.1rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.85rem 0.9rem"
---

# Design System: Existential Supplies Co.

## 1. Overview

**Creative North Star: "The Instrumented Boutique"**

Existential Supplies Co. looks like a composed boutique ecommerce store, then quietly reveals the CDP demo machinery underneath. The experience balances editorial product storytelling with operational clarity: beautiful enough to feel like retail, structured enough to explain consent, identity, events, and personalization in a live demo.

The system rejects generic SaaS dashboards, stock ecommerce templates, purple-gradient technical theatrics, and decorative effects that obscure the presenter flow. The product voice is wry and emotionally literate; the interface around it should stay restrained, tactile, and legible.

**Key Characteristics:**
- Warm paper surfaces with dark ink and a sparse rust accent.
- Serif display type for product/brand moments, Inter for functional UI.
- Product photography and local assets carry merchandising credibility.
- Debug, consent, and demo-control surfaces use familiar product UI patterns.

## 2. Colors

The palette is warm retail restraint: paper, ink, sage, and a rust accent used sparingly for action and signal.

### Primary
- **Ink Black** (#1e1b18): Primary text, primary buttons, dark debug surfaces, and high-contrast UI anchors.
- **Rust Signal** (#b64f38): Cart badge, primary hover, category accents, warnings, and moments that need attention.

### Secondary
- **Sage Control** (#6f7565): Persona states, completed checklist states, quiet system emphasis, and secondary semantic color.
- **Muted Gold** (#d9b25f): Fallback or caution state, used lightly.

### Neutral
- **Paper Field** (#fbf8f2): Body background and store atmosphere.
- **Warm Surface** (#fffdf8): Cards, forms, consent banner, debug panels.
- **Soft Utility Surface** (#efe8dc): Chips, stepper inactive states, lightweight panels.
- **Text Muted** (#686259): Supporting copy where contrast remains readable.
- **Border Sand** (#ded5c4): Inputs and subtle dividers.

### Named Rules

**The Sparse Signal Rule.** Rust is a signal, not decoration. Use it for action, hover, warnings, and tiny accents, not for large inactive surfaces.

## 3. Typography

**Display Font:** Georgia with Times New Roman fallback  
**Body Font:** Inter with system UI fallbacks  
**Label/Mono Font:** Inter for labels and code-style event names where possible

**Character:** The serif gives the fictional products a premium retail voice. Inter keeps controls, logs, forms, and presenter tools familiar and trustworthy.

### Hierarchy
- **Display** (700, `clamp(2.8rem, 6.4vw, 4.85rem)`, 0.98): Homepage hero and major brand statements only.
- **Headline** (700, `clamp(2.2rem, 5vw, 3.9rem)`, 1.02): Product detail and page-level titles.
- **Title** (700-800, 1.1rem-2.8rem, 1.1-1.2): Rail titles, cards, forms, and debug panel headings.
- **Body** (400, 1rem, 1.5): Product copy, page prose, form help, and descriptions. Keep long prose near 65-75ch.
- **Label** (750-800, 0.78rem, 0.08em, uppercase): Categories, status labels, and compact UI metadata.

### Named Rules

**The Serif Earns Its Moment Rule.** Use Georgia for brand and product storytelling, not for form labels, debug controls, or dense UI.

## 4. Elevation

Depth is a hybrid of subtle borders, warm surfaces, and broad ambient shadows. Cards are lightly lifted at rest; hover states can rise slightly, but core demo controls should remain predictable and not theatrical.

### Shadow Vocabulary
- **Surface Rest** (`0 20px 70px rgba(30, 27, 24, 0.06)`): Cards, panels, and empty states.
- **Card Hover** (`0 20px 55px rgba(30, 27, 24, 0.12)`): Product card hover.
- **Consent Overlay** (`0 24px 80px rgba(30, 27, 24, 0.18)`): Fixed consent banner and high-priority overlays.

### Named Rules

**The Stateful Lift Rule.** Shadows can respond to hover or overlay priority. Do not add decorative floating layers just to make a surface feel designed.

## 5. Components

### Buttons
- **Shape:** Slightly rounded rectangle (6px) with a 44px minimum height.
- **Primary:** Ink background, warm surface text, compact padding, full-width inside product cards.
- **Hover / Focus:** Rust hover with a slight translateY(-1px); focus uses a rust-tinted 3px outline with 3px offset.
- **Secondary:** Transparent warm-white treatment over hero imagery, used for secondary hero actions.

### Chips
- **Style:** Pill radius, warm muted surface, subtle border.
- **State:** Consent options and hero proof chips remain compact, readable, and plain-language.

### Cards / Containers
- **Corner Style:** 8px radius for cards and panels.
- **Background:** Warm surface over paper field.
- **Shadow Strategy:** Use Surface Rest at rest and Card Hover only when cards are interactive.
- **Border:** 1px translucent ink borders prevent glassy softness.
- **Internal Padding:** 1rem for dense cards, larger clamp padding for newsletter and empty states.

### Inputs / Fields
- **Style:** Warm surface fill, Border Sand stroke, 6px radius, 0.85rem vertical padding.
- **Focus:** Keep the global rust focus ring visible.
- **Error / Disabled:** Disabled actions use the muted disabled neutral; error states should use rust with explanatory copy.

### Navigation
- **Style:** Sticky top header, serif brand lockup, Inter nav links, transparent underline hover.
- **Mobile:** Header stacks naturally, nav remains horizontally scannable without overflow.

### Product Visuals

Product visuals use local generated product photography, not placeholders. HTML overlays may add product name, ESC mark, tags, and monograms, but the image must remain the main merchandising signal.

## 6. Do's and Don'ts

### Do:
- **Do** keep Meiro demo mechanics legible: consent, events, SDK calls, and persona controls must stay easy to inspect.
- **Do** use local product imagery for product and hero surfaces.
- **Do** preserve the paper, ink, sage, and rust vocabulary unless a task explicitly calls for a new direction.
- **Do** test mobile text wrapping for long product names and personalized hero copy.
- **Do** use Inter for functional controls and Georgia for premium product storytelling.

### Don't:
- **Don't** use generic SaaS dashboards, dark-mode purple gradients, neon accents, or glassmorphism as the visual language.
- **Don't** introduce stock ecommerce imagery or visible placeholder art.
- **Don't** hide consent state or debug feedback behind decorative treatments.
- **Don't** use colored side-stripe borders as card decoration.
- **Don't** add motion that delays a presenter trying to explain the flow.
