import { describe, expect, it, vi } from 'vitest';

vi.mock('./queryLocalWorkspace.js', () => ({
  executeQueryLocalWorkspace: vi.fn().mockResolvedValue({ ok: true, queryType: 'active_prospects' }),
}));

vi.mock('../tools/crmTools.js', () => ({
  manageCrmPipeline: vi.fn().mockResolvedValue({ ok: true, action: 'list_pipeline' }),
}));

import { executeQueryLocalWorkspace } from './queryLocalWorkspace.js';
import { manageCrmPipeline } from '../tools/crmTools.js';
import { BOARDROOM_TOOL_HANDLERS, executeBoardroomTool, isBoardroomToolName } from './boardroomToolHandlers.js';

describe('boardroomToolHandlers', () => {
  it('registers queryLocalWorkspace and manageCrmPipeline', () => {
    expect(Object.keys(BOARDROOM_TOOL_HANDLERS).sort()).toEqual([
      'manageCrmPipeline',
      'queryLocalWorkspace',
    ]);
    expect(isBoardroomToolName('queryLocalWorkspace')).toBe(true);
    expect(isBoardroomToolName('googleSearch')).toBe(false);
  });

  it('dispatches queryLocalWorkspace through the handler map', async () => {
    const args = { queryType: 'active_prospects', regions: ['Germany'] };
    const result = await executeBoardroomTool('queryLocalWorkspace', args);
    expect(result.ok).toBe(true);
    expect(executeQueryLocalWorkspace).toHaveBeenCalledWith(args);
  });

  it('dispatches manageCrmPipeline through the handler map', async () => {
    const args = { action: 'list_sales_playbooks' };
    await executeBoardroomTool('manageCrmPipeline', args);
    expect(manageCrmPipeline).toHaveBeenCalledWith(args);
  });

  it('returns a structured error for unknown tools', async () => {
    const result = await executeBoardroomTool('missingTool', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not defined in this context');
  });
});
