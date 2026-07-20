# Training progression — Ironframe

**Reading levels:** Student / Analyst = 11th grade · Practitioner Core / Ops GTM = 11th–12th grade plain English

```text
Student Core (Ironframe SaaS)
        │
        ▼
Jr. GRC Analyst (Path A) ── Core practicum
        │
        ├──► Platform Practitioner (Path B) ── curated Level 2
        │         ├──► Full LEVEL2 (optional)
        │         └──► Internal Ops / GTM (Path C) ── internal ops only
        │
        └──► Governance Frame (Path D) ── Reader → Writer → Verifier (GFP)
```

| Track | Index | Screenshots |
|-------|-------|-------------|
| Student Core | [LEVEL1-STUDENT-INDEX](./LEVEL1-STUDENT-INDEX.md) · [student/](./student/) | `level-1-*.png` |
| Jr. GRC Analyst | [analyst/ANALYST-INDEX](./analyst/ANALYST-INDEX.md) | `analyst-*.png` |
| Platform Practitioner | [practitioner-core/PRACTITIONER-CORE-INDEX](./practitioner-core/PRACTITIONER-CORE-INDEX.md) | `practitioner-core-*.png` |
| Internal Ops / GTM | [ops-gtm/OPS-GTM-INDEX](./ops-gtm/OPS-GTM-INDEX.md) | `ops-gtm-*.png` |
| **Governance Frame (Path D)** | [governance-frame/README](./governance-frame/README.md) · [GFP-CERTIFICATION](./governance-frame/GFP-CERTIFICATION.md) | `gf-l1-*.png` / `gf-l3-*.png` |
| Design partner | [LEVEL1-PARTNER-INDEX](./LEVEL1-PARTNER-INDEX.md) | partner manuals |
| Full Level 2 | [LEVEL2-PRACTITIONER-INDEX](./LEVEL2-PRACTITIONER-INDEX.md) | `level-2-*.png` |

## GRC knowledge / exam gates

| Track | Knowledge requirement | Pass |
|-------|----------------------|------|
| Jr. GRC Analyst | Manuals K1–K4 + [40-Q industry-aligned exam](./analyst/manuals/practice-exam.md) (risk process, SOC 2 Type I/II, crosswalk, vendor risk, evidence) | ≥ 80% + labs |
| Platform Practitioner | [Control depth](./practitioner-core/manuals/framework-control-depth.md) + [30-Q industry-aligned exam](./practitioner-core/manuals/practice-exam.md) (JML/SoD/change, shared responsibility, findings) | ≥ 80% + labs |
| GF Reader (L1) | [20-Q quiz](./governance-frame/manuals/l1-reader-quiz.md) + annotated briefing | ≥ 80% + capstone |
| GF Writer (L2) | [Portfolio rubric](./governance-frame/manuals/l2-portfolio-rubric.md) | All required **Meets** |
| GF Verifier (L3) | [Verifier rubric](./governance-frame/manuals/l3-verifier-rubric.md) + promote/deny sheet | All required **Meets** |
| **GFP** (full) | L1+L2+L3 badges | [GFP-CERTIFICATION](./governance-frame/GFP-CERTIFICATION.md) |

Analyst/Practitioner gates target **entry GRC tool + quiz knowledge** (including SOC/ISO/NIST *recognition* as industry literacy — **Ironframe is not a SOC company** and does not issue attestations).  

GFP targets **governance research writing & editorial assurance** only — **no SOC curriculum**.  

Neither replaces CompTIA Security+, ISACA CISA/CRISC, or a real SOC engagement — pair those externally when required.

### Naming — Path B vs design-partner seat

In **this training map**, **Path B** means **Platform Practitioner** only.  
The paid **design-partner seat** (~$4,999 / ~90 days) is a **sales offer**, not training Path B. Do not use “Path B” for pricing in exams or Ops glossaries.

**Ops GTM note:** teach Briefings **Approve** only after GFP-Writer/Verifier rules — otherwise you mint publishers without editorial discipline.

Refresh track images: `npm run training:screenshots`  
Live Ops Hub captures (operator login storage state): `npm run training:screenshots:live`
