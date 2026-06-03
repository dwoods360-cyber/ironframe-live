# 📋 Manual Testing Procedure & QA Playbook
## Full Functional & UI/UX Step-by-Step Verification Protocol

Use this webpage to manually execute and audit the core feature behaviors of the Ironframe SaaS application. Follow the preconditions, tester actions, and expected visual results to verify system integrity.

---

## 🔐 1. Authentication & Context Initialization

### 🧪 Test Case: AUTH-001 — Tenant Cookie Extraction
* **Preconditions:** Local development server running (`npm run dev`) or live production edge active. Clear browser cookies before starting.
* **Tester Manual Actions:**
  1. Navigate to the application root home directory (`/`).
  2. Observe the initial redirection behavior or landing layout.
  3. Log into the system using your designated testing credentials.
  4. Open your browser's Developer Tools (F12) and inspect the **Application ➔ Cookies** tab.
* **Expected Visual Behavior:** The system logs you in seamlessly. A session cookie containing the encrypted tenant parameter is initialized, and the UI header dynamically establishes your active control room workspace.

---

## 🔄 2. Multi-Tenant Isolation & Cache Resilience

### 🧪 Test Case: TENANT-001 — Vaultbank ➔ Medshield Hot-Swap
* **Preconditions:** User is authenticated and viewing the primary dashboard deck.
* **Tester Manual Actions:**
  1. Locate the **Command Center Dropdown Menu** at the top left of the screen.
  2. Click the dropdown and select **Vaultbank NV**. Observe and note the displayed baseline valuation score.
  3. Click the dropdown a second time and select **Medshield**.
* **Expected Visual Behavior:** The application must instantly shift its view context. Center grid panels must display a temporary loading skeleton animation (no raw panel collapsing). The valuation metrics must change deterministically to reflect Medshield's baseline validation records without leaking any stale financial entries from Vaultbank.

### 🧪 Test Case: TENANT-002 — Rogue Zone Boundary Mapping
* **Preconditions:** Active tenant context is unassigned or mid-transit during a rapid switch configuration.
* **Tester Manual Actions:**
  1. Trigger an action path that targets the Gridcore Infrastructure tenant baseline view layout.
  2. Monitor the developer console log outputs for any background telemetry ingest crashes.
* **Expected Visual Behavior:** The system's automatic zone normalization layer catches raw tracking coordinates. It maps any rogue zone tokens (such as `US-GD`) straight to canonical coordinates (`US-CO`) gracefully behind the scenes, ensuring the frontend dashboard never encounters an unhandled layout crash or unmounts the center panels.

### 🧪 Test Case: TENANT-003 — Rapid Switch Stress & Cache Isolation
* **Preconditions:** SWR caching boundaries are active.
* **Tester Manual Actions:**
  1. Click the **Command Center Dropdown**.
  2. Manually toggle back and forth between **Vaultbank** and **Gridcore** five times in rapid succession.
  3. Stop clicking and observe the final rendered state of the center panels.
* **Expected Visual Behavior:** The UI must remain stable and mounted. Thanks to tenant-scoped caching structures, stale rendering data from the alternate tenant never bleeds into the current view frame. The app recovers gracefully without displaying a permanent blank screen or an incorrect data cross-bleed mix.

---

## 📈 3. Data Integrity & Ingress Fallbacks

### 🧪 Test Case: CARBON-001 — Forensic Baseline Layout Fallback
* **Preconditions:** Local simulation configuration flag is set to true (`IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED="true"`). Third-party vendor credentials are empty.
* **Tester Manual Actions:**
  1. Navigate directly to the **Carbon Pulse Telemetry Component** module window on the dashboard.
  2. Observe the interface behavior during data hydration.
* **Expected Visual Behavior:** The system detects the missing live vendor API credentials. Instead of breaking or rendering a broken panel layout, it utilizes the secure local reserve bypass token to inject an integrated Forensic Baseline. The panel stays mounted, rendering an accurate static simulation chart for analytical evaluation.

---

## 🗂️ 4. Analyst Portal & Tabular Data Exports

### 🧪 Test Case: EXPORT-001 — Tabular Financial Ledger Verification
* **Preconditions:** Active tenant is configured to **Vaultbank NV**.
* **Tester Manual Actions:**
  1. Navigate to the **Analyst Portal / Ironquery Data Interface**.
  2. Locate the table action block and click the **Export Tabular Ledger Data (CSV)** button.
  3. Open the resulting spreadsheet download file using a raw text viewer or spreadsheet application.
* **Expected Visual Behavior:** The file must generate and process instantaneously. Inspect the numeric columns: all monetary structures must be rendered strictly as whole integers representing exact cents (e.g., `$59,000.00` appears as `5900000`). There must be 0% rounding drift or floating-point decimal approximations.

---

## 🎨 5. User Interface Fluidity & Animation Borders

### 🧪 Test Case: UX-002 — GRC Side Drawer Overlay Transitions
* **Preconditions:** User is viewing the active micro-agent tracking grid layout.
* **Tester Manual Actions:**
  1. Click on an operational agent row (e.g., `Ironlock` or `Ironguard`).
  2. Observe the animation behavior as the technical specification panel shifts into focus.
  3. Click the close button or anywhere on the dimmed background space.
* **Expected Visual Behavior:** An interactive GRC metadata drawer must slide smoothly into view from the right margin overlaying the screen canvas. The background page must dim cleanly without any jarring screen flashes or layout shifting. Dismissing the panel must reverse the slide animation cleanly with zero frame lag.
