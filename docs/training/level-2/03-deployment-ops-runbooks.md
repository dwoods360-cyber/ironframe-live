# Chapter 3 — Deployment, Environment & Ops Runbooks

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/opsupport` · **Lab IDs:** OPS-001

> **Typical role:** Ops / platform

## Why this chapter matters

Staging and production fail when env keys or cron secrets are wrong. This chapter ties the ops UI to the deployment handbook.

## Learning objectives

When you finish, you can:

- Open `/opsupport` when you have rights.
- Cross-read `docs/technical/deployment-and-ops.md`.
- List which secrets gate internal routes.

## How to get there

1. Open `/opsupport` (infrastructure dashboard).
2. Open `docs/technical/deployment-and-ops.md` beside it.
3. Check `.env.staging.example` keys for Phase 1–3.
4. Note how cron secrets protect internal routes.

## Reference screenshot

![Chapter 3 — Deployment, Environment & Ops Runbooks](/docs/training/assets/level-2-03-deployment-ops-runbooks.png)

*Captured near `/opsupport`. Asset: `/docs/training/assets/level-2-03-deployment-ops-runbooks.png`.*

source-file: public/docs/training/assets/level-2-03-deployment-ops-runbooks.png

## Lab — Env and secret checklist (OPS-001)

1. Write five env keys you expect in staging from the example file.
2. Mark which ones are secrets (never commit real values).
3. Write one cron or internal route that must check a secret.
4. If `/opsupport` is blocked for your role, note the role needed and stop.

## Check your understanding

- [ ] I can find the deployment handbook.
- [ ] I know staging keys live in examples — not in git with real secrets.
- [ ] I can name at least one gated internal route pattern.

## Common mistakes

- Copying production secrets into chat logs is a security failure.
- Ops UI rights are role-gated. Escalate instead of bypassing.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Runbook** | Step list for deploy or incident work. |
| **Cron secret** | Shared secret that blocks anonymous cron calls. |
| **Opsupport** | Infrastructure ops surface at `/opsupport`. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`04-security-compliance-controls.md`](./04-security-compliance-controls.md).
