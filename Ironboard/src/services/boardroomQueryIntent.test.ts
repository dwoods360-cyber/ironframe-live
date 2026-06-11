import { describe, expect, it } from 'vitest';
import {
  inferRegionFromQuery,
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
});
