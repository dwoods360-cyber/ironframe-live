# Quick-Start Activation & Onboarding Guide (Level 1)

**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17 · **Mode:** Sales-assisted invite only

**Design partners:** start with the [Design Partner Operator Packet](./design-partner-operator-packet.md). This guide adds Day-0 layout and legal sign-off detail.

---

## 1. Workspace activation (invite-only)

Ironframe blocks public self-registration. You join by **invite only** from sales or delivery.

1. Open the invite email and follow the link to **`/register/{token}`**.
2. Set your password and finish credential setup.
3. Sign in at **`https://{your-slug}.ironframegrc.com/login`** (use the slug in your invite).
4. If you see a billing hold with status **PENDING**, complete **Path B Stripe Checkout**, then refresh until status is **ACTIVE**.

Longer Day 0–3 checklist: [`end-users/onboarding.md`](../end-users/onboarding.md).

**Note:** Seed names (`medshield`, `vaultbank`, `gridcore`) are for engineers only. Your design-partner slug is the workspace you operate.

---

## 2. Completing the legal agreement sign-off

Before you see sensitive business metrics, accept the legal terms.

1. On first login, you land on the **Legal Terms Portal** (MSA and DPA).
2. Read how your data stays apart from other companies.
3. Type your **full legal name** and click **Accept Agreements**. The system stores a permanent audit entry.

---

## 3. Get Started workspace setup (required)

Open **`/get-started`** after legal acceptance:

1. Save your **Workspace ALE baseline** (USD).
2. Save your **primary GRC company** profile.
3. Complete the orientation checklist (Integrity Hub → partner training → exports).

Detail: [Get Started workspace setup](./get-started-workspace-setup.md).

Until ALE and company profile are saved, exports may show a setup banner instead of downloads.

---

## 4. Basic interface navigation

After sign-in, you enter the **Command Post**. Use **Tab** to move between controls. Charts include text summaries for screen readers.

```text
====================================================================================
 [Top Bar]  Dashboard  |  Integrity Hub  |  Evidence Locker  |  Exports  |  Docs
====================================================================================
 [Active workspace]  Currently displaying: (your assigned tenant slug)
------------------------------------------------------------------------------------
  FINANCIAL POSTURE (ALE baseline)            HAZARD PIPELINE (live risks)
  - Your workspace ALE (from Get Started)     - Active threats
  - Integrity Hub protection scores           - Intake vs confirmed
------------------------------------------------------------------------------------
 [Accessibility: Tab to navigate. All charts have text summaries.]
====================================================================================
```

**Alt-text (wireframe):** Top navigation with Integrity Hub, Evidence, Exports, and Docs; money posture on the left; hazard list on the right; active tenant name for the signed-in workspace.

---

## Primary control areas

| Area | What it does |
|------|----------------|
| **Get Started** | ALE baseline, GRC company profile, orientation checklist |
| **Integrity Hub** | Financial risk scores and protection status |
| **Workforce Cockpit** | Safety sweeps and agent activity |
| **Evidence Locker** | Locked compliance documents (cannot delete after seal) |
| **Exports** | Tenant CSV/PDF downloads at `/exports` |
| **Documentation** | In-app Level 1 manuals |
| **Settings** | Contacts and tenant settings |

Nav items marked **PILOT** or **PREVIEW** are not full deliverables. See [pilot vs preview](./pilot-vs-preview.md).

---

## Billing hold

| Situation | What to do |
|-----------|------------|
| First-time **PENDING** | Complete Path B Stripe Checkout from Get Started or the hold panel |
| Payment failed / past due | Use **Update Payment Method** on the billing hold screen |
| Still stuck | Email delivery@ironframegrc.com with your tenant slug |

---

## Related documents

- [Design Partner Operator Packet](./design-partner-operator-packet.md)
- [Get Started workspace setup](./get-started-workspace-setup.md)
- [Dashboard guide](./dashboard-guide.md)
- [Audit exports](./audit-exports.md)
- [Glossary](./glossary.md)
- [Onboarding checklist](../end-users/onboarding.md)
