# Chapter 8 — B2B Admin Onboarding & Tenant Provisioning

> **Track:** LEVEL_2 · **Reading level:** 11th–12th grade plain English · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/admin/onboarding` · **Lab IDs:** ADMIN-001

> **Typical role:** GLOBAL_ADMIN

> **Note:** Tenant operators and design partners do not use this route for self-serve signup.

## Why this chapter matters

New corporate tenants are provisioned by Ironframe admins — not by public signup. This path is privileged and often bypasses the billing gate.

## Learning objectives

When you finish, you can:

- Sign in as GLOBAL_ADMIN.
- Open `/admin/onboarding`.
- Describe the corporate provision flow at a high level.

## How to get there

1. Sign in as GLOBAL_ADMIN.
2. Open `/admin/onboarding`.
3. Review the corporate tenant provision steps on screen.
4. Confirm this route’s billing-gate exemption behavior with your trainer.

## Reference screenshot

![Chapter 8 — B2B Admin Onboarding & Tenant Provisioning](/docs/training/assets/level-2-08-admin-onboarding-provisioning.png)

*Captured near `/admin/onboarding`. Asset: `/docs/training/assets/level-2-08-admin-onboarding-provisioning.png`.*

source-file: public/docs/training/assets/level-2-08-admin-onboarding-provisioning.png

## Lab — Provision path walkthrough (ADMIN-001)

1. List the fields or steps shown on `/admin/onboarding`.
2. Write who may use this route.
3. Write who must not (partners, public visitors).
4. Note whether a billing hold appears — and whether that is expected.

## Check your understanding

- [ ] I know GLOBAL_ADMIN owns provisioning.
- [ ] I can open the onboarding admin route when authorized.
- [ ] I know partners use invite + design-partner seat instead.

## Common mistakes

- Provisioning the wrong slug creates lasting isolation headaches.
- Never provision using `@ironframegrc.com` as the client operator email when policy forbids it.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Provisioning** | Creating and activating a tenant workspace. |
| **GLOBAL_ADMIN** | Ironframe platform admin role. |
| **Billing gate exemption** | Admin route allowed even when normal billing holds apply. |

## Source anchors

- `docs/TAS.md`
- `docs/technical/architecture-and-api.md`
- `docs/technical/deployment-and-ops.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`

## Next chapter

Continue to [`09-sales-support-portals.md`](./09-sales-support-portals.md).
