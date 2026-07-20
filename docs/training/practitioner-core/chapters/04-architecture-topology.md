# Chapter 4 — Dual-host topology (overview)

> **Track:** PRACTITIONER_CORE · **Reading level:** 11th–12th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/integrity` · **Lab IDs:** PCORE-004  
> **Depth note:** Overview only — full detail in Level 2 ch.01 + `docs/technical/architecture-and-api`.

## Why this chapter matters

Practitioners should know Ironframe is more than one screen: control plane (Core app) vs supporting workers/docs planes. You learn the **map**, not how to deploy yet.

## Learning objectives

- Name the Core SaaS host you use in class.
- State that perimeter workers (if any) are separate from the tenant cockpit.
- Open the architecture handbook path your trainer assigns (or skip if corpus not seeded).

## Reference screenshot

![Chapter 4 — Architecture topology](/docs/training/assets/practitioner-core-04-architecture-topology.png)

*Captured near Core `/integrity` as the operator home plane. Asset: `/docs/training/assets/practitioner-core-04-architecture-topology.png`.*

source-file: public/docs/training/assets/practitioner-core-04-architecture-topology.png

## Lab — Two planes (PCORE-004)

1. Draw two boxes: **Core SaaS** vs **Other planes** (workers / docs / research).
2. Put `/integrity`, `/evidence`, `/exports` in Core.
3. Put “Ops Hub / Ironleads” in Other — note they are **not** this track’s labs.

## Next

[`05-api-ingress-contracts.md`](./05-api-ingress-contracts.md)
