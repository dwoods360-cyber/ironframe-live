# Solo-Operator Market Entrance Playbook

**Category:** Quantitative GRC Command Post  
**Status:** Active · design-partner phase (Run #3+)  
**Audience:** Solo founder + automated workforce · complements [Golden Path Checklist](../ops/golden-path-checklist.md)

---

## The single operational line

Invite-only quantitative command post for regulated operators who have outgrown spreadsheets but refuse to manage corporate liability through qualitative color-coded heatmaps.

**Disruption thesis:** Market entrance is an asymmetric wedge — change the buying decision rather than match features in an established arms race. Vanta and Drata sell audit **speed-to-cert**; Ironframe sells **financial risk defensibility** and **tenant sovereignty**. Compliance automation stays the floor, not the ceiling — turning massive integration libraries into legacy infrastructure burden for buyers who need ops GRC, not another checkbox tool.

---

## 1. Target beachhead segments

Bypass broad enterprise markets. Dominate one profile where multi-tenant isolation and whole-dollar risk are non-negotiable.

| Segment | Why Ironframe wins | Illustrative real-world profile |
|---------|-------------------|--------------------------------|
| **Multi-entity holding companies & portfolio operators** (2–5 subsidiaries) | Legacy compliance tools struggle with clean audit boundaries without evidence cross-bleed | [Zions Bancorporation](https://www.zionsbancorporation.com/) (seven affiliate banks); [Customers Bancorp](https://www.customersbank.com/) ($10B–$50B cohort) — see [Target Market Research](./target-market-research.md) |
| **Public power & mid-market utilities** | NERC CIP + OT/IT + physical telemetry for board-grade ops GRC | [SMUD](https://www.smud.org/), [Salt River Project](https://www.srpnet.com/), municipal/LPPC members — see research doc |
| **MSSPs / vCISO firms** (5–50 regulated clients) | Hard tenant enclave per client; export as deliverable | Category validated by [Apptega](https://www.apptega.com/solutions/risk-compliance-management-mssp-msp-mdr), [GetCybr](https://getcybr.com/mssp-vciso-platform/) |

> **Demo tenants only:** `gridcore`, `vaultbank`, `medshield` are internal seed workspaces for engineering — **not** prospect names. Never use them in outreach.

**ICP guardrail:** If the buyer only needs SOC 2 in 90 days with 400 integrations, walk or complement — see [Battlecard: Ironframe vs. Vanta / Drata](./battlecard-ironframe-vs-vanta-drata.md).

---

## 2. Hardened 4-agent operating rhythm

Restrict daily operations to **four active loops** so one human can run the pipeline in **≤15 minutes/day**. The broader 19-agent roster remains roadmap; do not operate it daily.

```
[ Ingress Telemetry ] ──► [ Irongate DMZ ] ──► [ Ironcore Router ]
                                                    │
        ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
        ▼                                                                                       ▼
  [ Irontrust Engine ] ──► BigInt dollar calculations      [ Ironquery Console ] ──► Tenant-isolated exports
```

| Loop | Agent | Solo-operator lifecycle |
|------|-------|-------------------------|
| **Ingress** | Irongate (14) | Sanitize-before-persist; block un-vetted payloads from core tables |
| **Orchestration** | Ironcore | Internal routing and layout coordination — not open-ended LLM chat |
| **Risk quantification** | Irontrust (3) | Mutation-tested BigInt engine; threats → financial loss records |
| **Compliance export** | Ironquery | Server-gated analytics; `ironquery-analyst-export-{tenantKey}.csv` |

**Daily batch (you):**

| Function | Surface | Time budget |
|----------|---------|-------------|
| Marketing | Promote one doc / post from trainer-writer queue | 5 min |
| Sales | Approval queue + CRM drafts | 5 min |
| Provision | Quick provision + copy invite link | 5 min |
| Support | Dispatch HITL support drafts | 5 min |

IronBoard queries: **only** when making GTM or pricing decisions — not daily chat.

---

## 3. Anti-roadmap (scope freeze)

**Banned until 3 paying design partners** — preserves engineering throughput per [Golden Path scope freeze](../ops/golden-path-checklist.md#scope-freeze-mandate).

| Category | Do not build | Why |
|----------|--------------|-----|
| **Integration marketplace** | 400+ SaaS connector arms | Wedge is Irongate zero-trust ingress, not connector catalog |
| **Autonomous engineering fixes** | Terraform / AWS CLI auto-remediation | Vanta's lane; Ironframe operates structural risk |
| **Public open checkout** | Self-serve multi-subdomain signup | Keep `config/registration.ts` ingress OFF until legal, billing, entitlements are boringly stable |

**Allowed:** Fixes that directly unblock Golden Path Stops 1–5, billing activation for Stop 5, and operator throughput (invite idempotency, admin billing toggle, daily board).

---

## 4. 90-day execution milestones

### Phase A — Airworthiness rigor (Days 1–30)

- [ ] **3× consecutive Golden Path passes** — fresh slugs, incognito activation, zero manual DB patches (Runs 2–3 complete; Run #4 pending)
- [x] **Operator Daily Board** — workspace stubs, invite status, billing waiver hooks below admin provision panel (`AdminOnboardingDeployments`)
- [x] **Idempotent invite token** — consumed invite links redirect to tenant sign-in or get-started (`resolveConsumedWorkspaceInviteRedirect`)

### Phase B — First reference node (Days 31–60)

- [ ] **One live design partner** on tenant subdomain: profile + real BigInt ALE + clean export
- [ ] **In-tenant support request** — context-aware module (slug pre-filled), not cold `/register/contact`

### Phase C — Disruption signal (Days 61–90)

- [ ] **GTM verification metric:** `ironquery-analyst-export-{tenantKey}.csv` referenced in a board pack or formal audit submission

---

## 5. Verification matrix

| Dimension | Status | Notes |
|-----------|--------|-------|
| GTM strategy | Category isolated | Audit automation ≠ operational risk command post |
| Operating rhythm | 4-agent core | ≤15 min/day founder batch |
| Tenant isolation | Absolute | Row-level + subdomain routing per slug |
| Golden Path | Run log in [checklist](../ops/golden-path-checklist.md) | 3× pass bar |

---

## Related documents

- [Target Market Research](./target-market-research.md) — real categories, named public examples, ICP scoring
- [Battlecard: Ironframe vs. Vanta / Drata](./battlecard-ironframe-vs-vanta-drata.md)
- [Golden Path Checklist](../ops/golden-path-checklist.md)
- [Sales Enablement](./sales-enablement.md)
- [Monetization Blueprint Q2 2026](../stakeholder-deck/ironframe-monetization-market-blueprint-2026-q2.md)
- [Competitive Analysis](./competitive-analysis.md)
