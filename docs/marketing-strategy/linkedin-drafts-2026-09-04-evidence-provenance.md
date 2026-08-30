# LinkedIn Fri — Evidence provenance at ingest

**Slot intent:** Friday practical control lesson  
**Ops calendar:** `marketing/linkedin-2026-09-04-evidence-provenance` — due **Fri 2026-09-04**  
**Source:** GF recurring theme — untrusted ingest; complements Jul 15 current-pain fragmented-evidence framing  
**Complements:** Aug 24 shared-stack problem post; Aug 26 entity-scoped export path — this one is **attribution at ingest**, upstream of both  
**Avoids:** naming a specific compromised vendor as a customer-impact claim; incident-response advice; product feature list; Path B pitch in body  
**Industry pull:** Operators whose registers are populated by scanner, connector, and gateway output they do not control  
**History:** Carded for Fri 2026-08-28, not published — the independent citation was missing. Moved to Fri 2026-09-04; citation supplied 2026-08-30 (CVE-2026-33634, NVD).  
**Drafted:** 2026-08-27 · **Voice pass:** pending · **Status:** DRAFT — citations verified 2026-08-30, holding for voice pass

### Board voice (founder cadence)

- Speak to the operator who owns the register — not as if you sit on every board.
- Control lesson → one trust-center link. Workflow-review CTA in first comment only.

---

Untrusted ingest is the quietest evidence failure in GRC.

Most registers record what a tool reported. Fewer record *that a tool reported it*.

That distinction stays invisible until the tool is wrong. A scanner misconfigures, a connector silently stops returning results, a package is compromised upstream — and the register keeps presenting the output as your assertion, because attribution was never captured at ingest.

The control lesson: evidence should carry its origin for as long as it carries its claim.

One test you can run this week, on a single control:

1. Open the newest artifact behind it. Can you name the system that produced it, without asking anyone?
2. Does the register store when it was collected, separately from when it was last documented?
3. If that source were found unreliable tomorrow, could you list every export that already carried its output?
4. If the answer to 3 is a manual search, provenance is a convention on your team — not a property of your register.

Attribution at ingest is cheap. Reconstructing it after a vendor incident is not.

How we think about evidence integrity:
https://ironframegrc.com/trust-center

#GRC #EvidenceIntegrity #MSSP #CyberGovernance #vCISO

---

## First comment (post immediately after publish — do not put in main body)

Want to walk one control's provenance path on your own stack? 10–15 minute workflow review:
https://ironframegrc.com/register/contact

---

## Research & verification (operator only — do not paste to LinkedIn)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| Registers store tool output without retaining source attribution | Published GF current-pain research — fragmented evidence / untrusted ingest | https://research.ironframegrc.com/briefings/2026-07-15-research-grc-current-pain | Attribution captured at ingest, retained through export |
| Upstream package compromise can reach evidence-producing tooling | **Verified 2026-08-30.** CVE-2026-33634: on 2026-03-19 a threat actor published a malicious Trivy v0.69.4, force-pushed 76 of 77 version tags in `aquasecurity/trivy-action` to credential-stealing malware, and replaced all 7 tags in `aquasecurity/setup-trivy`. Trivy is itself a scanner whose output populates registers — so the compromise landed *on the evidence producer*, which is exactly the post's claim. Added to CISA KEV on 2026-03-26 (remediation due 2026-04-09). | https://nvd.nist.gov/vuln/detail/CVE-2026-33634 | Provenance makes blast-radius enumeration a query, not a manual search |
| Evidence integrity posture (Ironframe) | Public trust information | https://ironframegrc.com/trust-center | CTA: workflow review, not free pilot |

**Corroborating (open only if challenged in comments — NVD is the citation of record):**

- Vendor disclosure: https://github.com/aquasecurity/trivy/discussions/10425 — Aqua's own incident thread; states containment of the 2026-03-01 incident was incomplete and secret rotation "wasn't atomic."
- Vendor advisory: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- Microsoft Security Response Center analysis: https://www.microsoft.com/en-us/security/blog/2026/03/24/detecting-investigating-defending-against-trivy-supply-chain-compromise/
- CISA KEV entry: https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-33634

**Do not claim:** that any named vendor compromise affected Ironframe customers or any specific organization; incident counts or credential totals without the primary citation open; SOC 2 or ISO certification; that provenance capture prevents compromise rather than bounding it.

**Blocking:** cleared 2026-08-30. The Publishing Desk requires at least one **independent** (non-`ironframegrc.com`) citation before Save or Copy; row 2 now carries the NVD entry for CVE-2026-33634, which is independent, government-hosted and stable. Remaining gate is the voice pass.
