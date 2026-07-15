# Chapter 5 — Audit Trail Reports & Forensic Exports

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/reports/audit-trail` · **Lab IDs:** AUDIT-001

## Why this chapter matters

Forensic exports must stay tenant-scoped and sanitized. You practice generating CSV and checking that CVE tokens are cleaned in prose.

## Learning objectives

When you finish, you can:

- Open `/reports/audit-trail`.
- Generate a tenant-scoped CSV when enabled.
- Confirm sensitive tokens are sanitized.

## How to get there

1. Open `/reports/audit-trail`.
2. Generate a CSV for the active tenant.
3. Scan export text for unsanitized CVE-style tokens.
4. Cross-check Ironscribe lineage notes in docs when available.

## Reference screenshot

![Chapter 5 — Audit Trail Reports & Forensic Exports](/docs/training/assets/level-2-05-audit-trail-exports.png)

*Captured near `/reports/audit-trail`. Asset: `/docs/training/assets/level-2-05-audit-trail-exports.png`.*

source-file: public/docs/training/assets/level-2-05-audit-trail-exports.png

## Lab — Scoped export check (AUDIT-001)

1. Download or preview one audit CSV for your tenant.
2. Confirm the tenant identity matches your session.
3. Search the file for raw CVE strings that should have been cleaned.
4. Also open `/exports` once and note how it differs from audit-trail reports.

## Check your understanding

- [ ] I can open the audit-trail report route.
- [ ] I know exports stay inside the active tenant.
- [ ] I look for sanitization issues before handing files to outsiders.

## Common mistakes

- PILOT vendor pages are not auditor CSV sources.
- Billing PENDING may block downloads — that is expected.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Audit trail** | Timed log of security and compliance events. |
| **Sanitized** | Dangerous or sensitive tokens cleaned before export. |
| **Ironscribe** | Audit lineage / evidence writing path referenced in TAS. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`06-ironboard-telemetry-bridge.md`](./06-ironboard-telemetry-bridge.md).
