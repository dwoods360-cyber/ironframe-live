# Chapter 7 — Sustainability Ingress (Ironbloom Physical Units)

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** ESG-001

## Why this chapter matters

Sustainability Pulse shows physical measures such as kWh and liters. Money-only packets are rejected. That keeps ESG signals honest.

## Learning objectives

When you finish, you can:

- Find Sustainability Pulse on the right rail.
- Read kWh and liters from context when present.
- Explain why a money-only sustainability packet fails.

## How to get there

1. Open `/integrity` and find Sustainability Pulse (right ~30% rail).
2. Read kWh and fluid liters when shown.
3. In a sandbox lab, note that monetary-only packets are rejected.
4. Document any Ironwatch heartbeat or degradation flags you see.

## Reference screenshot

![Chapter 7 — Sustainability Ingress (Ironbloom Physical Units)](/docs/training/assets/level-2-07-sustainability-ironbloom.png)

*Captured near `/integrity`. Asset: `/docs/training/assets/level-2-07-sustainability-ironbloom.png`.*

source-file: public/docs/training/assets/level-2-07-sustainability-ironbloom.png

## Lab — Physical units only (ESG-001)

1. Write the kWh value you see (or “not present”).
2. Write the liters value you see (or “not present”).
3. Explain in one sentence why dollars alone are not enough for Ironbloom ingress.
4. If a reject reason is shown in lab tooling, copy it into your journal.

## Check your understanding

- [ ] I can find Sustainability Pulse.
- [ ] I know ingress wants physical units.
- [ ] I can spot a missing heartbeat / degradation flag when shown.

## Common mistakes

- Do not convert kWh into dollars in the ingress payload.
- Empty pulse may mean telemetry gap — ask before inventing numbers.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Ironbloom** | Sustainability ingress API/path for physical metrics. |
| **Physical units** | Measures such as kWh or liters — not currency. |
| **Sustainability Pulse** | Right-rail panel showing live ESG metrics. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`08-admin-onboarding-provisioning.md`](./08-admin-onboarding-provisioning.md).
