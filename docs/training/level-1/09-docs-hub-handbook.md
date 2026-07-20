# Chapter 9 — In-App Documentation Hub (/docs)

> **Track:** LEVEL_1 · **Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
> **Primary route:** `/docs` · **Lab IDs:** DOCS-001

> **Note:** **Students** use the [student section](/docs/training/student) and [LEVEL1-STUDENT-INDEX](/docs/training/LEVEL1-STUDENT-INDEX). Design partners use the [Operator Packet](/docs/user-manuals/design-partner-operator-packet) and [LEVEL1-PARTNER-INDEX](/docs/training/LEVEL1-PARTNER-INDEX). If `/docs` is empty, students tell the trainer; partners tell Success/Support. Instructors may run `npx tsx scripts/seed-app-documents.ts` when the Compilation Ingress Portal appears.

## Why this chapter matters

The in-app reader loads Ironframe Core handbooks. Students learn to browse the **student section** and chapter index without engineering CLI tools.

## Learning objectives

When you finish, you can:

- Open `/docs` and browse a student Core manual.
- Open the **student** training index and student section home.
- Know when a seed/CLI step is instructor-only.

## How to get there

1. Open `/docs`.
2. Open `training/student` (student section home) or `training/student/manuals/quickstart`.
3. Open `training/LEVEL1-STUDENT-INDEX`.
4. Confirm markdown pages show headings and cross-links.

## Reference screenshot

![Chapter 9 — In-App Documentation Hub (/docs)](/docs/training/assets/level-1-09-docs-hub-handbook.png)

*Captured near `/docs`. Asset: `/docs/training/assets/level-1-09-docs-hub-handbook.png`.*

source-file: public/docs/training/assets/level-1-09-docs-hub-handbook.png

## Lab — Handbook scavenger hunt (DOCS-001)

1. Open `/docs` and find the [student glossary](/docs/training/student/manuals/glossary) or [student section home](/docs/training/student).
2. Write the path of one Level 1 Core chapter you can open.
3. Write one cross-link you clicked and where it landed.
4. If a Compilation Ingress message appears, screenshot it and stop — escalate to your trainer.

## Check your understanding

- [ ] I can browse `/docs` without CLI.
- [ ] I can find the student section and this training index.
- [ ] I know seed scripts are instructor-only.

## Common mistakes

- Running seed scripts without rights can break a shared classroom DB.
- Empty docs usually means seed state — not a missing lesson.
- Opening Ops Hub or `docs/sales/` GTM pages is out of scope for Core labs.

## Glossary

| Term | Plain meaning |
|------|---------------|
| **Docs hub** | In-app markdown reader at `/docs`. |
| **Compilation Ingress Portal** | Empty-state prompt when manuals are not seeded yet. |
| **Student section** | `docs/training/student/` — Core SaaS handbooks at 11th-grade reading level. |
| **Student index** | Chapter list for classroom Ironframe Core training. |

## Source anchors

- `docs/TAS.md`
- `docs/training/student/README.md`
- `config/route-manifest.v0.1.0-ga-epic17.json`
- `docs/training/student/manuals/glossary.md`

## Next chapter

Continue to [`10-trust-center-procurement.md`](./10-trust-center-procurement.md).
