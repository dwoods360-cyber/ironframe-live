# Dashboard Navigation & Core Feature Guide (Level 1)

**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17

This manual explains daily compliance operations: financial protection scores, sustainability logging, and a real audit scenario.

---

## 1. Integrity Hub and financial baselines

The **Integrity Hub** turns security issues into plain business numbers using **Annualized Loss Expectancy (ALE)** — the estimated dollar loss in one year if a vulnerability is exploited.

Ironframe stores money as **exact whole pennies** (BigInt cents) so totals never drift:

| Tenant | Target protection (USD) | Internal baseline (cents) |
|--------|-------------------------|---------------------------|
| Medshield | $11,100,000.00 | `1110000000` |
| Vaultbank | $5,900,000.00 | `590000000` |
| Gridcore | $4,700,000.00 | `470000000` |

### Labels you will see on screen

| Element | Exact label |
|---------|-------------|
| Agent monitor | **AGENT STATUS PULSE** |
| Nav chip | **INTEGRITY HUB** |
| Emergency control | **FREEZE COMMAND POST** |
| Insurance export | **Export Tabular Ledger Data (CSV)** |

**Daily goal:** Keep the **hazard pipeline** at zero active threats. When a hazard appears, your protection score updates automatically.

**Design partners:** Your ALE comes from the value you saved on `/get-started`, not from the seed-tenant table above. Seed rows are reference examples for training screenshots.

### Pilot vs preview nav items

Links marked **PILOT** or **PREVIEW** are not contracted auditor deliverables. PILOT vendor screens use seed demonstration data. Use `/integrity`, `/evidence`, and `/exports` for live workspace work — details in [pilot vs preview](./pilot-vs-preview.md).

---

## 2. Logging energy data (Ironbloom)

The **Ironbloom** module records physical utility use for carbon tracking during environmental audits.

1. Open the **Ironbloom Sustainability** panel from the Integrity Hub area.
2. Select your operational location node.
3. Type physical consumption with a **unit label** — for example `1500 kWh` or `450 L`. Entries with only dollar amounts or bare numbers are rejected.
4. Click **Verify and Sync Ledger** (or **Verify and Log Metrics**). The system matches regional grid data and refreshes your charts.

**Valid units:** kWh (electricity), L (liters), km (distance).

---

## 3. Real-world scenario: passing an audit with pilot-corp

**Problem:** An auditor needs proof that `pilot-corp` reviewed defense metrics on June 17, 2026, with no tampering.

**Solution:**

1. The compliance manager opens the **Evidence Locker**.
2. WORM rules mean each sealed report is **write-once** — no user can edit or delete it after attestation.
3. Export auditor proof from **`/exports`** (CSV/PDF) and keep sealed Evidence Locker records as supporting WORM artifacts.

---

## Frequently asked questions

**Why do I see "Billing Hold"?**  
Monthly payment did not process. Use **Update Payment Method** on that screen or contact delivery@ironframegrc.com.

**Can someone delete our Evidence Locker files?**  
No. WORM storage prevents modification after seal — protecting you during active audits.

**What is pilot-corp?**  
The Stripe design-partner tenant for sales-assisted pilots; same billing and access rules as seed tenants.

---

## Related documents

- `user-manuals/quickstart.md`
- `user-manuals/glossary.md`
- `end-users/faq.md`
