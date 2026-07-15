# Chapter 2 — API Ingress Contracts & BigInt Schema

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/docs/technical/architecture-and-api` · **Lab IDs:** API-001

## Why this chapter matters

API contracts decide what data can enter. Money uses whole cents (BigInt). Sustainability uses physical units. Mixing those rules breaks audits.

## Learning objectives

When you finish, you can:

- Open the architecture and API handbook in `/docs`.
- Find the Ironbloom physical-unit gate.
- Confirm examples never show float cents.

## How to get there

1. Open `/docs/technical/architecture-and-api`.
2. Find `POST /api/sustainability/ironbloom` and the physical-unit rule.
3. Review CRM `SYSTEM_AGENT` channel metadata notes in the docs.
4. Scan examples and confirm money is whole cents — not floats.

## Reference screenshot

![Chapter 2 — API Ingress Contracts & BigInt Schema](/docs/training/assets/level-2-02-api-ingress-contracts.png)

*Captured near `/docs/technical/architecture-and-api`. Asset: `/docs/training/assets/level-2-02-api-ingress-contracts.png`.*

source-file: public/docs/training/assets/level-2-02-api-ingress-contracts.png

## Lab — Contract scavenger hunt (API-001)

1. Copy one API path from the handbook into your journal.
2. Write the money rule in one sentence: whole cents only.
3. Write the sustainability rule in one sentence: physical units, not dollars-only packets.
4. Find one example that would be invalid if it used `1.99` dollars as a float field.

## Check your understanding

- [ ] I can open the architecture handbook.
- [ ] I can state the BigInt cents rule.
- [ ] I know Ironbloom expects physical units.

## Common mistakes

- UI may show `$1.99`. Storage and API still use integer cents.
- Do not invent endpoints that are not in the handbook.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Ingress** | Data entering the system through an API or form. |
| **BigInt cents** | Whole pennies stored exactly — no floating point money. |
| **Ironbloom** | Sustainability ingress that requires physical units such as kWh. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`03-deployment-ops-runbooks.md`](./03-deployment-ops-runbooks.md).
