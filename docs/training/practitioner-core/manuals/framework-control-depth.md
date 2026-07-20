# Framework & control depth (Platform Practitioner)

**Track:** PRACTITIONER_CORE · **Reading level:** 11th–12th grade  
**Prerequisite:** Analyst manuals + practice exam ≥ 80%  
**Purpose:** Extra depth so Practitioner certification is more than UI tourism — enough to pass harder GRC control/audit questions.

---

## 1. Control families you must explain

For any on-screen control on `/audit` or in a handbook, be ready to answer:

1. **What risk** does it reduce?  
2. **Preventive / detective / corrective?**  
3. **Which framework idea** (SOC 2 criterion, NIST CSF function, ISO Annex theme)?  
4. **What evidence** proves operation?  
5. **Who owns** it?

Use that five-question drill in Chapter 1 lab.

---

## 2. SOC 2 Type I vs Type II (test staple)

**Boundary:** Industry literacy for interviews and vendor-risk reviews. Ironframe is a **GRC platform**, not a SOC audit firm, and does **not** issue Type I/II reports.

| | Type I | Type II |
|---|--------|---------|
| Focus | Design at a point in time | Design + operating effectiveness over a period |
| Evidence | Policies/config as of date | Samples across months |
| Wrong claim | “Type II” from one screenshot | — |

---

## 3. ISO 27001 PDCA (management system)

| Step | Meaning |
|------|---------|
| **Plan** | Scope, risk assessment, Statement of Applicability |
| **Do** | Implement controls |
| **Check** | Internal audit, metrics |
| **Act** | Correct and improve |

Ironframe evidence/exports support **Check**; ALE/risk views support **Plan**.

---

## 4. Sampling ideas (auditor language)

| Term | Meaning |
|------|---------|
| **Population** | All items in scope (all users, all changes) |
| **Sample** | Items tested |
| **Attribute sampling** | Yes/no control operated |
| **Exception** | Failed item |

You will not run statistical samples in class — you must **define** them correctly on tests.

---

## 5. Change / access / logging triad

Most GRC exams hammer:

- **Access control** (joiner/mover/leaver, least privilege, MFA)  
- **Change management** (approve → implement → verify)  
- **Logging & monitoring** (detect, retain, review)

Map Ironframe: login/RBAC · sealed evidence · hazard/cockpit detection · exports for review.

---

## 5b. Crosswalk, vendors, shared responsibility (interview favorites)

| Topic | What to say in one breath |
|-------|---------------------------|
| **Common control** | One MFA standard maps to SOC 2 + NIST + ISO themes |
| **Vendor SOC 2** | Read Type II; note exceptions; still own customer controls |
| **Shared responsibility** | Cloud provider ≠ your IAM/config ownership |
| **Finding response** | Remediation, owner, date — not blame-only |

---

## 6. Money integrity as a compliance topic

Boards and auditors distrust rounded fantasy risk numbers.

| Rule | Why |
|------|-----|
| Whole cents in systems | No float drift |
| Dollars in human reports | Readable |
| No invented industry averages | Misstatement risk |
| Label training fixtures | Avoid false attestation |

Practitioner Ch.3 drills this.

---

## Self-check

1. Type I vs Type II — one sentence each.  
2. PDCA — expand each letter.  
3. Five questions for every control (section 1).  
4. Name the access/change/logging triad.

Then take [practice-exam.md](./practice-exam.md).
