# LinkedIn Mon — ISO 27001 is not NIS2 compliance

**Slot intent:** Monday persistent-problem post — name the problem, explain why the usual fix has not removed it  
**Ops calendar:** `marketing/linkedin-2026-08-31-nis2-iso-accountability` — due **Mon 2026-08-31**  
**Source:** Directive (EU) 2022/2555, Articles 20, 21, 23 — verified against the EUR-Lex consolidated text 2026-08-28  
**Complements:** Aug 24 shared-stack problem post; Aug 26 entity-scoped export path — this one is **clocks and named owners**  
**Avoids:** legal advice; naming entities as in or out of scope; implying Ironframe certifies anything; Path B pitch in body  
**Industry pull:** EU-exposed operators and their MSSP/vCISO advisors who treat an ISO 27001 certificate as the compliance answer  
**History:** Originally carded for Fri 2026-08-14 (moved to avoid stacking with residual-vs-spend), then Fri 2026-08-28. Moved to Mon 2026-08-31 — the draft file the old card pointed at was never written; this is that draft.  
**Drafted:** 2026-08-28 · **Voice pass:** pending · **Status:** Citations verified — ready for voice pass

### Board voice (founder cadence)

- Speak to the operator who has to answer the regulator's question — not as if you are counsel.
- Problem → why the usual fix falls short → one mapping exercise. Workflow-review CTA in first comment only.

---

An ISO 27001 certificate does not answer the two questions NIS2 actually asks.

A certificate says a management system was assessed against a standard, within a defined scope, at a point in time. That is a real thing. It is just not the same thing.

**What time is it?** Article 23 puts statutory clocks on a significant incident: an early warning within 24 hours of becoming aware, an incident notification within 72 hours, and a final report within one month of that notification. A certified ISMS tells you incident handling exists. It does not tell you whether the clock starts when the SOC sees the alert, when on-call confirms it, or when somebody decides the word "significant" applies.

**Who is accountable, by name?** Article 20 puts approval and oversight of the risk-management measures on the management body — and states they can be held liable for infringements. A certificate names an organization and a scope. It does not name the person who approved the measures.

Article 21 is where the overlap is real. Risk analysis, incident handling, business continuity, supply chain security, access control — a mature ISMS gets you a long way into those. That overlap is exactly why the gap is easy to miss: the part a certificate covers well is the part everyone inspects.

Worth mapping this week, on one page:

1. Which incident types start the 24-hour clock — and who is authorized to declare "aware"?
2. Who is the named approver of your risk-management measures, and who signs when they are unavailable?
3. Can you produce the evidence behind a notification inside the window, or only after the window?

A certificate proves a system was assessed. The regulation asks who owns the clock and who signs.

https://ironframegrc.com/marketing

#GRC #NIS2 #CyberGovernance #MSSP #vCISO

---

## First comment (post immediately after publish — do not put in main body)

The clocks → owners map, in short form:

- 24h early warning → who declares "aware"
- 72h incident notification → who approves the initial assessment
- 1 month final report → who owns the evidence trail

Directive (EU) 2022/2555, Arts 20 / 21 / 23: https://eur-lex.europa.eu/eli/dir/2022/2555/oj

NIS2 applies through national transposition, so scope and supervision sit with your member state's implementing law — worth confirming which one governs you before mapping.

Want to walk one of these clocks against your own evidence path? 10–15 minute workflow review: https://ironframegrc.com/register/contact

---

## Research & verification (operator only — do not paste to LinkedIn)

| Post claim (paraphrase) | What the research actually supports | Citation (full URL — open before post) | How Ironframe relieves it (product truth only) |
|---|---|---|---|
| 24h early warning, 72h notification, 1-month final report | Art 23(4)(a) "within 24 hours of becoming aware"; 23(4)(b) "within 72 hours of becoming aware"; 23(4)(d) final report "not later than one month after the submission of the incident notification" — note the month runs from the notification, not the incident | https://eur-lex.europa.eu/eli/dir/2022/2555/oj | Evidence retrievable inside the window, with collection timestamps |
| Management body approves, oversees, and can be held liable | Art 20(1) verbatim: management bodies "approve the cybersecurity risk-management measures … oversee its implementation and can be held liable for infringements" | https://eur-lex.europa.eu/eli/dir/2022/2555/oj | Named approver recorded against the measure, not just the document |
| ISO 27001 overlaps Art 21 but does not cover Arts 20/23 | Art 21(2)(a)–(j) enumerates the measure categories; neither Art 20 accountability nor Art 23 clocks is satisfied by certification | https://eur-lex.europa.eu/eli/dir/2022/2555/oj | Control-first mapping surface |

**Verified:** 2026-08-28 against the EUR-Lex consolidated text. All three articles read directly; quoted language above is from the operative text, not the recitals.

**Do not claim:** that any named entity is in or out of NIS2 scope; that Ironframe delivers NIS2 compliance or certification; SOC 2 or ISO certification for Ironframe; specific national penalties or fine amounts; that an ISO 27001 certificate has no value. Do not present this as legal advice — NIS2 binds through member-state transposition, and scope determinations belong to counsel.
