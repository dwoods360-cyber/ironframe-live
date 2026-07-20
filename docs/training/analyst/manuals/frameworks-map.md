# Frameworks map for GRC tests (Jr. Analyst)

**Track:** ANALYST · **Reading level:** 11th grade  
**Goal:** Recognize major frameworks, what they are for, and how Ironframe helps **operate** them — not memorize every control ID.

### Ironframe is not a SOC company

SOC 2 (and ISO, NIST, etc.) appear here as **industry literacy** — what GRC analysts must recognize on the job (vendor reports, customer questionnaires, control mapping).  

- Ironframe is a **control-first GRC platform**. It does **not** issue SOC 2 Type I/II reports.  
- Completing Ironframe training is **not** a SOC attestation.  
- Do **not** study SOC inside [Governance Frame Path D](../../governance-frame/README.md) — that path is research/editorial (GFP), not attestation services.

Entry GRC tests and job screens expect you to **name and contrast** these frameworks. Deep control catalogs come later (Practitioner / ISO Lead courses).

---

## Quick contrast table

| Framework / law | What it is | Typical industry | What “good” looks like |
|-----------------|------------|------------------|------------------------|
| **SOC 2** | Attestation on trust service criteria (security, availability, etc.) | SaaS / service orgs | Controls + evidence over a period |
| **ISO 27001** | Management system standard for information security | Global enterprises | ISMS: policies, risk process, continual improvement |
| **NIST CSF** | Flexible cyber framework (Identify→Protect→Detect→Respond→Recover) | US + many others | Functions/categories mapped to your program |
| **NIST 800-53** | Catalog of security/privacy controls | US federal / suppliers | Selected baselines (Low/Mod/High) |
| **HIPAA** | US health privacy/security rules | Healthcare | PHI protected; BAAs; safeguards |
| **PCI DSS** | Cardholder data security standard | Payments | Scoped card data controls |
| **GDPR** | EU personal data regulation | Anyone with EU personal data | Lawful basis, rights, DPIAs |
| **DORA** | EU digital operational resilience (finance) | EU financial entities + ICT | Resilience testing, ICT risk, incident reporting |
| **CMMC** | US DoD supply-chain cyber model | Defense suppliers | Maturity levels for controlled unclassified info |
| **SEC cyber rules** | US public company disclosure | Public companies | Material incident disclosure timelines |

**Test tip:** SOC 2 = *attestation report*; ISO 27001 = *certifiable management system*; NIST CSF = *framework to organize*; laws (HIPAA/GDPR/DORA) = *legal duties*.

### SOC 2 Type I vs Type II (interview staple)

| | Type I | Type II |
|---|--------|---------|
| Focus | Control **design** at a point in time | Design + **operating effectiveness** over a period |
| Typical ask | “Are controls suitably designed?” | “Did they operate over 6–12 months?” |
| Customer use | Limited | Standard vendor risk artifact |

### Common-control / crosswalk idea

One internal control (example: MFA) can map to SOC 2 access criteria, NIST CSF Protect, and ISO access themes — so you do not rebuild three programs. Interviews often ask: “How do you map controls across frameworks?”

---

## Trust Services Criteria (SOC 2 — know the names)

Common criteria families:

1. **Security** (almost always in scope)  
2. **Availability**  
3. **Processing integrity**  
4. **Confidentiality**  
5. **Privacy**

Questions often ask which criterion matches a control (for example, encryption → Security/Confidentiality; uptime SLA monitoring → Availability).

---

## NIST CSF functions (memorize the five)

| Function | Plain job |
|----------|-----------|
| **Identify** | Know assets, risks, governance |
| **Protect** | Safeguards (access, training, data security) |
| **Detect** | Find anomalies and incidents |
| **Respond** | Contain and communicate |
| **Recover** | Restore and improve |

Ironframe hazard pipeline and cockpit lean **Detect/Respond**; Integrity Hub and ALE lean **Identify**; Evidence/Exports lean **Protect/Recover proof**.

---

## Control mapping (skill every analyst needs)

**Mapping** = linking *your* control or evidence to a *framework requirement*.

Example pattern:

| Your control (Ironframe / process) | Framework anchor | Evidence |
|------------------------------------|------------------|----------|
| Tenant isolation + RBAC login | SOC 2 Security / NIST Protect | Access config + login evidence |
| Sealed Evidence Vault (WORM) | Audit logging / retention | Sealed record + export |
| ALE baseline on Get Started | Risk assessment documentation | Saved ALE + company profile |
| `/exports` CSV for auditor | Audit support | Timestamped tenant export |

**Lab skill:** In Practitioner Core you will map UI panels on `/audit` the same way.

---

## What Ironframe is (and is not) on a test

| True | False |
|------|-------|
| Control-first GRC **platform** for tenants | “We are your SOC 2 certificate” |
| Helps quantify risk in **dollars (ALE)** | “ALE replaces all qualitative risk” |
| Stores sealed **evidence** for auditors | “PILOT screens are production evidence” |
| Tenant isolation is a core security property | “All tenants share one database view” |

Do **not** claim completed SOC 2 Type II / ISO logos unless your organization truly holds them.

---

## Self-check

1. SOC 2 vs ISO 27001 — one difference.  
2. List the five NIST CSF functions.  
3. Name three SOC 2 trust criteria.  
4. Map one Ironframe screen to a framework idea.  
5. HIPAA vs GDPR — which is US health vs EU personal data?

Next: [risk-and-ale.md](./risk-and-ale.md).
