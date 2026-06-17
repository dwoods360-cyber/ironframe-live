/**
 * Master Service Agreement framework — design-partner Phase 1 (not legal advice).
 * Source: docs/stakeholders/business-plan.md, docs/sales/pricing-and-packaging.md,
 * docs/technical/security-and-compliance.md.
 */

export const MSA_SECTIONS = [
  {
    id: "parties",
    title: "1. Parties and scope",
    body: `This Master Service Agreement ("Agreement") is between the subscribing organization ("Customer") and Ironframe GRC ("Provider"). Provider delivers a multi-tenant governance, risk, and compliance ("GRC") platform including the Command Post workspace, integrity telemetry, threat ingestion via Irongate sanitization, and BigInt-cent financial risk registers. Customer receives a dedicated tenant enclave identified by a unique DNS slug with PostgreSQL row-level isolation and Supabase-authenticated operator access.`,
  },
  {
    id: "subscription",
    title: "2. Command Tier subscription",
    body: `Customer subscribes to the Command Tier — a single-tenant enterprise package comprising dashboard operations, active risk registry, threat pipeline, and baseline export capabilities. Pricing is established in a separate order form or invoice. All monetary values in Provider systems are stored as whole integer USD cents (BigInt); Provider does not rely on floating-point arithmetic for governed accounting surfaces. Add-on modules (Governance+, Sustainability, Vault, MSSP Platform) require a written amendment.`,
  },
  {
    id: "data",
    title: "3. Data protection and subprocessors",
    body: `Customer data resides in Provider-selected cloud regions (Vercel hosting, Supabase database and authentication, Resend transactional email). Provider implements zero-trust ingestion, tenant cookie scoping, Ironguard client isolation, and audit logging. Customer retains ownership of uploaded evidence and risk records. Provider may process anonymized benchmark aggregates only when Customer opts in via tenant configuration. Subprocessor list available upon request for DPA execution.`,
  },
  {
    id: "compliance",
    title: "4. Compliance alignment (not certification)",
    body: `Provider tooling maps to SOC 2, ISO 27001, NIST CSF, and sector frameworks via Irontally control crosswalks. Provider is alignment-oriented, not independently certified for Customer's obligations. Customer remains responsible for regulatory filings, control attestation, and organizational policies. Provider will support reasonable audit evidence requests subject to confidentiality and scope limits in the order form.`,
  },
  {
    id: "availability",
    title: "5. Availability and support",
    body: `Design-partner tenants receive sales-assisted onboarding, operator invitation, and business-hours engineering response. Scheduled maintenance and Vercel/Supabase platform events may cause brief interruption. Provider may activate deployment quarantine or operational freeze controls to protect platform integrity; Customer will receive notice when practicable.`,
  },
  {
    id: "billing",
    title: "6. Billing and suspension",
    body: `Subscription fees are due per the invoice or payment link issued at onboarding. Until billing status is ACTIVE, Provider may soft-gate live command surfaces while preserving audit metadata. Past-due accounts may be suspended after written notice. Reactivation occurs upon confirmed payment and operator verification.`,
  },
  {
    id: "liability",
    title: "7. Limitation of liability",
    body: `Provider's aggregate liability under this Agreement is limited to fees paid by Customer in the twelve (12) months preceding the claim. Neither party is liable for indirect, consequential, or punitive damages. Customer acknowledges that quantitative ALE outputs are decision-support models requiring human attestation before regulatory or board submission.`,
  },
  {
    id: "term",
    title: "8. Term and termination",
    body: `This Agreement begins on the Effective Date in the order form and continues until terminated. Either party may terminate for material breach with thirty (30) days' cure notice. Upon termination, Provider will export Customer tenant data in a standard format within thirty (30) days and delete production copies per the data retention schedule, except where law requires retention.`,
  },
] as const;

export const PRIVACY_SECTIONS = [
  {
    id: "controller",
    title: "1. Data controller",
    body: `Ironframe GRC processes personal data as a processor for Customer tenant content and as a controller for account metadata (operator email, authentication identifiers, audit logs). This Privacy Framework describes both roles for design-partner deployments.`,
  },
  {
    id: "collected",
    title: "2. Information we collect",
    body: `We collect: (a) account identifiers from Supabase Auth (email, user UUID, invite metadata including tenant_slug); (b) operational telemetry (session cookies, ironframe-tenant scope, API access logs); (c) GRC content Customer uploads (risk events, threat payloads, export artifacts); (d) sales intake records for prospects who submit the contact form (organization name, email, reported ALE estimates in integer cents). We do not sell personal data.`,
  },
  {
    id: "use",
    title: "3. How we use information",
    body: `Data is used to authenticate operators, enforce tenant isolation, calculate BigInt ALE baselines, deliver Ironcast notifications, run agent orchestration buses, and produce audit exports. Prospect lead data supports board-level pipeline metrics without provisioning infrastructure until sales-assisted intake completes.`,
  },
  {
    id: "security",
    title: "4. Security measures",
    body: `We apply Irongate schema validation on external ingress, PKI dual-gate vault controls (where enabled), parameterized notification recipients, pre-commit secret scanning, and role-based access via user_role_assignments. DEI-related aggregates follow salted anonymization policies (Epic 14 roadmap).`,
  },
  {
    id: "retention",
    title: "5. Retention",
    body: `Tenant operational data is retained for the subscription term plus the export window defined in the MSA. Legal consent records include a SHA-256 acceptance hash, document versions, and timestamp. Prospect ledger rows upsert on workspace slug for executive reporting.`,
  },
  {
    id: "rights",
    title: "6. Your rights",
    body: `Depending on jurisdiction, individuals may request access, correction, deletion, or portability of personal data. Customer administrators should route requests through their organization's data protection contact; Provider will assist within thirty (30) days.`,
  },
  {
    id: "international",
    title: "7. International transfers",
    body: `Data may be processed in the United States and regions selected for Supabase/Vercel deployment. Standard contractual clauses or equivalent mechanisms apply where required by applicable law.`,
  },
  {
    id: "contact",
    title: "8. Contact",
    body: `Privacy inquiries: privacy@ironframegrc.com (design-partner routing). Security incidents: follow the incident response workflow in Provider documentation and notify your sales engineer immediately.`,
  },
] as const;
