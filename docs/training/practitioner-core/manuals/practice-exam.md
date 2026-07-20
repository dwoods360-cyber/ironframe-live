# Platform Practitioner Core — practice exam (industry-aligned)

**Pass mark:** **≥ 24 / 30 (80%)** · **Timebox:** 35 minutes  
**Prerequisite:** Analyst practice exam ≥ 80%  
**Key:** [practice-exam-ANSWER-KEY.md](./practice-exam-ANSWER-KEY.md)

### Industry alignment

Harder **GRC analyst / junior auditor support** topics used in interviews and Security+/ISO-awareness screens. Ironframe items test whether you can operate a real GRC platform without inventing evidence.

**SOC / ISO items** = industry literacy (vendor reports, crosswalks). Ironframe does **not** issue SOC attestations. Do not confuse this exam with [Governance Frame GFP](../../governance-frame/README.md) (research/editorial only).

| Domain | Industry ask | Items |
|--------|--------------|-------|
| A | SOC 2 Type I/II, ISO PDCA/SoA, continuous vs point-in-time | 1–6 |
| B | Access lifecycle, SoD, change mgmt, logging | 7–12 |
| C | Control crosswalk, inherited/shared controls, vendor risk | 13–18 |
| D | Findings, sampling, evidence quality | 19–24 |
| E | Platform / Ironframe practitioner judgment | 25–30 |

---

### Section A — Attestation & management systems (1–6)

**1.** SOC 2 Type II primarily evaluates:  
A) Logo fonts · B) Operating effectiveness of controls over a defined period · C) Only a single snapshot with no period testing · D) Payment card brand fees  

**2.** A customer asks a **SaaS vendor** for “your SOC 2.” The useful artifact is usually:  
A) A blog post · B) The Type II report (and bridge letter if applicable) · C) A design-partner price quote · D) A PILOT screenshot  

**3.** ISO 27001 PDCA “Plan” includes:  
A) Ignoring risk · B) Scope, risk assessment, Statement of Applicability thinking · C) Deleting logs · D) Cold outreach  

**4.** Statement of Applicability (SoA) is associated with:  
A) PCI brand logos only · B) ISO 27001-style ISMS control selection/justification · C) Browser cookies · D) SMS DISPATCH  

**5.** Continuous control monitoring differs from annual audit alone because it:  
A) Removes all residual risk · B) Seeks ongoing signals that controls still operate · C) Replaces frameworks · D) Bans qualitative risk  

**6.** Trust Services Criteria “Availability” is closest to which CIA goal?  
A) Confidentiality · B) Integrity · C) Availability · D) Governance  

---

### Section B — Access, change, logging (7–12)

**7.** Least privilege means:  
A) Everyone is domain admin · B) Users receive only access required for their role · C) Shared root passwords · D) No joiner process  

**8.** Joiner–mover–leaver (JML) mainly reduces risk of:  
A) Pretty dashboards · B) Orphaned / excessive access after role changes · C) ALE formulas · D) Font licensing  

**9.** Separation of duties (SoD) / dual control reduces:  
A) Availability always to zero · B) Fraud or error from one person acting alone end-to-end · C) Screenshot size · D) Vendor questionnaires  

**10.** A basic change-management flow is:  
A) Deploy to prod → hope · B) Request → approve → implement → verify · C) Delete audit logs first · D) Skip testing always  

**11.** Logging & monitoring primarily support which NIST CSF function?  
A) Detect (and support Respond) · B) Monetize · C) Advertise · D) Retire  

**12.** Encryption of sensitive data at rest most directly supports:  
A) Confidentiality · B) Only Recover · C) Only marketing · D) Only ARO  

---

### Section C — Crosswalks, cloud, vendors (13–18)

**13.** One MFA control mapped to SOC 2 CC6.x, NIST PR.AC, and ISO access themes is an example of:  
A) Risk avoidance · B) Control crosswalk / common control · C) Risk transfer · D) Sampling  

**14.** In IaaS/SaaS shared responsibility, physical data-center controls are often:  
A) Fully owned by every customer · B) Provider-owned / inherited via provider attestations — customer still owns identity & config · C) Owned by auditors · D) Unnecessary  

**15.** When reviewing a vendor SOC 2 Type II you should still:  
A) Assume zero residual customer risk · B) Track customer-owned controls and exceptions · C) Disable MFA · D) Copy another tenant’s evidence  

**16.** Vendor risk tiering commonly uses:  
A) Only logo color · B) Data sensitivity, access level, business criticality · C) Only employee count · D) Only office snacks  

**17.** FedRAMP is most associated with:  
A) EU cookie banners · B) US federal cloud authorization packages · C) Student Core PILOT badges · D) Retail coupons  

**18.** PCI DSS applies when:  
A) You store any PDF · B) Cardholder data is in scope for payment processing · C) You use email · D) You have a blog  

---

### Section D — Audit practice (19–24)

**19.** Population vs sample:  
A) Identical · B) Population = full set in scope; sample = items tested · C) Sample always 100% · D) Population is executives only  

**20.** Attribute sampling typically answers:  
A) Exact ALE to the penny · B) Whether a control attribute passed/failed on sampled items · C) Brand color · D) ARO only  

**21.** Auditor **re-performance** means:  
A) Asking a question only · B) Auditor repeats the control activity · C) Buying insurance · D) Avoiding the process  

**22.** A management response to a finding should include:  
A) Only blame · B) Remediation plan, owner, and target date · C) A sales CTA · D) Deleting the finding  

**23.** Best evidence that a control operated across Q1–Q2:  
A) One undated screenshot · B) Dated artifacts spanning the period (tickets, logs, samples) · C) A verbal “we do that” · D) A seed-tenant demo  

**24.** Which statement is **false**?  
A) Map controls across frameworks · B) Present demo/seed data as customer production proof · C) Document residual risk · D) Keep sealed evidence trustworthy  

---

### Section E — Practitioner platform judgment (25–30)

**25.** `/audit` meta-panels are for:  
A) Ignoring controls · B) Reviewing in-product control/compliance posture · C) Setting design-partner pricing · D) Sending SMS  

**26.** Prefer tenant-scoped `/exports` or audit-trail outputs over PILOT vendor CSVs because:  
A) PILOT is always production · B) Auditor packs must reflect the real tenant boundary · C) Exports are decorative · D) PILOT has better ALE  

**27.** Whole-cent (integer) money storage reduces:  
A) Tenant isolation needs · B) Float/rounding integrity risk in financial figures · C) Need for MFA · D) Need for SoD  

**28.** Chat/copilot answers are:  
A) Always authoritative ALE · B) Not a substitute for Integrity Hub / documented risk figures · C) Type II reports · D) Shared responsibility contracts  

**29.** Control owner vs risk owner:  
A) Always the same person · B) Control owner runs the control; risk owner is accountable for the risk outcome · C) Neither documents anything · D) Only Sales owns both  

**30.** Passing Practitioner Core cert means:  
A) Full ISO Lead Auditor license · B) Stronger GRC platform + audit-support judgment beyond Analyst · C) Unsupervised GF public promote · D) CISA waiver  

---

Score: ____ / 30 · Pass ≥ 80%: ☐
