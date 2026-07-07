# Health Score Framework — Deterministic CS Metrics

**Classification:** `customer-success` · IronSuccessTeam `healthAuditor` node

## Design rule

Health scores are computed with **integer arithmetic only** in the poll worker. LLM nodes may narrate the score; they never calculate it.

## Base formula (0–100)

Starting score: **100**

| Deduction | Rule |
|-----------|------|
| Engagement decay | −10 per 30-day block without CRM interaction (max −40) |
| Critical silence | Additional −20 if last interaction &gt; 60 days |
| Evidence gap | −15 if pilot `lastEvidenceCompletenessPct` &lt; 70 |
| Stalled outcome | −10 if `CLOSED_WON` but no `FIRST_ACTION` milestone in pilot metadata |

## Bonuses (cap total at 100)

| Bonus | Rule |
|-------|------|
| Active pilot | +5 if Gate B passed in last ISO week |
| High value | +5 if `valueCents` ≥ $50,000 annualized equivalent |

## Bands

| Score | Band | Default motion |
|-------|------|----------------|
| 80–100 | Healthy | Expansion finder eligible |
| 60–79 | Watch | Proactive check-in advisory |
| 40–59 | At risk | Retention playbook |
| 0–39 | Critical | Operator escalation draft |

## Beachhead modifiers (expansionFinder input only)

- **HEALTH_HIPAA** — weight evidence completeness higher (−20 instead of −15 below 70%)
- **UTILITY_NERC** — weight config churn signals from board prep widgets
- **REGIONAL_BHC** — weight board-report export cadence
- **MSSP_ENCLAVE** — weight multi-tenant evidence slot coverage
