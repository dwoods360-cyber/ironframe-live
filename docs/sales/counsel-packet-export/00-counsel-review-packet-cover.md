# Counsel review packet — Path B commercial contracts

**Status:** Ready for outside counsel review · **not** counsel-approved  
**Prepared:** 2026-07-22  
**Product:** Ironframe GRC — Command Tier / Path B design-partner on-ramp  
**Operator gate:** Launch checklist **D0** — no paid signature / Path B activation send until counsel returns approved text  

**This packet is not legal advice.** IronBoard `board-legal` is a copy persona only — do not treat it as counsel.

---

## 1. Why we are engaging counsel

We need a **SaaS commercial package** suitable for the first paid design partners ($4,999 Path B / ~90-day convert-or-exit), including:

1. **Indemnification** — current MSA has **limitation of liability only**; **no** indemnity / hold-harmless.
2. **Order form incorporation** — clear hierarchy: order form commercials + MSA/DPA general terms.
3. **Path B commercial locks** — non-refundable fee; in-window convert credit of $4,999 to year-1 Command (not a negotiated %); planned GA list ~$35,000/yr (reference only).
4. **E-sign / acceptance trail** — existing `/legal/accept` (SHA-256 hash, versions, timestamp) adequacy.
5. **DPA + subprocessors** — design-partner diligence pack readiness.

---

## 2. Documents in this packet

| # | Document | Source of truth in product |
|---|----------|----------------------------|
| 00 | This cover / review scope | `docs/sales/counsel-review-packet.md` |
| 01 | Design-partner order form (template) | `docs/sales/design-partner-order-form.md` |
| 02 | MSA framework | `app/lib/legal/documents.ts` → `/terms` · `/legal/accept` |
| 03 | Privacy framework | same → `/privacy` |
| 04 | DPA framework | `app/lib/legal/procurement.ts` → trust center `/trust/dpa` |
| 05 | Corporate subprocessor list | same → `/trust/subprocessors` |
| 06 | Data residency statement | same → `/trust/data-residency` |

Live URLs (production apex):

- https://www.ironframegrc.com/terms  
- https://www.ironframegrc.com/privacy  
- https://www.ironframegrc.com/trust-center/dpa (public trust pack)  
- In-app operator library order form: `/dashboard/operations/library/order-form`

---

## 3. Explicit ask to counsel (deliverable)

Please return a written memo + redlined / replacement text for:

| Topic | Current gap |
|-------|-------------|
| Customer → Provider indemnity | **Missing** — misuse of platform, IP claims from Customer content, fines from Customer instructions |
| Provider → Customer indemnity | **Missing** — typically narrow product IP if offered |
| Cap + exclusions | Cap exists (fees paid prior 12 months); confirm carve-outs (security incident, ALE decision-support) |
| Order form controls | Confirm incorporation language and signature block |
| Path B fee / convert credit / non-refundable | Enforceability and clear drafting |
| Mutual NDA | Optional later under Path B — **not** the immediate post-yes gate |
| Versioning | Recommend `msa_vX` / `order_form_vX` labels for `/legal/accept` |

**Out of scope for this turn:** litigation defense retainer, employment, fundraising docs.

---

## 4. Commercial facts counsel should treat as locked (product constitution)

| Fact | Value |
|------|--------|
| Path B fee | **$4,999 USD** (BigInt **499900** cents) one-time on-ramp |
| Window | Default **90** days (min **60**) convert-or-exit |
| Refunds | **Non-refundable** on exit / mid-window termination |
| Convert credit | In-window convert → Path B fee **credited** to year-1 Command; **not** a negotiated % |
| Planned GA list (reference) | ~**$35,000**/yr Command |
| Operator email | Must be **client-owned** (not `@ironframegrc.com`) |
| Activation | Tenant-scoped Stripe Path B link — not generic `/pricing` for PENDING workspaces |
| Money storage | All USD in product as **integer cents (BigInt)** — no float/Decimal |

---

## 5. Operator process after counsel returns

1. Paste counsel-approved text into MSA / Privacy / DPA / order form sources (no AI-invented indemnity clauses).  
2. Mark order form: **Counsel-approved · YYYY-MM-DD · counsel name / firm**.  
3. Bump legal document versions used by `/legal/accept`.  
4. Check launch checklist **D0**.  
5. Only then: signed order form → `/admin/onboarding` → Path B link.

---

## 6. Contact for questions during review

- Product / operator: platform global admin (`dwoods360@gmail.com`)  
- Ops delivery mailbox: `delivery@ironframegrc.com`  
- Privacy routing (as published): `privacy@ironframegrc.com`
