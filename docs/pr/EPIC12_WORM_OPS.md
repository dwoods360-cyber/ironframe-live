# Epic 12 — WORM evidence storage (ops)

Application-layer WORM enforcement lives in `app/lib/evidence/wormStoragePolicy.ts`. Cloud buckets must mirror the same immutability contract.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `EVIDENCE_STORAGE_BUCKET` | `evidence-locker` | Primary Supabase bucket for forensic uploads (`worm/<tenant>/…`) |
| `EVIDENCE_WORM_BUCKET` | `<EVIDENCE_STORAGE_BUCKET>-worm` | Optional dedicated WORM bucket (reserved for future split) |
| `INCIDENT_REPORTS_BUCKET` | same as evidence bucket | Post-mortem PDFs under `incident-reports/<tenant>/…` |
| `EVIDENCE_WORM_OBJECT_LOCK` | enabled (set `false` to disable app guard) | Fail-closed delete/overwrite checks in shredder and storage helpers |

## Protected path prefixes

Deletes and shredder expunge are blocked when the stored reference matches:

- `worm/` (Supabase object prefix)
- `incident-reports/`
- `uploads/evidence/` (local Ironbloom / evidence locker)
- `storage/worm/` (local post-mortem mirror)

## Supabase Storage (recommended)

1. Create bucket `evidence-locker` (or your `EVIDENCE_STORAGE_BUCKET` value).
2. Enable **Object versioning** and **Object lock** (Compliance mode) on the bucket if your Supabase project tier supports it; otherwise use RLS policies that deny `DELETE` and deny `UPDATE` on existing objects.
3. RLS policy sketch: allow `INSERT` for service role only; deny `DELETE` on all objects; allow `SELECT` for authenticated tenant-scoped reads.
4. Uploads from the app use `upsert: false` and immutable cache headers — duplicate object keys return an error instead of overwriting.

## AWS S3 (alternate)

If evidence is mirrored to S3 (`AWS_EVIDENCE_PREFIX`):

1. Enable **Bucket Versioning**.
2. Apply a **Object Lock** retention policy (Compliance mode) on `ironframe/evidence/` and `ironframe/incident-reports/` prefixes.
3. Deny `s3:DeleteObject` and `s3:PutObject` with overwrite semantics for locked prefixes via bucket policy.

## Verification

```bash
npm run test:integration:epic12
```

Expect attestation guard tests plus WORM path delete blocks (6 tests total with `wormStoragePolicy` unit suite).
