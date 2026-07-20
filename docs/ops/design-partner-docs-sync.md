# Design partner documentation — AppDocument sync

**Audience:** Ironframe operators · **Related:** [Operator packet](../user-manuals/design-partner-operator-packet.md) · [Launch checklist](../sales/design-partner-operator-launch-checklist.md)

In-app `/docs` reads from PostgreSQL `AppDocument` (not the git tree on Vercel). After editing Level 1 partner manuals, sync the corpus on each environment before handing partners links.

## Local / staging

```bash
# Full masters + filesystem walk (recommended)
npx tsx prisma/seed-docs.ts

# Or corpus walk only
npx tsx scripts/seed-app-documents.ts
```

Confirm these slugs resolve for an authenticated, billing-ACTIVE session:

| Slug path |
|-----------|
| `/docs/user-manuals/design-partner-operator-packet` |
| `/docs/user-manuals/get-started-workspace-setup` |
| `/docs/user-manuals/audit-exports` |
| `/docs/user-manuals/pilot-vs-preview` |
| `/docs/training/LEVEL1-PARTNER-INDEX` |

## Production

1. Deploy the commit that contains the partner markdown.
2. Run the seed against the **production** database (same commands with production `DATABASE_URL`), or your approved docs-ingress pipeline (`POST /api/documentation/execute` with `INTERNAL_GATEWAY_SECRET_KEY`).
3. Spot-check the five URLs above on a design-partner tenant with ACTIVE billing.
4. Check launch checklist items **D5–D6**.

## Partner handoff (what to send)

Share only:

1. Tenant login host + invite (already done in provision)
2. `/get-started`
3. `/docs/user-manuals/design-partner-operator-packet`
4. `/docs/training/LEVEL1-PARTNER-INDEX`

Do **not** send: `docs/ops/*`, classroom `LEVEL1-STUDENT-INDEX`, sales SKU drafts, or admin runbooks.
