# Onboarding — Ironframe Command Center

Guided first session for new operators and tenant admins.

## Day 0 — Access

- [ ] Receive Supabase invite or credentials from admin
- [ ] Confirm your provisioned workspace URL with your sponsor
- [ ] Verify environment access if you are an operator (not required for end-users)

## Day 1 — First login (15 minutes)

1. **Sign in** using the Login screen from your invitation
2. **Select tenant** in switcher (start with your assigned profile—e.g. Vaultbank)
3. **Wait for handshake** — shadow/sim modes may auto-verify; production shows idle → verified after scope binds
4. **Scan dashboard** — heat map, Active Risks count, Sustainability Pulse widget
5. **Open Audit Intelligence** — confirm ledger entries load

## Day 2 — Core workflows (30 minutes)

- [ ] Open one **Active Risk** — review score, assignee, controls
- [ ] View **Threat Pipeline** — understand intake vs confirmed
- [ ] Check **Carbon Pulse** — note zone (e.g. US-NY for Vaultbank, US-CO for Gridcore)
- [ ] Open **Dashboard → Exports** — download sample CSV (tenant-scoped)

## Day 3 — Governance context (optional)

- [ ] Read [Product Overview](../external/product-overview.md) (10 min)
- [ ] Review tenant ALE baseline with your sponsor
- [ ] Identify your **Irontally** framework mapping (SOC 2, NIST, etc.) in GRC views

## Role-specific paths

| Role | Focus after Day 2 |
|------|-------------------|
| **CISO** | Ironwatch layout signal, quarantine, threat realtime |
| **CFO** | Insurance posture, ALE exposure by asset, governance dividend |
| **GRC** | Compliance drift, Irontally, analyst exports |
| **ESG** | Ironbloom physical units, dirty grid, resilience streak |
| **Simulation / QA** | Kimbot (Bot B — Red Team Adversary Simulation for drills), Attbot, GRCbot in Control Room shadow plane |

## Administrator checklist

- [ ] Provision Supabase users
- [ ] Configure deployment environment per [Technical Requirements](../stakeholders/technical-requirements.md)
- [ ] Enable sustainability fallback on staging if no Electricity Maps key
- [ ] Run post-deploy smoke verification against your target environment
- [ ] Seed tenants if fresh DB: `npm run db:seed`

## Success criteria

You are onboarded when you can:

1. Switch tenants without blank dashboard panels
2. Explain one Active Risk’s financial score in dollars (from cents)
3. Export an audit CSV for your tenant
4. Know who to escalate to for Ironwatch stale-data mode

## Related documents

- [User Guide](./user-guide.md)
- [FAQ](./faq.md)
