# Perimeter Workers — Cloud Run Deploy

Deploys isolated poll workers (:8082–:8086) as separate Cloud Run services. The control plane (`sovereign-sentinel` on :3000) probes them via `OPERATIONS_*_URL` secrets.

## Services

| Worker | Cloud Run service | Local port |
|--------|-------------------|------------|
| Ironboard | `ironframe-ironboard` | 8082 |
| Ironleads | `ironframe-ironleads` | 8083 |
| SalesTeam | `ironframe-salesteam` | 8084 |
| IronSuccessTeam | `ironframe-success-team` | 8085 |
| IronSupportTeam | `ironframe-support-team` | 8086 |

Workflow: `.github/workflows/deploy-perimeter-workers.yml`  
Triggers: push to `main` (worker paths) or **workflow_dispatch** (manual).

## GitHub secrets (required)

### Already on control plane deploy
- `GCP_PROJECT_ID`, `GCP_SA_KEY`
- `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_API_KEY`
- `IRONLEADS_INGRESS_SECRET`, `SALESTEAM_INGRESS_SECRET`, `SUCCESS_TEAM_INGRESS_SECRET`, `SUPPORT_TEAM_INGRESS_SECRET`

### Add for worker fleet

| Secret | Example | Purpose |
|--------|---------|---------|
| `IRONFRAME_CONTROL_PLANE_URL` | `https://www.ironframegrc.com` | Worker `*_INGRESS_BASE_URL` → control plane ingress |
| `OPERATIONS_IRONBOARD_URL` | `https://ironframe-ironboard-….run.app` | Ops Hub health probe |
| `OPERATIONS_IRONLEADS_URL` | `https://ironframe-ironleads-….run.app` | Ops Hub health probe |
| `OPERATIONS_SALESTEAM_URL` | `https://ironframe-salesteam-….run.app` | Ops Hub health probe |
| `OPERATIONS_SUCCESS_TEAM_URL` | `https://ironframe-success-team-….run.app` | Ops Hub health probe |
| `OPERATIONS_SUPPORT_TEAM_URL` | `https://ironframe-support-team-….run.app` | Ops Hub health probe |
| `IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG` | `bwc` | Server-side CRM scope for ops portals |

## First-time bootstrap

1. Run **Perimeter Workers Deploy** workflow (manual dispatch).
2. For each service, copy URL from GCP Console → Cloud Run:
   ```bash
   gcloud run services describe ironframe-ironboard --region=us-central1 --format='value(status.url)'
   ```
3. Set `OPERATIONS_*_URL` secrets in GitHub to those URLs.
4. Re-run **Sovereign Deploy** so control plane picks up worker URLs.

## Local dev (unchanged)

```bash
npm run dev          # :3000 control plane
npm run dev:fleet    # :8082–:8086 workers
```

## Notes

- Workers use SQLite for local poll state; Cloud Run containers are ephemeral — poll checkpoint DBs reset on cold start until persistent storage is added.
- Ironboard requires `DATABASE_URL` / `GOOGLE_API_KEY` on Cloud Run for CRM + Gemini.
- All workers honor Cloud Run `PORT` and bind `0.0.0.0`.
