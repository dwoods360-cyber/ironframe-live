# FAQ — Ironframe GRC (design partners)

## General

**What is Ironframe?**  
A multi-tenant GRC command post with quantitative ALE, threat pipeline, Evidence Locker (WORM), and tenant-scoped analyst exports.

**Who should use it?**  
CISOs, GRC teams, CFO/risk officers, and internal auditors on a sales-assisted design-partner workspace.

**How do I get access?**  
Invite-only. Public `/pricing` and `/register/contact` do not create a tenant. Delivery provisions your slug and sends `/register/{token}`.

## Tenants and access

**What is my workspace URL?**  
`https://{your-slug}.ironframegrc.com` — use the slug from your invite.

**What are medshield / vaultbank / gridcore?**  
Internal engineering seed tenants. Design partners do not operate those workspaces.

**Why do I see “Tenant context required”?**  
Sign in again on your tenant host, or confirm you are not on Global Command Center aggregate scope when exporting.

## Billing

**What is Path B?**  
Tenant-scoped Stripe Checkout that moves billing from PENDING → ACTIVE. Prefer the link on `/get-started` or your invite over a generic public pricing link when the workspace already exists.

**What is Command Tier?**  
The design-partner commercial on-ramp (flat platform fee for the pilot evaluation).

**Training says sealed until billing is active — why?**  
Docs corpus, agent workforces, and training unlock after subscription confirmation clears.

## Risk and financial data

**Why are amounts in cents?**  
Financial integrity mandate: ALE and mitigated values use BigInt integer cents — no floating-point money math.

**Where do I set ALE?**  
`/get-started` → Workspace ALE baseline (USD). Required before reliable Integrity Hub / export scope.

**What is Irontrust?**  
The quantitative engine behind dollar risk figures. You consume results in Integrity Hub and exports; you do not run separate CLI tools.

## Exports and audit

**Where are analyst exports?**  
**`/exports`** (legacy `/dashboard/exports` redirects here).

**Exports blocked or banner about ALE/company?**  
Save ALE baseline and primary GRC company on `/get-started`, confirm billing ACTIVE, then retry.

**What is WORM?**  
Write-Once-Read-Many storage for sealed evidence — prevents deletion after attestation.

## Pilot vs preview

**Why does Vendors say “seed data only”?**  
**PILOT** surfaces use demonstration seed records, not your live tenant database. Use `/exports` for auditor files. Details: [pilot vs preview](../user-manuals/pilot-vs-preview.md).

## Support

**How do I report a problem?**  
Email **delivery@ironframegrc.com** with: tenant slug, timestamp, browser, and the route you were on.

---

## Related documents

- [Design Partner Operator Packet](../user-manuals/design-partner-operator-packet.md)
- [Onboarding checklist](./onboarding.md)
- [Audit exports](../user-manuals/audit-exports.md)
- [Glossary](../user-manuals/glossary.md)
