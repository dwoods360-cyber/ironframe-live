# Core System Architecture & API Reference Manual (Level 2)

**Milestone:** v0.1.0-ga-epic17 · **Audience:** IT administrators, architects, DevOps, security auditors

---

## 1. Architectural blueprint

The platform uses a **decoupled dual-plane topology** — user interaction on Ironframe, autonomous advisory workforce on Ironboard — with shared PostgreSQL persistence.

```text
+---------------------------------------------+       +---------------------------------------------+
|        IRONFRAME APPLICATION PLANE          |       |         IRONBOARD ENGINE PLANE              |
| ------------------------------------------- |       | ------------------------------------------- |
| - Next.js 15 App Router (port 3000)         |       | - Express HTTP server (port 8082)         |
| - Supabase Auth + multi-tenant RLS          |======>| - Gemini SSE boardroom query gateway        |
| - Prisma ORM / PostgreSQL core              |<======| - Core telemetry bridge → :3000 shared ctx  |
| - APP_DOCS reader (/docs → app_documents)   |       | - LangGraph CLI orchestration (offline)     |
+---------------------------------------------+       +---------------------------------------------+
```

**IronBoard production runtime** is the Express server in `Ironboard/src/index.ts`. LangGraph.js orchestration exists for offline/CLI deliberation workflows; it is **not** the live `:8082` request path. There is **no PostgresSaver** checkpoint layer in the IronBoard production server.

### Guardrail ingress rules

**Irongate DMZ shielding** — All inbound telemetry and mutations route through the Irongate sanitization layer. Direct Prisma access from unverified routes is prohibited. Verified by `tests/architecture/gatewayShield.test.ts`.

**Zero floating-point financials** — Currency uses **BigInt whole-integer cents** in PostgreSQL. Serialization middleware (`lib/utils/serialization.ts`, `lib/prisma.ts`) prevents JSON boundary crashes.

### Documentation sync (not “write-back”)

IronBoard Trainer/Writer personas consume `GET /api/board/shared-context` (one-way telemetry + brief). Published chapters sync into Ironframe via bearer-gated **`POST /api/documentation/execute`** on **both** hosts — upserting `app_documents` and mirroring to `docs/` (`app/api/documentation/execute/route.ts`, `Ironboard/src/index.ts`). This is **documentation execute sync**, not a general IronBoard→Ironframe core mutation path.

### Baseline tenant financial anchors

| Slug | ALE baseline (cents) |
|------|----------------------|
| `medshield` | `1110000000` |
| `vaultbank` | `590000000` |
| `gridcore` | `470000000` |
| `pilot-corp` | Set at Stripe provision |

---

## 2. Nineteen-agent workforce reference matrix

Canonical indices from `app/config/agents.ts` (`CORE_WORKFORCE_AGENTS`):

| # | Agent | Domain | Core directive |
|---|-------|--------|----------------|
| 01 | Ironcore | Orchestration | Routing sequences; no scoring or payload parsing |
| 02 | Ironwave | Telemetry | Real-time transmission and live state emission |
| 03 | Irontrust | Calculation | BigInt ALE math; mutation-tested (Stryker) |
| 04 | Irontech | Self-healing | Checkpoint manager; health triage / structural freeze |
| 05 | Ironscribe | Parsing | Text extraction; framework document analysis |
| 06 | Ironlock | Isolation | Interrupt management; container lockdown; quarantine |
| 07 | Ironcast | Notifications | Batched transaction notifications |
| 08 | Ironsight | CVE mapping | Public vulnerability polling; blast-radius mapping |
| 09 | Ironlogic | Policy | Natural-language regulation → system parameters |
| 10 | Ironmap | Topology | Vendor tracking; dependency maps |
| 11 | Ironintel | Intelligence | Read-only OSINT parsing |
| 12 | Ironguard | Authentication | RLS enforcement; contextual token validation |
| 13 | Ironwatch | Anomaly | Shadow execution tracking; behavioral validation |
| 14 | Irongate | Sanitization | Mandatory DMZ gateway for raw input |
| 15 | Ironquery | Interface | Analyst reporting; data compilation |
| 16 | Ironscout | Lifespan | TTL monitoring (0.5–71.75 hours) |
| 17 | Ironbloom | Sustainability | Physical unit normalization (kWh, L, km) |
| 18 | Ironethic | DEI tracking | Salted anonymized demographic trends |
| 19 | Irontally | Frameworks | Maps logs to CSRD, GRI, SOC 2, ISO |

**Kimbot** is a simulated adversary for shadow-plane drills — **not** production Agent 17 (Ironbloom).

Boardroom personas (17) consume live telemetry via the shared-context bridge; they are **read-only** advisory — no direct database writes.

---

## 3. API reference & ingress schemas

### Sustainability telemetry ingress

| Field | Value |
|-------|-------|
| **Route** | `POST /api/sustainability/ironbloom` |
| **Gating** | Session token + tenant scope + physical-unit validation |
| **Rejection** | Monetary-only payloads; code `INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY` (HTTP 422) |

Representative request body (structured fields — at least one physical quantity required):

```typescript
{
  assetId?: string;
  tenantId?: string; // UUID; resolved from session when omitted
  zone?: string;
  kwh?: number;       // or units_kwh / unitsKwh / physicalUnits.kwh
  liters?: number;    // or L / physicalUnits.liters
  km?: number;        // or physicalUnits.km
  fuelCategory?: "diesel" | "gasoline" | "natural_gas" | "generic";
}
```

Representative success response (`app/api/sustainability/ironbloom/route.ts`):

```json
{
  "ok": true,
  "accepted": true,
  "tenantId": "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  "carbonTrace": {
    "physicalUnit": "kWh",
    "physicalQuantity": 1500,
    "carbonGramsCo2e": "667500",
    "serializedTrace": "{…}"
  }
}
```

Parsing pipeline: `validateIronbloomIngress()` → `computeIronbloomCarbonTrace()` in `lib/sustainability/ironbloom.ts`.

### Shared context cross-port bus

| Field | Value |
|-------|-------|
| **Route** | `GET /api/board/shared-context` |
| **Gating** | Tenant cookie / host headers / telemetry bridge headers |
| **Policy** | **Fail-closed** — HTTP 502 / `CORE_TELEMETRY_DISCONNECTED` halts Ironboard synthesis |

Implementation: `app/lib/board/sharedBoardContext.ts` · bridge: `Ironboard/src/services/coreTelemetryBridge.ts`.

### Documentation execute sync

| Field | Value |
|-------|-------|
| **Route** | `POST /api/documentation/execute` |
| **Gating** | `INTERNAL_GATEWAY_SECRET_KEY` bearer (internal gateway auth) |
| **Effect** | Upsert `app_documents` row + optional filesystem mirror under `docs/` |

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
- `app/config/agents.ts`
- `app/lib/security/ingressGateway.ts`
- `Ironboard/src/staticContext.ts`
