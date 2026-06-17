# Nightly Cron Runbook — Documentation Engine vs API Narrate

**One-page ops reference** for Ironframe’s two separate “narrate” pipelines. They run on a **staggered cadence** so documentation sync and filesystem state settle before exposure-threshold narrate reads live telemetry.

---

## Staggered pipeline (default)

| Time (local Windows) | Time (Vercel UTC) | Job | Entry |
|----------------------|-------------------|-----|--------|
| **03:00** | **03:00** | Documentation sync + OSINT + governance memo | `scripts\cron_narrate_scheduled.ps1` |
| *(30 min settle)* | *(30 min settle)* | Filesystem, glossary, and DB state finalize | — |
| **03:30** | **03:30** | GRC triad narrate + briefing-queue draft + exposure alerts | `scripts\cron_narrate_api_scheduled.ps1` → `bin\cron_narrate.ps1` or Vercel `/api/cron/narrate` |

**Why stagger:** When both jobs coincided at 03:00, narrate could evaluate `INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS` against telemetry while the doc engine was still mutating docs and related state. Shifting API narrate to **03:30** guarantees a finalized post-update environment.

**Register local tasks:**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\register-nightly-cron-tasks.ps1
```

---

## At a glance

| | **Doc Engine (Windows)** | **API Narrate (Core / Vercel)** |
|---|---|---|
| **Purpose** | Refresh app documentation from git deltas; OSINT sweep; governance memo via Cursor CLI | Persist **Governance Frame Triad** snapshot + board narrative in Postgres |
| **Primary output** | `docs/qa/complete-feature-glossary.md`, agent-written memos in log | `GovernanceFrameTriadSnapshot`, `CronJobArtifact`, `briefing-queue` draft |
| **Scheduler** | Windows Task `\Ironframe Daily Documentation Engine` — **03:00** local | Windows Task `\Ironframe GRC Narrative Hydration` — **03:30** local; Vercel `30 3 * * *` UTC |
| **Entry script** | `scripts\cron_narrate_scheduled.ps1` → `scripts\cron_narrate.ps1` | `scripts\cron_narrate_api_scheduled.ps1` → `bin\cron_narrate.ps1` · `app/api/cron/narrate/route.ts` |
| **Log file** | `scripts\cron_narrate.log` | `logs\cron_narrate_log.txt` (local) · Vercel function logs |
| **Needs app running?** | No (Cursor CLI only) | Yes — Core on `:3000` (local) or deployed preview/prod |

---

## 1. Windows Documentation Engine

### Task settings (staggered baseline)

| Setting | Doc engine | GRC API narrate |
|---------|------------|-----------------|
| **Task name** | `\Ironframe Daily Documentation Engine` | `\Ironframe GRC Narrative Hydration` |
| **Trigger** | Daily **03:00** local | Daily **03:30** local |
| **Action** | `scripts\cron_narrate_scheduled.ps1` | `scripts\cron_narrate_api_scheduled.ps1` |
| **Start in** | `C:\Users\Dereck\ironframe-live` | same |

Legacy single-task installs may only have the doc engine at 03:00. Re-register with `scripts\register-nightly-cron-tasks.ps1` to add the 03:30 narrate task.

| Setting | Value (doc engine) |
|---------|--------|
| **Run as** | Interactive user (`Dereck`) |
| **Logon** | Interactive only |
| **Power** | Stop on battery; no start on batteries |

**Implication:** If the PC is asleep, logged out, or on battery at 03:00, the **full pipeline may run later** (e.g. after wake/login). Task Scheduler may still show an early-morning last-run time while `cron_narrate.log` timestamps reflect the actual execution window.

### Environment variables

| Variable | Required | Source | Purpose |
|----------|----------|--------|---------|
| `CURSOR_API_KEY` | **Yes** | User env vars or `.env.local` | Headless Cursor CLI auth |
| *(from `.env.local` / `.env`)* | Optional | Dotenv import in script | Supabase, DB, etc. if agent touches them |

Loaded by `Import-ProjectDotEnv` from `.env.local` then `.env`.

### Pipeline phases (`scripts/cron_narrate.ps1`)

1. **Git delta** — writes `daily_code_diff.txt` (diff vs ~24h ago, excludes `docs/`).
2. **Writer** — Cursor agent updates `docs/qa/complete-feature-glossary.md`.
3. **Ironintel / Ironwatch** — live OSINT sweep (Irongate-sanitized).
4. **Ironlogic / Irontally** — corporate governance memo (ALE baselines, compliance drift).

### Artifacts & logs

| Path | Meaning |
|------|---------|
| `scripts\cron_narrate.log` | Authoritative success/fail log (timestamps in `-05:00` local) |
| `daily_code_diff.txt` | Input delta for Writer phase |
| `docs\qa\complete-feature-glossary.md` | Primary doc output |

### Doc engine — success criteria

**Pass** when the log shows, in order:

```
[timestamp] cron_narrate.ps1: starting (project root: ...)
[timestamp] Cursor agent auth: API key configured.
[timestamp] daily_code_diff.txt generated successfully (... bytes).
[timestamp] Invoking Narrative Architect for internal code changes...
[timestamp] Invoking Ironintel & Irongate for live morning OSINT sweep...
[timestamp] Invoking Ironlogic & Irontally for Corporate Governance Memo...
[timestamp] cron_narrate.ps1: complete.
```

**Fail** when you see `ERROR:` lines (missing `CURSOR_API_KEY`, CLI not found, agent exit code ≠ 0).

### Doc engine — manual smoke

```powershell
cd C:\Users\Dereck\ironframe-live
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\cron_narrate.ps1
Get-Content .\scripts\cron_narrate.log -Tail 20
```

### Doc engine — Task Scheduler check

```powershell
schtasks /Query /TN "\Ironframe Daily Documentation Engine" /FO LIST /V |
  Select-String "Last Run|Last Result|Next Run|Status|Task To Run"
schtasks /Query /TN "\Ironframe GRC Narrative Hydration" /FO LIST /V |
  Select-String "Last Run|Last Result|Next Run|Status|Task To Run"
```

| `Last Result` | Meaning |
|---------------|---------|
| `0` | Wrapper exited OK (confirm with log — see timing note above) |
| Non-zero | Wrapper or script failed |

---

## 2. API Governance Narrate (Core)

### Schedule

| Host | Cron | Route |
|------|------|-------|
| **Vercel (production/preview)** | `30 3 * * *` UTC (after `0 3` ironwatch heartbeat) | `/api/cron/narrate` |
| **Local (scheduled)** | **03:30** local | `scripts\cron_narrate_api_scheduled.ps1` → `bin\cron_narrate.ps1` |
| **Local (manual)** | On demand | `POST http://127.0.0.1:3000/api/cron/narrate` |

Vercel sends `Authorization: Bearer <IRONFRAME_CRON_SECRET>` automatically when the secret is configured in the project.

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `IRONFRAME_CRON_SECRET` | **Yes** | Bearer auth on all cron routes |
| `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | **Yes** | Gemini narrate in `narrateGovernanceTriad.ts` |
| `DATABASE_URL` | **Yes** | Upsert `GovernanceFrameTriadSnapshot` |
| `IRONFRAME_CORE_ORIGIN` | Local wrapper only | Default `http://127.0.0.1:3000` (`bin\cron_narrate.ps1`) |
| `SHADOW_PLANE_INGEST_TENANT_UUID` | Optional | Default tenant if header/query omitted |
| `GEMINI_NARRATE_MODEL` | Optional | Override model (default `gemini-2.5-flash`) |

Default tenant UUID: Medshield (`5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01`) unless `x-tenant-id` header or `?tenantId=` is set.

### API narrate — success criteria

**HTTP 200** JSON body:

```json
{
  "ok": true,
  "tenantId": "...",
  "operationalDate": "2026-06-16",
  "snapshotId": "...",
  "artifactId": "...",
  "narrativeChars": 1234
}
```

**Pass indicators:**

- Response includes non-empty `snapshotId` and `artifactId`.
- Board context shows populated `narrativeCache` for that tenant:

```powershell
curl.exe -s "http://127.0.0.1:3000/api/board/shared-context" `
  -H "x-ironframe-host-tenant-uuid: 5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01" |
  ConvertFrom-Json | Select-Object -ExpandProperty narrativeCache
```

**Fail indicators:**

- `401` — bad/missing `IRONFRAME_CRON_SECRET`.
- `500` + `"ok": false` — usually missing Google API key or DB error (check Core logs).
- Core not running — connection refused from `bin\cron_narrate.ps1` → `logs\cron_narrate_log.txt` shows `CRITICAL FAULT`.

### API narrate — manual smoke (local)

```powershell
# Terminal 1 — Core must be up
$env:IRONFRAME_WORM_THREAT_EVENT_ENFORCED = "1"   # optional
npm run dev

# Terminal 2 — load secret from .env.local, then:
$secret = (Get-Content .env.local | Where-Object { $_ -match '^IRONFRAME_CRON_SECRET=' }) -replace '^IRONFRAME_CRON_SECRET=',''
curl.exe -s -X POST "http://127.0.0.1:3000/api/cron/narrate" `
  -H "Authorization: Bearer $secret" `
  -H "x-ironframe-host-tenant-uuid: 5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"
```

Or use the Windows wrapper (writes to `logs\cron_narrate_log.txt`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\bin\cron_narrate.ps1
Get-Content .\logs\cron_narrate_log.txt -Tail 5
```

Expected wrapper line:

```
Success: Snapshot generated. snapshotId=... artifactId=...
```

---

## 3. Troubleshooting quick map

| Symptom | Likely pipeline | Action |
|---------|-----------------|--------|
| Glossary stale; no DB snapshot | Doc engine only ran | Check `scripts\cron_narrate.log`; re-run `scripts\cron_narrate.ps1` |
| Board `narrativeCache: null` | API narrate never ran / failed | Smoke `POST /api/cron/narrate`; verify `GOOGLE_API_KEY` + DB |
| Task “success” at 03:00 but log shows 07:00+ | Interactive-only / sleep / battery | Enable “Run whether user is logged on or not”, “Wake to run”, AC power |
| `CURSOR_API_KEY is not set` | Doc engine | Set User env var or `.env.local` |
| `IRONFRAME_CRON_SECRET is missing` | API wrapper (`bin\`) | Add to `.env.local` |
| Two different log files | Both exist by design | `scripts\` = doc engine · `logs\` = API wrapper |

---

## 4. Pipeline cadence reference

| Layer | Schedule | Config location |
|-------|----------|-----------------|
| Doc engine (local) | `03:00` | Windows Task `\Ironframe Daily Documentation Engine` |
| Ironwatch heartbeat (Vercel) | `0 3 * * *` UTC | `vercel.json` |
| GRC API narrate (local) | `03:30` | Windows Task `\Ironframe GRC Narrative Hydration` |
| GRC API narrate (Vercel) | `30 3 * * *` UTC | `vercel.json` → `/api/cron/narrate` |

To shift Vercel narrate to **04:00 UTC** (longer settle), change `vercel.json` to `"0 4 * * *"` and local task to `04:00` in `register-nightly-cron-tasks.ps1`.

**Do not** chain `bin\cron_narrate.ps1` immediately after `cron_narrate.ps1` in the same script — that collapses the stagger and reintroduces race conditions on exposure threshold evaluation.

---

*Last aligned to repo: staggered nightly pipeline (03:00 doc / 03:30 narrate), `scripts/register-nightly-cron-tasks.ps1`.*
