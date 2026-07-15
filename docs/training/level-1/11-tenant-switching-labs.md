# Chapter 11 — Tenant Switching & Isolation Labs (TENANT-001)

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** TENANT-001 / AUTH-001

> **Note:** Design partners usually skip this chapter. Classroom trainers assign multi-tenant lab accounts.

## Why this chapter matters

Tenant isolation is a hard security rule. Switching seed tenants must change exposure — and must not leak data across companies.

## Learning objectives

When you finish, you can:

- Use the tenant switcher when your account allows multiple tenants.
- Switch Medshield → Vaultbank → Gridcore and watch baselines change.
- Spot a failed isolation test (same data after switch).

## How to get there

1. Confirm your account can use the tenant switcher.
2. On `/integrity`, switch Medshield → Vaultbank → Gridcore.
3. Confirm exposure baselines change per seed profile.
4. With trainer guidance, check that network responses stay tenant-scoped.

## Reference screenshot

![Chapter 11 — Tenant Switching & Isolation Labs (TENANT-001)](/docs/training/assets/level-1-11-tenant-switching-labs.png)

*Captured near `/integrity`. Asset: `/docs/training/assets/level-1-11-tenant-switching-labs.png`.*

source-file: public/docs/training/assets/level-1-11-tenant-switching-labs.png

## Lab — Prove isolation (TENANT-001)

1. Record ALE / exposure for Medshield.
2. Switch to Vaultbank. Record exposure.
3. Switch to Gridcore. Record exposure.
4. Confirm the three values are not identical if the seed set is loaded.
5. Write one sentence: what would count as a cross-tenant leak?

## Check your understanding

- [ ] I saw baselines change across seed tenants.
- [ ] I did not keep screenshots that mix tenant IDs without labels.
- [ ] I can explain isolation in plain words.

## Common mistakes

- If the switcher is missing, your account may be single-tenant. Ask the trainer.
- Never share screenshots that expose another team's private lab data outside class.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Tenant isolation** | One company's data stays invisible to other companies. |
| **Seed tenant** | Demo company used for labs (Medshield, Vaultbank, Gridcore). |
| **Tenant switcher** | Control that changes which workspace you operate. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`12-student-certification.md`](./12-student-certification.md).
