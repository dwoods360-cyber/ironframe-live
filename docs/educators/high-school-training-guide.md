# 🎓 Ironframe Educator & Student Feature Behavior Guide
## Cybersecurity, Data Analytics, and Governance for 11th & 12th Grade Technical Education

Welcome to Ironframe. This guide is designed specifically for high school educators, career-technical center instructors, or non-GRC (Governance, Risk, and Compliance) professionals. It prepares 11th and 12th-grade students for real-world cloud applications by breaking down exactly how the software behaves visually, what is displayed, and what happens when you interact with the interface.

---

## 🧭 Section 1: Core System Principles

Before clicking anything, students must understand that Ironframe behaves like an enterprise security console supervising a modern cloud network. It tracks three simulated target companies (Tenants):
1. **Medshield ($11.1M baseline):** Healthcare networks containing sensitive student/patient profiles.
2. **Vaultbank ($5.9M baseline):** Financial infrastructure handling critical ledgers.
3. **Gridcore ($4.7M baseline):** Power plants and public utilities.

---

## 🖥️ Section 2: Visual Interface & Feature Behavior Playbook

This section details exactly what is displayed on the screen and what happens when users click or view elements in the SaaS application.

### 1. The Universal Sticky Top Header
* **What is displayed:** A dark slate control bar pinned to the top of the browser screen. It features a pulsing green system indicator dot next to the text `Ironframe Sovereign Platform` on the left, and a distinct button on the right labeled `➔ BACK TO ACTIVE CONTROL ROOM` (or `➔ BACK TO DASHBOARD`).
* **Interactive Behavior:** * Clicking the `➔ BACK TO ACTIVE CONTROL ROOM` button instantly safely redirects the user's browser back to the primary interactive multi-tenant metrics deck.
  * If the user is inside an unauthenticated documentation view, clicking this button initiates a safe session routing scan to determine if an active credentials token is present.

### 2. The Command Center Dropdown Menu (The Tenant Switcher)
* **What is displayed:** Located at the top left of the main dashboard canvas interface. It displays the name of the currently active corporate tenant profile (e.g., `Vaultbank NV`) along with its baseline valuation score metrics.
* **Interactive Behavior:**
  * **Clicking the Dropdown:** Opens an animated selector menu displaying the three distinct client choices: *Medshield*, *Vaultbank*, and *Gridcore Infrastructure*.
  * **Selecting a Tenant:** Triggers an immediate client-side application context modification. The background framework extracts the matching tenant UUID and pushes a real-time event signal down to the application state engine.
  * **What to Expect:** The center grid panels will briefly flash a localized loading skeleton array (preventing visual layout collapsing) and instantly redraw. The monetary baselines, threat vectors, and active logs modify completely to display *only* data owned by that specific company. Row-Level Security ($RLS$) prevents data bleed.

### 3. The Center Analytics Grid Panels (The Telemetry Board)
* **What is displayed:** A cluster of responsive dashboard blocks that map real-time system stability, background risk ordering tiers, and carbon infrastructure footprints.
* **Interactive Behavior & Fallbacks:**
  * **Viewing the Panels:** If a paid external data credential is fully missing from the environment configuration during local testing, the system activates its defensive fallback loop (`IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED="true"`).
  * **What to Expect:** Instead of throwing an ugly 500 server exception error or blanking out into a white screen, the dashboard catches the exception. The panel remains fully rendered by pulling a localized **Last Known Good (LKG) pulse fallback** blueprint, displaying safe, static simulation metrics for students to evaluate.

### 4. The 19-Agent Workforce Monitor Drawer
* **What is displayed:** A dedicated sidebar or expandable tracking view listing the specialized background automation agent roster (such as `Ironlock`, `Ironguard`, `Irongate`, and `Ironwatch`). Each agent shows a green "ACTIVE" status marker or a yellow warning flag if anomalies are caught.
* **Interactive Behavior:**
  * **Clicking an Agent Row:** Slides open an interactive GRC detail drawer overlay from the right side of the workspace screen.
  * **What to Expect:** The drawer displays the micro-agent's exact core directives, its current background scanning loop intervals, and its cryptographic tracking history. Clicking anywhere outside the drawer boundaries or hit-testing the close button gracefully slides the overlay container back out of view without causing layout flashing.

### 5. The Analyst Portal & Ironquery Export Module
* **What is displayed:** A dedicated administrative layout view equipped with data table interfaces and prominent action triggers labeled `Export Tabular Ledger Data (CSV)` and `Generate Compliance Framework Package (PDF)`.
* **Interactive Behavior:**
  * **Clicking the CSV Export Trigger:** Initiates a secure server action that compiles active ledger values into a structured table.
  * **What to Expect:** The browser initiates an instant file stream download named `Ironframe-UI-UX-Feature-Test-Matrix.csv`. When students open this spreadsheet file, they will see that every single monetary entry is formatted strictly as an integer (e.g., values in cents like `5900000` for $59,000.00). This demonstrates to students how banking systems eliminate decimal float rounding errors.

---

## 📊 Section 3: Student Classroom Laboratories

### 🧪 Lab 1: The Fast-Switch Cache Isolation Drill
* **Activity:** Have students open the **Command Center** and rapidly toggle back and forth between **Vaultbank** and **Gridcore** five times in a row.
* **What to Observe:** Thanks to the tenant-scoped caching architecture, the layout panels adjust instantly without mixing data. Banking charts will never lag into the utility grid layout.

### 🧪 Lab 2: Simulating an External Outage
* **Activity:** Open the application's configuration parameters and verify that fallback simulation pathways are engaged.
* **What to Observe:** Navigate to the carbon-pulse telemetry component. Students verify that despite zero live connection access to remote environmental APIs, the system uses its fallback token (`LOCAL_RESERVE_BYPASS_TOKEN`) to gracefully present a static backup chart map rather than crashing the layout.
