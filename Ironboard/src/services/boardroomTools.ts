import { QUERY_LOCAL_WORKSPACE_DECLARATION } from './queryLocalWorkspace.js';
import { MANAGE_CRM_PIPELINE_DECLARATION } from '../tools/crmTools.js';
import {
  BOARDROOM_TOOL_HANDLERS,
  type BoardroomToolName,
} from './boardroomToolHandlers.js';

export const BOARDROOM_FUNCTION_DECLARATIONS = [
  QUERY_LOCAL_WORKSPACE_DECLARATION,
  MANAGE_CRM_PIPELINE_DECLARATION,
] as const;

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
        functionDeclarations: [...BOARDROOM_FUNCTION_DECLARATIONS],
      },
    ];
  }
  if (mode === 'web' && modelSupportsGoogleSearch(model)) {
    return [{ googleSearch: {} }];
  }
  return [{ functionDeclarations: [...BOARDROOM_FUNCTION_DECLARATIONS] }];
}

export { modelSupportsGoogleSearch };

/** Gemini-declared tools paired with the server-side executable handler map. */
export const BOARDROOM_EXECUTABLE_TOOLS: Record<BoardroomToolName, (typeof BOARDROOM_TOOL_HANDLERS)[BoardroomToolName]> =
  BOARDROOM_TOOL_HANDLERS;

