# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are independent Approved Driving Instructors (ADIs) and driving coaches in the UK and worldwide. They manage intensive multi-student appointment diaries, DVSA mock and official driving tests, and business revenue. They switch between quick mobile checks in the car between lessons and analytical desktop administrative reviews at home or in an office.

## Product Purpose

DriveStats transforms raw calendar diaries into honest, actionable schedule and capacity intelligence. It reveals true schedule fill percentages, accounts for realistic travel buffers and dead gaps between lessons, tracks billing revenue against non-paying lessons, and models Year-over-Year (YoY) and Year-to-Date (YTD) seasonal trends. Success means an instructor maximizes billable hours without burning out or losing revenue to fragmented, unbookable schedule gaps.

## Positioning

DriveStats is a strictly client-side, 100% private calendar analytics suite. Unlike cloud aggregators that require uploading diary data to remote servers, DriveStats processes Google Calendar, Outlook Calendar, and Apple/iCal (.ics) data entirely in the user's browser. Instructors own their data with zero server leakage, and optional AI scheduling advice uses their own API keys directly.

## Operating Context

- **Dual-Surface Ergonomics:** Quick in-car mobile checks between lessons (glanceable progress, upcoming capacity, unbookable gaps) and dense desktop dashboard analysis (detailed workload bars, YoY efficiency tables, smoothed trend charts, event explorer).
- **Progressive Web App (PWA):** Installs to home screen on iOS and Android devices, operating with offline asset caching.
- **Calendar Formats:** Connects directly via client-side OAuth (Google Calendar API & Microsoft Graph) or local drag-and-drop `.ics` calendar imports.

## Capabilities and Constraints

- **Client-Side Processing:** All parsing, aggregation, and statistics run in the browser without a central backend database.
- **Realistic Capacity Modeling:** Automatically injects 15-minute buffers before and after lessons, classifying gaps under 90 minutes as unusable dead time.
- **Fair YoY Comparisons:** Year-to-Date (YTD) pro-rata alignment prevents misleading year-end revenue comparisons for the ongoing calendar year.
- **Friend & Family Filtering:** Keyword-based filtering removes non-paying students from revenue and billable efficiency calculations.
- **In-Column AI Copilot:** Interactive, dynamic client-side widgets and coaching advice powered by Gemini or OpenAI via user-provided keys.

## Brand Commitments

- **Name:** DriveStats ADI
- **Voice:** Professional, clear, analytical, and respectful of the instructor's demanding on-the-road reality.
- **Aesthetic:** Modern, responsive, card-based interface with glassmorphic accents and full light/dark mode support.

## Evidence on Hand

- Fully functional React 19 + Vite + TypeScript application in repository.
- Mock instructor diary fixture (`src/utils/mockData.ts`) and test dataset (`lrnr2drvr@gmail.com.ics`).
- Tested algorithms for travel buffers, gap calculation, and pro-rata YoY metrics in `src/components/StatsDashboard.tsx` and `src/components/YearlyStats.tsx`.

## Product Principles

1. **Zero Data Leakage:** Lesson diaries contain private student and travel information; data never leaves the client's device.
2. **Honest Time Accounting:** A 30-minute gap between lessons is not free time—it is unusable dead time. Schedule analytics must reflect reality.
3. **Dual Ergonomics:** Mobile must be immediately legible and thumb-friendly in a parked car; desktop must provide deep, rich data density.
4. **Actionable Intelligence:** Avoid superficial charts; provide actionable feedback on rate adjustments, seasonality buffers, and schedule pacing.

## Accessibility & Inclusion

- High-contrast visual hierarchy designed for readability under harsh daylight or glare inside a vehicle, as well as night use.
- Touch-friendly tap targets and gesture-friendly scrolling for mobile devices.
