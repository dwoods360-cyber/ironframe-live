# Endpoint Compliance Ingress — Integrator Schema (v1)

Canonical contract for MDM, EDR, vulnerability scanners, SIEM, and CMDB pipelines pushing endpoint compliance signals into Ironframe production (`ThreatEvent`).

**Preferred route:** `POST /api/ingestion/endpoint-compliance`

**Schema version:** `endpoint-compliance-v1`

**Enforced in code:** `app/lib/ingress/endpointComplianceIngressSchema.ts`  
**Flat compat normalizer:** `app/lib/ingress/normalizeFlatEndpointCompliancePayload.ts`

---

## Payload profiles

Two shapes hit the same route. The handler auto-detects profile before Zod validation.

| Profile | Detection | Use when |
|---------|-----------|----------|
| **Canonical v1** | `schemaVersion: "endpoint-compliance-v1"` | New integrations (preferred) |
| **Flat MDM** | `complianceControlIds` + `telemetryPayload` without `schemaVersion` | Jamf/legacy push adapters |

---

## Authentication and tenant scope

| Requirement | Detail |
|-------------|--------|
| **`x-tenant-id` header** | Tenant UUID (required in production) |
| **`tenantId` in body** | Must match `x-tenant-id` exactly (canonical profile) |
| **Billing** | Tenant must have `ACTIVE` commercial entitlement (402 when `PENDING` / `PAST_DUE`) |
| **Session** | Shadow plane may resolve tenant from `ironframe-tenant` cookie when header absent |

Unauthenticated integrators should use a service account session or internal gateway pattern approved by your deployment team. Do not send production signals without tenant alignment — Ironguard will reject mismatched scope.

---

## Request body

All fields are validated with Zod before persistence. Invalid payloads return **422** with `{ error: "VALIDATION_FAILED", issues: [...] }`.

### Envelope

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | `"endpoint-compliance-v1"` | Yes | Contract version |
| `tenantId` | UUID | Yes | Must match header |
| `sourceType` | enum | Yes | `MDM`, `EDR`, `VULN_SCANNER`, `SIEM`, `CMDB`, `MANUAL` |
| `sourceIntegrationId` | string (1–64) | Yes | e.g. `intune-prod-east` |
| `observedAt` | ISO-8601 datetime | Yes | When the finding was observed |
| `idempotencyKey` | string (8–128) | Yes | Stable per signal; replays return existing threat |

### Endpoint identity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `endpoint.deviceId` | string | One of deviceId/hostname | MDM device GUID |
| `endpoint.hostname` | string | One of deviceId/hostname | FQDN or short name |
| `endpoint.assetClass` | enum | Yes | `WORKSTATION`, `SERVER`, `MOBILE`, `NETWORK`, `OTHER` |
| `endpoint.ownerEmail` | email | No | Hashed at ingress if key matches PII sanitizer |
| `endpoint.site` | string | No | Site or region label |
| `endpoint.os` | string | No | OS description |

### Compliance finding

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `finding.controlIds` | string[] (1–32) | Yes | e.g. `SOC2-CC6.1`, `ISO-A.8.2` |
| `finding.framework` | enum | Yes | `SOC2`, `ISO27001`, `NIST_CSF`, `HIPAA`, `PCI_DSS`, `CUSTOM` |
| `finding.state` | enum | Yes | `NON_COMPLIANT`, `COMPLIANT`, `UNKNOWN`, `EXCEPTION_GRANTED` |
| `finding.ruleId` | string | Yes | Vendor rule identifier |
| `finding.ruleTitle` | string (1–100) | Yes | Becomes `ThreatEvent.title` |
| `finding.severity` | enum | Yes | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `finding.remediationDueAt` | ISO-8601 | No | SLA deadline |
| `finding.evidenceUrl` | HTTPS URL | No | HTTP rejected |

### Financial / GRC

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `financialRiskCents` | digit string | Required for HIGH/CRITICAL | BigInt-safe cents, no decimals |
| `justification` | string (≤2000) | Required when ≥ $10M | Same GRC gate as manual threat ingress |
| `isRemoteAccessAuthorized` | boolean | No (default `false`) | Native `ThreatEvent.isRemoteAccessAuthorized` — rogue remote session flag |

### Extensions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `extensions` | object | No | Vendor-specific fields; stored under `ingestionDetails.endpointCompliance.extensions` |

### Flat MDM profile (compat)

Accepted without `schemaVersion`. Normalized to canonical v1 before persistence.

| Field | Maps to |
|-------|---------|
| `remoteTechId` | `endpoint.deviceId` (not `ThreatEvent.remoteTechId`) |
| `sourceAgent` | `sourceIntegrationId` + inferred `sourceType` |
| `targetEntity` | `endpoint.hostname` |
| `financialRisk_cents` | `financialRiskCents` |
| `complianceControlIds` | `finding.controlIds` |
| `telemetryPayload` | `extensions` |
| `isRemoteAccessAuthorized` | `ThreatEvent.isRemoteAccessAuthorized` |

Optional flat enrichments: `ruleTitle` (preferred), `title` (alias → `finding.ruleTitle`), `ruleId`, `severity`, `framework`, `idempotencyKey`, `observedAt`, `justification`.

```json
{
  "remoteTechId": "jamf-asset-88902",
  "sourceAgent": "JAMF_MDM_PUSH_INTEGRATOR",
  "targetEntity": "production-db-replica-01",
  "financialRisk_cents": "450000",
  "isRemoteAccessAuthorized": false,
  "complianceControlIds": ["SOC2_CC6.1", "ISO_27001_A.12.6.1"],
  "telemetryPayload": {
    "osVersion": "Darwin 24.1.0",
    "patchDeltaDays": 42,
    "isDiskEncrypted": false
  }
}
```

---

## Example request (canonical)

```http
POST /api/ingestion/endpoint-compliance HTTP/1.1
Content-Type: application/json
x-tenant-id: 5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01

{
  "schemaVersion": "endpoint-compliance-v1",
  "tenantId": "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  "sourceType": "MDM",
  "sourceIntegrationId": "intune-prod-east",
  "observedAt": "2026-06-27T14:30:00.000Z",
  "idempotencyKey": "intune-device-abc123-noncompliant-cc61",
  "endpoint": {
    "deviceId": "abc123-device-guid",
    "hostname": "ws-finance-042.corp.example",
    "assetClass": "WORKSTATION"
  },
  "finding": {
    "controlIds": ["SOC2-CC6.1"],
    "framework": "SOC2",
    "state": "NON_COMPLIANT",
    "ruleId": "disk-encryption-required",
    "ruleTitle": "Full-disk encryption disabled",
    "severity": "HIGH"
  },
  "financialRiskCents": "250000000",
  "justification": "Workstation holds regulated finance data; encryption gap exceeds tenant risk appetite."
}
```

Golden fixture: `tests/fixtures/endpointComplianceIngress.golden.json`

Smoke probe (local dev server required):

```bash
node scripts/endpoint-compliance-ingest-smoke.mjs
```

---

## Response

### 201 Created

New `ThreatEvent` row in **IDENTIFIED** (pipeline) state.

```json
{
  "id": "uuid",
  "idempotentReplay": false,
  "title": "Full-disk encryption disabled",
  "source": "ENDPOINT:MDM:intune-prod-east",
  "target": "ws-finance-042.corp.example",
  "score": 7,
  "financialRiskCents": "250000000",
  "lifecycleState": "pipeline",
  "status": "IDENTIFIED",
  "schemaVersion": "endpoint-compliance-v1"
}
```

### 200 OK (idempotent replay)

Same `idempotencyKey` + `tenantId` returns the existing threat (`idempotentReplay: true`).

### Error codes

| Status | Condition |
|--------|-----------|
| 401 | Missing tenant context |
| 402 | Commercial entitlement hold (`code: BILLING_HOLD`) |
| 403 | `tenantId` / header mismatch |
| 422 | Schema validation (`VALIDATION_FAILED`) or GRC gate (≥ $10M without 50+ char justification) |
| 423 | Simulation stand-down active for tenant |
| 500 | Unexpected server error |

### 402 Payment Required (billing hold)

```json
{
  "error": "Commercial entitlement required.",
  "code": "BILLING_HOLD",
  "billingStatus": "PENDING"
}
```

---

## Persistence mapping (Phase 1)

| Validated field | `ThreatEvent` column | Notes |
|-----------------|----------------------|-------|
| `finding.ruleTitle` | `title` | Direct |
| `sourceType` + `sourceIntegrationId` | `sourceAgent` | `ENDPOINT:{sourceType}:{id}` |
| `endpoint.hostname` (prefer) or `deviceId` | `targetEntity` | Direct |
| `financialRiskCents` | `financialRisk_cents` | BigInt |
| `finding.severity` | `score` | LOW=3, MEDIUM=5, HIGH=7, CRITICAL=9 |
| `isRemoteAccessAuthorized` | `isRemoteAccessAuthorized` | Native boolean column |
| Full payload + controls | `ingestionDetails` | JSON under `endpointCompliance` |
| `idempotencyKey` | `ingestion_fingerprint` | Unique dedupe key |

**Phase 2 (planned):** Add native `complianceFramework` and `mappedControls` columns on `ThreatEvent` (parity with simulation `RiskEvent`). Until then, query via `ingestionDetails.complianceFramework` and `ingestionDetails.mappedControls`.

---

## Related ingress surfaces (do not conflate)

| Route | Purpose | Schema |
|-------|---------|--------|
| `POST /api/ingestion/endpoint-compliance` | **New integrator contract** | Strict Zod (this doc) |
| `POST /api/threats` | Manual analyst registration | `threatIngressSchema` |
| `POST /api/ingestion/raw-signal` | Loose envelope → agent routing | `tenant_id`, `source_type`, `raw_data` only |
| `POST /api/threats/ingest` | Ack/orchestration for **existing** threat | Requires `threatId` |

---

## Legacy templates (deprecated for new integrations)

| File | Status |
|------|--------|
| `scripts/production-ingest-payload.template.json` | **Illustrative only** — targets ack route `/api/threats/ingest`, not greenfield create |
| `scripts/production-ingest-body.json` | Same — use for orchestration testing only |

New MDM/EDR/SIEM integrations must use this schema and `/api/ingestion/endpoint-compliance`.

---

## Versioning

Increment `schemaVersion` (e.g. `endpoint-compliance-v2`) for breaking changes. v1 handlers reject unknown versions. Additive optional fields may ship in v1 via `extensions` without a version bump.
