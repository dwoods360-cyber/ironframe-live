import { describe, expect, it } from 'vitest';
import {
  BOARDROOM_FUNCTION_DECLARATIONS,
  buildBoardroomTools,
} from './boardroomTools.js';
import { QUERY_LOCAL_WORKSPACE_DECLARATION } from './queryLocalWorkspace.js';

describe('buildBoardroomTools', () => {
  it('registers googleSearch and boardroom function tools on Gemini 3', () => {
    const tools = buildBoardroomTools('gemini-3-flash-preview', 'combined');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      googleSearch: {},
      functionDeclarations: [...BOARDROOM_FUNCTION_DECLARATIONS],
    });
  });

  it('maps active queryLocalWorkspace queryType without schema enums', () => {
    const declaration = QUERY_LOCAL_WORKSPACE_DECLARATION;
    expect(declaration.name).toBe('queryLocalWorkspace');
    expect(declaration.parameters.properties.queryType.enum).toBeUndefined();
    expect(declaration.parameters.properties.region.enum).toBeUndefined();
    expect(declaration.parameters.properties.queryType.description).toContain('active_prospects');
  });

  it('uses googleSearch only on Gemini 2.5 for web-only turns', () => {
    const tools = buildBoardroomTools('gemini-2.5-flash', 'web');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({ googleSearch: {} });
    expect(tools[0]).not.toHaveProperty('functionDeclarations');
  });

  it('uses functionDeclarations only on Gemini 2.5 for workspace turns', () => {
    const tools = buildBoardroomTools('gemini-2.5-flash', 'workspace');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      functionDeclarations: [...BOARDROOM_FUNCTION_DECLARATIONS],
    });
    expect(tools[0]).not.toHaveProperty('googleSearch');
  });

  it('uses functionDeclarations only on unsupported models', () => {
    const tools = buildBoardroomTools('gemini-1.5-flash', 'web');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      functionDeclarations: [...BOARDROOM_FUNCTION_DECLARATIONS],
    });
    expect(tools[0]).not.toHaveProperty('googleSearch');
  });
});

