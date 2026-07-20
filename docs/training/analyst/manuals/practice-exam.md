# Jr. GRC Analyst — practice exam (industry-aligned)

**Track:** ANALYST · **Reading level:** 11th grade  
**Pass mark:** **≥ 32 / 40 (80%)** · **Timebox:** 45 minutes  
**Grading:** [practice-exam-ANSWER-KEY.md](./practice-exam-ANSWER-KEY.md) (trainer)

### Industry alignment (what this exam is built for)

Topics match **entry GRC analyst interview / screening** patterns and fundamentals also seen in CompTIA Security+–style GRC questions — not a full Security+ or CISA substitute.

**SOC items on this exam** test whether you can *recognize* attestations as an analyst (e.g. reading a vendor’s Type II). They do **not** mean Ironframe issues SOC reports. Ironframe ≠ SOC audit firm. SOC is **not** part of Governance Frame (GFP) exams.

| Domain | Industry ask | Items |
|--------|--------------|-------|
| A | CIA, governance vs risk vs compliance, control types | 1–8 |
| B | Risk assessment process, inherent/residual, treatment, ALE | 9–16 |
| C | SOC 2 / ISO 27001 / NIST CSF, Type I vs II, control mapping | 17–26 |
| D | Evidence, audit period, vendor risk, shared responsibility | 27–34 |
| E | Apply concepts in Ironframe Core (job tool literacy) | 35–40 |

**Rules:** Closed-book first attempt. Restudy manuals for missed domains, then retake.

---

### Section A — Foundations employers expect (1–8)

**1.** In GRC, “Governance” primarily means:  
A) Running vulnerability scans only · B) Leadership rules, roles, and decisions that set direction · C) Buying cyber insurance · D) Writing SQL  

**2.** Which CIA triad goal is broken if an attacker alters invoice amounts in a database?  
A) Confidentiality · B) Integrity · C) Availability · D) Non-repudiation only  

**3.** Which CIA goal is broken if ransomware encrypts files so users cannot work?  
A) Confidentiality · B) Integrity · C) Availability · D) Governance  

**4.** A security **policy** vs a **procedure**:  
A) Same thing · B) Policy = what must be true; procedure = how people do it · C) Procedure replaces law · D) Policy is only for auditors  

**5.** MFA at login is best classified as:  
A) Preventive technical control · B) Corrective physical control · C) Risk acceptance · D) Risk transfer  

**6.** SIEM alerts / a hazard pipeline are best classified as:  
A) Preventive · B) Detective · C) Avoidance · D) Insurance  

**7.** Restoring from backup after an incident is best classified as:  
A) Preventive · B) Detective · C) Corrective · D) Directive only  

**8.** Documented risk acceptance requires at least:  
A) A meme · B) Authorized owner + residual risk acknowledged · C) Deleting logs · D) Marketing approval  

---

### Section B — Risk assessment (interview staple) (9–16)

**9.** A sensible risk assessment order is:  
A) Buy tools → skip assets · B) Identify assets → threats/vulns → likelihood/impact → treat → document · C) Accept all risk first · D) Only interview vendors  

**10.** Inherent risk is:  
A) Risk after controls · B) Risk before controls · C) Always zero · D) The audit fee  

**11.** Residual risk is:  
A) Risk before controls · B) Risk remaining after controls · C) Always equal to ALE · D) Impossible  

**12.** The four classic risk treatment options are:  
A) Scan, patch, reboot, ignore · B) Mitigate, transfer, avoid, accept · C) SOC, ISO, NIST, PCI · D) Inquire, observe, inspect, guess  

**13.** ALE best answers which board question?  
A) “What color is the logo?” · B) “About how much money might we lose per year from this scenario?” · C) “Who is the CEO’s favorite vendor?” · D) “What is our font?”  

**14.** Classic ALE =  
A) SLE − ARO · B) SLE × ARO · C) SLE ÷ ARO · D) ARO²  

**15.** SLE = $40,000 and ARO = 0.25. ALE =  
A) $10,000 · B) $40,250 · C) $160,000 · D) $39,750  

**16.** Buying cyber insurance is usually:  
A) Avoid · B) Mitigate · C) Transfer · D) Detect  

---

### Section C — Frameworks & mapping (17–26)

**17.** SOC 2 is best described as:  
A) An EU privacy regulation · B) An AICPA attestation against Trust Services Criteria · C) A DoD CMMC level · D) A payment brand rulebook only  

**18.** SOC 2 **Type I** vs **Type II**:  
A) Type I = period operating effectiveness; Type II = point in time · B) Type I = design at a point in time; Type II = design + operating effectiveness over a period · C) They are identical · D) Type II is only for healthcare  

**19.** ISO 27001 is best described as:  
A) A card-data standard only · B) A certifiable information security **management system** standard · C) A US health privacy law · D) A browser cookie  

**20.** NIST CSF core functions are Identify, Protect, Detect, Respond, and:  
A) Report · B) Recover · C) Replace · D) Retire  

**21.** “Control mapping” / common-control thinking means:  
A) Drawing office floor plans · B) Linking one internal control to multiple framework requirements (e.g. MFA → SOC 2 + NIST + ISO) · C) Mapping only to marketing pages · D) Avoiding frameworks  

**22.** MFA most directly supports which NIST CSF function?  
A) Recover only · B) Protect (access control) · C) Monetize · D) Advertise  

**23.** HIPAA primarily addresses:  
A) EU personal data for all sectors · B) US health information privacy/security · C) PCI pin pads only · D) Student lab badges  

**24.** GDPR primarily addresses:  
A) US DoD CUI · B) Protection of personal data (EU regime) · C) Retail coupons · D) SOC auditors’ fonts  

**25.** A SOC 2 report a **customer** reviews for a SaaS vendor is mainly used for:  
A) Decorating slides · B) Vendor / third-party risk due diligence · C) Replacing your own access control · D) Setting design-partner price  

**26.** Claiming “we are SOC 2 Type II certified” without a report is:  
A) Fine if Sales agrees · B) Misleading / not acceptable · C) Required in training · D) The same as ISO 27001  

---

### Section D — Evidence, audit & vendor risk (27–34)

**27.** Operating effectiveness asks:  
A) Did the control operate as intended over the period? · B) Is the logo approved? · C) Is ALE exactly $0? · D) Did marketing post?  

**28.** Design effectiveness asks:  
A) Was the control capable of meeting its objective if operated as designed? · B) Was the office painted? · C) Was the vendor cheap? · D) Was ALE invented?  

**29.** Which evidence is usually strongest for “access removed when employee left”?  
A) Undated verbal claim · B) Ticket + IAM log with timestamps · C) A stock photo · D) A PILOT demo screen  

**30.** Shared responsibility (cloud) means:  
A) The cloud provider owns 100% of customer access reviews · B) Provider and customer each own defined control layers; customer still owns their configurations/identity · C) No one owns risk · D) Auditors own production keys  

**31.** Reviewing a vendor’s SOC 2 Type II helps you:  
A) Inherit every control automatically with zero residual risk · B) Evaluate provider controls and still track customer-owned gaps · C) Skip MFA · D) Delete your risk register  

**32.** An audit **exception** write-up should include:  
A) Only a smiley · B) Control, what failed, impact, owner, remediation · C) ALE formula only · D) A free-trial CTA  

**33.** Point-in-time evidence alone is weakest for proving:  
A) Logo color · B) Operating effectiveness across a multi-month period · C) Company name · D) File size  

**34.** Using another customer’s data to “help” an audit pack violates:  
A) Only fashion rules · B) Tenant isolation / confidentiality expectations · C) Font licensing only · D) ALE math  

---

### Section E — Tool literacy (Ironframe Core) (35–40)

**35.** Best Core surface to see live hazards / ALE posture:  
A) `/pricing` · B) `/integrity` · C) Ops Hub Approvals · D) Public blog only  

**36.** Best Core surface for sealed audit artifacts:  
A) `/evidence` · B) PILOT vendors · C) `/register/contact` · D) SalesTeam poll  

**37.** Best Core surface for tenant auditor CSV/PDF packs:  
A) `/exports` · B) Random screenshot of `/pricing` · C) GTM LIVE mic · D) Seed slug as customer case study  

**38.** Money discipline in modern GRC platforms (including Ironframe):  
A) Invent industry averages · B) Prefer exact cents in systems; report clear dollars to humans · C) Use floats freely in ledgers · D) Hide residual risk always  

**39.** A junior board note should emphasize:  
A) Free PoC offers · B) Hazard, evidence status, residual risk, owner, next step · C) Seed tenants as customers · D) Cold DISPATCH counts  

**40.** Passing this Analyst gate proves:  
A) Full CISA equivalence · B) Entry GRC knowledge + ability to practice the workflow in Ironframe · C) Authority to publish Governance Frame research · D) Unsupervised production promote rights  

---

## Score

Correct: ____ / 40 · Percent: ____% · Pass (≥80%): ☐ Yes · ☐ No · Retake: ________
