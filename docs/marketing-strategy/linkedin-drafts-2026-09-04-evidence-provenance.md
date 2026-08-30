# LinkedIn Fri — Evidence provenance at ingest

**Slot intent:** Friday practical control lesson  
**Ops calendar:** `marketing/linkedin-2026-09-04-evidence-provenance` — due **Fri 2026-09-04**  
**Source:** GF recurring theme — untrusted ingest; complements Jul 15 current-pain fragmented-evidence framing  
**Complements:** Aug 24 shared-stack problem post; Aug 26 entity-scoped export path — this one is **attribution at ingest**, upstream of both  
**Avoids:** naming a specific compromised vendor as a customer-impact claim; incident-response advice; product feature list; Path B pitch in body  
**Industry pull:** Operators whose registers are populated by scanner, connector, and gateway output they do not control  
**History:** Carded for Fri 2026-08-28, not published — the independent citation was never supplied. Moved to Fri 2026-09-04.  
**Drafted:** 2026-08-27 · **Voice pass:** pending · **Status:** DRAFT — citations unverified, do not publish

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
| Upstream package compromise can reach evidence-producing tooling | **TO VERIFY — operator must supply** the primary report for the Trivy / KICS / LiteLLM supply-chain compromises (AFP charging announcement or equivalent primary source). Do not cite a `lnkd.in` shortener. | _(blank — paste verified URL before Save/Copy)_ | Provenance makes blast-radius enumeration a query, not a manual search |
| Evidence integrity posture (Ironframe) | Public trust information | https://ironframegrc.com/trust-center | CTA: workflow review, not free pilot |

**Do not claim:** that any named vendor compromise affected Ironframe customers or any specific organization; incident counts or credential totals without the primary citation open; SOC 2 or ISO certification; that provenance capture prevents compromise rather than bounding it.

**Blocking:** the Publishing Desk requires at least one **independent** (non-`ironframegrc.com`) citation before Save or Copy. Row 2 is the only independent slot and is currently empty — this draft cannot be copied to LinkedIn until the operator pastes a verified primary URL.
