# Master Service Agreement / Terms Framework

Source of truth in product: `app/lib/legal/documents.ts` → https://www.ironframegrc.com/terms

**Status:** Draft for counsel / brief-advice review — not counsel-approved.

---

## 1. Parties and scope

This Master Service Agreement ("Agreement") is between the subscribing organization ("Customer") and Ironframe GRC ("Provider"). Provider delivers a multi-tenant governance, risk, and compliance ("GRC") platform including the Command Post workspace, integrity telemetry, threat ingestion via Irongate sanitization, and BigInt-cent financial risk registers. Customer receives a dedicated tenant enclave identified by a unique DNS slug with PostgreSQL row-level isolation and Supabase-authenticated operator access.

## 2. Command Tier subscription

Customer subscribes to the Command Tier — a single-tenant enterprise package comprising dashboard operations, active risk registry, threat pipeline, and baseline export capabilities. Pricing is established in a separate order form or invoice. All monetary values in Provider systems are stored as whole integer USD cents (BigInt); Provider does not rely on floating-point arithmetic for governed accounting surfaces. Add-on modules (Governance+, Sustainability, Vault, MSSP Platform) require a written amendment.

## 3. Data protection and subprocessors

Customer data resides in Provider-selected cloud regions (Vercel hosting, Supabase database and authentication, Resend transactional email). Provider implements zero-trust ingestion, tenant cookie scoping, Ironguard client isolation, and audit logging. Customer retains ownership of uploaded evidence and risk records. Provider may process anonymized benchmark aggregates only when Customer opts in via tenant configuration. Subprocessor list available upon request for DPA execution.

## 4. Compliance alignment (not certification)

Provider tooling maps to SOC 2, ISO 27001, NIST CSF, and sector frameworks via Irontally control crosswalks. Provider is alignment-oriented, not independently certified for Customer's obligations. Customer remains responsible for regulatory filings, control attestation, and organizational policies. Provider will support reasonable audit evidence requests subject to confidentiality and scope limits in the order form.

## 5. Availability and support

Design-partner tenants receive sales-assisted onboarding, operator invitation, and business-hours engineering response. Scheduled maintenance and Vercel/Supabase platform events may cause brief interruption. Provider may activate deployment quarantine or operational freeze controls to protect platform integrity; Customer will receive notice when practicable.

## 6. Billing and suspension

Subscription fees are due per the invoice or payment link issued at onboarding. Until billing status is ACTIVE, Provider may soft-gate live command surfaces while preserving audit metadata. Past-due accounts may be suspended after written notice. Reactivation occurs upon confirmed payment and operator verification.

## 7. Limitation of liability

Provider's aggregate liability under this Agreement is limited to fees paid by Customer in the twelve (12) months preceding the claim. Neither party is liable for indirect, consequential, or punitive damages. Customer acknowledges that quantitative ALE outputs are decision-support models requiring human attestation before regulatory or board submission.

## 8. Term and termination

This Agreement begins on the Effective Date in the order form and continues until terminated. Either party may terminate for material breach with thirty (30) days' cure notice. Upon termination, Provider will export Customer tenant data in a standard format within thirty (30) days and delete production copies per the data retention schedule, except where law requires retention.
