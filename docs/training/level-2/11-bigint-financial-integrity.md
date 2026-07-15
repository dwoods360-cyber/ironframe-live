# Chapter 11 — BigInt Financial Integrity & Baseline Verification

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** FIN-001

## Why this chapter matters

Seed baselines prove money math. Cents stay whole integers. The UI shows formatted dollars. Tests guard the invariant.

## Learning objectives

When you finish, you can:

- Read Integrity Hub posture cards.
- Verify classroom seed baselines in cents.
- Know where the financial invariant test lives.

## How to get there

1. Open `/integrity` financial posture cards.
2. Verify Medshield baseline `1110000000` cents when using seed data.
3. Verify Vaultbank `590000000` and Gridcore `470000000`.
4. In a lab shell, run `tests/unit/financialIngressInvariant.test.ts` when available.

## Reference screenshot

![Chapter 11 — BigInt Financial Integrity & Baseline Verification](/docs/training/assets/level-2-11-bigint-financial-integrity.png)

*Captured near `/integrity`. Asset: `/docs/training/assets/level-2-11-bigint-financial-integrity.png`.*

source-file: public/docs/training/assets/level-2-11-bigint-financial-integrity.png

## Lab — Cents vs dollars (FIN-001)

1. Write each seed name with its cent baseline.
2. Write the formatted dollar form you see in the UI for your active tenant.
3. Explain why raw BigInt must not appear as operator-facing copy.
4. If you run the unit test, paste the pass/fail line into your journal.

## Check your understanding

- [ ] I can recite the three seed cent baselines.
- [ ] I know UI dollars are formatted views of cents.
- [ ] I know a unit test guards float money regressions.

## Common mistakes

- Partner ALE may differ from seed fixtures — do not overwrite partner values with classroom cents.
- Floating point money in ingress is a defect.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Baseline** | Reference exposure used for a seed or workspace. |
| **Invariant** | Rule that must always stay true (whole cents). |
| **Formatted USD** | Human-readable dollars derived from integer cents. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`12-practitioner-certification.md`](./12-practitioner-certification.md).
