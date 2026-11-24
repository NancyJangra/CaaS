# HCI Evaluation

This document evaluates the CaaS developer dashboard against standard usability frameworks. **Participant studies were not conducted in this delivery environment.** Sections marked *Pending* provide protocols and blank templates only. No SUS scores or completion rates are fabricated.

## A. Nielsen’s 10 usability heuristics

| # | Heuristic | Evidence in product | Issue | Severity | Fixed / open |
|---|-----------|---------------------|-------|----------|--------------|
| 1 | Visibility of system status | Live polling indicators; last-updated times; rate-limit headers; test-connection step log | Stale-data banner on failed refresh | Low | Fixed (banner present) |
| 2 | Match system & real world | Cache HIT/MISS language; TTL in human units; plan names | Some backend error codes are technical | Low | Open (codes + human message) |
| 3 | User control & freedom | Logout; revoke cancel; CLEAR typed confirm; Escape on dialogs | — | — | OK |
| 4 | Consistency & standards | Shared shell, indigo actions, ConfirmDialog pattern | — | — | OK |
| 5 | Error prevention | CLEAR confirmation; revoke dialog; disabled Continue until key saved | — | — | OK |
| 6 | Recognition rather than recall | Snippets, key prefixes listed, plan limits on Usage page | — | — | OK |
| 7 | Flexibility & efficiency | Range presets; sort/search; copy buttons | No keyboard shortcut map | Low | Open |
| 8 | Aesthetic & minimalist | Restrained cards/charts; limited decoration | Large JS bundle | Medium | Open (code-split optional) |
| 9 | Help recover from errors | Inline alerts, Retry, integration troubleshooting | — | — | OK |
| 10 | Help & documentation | Integrate page + README + docs/ | In-app help is page-local | Low | Open |

## B. Shneiderman’s eight golden rules

1. **Consistency** — Shared AppShell, dialogs, and form patterns across Settings/Integrate/Items.
2. **Universal usability** — Responsive layouts; theme preference; keyboard focus trap on dialogs.
3. **Informative feedback** — Toasts, status roles, test-connection log lines.
4. **Dialogs yield closure** — Signup → onboarding → dashboard; probe PUT→GET→DELETE.
5. **Prevent errors** — Typed CLEAR; revoke confirmation; validation on signup passwords.
6. **Easy reversal** — Cancel on dialogs; no fake undo where backend cannot restore.
7. **Internal locus of control** — Users choose range, keys, theme; rate limits explained not hidden.
8. **Reduce short-term memory load** — Snippets with placeholders; prefixes shown; quotas labeled.

## C. Usability task protocol (pending participants)

### Tasks

| ID | Task | Completion criteria |
|----|------|---------------------|
| T1 | Sign up and obtain an API key | Account created; secret visible once; user can copy it |
| T2 | Integrate the cache API | User runs or understands snippet; Test Connection succeeds |
| T3 | Understand hit/miss | User identifies hit rate or X-Cache meaning on Dashboard/Integrate |
| T4 | Find item, edit TTL, delete | Item listed; TTL updated; item removed |
| T5 | Check usage and rate limits | User states remaining quota or reset time from Usage page |

### Metrics to record (per participant)

- Task success (Y/N)
- Time on task (seconds)
- Errors (count)
- Assistance required (Y/N)
- Satisfaction (1–5)

### Blank results table

| Participant | T1 | T2 | T3 | T4 | T5 | Notes |
|-------------|----|----|----|----|----|-------|
| P1 | | | | | | |
| P2 | | | | | | |
| P3 | | | | | | |

**Status:** Pending evaluation — no participant data collected.

## D. System Usability Scale (SUS)

Standard 10 items (1 = strongly disagree … 5 = strongly agree):

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Scoring:** For odd items contribute `score − 1`; for even items contribute `5 − score`. Sum × 2.5 → 0–100.

### Blank SUS sheet

| Item | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Raw | SUS |
|------|---|---|---|---|---|---|---|---|---|----|-----|-----|
| P1 | | | | | | | | | | | | |
| P2 | | | | | | | | | | | | |

**Status:** Pending — no responses; no score claimed.

## E. Original success criteria

| Target | Evidence available | Result |
|--------|-------------------|--------|
| Onboarding under 3 minutes | Protocol only | Pending |
| ≥90% understand hit rate/quota | Protocol only | Pending |
| TTL edit/delete under 30 seconds | Protocol only | Pending |
| No accidental bulk deletions | CLEAR confirmation implemented | **Implemented** (design control); user study pending |
| SUS ≥ 80 | Blank sheet only | Pending |

## Summary

- **Implemented:** Heuristic-aligned UI patterns, destructive-action safeguards, focus trap, status feedback.
- **Measured:** Automated functional tests (see `docs/testing.md`).
- **Pending:** Live participant HCI study and SUS scoring.
