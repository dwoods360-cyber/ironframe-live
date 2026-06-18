# Plain-English Platform Glossary (Level 1)

**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17

| Term | Definition |
|------|------------|
| **Annualized Loss Expectancy (ALE)** | The calculated total money a business could lose in one year if specific software vulnerabilities are exploited. Stored internally as whole-integer cents. |
| **Billing Gate** | A barrier that checks whether the monthly subscription paid successfully. Failed payment redirects you to a secure billing hold screen. |
| **Compliance** | Meeting legal and regulatory rules (for example SOC 2 or ISO 27001) to prove data is handled securely. |
| **Data Processing Addendum (DPA)** | A legal contract describing how the platform processes and protects corporate information. |
| **Evidence Locker** | Secure vault for audit records. Epic 12 WORM rules prevent deletion after seal. |
| **Fixed dollar precision** | Storing money as exact whole pennies instead of decimals, so financial reports never lose cents to rounding. |
| **Hazard pipeline** | Dashboard view of live risks from entry through automatic mitigation. |
| **Ingress** | Data entering the system from outside. Threat ingress passes Irongate sanitization. |
| **Quarantine** | Temporarily locking a user or record until verification completes. |
| **Telemetry** | Live operational measurements sent into monitoring dashboards. |
| **Tenant isolation** | Security boundary ensuring one company's data is invisible to all other tenants on the platform. |
| **WORM (Write-Once-Read-Many)** | Save a record once; no one can modify or delete it afterward — preserving audit trails. |

### Baseline tenant slugs (v0.1.0-ga-epic17)

| Slug | Role |
|------|------|
| `medshield` | Healthcare GRC seed — ALE `1110000000` cents |
| `vaultbank` | Fintech / SOC 2 seed — ALE `590000000` cents |
| `gridcore` | Energy / NIST seed — ALE `470000000` cents |
| `pilot-corp` | Sales-assisted design partner |

---

## Sources

- `docs/TAS.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `prisma/seed.ts`
