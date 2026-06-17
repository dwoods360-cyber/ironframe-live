---
title: Staging Boundary Check — Governance Frame Local Sandbox
issueNumber: 1
date: 2026-06-07T10:00:00.000Z
publishedAt: 2026-06-07T10:00:00.000Z
summary: Executive distillation of Governance Frame staging boundaries, published-ledger ingestion, and BigInt cent invariants for local developer sandboxes.
classification: INTERNAL STAGING
author: Ironframe Platform Engineering
---

# Staging Boundary Check — Governance Frame Local Sandbox

> Executive summary: The Governance Frame reader is served from the Next.js App Router at `/governance-frame`, compiling only `docs/published-briefings/*.md`. Draft queue files remain quarantined from the chronological feed.

### I. Exposure Vector

Local developer sandboxes expose **The Governance Frame** on the primary Next.js edge (`:3000`) at `/governance-frame`, while the Command Post remains quarantined from public ingress. Draft briefings in `docs/briefing-queue/` are file-isolated and never enter the chronological feed compiler.

### II. Calculated Quantitative Impact

- **Reported ALE delta (¢):** `"0"`
- **Provisioning tunnel test exposure (¢):** `"499900"`
- **Published briefing corpus size:** `"1"`

All monetary registers remain whole-cent BigInt strings end-to-end.

### III. Machine-Rule Technical Translation

```typescript
// Ingestion invariant — published ledger only
const PUBLISHED_DIR = "docs/published-briefings";
```

- [ ] `app/governance-frame/` App Router pages compile `docs/published-briefings/*.md`.
- [ ] `briefingLoader.ts` emits quarantine warnings for non-template drafts in `docs/briefing-queue/`.
- [ ] `sanitizeMarkdown.ts` strips `<script>` blocks before react-markdown compilation.
- [ ] Layout ships `robots: { index: false, follow: false }` until GA.

### IV. Verification Protocol

**Verification Check 1 (engineering / DevOps):** Confirm `/governance-frame` renders the index card grid and `/governance-frame/[slug]` resolves a published briefing without dashboard shell chrome.

**Verification Check 2 (accounting / data validation):** Confirm ALE and provisioning cent registers remain BigInt strings with no floating-point coercion in prospect or billing tables.

### V. Sources & Citations

- **[1] Published ledger ingestion** — `docs/published-briefings/` · compile path `app/lib/governanceFrame/briefingLoader.ts` · retrieved 2026-06-07
- **[2] Queue quarantine audit** — `docs/briefing-queue/` · `[SECURITY AUDIT]` scanner · retrieved 2026-06-07 · drafts never enter public feed
- **[3] Staging boundary register** — `financials.display` N/A (static engineering brief) · `docs/TAS.md` § BigInt cent invariants · retrieved 2026-06-07
