# Windows workstation migration — readiness checklist

**Purpose:** Bring Ironframe GTM + local nightly ops onto the **Windows** Cursor box.  
**Repo state (source of truth):** `origin/main` — pull; do not copy uncommitted Mac scratch.  
**Companions:** [Nightly cron runbook](../operations-support/nightly-cron-runbook.md) · [Ops surface map](../sales/design-partner-ops-surface-map.md) · [Go-live remaining](./production-go-live-remaining.md) · [Prior handoff](./workstation-handoff-2026-07-29.md)

Production (Vercel / Stripe / Cloud Run) **already runs in the cloud** — this checklist only restores the **operator machine**.

---

## 0. Already done in git (verify after pull)

| Item | Status on `main` |
|------|------------------|
| Path B marketing + Stripe live hardening | ☑ |
| Live Stripe catalog + year-1 balance artifacts | ☑ tracked JSON under `scripts/dev/` |
| Counsel packet export + Google Docs ID map | ☑ `scripts/ops/.state/counsel-packet-google-docs.json` |
| Ops surface map (Operator library) | ☑ `/dashboard/operations/library/ops-surface-map` |
| IronBoard claim-ban docs federation | ☑ Cloud Run deploy succeeded |
| Week-1 MSSP Scout + ICP §A five-sector kit | ☑ |

**Never committed (re-pull on Windows):** `.env.local` / `.env.production.vercel`, Google OAuth tokens, CLI login sessions.

---

## 1. One-time Windows bootstrap

In **PowerShell** (adjust path if not the default):

```powershell
# Default Task Scheduler root (override if different):
#   C:\Users\Dereck\ironframe-live
cd C:\Users\Dereck\ironframe-live   # or your clone path
git pull origin main
git status   # expect clean, synced with origin/main

# Tooling (if missing)
# - Node.js LTS (match Vercel; project uses Node 24.x on deploy)
# - Git for Windows
# - Cursor
# - npm i -g vercel

npm install --legacy-peer-deps

npx vercel login
npx vercel link
npx vercel env pull .env.production.vercel --environment=production --yes
# Optional for local scripts that read .env.local:
Copy-Item .env.production.vercel .env.local

# Confirm ops maps from git
Test-Path .\scripts\dev\stripe-catalog-artifact.live.json
Test-Path .\scripts\dev\stripe-year1-balance-artifact.live.json
Test-Path .\scripts\ops\.state\counsel-packet-google-docs.json
```

Set **user** env `CURSOR_API_KEY` (required for Documentation Engine / headless Cursor CLI).

---

## 2. Register Windows Task Scheduler (nightly)

From repo root (elevated or with task-create rights):

```powershell
# Default ProjectRoot = C:\Users\Dereck\ironframe-live
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\register-nightly-cron-tasks.ps1

# If clone lives elsewhere:
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\register-nightly-cron-tasks.ps1 -ProjectRoot "D:\path\to\ironframe-live"
```

| Local time | Task |
|------------|------|
| 03:00 | `\Ironframe Daily Documentation Engine` |
| 03:30 | `\Ironframe GRC Narrative Hydration` |
| 04:00 Mon–Fri | `\Ironframe GTM Briefing Queue` (quarantine only) |
| 08:15 | `\Ironframe Ops Schedule Reminders` |

Detail: [nightly-cron-runbook.md](../operations-support/nightly-cron-runbook.md).  
PC must be awake / logged in as configured; battery policies may delay runs.

---

## 3. GTM operator smoke (same day)

Signed in on https://ironframegrc.com :

1. [Ops surface map](https://ironframegrc.com/dashboard/operations/library/ops-surface-map) — know each screen  
2. [ICP shortlist §A](https://ironframegrc.com/dashboard/operations/library/icp-shortlist#section-a) — five warm cross-section rows  
3. [Approvals SALES](https://ironframegrc.com/dashboard/admin/approvals?kind=SALES) — newest non-HOLD draft (not Pivot Point / BlueRadius)  
4. Calling card: https://ironframegrc.com/marketing  

Locks unchanged: counsel **D0 off** · public instant checkout **off** · no demo-tenant pitches · BlueRadius **HOLD**.

---

## 4. Done when

- [ ] `git pull` clean on Windows clone  
- [ ] `npm install` OK  
- [ ] `vercel env pull` produced production secrets locally  
- [ ] Three Stripe/counsel artifact paths exist  
- [ ] Four Task Scheduler tasks registered (or consciously deferred)  
- [ ] `CURSOR_API_KEY` set for doc engine  
- [ ] Opened ops surface map + shortlist in browser  

After that, this Mac (or any other remote) is **not** required for Ironframe ops.
