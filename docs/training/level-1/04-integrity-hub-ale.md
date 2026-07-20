# Chapter 4 — Integrity Hub & ALE Financial Posture

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** FIN-001 / FIN-002

> **Design partners:** use `https://{slug}.ironframegrc.com` and your client-owned login. Start from the [Operator Packet](/docs/user-manuals/design-partner-operator-packet) and [LEVEL1-PARTNER-INDEX](/docs/training/LEVEL1-PARTNER-INDEX). Localhost / student-credential steps are instructor-only.

## Why this chapter matters

Boards care about money at risk. ALE is Annualized Loss Expectancy. Integrity Hub shows those dollars as readable amounts — never raw BigInt strings in the UI.

## Learning objectives

When you finish, you can:

- Find baseline cards for classroom seed tenants.
- Read exposure as a formatted dollar string.
- Record maturity score and critical threat count.

## Screen layout

| Panel | What you see |
|-------|--------------|
| Left (~22%) | Baselines, framework matrix, asset profiles |
| Center (~48%) | Risk and financial posture work area |
| Right (~30%) | Sustainability Pulse and live audit stream |

## How to get there

1. Open `/integrity`.
2. Locate seed baseline cards (Medshield, Vaultbank, Gridcore) when shown.
3. Read the active exposure as a formatted dollar amount.
4. Note maturity score and critical threat indicators in your journal.

## Reference screenshot

![Chapter 4 — Integrity Hub & ALE Financial Posture](/docs/training/assets/level-1-04-integrity-hub-ale.png)

*Captured near `/integrity`. Asset: `/docs/training/assets/level-1-04-integrity-hub-ale.png`.*

source-file: public/docs/training/assets/level-1-04-integrity-hub-ale.png

## Lab — Read ALE without guessing (FIN-001 / FIN-002)

1. Open `/integrity` on your assigned classroom tenant.
2. Write the formatted exposure string you see (example style: $11.1M).
3. Write the maturity score and critical threat count.
4. If seed cards appear, list which seed names you see.
5. Confirm the UI does not show a long raw integer for money.

## Check your understanding

- [ ] I can explain ALE in one plain sentence.
- [ ] I read dollars from the UI, not from database cents dumps.
- [ ] I treat seed baselines as training fixtures.

## Common mistakes

- Raw cents live in the database. Operators read formatted dollars.
- Seed baselines (Medshield $11.1M, Vaultbank $5.9M, Gridcore $4.7M class fixtures) are not partner production ALE.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **ALE** | Annualized Loss Expectancy — estimated yearly loss from risk. |
| **Exposure** | Money-at-risk figure shown for the active tenant. |
| **Maturity score** | How strong the control posture looks on Integrity Hub. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`05-evidence-vault.md`](./05-evidence-vault.md).
