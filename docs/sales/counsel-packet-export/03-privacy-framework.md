# Privacy Framework

Source of truth in product: `app/lib/legal/documents.ts` → https://www.ironframegrc.com/privacy

**Status:** Draft for counsel / brief-advice review — not counsel-approved.

---

## 1. Data controller

Ironframe GRC processes personal data as a processor for Customer tenant content and as a controller for account metadata (operator email, authentication identifiers, audit logs). This Privacy Framework describes both roles for design-partner deployments.

## 2. Information we collect

We collect: (a) account identifiers from Supabase Auth (email, user UUID, invite metadata including tenant_slug); (b) operational telemetry (session cookies, ironframe-tenant scope, API access logs); (c) GRC content Customer uploads (risk events, threat payloads, export artifacts); (d) sales intake records for prospects who submit the contact form (organization name, email, reported ALE estimates in integer cents). We do not sell personal data.

## 3. How we use information

Data is used to authenticate operators, enforce tenant isolation, calculate BigInt ALE baselines, deliver Ironcast notifications, run agent orchestration buses, and produce audit exports. Prospect lead data supports board-level pipeline metrics without provisioning infrastructure until sales-assisted intake completes.

## 4. Security measures

We apply Irongate schema validation on external ingress, PKI dual-gate vault controls (where enabled), parameterized notification recipients, pre-commit secret scanning, and role-based access via user_role_assignments. DEI-related aggregates follow salted anonymization policies (Epic 14 roadmap).

## 5. Retention

Tenant operational data is retained for the subscription term plus the export window defined in the MSA. Legal consent records include a SHA-256 acceptance hash, document versions, and timestamp. Prospect ledger rows upsert on workspace slug for executive reporting.

## 6. Your rights

Depending on jurisdiction, individuals may request access, correction, deletion, or portability of personal data. Customer administrators should route requests through their organization's data protection contact; Provider will assist within thirty (30) days.

## 7. International transfers

Data may be processed in the United States and regions selected for Supabase/Vercel deployment. Standard contractual clauses or equivalent mechanisms apply where required by applicable law.

## 8. Contact

Privacy inquiries: privacy@ironframegrc.com (design-partner routing). Security incidents: follow the incident response workflow in Provider documentation and notify your sales engineer immediately.
