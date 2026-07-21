import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BEACHHEAD_SECTORS,
  DESIGN_PARTNER_CONVERT_CREDIT_USD,
  DESIGN_PARTNER_PATH_B_CENTS,
  DESIGN_PARTNER_PATH_B_USD,
  DOCS_HUB_HREF,
  PARTNER_GET_STARTED_HREF,
  PARTNER_OPERATOR_PACKET_HREF,
  PARTNER_TRAINING_INDEX_HREF,
  PLANNED_GA_COMMAND_CENTS,
  PLANNED_GA_COMMAND_USD,
  PLANNED_GA_GROWTH_CENTS,
  PLANNED_GA_GROWTH_USD,
  buildAntiHallucinationMandate,
  buildDocsHubLocationAnswer,
  buildIronleadsMandate,
  buildProductKnowledgeBinding,
  buildSalesTeamLaunchMandate,
  buildSuccessTeamMandate,
  buildSupportTeamMandate,
  buildTrainingDocsLocationAnswer,
  formatPathBUsd,
  resolveBeachheadSector,
} from '@/lib/ironframeProductKnowledge';

const ROOT = path.join(process.cwd());

function readDocs(...parts: string[]): string {
  return fs.readFileSync(path.join(ROOT, 'docs', ...parts), 'utf8');
}

describe('ironframeProductKnowledge spine', () => {
  it('locks Path B and planned GA to whole-cent commercial constants', () => {
    expect(DESIGN_PARTNER_PATH_B_USD).toBe(4999);
    expect(DESIGN_PARTNER_PATH_B_CENTS).toBe('499900');
    expect(PLANNED_GA_COMMAND_USD).toBe(35_000);
    expect(PLANNED_GA_COMMAND_CENTS).toBe('3500000');
    expect(PLANNED_GA_GROWTH_USD).toBe(75_000);
    expect(PLANNED_GA_GROWTH_CENTS).toBe('7500000');
    expect(formatPathBUsd()).toBe('$4,999');
  });

  it('locks Path B convert credit equal to Path B fee (not a negotiated %)', () => {
    expect(DESIGN_PARTNER_CONVERT_CREDIT_USD).toBe(DESIGN_PARTNER_PATH_B_USD);
  });

  it('resolves beachhead tags to code sectors', () => {
    expect(resolveBeachheadSector('BHC')).toBe('REGIONAL_BHC');
    expect(resolveBeachheadSector('UTIL')).toBe('UTILITY_NERC');
    expect(resolveBeachheadSector('MSSP')).toBe('MSSP_ENCLAVE');
    expect(resolveBeachheadSector('HEALTH')).toBe('HEALTH_HIPAA');
    expect(BEACHHEAD_SECTORS).toHaveLength(4);
  });

  it('builds board + SalesTeam + SuccessTeam mandate bindings with Path B amount', () => {
    const board = buildProductKnowledgeBinding();
    const sales = buildSalesTeamLaunchMandate();
    const success = buildSuccessTeamMandate();
    expect(board).toContain('IRONFRAME GRC PRODUCT KNOWLEDGE SPINE');
    expect(board).toContain('ANTI-HALLUCINATION MANDATE');
    expect(board).toContain(DESIGN_PARTNER_PATH_B_CENTS);
    expect(board).toContain('Message Constitution UI (does not exist)');
    expect(board).toContain(PARTNER_OPERATOR_PACKET_HREF);
    expect(board).toContain(DOCS_HUB_HREF);
    expect(board).toContain('DocsChrome');
    expect(board).toContain('plain human-readable prose');
    expect(board).toContain(buildDocsHubLocationAnswer());
    expect(board).toContain(buildTrainingDocsLocationAnswer());
    expect(sales).toContain(`$${DESIGN_PARTNER_PATH_B_USD}`);
    expect(sales).toContain('ANTI-HALLUCINATION MANDATE');
    expect(sales).toContain('no SalesTeam admin portal');
    expect(success).toContain('SUCCESS TEAM — ACTIVE / CLOSED_WON');
    expect(success).toContain('ANTI-HALLUCINATION MANDATE');
    expect(success).toContain(PARTNER_OPERATOR_PACKET_HREF);
    expect(success).toContain(PARTNER_TRAINING_INDEX_HREF);
    expect(success).toContain(PARTNER_GET_STARTED_HREF);
    expect(success).toContain('not where training documents live');
    expect(buildSupportTeamMandate()).toContain('ANTI-HALLUCINATION MANDATE');
    expect(buildIronleadsMandate()).toContain('ANTI-HALLUCINATION MANDATE');
    expect(buildAntiHallucinationMandate()).toContain('NEVER invent product surfaces');
  });

  it('canonical location answers are prose without markdown chapter scaffolding', () => {
    const docsHub = buildDocsHubLocationAnswer();
    const training = buildTrainingDocsLocationAnswer();
    expect(docsHub).toContain('/docs');
    expect(docsHub).not.toMatch(/^#\s/m);
    expect(docsHub.toLowerCase()).not.toContain('22%');
    expect(training).toContain(PARTNER_TRAINING_INDEX_HREF);
    expect(training.toLowerCase()).toContain('not in a successteam portal or ops hub knowledge base');
    expect(training).not.toMatch(/^#\s/m);
  });

  it('keeps sales-enablement federation mirrors ACTIVE (not STAGED scaffolds)', () => {
    const pricing = readDocs('sales-enablement', 'pricing-and-packaging.md');
    const competitive = readDocs('sales-enablement', 'competitive-analysis.md');
    const pricingMap = readDocs('sales-enablement', 'competitive-pricing-map.md');
    const message = readDocs('sales-enablement', 'message-constitution.md');

    for (const doc of [pricing, competitive, pricingMap, message]) {
      expect(doc).toMatch(/Status:\s*ACTIVE/i);
      expect(doc).not.toMatch(/STAGED\s*\/\s*DRAFT/i);
      expect(doc).not.toMatch(/Outline \(to complete\)/i);
    }

    expect(pricing).toContain('$4,999');
    expect(pricing).toContain('499900');
    expect(pricingMap).toContain('Peer ACV bands');
    expect(message).toContain('beachheadPrompts.ts');
    expect(message).toContain('GET /health');
  });

  it('SalesTeam mandate re-exports the same Path B USD', async () => {
    const mandate = await import('../../SalesTeam/src/config/designPartnerLaunchMandate.ts');
    expect(mandate.DESIGN_PARTNER_PATH_B_USD).toBe(DESIGN_PARTNER_PATH_B_USD);
    expect(mandate.PLANNED_GA_COMMAND_USD).toBe(PLANNED_GA_COMMAND_USD);
    expect(mandate.DESIGN_PARTNER_LAUNCH_MANDATE).toContain(`$${DESIGN_PARTNER_PATH_B_USD}`);
  });
});
