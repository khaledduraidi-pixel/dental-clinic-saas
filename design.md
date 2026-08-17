# Design — عيادتي (Eyadati)

The locked design system for this app. Every screen reads this file before
emitting code. Do not regenerate per screen — amend this file when the system
needs to grow.

## Provenance — where these numbers come from

This system is **derived, not invented**. Earlier attempts were authored from
taste and read as machine-generated; the fix was to take the numbers from real
design systems that actually ship.

| Source | What was taken | Read from |
| --- | --- | --- |
| **Material 3** (`material-components/material-web`) | shape scale, type scale, component heights, state-layer opacities, elevation levels, tonal-surface model | `tokens/versions/latest/sass/_md-sys-*.scss`, `_md-comp-*.scss` |
| **NHS.UK** (`nhsuk/nhsuk-frontend`) | the discipline of two font weights only; action colour separated from brand colour; blue-tinted (never neutral) greys | `packages/nhsuk-frontend/src/nhsuk/core/settings/` |
| **Primer** (`primer/primitives`) | "use an inset box-shadow instead of a border to prevent layout shift"; small-radius rule (≤ 16px elements only) | `src/tokens/functional/size/` |

Genre: **Material 3, tonal.** Hierarchy comes from *surface tone*, not from
borders or shadows. This is the system's single most important rule.

---

## 1. Colour — tonal roles

Seeded on the product's existing teal. Chroma pulled back from the raw seed
output so it reads clinical rather than candy-bright.

```css
--color-surface:            #F7FAFA;  /* app background */
--color-surface-low:        #EFF4F4;  /* list items, cards */
--color-surface-high:       #E1EAEB;  /* search bar, emphasis card, hover */
--color-surface-highest:    #DAE4E5;  /* neutral chips */
--color-on-surface:         #171D1E;  /* primary text */
--color-on-surface-variant: #3F4949;  /* secondary text, icons */
--color-outline-variant:    #BEC8C9;  /* the ONLY divider colour */

--color-primary:            #00696E;  /* selected day, active states */
--color-on-primary:         #FFFFFF;
--color-primary-container:  #C2E3E5;  /* FAB, buttons, nav indicator, plan card */
--color-on-primary-container:#00201F;

--color-error:              #BA1A1A;  --color-error-container:  #F4DAD7;
--color-on-error-container: #410002;
--color-success:            #106B3E;  --color-success-container:#D2E9DA;
--color-on-success-container:#04361C;
--color-warning:            #7A5300;  --color-warning-container:#F5E4C3;
--color-on-warning-container:#261A00;
```

**Rules**
- No borders on content surfaces. No decorative shadows anywhere.
- Elevation exists in exactly one place: the FAB (`level3`). That is M3's own
  exception, not ours.
- Every surface that sets a background also sets its `on-*` text colour.
- Per-doctor calendar colours and status colours are **data**, exempt from the
  single-accent rule — they encode information.

## 2. Typography

**Cairo**, weights **400 and 600 only** (NHS's two-weight discipline; M3's
`weight-regular` / `weight-medium`).

| Role | Size / line-height | Weight | Used for |
| --- | --- | --- | --- |
| `display` | 36 / 40 | 600 | the one big figure on Reports |
| `headline-small` | 24 / 32 | **400** | screen titles on sub-screens |
| `title-large` | 22 / 28 | **400** | top app bar, next-up patient name |
| `title-medium` | 16 / 24 | 600 | list headline, section label, card title |
| `body-large` | 16 / 24 | 400 | search text, form values |
| `body-medium` | 14 / 20 | 400 | supporting text |
| `label-large` | 14 / 20 | 600 | buttons |
| `label-medium` | 12 / 16 | 600 | nav labels, eyebrows, timestamps |

Large headings take weight **400**, not bold — M3 sets `title-large-weight:
weight-regular`, and bolding them was a real error in an earlier pass.

**Arabic-specific, non-negotiable**
- **Never letter-space Arabic.** It is a connected script; tracking breaks the
  joins. Hierarchy comes from size, weight and space only.
- Latin runs inside Arabic prose (`08:00`, `+970599111222`, `44px`) must be
  wrapped in `<bdi>` or a `dir="ltr"` span, or they reorder across line breaks.
- Western Arabic numerals throughout, `font-variant-numeric: tabular-nums` on
  every figure that lines up in a column.

## 3. Shape (M3 shape scale — real values)

```
none 0 · extra-small 4px · small 8px · medium 12px · large 16px
large-increased 20px · extra-large 28px · full 9999px
```

- List items, cards, the plan card: **12px** (`medium`)
- FAB: **16px** (`large`)
- Search bar, buttons, chips, nav indicator, day pills: **full**
- Status chips: **8px** (`small`)
- Nothing gets a radius merely for looking modern; each maps to a token.

## 4. Component sizes (M3 component tokens — real values)

| Component | Value | Token |
| --- | --- | --- |
| Top app bar | 64px | `md-comp-top-app-bar-small: container-height` |
| Search bar | 56px, `corner-full` | `md-comp-search-bar` |
| Navigation bar | 80px | `md-comp-navigation-bar: container-height` |
| Nav active indicator | 64 × 32px, `corner-full` | same |
| Extended FAB | 56px tall, radius 16px, `level3` | `md-comp-fab-primary` |
| Filled-tonal button | 40px, `corner-full`, label 14/600 | `md-comp-filled-tonal-button` |
| List item (two-line) | 72px | `md-comp-list` |
| Icon | 24px (18px inside buttons) | `md-comp-fab: icon-size` |
| Icon button target | 48px | touch floor |

Touch targets never below **48px**. Icons are inline SVG — never emoji.

## 5. Spacing

4pt scale via Tailwind's default multiplier (`p-4`, `gap-2`, `px-6`).
**Do not** define a custom `--spacing-{xs,sm,md,lg,…}` block in `@theme`:
Tailwind v4 reserves those names for its own `max-w-*` / `w-*` / `h-*` scale,
and overriding them silently collapses every `max-w-sm`/`max-w-lg` in the app.
That bug happened once already — see the note in `src/index.css`.

Screen padding `16px` mobile / `24px` desktop. Gap between list items `8px`.

## 6. State (M3 state layers)

State is a translucent overlay of the foreground colour — never a colour swap.

```
hover 8%  ·  focus 10%  ·  pressed 10%
```

Every interactive element ships all eight states: default · hover ·
`:focus-visible` · active · disabled · loading · error · success. Focus ring is
never animated. Border width never changes between states (Primer's
layout-shift rule) — state goes to background, outline or box-shadow.

## 7. Motion

framer-motion, already in the project. Critically damped (`bounce: 0`) springs
only; no overshoot on UI state. `<MotionConfig reducedMotion="user">` stays at
the app root. Page-load reveals are **off** — staff open this app dozens of
times a day.

Permitted: button press, FAB press, sheet/modal materialize, shared-layout nav
indicator, day-strip selection.

## 8. Information architecture

Four destinations. Mobile gets a bottom navigation bar; desktop gets pill nav
in the top app bar. Same four, same order, same labels.

| Tab | Screen | Job |
| --- | --- | --- |
| اليوم | Calendar | what is happening now — the daily driver |
| المرضى | Patients + patient file | who they are, what they still need |
| التقارير | Reports | no-show rate and trends — owner's view, monthly |
| الإعدادات | Settings | clinic hours, doctors, WhatsApp, import |

**The no-show rate does not belong on the home screen.** It is a reporting
metric for the owner, not the first thing a receptionist needs at 8am. Home
opens on **next up** — who is arriving, when, and the two actions that matter
(mark arrived, call).

## 9. Screens

| Screen | Mobile | Desktop |
| --- | --- | --- |
| Login / Signup | single column, 16px padding, no nav chrome | same, centred, max 420px |
| اليوم | day strip · next-up card · today's list · FAB | day strip · doctor-column grid |
| المرضى | search · list of 72px items | search · list, wider |
| ملف المريض | full screen: actions · plan card · visit timeline | side sheet, same content |
| التقارير | stacked stat cards + the one big figure | same, in a row |
| الإعدادات | stacked sections | sections, two-column where it helps |

## 10. What this system refuses

- Borders on cards, and decorative shadows anywhere (FAB excepted).
- Gradients, glassmorphism, blur-behind-content.
- A second accent hue for decoration.
- Letter-spaced Arabic.
- Emoji as icons.
- Bold large headings.
- Page-load animations on operational screens.
- Radius chosen by feel instead of from the shape scale.
