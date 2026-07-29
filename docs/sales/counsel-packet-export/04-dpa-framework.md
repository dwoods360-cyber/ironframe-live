# Data Processing Addendum (DPA) Framework

Source of truth in product: `app/lib/legal/procurement.ts` → https://www.ironframegrc.com/trust-center/dpa

**Status:** Draft for counsel / brief-advice review — not counsel-approved.

---

## 1. Processing scope

Ironframe GRC processes Customer Personal Data solely to deliver the subscribed Command Tier workspace: authentication identifiers, operator audit logs, uploaded GRC evidence, threat telemetry sanitized through Irongate (Agent 14), and BigInt-cent financial risk registers. Processing occurs under Customer instructions documented in the order form and this Data Processing Addendum framework.

## 2. Controller / processor roles

Customer is the controller for tenant-uploaded content and workforce identifiers within the workspace. Ironframe GRC acts as processor for that content and as an independent controller for platform security telemetry required to operate the service (rate limiting, intrusion detection, cron health checks).

## 3. Subprocessors

Customer authorizes the subprocessors listed in the Corporate Subprocessor List. Ironframe will provide thirty (30) days' notice of material subprocessor changes via the trust center or written notice to the Customer security contact.

## 4. Technical and organizational measures

Measures include: zero-trust external ingestion via Irongate; PostgreSQL tenant isolation with session-scoped RLS GUCs; Ironguard client cross-tenant fetch blocks; immutable ThreatEvent WORM ledger (Epic 12); BIGINT-only USD monetary fields; encrypted transport (TLS 1.2+); secrets stored in Vercel/Supabase environment vaults — never in repository source.

## 5. Personal data breach notification

Ironframe will notify Customer without undue delay after confirming a Personal Data Breach affecting Customer data, including available facts, containment steps, and remediation timeline. Customer maintains primary regulatory notification obligations.

## 6. Return and deletion

Upon termination, Customer may export tenant data via standard dashboard exports. Ironframe deletes production copies within thirty (30) days after export window completion, except where retention is required by law or sealed WORM evidence obligations explicitly contracted.

## 7. Audit cooperation

Ironframe will make available SOC 2-aligned control narratives, integration test evidence, and TAS constitutional fingerprint artifacts (/api/grc/tas-integrity) subject to confidentiality and reasonable scope limits.
