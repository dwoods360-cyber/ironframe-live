/**
 * Runtime bridge to Ironleads lead-gen corpus — avoids static cross-package imports in Ironboard tsc.
 */
export async function executeLeadGenKnowledgeTool(
  raw: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const specifier = '../../../../../Ironleads/src/tools/leadGenKnowledgeTools.js';
  const mod = (await import(specifier)) as {
    executeLeadGenKnowledgeTool: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  return mod.executeLeadGenKnowledgeTool(raw);
}
