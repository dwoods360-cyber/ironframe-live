# Onboarding — Ironframe design partner (Day 0–3)

**Audience:** Design-partner operators and tenant admins. **Reading level:** 11th grade. **Milestone:** v0.1.0-ga-epic17.  
**Canonical packet:** [Design Partner Operator Packet](../user-manuals/design-partner-operator-packet.md)

This is your first-session checklist. Ironframe uses sales-assisted invites only. Public signup is off.

---

## Day 0 — Access

1. Open the Ironframe invite email. Do not use a generic marketing signup.
2. Open `/register/{token}` from the invite and set your password.
3. Confirm your workspace URL is `https://{your-slug}.ironframegrc.com`.
4. Sign in at `/login` on that host.
5. Accept the MSA and DPA. Type your full legal name.
6. If billing shows PENDING, complete Path B Stripe Checkout from Get Started or the hold panel.
7. Confirm billing status is ACTIVE before you rely on training unlock.

---

## Day 1 — Workspace setup (20 minutes)

1. Open `/get-started`.
2. Save your Workspace ALE baseline. Enter USD. The system stores whole cents.
3. Save your primary GRC company profile. Include name and sector.
4. Complete the Get Started checklist.
5. Open `/integrity`. Confirm your ALE shows for your slug only.
6. Skim [pilot vs preview](../user-manuals/pilot-vs-preview.md). Do not treat PILOT items as live data.

Do not switch into medshield, vaultbank, or gridcore. Those are engineering demo seeds.

---

## Day 2 — Core cockpit loop (30 minutes)

1. Open Integrity Hub. Review protection and hazard posture.
2. Open `/cockpit`. Compare intake threats with confirmed threats.
3. Open `/evidence`. Note the WORM seal on locked records.
4. Open `/exports`. Download CSV or PDF for your tenant after ACTIVE billing and ALE gates.

---

## Day 3 — Extra context (optional)

1. Read the [Design Partner Operator Packet](../user-manuals/design-partner-operator-packet.md) end to end.
2. Review your ALE baseline with your sponsor.
3. Open the [Partner training index](../training/LEVEL1-PARTNER-INDEX.md) if you want optional labs.

---

## Role-specific focus after Day 2

| Role | Focus |
|------|--------|
| **CISO** | Cockpit hazards. Quarantine. Live threat flow. |
| **CFO / risk** | ALE dollars. Integrity Hub. Board export story. |
| **GRC** | Evidence Locker. Analyst exports. In-tenant framework maps. |
| **Auditor (guest)** | `/exports` files and sealed Evidence entries only. |

---

## Success criteria

You are onboarded when you can do all of these:

1. Sign in on your tenant host with no demo-tenant switching.
2. State your workspace ALE in dollars.
3. Export an audit CSV or PDF from `/exports`.
4. Tell PILOT seed screens apart from live Integrity, Evidence, and Exports.
5. Escalate invite or billing issues to delivery@ironframegrc.com.

---

## Related documents

- [Quick-Start](../user-manuals/quickstart.md)
- [Get Started workspace setup](../user-manuals/get-started-workspace-setup.md)
- [Audit exports](../user-manuals/audit-exports.md)
- [FAQ](./faq.md)
