# Evidence & audit readiness for tests (Jr. Analyst)

**Track:** ANALYST · **Reading level:** 11th grade  
**Pairs with:** Analyst Ch.2–3 labs (`/evidence`, `/exports`)

---

## What auditors test

| Question | Plain meaning |
|----------|---------------|
| **Design effectiveness** | Is the control capable of preventing/detecting the risk if operated as designed? |
| **Operating effectiveness** | Did the control actually run over the period (samples, timestamps, logs)? |

A pretty policy with no artifacts fails operating effectiveness.

---

## Evidence quality checklist

Good evidence is:

1. **Relevant** — matches the control  
2. **Reliable** — trustworthy source/system  
3. **Sufficient** — enough for the period/sample  
4. **Clear** — who/what/when  
5. **Tenant-correct** — right company (isolation)  

Ironframe helps with sealed vault records (**WORM**) and tenant-scoped **`/exports`**.

---

## Evidence types (name them on tests)

| Type | Examples |
|------|----------|
| **Inquiry** | Interview / questionnaire |
| **Observation** | Watch the control performed |
| **Inspection** | Read configs, policies, tickets |
| **Re-performance** | Auditor repeats the control |
| **Confirmation** | Third-party confirm |

Screenshots and CSV exports are usually **inspection** artifacts.

---

## Period vs point-in-time

| Idea | Meaning |
|------|---------|
| **Point in time** | True on the audit date (Type I style thinking) |
| **Period of time** | True across months (Type II / operating effectiveness) |

Type I/II wording is **industry literacy** (how auditors talk about design vs operating effectiveness). Ironframe does **not** issue SOC reports. SOC 2 Type II language is about operation over a period — you do not need full SOC theory yet, but know **period evidence** beats a single undated screenshot.

---

## Vendor risk & shared responsibility (industry staple)

| Idea | What analysts do |
|------|------------------|
| **Vendor SOC 2 review** | Read the Type II for a SaaS/cloud vendor; note exceptions |
| **Shared responsibility** | Provider owns some layers; **you** still own identity, config, data classification |
| **Inherited controls** | Rely on provider attestations for their scope — still track your residual gaps |
| **Vendor tiering** | Higher scrutiny when vendor sees sensitive data or is business-critical |

Classroom tie-in: never use another tenant’s export to “help” your pack — that breaks confidentiality / isolation.

---

## Finding / exception language

When something fails:

1. State the **control**  
2. State the **exception** (what failed)  
3. State **impact**  
4. State **remediation** and owner  
5. Retest later  

Your board note (Analyst Ch.4) should sound like this — calm and factual.

---

## Ironframe do / don’t

| Do | Don’t |
|----|-------|
| Use `/evidence` sealed items | Delete sealed WORM records |
| Use `/exports` for auditor packs | Use PILOT vendor CSV as production proof |
| Label seed tenants as training | Call Medshield a “customer case study” |
| Keep journal: route · time · tenant | Paste secrets into homework |

---

## Self-check

1. Design vs operating effectiveness — one sentence each.  
2. Why WORM helps an auditor.  
3. Name three evidence types.  
4. Why tenant isolation matters for exports.  

Next: take [practice-exam.md](./practice-exam.md).
