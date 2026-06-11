import { describe, expect, it } from 'vitest';
import { buildBoardroomTools, WORKSPACE_QUERY_TYPES } from './boardroomTools.js';
import { QUERY_LOCAL_WORKSPACE_DECLARATION } from './queryLocalWorkspace.js';

describe('buildBoardroomTools', () => {
  it('registers googleSearch and queryLocalWorkspace on Gemini 3', () => {
    const tools = buildBoardroomTools('gemini-3-flash-preview', 'combined');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      googleSearch: {},
      functionDeclarations: [QUERY_LOCAL_WORKSPACE_DECLARATION],
    });
  });

  it('maps active queryLocalWorkspace queryType enum options', () => {
    const declaration = QUERY_LOCAL_WORKSPACE_DECLARATION;
    expect(declaration.name).toBe('queryLocalWorkspace');
    expect(declaration.parameters.properties.queryType.enum).toEqual([...WORKSPACE_QUERY_TYPES]);
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
      functionDeclarations: [QUERY_LOCAL_WORKSPACE_DECLARATION],
    });
    expect(tools[0]).not.toHaveProperty('googleSearch');
  });

  it('uses functionDeclarations only on unsupported models', () => {
    const tools = buildBoardroomTools('gemini-1.5-flash', 'web');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      functionDeclarations: [QUERY_LOCAL_WORKSPACE_DECLARATION],
    });
    expect(tools[0]).not.toHaveProperty('googleSearch');
  });
});
