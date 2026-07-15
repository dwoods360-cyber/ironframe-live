# Chapter 9 — In-App Documentation Hub (/docs)

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/docs` · **Lab IDs:** DOCS-001

> **Note:** Students: if `/docs` is empty, tell your trainer. Do not run seed scripts yourself. Instructors may run `npx tsx scripts/seed-app-documents.ts` when the Compilation Ingress Portal appears.

## Why this chapter matters

The in-app reader loads handbooks from the platform. You learn to browse manuals and the student training index without engineering CLI tools.

## Learning objectives

When you finish, you can:

- Open `/docs` and browse a Level 1 manual.
- Open the student training index.
- Know when a seed/CLI step is instructor-only.

## How to get there

1. Open `/docs`.
2. From the sidebar, open `user-manuals/quickstart` (or the closest Level 1 manual).
3. Open the Level 1 student index from training links.
4. Confirm markdown pages show headings and cross-links.

## Reference screenshot

![Chapter 9 — In-App Documentation Hub (/docs)](/docs/training/assets/level-1-09-docs-hub-handbook.png)

*Captured near `/docs`. Asset: `/docs/training/assets/level-1-09-docs-hub-handbook.png`.*

source-file: public/docs/training/assets/level-1-09-docs-hub-handbook.png

## Lab — Handbook scavenger hunt (DOCS-001)

1. Open `/docs` and find the glossary or operator packet.
2. Write the path of one Level 1 training chapter you can open.
3. Write one cross-link you clicked and where it landed.
4. If a Compilation Ingress message appears, screenshot it and stop — escalate to your trainer.

## Check your understanding

- [ ] I can browse `/docs` without CLI.
- [ ] I can find this training track from the index.
- [ ] I know seed scripts are instructor-only.

## Common mistakes

- Running seed scripts without rights can break a shared classroom DB.
- Empty docs usually means billing or seed state — not a missing lesson.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Docs hub** | In-app markdown reader at `/docs`. |
| **Compilation Ingress Portal** | Empty-state prompt when manuals are not seeded yet. |
| **Student index** | Chapter list for classroom Level 1 training. |

## Source anchors

- `docs/TAS.md`
- `docs/qa/complete-feature-glossary.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/user-manuals/glossary.md`

## Next chapter

Continue to [`10-trust-center-procurement.md`](./10-trust-center-procurement.md).
