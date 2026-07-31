# Workstation handoff — remote Mac sunset (2026-07-29)

**Superseded for Windows bring-up:** use **[Windows workstation migration](./windows-workstation-migration.md)** (bootstrap + Task Scheduler + GTM smoke).

**Context:** Ironframe GTM/ops returns to the **original / Windows Cursor workstation**. Temporary/remote Mac sessions are **not** Ironframe ops hosts after handoff.

## On the original box (required)

```bash
cd <ironframe-live>
git pull origin main
npm install --legacy-peer-deps
# Restore production secrets locally (never committed):
npx vercel login   # if needed
npx vercel link    # if needed
npx vercel env pull .env.production.vercel --environment=production --yes
# Optional: copy into .env.local for local scripts that expect it
```

Confirm these tracked ops maps exist after pull:

| Artifact | Purpose |
|----------|---------|
| `scripts/dev/stripe-catalog-artifact.live.json` | Live Path B product/price/payment links |
| `scripts/dev/stripe-year1-balance-artifact.live.json` | Year-1 balance SKU ($30,001) IDs + payment link |
| `scripts/ops/.state/counsel-packet-google-docs.json` | Counsel packet Google Docs folder/doc IDs |

## What stays off git (must already exist on original, or re-pull)

- `.env.local` / `.env.production.vercel` — API keys (`sk_live_`, Resend, Supabase, PKI, ingress secrets)
- Google OAuth client/token JSON for Docs upload re-runs
- Vercel CLI + GitHub auth sessions

Production itself (Vercel + Stripe live + webhooks) does **not** move with the laptop — only the operator workstation does.

## Post-handoff locks (unchanged)

- Counsel D0 **off** until counsel returns
- Public instant checkout **off**
- Beachhead **D** week-1 Scout; live DISPATCH via Approvals HITL
- Calling card: https://ironframegrc.com/marketing

Companions: [live motion](./design-partner-live-motion-next.md) · [go-live remaining](./production-go-live-remaining.md) · [week-1 scout](../sales/design-partner-week1-mssp-scout-playbook.md)
