# Ironframe Core glossary (student)

**Track:** Student · **Reading level:** 11th grade · **Scope:** Ironframe Core SaaS only

| Term | Plain meaning |
|------|----------------|
| **ALE (Annualized Loss Expectancy)** | Estimated money a company could lose in one year from cyber risk. Shown as dollars; stored as whole cents. |
| **Command Deck** | The main three-panel workspace layout (left metrics, center work, right live feed). |
| **Compliance** | Meeting rules (for example SOC 2–style controls) so data is handled safely. Literacy only — Ironframe is a GRC platform, not a SOC audit firm. |
| **Evidence Vault / Evidence Locker** | Secure place for audit records at `/evidence`. After seal, WORM rules block delete. |
| **Exports** | Tenant CSV/PDF downloads at `/exports` for auditor handoff. |
| **Governance** | Rules and limits the company must follow. |
| **Hazard pipeline** | List of live risks from intake through fix on Integrity Hub. |
| **Integrity Hub** | Core risk and protection screen at `/integrity`. |
| **Ironframe Core** | The tenant SaaS app you operate in class — Integrity, Evidence, Cockpit, Exports, Docs. |
| **Irongate** | Gate that cleans threat data before it is trusted inside the app. |
| **PILOT badge** | Demo / seed data page — not live company records. |
| **PREVIEW badge** | Incomplete module; some roles may not open it. |
| **Risk** | Chance of loss; Ironframe shows risk in dollar terms when possible. |
| **Tenant** | One company workspace. Data from other tenants stays hidden. |
| **Tenant isolation** | Security rule that keeps each company’s data separate. |
| **WORM** | Write once, read many — sealed records cannot be changed or deleted. |
| **Workforce Cockpit** | Agent and safety activity view at `/cockpit`. |
| **CIA triad** | Confidentiality, Integrity, Availability — classic security goals. |
| **Preventive control** | Stops an event (example: MFA). |
| **Detective control** | Finds an event (example: hazard alert). |
| **SOC 2** | Attestation report on trust service criteria (common for SaaS). Ironframe does **not** issue SOC reports. |
| **ISO 27001** | Information security management system standard. |
| **NIST CSF** | Identify → Protect → Detect → Respond → Recover. |

After Core certification, study full GRC test manuals under [analyst/manuals](../../analyst/manuals/grc-foundations-for-tests.md).

### Classroom seed tenants (training only)

| Slug | Use in class |
|------|----------------|
| `medshield` | Healthcare seed for labs |
| `vaultbank` | Fintech seed for labs |
| `gridcore` | Utility seed for labs |

Never treat seed tenants as real customers.

### Related student manuals

- [Quick-start](./quickstart.md) · [Dashboard guide](./dashboard-guide.md) · [Pilot vs preview](./pilot-vs-preview.md) · [Core routes](./core-routes.md)
