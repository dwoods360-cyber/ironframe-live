import { describe, expect, it } from 'vitest';
import {
  inferRegionFromQuery,
  inferRegionsFromQuery,
  isCompetitivePositioningQuery,
  isMarketResearchCapabilityQuery,
  isWorkspaceOnlyQuery,
  needsExternalInfo,
  shouldPrefetchProspects,
  shouldPrefetchWeb,
} from './boardroomQueryIntent.js';

describe('boardroomQueryIntent', () => {
  it('does not treat bare city names as prospect queries', () => {
    expect(shouldPrefetchProspects('What time is it in London?')).toBe(false);
    expect(shouldPrefetchProspects('Tell me about Singapore fintech')).toBe(false);
  });

  it('prefetches prospects for explicit flywheel language', () => {
    expect(shouldPrefetchProspects('List our London prospects')).toBe(true);
    expect(shouldPrefetchProspects('Show active prospects in Singapore')).toBe(true);
    expect(shouldPrefetchProspects('flywheel logs for today')).toBe(true);
  });

  it('prefetches web for world / time questions', () => {
    expect(shouldPrefetchWeb('What time is it in London?')).toBe(true);
    expect(needsExternalInfo('What time is it in London?')).toBe(true);
  });

  it('prefetches web for mixed board + world questions', () => {
    const q = 'What is broken in the board? What time is it in London?';
    expect(shouldPrefetchProspects(q)).toBe(false);
    expect(shouldPrefetchWeb(q)).toBe(true);
  });

  it('skips web prefetch for workspace-only CRM queries', () => {
    expect(isWorkspaceOnlyQuery('List our London prospects')).toBe(true);
    expect(shouldPrefetchWeb('List our London prospects')).toBe(false);
  });

  it('prefetches both when CRM and external signals appear together', () => {
    const q = 'What time is it in London and list our prospects there';
    expect(shouldPrefetchProspects(q)).toBe(true);
    expect(shouldPrefetchWeb(q)).toBe(true);
    expect(isWorkspaceOnlyQuery(q)).toBe(false);
  });

  it('infers region from query or active hub', () => {
    expect(inferRegionFromQuery('hello', 'LONDON')).toBe('London');
    expect(inferRegionFromQuery('news in Singapore', '')).toBe('Singapore');
  });

  it('infers multi-country regions from active hub payload', () => {
    expect(inferRegionsFromQuery('hello', 'GERMANY,AUSTRALIA')).toEqual([
      'Germany',
      'Australia',
    ]);
  });

  it('prefers explicit country mentions in the query over active hub', () => {
    expect(inferRegionsFromQuery('prospects in Canada', 'LONDON')).toEqual(['Canada']);
  });

  it('prefetches prospects for regional ICP questions', () => {
    const q = 'Are there companies in Germany that fit our ICP criteria?';
    expect(shouldPrefetchProspects(q)).toBe(true);
    expect(inferRegionsFromQuery(q, '')).toEqual(['Germany']);
  });

  it('prefetches prospects for explicit market research and GTM requests', () => {
    expect(shouldPrefetchProspects('Perform market research for our target countries')).toBe(true);
    expect(shouldPrefetchProspects('Run go-to-market research on Germany')).toBe(true);
    expect(shouldPrefetchProspects('Who are our potential customers in healthcare SaaS?')).toBe(true);
    expect(inferRegionsFromQuery('Perform market research', 'GERMANY,CANADA')).toEqual([
      'Germany',
      'Canada',
    ]);
  });

  it('detects meta market-research capability questions', () => {
    expect(isMarketResearchCapabilityQuery('Are you not able to perform real market research?')).toBe(
      true,
    );
    expect(isMarketResearchCapabilityQuery('Can you conduct market research in Germany?')).toBe(true);
    expect(isMarketResearchCapabilityQuery('List prospects in Germany')).toBe(false);
  });

  it('detects competitive positioning questions without conflating market research execution', () => {
    expect(isCompetitivePositioningQuery('Do we have a true market edge?')).toBe(true);
    expect(isCompetitivePositioningQuery('Is the board in line with us on positioning?')).toBe(true);
    expect(isCompetitivePositioningQuery('Are we ahead of Vanta on SOC 2?')).toBe(true);
    expect(isCompetitivePositioningQuery('Are you not able to perform real market research?')).toBe(
      false,
    );
  });
});
