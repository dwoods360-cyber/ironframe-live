# Design Partner Production Smoke — Operator Sign-Off

**Tenant:** Set via `E2E_PRODUCTION_TENANT_SLUG` (e.g. `{slug}` after fresh provision)  
**Operator:** Set via `E2E_PRODUCTION_OPERATOR_EMAIL` (`GRC_MANAGER`)  
**Purpose:** Prove a design partner can complete the core cockpit loop on a **deployed** build — not only on local `*.lvh.me`. Partner-validation gate after [Golden Path](golden-path-checklist.md).

## Prerequisites

| Item | Requirement |
|------|-------------|
| Tenant row | Provisioned slug with **ACTIVE** billing |
| Operator | Invite **CONSUMED**; role **GRC_MANAGER** assigned |
| Host | Tenant subdomain — `https://{slug}.ironframegrc.com` |

## Run locally against production

```bash
E2E_PRODUCTION=1 \
E2E_PRODUCTION_TENANT_SLUG=your-slug \
E2E_PRODUCTION_OPERATOR_EMAIL=you@company.com \
npm run test:e2e:production:smoke
```

## CI schedule

GitHub Actions workflow: `.github/workflows/production-smoke.yml`  
Enable: repository variable `PRODUCTION_SMOKE_ENABLED=true` and `E2E_PRODUCTION_TENANT_SLUG`.
