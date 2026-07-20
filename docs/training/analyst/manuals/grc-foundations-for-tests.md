# GRC foundations for tests (Jr. Analyst)

**Track:** ANALYST · **Reading level:** 11th grade  
**Purpose:** Knowledge you need for Ironframe analyst certification **and** entry-level GRC quizzes (framework names, risk words, control types).  
**This is not** a substitute for CompTIA Security+ or ISACA CISA — it is the shared core those exams assume.

Study this before Analyst Chapters 1–6. Retake the [practice exam](./practice-exam.md) until you score **≥ 80%**.

---

## 1. What GRC means

| Letter | Word | Plain meaning | Example question style |
|--------|------|---------------|------------------------|
| **G** | Governance | Rules, roles, and decisions leaders set | “Who owns the risk acceptance decision?” |
| **R** | Risk | Chance of loss if something bad happens | “What is likelihood × impact used for?” |
| **C** | Compliance | Proof you meet required rules or frameworks | “Which artifact shows control operation?” |

**Remember:** Governance decides; Risk measures; Compliance proves.

---

## 2. CIA triad (almost every GRC test)

| Goal | Meaning | If broken |
|------|---------|-----------|
| **Confidentiality** | Only authorized people see the data | Breach / disclosure |
| **Integrity** | Data stays correct and unaltered | Tampering / wrong ALE |
| **Availability** | Systems work when needed | Outage / ransomware lockout |

Ironframe tie-in: Integrity Hub and WORM evidence protect **integrity** of risk and audit records; tenant isolation protects **confidentiality** between companies.

---

## 3. Risk vocabulary (use these exact ideas)

| Term | Definition |
|------|------------|
| **Asset** | Something valuable (data, system, process, reputation). |
| **Threat** | What might harm the asset (ransomware gang, insider, outage). |
| **Vulnerability** | Weakness that makes harm easier (unpatched server, no MFA). |
| **Likelihood** | How probable the harm is. |
| **Impact** | How bad the harm is (often in dollars or severity). |
| **Risk** | Combination of likelihood and impact (qualitative or quantitative). |
| **Inherent risk** | Risk **before** controls. |
| **Residual risk** | Risk **after** controls. |
| **Risk appetite** | How much risk leaders are willing to accept. |
| **Risk treatment** | What you do: **mitigate**, **transfer**, **avoid**, or **accept**. |

### Quantitative money terms (Ironframe uses these ideas)

| Term | Meaning | Formula (classic) |
|------|---------|-------------------|
| **SLE** | Single Loss Expectancy | Asset value × exposure factor |
| **ARO** | Annual Rate of Occurrence | How many times per year (estimate) |
| **ALE** | Annualized Loss Expectancy | SLE × ARO (yearly dollars at risk) |

In Ironframe you **read ALE as dollars** on Integrity Hub / Get Started. Storage uses whole **cents** — never invent floating-point money in notes.

---

## 4. Control types (test favorites)

| Type | When it acts | Example |
|------|--------------|---------|
| **Preventive** | Stops the event | MFA, allow-list, tenant isolation |
| **Detective** | Finds the event | Logs, alerts, hazard pipeline |
| **Corrective** | Fixes after the event | Incident response, restore backup |
| **Directive** | Tells people what to do | Policy, standard, training |
| **Deterrent** | Discourages attack | Warning banners, cameras |
| **Compensating** | Alternate control when primary is hard | Extra monitoring if patch delayed |

**Administrative / technical / physical:** policy training (admin), encryption (technical), badge door (physical).

---

## 5. Evidence and audit basics

Auditors ask: **Is the control designed well?** and **Did it operate over time?**

| Evidence idea | Plain meaning |
|---------------|---------------|
| **Policy** | Written rule |
| **Procedure** | How people do the rule |
| **Artifact** | Screenshot, export, ticket, log, sealed vault record |
| **Population** | Full set of items in scope |
| **Sample** | Subset the auditor tests |
| **Exception** | Case that failed the control |
| **WORM / immutable** | Sealed record cannot be quietly deleted (Ironframe Evidence Vault) |

Never offer PILOT/demo screens as auditor evidence for a live company.

---

## 6. Roles you will see in questions

| Role | Focus |
|------|--------|
| **Control owner** | Makes sure the control runs |
| **Risk owner** | Accepts or escalates residual risk |
| **Auditor** | Independent tester of design/operation |
| **CISO / GRC manager** | Program oversight |
| **System owner** | Owns the asset or application |

---

## Self-check (write answers in your journal)

1. Define G, R, and C in one sentence each.  
2. Name the CIA triad.  
3. Inherent vs residual risk — one example.  
4. Four risk treatment options.  
5. Preventive vs detective control — one example each.  
6. ALE in words (not a formula dump).  
7. Why WORM matters to an auditor.

When done, open [frameworks-map.md](./frameworks-map.md).
