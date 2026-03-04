# Vendors Page — Current State (Pre–Vendor Risk Module)

**File:** `app/vendors/page.tsx`  
**Purpose:** Supply Chain // Global Vendor Intelligence — CISO/CEO view of vendor registry, risk tiers, and GRC context.

## Structure

- **Client-only** (`"use client"`). Renders only after mount (`isMounted`) to avoid hydration mismatch.
- **Layout:** Full-height flex column; sidebar-style filters and a main content area with vendor table and alerts.

## Main Sections

1. **ActiveNotificationSystem**  
   Uses `NotificationHub` for alerts (e.g. Zero-Day scan results, quarantine). Resolves risk tier from vendor graph; supports Approve, Reject, Archive Low Priority.

2. **PageHeaderAndActions**  
   - Title: "SUPPLY CHAIN // GLOBAL VENDOR INTELLIGENCE"
   - Buttons: AUTO-TRIAGE, ROI CALC (toggle), INITIATE ZERO-DAY SYNC (red “disruptor”)
   - Persona: CISO VIEW / CEO VIEW
   - ACTIVITY LOG, TABLE VIEW (placeholders)

3. **FilterControls**  
   - Search (registry text)
   - GRC Context dropdown: ALL, SOC2, ISO, HIPAA, PCI, GDPR, NIST, FEDRAMP
   - Date filter: renewal windows, Q1–Q4, Annual, EXPIRED
   - Risk chips: ALL, CRITICAL, HIGH, MED, LOW with counts

4. **ZeroDayPanel**  
   Collapsible “ZERO-DAY SYNC AGENT” terminal: CVE ID input, EXECUTE SCAN. On execute, adds a system alert and closes panel.

5. **VendorTable**  
   Grid (10 columns): Scorecard icon, Vendor Name, Data Payload, Risk, Rating/Proj. Loss (by persona + ROI toggle), Status, Countdown, Locker badge, Actions (quarantine, menu).  
   - Quarantine toggles vendor in/out of `quarantinedIds` and can add a quarantine alert.  
   - Row menu: Request SOC2 Update, Bulk RFI, 4th-Party Graph, Map View, Override Risk Score.

## Data & State

- **MASTER_VENDORS** and **getDaysUntilExpiration** from `@/app/vendors/schema`.
- **calculateVendorGrade**, **VendorLetterGrade** from `@/utils/scoringEngine`.
- **Vendor graph** is derived in `useMemo`: adds `vendorId`, `riskTier`, `ale`, `healthScore` (grade + score). “Azure Health” forced to CRITICAL; “Schneider Electric” has breach alert.
- **State:** `persona`, `showRoi`, `searchQuery`, `grcContext`, `grcDateFilter`, `riskFilter`, `quarantinedIds`, `isZeroDayOpen`, `alerts`.
- **Filtering:** by search string and risk tier chip; GRC/date filters are passed to table for status display but not yet applied to the computed list.

## Dependencies

- **NotificationHub**, **ScorecardIcon** (vendors).
- **schema** (MASTER_VENDORS, getDaysUntilExpiration), **scoringEngine** (calculateVendorGrade).

## Gaps / Next-Module Hooks

- ACTIVITY LOG and TABLE VIEW are non-functional.
- GRC context and date filters do not filter the vendor list; they only affect status text (`getDynamicStatus(grcDateFilter)`).
- No persistence for quarantine or alerts (client state only).
- No link yet from dashboard/Reports “Vendor Risk” to this page or to a shared vendor store.
- Evidence locker / document status is represented by a static badge (SOC2: VALID / REVIEW / EXPIRED) from grade; no real evidence API.

## Safe Merge Note

- Page is self-contained and does not use `useRiskStore` or other GRC pipeline stores used by KIMBOT/GRCBOT.
- No shared state with Reports or SystemConfig beyond possible future wiring of “Vendor Risk” entry points.
