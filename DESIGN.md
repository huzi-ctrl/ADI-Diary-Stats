---
name: DriveStats ADI
description: Apple visionOS dynamic liquid glass & Unseen.co warm architectural travertine schedule analytics
colors:
  primary: "#1c1917"
  primary-hover: "#292524"
  primary-active: "#0c0a09"
  surface-ground: "#FAF6F4"
  surface-card: "rgba(255, 255, 255, 0.82)"
  surface-nested: "#F1EDEB"
  surface-inset: "#E7E1DA"
  ink-primary: "#1c1917"
  ink-secondary: "#44403c"
  ink-muted: "#78716c"
  ink-faint: "#a8a29e"
  border-hairline: "rgba(28, 25, 23, 0.06)"
  border-subtle: "rgba(28, 25, 23, 0.12)"
  accent-rose: "#F6C8C3"
  accent-rose-soft: "rgba(246, 200, 195, 0.35)"
  accent-rose-border: "rgba(246, 200, 195, 0.6)"
  accent-emerald: "#059669"
  accent-emerald-soft: "#ecfdf5"
  accent-amber: "#d97706"
  accent-amber-soft: "#fffbeb"
  accent-coral: "#e11d48"
  accent-coral-soft: "#fff1f2"
  pearl-glow: "radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.95), rgba(246, 200, 195, 0.6) 30%, rgba(200, 220, 255, 0.5) 60%, rgba(220, 200, 255, 0.7) 100%)"
  iridescent-gradient: "linear-gradient(135deg, #1c1917 0%, #292524 40%, #7c3aed 65%, #2563eb 82%, #ec4899 100%)"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.005em"
  label:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.01em"
  editorial:
    fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif"
    fontStyle: "italic"
    fontSize: "0.875rem"
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "22px"
  2xl: "26px"
  3xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  2xl: "40px"
  3xl: "56px"
physics:
  appleLiquidGlass:
    perspective: "1000px"
    maxTilt: "5.5deg"
    scaleOnHover: "1.012"
    spotlightRadius: "360px"
    specularGlareRadius: "280px"
  hyperplexedMagnetic:
    pullFactor: "0.28"
    maxDistance: "16px"
---

# DriveStats ADI Design Language System

## 1. Aesthetic Foundations (Unseen.co & Apple visionOS)
- **Architectural Sand & Travertine Ground (`#FAF6F4`)**: Replaces cold generic corporate SaaS white and grey with a warm, natural limestone surface.
- **Deep Warm Carbon (`#1c1917`)**: High-contrast, elegant typography grounded in warm umber undertones instead of generic blue-black `#0f172a`.
- **Soft Rose Gold & Flesh Accents (`#F6C8C3`)**: Gentle, human warmth for interactive highlights, badges, and rim accents.
- **Iridescent Pearl Reflections**: Chromatic floating sphere badge and text sheen inspired by Unseen Studio's ethereal product experiences.

## 2. Dynamic Liquid Glass Specifications
Each interactive surface utilizes a multi-layered composite:
1. **Background Material Layer**: `rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(24px) saturate(190%)`.
2. **Radial Spotlight Border (`::before`)**: Live cursor tracking gradient `radial-gradient(360px circle at var(--mouse-x) var(--mouse-y), rgba(246, 200, 195, 0.75), rgba(190, 215, 255, 0.35) 35%, ...)`.
3. **Internal Specular Glare (`::after`)**: Dynamic reflection following the cursor: `radial-gradient(280px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.65), transparent 65%)`.
4. **visionOS Rim Highlights**: `0 1px 0 0 rgba(255, 255, 255, 0.9) inset`, `0 -1px 0 0 rgba(0, 0, 0, 0.05) inset`.
5. **3D Parallax Tilt**: Dynamic calculation tilting up to ±5.5° based on cursor offset from card center:
   `transform: perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.012, 1.012, 1.012)`.

## 3. Hyperplexed Magnetic Button Physics
Interactive pills and buttons implement spring cursor attraction:
- Tracks distance from cursor to element center.
- Attracts the button toward the cursor with a `0.28` pull factor (clamped to max `16px`).
- Damped spring return to `(0, 0)` upon `mouseleave`.
- Tactile scale down to `0.95` on `:active`.

## 4. Typography Pairing
- **Primary & Display UI**: `Plus Jakarta Sans` — precise geometric grotesk with modern organic curves.
- **Editorial Sub-narratives**: `Newsreader` (italic) — high-end editorial warmth for capacity debriefs and scheduling notes.
