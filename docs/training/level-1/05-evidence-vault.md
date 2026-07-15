# Chapter 5 — Evidence Vault & WORM Ledger Operations

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/evidence` · **Lab IDs:** EVID-001

## Why this chapter matters

Auditors need proof that cannot be quietly edited. WORM means write once, read many. After seal, evidence stays locked.

## Learning objectives

When you finish, you can:

- Open Evidence Vault at `/evidence`.
- Explain why sealed records cannot be deleted.
- Know that live auditor files also use `/exports`.

## How to get there

1. Open Evidence from the top nav, or go to `/evidence`.
2. Scan the list of locked evidence entries.
3. Note any seal or WORM labels on a record.
4. If exports are enabled, open `/exports` once for the companion path.

## Reference screenshot

![Chapter 5 — Evidence Vault & WORM Ledger Operations](/docs/training/assets/level-1-05-evidence-vault.png)

*Captured near `/evidence`. Asset: `/docs/training/assets/level-1-05-evidence-vault.png`.*

source-file: public/docs/training/assets/level-1-05-evidence-vault.png

## Lab — Confirm seal behavior (EVID-001)

1. Open `/evidence`.
2. Pick one evidence entry and write its title and status.
3. Answer in your journal: can an operator delete a sealed record? Why or why not?
4. Open `/exports` if available. Note CSV/PDF options for your tenant.
5. If exports are blocked, write the banner text and stop.

## Check your understanding

- [ ] I can open `/evidence`.
- [ ] I can define WORM in plain words.
- [ ] I know `/exports` is the analyst download path.

## Common mistakes

- Do not use PILOT vendor screens for auditor CSV.
- If billing is PENDING, exports may stay sealed — that is expected.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Evidence Vault / Locker** | Store of audit proof at `/evidence`. |
| **WORM** | Write once, read many — sealed records cannot be changed or deleted. |
| **Exports** | Tenant CSV/PDF downloads at `/exports`. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`06-cockpit-agent-viewport.md`](./06-cockpit-agent-viewport.md).
