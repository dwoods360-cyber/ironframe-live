# Design Partner Training Index — Level 1 (curated)

**Audience:** Design-partner operators. **Reading level:** 11th grade. **Milestone:** v0.1.0-ga-epic17.  
**Start here:** [Design Partner Operator Packet](/docs/user-manuals/design-partner-operator-packet)

This is the only Level 1 training list partners should follow. It skips classroom seed labs. It also skips CLI fixes and multi-tenant switching drills meant for internal trainers.

---

## Before chapters

1. Finish Day-0 invite and Path B billing. Use the [operator packet](/docs/user-manuals/design-partner-operator-packet).
2. Save ALE baseline and GRC company on [`/get-started`](/get-started). See [workspace setup](/docs/user-manuals/get-started-workspace-setup).
3. Skim [pilot vs preview](/docs/user-manuals/pilot-vs-preview). Do not treat PILOT nav items as live data.

---

## Recommended chapters

Work these in order after Day 0 and Day 1 setup.

| Order | Chapter | In-app path | Live route |
|------:|---------|-------------|------------|
| 1 | GRC Foundations and Command Deck | [01-grc-foundations](/docs/training/level-1/01-grc-foundations) | `/integrity` |
| 2 | Authentication and Tenant Access | [02-auth-tenant-access](/docs/training/level-1/02-auth-tenant-access) | `/login` |
| 3 | Dashboard Navigation | [03-dashboard-navigation](/docs/training/level-1/03-dashboard-navigation) | `/` |
| 4 | Integrity Hub and ALE | [04-integrity-hub-ale](/docs/training/level-1/04-integrity-hub-ale) | `/integrity` |
| 5 | Evidence Vault and WORM | [05-evidence-vault](/docs/training/level-1/05-evidence-vault) | `/evidence` |
| 6 | Cockpit viewport | [06-cockpit-agent-viewport](/docs/training/level-1/06-cockpit-agent-viewport) | `/cockpit` |
| 7 | Board report readiness | [07-board-report-readiness](/docs/training/level-1/07-board-report-readiness) | `/board-report` |
| 8 | Trust Center materials | [10-trust-center-procurement](/docs/training/level-1/10-trust-center-procurement) | `/trust` |

Finish with [Audit exports](/docs/user-manuals/audit-exports) on `/exports`.

Some chapter bodies use the classroom local host (`http://127.0.0.1:3000`) and seed tenants. On a partner host, use your `{slug}.ironframegrc.com` URL and your own tenant. Skip chapter 11 unless your trainer assigns multi-tenant switching.

---

## Intentionally omitted

Partners skip these chapters. They are for internal instructors.

| Chapter | Why partners skip it |
|---------|----------------------|
| 08 Governance Frame reader | Optional briefing plane. Not Day-1 cockpit work. |
| 09 Docs hub handbook | Engineer seed and CLI instructions. |
| 11 Tenant switching labs | Fixed internal demo tenant IDs. |
| 12 Student certification | Classroom sign-off track. |

The full classroom list stays at [LEVEL1-STUDENT-INDEX](/docs/training/LEVEL1-STUDENT-INDEX) for Ironframe instructors only.

---

## Level 1 manuals (packet)

| Manual | Path |
|--------|------|
| Operator packet | `/docs/user-manuals/design-partner-operator-packet` |
| Quick-start | `/docs/user-manuals/quickstart` |
| Get Started setup | `/docs/user-manuals/get-started-workspace-setup` |
| Dashboard guide | `/docs/user-manuals/dashboard-guide` |
| Audit exports | `/docs/user-manuals/audit-exports` |
| Pilot vs preview | `/docs/user-manuals/pilot-vs-preview` |
| Glossary | `/docs/user-manuals/glossary` |
| Full beginner guide | `/docs/user-manuals/user-guide` |
