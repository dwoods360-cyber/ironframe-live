# Plain-English Platform Glossary (Level 1)

**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17

| Term | Definition |
|------|------------|
| **Annualized Loss Expectancy (ALE)** | The money a business could lose in one year from software risk. Stored as whole cents. Set yours on `/get-started`. |
| **Billing Gate** | A check that payment succeeded. Failed or overdue payment sends you to a billing hold screen. |
| **Command Tier** | Design-partner pricing path (Path B). Flat platform fee for the pilot — not a per-seat catalog. |
| **Compliance** | Meeting rules such as SOC 2 or ISO 27001 to show data is handled safely. |
| **Data Processing Addendum (DPA)** | A legal contract on how the platform handles and protects company data. |
| **Evidence Locker (Evidence Vault)** | Secure vault for audit records. After seal, WORM rules block deletion. Same module at `/evidence`. |
| **Fixed dollar precision** | Money stored as exact pennies so reports never lose cents to rounding. |
| **Get Started** | First-day portal at `/get-started` for ALE, company profile, and checklist. |
| **Hazard pipeline** | Dashboard view of live risks from entry through fix. |
| **Ingress** | Data coming into the system from outside. Threat ingress is cleaned by Irongate. |
| **Irontrust** | Engine that turns threat and control facts into dollar risk figures. You read results in Integrity Hub and exports — you do not run CLI tools. |
| **Path B** | Invite-based onboarding with a **tenant-scoped** Stripe link that moves billing from PENDING to ACTIVE. Prefer Path B over public `/pricing` when you already have a workspace. |
| **PILOT (nav badge)** | Demo / seed data page — not your live tenant database. See [pilot vs preview](./pilot-vs-preview.md). |
| **PREVIEW (nav badge)** | Incomplete module; some roles cannot open it during design-partner pilots. |
| **Quarantine** | Temporary lock on a user or record until checks finish. |
| **Telemetry** | Live ops numbers shown on monitoring dashboards. |
| **Tenant isolation** | Security rule so one company's data stays invisible to other tenants. |
| **WORM (Write-Once-Read-Many)** | Save a record once; no one can change or delete it later. |

### Baseline tenant slugs (internal seeds vs partners)

| Slug | Role |
|------|------|
| `medshield` | Healthcare GRC **engineering seed** — not a partner workspace |
| `vaultbank` | Fintech / SOC 2 **engineering seed** |
| `gridcore` | Energy / NIST **engineering seed** |
| `{your-slug}` | Your design-partner workspace on `{slug}.ironframegrc.com` |

---

## Sources

- `docs/TAS.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- Design Partner Operator Packet (`user-manuals/design-partner-operator-packet.md`)
