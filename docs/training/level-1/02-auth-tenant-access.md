# Chapter 2 — Authentication, RBAC & Tenant Assignment

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/login` · **Lab IDs:** AUTH-001

> **Design partners:** use `https://{slug}.ironframegrc.com` and your client-owned login. Start from the [Operator Packet](/docs/user-manuals/design-partner-operator-packet) and [LEVEL1-PARTNER-INDEX](/docs/training/LEVEL1-PARTNER-INDEX). Localhost / student-credential steps are instructor-only.

## Why this chapter matters

Access control keeps each company's data apart. You learn how login, roles, and tenant cookies work before you touch money or evidence screens.

## Learning objectives

When you finish, you can:

- Sign in at `/login` with assigned credentials.
- Predict what happens when a role is missing (`/unauthorized`).
- Find the tenant cookie that scopes your session.

## How to get there

1. From a signed-out browser, open `/login`.
2. Sign in with email and password (Supabase auth).
3. If you lack rights, confirm redirect to `/unauthorized`.
4. When signed in, open DevTools → Application → Cookies and find `ironframe-tenant`.

## Reference screenshot

![Chapter 2 — Authentication, RBAC & Tenant Assignment](/docs/training/assets/level-1-02-auth-tenant-access.png)

*Captured near `/login`. Asset: `/docs/training/assets/level-1-02-auth-tenant-access.png`.*

source-file: public/docs/training/assets/level-1-02-auth-tenant-access.png

## Lab — Prove your session scope (AUTH-001)

1. Sign out fully, then sign in again at `/login`.
2. Confirm you land in an allowed app route (not a blank error).
3. Copy the `ironframe-tenant` cookie value into your lab journal (keep it private).
4. Ask: which company workspace does this cookie represent?
5. If your trainer asks you to try a blocked role, note the `/unauthorized` redirect.

## Check your understanding

- [ ] I can sign in and out cleanly.
- [ ] I know where to find the tenant cookie.
- [ ] I know unauthorized users should not see other tenants' data.

## Common mistakes

- Never paste cookies into chat tools or public notes.
- Do not share student passwords across people.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **RBAC** | Role-based access control — your role limits which screens you can open. |
| **Tenant** | One company's isolated workspace on the shared platform. |
| **ironframe-tenant** | Cookie that tells the app which tenant session you use. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`03-dashboard-navigation.md`](./03-dashboard-navigation.md).
