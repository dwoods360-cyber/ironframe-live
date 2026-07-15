# Ironframe GRC Platform — Master Documentation Portal

Welcome to the central documentation depository for the Ironframe Governance, Risk, and Compliance (GRC) platform.

| Field | Value |
|-------|-------|
| **Current release** | v0.1.0-ga-epic17 (June 2026) |
| **Posture** | Pilot-ready / sales-assisted deployment |
| **Self-serve registration** | `IRONFRAME_PUBLIC_REGISTRATION_ENABLED=false` |

This corpus is organized into **two reading levels** plus **training tracks** so every role finds the right material without wading through the wrong depth.

Ironframe maintains **two separate documentation planes** per the **Dual-Location Output Matrix** (`lib/documentationCorpusPlanes.ts`). They share the `docs/` repository root but use different readers, authors, and promotion workflows — **never cross-compile**.

### Plane 1 — Newsletters & Briefings (External / GTM Intelligence Surface)

| Field | Value |
|-------|-------|
| **Content** | Market analysis, regulatory narratives, institutional briefing logs from flywheel cycles |
| **Reader** | `/governance-frame/[slug]` |
| **Persistence** | `PublishedBriefing` (PostgreSQL) · staging `docs/briefing-queue/` |
| **External channels** | Corporate Substack stream · Ironcast newsletter compile |
| **Authors** | board-bot, board-cfo, flywheel agents, narrate cron — **not** board-trainer/writer |
| **Rules** | Narrative, outward-facing, decoupled from product code; human Section V promotion required |

### Plane 2 — App Docs (Internal / Product GRC Corpus)

| Field | Value |
|-------|-------|
| **Content** | Level 1 end-user manuals + Level 2 technical specs + training paths |
| **Reader** | `/docs` (in-app Documentation Center) |
| **Persistence** | PostgreSQL `AppDocument` table (serverless-safe; no filesystem writes on Vercel) |
| **Ingress** | `POST /api/documentation/execute` (Bearer `INTERNAL_GATEWAY_SECRET_KEY`) |
| **Authors** | **board-trainer**, **board-writer** |
| **Trigger** | `POST /api/documentation/execute` (async pipeline, content firewall) |
| **Rules** | Strict, telemetry-grounded, reflects live database baselines (BigInt cents) |

---

## Repository directory structure

```text
docs/
├── README.md                           # Master index, governance & feedback (this file)
├── hub.md                              # Legacy HTML chapter registry
├── TAS.md                              # Constitutional specification
├── user-manuals/                       # LEVEL 1 — End-user & operational (11th-grade reading level)
│   ├── design-partner-operator-packet.md  # Canonical design-partner handoff packet
│   ├── user-guide.md                  # Complete beginner operator manual (canonical)
│   ├── quickstart.md                  # Invitation, legal sign-off, dashboard layout
│   ├── get-started-workspace-setup.md # ALE baseline + GRC company gates
│   ├── audit-exports.md               # Analyst CSV/PDF at /exports
│   ├── pilot-vs-preview.md            # PILOT / PREVIEW badge policy
│   ├── dashboard-guide.md             # Integrity Hub, Ironbloom, audit scenarios
│   └── glossary.md                    # Plain-English GRC terminology
├── technical/                          # LEVEL 2 — Advanced IT & developer documentation
│   ├── architecture-and-api.md         # Topology, 19-agent matrix, API ingress
│   └── deployment-and-ops.md           # Environment blueprint, validation, triage
├── training/                           # Training tracks (markdown chapters + indexes)
│   ├── LEVEL1-PARTNER-INDEX.md        # Curated design-partner Level 1 chapters
│   ├── LEVEL1-STUDENT-INDEX.md
│   ├── LEVEL2-PRACTITIONER-INDEX.md
│   ├── level-1/                       # 12 student chapters (board-trainer)
│   └── level-2/                       # 12 practitioner chapters (board-writer)
├── product/                            # Track 1 & 2 HTML modules (vision, business spec)
├── support/                            # Self-healing labs, triage specs, practitioner guides
├── end-users/                          # Extended operator guides (FAQ, onboarding, release notes)
└── qa/                                 # Manual testing protocols & feature glossary
```

---

## Reading level routing map

### Level 1 — Operational end-user manuals (11th-grade reading level)

**Target audience:** Small business owners, compliance officers, risk managers, and non-technical staff.

| Document | Path | Summary |
|----------|------|---------|
| **Design Partner Operator Packet** | `user-manuals/design-partner-operator-packet.md` | Canonical invite → Path B → Get Started → cockpit → `/exports` handoff |
| Quick-Start Activation Guide | `user-manuals/quickstart.md` | Sales-assisted invitation, legal sign-off, accessible dashboard layout |
| Get Started workspace setup | `user-manuals/get-started-workspace-setup.md` | ALE baseline + primary GRC company gates |
| Audit export path | `user-manuals/audit-exports.md` | Tenant-scoped CSV/PDF at `/exports` |
| Pilot vs preview | `user-manuals/pilot-vs-preview.md` | PILOT seed data vs PREVIEW incomplete modules |
| **Complete Beginner User Guide** | `user-manuals/user-guide.md` | Full operator manual — identify → assess → mitigate → monitor |
| Dashboard Command Manual | `user-manuals/dashboard-guide.md` | Integrity Hub ALE, Ironbloom physical ingress, audit scenario |
| Plain-English Glossary | `user-manuals/glossary.md` | ALE, Path B, Command Tier, Irontrust, billing gate, WORM |

**Design-partner training index (curated):** `training/LEVEL1-PARTNER-INDEX.md` — use instead of the full classroom `LEVEL1-STUDENT-INDEX.md`.

**Format:** Concise guides, step-by-step instructions, ASCII wireframes with alt-text descriptions, minimal jargon.

### Level 2 — Advanced technical documentation

**Target audience:** IT administrators, database architects, DevOps engineers, security auditors, and integrators.

| Document | Path | Summary |
|----------|------|---------|
| Architecture & API Reference | `technical/architecture-and-api.md` | Dual-plane topology, Irongate/BigInt gates, 19-agent matrix, ingress schemas |
| Deployment & Operations Playbook | `technical/deployment-and-ops.md` | Production env blueprint, multiplexer validation, incident runbooks |

**Format:** Comprehensive manuals with code snippets, configuration blocks, CLI sequences, and best-practice tables.

### Training materials (supplemental tracks)

| Track | Audience | Entry points |
|-------|----------|--------------|
| **Track 1 — Design partner (curated)** | Paying / invited design-partner operators | `training/LEVEL1-PARTNER-INDEX.md` |
| **Track 1 — Student (classroom)** | High-school / internal trainer sandbox | `training/LEVEL1-STUDENT-INDEX.md`, `training/high-school/index.html` |
| **Track 2 — Practitioner** | GRC professionals & IT power users | `training/LEVEL2-PRACTITIONER-INDEX.md`, `training/professional/index.html` |

See also: [Design partner documentation — AppDocument sync](ops/design-partner-docs-sync.md).

See `hub.md` for the full HTML chapter catalog and compliance export artifacts.

### Extended operator library

| Document | Path |
|----------|------|
| User Guide (extended) | `user-manuals/user-guide.md` (canonical) · `end-users/user-guide.md` (legacy mirror) |
| Onboarding checklist | `end-users/onboarding.md` (Day 0–3 · matches Path B + Get Started) |
| FAQ | `end-users/faq.md` |
| Release notes | `end-users/release-notes.md` |

---

## Version control ledger

| Field | Value |
|-------|-------|
| **Stable version** | v0.1.0-ga-epic17 (Released: June 17, 2026) |
| **Status** | Production staging shell complete |
| **Route manifest** | `config/route-manifest.v0.1.0-ga-epic17.json` |
| **Baseline tenants** | `medshield` · `vaultbank` · `gridcore` · `pilot-corp` (design partner) |

Documentation changes that alter API routes, tenant isolation rules, or UI labels must ship in the **same development branch** as the code change.

---

## Operational governance policy

- Every diagram includes a **text alt description** for screen readers (see Level 1 wireframes).
- Web documentation supports **keyboard navigation** (Tab through controls; semantic headings).
- Level 1 prose targets **11th-grade reading level** — active voice, short sentences, defined jargon.
- Level 2 prose cites **source files** (`lib/`, `app/api/`, `Ironboard/src/`) for verification.

---

## Feedback & support mechanism

If you discover technical errors, inaccurate examples, or missing topics:

1. Open a tracked issue in your engineering repository labeled `type/documentation` or `type/documentation-defect`.
2. Email **delivery@ironframegrc.com** with your Tenant ID for deployment-sensitive clarifications.

Bundled artifacts: `Ironframe-UI-UX-Feature-Test-Protocol.docx` and `Ironframe-UI-UX-Feature-Test-Matrix.csv` (see `hub.md`).

---

## In-app documentation reader

Browse **app documentation** inside the platform at `/docs` (filesystem-backed markdown renderer). Start at **Documentation Center** (`README`) in the docs sidebar.

**Governance briefings and newsletters** are a separate surface — open `/governance-frame` for the published briefing ledger. Drafts remain in `briefing-queue/` until a human promotes them; see `briefing-queue/README.md`.
