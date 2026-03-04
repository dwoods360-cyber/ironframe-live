# Ironframe Live — Component Reference

A list of components, what they do, and how they work.

---

## Dashboard / Home (`app/page.tsx` flow)

### **StrategicIntel** (`app/components/StrategicIntel.tsx`)
- **What:** Left sidebar on the main dashboard. “Strategic Intel” with industry threats, agent health, Coreintel live feed, TTL controls, and “Send to pipeline” actions.
- **How:** Client component. Uses `useRiskStore` for pipeline/sidebar threats, dashboard liabilities, risk offset, and `useAgentStore` for agents and intelligence stream. Renders industry threat list (Healthcare, Finance, Energy, etc.), lets user select industry and add threats to pipeline. Shows agent health (Agent Manager, Ironsight, Coreintel), optional phone-home alert, and Coreintel messages. Can run “Sentinel Sweep” and push threats to MEDSHIELD pipeline. Filters visible alerts by SOC intake and cadence.

### **DashboardAlertBanners** (`app/components/DashboardAlertBanners.tsx`)
- **What:** Top-of-feed system alerts and regulatory ticker.
- **How:** Presentational. Receives `phoneHomeAlert` (string or null) and `regulatoryState` (ticker strings, `isSyncing`). Renders a red banner with “Contact Support” link if phone-home alert exists; below that, a “REGULATORY ALERT” bar that shows ticker text or “Syncing…” / “No new regulatory alerts.”

### **GlobalHealthSummaryCard** (`app/components/GlobalHealthSummaryCard.tsx`)
- **What:** Summary strip under the banners: Protected Tenants, Active Violations, Liability Exposure.
- **How:** Server component. Fetches companies from Prisma; receives `activeViolations`, `potentialRevenueImpact`, `coreintelTrendActive` from the page. Renders three metrics; liability is delegated to **LiabilityExposureDisplay** (which adds pipeline + accepted impacts from risk store).

### **LiabilityExposureDisplay** (`app/components/LiabilityExposureDisplay.tsx`)
- **What:** Single metric: total liability exposure in USD (e.g. `$X.XM`).
- **How:** Client. Reads `riskStore`: `pipelineThreats` and `acceptedThreatImpacts`. Sums `baseUsd` + pipeline pending ($M) + accepted ($M), converts to millions and displays in red.

### **ThreatPipeline** (`app/components/ThreatPipeline.tsx`)
- **What:** MEDSHIELD Threat Pipeline: Raw Signal Ingestion (AGENT STREAM + SOC EMAIL), Manual Risk Registration, Risk Registration (pipeline cards), optional Supply Chain Alert.
- **How:** Client. Merges `incomingAgentAlerts` (from page/server) with local `rawSignals` state; tracks `removedSignalIds` so ingested/dismissed signals drop from the queue. Shows **one** front AGENT STREAM card at a time; “X cards” is queue length. Ingest moves signal to Risk REGISTRATION (via `addThreatToPipeline`); Dismiss removes with justification and audit log. Pipeline cards use **PipelineThreatCard** (ack/deack, likelihood/impact, notes, stakeholder email). Uses `useRiskStore` and `appendAuditLog`.

### **ActiveRisks** (`app/components/ActiveRisks.tsx`)
- **What:** Server wrapper that loads active risks from the database and passes them to the client list.
- **How:** Fetches `activeRisk.findMany` with company, ordered by `score_cents` desc; serializes for client and renders **ActiveRisksClient** with `risks` prop.

### **ActiveRisksClient** (`app/components/ActiveRisksClient.tsx`)
- **What:** List of active risks with confirm/resolve, work notes, and lifecycle state.
- **How:** Client. Uses `useRiskStore` (setDashboardLiability, confirmThreat, resolveThreat). Renders each risk with Add Note, Confirm Threat, Resolve; sends mock stakeholder email and audit log on confirm. Syncs dashboard liability (e.g. azure-api, palo-alto) on mount/unmount.

### **ActiveThreats** (`app/components/ActiveThreats.tsx`)
- **What:** Invisible sync of “live threats” into the risk store for dashboard liability.
- **How:** Client. In `useEffect` registers/removes dashboard liabilities (e.g. azure-api, palo-alto). Renders nothing (`return null`).

### **AuditIntelligence** (`app/components/AuditIntelligence.tsx`)
- **What:** Right sidebar “AUDIT INTELLIGENCE” — scrollable audit log with optional filters.
- **How:** Client. Uses `useAuditLoggerStore()` and `hydrateAuditLogger` / `ensureLoginAuditEvent`. Optional props: `showRetentionBadge`, `logTypeFilter`, `descriptionIncludes`. Filters entries and shows count + list; can inject a test GRC entry if missing.

### **AgentStream** (`app/components/AgentStream.tsx`)
- **What:** AGENT STREAM card stack (e.g. in a sidebar). Up to 4 cards stacked visually “behind” each other; each card shows dispatch meta, title, impact, severity/liability/status, Approve/Dismiss.
- **How:** Client. Filters alerts by SOC intake and cadence. Uses `getAlertDispatchMeta` from `useAlerts` for badge/border. Renders first 4 `visibleAlerts` in a relative container with offset/z-index for deck effect. Not currently rendered on main `app/page.tsx` (alerts are fed into ThreatPipeline instead).

---

## Reports & Audit

### **ExecutiveSummary** (`app/components/ExecutiveSummary.tsx`)
- **What:** Board-style summary: Risk Burn-down, SLA Compliance, Agent Efficiency, recent events, Download PDF.
- **How:** Client. Uses `useReportStore` (totalMitigatedRiskM, slaCompliancePct, agentEfficiencyCount, recentEvents, refresh). Computes burn-down from baseline vs current risk; prints on “Download PDF.”

### **GrcAuditSummary** (`app/components/GrcAuditSummary.tsx`)
- **What:** GRC Audit Trail table: last 10 lifecycle events (timestamp, user, action, justification).
- **How:** Client. Uses `useReportStore` recentEvents + refresh. Renders table; empty state when no events.

### **ReportHeader** (`app/components/ReportHeader.tsx`)
- **What:** Report page header with industry, report name, “Confidential” badge.
- **How:** Presentational. Props: `industry`, `reportName`. Renders title and breadcrumb-style path.

### **AuditStepper** (`app/components/AuditStepper.tsx`)
- **What:** Step progress (e.g. Initial Routing → Document Extraction → Financial Risk Audit) with agent names and status.
- **How:** Derives step status from `logs` (e.g. “Ironcore routed”, “Ironscribe successfully extracted”, “Irontrust analyzed”). Renders vertical stepper with pending/processing/completed/failed.

---

## Layout & Navigation

### **TopNav** (`app/components/TopNav.tsx`)
- **What:** Top bar: IRONFRAME CORE, context title (e.g. ACTIVE GRC, SUPPLY CHAIN, PLAYBOOK), TenantSwitcher, nav chips.
- **How:** Client. Uses `usePathname()` to detect tenant and routes (audit-trail, vendors, config, evidence, frameworks, playbooks). Renders **HeaderTwo** with route-derived props and **TenantSwitcher**.

### **HeaderTwo** (`app/components/HeaderTwo.tsx`)
- **What:** Secondary header with nav chips, overflow scroll, and optional portal/upload (IngestionForm, UploadArtifactModal).
- **How:** Client. Props: `isVendorOverviewRoute`, `isVendorsRoute`, `isConfigRoute`, `showPrimaryActionChips`, `onVendorDownload`, `currentTenant`. Manages chip bar overflow and scroll buttons; can open portal and wire vendor download.

### **TenantSwitcher** (`app/components/TenantSwitcher.tsx`)
- **What:** Dropdown to switch between Global Command Center, Medshield, Vaultbank, Gridcore.
- **How:** Client. Uses `useRouter` and `usePathname`; selects current tenant from URL; onChange navigates to tenant path.

### **Subheader** (`app/components/structure/Subheader.tsx`)
- **What:** Blue subheader with Dashboard / System Config tabs and report chip.
- **How:** Client. Props: `currentView`, `onViewChange`. Renders nav items and optional report link.

### **TheRealBlueBar** (`app/components/structure/TheRealBlueBar.tsx`)
- **What:** Structural blue bar element (exact role depends on usage in layout).
- **How:** Used in structure/layout.

### **TenantTabs** (`app/components/structure/TenantTabs.tsx`)
- **What:** Tab strip for tenant-specific views.
- **How:** Structure component for tenant UI.

### **Header** (`app/components/structure/Header.tsx`)
- **What:** Generic header structure.
- **How:** Layout/structure.

---

## Vendor Risk & Artifacts

### **IngestionForm** (`app/components/vendor-risk/IngestionForm.tsx`)
- **What:** Form to ingest/edit vendor data: vendor name, category, criticality, data handling, compliance, insurance, audit frequency; computes inherent/mitigation/residual scores.
- **How:** Client. Can be pre-filled from `scannedData`. Uses local state and `computeScores()`; `onSubmit` sends form data.

### **UploadArtifactModal** (`app/components/vendor-risk/UploadArtifactModal.tsx`)
- **What:** Modal to upload or stage artifacts (e.g. for vendor evidence).
- **How:** Used from HeaderTwo; opens portal for upload flow.

### **VendorDetailsModal** (`app/components/vendor-risk/VendorDetailsModal.tsx`)
- **What:** Modal showing detailed vendor info.
- **How:** Vendor drill-down UI.

### **ArtifactDrawer** (`app/components/vendor-risk/ArtifactDrawer.tsx`)
- **What:** Drawer listing or managing artifacts.
- **How:** Vendor-risk artifact UI.

### **DocumentList** (`app/components/vendor-risk/DocumentList.tsx`)
- **What:** List of documents/artifacts.
- **How:** Vendor-risk documents.

### **DiscrepancyFeed** (`app/components/vendor-risk/DiscrepancyFeed.tsx`)
- **What:** Feed of discrepancies (e.g. score vs expected).
- **How:** Vendor-risk intelligence.

### **ConcentrationModal** (`app/components/vendor-risk/ConcentrationModal.tsx`)
- **What:** Modal for concentration risk or similar metric.
- **How:** Vendor-risk analytics.

### **EditArtifactModal** (`app/components/vendor-risk/EditArtifactModal.tsx`)
- **What:** Edit existing artifact.
- **How:** Vendor-risk artifact edit.

### **MetricChip** (`app/components/vendor-risk/MetricChip.tsx`)
- **What:** Small chip for a single metric (e.g. score, tier).
- **How:** Reusable chip for vendor metrics.

### **AgentDropZone** (`app/components/vendor-risk/AgentDropZone.tsx`)
- **What:** Drop zone for agent-driven uploads in vendor context.
- **How:** Vendor-risk ingestion.

---

## Panes (alternate dashboard layout)

### **Dashboard** (`app/components/Dashboard.tsx`)
- **What:** Three-column layout (Strategic Intel | Pipeline + Risk Reg + ActiveRisks | Audit Intel) backed by Supabase companies/risks.
- **How:** Client. Fetches companies and risks from Supabase; selects company; renders **StrategicIntel** (pane), **PipelineIngestion**, **RiskRegistration**, **ActiveRisks** (center), **AuditIntelligence** (right).

### **StrategicIntel** (pane) (`app/components/panes/StrategicIntel.tsx`)
- **What:** Simplified left pane “Strategic Intel” with company name and threat list (clickable).
- **How:** Props: `company`, `onThreatClick`. Renders static threat list; used in Dashboard grid.

### **PipelineIngestion** (`app/components/panes/center/PipelineIngestion.tsx`)
- **What:** Placeholder for pipeline ingestion count.
- **How:** Renders “Pipeline Ingestion (N pending)” with `risks` and `onAction`.

### **RiskRegistration** (`app/components/panes/center/RiskRegistration.tsx`)
- **What:** Placeholder for risk registration count.
- **How:** Renders “Risk Registration (N)” with `risks`, `onAction`, `onAddRisk`.

### **ActiveRisks** (pane) (`app/components/panes/center/ActiveRisks.tsx`)
- **What:** Center pane active risks list (alternate to main ActiveRisks).
- **How:** Used in Dashboard center column.

### **AuditIntelligence** (pane) (`app/components/panes/right/AuditIntelligence.tsx`)
- **What:** Minimal “Audit Intel: {company name}”.
- **How:** Used in Dashboard right column.

### **AuditTrail** (`app/components/panes/right/AuditTrail.tsx` / `app/components/panes/right/modules/AuditTrail.tsx`)
- **What:** Audit trail view in right pane or report module.
- **How:** Report/audit UI.

### **AgentLogs** (`app/components/panes/right/AgentLogs.tsx`, `app/components/panes/AgentLogs.tsx`)
- **What:** Agent log feed in a pane.
- **How:** Displays agent activity logs.

### **CenterPane** (`app/components/panes/CenterPane.tsx`)
- **What:** Wrapper for center column content.
- **How:** Layout.

### **LeftPane** / **RightPane** (`app/components/panes/LeftPane.tsx`, `RightPane.tsx`)
- **What:** Left/right column wrappers.
- **How:** Layout.

### **AnalystView** (`app/components/panes/AnalystView.tsx`)
- **What:** Analyst-focused view combining panes.
- **How:** Layout.

### **SystemConfig** (`app/components/panes/center/SystemConfig.tsx`)
- **What:** System configuration in center pane.
- **How:** Config UI.

### **AuditSearch** / **RecentActivity** / **QuickReports** (right modules)
- **What:** Search, recent activity, quick reports in right pane modules.
- **How:** Sidebar modules for reports/audit.

---

## Shared / Reusable

### **RiskCard** (`app/components/RiskCard.tsx`)
- **What:** Card for a single risk metric: label, current ALE, baseline, variance, MEDSHIELD/VAULTBANK/GRIDCORE type.
- **How:** Presentational. Computes variance; red if critical (variance > 0), else green; shows SECURE/CRITICAL badge.

### **RiskEngine** (`components/dashboard/RiskEngine.tsx`)
- **What:** “Top Sector Threats” list (e.g. ransomware, breach) with toggle to mark as registered.
- **How:** Client. Tracks `activeThreats` (ids); toggling adds/removes; registered state shows check and green styling.

### **HealthScoreBadge** (`app/components/HealthScoreBadge.tsx`)
- **What:** Letter grade (A–F) + numeric “AI SCORE” with tooltip explaining scoring (critical assets, vulnerable assets, open threats, policy bonus).
- **How:** Uses `calculateEntityScore(entityData)` from `@/app/utils/scoring`; tooltip shows formula and breakdown.

### **StatusIndicator** (`app/components/StatusIndicator.tsx`)
- **What:** Small status dot + label (e.g. Healthy / Critical), optional pulse.
- **How:** Props: `status`, `label`, `pulse`. Green/red styling.

### **MetricHero** (`app/components/MetricHero.tsx`)
- **What:** Row of three metric cards (e.g. Compliance Score, Open Findings, Active Audits).
- **How:** Optional `metrics` prop; defaults to three placeholder metrics. Uses Activity, AlertTriangle, ShieldCheck icons.

### **NotificationHub** (`app/components/NotificationHub.tsx`)
- **What:** Hub for monitoring alerts: approve, reject, archive low-priority; priority from vendor risk tier.
- **How:** Props: `alerts`, `resolveRiskTier`, `onApprove`, `onReject`, `onArchiveLowPriority`. Uses `MonitoringAlert` and `RiskTier`; groups/sorts by priority.

### **RecentSubmissionsTable** (`app/components/RecentSubmissionsTable.tsx`)
- **What:** Table of recent vendor submissions: vendor, date, auditor, previous/new score, change.
- **How:** Presentational. Props: `recentSubmissions` (id, vendorName, createdAt, auditor, previousScore, score, scoreChange).

---

## Upload & DMZ

### **GlobalDropZone** (`app/components/GlobalDropZone.tsx`)
- **What:** Window-level drag-and-drop zone for zero-touch ingestion into DMZ (Agent 12 / Agent 4).
- **How:** Client. Uses `useParams()` for tenant; only active when tenant present. On drop, uploads via `uploadToQuarantine` (upload-to-dmz). Shows overlay when dragging; status (idle/uploading/success/error).

### **QuarantineUpload** (`app/components/QuarantineUpload.tsx`)
- **What:** Tenant-scoped upload to quarantine (or stage file for e.g. UploadArtifactModal).
- **How:** Client. Props: `tenantId`, optional `onFileStaged`. Uses `uploadToQuarantine`; can delegate to `onFileStaged` instead of uploading.

---

## Other

### **VoiceComms** (`app/components/VoiceComms.tsx`)
- **What:** “Gemini Live Comms” — voice interaction shell (mic on/off, ready for stream).
- **How:** Client. Tracks `isListening` and permission; toggle gets microphone stream; placeholder for Sprint 6 stream integration.

### **IrontechDashboard** (`app/components/IrontechDashboard.tsx`)
- **What:** Irontech-specific dashboard view.
- **How:** Feature dashboard.

### **DebugPanel** (`app/components/dev/DebugPanel.tsx`)
- **What:** Dev-only debug panel.
- **How:** Used in development.

### **ReportActions** (`app/reports/[reportSlug]/ReportActions.tsx`)
- **What:** Actions (e.g. export, share) for a report.
- **How:** Report page actions.

### **TemplateEditor** (`app/settings/config/TemplateEditor.tsx`)
- **What:** Edits config/template content.
- **How:** Settings/config.

---

## Data flow summary

- **Server → Client:** `app/page.tsx` loads companies/risks from Prisma, computes violations/revenue impact, maps risks to `StreamAlert[]` and passes to **ThreatPipeline** as `incomingAgentAlerts`. **ActiveRisks** loads from Prisma and passes to **ActiveRisksClient**. **GlobalHealthSummaryCard** loads companies and receives violation/impact from page.
- **Client state:** `useRiskStore`: pipeline threats, dashboard liabilities, sidebar threats, accepted impacts, risk offset. `useAgentStore`: agents, intelligence stream. `useReportStore`: report metrics and recent events. `useAuditLoggerStore`: audit log entries. ThreatPipeline also keeps `rawSignals` and `removedSignalIds` for the ingestion queue.
- **Side effects:** `appendAuditLog()` used from ThreatPipeline, ActiveRisksClient, StrategicIntel, etc. Ingest/dismiss in ThreatPipeline call `addThreatToPipeline` and update `removedSignalIds` so the queue count and front card update.
