# Company Profile Ingress — Integrator Schema (v1)

Canonical contract for instantiating or updating the **primary corporate organizational graph** under a ring-fenced tenant boundary.

**Route:** `POST /api/ingestion/company-profile`

**Schema version:** `company-profile-v1`

**Enforced in code:** `app/lib/ingress/companyProfileIngressSchema.ts`

---

## Authentication and tenant scope

| Requirement | Detail |
|-------------|--------|
| **`x-tenant-id` header** | Tenant UUID (required in production) |
| **`tenantId` in body** | Must match `x-tenant-id` exactly |
| **Billing** | Tenant must have active commercial entitlement (402 when `PENDING` / `PAST_DUE`) |
| **Session** | Shadow plane may resolve tenant from `ironframe-tenant` cookie when header absent |

---

## Idempotency and upsert law

There is **no Prisma unique constraint** on `companies.tenantId` today. This route enforces application-level law:

1. Find the oldest **non-test** company row for the tenant (`isTestRecord: false`).
2. **Update** if found → **200 OK** (`created: false`, `upserted: true`).
3. **Create** if none → **201 Created** (`created: true`).

Chaos/simulation test companies (`isTestRecord: true`) are ignored.

---

## Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | `"company-profile-v1"` | Yes | Contract version |
| `tenantId` | UUID | Yes | Must match header |
| `companyName` | string (1–150) | Yes | `Company.name` |
| `sector` | string (1–100) | Yes | `Company.sector` |
| `industryAvgLossCents` | digit string | No | `Company.industry_avg_loss_cents` (BigInt) |
| `departments` | string[] (≤32, unique) | No | Replaces departments when non-empty |

Invalid payloads return **422** `{ error: "VALIDATION_FAILED", issues: [...] }`.

---

## Example request

```http
POST /api/ingestion/company-profile HTTP/1.1
Content-Type: application/json
x-tenant-id: 5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01

{
  "schemaVersion": "company-profile-v1",
  "tenantId": "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  "companyName": "Acme Aerospace Holdings",
  "sector": "Defense and Critical Infrastructure",
  "industryAvgLossCents": "1250000000",
  "departments": ["SecOps", "Flight Operations", "Core Infrastructure", "Legal Compliance"]
}
```

Fixture: `tests/fixtures/companyProfileIngress.golden.json`

---

## Response

### 201 Created (first primary company for tenant)

```json
{
  "ok": true,
  "schemaVersion": "company-profile-v1",
  "companyId": "42",
  "created": true,
  "upserted": false,
  "departmentsSynced": 4,
  "companyName": "Acme Aerospace Holdings",
  "sector": "Defense and Critical Infrastructure",
  "industryAvgLossCents": "1250000000"
}
```

### 200 OK (update existing primary company)

Same shape with `"created": false`, `"upserted": true`.

### Error codes

| Status | Condition |
|--------|-----------|
| 401 | Missing tenant context |
| 402 | Commercial entitlement hold (`code: BILLING_HOLD`) |
| 403 | `tenantId` / header mismatch |
| 404 | Tenant UUID not found |
| 422 | Schema validation failure |
| 500 | Unexpected server error |

---

## Department sync behavior

When `departments` is **omitted or empty**, existing department rows are **left unchanged**.

When `departments` contains one or more names, the route **deleteMany + createMany** for that company inside a transaction (full reseed of declared divisions).

---

## Persistence mapping

| Validated field | Column / table |
|-----------------|----------------|
| `companyName` | `companies.name` |
| `sector` | `companies.sector` |
| `industryAvgLossCents` | `companies.industry_avg_loss_cents` |
| `departments[]` | `departments.name` (via `departments.company_id`) |

---

## Related surfaces

| Route | Purpose |
|-------|---------|
| `POST /api/ingestion/company-profile` | **This contract** — org graph upsert |
| `provisionCorporateTenantCore` | Creates `Tenant` only (no company row) |
| `POST /api/ingestion/endpoint-compliance` | Endpoint signals → `ThreatEvent` (uses `tenantCompanyId` when company exists) |

---

## Versioning

Increment `schemaVersion` for breaking changes. Additive optional fields may ship in v1 without a version bump.
