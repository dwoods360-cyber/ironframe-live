# Pilot vs preview surfaces (Level 1)

**Audience:** Design-partner operators · **Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17

Some menu links show a badge. The badge tells you whether the page is live work, demo data, or still unfinished.

---

## Badge meanings

| Badge | What it means for you |
|-------|------------------------|
| **PILOT** | Demo / seed data only. Not your live tenant records. |
| **PREVIEW** | Early or incomplete module. Some roles cannot open it. |
| **STAGED DRAFT** | Internal staging label. Rare in partner navigation. |

---

## Surfaces you may see

| Route | Badge | Notes |
|-------|-------|-------|
| `/vendors` | PILOT | Seed vendor demo data |
| `/vendors/supply-chain` | PILOT | Same seed boundary |
| `/reports/dora-eu-resilience` | PREVIEW | Blocked for `GRC_MANAGER` during design-partner pilots |

PILOT pages show this banner: **Pilot surface — seed data only**.

Vendor CSV stubs and demo menus (RFI, map tools, risk override) stay off for active workspaces. For auditor files, use **`/exports`**.

---

## What to trust instead

| Need | Trusted surface |
|------|-----------------|
| Financial posture | `/integrity` |
| Threats / agents | `/cockpit` |
| Sealed evidence | `/evidence` |
| Auditor CSV/PDF | `/exports` |
| Workspace setup | `/get-started` |

---

## Related

- [Design Partner Operator Packet](./design-partner-operator-packet.md)
- [Dashboard guide](./dashboard-guide.md)
