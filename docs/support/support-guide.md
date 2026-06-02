# Support Guide — Ironframe GRC

For L1/L2 support and customer success engineers.

## Support tiers

| Tier | Scope | Escalation |
|------|-------|------------|
| **L1** | Login, tenant selection, UI navigation, FAQ | L2 if API 5xx or isolation suspected |
| **L2** | API errors, cron/heartbeat, export failures | Platform engineering + TAS review |
| **L3** | RLS breach, data corruption, constitutional override | Security incident + PO |

## Intake checklist

Collect on every ticket:

1. User email and Supabase user ID (if available)
2. **Active tenant UUID** (from switcher or cookie `ironframe-tenant`)
3. URL path and timestamp (UTC)
4. Browser and OS
5. Screenshot or HAR (no secrets)
6. Response status for `/api/dashboard` and `/api/sustainability/stats`

## Triage flow

```
User report
    │
    ├─ Auth/login? → Supabase dashboard, session cookies, middleware
    ├─ Blank dashboard? → Tenant switch race, refetch, 401 on dashboard
    ├─ Carbon pulse? → Electricity Maps key, fallback env, LKG route
    ├─ Export fail? → Tenant scope, /dashboard/exports auth
    ├─ Stale data banner? → Ironwatch heartbeat, SystemConfig.degraded flags
    └─ Cross-tenant data? → STOP — escalate L3 immediately
```

## Common resolutions

| Issue | Steps |
|-------|-------|
| Session expired | Clear site cookies, re-login |
| No tenant scope | Select tenant; not Global for exports |
| Carbon loop / missing API key | Confirm `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true` or set `ELECTRICITY_MAPS_API_KEY` |
| Dashboard 503 | Check Vercel deploy logs; run health: `/api/health` |
| Cron not running | Verify `vercel.json` crons + `IRONFRAME_CRON_SECRET` |
| Simulation noise in audit | Expected—GRCBOT filtered in UI; use purge tools if admin requests |

## Escalation triggers (immediate)

- Any evidence of **cross-tenant data** in UI or API response
- **Ironguard violation** logs with successful data return
- **Constitutional override** invoked without change ticket
- Sustained **stale lockdown** (>24h) without waiver documentation

## Tools for operators

| Tool | Use |
|------|-----|
| Vercel logs | Function errors, cron execution |
| Supabase logs | Auth failures, RLS denials |
| `npm run test:vercel-smoke` | Post-deploy cron/auth probe |
| `/api/grc/tas-integrity` | Constitutional health (200 vs 503) |
| Prisma Studio | Read-only row inspection (never mutate without runbook) |

## Communication templates

**Acknowledgment:**  
“We’ve received your report for tenant [NAME]. We’re checking dashboard and sustainability API responses and will update you within [SLA].”

**Fallback mode explanation:**  
“Live grid carbon data is temporarily unavailable. Ironframe is displaying a verified last-known-good or forensic baseline so your Command Center stays operational. No financial cents were altered.”

## Related documents

- [Knowledge Base](./knowledge-base.md)
- [Error Messages & Solutions](./error-messages.md)
- [DOCS_OPERATIONS.md](../../DOCS_OPERATIONS.md)
