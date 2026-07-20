import { describe, expect, it } from 'vitest';

import {
  CANONICAL_DOCS_HUB_LOCATION_RESPONSE,
  CANONICAL_TRAINING_DOCS_LOCATION_RESPONSE,
  isDocsHubLocationQuery,
  isTrainingDocsLocationQuery,
  resolveCanonicalBoardResponse,
} from '../orchestrator/routing.js';

describe('docs / training location canonical routing', () => {
  it('matches docs hub location questions', () => {
    expect(isDocsHubLocationQuery('where is the docs hub?')).toBe(true);
    expect(isDocsHubLocationQuery('Where is the Documentation Hub?')).toBe(true);
    expect(isDocsHubLocationQuery('how do I open /docs')).toBe(true);
  });

  it('returns prose Docs Hub answer without markdown chapter scaffolding', () => {
    const response = resolveCanonicalBoardResponse('where is the docs hub?');
    expect(response).toBe(CANONICAL_DOCS_HUB_LOCATION_RESPONSE);
    expect(response).toContain('/docs');
    expect(response).toContain('Docs reader shell');
    expect(response).not.toMatch(/^#\s/m);
    expect(response?.toLowerCase()).not.toContain('22%');
    expect(response?.toLowerCase()).toContain('not the command center three-panel');
    expect(response?.toLowerCase()).toContain('partners do not run seed-app-documents');
  });

  it('matches training document location questions', () => {
    expect(isTrainingDocsLocationQuery('Where are the user training documents?')).toBe(true);
    expect(isTrainingDocsLocationQuery('where is partner training?')).toBe(true);
  });

  it('returns prose training-docs answer and rejects invented Knowledge Base store', () => {
    const response = resolveCanonicalBoardResponse('Where are the user training documents?');
    expect(response).toBe(CANONICAL_TRAINING_DOCS_LOCATION_RESPONSE);
    expect(response).toContain('/docs/training/LEVEL1-PARTNER-INDEX');
    expect(response).toContain('/get-started');
    expect(response?.toLowerCase()).toContain('not in a successteam portal or ops hub knowledge base');
    expect(response).not.toMatch(/^#\s/m);
  });

  it('does not treat unrelated where-questions as docs hub', () => {
    expect(resolveCanonicalBoardResponse('where is the coffee machine?')).toBe(null);
  });
});
