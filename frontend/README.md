# CaaS frontend

React 19 + Vite + React Router + TanStack Query + Recharts + Tailwind CSS v4.

```bash
npm ci
npm run dev     # http://localhost:5173 (proxies /api, /auth, /v1, /health to :3001)
npm test        # Vitest + Testing Library
npm run build
npm run lint    # oxlint
```

Structure:

- `src/index.css`: design tokens (CSS variables + Tailwind `@theme inline`).
- `src/components/ui/`: shared UI primitives (Button, Card, Badge, fields, states, Tooltip, Toast, Icons, Logo, OneTimeSecret).
- `src/layouts/AppShell.jsx`: hybrid sidebar shell with responsive rail and drawer.
- `src/pages/`: Dashboard (Overview), Cached Items, Usage & Limits, Integrate, Settings, auth and onboarding pages.
- `src/utils/theme.js`, `src/hooks/useTheme.js`: Light/Dark/System theme under the `caas_theme` key.

See `../docs/design-system.md` for tokens and component guidance.
