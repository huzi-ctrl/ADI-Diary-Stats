---
name: DriveStats ADI
description: High-precision schedule and capacity intelligence for UK Approved Driving Instructors
colors:
  primary: "#1a56db"
  primary-hover: "#1e40af"
  primary-active: "#172554"
  surface-ground: "#f8fafc"
  surface-card: "#ffffff"
  surface-nested: "#f1f5f9"
  surface-inset: "#e2e8f0"
  ink-primary: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#64748b"
  ink-faint: "#94a3b8"
  border-hairline: "#e2e8f0"
  border-subtle: "#cbd5e1"
  border-focus: "#1a56db"
  accent-emerald: "#059669"
  accent-amber: "#d97706"
  accent-crimson: "#dc2626"
  accent-indigo: "#4f46e5"
typography:
  display:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 1.625rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'Geist Mono', 'JetBrains Mono', 'SF Mono', Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  xs: "3px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  full: "9999px"
spacing:
  2xs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card-base:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "20px"
  dock-nav:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "6px 8px"
---

# Design System: DriveStats ADI

## Overview

**Creative North Star: "The Swiss Flight Deck"**

DriveStats is engineered for independent UK Approved Driving Instructors (ADIs) who make high-stakes operational decisions in two distinct physical environments: inside a parked training car between back-to-back student appointments under intense daylight cockpit glare, and at a home desk during late-evening weekly administrative and financial reviews.

The visual system rejects the ephemeral, generic tropes of "vibe-coded" AI software—specifically banning neon purple/cyan pastel gradients, blurry muddy glassmorphism cards, floating diffuse drop shadows, and oversized novelty border radiuses. In their place, DriveStats synthesizes the technical rigor and 1px hairline containment of Appsmith's data tooling, the architectural Swiss grotesk typography and disciplined baseline grid of Kota Studio, and the tactile hardware-grade spring physics and micro-reactivity of Unseen Studio.

The result is a calm, authoritative instrument. Every element is high-contrast, functionally bordered, and glanceable in 1.5 seconds from an in-car phone mount. Tabular monospaced numerals prevent numeric layout jitter across currencies and hour totals, while embedded diagnostic badges provide executive-level scheduling feedback directly within context rather than relegating intelligence to an isolated chat bubble.

**Key Characteristics:**
- **Strict Light-First Foundation:** Crisp architectural gallery white (`#ffffff`) atop a neutral concrete ground (`#f8fafc`) with deep charcoal ink (`#0f172a`), delivering flawless sunlight legibility.
- **Hairline Precision:** Containers defined by crisp 1px structural borders (`#e2e8f0`), replacing amorphous ambient shadows with engineered architectural boundaries.
- **Dual Ergonomics:** Floating thumb-zone bottom navigation with morphing pill indicators on mobile; high-density 12-column administrative grid on desktop.
- **Swiss Typographic Hierarchy:** Disciplined pairing of tight-tracked grotesque sans headings (`-0.025em`) with monospaced tabular numerals (`tabular-nums`) for currency, times, and ratios.
- **Hardware-Grade Tactile Motion:** Physics-based spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`) and micro-scale depression (`:active scale(0.985)`) on all interactive controls.

## Colors

The DriveStats color palette is calibrated for high functional contrast, technical clarity, and restrained visual hierarchy. Color is used strictly to encode meaning, never as arbitrary background decoration.

### Primary
- **Authoritative Royal Cobalt** (`#1a56db`): The system's signature operational accent. Used exclusively for primary interactive commands, active navigation pills, selection indicators, and focused input boundaries. It is never used across large passive containers.
- **Cobalt Hover** (`#1e40af`): Darkened state for pointer interactions.
- **Cobalt Active / Press** (`#172554`): High-compression state during tactile engagement.

### Secondary
- **Precision Emerald** (`#059669`): Denotes positive business metrics, billable lesson capacity, healthy week-over-week revenue gains, and confirmed DVSA test bookings.
- **Emerald Subtle** (`#ecfdf5`): Tonal background tint for billable time indicators and efficiency badges.

### Tertiary
- **Transit Amber** (`#d97706`): Highlights necessary operational buffers (15-minute inter-lesson travel windows) and capacity thresholds nearing saturation.
- **Transit Amber Subtle** (`#fffbeb`): Tonal background tint for travel buffer timeline blocks and schedule warnings.
- **Critical Crimson** (`#dc2626`): Identifies unbookable schedule dead time (gaps under 90 minutes that produce zero revenue), cancellation bottlenecks, and configuration errors.
- **Crimson Subtle** (`#fef2f2`): Tonal background tint for unbookable gap callouts and error summaries.

### Neutral
- **Surface Ground** (`#f8fafc`): Architectural cool off-white page canvas. Prevents high-glare eye fatigue while ensuring maximum contrast against card surfaces.
- **Surface Card** (`#ffffff`): Pure white primary container background for all KPI blocks, chart wrappers, tables, and modal sheets.
- **Surface Nested / Sub-Card** (`#f1f5f9`): Cool slate container fill for secondary modules, tabular column headers, and inactive button states.
- **Surface Inset** (`#e2e8f0`): Deep inset fill for progress bar tracks, timeline backgrounds, and divider troughs.
- **Ink Primary** (`#0f172a`): Deep slate-black text for primary titles, numeric data values, and active control labels. Ensures WCAG AAA contrast (minimum 14:1 against card ground).
- **Ink Secondary** (`#334155`): Secondary typography for descriptions, column headings, and secondary button text.
- **Ink Muted** (`#64748b`): Tertiary typography for metadata, unit labels, timestamps, and inactive tab labels.
- **Ink Faint** (`#94a3b8`): Placeholder text and disabled affordances.
- **Border Hairline** (`#e2e8f0`): Structural 1px border that crisply encloses every card, grid cell, and table row.
- **Border Subtle** (`#cbd5e1`): Elevated border for interactive inputs and secondary button outlines.

### Named Rules
**The Strict Light-First Rule.** Surfaces are architectural light gallery neutrals by default. In-car daylight legibility is non-negotiable; dark mode is an optional secondary override for nighttime desk audits, never the default.
**The Anti-Vibe Rule.** Saturated purple-to-cyan gradients, floating pastel drop shadows, and multi-color background blobs are permanently banned from the design system.
**The 10% Cobalt Rule.** The primary Royal Cobalt accent may occupy no more than 10% of any viewport's surface area. Its rarity creates immediate, instinctive visual hierarchy.

## Typography

DriveStats uses a dual-engine typographic system: a Swiss Grotesque sans-serif for editorial authority and UI clarity, paired with a monospaced tabular typeface for numeric precision.

**Display & Body Font:** `Hanken Grotesk` (fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Tabular Numerics & Code Font:** `Geist Mono` (fallback: `'JetBrains Mono', 'SF Mono', Menlo, monospace`)  
**Character:** Clean, structural, and unadorned. Large headlines carry a tight architectural negative tracking reminiscent of Swiss poster design, while body copy remains legible down to 12px on small mobile viewports.

### Hierarchy
- **Display** (700 Bold, `clamp(1.75rem, 3.5vw, 2.5rem)`, line-height: 1.15, letter-spacing: `-0.03em`): Dashboard master title and primary KPI hero values.
- **Headline** (600 SemiBold, `clamp(1.25rem, 2vw, 1.625rem)`, line-height: 1.25, letter-spacing: `-0.025em`): Section titles, modal headers, and column group headers.
- **Title** (600 SemiBold, `1rem` / 16px, line-height: 1.35, letter-spacing: `-0.015em`): Card headers, metric labels, and list item primary lines.
- **Body** (400 Regular, `0.875rem` / 14px, line-height: 1.5, letter-spacing: `-0.01em`): Explanatory notes, calendar event titles, and diagnostic narrative text (max line length: 65ch).
- **Body Small** (400 Regular, `0.8125rem` / 13px, line-height: 1.4, letter-spacing: `0`): Secondary metadata, timestamps, and input assistance text.
- **Label / Metric Tabular** (500 Medium / 600 SemiBold, `0.75rem` / 12px to `1.125rem` / 18px, `font-variant-numeric: tabular-nums`, letter-spacing: `0.02em`): All currency values (£), weekly hours, billable percentages, travel gap durations, and calendar dates.

### Named Rules
**The Tabular Numerics Rule.** Every currency amount (£), lesson duration, percentage, and time interval must render in a monospace tabular numeral font (`font-variant-numeric: tabular-nums`). Fluctuating numbers must never cause horizontal layout shifts.
**The Negative Tracking Rule.** Headings at or above 16px must apply negative letter-spacing (`-0.02em` to `-0.03em`) to eliminate visual slack and emulate Swiss typographic precision.

## Layout

DriveStats operates across two ergonomic modes: **Cockpit Mobile** (single-column viewport, thumb-zone controls, swipeable date carousels) and **Executive Desktop** (dense 12-column administrative grid, split-pane timeline, side-by-side YoY analytics).

### Spatial Model & Grid
- **Container Max-Width:** `1360px` with responsive horizontal gutters (`16px` mobile, `24px` tablet, `32px` desktop).
- **Desktop 12-Column Grid:** 12 equal-width columns with `20px` gutters. Standard split ratio: 8 columns (primary timeline & capacity analytics) to 4 columns (in-column AI diagnostics & lesson agenda).
- **Spacing Scale:** Built on a strict 4px/8px modular scale (`2xs: 2px`, `xs: 4px`, `sm: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `2xl: 32px`, `3xl: 48px`).

### Responsive Breakpoints
- **Mobile (`< 640px`):** Single column flow. Header compresses to sticky top date bar; main navigation docks to the floating bottom bar. KPI cards display in a 2x2 compact grid.
- **Tablet (`640px - 1023px`):** KPI cards flow into a 4-column row. Charts expand to full card width with horizontal scroll fallback for timeline scrubbers.
- **Desktop (`≥ 1024px`):** Side-by-side split layout (`7fr : 3fr` or `8fr : 4fr`). Persistent header actions, side-by-side YoY comparison tables, and expansive schedule heatmaps.

### Named Rules
**The Thumb-Zone Priority Rule.** On viewports under 640px, primary switching controls, date shifts, and filter toggles must reside within the lower 35% of the screen or be accessible via horizontal swipe gestures.
**The No-Horizontal-Drift Rule.** No container or card may trigger unintended horizontal window scrolling. Data-dense tables and 7-day timelines must provide isolated internal horizontal scroll containers with visible hairline edge fade indicators.

## Elevation & Depth

DriveStats completely rejects diffuse, muddy drop shadows in favor of **Tonal Layering and Hairline Containment**. Depth is achieved through crisp 1px borders, subtle surface value steps, and deliberate z-index elevation for floating controls.

### Shadow Vocabulary
- **Resting Card:** `box-shadow: none` — structural containment is delivered entirely by `border: 1px solid #e2e8f0`.
- **Card Hover (Pointer Devices):** `box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.03); border-color: #cbd5e1;`
- **Floating Mobile Dock Bar:** `box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;`
- **Modal Sheet / Popover:** `box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 1px 3px 0 rgba(15, 23, 42, 0.04); border: 1px solid #cbd5e1;`

### Named Rules
**The Hairline Boundary Rule.** Structural containers are separated by 1px solid borders, never by blurry ambient shadow drop-offs. When contrast is needed, step the surface tone (`#ffffff` vs `#f1f5f9`), do not add shadow.
**The Hardware Elevation Rule.** Floating elements (the bottom mobile dock, sticky date pill, and toast notifications) receive tight, low-radius shadows that simulate hardware objects suspended 4mm above a matte table surface.

## Shapes

The form language is disciplined, engineered, and intentional. Radii scale predictably with component size.

- **Sharp / Micro (`3px` - `6px`):** Used for micro-badges, status indicators, timeline blocks, and form inputs (`6px`).
- **Standard Controls (`6px` - `8px`):** Used for primary, secondary, and ghost buttons.
- **Card Containers (`10px`):** Standard radius for all KPI tiles, chart cards, and modal dialogs.
- **Floating Dock & Pills (`9999px` / Full Pill):** Reserved strictly for the mobile floating bottom dock, active tab indicator pills, and standalone filter chips.

### Named Rules
**The Engineered Radius Rule.** Cards and data containers use tight 10px corners; interactive controls use 6px. Full pill radiuses (`9999px`) are reserved strictly for floating navigation docks and micro status badges.
**The No-Pill Button Rule.** Primary action buttons must never use full pill (`9999px`) rounding. They must use structural `6px` or `8px` corners to convey operational solidity rather than casual social-app aesthetics.

## Components

### 1. Mobile Floating Bottom Control Dock
The primary navigational anchor on mobile devices, floating above the viewport bottom with safe-area inset accommodation.
- **Container:** Full pill shape (`border-radius: 9999px`), background: `#ffffff`, border: `1px solid #e2e8f0`, height: `56px`, padding: `4px 6px`.
- **Morphing Active Pill:** Royal Cobalt backdrop (`#1a56db`), white typography (`#ffffff`), `border-radius: 9999px`, physics-based layout slide transition (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Inactive Items:** Slate muted typography (`#64748b`), hover/active state: subtle slate background (`#f1f5f9`), icon size: `18px`, label font size: `11px`.

### 2. Sticky Week Chip & Date Switcher
Glanceable week selector anchored to the top of mobile views and desktop header.
- **Style:** Compact pill badge (`border-radius: 9999px`), background: `#ffffff`, border: `1px solid #e2e8f0`.
- **Controls:** Arrow chevron buttons (`28px x 28px`, `border-radius: 6px`) with `:active scale(0.94)`.
- **Typography:** `Geist Mono` medium font (`12px`, tabular numerals) indicating "Week 41: 06 Oct – 12 Oct".

### 3. KPI Metric Cards
Executive summary tiles for Billable Hours, Gross Revenue, Schedule Fill Rate, and Dead Gap Hours.
- **Container:** Pure white card (`#ffffff`), border: `1px solid #e2e8f0`, `border-radius: 10px`, padding: `16px 20px`.
- **Header:** Uppercase 11px label (`#64748b`, letter-spacing: `0.05em`) paired with a functional 14px icon.
- **Metric Value:** `28px` (mobile) to `34px` (desktop), `700 Bold`, `Geist Mono` tabular font (`#0f172a`), strictly left-aligned.
- **Micro-Trend Badge:** Inline micro-chip (`padding: 2px 6px`, `border-radius: 4px`), Emerald (`#ecfdf5` / `#059669`) for positive efficiency, Crimson (`#fef2f2` / `#dc2626`) for dead gaps.

### 4. In-Column Contextual Diagnostic AI Badges
Embedded analytical intelligence badges directly inside their relevant dashboard columns, replacing separate detached chat widgets.
- **Container:** Sub-card inset (`#f8fafc`), border: `1px solid #e2e8f0`, border-left: `3px solid #1a56db`, `border-radius: 8px`, padding: `12px 16px`.
- **Global Master Toggle:** A clean header switch ("AI Copilot: Enabled / Hidden") in Settings and Dashboard toolbar that instantly unmounts all AI badges for zero distraction.
- **Badges:**
  - *Weekly Capacity Badge:* Embedded directly below the Weekly Bar Chart, calculating available lesson slots.
  - *Bottleneck Day Badge:* Embedded directly below the Daily Heatmap, flagging the day with highest unbookable gaps.
  - *YoY Seasonality Badge:* Embedded directly beside the Year-to-Date revenue summary.
- **Typography:** Headline in 12px bold (`#0f172a`), body in 13px regular (`#334155`), actionable tip in 12px medium (`#1a56db`).

### 5. Capacity & Schedule Timeline Visualizer
High-precision horizontal time bar visualizing an instructor's workday from 08:00 to 20:00.
- **Track:** 28px height, `border-radius: 6px`, background: `#f1f5f9`, border: `1px solid #e2e8f0`.
- **Blocks:**
  - *Billable Lesson:* Precision Emerald (`#059669`), crisp 1px border (`#047857`), tooltip showing student name and fee.
  - *15-Min Travel Buffer:* Transit Amber diagonal hatch (`#d97706`), indicating required transit buffer.
  - *Unusable Dead Gap:* Crimson stipple (`#dc2626`), highlighting schedule gaps < 90 min that cannot fit a standard 2-hour lesson.

### 6. Buttons & Interactive Controls
- **Primary Button:** Background: `#1a56db`, color: `#ffffff`, `border-radius: 6px`, padding: `8px 16px`, font-size: `14px`, font-weight: 500, `:hover background: #1e40af`, `:active transform: scale(0.985)`.
- **Secondary Button:** Background: `#ffffff`, border: `1px solid #cbd5e1`, color: `#0f172a`, `border-radius: 6px`, padding: `8px 16px`, `:hover background: #f8fafc`.
- **Ghost Button:** Background: `transparent`, color: `#475569`, padding: `8px 12px`, `:hover background: #f1f5f9; color: #0f172a`.
- **Icon Button:** `36px x 36px` square, `border-radius: 6px`, border: `1px solid #e2e8f0`, display: flex, align-items: center, justify-content: center.

### 7. Inputs, Dropdowns & Calendar Sync Pickers
- **Input Field:** Background: `#ffffff`, border: `1px solid #cbd5e1`, `border-radius: 6px`, padding: `8px 12px`, font-size: `14px`, color: `#0f172a`, `:focus border-color: #1a56db; outline: 2px solid rgba(26, 86, 219, 0.15)`.
- **Select Dropdown:** Native styled select with custom chevron SVG, font-family: `'Hanken Grotesk'`, background: `#ffffff`.
- **Drag-and-Drop Calendar Uploader:** Compact dashed card (`border: 1.5px dashed #cbd5e1`, `border-radius: 10px`, background: `#f8fafc`), with clear disclaimer that diary parsing is 100% client-side and zero data leaves the browser.

### 8. Tables & Event Explorer
- **Table Container:** `border: 1px solid #e2e8f0`, `border-radius: 10px`, overflow: hidden, background: `#ffffff`.
- **Header:** Background: `#f8fafc`, border-bottom: `1px solid #e2e8f0`, font-size: `11px`, font-weight: 600, uppercase, color: `#64748b`, padding: `10px 16px`.
- **Row:** Height: `44px`, border-bottom: `1px solid #f1f5f9`, hover state: `#f8fafc`, font-size: `13px`, numeric columns right-aligned with `Geist Mono` tabular font.

## Do's and Don'ts

### Do:
- **Do** format all financial amounts (£), hours, durations, and percentages in `Geist Mono` with `font-variant-numeric: tabular-nums`.
- **Do** separate cards and containers with crisp 1px solid `#e2e8f0` borders instead of diffuse box-shadows.
- **Do** maintain a strict light-first architectural palette (`#f8fafc` background, `#ffffff` cards, `#0f172a` text).
- **Do** apply negative letter-spacing (`-0.025em`) to all headings above 14px to maintain Swiss Grotesque tightness.
- **Do** support smooth thumb interactions on mobile with a floating bottom control dock and 44px minimum tap targets.
- **Do** embed AI scheduling diagnostics directly inside relevant columns (Weekly Capacity, Bottleneck Day, YoY Seasonality) with a global master toggle to completely hide them.
- **Do** use tactile spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`) and `:active scale(0.985)` press depression on all interactive controls.

### Don't:
- **Don't** use pastel purple-to-cyan gradient text or gradient card fills (permanently banned anti-vibe rule).
- **Don't** apply diffuse, muddy drop shadows or heavy `backdrop-filter: blur()` overlays to data cards.
- **Don't** use full pill (`border-radius: 9999px`) styling on primary rectangular action buttons.
- **Don't** isolate AI coaching in a detached, disconnected generic chat window or floating chat bubble.
- **Don't** display Year-to-Date revenue comparisons against full 12-month prior years without pro-rata alignment.
- **Don't** allow lesson diaries or calendar contents to be transmitted to external servers (100% client-side privacy invariant).
- **Don't** allow numeric values to jitter or cause layout reflows when dates or weeks change.
