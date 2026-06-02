/**
 * Generates Ironframe UI/UX & Feature Test Protocol (.docx)
 * Run: node scripts/generate-ui-ux-test-protocol-docx.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageBreak,
  BorderStyle,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "docs", "Ironframe-UI-UX-Feature-Test-Protocol.docx");

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}
function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 80 } });
}
function numbered(text) {
  return new Paragraph({ text, numbering: { reference: "default-numbering", level: 0 }, spacing: { after: 80 } });
}

function testCaseTable(rows) {
  const header = new TableRow({
    tableHeader: true,
    children: ["Field", "Detail"].map(
      (t) =>
        new TableCell({
          width: { size: t === "Field" ? 28 : 72, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B" },
          children: [
            new Paragraph({
              children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })],
            }),
          ],
        }),
    ),
  });
  const dataRows = rows.map(
    ([field, detail]) =>
      new TableRow({
        children: [field, detail].map(
          (cell, i) =>
            new TableCell({
              width: { size: i === 0 ? 28 : 72, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: cell })],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  });
}

function resultsTemplateTable() {
  const cols = ["Date", "Tester", "Build/SHA", "Environment", "Pass", "Fail", "Blocked", "Notes"];
  const header = new TableRow({
    tableHeader: true,
    children: cols.map(
      (t) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
        }),
    ),
  });
  const empty = new TableRow({
    children: cols.map(() => new TableCell({ children: [new Paragraph({ text: "" })] })),
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, empty, empty, empty] });
}

function caseBlock(id, title, priority, preconditions, steps, expected, passFail) {
  return [
    h3(`${id} — ${title}`),
    testCaseTable([
      ["Priority", priority],
      ["Preconditions", preconditions],
      ["Test Steps", steps],
      ["Expected Results", expected],
      ["Pass / Fail Criteria", passFail],
      ["Actual Result", "_(Tester completes during execution)_"],
      ["Status", "☐ Pass   ☐ Fail   ☐ Blocked"],
      ["Evidence", "_(Screenshot filename / log snippet / HAR ref)_"],
    ]),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  ];
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "default-numbering",
        levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Ironframe GRC", bold: true, size: 56, color: "0891B2" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "UI/UX & Feature Test Protocol", bold: true, size: 40 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [
            new TextRun({ text: "Version 1.0  |  June 2026  |  Confidential — Internal QA", size: 22, italics: true }),
          ],
        }),
        p("Document owner: Quality Assurance / Product Engineering"),
        p("Application: Ironframe Command Center (Next.js 15, Supabase, multi-tenant GRC platform)"),
        p("Related automation: Playwright E2E (tests/e2e/), npm run test:vercel-smoke, npm run test:vercel-integration:cloud:epic17"),

        new Paragraph({ children: [new PageBreak()] }),

        // 1. TEST OBJECTIVES
        h1("1. Test Objectives"),
        h2("1.1 Goals"),
        bullet("Verify Command Center UI renders correctly across authenticated sessions and tenant scopes."),
        bullet("Validate core user journeys: login → tenant selection → dashboard → threat pipeline → Active Risks → sustainability pulse → analyst exports."),
        bullet("Confirm tenant-switch resilience: no permanent blank panels, correct tenant-scoped data, scoped SWR/API behavior."),
        bullet("Exercise GRC gates: manual risk registration, assessment drawer, high-value justification when applicable."),
        bullet("Validate accessibility of primary controls (tenant switcher, navigation, dialogs) and loading/empty states."),
        bullet("Record reproducible pass/fail evidence for GA release and regression cycles."),

        h2("1.2 Scope — In Scope"),
        bullet("Web UI: Command Center dashboard, Threat Pipeline, Active Risks, Audit Intelligence, Carbon Pulse, /dashboard/exports"),
        bullet("Tenant switcher: Global, Medshield, Vaultbank, Gridcore, Defense"),
        bullet("Authentication via Supabase login"),
        bullet("API behavior observable from browser (Network tab): /api/dashboard, /api/sustainability/stats"),
        bullet("Staging and production Vercel deployments; local dev (localhost:3000)"),

        h2("1.3 Scope — Out of Scope"),
        bullet("Third-party Electricity Maps vendor SLA (covered by Ironwatch fallback tests only)"),
        bullet("Load/stress testing beyond manual observation"),
        bullet("Mobile native apps (web responsive only)"),
        bullet("Penetration testing (separate security assessment)"),

        h2("1.4 Success Criteria (Release Gate)"),
        bullet("Zero Critical or High severity open defects for in-scope journeys"),
        bullet("100% Pass on Priority P0 test cases in target environment"),
        bullet("≥ 95% Pass on Priority P1 test cases"),
        bullet("Cloud smoke: npm run test:vercel-smoke returns 21/21 with freezeGateGreen: true (production/staging)"),

        new Paragraph({ children: [new PageBreak()] }),

        // 2. TEST ENVIRONMENT
        h1("2. Test Environment"),
        h2("2.1 Hardware & Client"),
        testCaseTable([
          ["Workstation", "Windows 10/11 or macOS 12+; 8 GB RAM minimum; 1920×1080 display recommended"],
          ["Browser (primary)", "Google Chrome or Microsoft Edge (latest stable)"],
          ["Browser (secondary)", "Firefox latest — spot-check P0 cases only"],
          ["Network", "Stable broadband; document VPN if used"],
        ]),

        h2("2.2 Software Stack"),
        testCaseTable([
          ["Application", "Ironframe-live (Next.js 15.1.9, React 19)"],
          ["Hosting — Local", "npm run dev → http://localhost:3000"],
          ["Hosting — Cloud", "https://ironframe-live.vercel.app (production) or preview deploy URL"],
          ["Database", "Supabase PostgreSQL (tenant-scoped RLS)"],
          ["Auth", "Supabase SSR session cookies"],
        ]),

        h2("2.3 Environment Configurations"),
        h3("Local (.env.local minimum)"),
        bullet("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        bullet("DATABASE_URL (Prisma)"),
        bullet("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true (when ELECTRICITY_MAPS_API_KEY absent)"),
        bullet("Optional: SHADOW_PLANE_ACTIVE=1 / NEXT_PUBLIC_SHADOW_PLANE_ACTIVE=1 for handshake bypass demos"),

        h3("Cloud (Vercel Preview / Production)"),
        bullet("Same Supabase keys as target project"),
        bullet("IRONFRAME_CRON_SECRET for smoke scripts"),
        bullet("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true recommended on Preview without live carbon key"),

        h2("2.4 Test Tools"),
        testCaseTable([
          ["Manual", "Browser DevTools (Network, Console, Application cookies)"],
          ["Automation", "Playwright: npx playwright test tests/e2e/ --project=chromium"],
          ["API smoke", "node scripts/staging-smoke-cron.mjs"],
          ["Integration", "npm run test:vercel-integration:cloud:epic17"],
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // 3. TEST SCENARIOS
        h1("3. Test Scenarios & User Journeys"),
        testCaseTable([
          ["Scenario ID", "Journey / Feature Area", "Priority"],
          ["SC-01", "Authentication & session", "P0"],
          ["SC-02", "Global Command Center dashboard load", "P0"],
          ["SC-03", "Tenant switcher & isolation", "P0"],
          ["SC-04", "Tenant switch resilience (Vaultbank ↔ Gridcore)", "P0"],
          ["SC-05", "Threat Pipeline & manual risk registration", "P0"],
          ["SC-06", "Risk assessment drawer & GRC gate", "P1"],
          ["SC-07", "Active Risks board", "P1"],
          ["SC-08", "Sustainability Pulse (Carbon Pulse)", "P1"],
          ["SC-09", "Analyst exports (/dashboard/exports)", "P1"],
          ["SC-10", "Audit Intelligence sidebar", "P2"],
          ["SC-11", "API & network health (dashboard + stats)", "P1"],
          ["SC-12", "UX: loading, empty states, error recovery", "P1"],
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // 4. TEST CASES
        h1("4. Detailed Test Cases"),

        ...caseBlock(
          "AUTH-001",
          "Supabase login and session persistence",
          "P0",
          "Valid test user provisioned in Supabase; cookies cleared.",
          "1. Open /login.\n2. Enter valid email/password.\n3. Submit.\n4. Confirm redirect to Command Center.\n5. Refresh page (F5).\n6. Open DevTools → Application → Cookies; confirm Supabase auth cookies present.",
          "User lands on dashboard (or sign-in completes without error). Session persists after refresh. No infinite redirect loop.",
          "PASS: Authenticated dashboard or documented sign-in page with working credentials. FAIL: 401 loop, blank page, or uncaught error overlay.",
        ),

        ...caseBlock(
          "DASH-001",
          "Command Center dashboard shell loads",
          "P0",
          "Authenticated; any tenant or Global scope.",
          "1. Navigate to /.\n2. Wait up to 20s for load to complete.\n3. Verify visible markers: Enterprise Risk Posture, Protected Tenants, Control Room, Industry Profile.\n4. Confirm no permanent Loading dashboard… message.",
          "Dashboard shell visible. Heat map or empty-state placeholders render. Console free of uncaught exceptions.",
          "PASS: All four markers visible within 20s. FAIL: Permanent loading spinner, constitutional void without documented test mode, or white screen >30s.",
        ),

        ...caseBlock(
          "TENANT-001",
          "Global Command Center aggregate view",
          "P0",
          "Authenticated; tenant switcher visible.",
          "1. Open tenant switcher (building icon).\n2. Select Global Command Center — Aggregate Dashboard.\n3. Confirm URL is /.\n4. Verify dashboard loads aggregate view (may show multi-tenant summary).",
          "Global scope active; ironframe-tenant cookie cleared or absent. Dashboard renders without tenant-scoped export errors on home page.",
          "PASS: Global option selected; dashboard stable. FAIL: Wrong tenant data labeled as global or crash on select.",
        ),

        ...caseBlock(
          "TENANT-002",
          "Select Vaultbank tenant scope",
          "P0",
          "Authenticated; Vaultbank exists in tenant list.",
          "1. Select Vaultbank from tenant switcher.\n2. Wait for page refresh/navigation.\n3. Verify cookie ironframe-tenant set (DevTools).\n4. Confirm Industry Profile aligns with Vaultbank context.",
          "Tenant UUID c6932d16-a716-4a07-9bc4-6ec987f641e2 scoped. Dashboard refetches. Handshake may show idle then verified (production) or verified immediately (shadow plane).",
          "PASS: Cookie matches Vaultbank UUID; dashboard data loads. FAIL: 401 on /api/dashboard or wrong tenant label persists after 10s.",
        ),

        ...caseBlock(
          "TENANT-003",
          "Switch Vaultbank → Gridcore (resilience)",
          "P0",
          "Authenticated; starting on Vaultbank.",
          "1. Note current dashboard content (e.g., carbon zone US-NY for Vaultbank).\n2. Switch to Gridcore.\n3. Observe center panels during transition (≤5s).\n4. Confirm Sustainability Pulse zone updates toward US-CO / Gridcore profile.\n5. Check Network: GET /api/dashboard and /api/sustainability/stats return 200 with ok:true.",
          "Brief loading acceptable. Center grid panels must NOT remain permanently blank. Carbon pulse shows Gridcore-appropriate data or LKG/fallback label. No flood of missing _api_key errors in server log when fallback enabled.",
          "PASS: UI recovers within 15s; tenant-specific content changes. FAIL: Permanent blank center grid, stale Vaultbank carbon data after 60s poll, or cross-tenant financial figures.",
        ),

        ...caseBlock(
          "TENANT-004",
          "Switch back Gridcore → Vaultbank (state recovery)",
          "P0",
          "Completed TENANT-003.",
          "1. Switch back to Vaultbank.\n2. Verify dashboard repopulates.\n3. Open Carbon Pulse — intensity and zone consistent with Vaultbank (US-NY roster).\n4. Repeat one fast double-switch (Gridcore→Vaultbank→Gridcore) if time permits.",
          "Each switch recovers without requiring hard browser cache clear. Last-good snapshot may show briefly; final state matches selected tenant.",
          "PASS: Recovery on return switch. FAIL: Requires full logout/login to restore UI.",
        ),

        ...caseBlock(
          "PIPE-001",
          "Threat Pipeline empty / waiting state",
          "P1",
          "Authenticated tenant with empty pipeline (or fresh scope).",
          "1. Locate Threat Pipeline / RISK REGISTRATION section.\n2. If no threats queued, confirm waiting message: [ WAITING FOR INGESTION STREAM... ] or similar.\n3. Confirm Manual Risk REGISTRATION button visible.",
          "Empty state message OR Attack Velocity section when threats exist. No broken layout.",
          "PASS: Deterministic empty OR populated state. FAIL: Section missing entirely or JS error in console.",
        ),

        ...caseBlock(
          "PIPE-002",
          "Manual risk registration",
          "P0",
          "Dashboard loaded; Manual Risk REGISTRATION available.",
          "1. Click Manual Risk REGISTRATION.\n2. Fill: Title = QA Manual [timestamp], Source = Manual QA, Target = Healthcare, Inherent risk = 4.0, Description = UI test.\n3. Click Register.\n4. Confirm card appears in RISK REGISTRATION with manual- ID prefix.",
          "Form closes; new card visible with title and severity badge within 5s.",
          "PASS: Card appears with correct title. FAIL: Form error without message or card never appears after 10s.",
        ),

        ...caseBlock(
          "PIPE-003",
          "Assessment drawer opens (no Threat not found)",
          "P0",
          "PIPE-002 completed or existing risk card available.",
          "1. Click View Details or threat title on a card.\n2. Wait for drawer (role=dialog, aria-modal=true).\n3. Verify title and ID displayed.\n4. Confirm Ingest button visible in drawer.",
          "Drawer slides in from right. Threat metadata shown. NO Threat not found or 404 message.",
          "PASS: Drawer content matches selected card. FAIL: Threat not found for manual card just created.",
        ),

        ...caseBlock(
          "PIPE-004",
          "High-value GRC justification gate (when applicable)",
          "P1",
          "Drawer open on threat ≥ $10M inherent risk (or seeded high-value threat).",
          "1. Open high-value threat drawer.\n2. Look for GRC Justification Required label (50+ characters).\n3. Verify #grc-justification textarea present.\n4. Attempt ingest without justification if UI allows — expect validation block.",
          "Justification field visible for high-value threats. Low-value threats may omit field.",
          "PASS: Justification UI matches financial threshold rules. FAIL: High-value ingest proceeds with empty justification when gate required.",
        ),

        ...caseBlock(
          "ACTIVE-001",
          "Active Risks section displays ACTIVE risks",
          "P1",
          "Tenant with seeded or confirmed ACTIVE threats.",
          "1. Scroll to ACTIVE RISKS section.\n2. Confirm heading ACTIVE RISKS (not legacy combined title).\n3. Verify cards show status ACTIVE, score, source agent.\n4. Click a card if interaction available — no crash.",
          "Active risks listed or explicit empty state. Excluded baseline titles not shown erroneously.",
          "PASS: Section renders consistently with data state. FAIL: Section permanently empty while Pipeline shows confirmed threats incorrectly.",
        ),

        ...caseBlock(
          "CARBON-001",
          "Sustainability Pulse — live or fallback display",
          "P1",
          "Tenant selected (not Global). Fallback or API key configured.",
          "1. Locate Sustainability Pulse in Audit Intelligence area.\n2. Wait up to 60s for poll cycle.\n3. Note intensity (gCO₂eq/kWh), zone label, Agent 6 throttle badge.\n4. If live key present: source live or electricity-maps. If fallback: Fallback Active or forensic label acceptable.",
          "Widget shows numeric intensity, zone, ALE display. Not permanently Pulse unavailable without tenant.",
          "PASS: effectivePulse renders with intensity > 0 or explicit LKG/offline verified state. FAIL: Blank widget with tenant selected after 90s.",
        ),

        ...caseBlock(
          "CARBON-002",
          "Carbon Pulse LKG when stats API fails",
          "P2",
          "Simulate offline stats (DevTools offline mode) OR staging without API key.",
          "1. Select tenant.\n2. Throttle or block /api/sustainability/stats once.\n3. Observe UI within 60s.\n4. Confirm fallback path attempts /api/sustainability/pulse-lkg or shows offline/verified messaging.",
          "UI remains mounted; amber shield or offline copy; no infinite error loop in console.",
          "PASS: Graceful degradation. FAIL: Widget unmounts or blank panel spreads to entire center grid.",
        ),

        ...caseBlock(
          "EXPORT-001",
          "Analyst export CSV — tenant scoped",
          "P1",
          "Authenticated; Vaultbank or Gridcore selected (not Global).",
          "1. Navigate to /dashboard/exports.\n2. If redirected to /login, complete auth.\n3. Click Download CSV.\n4. Open file — verify header row and tenant-scoped ledger rows.",
          "HTTP 200; CSV downloads; BigInt cents columns as strings; no Medshield data when Gridcore selected.",
          "PASS: CSV valid and tenant-aligned. FAIL: 404 on /dashboard/exports. (trailing period), 400 No active tenant on Global scope, or wrong tenant rows.",
        ),

        ...caseBlock(
          "EXPORT-002",
          "Analyst export PDF — tenant scoped",
          "P1",
          "Same as EXPORT-001.",
          "1. On /dashboard/exports click Download PDF.\n2. Verify PDF opens; magic bytes %PDF.\n3. Spot-check branding and table content.",
          "PDF generated; readable; tenant scope consistent with cookie.",
          "PASS: Valid PDF. FAIL: 500 error or empty document.",
        ),

        ...caseBlock(
          "AUDIT-001",
          "Audit Intelligence feed filters simulation noise",
          "P2",
          "Tenant with mixed audit log entries.",
          "1. Open Audit Intelligence sidebar.\n2. Confirm GRCBOT / SIMULATION cards not listed in production view.\n3. Verify real CONFIG_CHANGE / GRC entries visible.",
          "Simulation entries filtered from display list.",
          "PASS: No GRC Process Threat simulation cards in sidebar. FAIL: Simulation floods sidebar in non-sim mode.",
        ),

        ...caseBlock(
          "API-001",
          "Dashboard API returns 200 for scoped tenant",
          "P1",
          "Tenant selected; DevTools Network open.",
          "1. Switch tenant.\n2. Find GET /api/dashboard.\n3. Verify status 200, JSON body with companies/threat data shape.\n4. Confirm request headers include x-tenant-id matching cookie.",
          "200 response within 15s; no 401/503 unless documented lockdown mode.",
          "PASS: 200 + valid JSON. FAIL: 401 with valid session, or 500 without recovery.",
        ),

        ...caseBlock(
          "API-002",
          "Sustainability stats tenant-scoped SWR",
          "P1",
          "Tenant switcher used between Vaultbank and Gridcore.",
          "1. On Vaultbank, note pulse tenantId in /api/sustainability/stats response.\n2. Switch to Gridcore.\n3. Within 60s confirm new request returns different tenantId.\n4. Verify SWR does not show previous tenant data after full poll cycle.",
          "Response pulse.tenantId matches active cookie UUID after switch.",
          "PASS: tenantId tracks switch. FAIL: Stale tenantId after 60s on new tenant.",
        ),

        ...caseBlock(
          "UX-001",
          "Responsive layout — minimum viewport",
          "P2",
          "Chrome DevTools device mode.",
          "1. Set viewport 1280×720 then 1024×768.\n2. Verify tenant switcher, center panel, and sidebar usable without horizontal scroll obliterating content.\n3. Open drawer — must remain usable.",
          "Core workflows accessible at 1280px width.",
          "PASS: No critical controls clipped. FAIL: Cannot reach tenant switcher or Register button at 1280px.",
        ),

        ...caseBlock(
          "UX-002",
          "No permanent blank center grid after cache invalidate",
          "P0",
          "Build includes commit 42b9b56b or later.",
          "1. Switch tenant twice rapidly.\n2. Observe center grid for 15s.\n3. If loading skeletons appear, they must resolve to content or explicit empty-state copy.",
          "Panels recover; setData(null) permanent blank regression absent.",
          "PASS: Content or empty-state within 15s. FAIL: Empty grid with no loading indicator after tenant switch.",
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // 5. TEST DATA
        h1("5. Test Data"),
        h2("5.1 User Credentials"),
        p("Store credentials in a secure vault — never in this document or git."),
        testCaseTable([
          ["QA Standard User", "Supabase email/password — read-only Command Center access"],
          ["QA Tenant Admin", "User with access to all demo tenants"],
          ["QA Export User", "User validated for /dashboard/exports"],
        ]),

        h2("5.2 Demo Tenants"),
        testCaseTable([
          ["Medshield", "UUID 5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01 — US-NEIS carbon zone"],
          ["Vaultbank", "UUID c6932d16-a716-4a07-9bc4-6ec987f641e2 — US-NY carbon zone"],
          ["Gridcore", "UUID 4d1ea1a4-b6a8-4d12-9eb3-2f0a64ad0ef7 — US-CO carbon zone"],
          ["Defense", "UUID (see app/utils/tenantIsolation.ts) — US-MIDA-PJM zone"],
        ]),

        h2("5.3 Sample Manual Threat Payload"),
        testCaseTable([
          ["Title", "QA Manual Test {ISO8601 timestamp}"],
          ["Source", "Manual QA"],
          ["Target sector", "Healthcare"],
          ["Inherent risk ($M)", "4.0 (drawer test) / 2.0 (condensation test)"],
          ["Description", "UI/UX protocol execution — safe to purge in staging"],
        ]),

        h2("5.4 Environment Variables (QA reference)"),
        bullet("IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true"),
        bullet("IRONWATCH_ELECTRICITY_MAPS_ZONE=US-MIDW-MISO"),
        bullet("IRONFRAME_CRON_SECRET — for smoke scripts only; not for browser tests"),

        new Paragraph({ children: [new PageBreak()] }),

        // 6. TEST RESULTS
        h1("6. Test Results Recording"),
        h2("6.1 Execution Summary"),
        resultsTemplateTable(),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        h2("6.2 Per-Test Execution Log"),
        p("Copy one row per test case executed:"),
        testCaseTable([
          ["Test Case ID", "_(e.g. TENANT-003)_"],
          ["Execution Date", "_(YYYY-MM-DD HH:mm UTC)_"],
          ["Tester Name", ""],
          ["Environment", "_(Local / Preview URL / Production)_"],
          ["Build SHA", "_(git rev-parse --short HEAD)_"],
          ["Status", "Pass / Fail / Blocked"],
          ["Defect ID", "_(If fail — link to ticket)_"],
          ["Screenshots", "_(Folder path or attachment names)_"],
          ["Console / Network notes", "_(Errors, status codes)_"],
        ]),

        h2("6.3 Defect Severity Definitions"),
        testCaseTable([
          ["Critical", "Data loss, cross-tenant bleed, auth bypass, permanent UI failure"],
          ["High", "P0 journey blocked; no workaround"],
          ["Medium", "P1 feature wrong with workaround"],
          ["Low", "Cosmetic, P2, non-blocking"],
        ]),

        h2("6.4 Sign-Off"),
        p("QA Lead: _________________________  Date: __________"),
        p("Product Owner: _________________________  Date: __________"),
        p("Release approved for promotion: ☐ Yes   ☐ No   ☐ With exceptions (list below)"),
        p("Exceptions / waivers:"),
        p("_"),
        p("_"),

        h2("6.5 Automation Cross-Reference"),
        bullet("Playwright: npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/threatPipeline.spec.ts"),
        bullet("Cloud smoke: npm run test:vercel-smoke"),
        bullet("Integration: npm run test:vercel-integration:cloud:epic17"),
        bullet("Manual protocol complements automation — does not replace P0 API/tenant isolation unit tests"),

        p("— End of Document —"),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, buffer);
console.log(`Written: ${OUT_PATH}`);
console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
