---
name: DriveStats ADI
description: High-craft, fluid schedule intelligence for UK Approved Driving Instructors inspired by Unseen Studio
colors:
  primary: "#1d4ed8"
  primary-bright: "#2563eb"
  primary-hover: "#1e40af"
  primary-active: "#172554"
  surface-ground: "#f8f9fb"
  surface-card: "#ffffff"
  surface-nested: "#f1f4f9"
  surface-inset: "#e8edf5"
  ink-primary: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#64748b"
  ink-faint: "#94a3b8"
  border-hairline: "rgba(15, 23, 42, 0.06)"
  border-subtle: "rgba(15, 23, 42, 0.12)"
  border-focus: "#1d4ed8"
  accent-emerald: "#059669"
  accent-emerald-soft: "#ecfdf5"
  accent-amber: "#d97706"
  accent-amber-soft: "#fffbeb"
  accent-coral: "#e11d48"
  accent-coral-soft: "#fff1f2"
typography:
  display:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.005em"
  label:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
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
  2xl: "24px"
  3xl: "26px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  2xl: "40px"
  3xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  card-base:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  dock-nav:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "6px 10px"
---

# Design System: DriveStats ADI

## Overview

**Creative North Star: "The Fluid Atelier" (Unseen.co Smooth Craft)**

DriveStats is sculpted for independent UK Approved Driving Instructors (ADIs) who demand effortless, high-craft operational intelligence without robotic coldness. Moving away from rigid, boxy, flight-deck grids, the visual identity embraces the organic fluidity, generous sculpted geometry, and tactile serenity inspired by **Unseen Studio** (`unseen.co`).

The interface feels alive, calm, and human. Cards are sculpted with generous, soft contours (`20px` to `28px` radii) that rest naturally on a serene porcelain ground (`#f8f9fb`). Instead of harsh clinical dividers or spreadsheet monospace grids, typography breathes with graceful editorial proportions and tabular numerals that integrate seamlessly into natural phrasing.

Intelligence is curated rather than barked: AI diagnostics appear as elegant, contextual editorial insights with soft pill action affordances and gentle fluid springs (`cubic-bezier(0.16, 1, 0.3, 1)`), making complex capacity metrics feel intuitive and satisfying.

**Key Characteristics:**
- **Organic Sculpted Forms:** Generous, soft curvature (`18px` to `28px` cards, full `9999px` pill controls) that eliminate sharp, robotic boxiness.
- **Whisper-Soft Elevation:** Pure silk white cards (`#ffffff`) floating over porcelain ground (`#f8f9fb`) supported by ultra-soft ambient light diffusion (`0 14px 36px -8px rgba(15, 23, 42, 0.04)`) and whisper-thin boundaries (`rgba(15, 23, 42, 0.06)`).
- **Human Editorial Clarity:** Refined, spacious typography with natural proportional rhythm and large, confident metrics that feel warm and effortless.
- **Fluid Capsule Timelines:** Capacity blocks visualized as sleek, pill-shaped capsules with soft pastel-rich fills (Emerald, Amber, Coral), inviting tactile exploration.
- **Inertial Spring Physics:** Silky micro-interactions with physics-modeled springs (`cubic-bezier(0.16, 1, 0.3, 1)`) and gentle micro-scales (`:active scale(0.97)`).

## Colors

The palette is tuned for soothing visual comfort, high daylight legibility, and refined warmth. Harsh saturated blues and neon purples are discarded for deep royal lapis, velvety emerald, warm transit amber, and gentle rose coral.

### Primary
- **Royal Lapis** (`#1d4ed8`): Signature accent, soft yet authoritative. Used for primary fluid pill buttons, active dock indicators, and focused elements.
- **Lapis Hover** (`#1e40af`): Enriched tone on hover.
- **Lapis Press** (`#172554`): Deep compression state on tap.

### Secondary
- **Velvet Emerald** (`#059669`): Denotes productive billable lessons, positive revenue trends, and optimal capacity.
- **Emerald Soft Pill** (`#ecfdf5`): Calming, gentle background fill for positive micro-badges and confirmed slots.

### Tertiary
- **Warm Transit Amber** (`#d97706`): Visualizes mandatory 15-minute inter-lesson travel buffers.
- **Amber Soft Pill** (`#fffbeb`): Soft background tint for travel buffer capsules and schedule pacing alerts.
- **Rose Coral** (`#e11d48`): Highlights fragmented dead time (< 90m gaps) with human warmth rather than alarmist clinical red.
- **Coral Soft Pill** (`#fff1f2`): Gentle background tint for unbookable gap callouts.

### Neutral
- **Porcelain Ground** (`#f8f9fb`): Serene, soft off-white canvas that eliminates cockpit glare while feeling warm and luxurious.
- **Silk Card Surface** (`#ffffff`): Pure white, calm container ground for all interactive modules.
- **Nested Surface Pill** (`#f1f4f9`): Soft cloud fill for sub-modules, timeline tracks, and inactive pill controls.
- **Ink Primary** (`#0f172a`): Deep slate-black text providing pristine contrast (14:1+ WCAG AAA).
- **Ink Secondary** (`#334155`): Secondary descriptive typography.
- **Ink Muted** (`#64748b`): Tertiary labels and gentle metadata.
- **Air Border** (`rgba(15, 23, 42, 0.06)`): Subtle, whisper-thin structural boundary.

### Named Rules
**The Organic Smoothness Rule.** All cards must use soft, generous corner radii (`≥ 18px`), and interactive controls must use full pill geometry (`9999px`). Harsh sharp boxes (≤ 6px) are forbidden.
**The Whispering Shadow Rule.** Depth is created through ultra-soft, low-opacity ambient light diffusion combined with 1px whisper-thin air borders. Harsh opaque drop shadows are never used.
**The Curated Accent Rule.** Color is deployed as calm accents and gentle soft-pill tints. Loud full-bleed background fills are strictly avoided.

## Typography

DriveStats pairs effortless grotesque proportions with natural tabular alignment. Numbers feel expansive, calm, and celebratory rather than cramped like spreadsheets.

**Primary & Editorial Face:** `Hanken Grotesk` (fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Character:** Warm, confident, and fluid. Headings feature relaxed tracking and generous breathing room. Numbers use tabular figures with spacious kerning to prevent jitter while maintaining editorial elegance.

### Hierarchy
- **Display** (700 Bold, `clamp(2rem, 4vw, 2.75rem)`, line-height: 1.15): Primary KPI hero figures and dashboard headline statements.
- **Headline** (600 SemiBold, `clamp(1.25rem, 2.2vw, 1.75rem)`, line-height: 1.3): Major card titles and section headers.
- **Title** (600 SemiBold, `1.125rem` / 18px, line-height: 1.4): Module headers, day names, and summary callouts.
- **Body** (400 Regular, `0.9375rem` / 15px, line-height: 1.6): Narrative insights, calendar event descriptions, and advice text.
- **Label / Pill** (500 Medium, `0.8125rem` / 13px, line-height: 1.35): Status badges, time indicators, and navigation labels.

### Named Rules
**The Editorial Breathing Rule.** Body copy and narrative insights must maintain generous line-height (`1.55` to `1.65`) and comfortable horizontal padding. Dense, squished blocks of text are banned.
**The Effortless Metric Rule.** Currency and hour figures are rendered in confident, large display scales with subtle unit suffixes, avoiding robotic code-block styling.

## Layout

The spatial model uses flowing card groups with generous separation and fluid padding.

### Spatial Model & Grid
- **Container Max-Width:** `1360px` with fluid responsive margins (`18px` mobile, `32px` desktop).
- **Rhythm & Separation:** Generous 16px to 24px gaps between modules to avoid cramped dashboard clutter.
- **Card Padding:** `20px` to `28px` internal padding for spacious, breathable content arrangement.

### Responsive Behavior
- **Mobile (`< 640px`):** Single-column flow with floating pill dock docked safely above the bottom thumb sweep. Large touch targets (`≥ 48px`).
- **Desktop (`≥ 1024px`):** Fluid two-column split (`7fr : 3fr`) pairing the visual capacity timeline with the agenda and editorial insights.

## Elevation & Depth

Surfaces float with tactile serenity:
- **Resting Silk Card:** `background: #ffffff; border: 1px solid rgba(15, 23, 42, 0.06); box-shadow: 0 12px 32px -8px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.02);`
- **Hover Card:** `box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.07), 0 6px 16px -3px rgba(15, 23, 42, 0.03); transform: translateY(-2px);`
- **Floating Dock:** `box-shadow: 0 16px 40px -8px rgba(15, 23, 42, 0.1), 0 4px 12px -2px rgba(15, 23, 42, 0.04); backdrop-filter: blur(20px);`

## Shapes

- **Cards & Modules:** `20px` to `26px` smooth continuous corners (`border-radius: 22px`).
- **Pills & Interactive Buttons:** `9999px` full capsules.
- **Timeline Blocks:** `12px` to `16px` rounded capsules.

## Components

### 1. Floating Pill Navigation Dock
- Full pill capsule floating above the bottom viewport edge.
- Smooth morphing pill backdrop that slides with spring physics.
- Gentle padding, soft frosted backdrop blur (`blur(20px)`), and tactile depression (`:active scale(0.96)`).

### 2. Metric Capsule Tiles
- Generous `22px` rounded white cards with soft ambient elevation.
- Prominent, elegant metric figures with soft-pill trend tags (`+8.4% YoY`).
- Comfortable breathing room with human, helpful contextual descriptions.

### 3. Fluid Capsule Timeline Visualizer
- Smooth track with soft inset ground (`#f1f4f9`).
- Lesson appointments rendered as soft rounded capsules (`12px` radius) with gentle Emerald, Amber, and Coral tints.
- Interactive hover tooltips that elevate effortlessly.

### 4. Editorial AI Insight Module
- Soft `20px` rounded card with delicate warm sapphire tint.
- Gentle sparkle icon with human, clear narrative recommendation.
- Smooth pill action button that executes simulations seamlessly.

## Do's and Don'ts

### Do:
- **Do** use generous, soft corner radii (`18px` to `26px` for cards, `9999px` for controls).
- **Do** give elements ample breathing room and generous line-height (`1.55` - `1.65`).
- **Do** use whisper-soft ambient shadows and faint hairline borders for depth.
- **Do** format numbers with large, calm display styling.
- **Do** ensure fluid, spring-damped motion (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Don't:
- **Don't** create sharp, robotic rectangular cards with rigid 4px/6px corners.
- **Don't** use cold spreadsheet monospace aesthetics for general UI or metrics.
- **Don't** make the interface feel like a flight cockpit or technical terminal.
- **Don't** use thick clinical colored side borders (anti-pattern: side-tab).
- **Don't** crowd metrics together without generous spacing.
