/**
 * Product-knowledge sync + blast-radius registry.
 * Used by scripts/sync-product-knowledge.ts — edit commercial.ts once, then knowledge:sync.
 */

export type MirrorPair = {
  id: string;
  /** Human-canonical narrative under docs/sales/ */
  sourceRel: string;
  /** Board federation mirror under docs/sales-enablement/ */
  targetRel: string;
  title: string;
};

export type BlastRadiusTarget = {
  id: string;
  label: string;
  kind: 'restart' | 'redeploy' | 'docs' | 'ci';
  paths: string[];
  reason: string;
};

/** Sales → sales-enablement mirror pairs (narrative sync). */
export const PRODUCT_KNOWLEDGE_MIRRORS: readonly MirrorPair[] = [
  {
    id: 'pricing-and-packaging',
    sourceRel: 'docs/sales/pricing-and-packaging.md',
    targetRel: 'docs/sales-enablement/pricing-and-packaging.md',
    title: 'Pricing and Packaging',
  },
  {
    id: 'competitive-analysis',
    sourceRel: 'docs/sales/competitive-analysis.md',
    targetRel: 'docs/sales-enablement/competitive-analysis.md',
    title: 'Competitive Analysis',
  },
] as const;

/** Enablement-only federation docs (must stay ACTIVE + contain commercial anchors). */
export const ENABLEMENT_ONLY_DOCS = [
  'docs/sales-enablement/competitive-pricing-map.md',
  'docs/sales-enablement/message-constitution.md',
] as const;

/** Packages / surfaces that consume the spine — restart/redeploy after commercial or mirror changes. */
export const PRODUCT_KNOWLEDGE_BLAST_RADIUS: readonly BlastRadiusTarget[] = [
  {
    id: 'ironboard',
    label: 'IronBoard :8082',
    kind: 'restart',
    paths: [
      'Ironboard/src/staticContext.ts',
      'Ironboard/src/config/designPartnerLaunchBriefing.ts',
      'Ironboard/src/index.ts',
      'lib/governanceFrame/publishedResearchKnowledge.ts',
    ],
    reason:
      'Federates sales-enablement markdown + published Governance Frame research encyclopedia + product spine into every persona prompt',
  },
  {
    id: 'salesteam',
    label: 'SalesTeam :8084',
    kind: 'redeploy',
    paths: [
      'SalesTeam/src/config/designPartnerLaunchMandate.ts',
      'SalesTeam/src/config/beachheadPrompts.ts',
      'SalesTeam/src/agents/outboundDraftsman.ts',
    ],
    reason: 'Outbound drafts import Path B / beachhead keys from lib/ironframeProductKnowledge',
  },
  {
    id: 'ironleads',
    label: 'Ironleads :8083',
    kind: 'redeploy',
    paths: ['Ironleads/src/knowledge/leadGenCorpus.ts'],
    reason: 'Design-partner corpus entry embeds Path B USD from spine',
  },
  {
    id: 'successteam',
    label: 'IronSuccessTeam :8085',
    kind: 'redeploy',
    paths: ['SuccessTeam/src/knowledge/customerSuccessCorpus.ts'],
    reason: 'Path B onboarding play embeds Path B USD from spine',
  },
  {
    id: 'supportteam',
    label: 'IronSupportTeam :8086',
    kind: 'redeploy',
    paths: ['SupportTeam/src/knowledge/supportCorpus.ts'],
    reason: 'Billing-hold play references Path B amount from spine',
  },
  {
    id: 'ops-hub',
    label: 'Ops Hub / ops worker chat',
    kind: 'redeploy',
    paths: ['app/lib/server/opsWorkerChatCore.ts'],
    reason: 'Operator chat copy cites Path B message lock (verify after commercial change)',
  },
  {
    id: 'app-docs',
    label: 'App docs DB (/docs)',
    kind: 'docs',
    paths: ['docs/sales/', 'docs/sales-enablement/', 'docs/user-manuals/'],
    reason: 'After markdown sync, seed or POST /api/documentation/execute so /docs matches git',
  },
  {
    id: 'ci-gate',
    label: 'CI product-knowledge gate',
    kind: 'ci',
    paths: [
      'tests/unit/ironframeProductKnowledge.test.ts',
      'tests/unit/productKnowledgeSync.test.ts',
      'scripts/sync-product-knowledge.ts',
      'scripts/pre-commit-knowledge-check.mjs',
      '.github/workflows/ci.yml',
    ],
    reason:
      'Local: path-filtered pre-commit knowledge:check (hard block, no auto-sync). CI: knowledge:check + test:product-knowledge before merge.',
  },
] as const;

/** Relative paths that must import or mention the spine (drift scan excludes node_modules). */
export const SPINE_CONSUMER_GLOBS = [
  'lib/ironframeProductKnowledge/**/*.ts',
  'Ironboard/src/**/*.ts',
  'SalesTeam/src/**/*.ts',
  'Ironleads/src/knowledge/**/*.ts',
  'SuccessTeam/src/knowledge/**/*.ts',
  'SupportTeam/src/knowledge/**/*.ts',
  'docs/sales/**/*.md',
  'docs/sales-enablement/**/*.md',
  'app/lib/server/opsWorkerChatCore.ts',
] as const;

export const FINGERPRINT_REL = 'lib/ironframeProductKnowledge/.fingerprint.json';

/** Operator-local drift latch (gitignored) — surfaces floating Ops Hub notice after failed check/pre-commit. */
export const DRIFT_NOTICE_REL = 'lib/ironframeProductKnowledge/.drift-notice.json';
