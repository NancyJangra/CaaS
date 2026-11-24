# CaaS Final Project Report

## Abstract

Cache-as-a-Service (CaaS) is a multi-tenant caching platform with a public Redis-backed HTTP API and a developer dashboard for analytics, item management, usage quotas, integration, and settings. The system emphasizes secure API-key handling, rate limiting, and HCI patterns suitable for developer tools.

## Problem statement

Application developers need hosted cache infrastructure with transparent hit/miss behavior, enforceable quotas, and observable usage—without operating Redis themselves—while keeping secrets and tenant data isolated.

## Objectives

- Provide authenticated multi-tenant cache GET/PUT/DELETE with TTL.
- Enforce plan-based rate limits and item quotas.
- Expose real analytics (not mock data) in a dashboard.
- Support safe onboarding (one-time API key display) and integration testing.
- Align the UI with established usability heuristics.

## HCI foundations used

- Nielsen’s heuristics (status visibility, error prevention, consistency).
- Shneiderman’s golden rules (feedback, closure, reversible dialogs).
- Destructive-action friction (typed CLEAR, revoke confirmation).
- Accessibility: labels, focus visibility, dialog focus trap (Phase 11.1).

## System architecture

See `docs/architecture.md`. SPA → Express → PostgreSQL + Redis; JWT cookie for dashboard; `x-api-key` for public API.

## Implementation summary

Phases 1–11.1 delivered foundation, auth, cache engine, rate limiting, dashboard APIs, frontend auth/onboarding, analytics UI, items UI, usage UI, integrate/test connection, settings, and dialog focus trapping.

## Security

Bcrypt passwords; httpOnly JWT cookies; SHA-256 API key hashes; revoked-key rejection; login and API rate limits; Helmet; CORS; input size limits; tenant-scoped Redis keys and SQL.

## Testing

Automated backend (Jest) and frontend (Vitest) suites against real services where configured. Manual/scripted HTTP integration. E2E browser automation not executed in this environment (protocol in HCI/testing docs).

## HCI evaluation

Heuristic and rule mapping completed against the implemented UI. Participant tasks and SUS remain **pending** (templates in `docs/hci-evaluation.md`). No fabricated scores.

## Results

- Functional product covering cache API + dashboard surfaces.
- Regression baselines maintained from Phases 11 / 11.1.
- Deployment configuration documented; live deploy pending credentials.

## Limitations

- No password reset / email change / MFA.
- Theme preference is local-only.
- Frontend bundle includes full Recharts weight.
- No automated browser E2E in CI.
- HCI success metrics await participants.

## Future scope

- Managed password reset; org/team accounts.
- Code-split charts; optional WebSocket live metrics.
- Formal usability study and SUS collection.
- Production deployment with monitoring and backups.

## Conclusion

CaaS meets its engineering objectives for a secure, multi-tenant cache service with a usable developer dashboard. Deployment and formal HCI measurement are prepared but not claimed complete without external hosting and participants.
