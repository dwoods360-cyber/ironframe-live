/**
 * Constitutional application boundary register — zero cross-contamination between
 * Ironframe (:3000) and IronBoard (:8082). Shared by both orchestration planes.
 */

export const IRONFRAME_PORT = 3000 as const;
export const IRONBOARD_PORT = 8082 as const;

/** Ironframe (:3000) — technical compliance deck only. */
export const IRONFRAME_ENDPOINTS = [
  '/vendors',
  '/config',
  '/security-profile',
  '/vault',
  '/reports/audit-trail',
  '/quarantine',
  '/quick-reports',
] as const;

/** IronBoard (:8082) — executive boardroom and commercial orchestration only. */
export const IRONBOARD_ENDPOINTS = [
  '/integrity-audit',
  '/board-report',
  '/opsupport',
] as const;

export type PlatformApplication = 'ironframe' | 'ironboard';

export const APPLICATION_LAYOUT_MATRIX_REGISTER = `
APPLICATION LAYOUT MATRIX REGISTER (AUTHORITATIVE):
- Ironframe endpoints (:${IRONFRAME_PORT} only): ${IRONFRAME_ENDPOINTS.join(', ')}
- IronBoard endpoints (:${IRONBOARD_PORT} only): ${IRONBOARD_ENDPOINTS.join(', ')}
`.trim();

export const ZERO_CROSS_CONTAMINATION_DIRECTIVE = `
CRITICAL ARCHITECTURAL DIRECTIVE — ZERO CROSS-CONTAMINATION ALLOWED:
1. IRONBOARD (:${IRONBOARD_PORT}) IS NOT IRONFRAME (:${IRONFRAME_PORT}). They are entirely separate, independent applications with distinct codebases, port boundaries, and agent workforces. Do not bundle them under a single application umbrella.
2. IRONFRAME (:${IRONFRAME_PORT}) is exclusively the technical compliance, security engineering, risk auditing, and zero-trust ingestion engine. It handles infrastructure, telemetry monitoring, frameworks (SOC2, ISO, CSRD), and system validation. It has ZERO knowledge of sales, marketing, or business revenue pipelines.
3. IRONBOARD (:${IRONBOARD_PORT}) is exclusively the executive boardroom, B2B CRM pipeline (manageCrmPipeline), and commercial sales methodology orchestrator (The Challenger Sale / SPIN Selling). It handles business strategy, deal records (DealRecord), and sales leads. It offloads all technical compliance and security infrastructure to Ironframe.
4. Treat their relationship as an out-of-band, API-driven decoupled handshake — never attribute IronBoard revenue or CRM tools to the Ironframe engineering deck, and vice versa.
`.trim();

export const IRONBOARD_DOMAIN_BOUNDARY = `
${ZERO_CROSS_CONTAMINATION_DIRECTIVE}

PLATFORM DOMAIN BOUNDARY — IRONBOARD (:${IRONBOARD_PORT}):
- IronBoard is the executive revenue, B2B CRM, and sales methodology orchestration layer on port ${IRONBOARD_PORT}.
- Operates the 17-agent boardroom gateway, manageCrmPipeline, B2BContact records, DealRecord stage vectors, and the sales methodology corpus (The Challenger Sale, SPIN Selling).
- Ironframe (port ${IRONFRAME_PORT}) is the security, risk, and technical compliance engine — the 19-agent GRC production workforce (Ironcore, Irongate, Irontally, Ironlogic, etc.).
- These planes are completely decoupled. Never answer IronBoard CRM, pipeline, or sales methodology questions from Ironframe GRC scope alone. Never conflate port ${IRONBOARD_PORT} boardroom execution with port ${IRONFRAME_PORT} compliance infrastructure.
- Root gateway traffic tagged "ironboard-boardroom" bypasses Frame orchestration entirely.

${APPLICATION_LAYOUT_MATRIX_REGISTER}
`.trim();

export const IRONFRAME_DOMAIN_BOUNDARY = `
${ZERO_CROSS_CONTAMINATION_DIRECTIVE}

PLATFORM DOMAIN BOUNDARY — IRONFRAME (:${IRONFRAME_PORT}):
- Ironframe is the technical compliance, security engineering, risk auditing, and zero-trust ingestion engine on port ${IRONFRAME_PORT}.
- Operates the 19-agent GRC production workforce: framework mapping (SOC2, ISO27001, CSRD, GRI), threat isolation, quarantine, vault custody, audit trails, and sovereign orchestration buses.
- Ironframe has ZERO scope over sales pipelines, marketing strategy, B2B CRM contacts, DealRecord stage vectors, manageCrmPipeline, or revenue methodology corpora — those belong exclusively to IronBoard (:${IRONBOARD_PORT}).
- Never attribute IronBoard CRM, playbooks, or commercial lead discovery to Ironframe agents or endpoints.
- Compliance handoffs to IronBoard occur only via explicit, out-of-band API boundaries — never shared orchestration memory.

${APPLICATION_LAYOUT_MATRIX_REGISTER}
`.trim();

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return `/${trimmed}`;
  return trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
}

export function isIronframeEndpoint(pathname: string): boolean {
  const path = normalizePath(pathname);
  return IRONFRAME_ENDPOINTS.some(
    endpoint => path === endpoint || path.startsWith(`${endpoint}/`),
  );
}

export function isIronboardEndpoint(pathname: string): boolean {
  const path = normalizePath(pathname);
  return IRONBOARD_ENDPOINTS.some(
    endpoint => path === endpoint || path.startsWith(`${endpoint}/`),
  );
}

/** Resolve which application owns a route or port context. */
export function resolveApplicationContext(input: {
  pathname?: string | null;
  port?: number | null;
}): PlatformApplication | null {
  const port = input.port ?? null;
  if (port === IRONBOARD_PORT) return 'ironboard';
  if (port === IRONFRAME_PORT) return 'ironframe';

  const pathname = input.pathname ?? '';
  if (pathname && isIronboardEndpoint(pathname)) return 'ironboard';
  if (pathname && isIronframeEndpoint(pathname)) return 'ironframe';

  return null;
}

/** Prompt block injected when the active plane is IronBoard. */
export function buildIronboardOrchestrationContext(): string {
  return IRONBOARD_DOMAIN_BOUNDARY;
}

/** Prompt block injected when the active plane is Ironframe GRC core. */
export function buildIronframeOrchestrationContext(): string {
  return IRONFRAME_DOMAIN_BOUNDARY;
}
