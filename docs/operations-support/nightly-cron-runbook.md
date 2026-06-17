# Nightly Cron Runbook — Documentation Engine vs API Narrate

**One-page ops reference** for Ironframe’s two separate “narrate” pipelines. They share a name in conversation but **do not call each other** unless you wire them together manually.

---

## At a glance

| | **Doc Engine (Windows)** | **API Narrate (Core / Vercel)** |
|---|--------------------------|----------------------------------|
| **Purpose** | Refresh app documentation from git deltas; OSINT sweep; governance memo via Cursor CLI | Persist **Governance Frame Triad** snapshot + board narrative in Postgres |
| **Primary output** | `docs/qa/complete-feature-glossary.md`, agent-written memos in log | `GovernanceFrameTriadSnapshot`, `CronJobArtifact` rows |
| **Scheduler** | Windows Task Scheduler — `\Ironframe Daily Documentation Engine` | Vercel cron — `30 3 * * *` UTC → `GET/POST /api/cron/narrate` |
| **Entry script** | `scripts\cron_narrate_scheduled.ps1` → `scripts\cron_narrate.ps1` | `app/api/cron/narrate/route.ts` |
| **Optional local wrapper** | *(not registered by default)* `bin\cron_narrate.ps1` | Same API; use for manual smoke on `:3000` |
| **Log file** | `scripts\cron_narrate.log` | Vercel function logs + JSON response body |
| **Needs app running?** | No (Cursor CLI only) | Yes — Core on `:3000` (local) or deployed preview/prod |

---

## 1. Windows Documentation Engine

### Task settings (current baseline)

| Setting | Value |
|---------|--------|
| **Task name** | `\Ironframe Daily Documentation Engine` |
| **Trigger** | Daily **03:00** local (`StartBoundary` 2026-06-10T03:00:00`) |
| **Action** | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Dereck\ironframe-live\scripts\cron_narrate_scheduled.ps1"` |
| **Start in** | `C:\Users\Dereck\ironframe-live` |
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
| **Vercel (production/preview)** | `30 3 * * *` UTC | `/api/cron/narrate` |
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

## 4. Optional: chain both pipelines

To run **doc engine then API narrate** in one nightly window:

1. Keep existing Task Scheduler action on `scripts\cron_narrate_scheduled.ps1`.
2. Append to end of `scripts\cron_narrate.ps1` (after `complete.`):

   ```powershell
   & "$ProjectRoot\bin\cron_narrate.ps1"
   ```

3. Ensure Core is running as a Windows Service or scheduled **before** 03:30 if you need same-night snapshots.

---

*Last aligned to repo: Epic 16 `/api/cron/narrate`, Windows task `\Ironframe Daily Documentation Engine`, branch `feature/epic17-commercial-plumbing`.*
