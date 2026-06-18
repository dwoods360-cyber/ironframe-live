# Core System Architecture & API Reference Manual (Level 2)

**Milestone:** v0.1.0-ga-epic17 · **Audience:** IT administrators, architects, DevOps, security auditors

---

## 1. Architectural blueprint

The platform uses a **decoupled dual-plane topology** — user interaction on Ironframe, autonomous advisory workforce on Ironboard — with shared PostgreSQL persistence.

```text
+---------------------------------------------+       +---------------------------------------------+
|        IRONFRAME APPLICATION PLANE          |       |         IRONBOARD ENGINE PLANE              |
| ------------------------------------------- |       | ------------------------------------------- |
| - Next.js 15 App Router                     |       | - LangGraph.js agent workforce controller   |
| - Supabase Auth + multi-tenant RLS          |======>| - PostgresSaver checkpoint persistence      |
| - Prisma ORM / PostgreSQL core                |<======| - Web-grounded regional discovery loop      |
+---------------------------------------------+       +---------------------------------------------+
```

### Guardrail ingress rules

**Irongate DMZ shielding** — All inbound telemetry and mutations route through the Irongate sanitization layer. Direct Prisma access from unverified routes is prohibited. Verified by `tests/architecture/gatewayShield.test.ts`.

**Zero floating-point financials** — Currency uses **BigInt whole-integer cents** in PostgreSQL. Serialization middleware (`lib/utils/serialization.ts`, `lib/prisma.ts`) prevents JSON boundary crashes.

### Baseline tenant financial anchors

| Slug | ALE baseline (cents) |
|------|----------------------|
| `medshield` | `1110000000` |
| `vaultbank` | `590000000` |
| `gridcore` | `470000000` |
| `pilot-corp` | Set at Stripe provision |

---

## 2. Nineteen-agent workforce reference matrix

| Agent | Domain | Core directive |
|-------|--------|----------------|
| Ironcore | Orchestration | Routing sequences; no scoring or payload parsing |
| Ironwave | Telemetry | Real-time transmission and live state emission |
| Irontrust | Calculation | BigInt ALE math; mutation-tested (Stryker) |
| Ironsight | CVE mapping | Public vulnerability polling; blast-radius mapping |
| Ironscribe | Parsing | Text extraction; framework document analysis |
| Ironlock | Isolation | Interrupt management; container lockdown; quarantine |
| Ironcast | Notifications | Batched transaction notifications |
| Ironintel | Intelligence | Read-only OSINT parsing |
| Ironlogic | Policy | Natural-language regulation → system parameters |
| Ironmap | Topology | Vendor tracking; dependency maps |
| Irontech | Self-healing | Checkpoint manager; automated state freezes |
| Ironguard | Authentication | RLS enforcement; contextual token validation |
| Ironwatch | Anomaly | Shadow execution tracking; behavioral validation |
| Irongate | Sanitization | Mandatory DMZ gateway for raw input |
| Ironquery | Interface | Analyst reporting; data compilation |
| Ironscout | Lifespan | TTL monitoring (0.5–71.75 hours) |
| Ironbloom | Sustainability | Physical unit normalization (kWh, L, km) |
| Ironethic | DEI tracking | Salted anonymized demographic trends |
| Irontally | Frameworks | Maps logs to CSRD, GRI, SOC 2, ISO |

Boardroom personas (17) consume live telemetry via the shared-context bridge; they are **read-only** advisory — no direct database writes.

---

## 3. API reference & ingress schemas

### Sustainability telemetry ingress

| Field | Value |
|-------|-------|
| **Route** | `POST /api/sustainability/ironbloom` |
| **Gating** | Session token + tenant scope + `TenantFeatureEntitlement` where applicable |
| **Rejection** | Monetary-only payloads; pattern `INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY` |

Representative TypeScript interface:

```typescript
export interface IronbloomTelemetryPayload {
  rawInput: string; // e.g. "1500 kWh" — physical unit required
  tenantId?: string; // UUID; resolved from session when omitted
}
```

Representative response shape:

```json
{
  "ok": true,
  "normalizedValueKwh": "1500",
  "traceId": "…"
}
```

Parsing: `normalizeIronbloomTelemetry()` in `lib/sustainability/ironbloom.ts`.

### Shared context cross-port bus

| Field | Value |
|-------|-------|
| **Route** | `GET /api/board/shared-context` |
| **Gating** | Tenant cookie / host headers / telemetry bridge headers |
| **Policy** | **Fail-closed** — HTTP 502 / `CORE_TELEMETRY_DISCONNECTED` halts Ironboard synthesis |

Implementation: `app/lib/board/sharedBoardContext.ts` · bridge: `Ironboard/src/services/coreTelemetryBridge.ts`.

### Additional pilot endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/webhooks/stripe` | Checkout completion → tenant provision |
| `POST /api/billing/webhook` | `payment_intent.succeeded` → billing ACTIVE |
| `GET /api/board/feed` | RSS syndication (cron secret) |
| `GET /api/internal/cron/industry-scout` | Regulatory RSS → CRM catalyst bridge |

---

## 4. GTM market data authenticity (Ironboard)

The flywheel no longer uses a blind row count. `verifyAndOptimizeMarketData()` in `Ironboard/src/services/marketProspectAuthenticity.ts`:

1. Assesses `market_prospects` rows per **region**
2. Flags expansion templates (`{Region} Ledger` / `{Region} Vault`, `-ledger.io`, `-vault.finance`)
3. Purges synthetic rows and forces `discoverRegionalProspects()` web grounding

Board system prompt includes `BOARD_GTM_MARKET_AUTHENTICITY_MANDATE` — synthetic scaffolding must never be cited as live market research.

---

## Sources

- `docs/TAS.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `app/lib/security/ingressGateway.ts`
- `Ironboard/src/staticContext.ts`
