---
name: Vitaly
description: Storefront design system for the Vitaly health & supplements demo brand.
colors:
  violet-50: "oklch(0.975 0.012 300)"
  violet-100: "oklch(0.945 0.028 300)"
  violet-200: "oklch(0.89 0.055 300)"
  violet-400: "oklch(0.68 0.11 300)"
  violet-500: "oklch(0.6 0.13 300)"
  violet-600: "oklch(0.52 0.145 300)"
  violet-700: "oklch(0.44 0.14 300)"
  violet-900: "oklch(0.27 0.08 298)"
  ink: "oklch(0.24 0.045 295)"
  ink-2: "oklch(0.38 0.035 295)"
  muted: "oklch(0.49 0.025 295)"
  line: "oklch(0.91 0.014 300)"
  line-strong: "oklch(0.84 0.02 300)"
  bg: "oklch(0.993 0.003 300)"
  surface: "#fff"
  tile: "oklch(0.968 0.008 300)"
  leaf: "oklch(0.5 0.11 152)"
  sale: "oklch(0.54 0.19 22)"
  amber: "oklch(0.5 0.1 65)"
  star: "oklch(0.76 0.15 78)"
typography:
  display:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "clamp(2.5rem, 5.4vw, 4.4rem)"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    fontSize: "clamp(1.35rem, 2.2vw, 1.85rem)"
  body:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "14px"
  lg: "22px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.violet-600}"
    textColor: "#fff"
    rounded: "{rounded.pill}"
    height: "44px"
  product-tile:
    backgroundColor: "{colors.tile}"
    rounded: "{rounded.md}"
    note: "product images use mix-blend-mode: multiply so white packshots sit on the tile"
---

# Vitaly design system

**Identity** comes from the existing Vitaly assets on meiro-demo: the violet leaf logo, VITALY Select packshots with aubergine caps, banner typography in Poppins. The storefront keeps that identity and adds Nunito Sans for body copy (humanist contrast to geometric Poppins).

**Colour strategy**: committed violet. Violet carries primary actions, the hero pill, the VITALY Select spotlight band and lifecycle highlights; aubergine (`violet-900`) anchors the announcement bar, footer, basket button and presenter hero. Neutrals are tinted toward hue 300. Green = vegan/in stock, red = sale, amber = Second chance / low stock.

**Layout**: 1320px container, `clamp(16px, 4vw, 40px)` gutter. Sticky two-row header (search + actions, category nav with mega menu). Horizontal scroll-snap rails for recommendations, a filter sidebar that becomes a sheet under 980px, and a sticky buy bar on mobile product pages.

**Motion**: ease-out-quint, 160–320ms for UI, one orchestrated hero entrance; everything collapses to instant under `prefers-reduced-motion`.

**Z-index scale**: sticky 20 → dropdown 30 → debug 35 → sheet 40 → consent 50.
