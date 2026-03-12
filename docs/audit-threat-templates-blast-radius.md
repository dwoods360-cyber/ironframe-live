# Targeted Blast Radius Audit — Threat Templates (GATEKEEPER PROTOCOL)

**Scope:** Wiring "Top Sector Threats" buttons (left sidebar) to open and pre-fill the manual registration flow.  
**Mode:** Read-only. No code changes.

---

## 1. UI and State Flow — File Map

### 1.1 Left Sidebar: "Top Sector Threats"

| File | Role | Current state |
|------|------|----------------|
| `app/components/StrategicIntel.tsx` | Renders the "Top Sector Threats (Click to Register)" section with industry-specific buttons (e.g. RANSOMWARE / PHI EXTORTION, MEDICAL DEVICE (IOMT) HIJACK, THIRD-PARTY VENDOR BREACH for Healthcare). Data comes from an inline `getTopRisks()` switch on `selectedIndustry` (title, val, loss). | **Functional but not wired to registration form.** Each button `onClick` calls `upsertPipelineThreat({ id: \`MANUAL-${Date.now()}-${index}\`, name: risk.title, loss: risk.loss, industry: selectedIndustry, source: 'Strategic Intel Profile' })`. So clicks **add a threat directly to the pipeline**; they do **not** open any drawer or form, and do **not** pre-fill the manual entry UI. |

---

### 1.2 Registration Drawer / Modal (Manual Entry)

| File | Role | Current state |
|------|------|----------------|
| `app/components/ThreatPipeline.tsx` | Contains the **manual risk entry UI**. "Manual Risk REGISTRATION" is a **button** that toggles an **inline expandable form** (not a separate drawer/modal). Form state: `showManualRiskForm`, `manualTitle`, `manualSource`, `manualTarget`, `manualLoss`, `manualDescription`. Submit: `handleManualRiskRegister()` builds a `PipelineThreat` and calls `addThreatToPipeline(...)`. | **Inline form only.** No drawer component for registration. Form visibility and all draft fields are **local React state** (useState) inside ThreatPipeline. There is **no prop or store slot** to open the form or to inject pre-filled template data (title, source, target, loss, description). |
| `app/components/DashboardWithDrawer.tsx` | Wraps the dashboard and conditionally renders **ThreatDetailDrawer** when `selectedThreatId != null`. | **Detail drawer only.** This drawer is for **viewing/editing an existing threat by ID**. It is not used for creating new manual threats and does not host the registration form. |
| `components/ThreatDetailDrawer.tsx` | Threat **detail** slide-over: shows threat by `threatId`, fetch by ID, notes, ingest, etc. | **View/edit existing threat.** Not the registration entry point. |

**Conclusion:** The "registration drawer" in the product sense is the **inline manual form** inside ThreatPipeline. There is no separate registration drawer component. The **threat detail drawer** (ThreatDetailDrawer) is for existing threats only.

---

### 1.3 Zustand Store (Drawer Open/Close and Draft Data)

| File | Role | Current state |
|------|------|----------------|
| `app/store/riskStore.ts` | Holds `selectedThreatId` and `setSelectedThreatId`. Used by DashboardWithDrawer and by pipeline/audit components to **open the threat detail drawer** for an existing threat. Also holds `pipelineThreats`, `addThreatToPipeline`, `upsertPipelineThreat`, etc. | **No registration-specific state.** No `showRegistrationForm`, `registrationTemplate`, or `draftThreat` (or similar) for opening or pre-filling the manual entry form. The store cannot currently be used to "open the registration drawer with template X." |

---

## 2. Vulnerabilities and Gaps

| Issue | Severity | Description |
|------|----------|-------------|
| **Registration form cannot be opened or pre-filled from outside ThreatPipeline** | **Blocker for feature** | Manual form state (`showManualRiskForm`, `manualTitle`, …) is local to ThreatPipeline. StrategicIntel has no way to open this form or pass template data. To support "click Top Sector Threat → open and pre-fill registration," either (1) add store state (e.g. `registrationTemplate: { title, source, target, loss, description } \| null` and `setRegistrationTemplate`) and have ThreatPipeline open the form and pre-fill when template is set, or (2) add a callback from page to ThreatPipeline (e.g. `openManualFormWithTemplate(template)`) and have StrategicIntel invoke it (e.g. via store or context). |
| **Top Sector Threats buttons are not decorative but do not open/pre-fill form** | **Gap** | Buttons currently add a threat directly to the pipeline via `upsertPipelineThreat`. They do not open the manual entry form or pre-fill it; so for the desired UX (open + pre-fill) they are not yet wired. |
| **Two different "drawer" concepts** | **Clarification** | (1) **Threat detail drawer** — opens for existing threat ID (`selectedThreatId`). (2) **Manual registration** — inline form in ThreatPipeline. Wiring "Top Sector Threats" to "the registration drawer" means wiring to the **manual form** in ThreatPipeline, not to the detail drawer. |

---

## 3. Test Coverage Mapping

| Area | Test file(s) | What's covered |
|------|--------------|----------------|
| **Threat detail drawer** (open by threat ID, GRC gate) | `tests/e2e/dashboard.spec.ts` | Dashboard load; drawer opens (role=dialog); Ingest button and justification box when threat ≥ $10M. |
| **Manual threat creation + drawer** (create then open detail drawer) | `tests/e2e/stage1-validation.spec.ts`, `tests/e2e/stage1-validation-simplified.spec.ts` | Manual Risk REGISTRATION click; form fill; Register; then opening drawer and checking no "Threat not found" (tests currently **skipped**). |
| **Pipeline + Manual Risk REGISTRATION** | `tests/e2e/threatPipeline.spec.ts` | Dashboard/pipeline load; Manual Risk REGISTRATION button visibility; adding threats; GRC gate. |
| **riskStore (unit)** | — | **No Vitest unit tests** for `app/store/riskStore.ts`. |
| **ThreatPipeline manual form (unit)** | — | **No Vitest component tests** for ThreatPipeline or the manual registration form. |
| **StrategicIntel Top Sector Threats (unit)** | — | **No Vitest tests** for StrategicIntel or Top Sector Threats buttons. |

---

## 4. Terminal Command — Baseline Tests Before Wiring

Run the E2E suite that touches dashboard, pipeline, and drawer so existing behavior is green before adding template wiring:

```bash
npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/threatPipeline.spec.ts --project=chromium
```

Optional (includes skipped tests; some may be skipped):

```bash
npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/threatPipeline.spec.ts tests/e2e/stage1-validation.spec.ts tests/e2e/stage1-validation-simplified.spec.ts --project=chromium
```

There are no Vitest unit tests for riskStore or the manual form; the above Playwright run is the relevant baseline for this feature.

---

## 5. TAS COMPLIANCE CHECK

| Directive | Status |
|-----------|--------|
| Trace UI and state flow | Done — StrategicIntel (Top Sector Threats), ThreatPipeline (manual form), riskStore (selectedThreatId; no registration state). |
| Left sidebar component with Top Sector Threats | Done — `app/components/StrategicIntel.tsx` (section "Top Sector Threats (Click to Register)"). |
| UI component for Registration Drawer/Modal | Done — Manual entry is **inline form** in `app/components/ThreatPipeline.tsx`; ThreatDetailDrawer is for existing threats only. |
| Zustand store for drawer open/close and draft data | Done — riskStore has `selectedThreatId` for **detail** drawer; **no** store state for registration form open or draft/template data. |
| Identify vulnerabilities | Done — Drawer/form lacks way to receive pre-filled template; Top Sector Threats add to pipeline but do not open/pre-fill form. |
| Test coverage mapping | Done — E2E only; no Vitest for store or manual form. |
| Exact terminal command for baseline tests | Done — Listed in §4. |

**Result:** Audit complete. To wire Top Sector Threats to "open and pre-fill the manual registration drawer," add shared state (e.g. in riskStore) or a callback for "open registration with template" and have ThreatPipeline open its inline form and pre-fill when that state/callback is used; StrategicIntel Top Sector Threats would then set that state or call the callback instead of (or in addition to) calling `upsertPipelineThreat`.
