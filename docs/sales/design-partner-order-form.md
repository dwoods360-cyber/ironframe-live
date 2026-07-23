# Design-partner Command Tier — order form (template)

**Status:** Operator-ready template · **not counsel-approved** — see [counsel review packet](./counsel-review-packet.md); launch checklist **D0** blocks first paid signature until outside counsel returns approved text  
**SKU:** Path B / Command Tier on-ramp **$4,999 USD** (BigInt **499900** cents)  
**Companion:** [Offer sheet](./design-partner-offer-sheet.md)  
**In-app:** `/dashboard/operations/library/order-form` — interactive form with **Suggest from call** (LIVE recap drafts only) + partner lock word **`AGREED`** to freeze before copy/send. Commercial locks are never sourced from transcript.

---

## Parties

| Field | Value |
|-------|--------|
| **Customer legal name** | |
| **Billing contact name / email** | |
| **Operator email (workspace invite)** | *Must be client-owned — not @ironframegrc.com* |
| **Workspace slug (subdomain)** | `____________.ironframegrc.com` |
| **Ironframe entity** | Ironframe GRC / [legal entity name] |
| **Effective date** | |

## Commercial terms

| Term | Value |
|------|--------|
| **Product** | Ironframe Command Tier — design-partner / Path B on-ramp |
| **Fee** | **$4,999 USD** one-time platform on-ramp (flat; no seat licenses) |
| **Payment** | Stripe tenant-scoped Path B activation link (not generic public `/pricing` for existing PENDING workspaces) |
| **Pilot window** | **____ days** (default **90**, min **60**) from payment → ACTIVE |
| **Engineering syncs** | Weekly for first **____** weeks (default **4–6**), then async only unless amended in writing |
| **Planned GA reference** | Ironframe Command planned list **~$35,000/yr** (list price) |
| **Convert credit** | If Customer converts to Command **within the Path B window**, the Path B **$4,999** fee is **credited to year-1 Command** (fixed convert credit — **not** a negotiated %). Year-1 net ≈ list minus $4,999 |
| **Refunds** | Path B **$4,999** is **non-refundable** on exit or mid-window termination — **no** refund, **no** % off Path B |

## Success criteria (exactly 2 or 3)

1. ________________________________________________________________
2. ________________________________________________________________
3. ________________________________________________________________ (optional)

**Exit:** If criteria are unmet at window end and Customer elects not to convert, workspace may be offboarded per Terms. Path B fee is not refunded and is not credited unless Customer converts within the window. There is no obligation to renew at GA pricing.

## Data & legal pointers

- Order incorporates then-current [Terms](/terms) and [Privacy](/privacy).  
- Processing scope: Command Tier workspace operation (auth, audit logs, sanitized threat telemetry, BigInt risk registers) — see procurement / DPA framework in-app.  
- Customer warrants operator email is controlled by Customer’s organization.

## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Customer authorized signer | | | |
| Ironframe authorized signer | | | |

**Ops after signature:** DISPATCH confirmation → `/admin/onboarding` quick-provision → send Path B link → confirm ACTIVE → partner `/get-started` → attach this form to CRM deal notes.
