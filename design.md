# Design — عيادتي (Eyadati)

A locked design system for this app, produced by a Hallmark multi-page
redesign. Every page redesign reads this file before emitting code. Do not
regenerate per page — extend or amend this file when the system needs to
grow.

This is a working product, not a marketing site. The 21 Hallmark
macrostructures are landing-page shapes and don't map onto a calendar grid,
a patient table, or a settings form — so the "macrostructure family" below
is bespoke structure (Hallmark's own carve-out for page-shapes no catalog
macrostructure fits), not a catalog pick. Every other discipline (OKLCH
colour, 2+1 typography, 4pt spacing, motion/easing canon, 8-state
interaction contract, contrast, mobile floor) still applies in full.

## Genre

modern-minimal (Stripe / Linear school) — a professional B2B clinic
dashboard, not atmospheric or playful.

## Language & direction

Arabic (RTL) is the only shipped language. Every layout uses CSS logical
properties (`margin-inline-start`, `padding-inline-end`, `border-inline-*`,
`inset-inline-*`) — never physical `left`/`right`. Phone numbers, dates-in-
digits and clock times are the only LTR runs on the page and are wrapped in
`dir="ltr"` spans, set in the mono outlier face with tabular figures.

## Macrostructure family

- **App pages** (Calendar, Patients, Dashboard, Settings): **Clinical
  Canvas** — the existing top-bar `AppShell` kept as the IA (no move to a
  sidebar), refined into a calmer instrument panel: a slim sticky top bar,
  generous content canvas with `--space-2xl` outer padding, one consistent
  card/table/chip/form voice. Zero decorative enrichment — function carries
  every one of these screens. Full 8-state discipline on every interactive
  element (see Interaction section below).
- **Auth pages** (Login, Signup): **Clinical Canvas — quiet variant** — no
  top bar, no nav chrome, a single centred column (max `28rem`), generous
  top whitespace (`--space-3xl` before the form), the wordmark stands alone
  above the form as the only brand moment on the page.

## Theme

Custom, tuned — not catalog. This product already has a real, established
brand identity (teal + warm sand); the palette below is that identity
refined into OKLCH, not replaced.

```css
:root {
  /* paper / surface */
  --color-bg:            oklch(98% 0.008 85);   /* was #faf9f6 */
  --color-surface:       oklch(99.5% 0.004 85);  /* was #ffffff — never pure white */
  --color-surface-raised: oklch(100% 0 0);        /* modals/popovers only, sits on --color-bg */

  /* ink */
  --color-text:          oklch(20% 0.010 50);    /* was #1c1917 */
  --color-text-muted:    oklch(46% 0.012 60);    /* was #57534e */

  /* neutrals */
  --color-border:        oklch(90% 0.006 70);    /* was #e7e5e4 */
  --color-border-strong: oklch(80% 0.008 70);    /* new — stronger dividers, off-hours shading */

  /* accent 1 — teal (trust / primary action) */
  --color-primary:       oklch(51% 0.11 186);    /* was #0f766e */
  --color-primary-dark:  oklch(38% 0.075 188);   /* was #134e4a */
  --color-primary-soft:  oklch(94% 0.045 182);   /* was #ccfbf1 */
  --color-primary-ink:   oklch(99% 0.004 85);    /* text-on-primary; passes APCA Lc ≥ 60 */

  /* accent 2 — terracotta (warmth / secondary highlight) */
  --color-accent:        oklch(64% 0.15 48);     /* was #f4a261 — deepened from pastel */
  --color-accent-soft:   oklch(95% 0.03 70);     /* was #fef3e2 */
  --color-accent-ink:    oklch(99% 0.004 85);    /* text-on-accent */

  /* focus */
  --color-focus:         oklch(58% 0.14 186);    /* teal, brighter than --color-primary */

  /* semantic — functional signal colours, exempt from the "≤3% accent"
     restraint rule; they encode data (appointment status), not brand */
  --color-success:       oklch(48% 0.13 148);    /* was #15803d */
  --color-success-soft:  oklch(95% 0.045 150);
  --color-warning:       oklch(52% 0.14 55);     /* was #b45309 */
  --color-warning-soft:  oklch(95% 0.055 90);
  --color-error:         oklch(48% 0.17 27);     /* was #b91c1c */
  --color-error-soft:    oklch(93% 0.035 22);
}
```

## Typography

Single-family discipline (per modern-minimal's own preference, and because
pairing in a second Arabic display face risks a mismatched register):

```css
:root {
  --font-display: 'IBM Plex Sans Arabic', 'Cairo', system-ui, sans-serif;
  --font-body:    'IBM Plex Sans Arabic', 'Cairo', system-ui, sans-serif;
  --font-outlier: 'JetBrains Mono', ui-monospace, monospace; /* numerals only:
    phone numbers, clock times, appointment durations, table figures — never
    a third prose voice */
}
```

- Display weight 600–700, tight tracking (`-0.01em`; Arabic scripts don't
  want the aggressive `-0.03em` Latin display tracking — it breaks joins).
- Body weight 400/500. Never below 500 for UI labels (Arabic at 400 on a
  screen under 14px gets illegible at typical dashboard zoom).
- Every clock time, phone number, and count uses `--font-outlier` +
  `font-variant-numeric: tabular-nums` inside a `dir="ltr"` span.

## Spacing

4pt scale via Tailwind's default `--spacing: 0.25rem` multiplier (`p-4`,
`gap-6`, `px-8`, …) — **not** a custom named `--spacing-xs/sm/md/…` block in
`@theme`. Tailwind v4 reserves exactly those names for its own built-in
`max-w-*` / `w-*` / `h-*` scale; a first pass at this redesign defined a
custom 4pt scale under those names and it silently collapsed every
`max-w-sm` / `max-w-lg` / etc. in the app to a few px (caught via
screenshot QA, fixed by removing the block — see `src/index.css`). Named
role-based spacing stays a *convention* enforced by review, not a token:
card padding (`p-6`/`p-8`) ≠ section gaps (`gap-6`, `mt-10`+) ≠ page edge
padding (`px-4 sm:px-6 lg:px-8`) — never flatten these to one value.

## Motion

framer-motion stays (already installed, already used for the shared-layout
nav pill and button press feedback — motion-on project). No new library.

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in:
  cubic-bezier(0.7, 0, 0.84, 0)`.
- Spring physics only for physical interactions already in the codebase
  (button press, TimeWheelPicker snap, modal materialize) — critically
  damped (`bounce: 0`), never overshoot.
- Reduced motion: already wired via `<MotionConfig reducedMotion="user">`
  in `App.tsx` — keep it, don't reintroduce per-component overrides.
- No more than 2–3 motion primitives per screen: page-load reveal is OFF
  (this is a dashboard staff open 40 times a day — a fade-in on every visit
  is friction, not delight). Keep: button press, modal/popover
  materialize, shared-layout nav pill, TimeWheelPicker momentum.

## Microinteractions stance

- **Silent success.** Saving a patient, appointment, or settings change
  updates the UI and closes the modal — no "تم الحفظ!" toast. The visible
  result (the new row, the closed modal) is the confirmation.
- **Errors always surface** — inline under the field (form errors) or as a
  toast with retry (network/save failures) — never silent.
- Hover delay 800ms / focus delay 0ms on any tooltip.
- Optimistic updates only where the codebase already round-trips fast
  (status changes); nothing here needs new optimistic-with-rollback
  plumbing beyond what exists.

## Interaction contract (every input, select, textarea, button)

Full 8-state discipline — default · hover · focus · active · disabled ·
loading · error · success — per the no-layout-shift rule: border-width is
always `1px`, state changes go to `background-color` / `outline` /
`box-shadow`, never to geometry. Base control height `2.75rem` (44px) for
every text input, select, and button so rows never feel mismatched.
Right-edge 24px slot reserved on every input for an error glyph / clear /
spinner. Implemented once as shared primitives (`src/components/ui/Input.tsx`,
`Select.tsx`, `Textarea.tsx`, `FieldLabel.tsx`) and reused everywhere —
no more hand-rolled `<input className="...">` per form.

## CTA voice

- Primary: filled `--color-primary`, `--color-primary-ink` text, `rounded-xl`
  (10px), height 44px. Hover: `--color-primary-dark`. Press: `scale(0.97)`
  spring (existing Button.tsx pattern — keep).
- Secondary: outline `--color-primary` at 40% on `--color-surface`, hover
  fills `--color-primary-soft`.
- Destructive: filled `--color-error`, white-on-error text, reserved for
  genuinely destructive actions (delete patient/doctor) — irreversible ones
  keep the existing confirm dialog (typed confirmation not required at this
  scale; a named ConfirmDialog is enough for a clinic-staff tool).
- Ghost: transparent, `--color-text-muted`, hover `--color-bg`.

## Per-page allowances

- No page in this app uses hero enrichment (CSS art / SVG / imagery) — this
  is an operational tool, not a marketing surface. Typography, colour,
  spacing, and state design carry every screen.

## What pages MUST share

- The single teal + terracotta accent pair, at the restraint discipline
  above (semantic status colours and per-doctor calendar colours are the
  documented exemption).
- IBM Plex Sans Arabic display + body, JetBrains Mono numerals-only.
- The CTA voice (button shape, radius, height, padding rhythm) exactly as
  specified above.
- The `AppShell` top bar and its shared-layout nav pill.
- The 8-state input contract via the shared primitives.

## What pages MAY differ on

- Card/table/list layout specific to that screen's data shape (calendar
  grid vs. patient table vs. settings form vs. dashboard stat tiles).

## Stamp

```
/* Hallmark · genre: modern-minimal · macrostructure: Clinical Canvas (bespoke, app-shape) · theme: custom (teal + terracotta, tuned) · design-system: design.md · designed-as-app */
```

## Exports

### tokens.css (mirrors the `@theme` block in `src/index.css`)

See the Theme + Spacing + Typography sections above — `src/index.css` is
the single source; this file documents the values, `src/index.css` is
where they're authored (Tailwind v4 `@theme` inline, no separate
`tokens.css` file needed for a single-app Vite project).
