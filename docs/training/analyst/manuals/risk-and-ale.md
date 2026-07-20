# Risk analysis & ALE for tests (Jr. Analyst)

**Track:** ANALYST · **Reading level:** 11th grade  
**Pairs with:** Integrity Hub labs (Analyst Ch.1, Ch.5)

---

## Qualitative vs quantitative

| Style | Uses | When |
|-------|------|------|
| **Qualitative** | High / Medium / Low (or 1–5 scales) | Fast triage, workshops |
| **Quantitative** | Dollars, frequencies | Board money questions, insurance, Ironframe ALE |

Both are valid. Tests love asking which one answers “how much money could we lose this year?” → **quantitative / ALE**.

---

## Classic quantitative chain

1. Pick an **asset** and a **threat scenario**.  
2. Estimate **SLE** (loss if it happens once).  
3. Estimate **ARO** (times per year).  
4. **ALE = SLE × ARO**.

**Example (toy numbers for learning only):**

- SLE = $50,000  
- ARO = 0.2 (once every five years)  
- ALE = $10,000 per year  

Ironframe may show a workspace ALE baseline you saved — treat classroom seed millions as **fixtures**, not a real customer’s books.

---

## Risk register fields (what tests expect)

A risk row usually needs:

1. Risk ID / name  
2. Asset / process  
3. Threat + vulnerability  
4. Inherent rating  
5. Controls  
6. Residual rating  
7. Owner  
8. Treatment decision  
9. Review date  

Your Analyst journal for one hazard is a **mini risk register entry**.

---

## Treatment decisions (memorize)

| Option | Meaning | Example |
|--------|---------|---------|
| **Mitigate** | Reduce likelihood or impact | Patch, MFA, WORM evidence |
| **Transfer** | Share impact | Insurance, contract |
| **Avoid** | Stop the activity | Do not store that data |
| **Accept** | Live with residual risk (with authority) | Documented risk acceptance |

**Accept** without an owner and date is a common wrong answer.

---

## Ironframe workflow → GRC workflow

| GRC step | Ironframe Core surface |
|----------|-------------------------|
| See risks | `/integrity` hazard pipeline |
| Money context | ALE / posture on Integrity Hub |
| Collect proof | `/evidence` |
| Give auditor a pack | `/exports` |
| Tell leadership | `/board-report` note |

---

## Common exam traps

- Confusing **SLE** (one event) with **ALE** (yearly).  
- Thinking residual risk is always zero after a control.  
- Using demo/PILOT data as production evidence.  
- Writing float money (`$10.5` cents math) instead of whole cents in systems thinking.  
- Mixing **threat** (actor/event) with **vulnerability** (weakness).

---

## Drill (do in journal)

1. Invent a simple scenario (for example “phishing → payroll fraud”).  
2. Assign toy SLE and ARO; compute ALE.  
3. Name one preventive and one detective control.  
4. Choose a treatment and an owner.  
5. Open `/integrity` and write how the real UI differs from your toy model.

Next: [evidence-and-audit.md](./evidence-and-audit.md).
