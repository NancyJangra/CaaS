# CaaS design system — premium hybrid redesign

The dashboard uses a **hybrid** layout: a dark navigation sidebar beside a light
(or, in dark mode, dark) workspace. This document describes the tokens, shared
components, theming, and responsive behaviour introduced by the redesign. No
backend API, schema, Redis key, or authentication behaviour changed.

## Design tokens

The current look follows a reference mock-up chosen by the product owner:
- a navy gradient sidebar with pill-shaped active items
- a soft lavender workspace with wave washes
- white rounded cards with soft shadows
- pastel KPI cards with icon circles and sparklines

| Role | Light | Dark |
|---|---|---|
| Sidebar | navy gradient `#0F1B4C` → `#0A1440` | `#070C26` |
| Canvas | lavender `#EEF1FB` | `#0B1130` |
| Card | `#FFFFFF`, 16px radius, soft shadow | `#141B3F` |
| Ink / muted ink | `#141A3A` / `#5B6585` | `#E8EBF7` / `#AAB4D6` |
| Primary (buttons, active nav) | blue `#3461F0` (white text 5.1:1) | same |
| Accents | purple `#8B5CF6`, green `#10B981`, orange `#F97316`, red `#EF4444` | lighter tints |

Each accent has a soft tint for card backgrounds and a darker `-fg` text
colour that meets WCAG AA on white. (Internally the token names are still
`cobalt`, `orchid`, `grass`, `sunflower` and `tomato`.)

**Type.** Plus Jakarta Sans for the interface and IBM Plex Mono for keys, code
and identifiers. Both are self-hosted from `src/assets/fonts` (SIL OFL 1.1;
licences included), so no npm dependency is added.

**Overview layout.**
* Greeting header with the live polling status and the 1 hour / 24 hours /
  7 days range.
* Four pastel KPI cards. Sparklines are drawn from the real per-bucket series,
  and no "vs last week" deltas are shown because the API has no comparison
  period.
* Latency area chart beside a hits/misses donut with count tiles.
* Quick insights (busiest bucket, reads per bucket) and Recent activity (latest
  keys from `GET /api/items`).

The top bar has a key search that opens Cached Items with `?search=`.

### Chart palette

| Series | Light | Dark |
|---|---|---|
| Hits / hit latency | `#3461F0` | `#6B8CFF` |
| Misses / miss latency | `#8B5CF6` (dashed) | `#C4B0FF` |

Blue and purple sit close together for some colour-vision deficiencies, so
misses are always dashed, legends are always shown, and every chart has a
data-table alternative.

## Shared components

| Component | File | Notes |
|---|---|---|
| `Button`, `buttonClasses` | `components/ui/Button.jsx` | primary / secondary / ghost / danger / danger-outline / danger-ghost / inverse; xs–lg; `loading` |
| `Card`, `CardHeader` | `components/ui/primitives.jsx` | white surface, 1px border, light shadow |
| `Badge` | 〃 | tone + optional dot; always text-labelled |
| `Input`, `Select`, `Label`, `FieldHint`, `inputClass`, `labelClass` | 〃 | consistent focus ring |
| `ProgressBar` | 〃 | `role="progressbar"`, optional 70%/90% threshold markers |
| `PageHeader`, `SectionHeader` | 〃 | title, subtitle, meta row, actions |
| `Notice`, `ErrorState`, `EmptyState`, `Skeleton`, `LoadingRegion` | 〃 | loading/error/empty states |
| `tableClasses` | 〃 | shared table styling |
| `Segmented` | 〃 | `aria-pressed` toggle group (time range) |
| `Tooltip`, `Toast`, `LiveStatus`, `IconCopyButton`, `useCopy` | `components/ui/feedback.jsx` | tooltip dismisses on Escape; toast is a polite live region |
| `OneTimeSecret` | `components/ui/OneTimeSecret.jsx` | masked one-time key with show/hide/copy/dismiss (memory only) |
| `ConfirmDialog` | `components/items/ConfirmDialog.jsx` | restyled; focus trap, Escape and focus restoration unchanged |
| Icons | `components/ui/Icons.jsx` | inline SVG set, no icon dependency |
| `LogoMark`, `Wordmark` | `components/ui/Logo.jsx` | three rising blue bars |
| `HeaderWaves`, `SidebarWaves` | `components/ui/BackgroundArt.jsx` | decorative wave washes |
| `Sparkline` | `components/dashboard/Sparkline.jsx` | inline SVG sparkline from real series values |
| `ExampleSession` | `components/ExampleSession.jsx` | static PUT/GET example with real response shapes |
| `AuthLayout` | `components/auth/AuthLayout.jsx` | two-column auth shell |

## Theme behaviour

* The preference (`light` / `dark` / `system`) is still stored under the existing
  `caas_theme` localStorage key. Only the preference is stored, never secrets.
* An inline script in `index.html` applies the `dark` class before first paint,
  so there is no theme flash. `main.jsx` re-applies it and calls
  `watchSystemTheme()` so **System** follows OS changes live.
* `useThemePreference()` (`hooks/useTheme.js`) keeps the Settings control and the
  sidebar quick toggle in sync through a `caas-theme-change` event.
* Dark mode keeps the dark sidebar and switches the workspace to a dark canvas
  with slightly lighter cards and subtle borders.

## Responsive navigation

| Width | Navigation |
|---|---|
| ≥ 1024px | Persistent 256px sidebar |
| 768–1023px | Collapsed 68px icon rail with tooltips; "Expand navigation" opens the full drawer |
| < 768px | Top bar with menu button; the sidebar opens as a modal drawer |

The drawer is `role="dialog"` with `aria-modal`. It traps focus, closes on
Escape, on the backdrop, or after navigating, restores focus to the control that
opened it, and locks body scroll. A "Skip to content" link, breadcrumb, and
per-page document title are included.

Authenticated pages are lazy-loaded (`React.lazy`), and AppShell shows a
skeleton fallback.
