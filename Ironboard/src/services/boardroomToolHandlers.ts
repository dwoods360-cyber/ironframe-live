import { manageCrmPipeline } from '../tools/crmTools.js';
import { executeQueryLocalWorkspace } from './queryLocalWorkspace.js';

export type BoardroomToolName = 'queryLocalWorkspace' | 'manageCrmPipeline';

export type BoardroomToolHandler = (
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/** Executable boardroom tool map — resolved server-side after Gemini functionCall rounds. */
export const BOARDROOM_TOOL_HANDLERS: Record<BoardroomToolName, BoardroomToolHandler> = {
  queryLocalWorkspace: executeQueryLocalWorkspace,
  manageCrmPipeline,
};

export function isBoardroomToolName(name: string | undefined | null): name is BoardroomToolName {
  return typeof name === 'string' && name in BOARDROOM_TOOL_HANDLERS;
}

export async function executeBoardroomTool(
  name: string | undefined | null,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!isBoardroomToolName(name)) {
    return { ok: false, error: `${name ?? 'unknown'} tool is not defined in this context` };
  }
  return BOARDROOM_TOOL_HANDLERS[name](args);
}
