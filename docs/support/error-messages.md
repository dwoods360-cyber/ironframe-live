# Error Messages & Solutions — Ironframe GRC

Common errors, log signatures, and remediation. Severity: **Critical** | **High** | **Medium** | **Info**.

---

## Client / UI

### Blank center dashboard after tenant switch  
**Severity:** High  
**Cause:** Cache invalidation during switch; or tenant UUID mismatch during load.  
**Fix:** Refresh page; confirm tenant selected; upgrade to `42b9b56b`+. Panels should show loading then data—not permanent blank.

### `Tenant isolation violation: attempted cross-tenant data access`  
**Severity:** Critical (client throw)  
**Cause:** `tenantFetch` target UUID does not match active tenant.  
**Fix:** Reselect tenant; clear cookies; re-login. Escalate if reproducible after single-tenant selection.

### `Pulse unavailable` / `Live feed unavailable`  
**Severity:** Medium  
**Cause:** Sustainability stats endpoint failed and LKG not yet loaded.  
**Fix:** Wait 60s; confirm tenant cookie; check stats route returns 200 with `ok: true`.

---

## API responses

### `{ "ok": false, "error": "No active tenant." }` (400)  
**Severity:** Medium  
**Routes:** Sustainability stats, carbon-pulse, exports handlers  
**Fix:** Set `ironframe-tenant` cookie via switcher; pass `x-tenant-id` on server actions.

### Dashboard fetch failed: 401  
**Severity:** High  
**Fix:** Re-authenticate Supabase session; verify middleware not blocking server actions.

### TAS integrity probe → 503  
**Severity:** Critical  
**Cause:** Constitutional emergency (TAS gold mismatch or integrity failure).  
**Fix:** Ops runbook — [DOCS_OPERATIONS.md](../../DOCS_OPERATIONS.md); do not mutate production data until cleared.

### Sustainability stats → 503 (no LKG)  
**Severity:** Medium  
**Cause:** Bundle build threw and no `SustainabilityMetric` row for tenant LKG.  
**Fix:** Seed tenant metrics; enable fallback env; check server logs `[api/sustainability/stats]`.

---

## Server logs

### `[ironbloom-carbon-ingress] {"reason":"missing_api_key",...}`  
**Severity:** Info (when fallback on) / Medium (when fallback off)  
**Fix:** Set `ELECTRICITY_MAPS_API_KEY` **or** `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true`. Restart dev server after env change.

### `[ironbloom-carbon-ingress] {"zone":"US-GD",...}`  
**Severity:** Info  
**Fix:** Zone alias normalization maps US-GD → US-CO in `42b9b56b`+; upgrade if zone still rogue.

### `[Ironwatch] stale mode audit failed`  
**Severity:** Medium  
**Fix:** DB connectivity for audit log; non-fatal to heartbeat.

### `IRONWATCH_SUSTAINABILITY_FALLBACK (...)` in SystemHealthLog  
**Severity:** Info  
**Meaning:** Heartbeat synthetic OK under fallback—expected on staging without live key.

### `IRONBLOOM_LIVE_SOURCE_REQUIRED`  
**Severity:** High  
**Cause:** Utility rate poll without OpenEI/NREL credentials.  
**Fix:** Configure `OPEN_ENERGY_API_KEY` or run utility poll in staging fallback mode.

---

## Cron / integration

### Cron 401 Unauthorized  
**Fix:** Align `IRONFRAME_CRON_SECRET` in deployment with cron authorization header.

### Cron 405 Method Not Allowed  
**Fix:** Ensure GET handler exists on cron route (Epic 13 fix).

### `test:vercel-integration` failure  
**Fix:** Run locally with deploy URL; check `scripts/vercel-integration-suite.mjs` output for failing probe name.

---

## Middleware

### Redirect loop on sustainability URL with `_api_key=`  
**Fix:** Middleware strips empty `_api_key` and injects bypass token when fallback enabled.

---

## Related documents

- [Support Guide](./support-guide.md)
- [FAQ](../end-users/faq.md)
- `.env.example` — full variable reference
