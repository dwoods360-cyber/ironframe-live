# Security & Compliance — Ironframe GRC

Summary for auditors, security reviewers, and customers. Authoritative controls: [TAS.md](../TAS.md).

## Security architecture

### Zero-trust ingestion
- **Irongate (Agent 14):** All external payloads sanitized before message bus or database
- **Ingest paths:** `/api/threats/ingest`, `/api/ingest`, `/api/ingestion/raw-signal`
- **Simulation isolation:** Shadow plane diagnostics do not write production audit semantics without gates

### Tenant isolation
- **PostgreSQL RLS** on tenant-scoped tables
- **Cookie scope:** `ironframe-tenant` UUID
- **Ironguard (Agent 12):** Client `tenantFetch` throws on cross-tenant target mismatch
- **Middleware:** Supabase session refresh; quarantine and lockdown bypass lists explicit
- **Integration tests:** Tenant isolation in Epic 17, ingest, and dashboard suites

### Authentication & authorization
- Supabase Auth (SSR cookies)
- Internal cron routes: `IRONFRAME_CRON_SECRET` / `IRONFRAME_INTERNAL_GATES_SECRET`
- Bank Vault dual-gate (Epic 11): PKI supervisor keys in environment
- Admin purge and constitutional override: restricted routes with audit witnesses

### Secrets management
- No secrets in repository (pre-commit `scan:secrets`)
- Vercel environment variables per environment (Preview / Production)
- Parameterized notification recipients (`THREAT_CONFIRMATION_RECIPIENTS`)

### Data integrity
- **Financial:** BigInt cents only on money paths (`check:financial-types` script)
- **Sustainability:** Physical units validated at Ironbloom gates
- **Evidence:** WORM storage policy (Epic 12); shredder blocked under signed attestation
- **Constitutional TAS:** Gold fingerprint via `/api/grc/tas-integrity`

## Operational security

| Control | Implementation |
|---------|----------------|
| Stale sustainability API | Ironwatch heartbeat → degraded mode → lockdown + waiver path |
| State freeze | Ironlock global freeze signal to UI |
| Quarantine | Hard-ban mutations via middleware evaluation |
| Audit logging | Prisma audit tables + structured server logs |
| CI gates | Epic integration tests required on merge |

## Compliance alignment (framework mapping)

Ironframe maps operational controls to common frameworks via **Irontally** and regulatory vault content (NIST SP 800-137, ISO 27001 annex references in `storage/regulatory-vault/`).

| Framework | Ironframe support |
|-----------|-------------------|
| **SOC 2** | Access control, logging, change management narratives in audit exports |
| **ISO 27001** | Control mapping, risk treatment via Active Risks |
| **NIST CSF** | Governance maturity, telemetry, supply chain (Ironmap roadmap) |
| **ESG / carbon disclosure** | Physical-unit sustainability metrics, forensic manifests |

**Note:** Ironframe provides **control-aligned tooling**; certification is an organizational responsibility.

## Data protection

- **PII:** Ironethic No-PII policy (Epic 14) — aggregated DEI data with salting
- **Retention:** Tenant-scoped; WORM for sealed evidence
- **Subprocessors:** Vercel (hosting), Supabase (DB/auth), Resend (email), Electricity Maps (carbon API)—document in customer DPA

## Incident response

1. Detect via Ironwatch / error tracking / customer report  
2. Contain — quarantine, operational freeze, stale lockdown  
3. Investigate — audit logs, SystemHealthLog, session scope  
4. Notify — Ironcast escalation paths  
5. Restore — constitutional restoration APIs where applicable  

## Customer audit package

Recommended evidence bundle:

- [RELEASE_EVIDENCE](../RELEASE_EVIDENCE_2026-06-02.md) (or current)
- [TAS.md](../TAS.md) excerpt / fingerprint
- Integration test results (`test:vercel-integration:cloud`)
- Export samples from `/dashboard/exports` (redacted)

## Related documents

- [Technical Requirements](../stakeholders/technical-requirements.md)
- [API Documentation](./api-documentation.md)
- [Support Guide](../support/support-guide.md)
