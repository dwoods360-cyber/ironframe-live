import { QUERY_LOCAL_WORKSPACE_DECLARATION } from './queryLocalWorkspace.js';

export const WORKSPACE_QUERY_TYPES = [
  'active_prospects',
  'outreach_history',
  'flywheel_logs',
] as const;

/** How streaming tools are registered for a boardroom turn. */
export type BoardroomToolMode = 'combined' | 'web' | 'workspace';

function modelSupportsGoogleSearch(model: string): boolean {
  return /gemini-(2\.[05]|3)/i.test(model);
}

/**
 * Gemini 3 allows googleSearch + function calling in one stream.
 * Gemini 2.5 rejects that combination — use web-only or workspace-only per turn.
 */
export function buildBoardroomTools(model: string, mode: BoardroomToolMode = 'workspace') {
  if (mode === 'combined' && /gemini-3/i.test(model)) {
    return [
      {
        googleSearch: {},
        functionDeclarations: [QUERY_LOCAL_WORKSPACE_DECLARATION],
      },
    ];
  }
  if (mode === 'web' && modelSupportsGoogleSearch(model)) {
    return [{ googleSearch: {} }];
  }
  return [{ functionDeclarations: [QUERY_LOCAL_WORKSPACE_DECLARATION] }];
}

export { modelSupportsGoogleSearch };
